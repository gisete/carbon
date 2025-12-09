import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { getCurrentItem, advanceCycle } from "@/lib/director";
import { getSettings } from "@/lib/settings";
import type { PlaylistItem } from "@/lib/playlist";

export const dynamic = "force-dynamic";

// --- GLOBAL CACHE ---
// In your Docker setup, this variable persists in memory between requests.
// This allows us to serve the last generated image instantly (0ms latency).
let imageCache: Buffer | null = null;
let isGenerating = false;

/**
 * Helper to determine if we are in "Night Mode" (outside active hours)
 */
function isNightMode(startTime: string, endTime: string): boolean {
	const now = new Date();
	const currentMinutes = now.getHours() * 60 + now.getMinutes();

	const [startHour, startMin] = startTime.split(":").map(Number);
	const startMinutes = startHour * 60 + startMin;

	const [endHour, endMin] = endTime.split(":").map(Number);
	const endMinutes = endHour * 60 + endMin;

	if (endMinutes < startMinutes) {
		return !(currentMinutes >= startMinutes || currentMinutes <= endMinutes);
	}
	return !(currentMinutes >= startMinutes && currentMinutes <= endMinutes);
}

/**
 * Calculate how long the ESP32 should sleep (in seconds)
 */
function calculateSleepDuration(itemDurationMinutes: number, batteryLevel: number | null, isNight: boolean): number {
	// 1. Critical Battery (< 20%) -> Sleep 2 hours (7200s)
	if (batteryLevel !== null && batteryLevel < 20) {
		console.log(`[Sleep Logic] Critical Battery (${batteryLevel}%). Sleeping 2 hours.`);
		return 7200;
	}

	// 2. Night Mode -> Sleep 1 hour (3600s)
	if (isNight) {
		console.log(`[Sleep Logic] Night Mode. Sleeping 1 hour.`);
		return 3600;
	}

	// 3. Day Mode -> Use Item Duration (default 5 mins if missing)
	const duration = itemDurationMinutes || 5;
	return duration * 60;
}

/**
 * Build URL for screen based on playlist item
 */
function buildScreenUrl(item: PlaylistItem | null): string {
	const baseUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/screens`;

	if (!item) {
		return `${baseUrl}/weather?view=current`;
	}

	switch (item.type) {
		case "weather":
			return `${baseUrl}/weather?view=${item.config?.viewMode || "current"}`;
		case "calendar":
			return `${baseUrl}/calendar?view=${item.config?.viewMode || "daily"}`;
		case "custom-text":
			return `${baseUrl}/custom-text?text=${encodeURIComponent(item.config?.text || "")}`;
		default:
			return `${baseUrl}/weather`;
	}
}

/**
 * BACKGROUND GENERATOR
 * This function generates the image and updates the global cache.
 * It does not return a response to the client directly.
 */
async function generateImage(batteryLevel: number | null, screenParam: string | null, humidityParam: string | null) {
	// Prevent multiple parallel generations to save resources
	if (isGenerating) return;
	isGenerating = true;
	console.log("[Render] Starting background generation...");

	try {
		let targetUrl: string;

		// 1. Resolve Target URL
		if (screenParam) {
			// Manual screen override
			const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
			targetUrl = `${baseUrl}/screens/${screenParam}?humidity=${humidityParam || ""}`;
		} else {
			// Standard Playlist Logic
			const currentItem = await getCurrentItem();

			if (!currentItem) {
				console.log("[Render] No active item from Director (Night Mode or Empty)");
				targetUrl = buildScreenUrl(null);
			} else {
				targetUrl = buildScreenUrl(currentItem);
				// Advance the cycle so the NEXT generation shows the next item
				await advanceCycle();
			}
		}

		// 2. Launch Puppeteer (Using system Chromium for Alpine)
		const browser = await puppeteer.launch({
			headless: true,
			executablePath: "/usr/bin/chromium-browser",
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-infobars",
				"--disable-gpu", // Often helps in Docker
				"--disable-dev-shm-usage", // Helps with memory in Docker
			],
			ignoreDefaultArgs: ["--enable-automation"],
		});

		const page = await browser.newPage();
		await page.setViewport({ width: 800, height: 480, deviceScaleFactor: 1 });

		const pageUrl = new URL(targetUrl);
		if (batteryLevel) pageUrl.searchParams.set("battery", batteryLevel.toString());

		// Wait for data to load (networkidle0 is safer than timeout)
		await page.goto(pageUrl.toString(), { waitUntil: "networkidle0", timeout: 8000 });

		const screenshotBuffer = await page.screenshot({ type: "png" });
		await browser.close();

		// 3. Process Image with Sharp (Dithering)
		imageCache = await sharp(screenshotBuffer)
			.resize(800, 480, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
			.grayscale() // Convert to grayscale first
			.png({
				palette: true,
				colors: 2,
				dither: 1.0, // Floyd-Steinberg dithering
			})
			.toBuffer();

		console.log("[Render] Background generation complete. Cache updated.");
	} catch (error) {
		console.error("[Render] Generation failed:", error);
	} finally {
		isGenerating = false;
	}
}

export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams;

	// 1. Get Params
	const batteryParam = searchParams.get("battery");
	const batteryLevel = batteryParam ? parseInt(batteryParam) : null;
	const screenParam = searchParams.get("screen");
	const humidityParam = searchParams.get("humidity");

	// 2. Trigger Background Generation (Fire & Forget)
	// We start the generation process but don't await it, so we can return the cache immediately.
	generateImage(batteryLevel, screenParam, humidityParam);

	// 3. Handle First Run (Empty Cache)
	// If the server just restarted, we have no cache. We must wait.
	if (!imageCache) {
		console.log("[Render] No cache available, waiting for initial generation...");
		const startTime = Date.now();
		while (!imageCache && Date.now() - startTime < 15000) {
			// Poll every 100ms
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		if (!imageCache) {
			return NextResponse.json({ error: "Timeout generating image" }, { status: 504 });
		}
	}

	// 4. Calculate Sleep Headers (For backward compatibility)
	// We calculate this on the fly based on current settings
	const settings = await getSettings();
	const isNight = isNightMode(settings.system.startTime, settings.system.endTime);
	let itemDuration = settings.system.refreshInterval;

	// If we are in playlist mode, try to peek at the current item duration
	if (!screenParam) {
		const currentItem = await getCurrentItem();
		if (currentItem?.duration) {
			itemDuration = currentItem.duration;
		}
	}
	const sleepSeconds = calculateSleepDuration(itemDuration, batteryLevel, isNight);

	// 5. Return the Cached Image Instantly
	return new NextResponse(imageCache as any, {
		headers: {
			"Content-Type": "image/png",
			"Content-Length": imageCache.length.toString(),
			"Cache-Control": "no-store, max-age=0",
			"X-Sleep-Seconds": sleepSeconds.toString(),
		},
	});
}
