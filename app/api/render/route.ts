import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { getCurrentItem, advanceCycle } from "@/lib/director";
import { getSettings } from "@/lib/settings";
import type { PlaylistItem } from "@/lib/playlist";

export const dynamic = "force-dynamic";

// --- GLOBAL CACHE ---
let imageCache: Buffer | null = null;
let isGenerating = false;

// ... (Helper functions: isNightMode, calculateSleepDuration, buildScreenUrl remain the same) ...
function isNightMode(startTime: string, endTime: string): boolean {
	const now = new Date();
	const currentMinutes = now.getHours() * 60 + now.getMinutes();
	const [startHour, startMin] = startTime.split(":").map(Number);
	const startMinutes = startHour * 60 + startMin;
	const [endHour, endMin] = endTime.split(":").map(Number);
	const endMinutes = endHour * 60 + endMin;
	if (endMinutes < startMinutes) return !(currentMinutes >= startMinutes || currentMinutes <= endMinutes);
	return !(currentMinutes >= startMinutes && currentMinutes <= endMinutes);
}

function calculateSleepDuration(itemDurationMinutes: number, batteryLevel: number | null, isNight: boolean): number {
	if (batteryLevel !== null && batteryLevel < 20) return 7200;
	if (isNight) return 3600;
	const duration = itemDurationMinutes || 5;
	return duration * 60;
}

function buildScreenUrl(item: PlaylistItem | null): string {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
	if (!item) return `${baseUrl}/screens/weather?view=current`;

	switch (item.type) {
		case "weather":
			return `${baseUrl}/screens/weather?view=${item.config?.viewMode || "current"}`;
		case "calendar":
			return `${baseUrl}/screens/calendar?view=${item.config?.viewMode || "daily"}`;
		case "custom-text":
			return `${baseUrl}/screens/custom-text?text=${encodeURIComponent(item.config?.text || "")}`;
		default:
			return `${baseUrl}/screens/weather`;
	}
}

/**
 * BACKGROUND GENERATOR
 */
async function generateImage(batteryLevel: number | null, screenParam: string | null, humidityParam: string | null) {
	if (isGenerating) return; // Lock to prevent race conditions
	isGenerating = true;
	console.log("[Render] Starting generation...");

	try {
		let targetUrl: string;

		if (screenParam) {
			const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
			targetUrl = `${baseUrl}/screens/${screenParam}?humidity=${humidityParam || ""}`;
		} else {
			const currentItem = await getCurrentItem();

			if (!currentItem) {
				console.log("[Render] No active item.");
				targetUrl = buildScreenUrl(null);
			} else {
				console.log(`[Render] Generating item: ${currentItem.title}`);
				targetUrl = buildScreenUrl(currentItem);

				// Advance for the NEXT run
				await advanceCycle();
			}
		}

		// Launch Puppeteer
		const browser = await puppeteer.launch({
			headless: true,
			executablePath: "/usr/bin/chromium-browser",
			args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
			ignoreDefaultArgs: ["--enable-automation"],
		});

		const page = await browser.newPage();
		await page.setViewport({ width: 800, height: 480, deviceScaleFactor: 1 });

		const pageUrl = new URL(targetUrl);
		if (batteryLevel) pageUrl.searchParams.set("battery", batteryLevel.toString());

		await page.goto(pageUrl.toString(), { waitUntil: "networkidle0", timeout: 8000 });
		const screenshotBuffer = await page.screenshot({ type: "png" });
		await browser.close();

		// Process Image
		imageCache = await sharp(screenshotBuffer)
			.resize(800, 480, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
			.grayscale()
			.png({ palette: true, colors: 2, dither: 1.0 })
			.toBuffer();

		console.log("[Render] Generation complete. Cache updated.");
	} catch (error) {
		console.error("[Render] Generation failed:", error);
	} finally {
		isGenerating = false;
	}
}

export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams;
	const batteryLevel = searchParams.get("battery") ? parseInt(searchParams.get("battery")!) : null;
	const screenParam = searchParams.get("screen");
	const humidityParam = searchParams.get("humidity");

	// --- LOGIC FIX: Handle First Run vs Steady State ---

	if (!imageCache) {
		console.log("[Render] Cache empty (First Run). Generating immediately...");
		// 1. BLOCKING: Generate the FIRST image so we have something to show right now.
		await generateImage(batteryLevel, screenParam, humidityParam);

		// 2. NON-BLOCKING: Immediately trigger the NEXT generation.
		// This ensures that when the device wakes up NEXT time, the cache is already waiting with image #2.
		console.log("[Render] Triggering pre-generation for NEXT cycle...");
		generateImage(batteryLevel, screenParam, humidityParam);
	} else {
		// Steady State: Serve current cache, then refill for next time.
		// We trigger this *after* checking cache so we can return quickly,
		// but since we want to be sure it runs, we call it here (Fire & Forget).
		console.log("[Render] Serving cache. Refilling for next cycle...");
		generateImage(batteryLevel, screenParam, humidityParam);
	}

	// --- Headers & Response ---
	const settings = await getSettings();
	const isNight = isNightMode(settings.system.startTime, settings.system.endTime);
	const sleepSeconds = calculateSleepDuration(settings.system.refreshInterval, batteryLevel, isNight);

	if (!imageCache) {
		// Should not happen due to the await above, but safety first
		return NextResponse.json({ error: "Generation failed" }, { status: 500 });
	}

	return new NextResponse(imageCache as any, {
		headers: {
			"Content-Type": "image/png",
			"Content-Length": imageCache.length.toString(),
			"Cache-Control": "no-store, max-age=0",
			"X-Sleep-Seconds": sleepSeconds.toString(),
		},
	});
}
