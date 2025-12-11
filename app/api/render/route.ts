import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { getCurrentItem, advanceCycle, updateBatteryLevel, getDirectorState } from "@/lib/director";
import { getSettings } from "@/lib/settings";
import type { PlaylistItem } from "@/lib/playlist";

export const dynamic = "force-dynamic";

// --- GLOBAL CACHE ---
let imageCache: Buffer | null = null;
let lastGeneratedTime = 0;
let isGenerating = false;

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
		// --- ADD THIS BLOCK ---
		case "logo":
			return `${baseUrl}/screens/logo?fontSize=${item.config?.fontSize || "120"}`;
		// ----------------------
		default:
			return `${baseUrl}/screens/weather`;
	}
}

/**
 * GENERATOR
 */
async function generateImage(batteryParam: number | null, screenParam: string | null, humidityParam: string | null) {
	if (isGenerating) {
		console.log("[Render] Already generating, waiting...");
		// Wait for current generation to complete
		while (isGenerating) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		return;
	}

	isGenerating = true;
	console.log("[Render] Starting generation...");

	try {
		// 1. Resolve Battery Level (Priority: URL Param > Saved State)
		let batteryLevel = batteryParam;
		if (batteryLevel === null) {
			const state = await getDirectorState();
			if (state.batteryLevel !== undefined) {
				batteryLevel = state.batteryLevel;
				console.log(`[Render] Using saved battery level: ${batteryLevel}%`);
			}
		}

		let targetUrl: string;

		if (screenParam) {
			const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
			targetUrl = `${baseUrl}/screens/${screenParam}?humidity=${humidityParam || ""}`;
		} else {
			// 1. Get the ITEM that SHOULD be shown NOW
			const currentItem = await getCurrentItem();

			if (!currentItem) {
				console.log("[Render] No active item.");
				targetUrl = buildScreenUrl(null);
			} else {
				console.log(`[Render] Generating item: ${currentItem.title}`);
				targetUrl = buildScreenUrl(currentItem);
			}
		}

		// Launch Puppeteer
		// In production (Docker), use the specific Chromium path
		// In development, let Puppeteer find Chrome automatically
		const isProduction = process.env.NODE_ENV === "production";
		const browser = await puppeteer.launch({
			headless: true,
			...(isProduction && { executablePath: "/usr/bin/chromium-browser" }),
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

		// Process Image - 4-bit Grayscale for TRMNL firmware
		imageCache = await sharp(screenshotBuffer)
			.resize(800, 480, {
				fit: "contain",
				background: { r: 255, g: 255, b: 255 },
			})
			.grayscale() // Convert to grayscale
			.png({
				palette: true,
				colors: 16, // 4-bit grayscale (16 shades)
				dither: 0, // Disable dithering - let firmware's waveform handle it
			})
			.toBuffer();

		lastGeneratedTime = Date.now();

		// NOTE: We do NOT advance the cycle here anymore.
		// The Director handles advancement based on wall clock time via tick().
		// This prevents race conditions where the device render time causes skipped screens.

		console.log("[Render] Generation complete.");
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

	// Fire and forget: Update battery level if provided
	if (batteryLevel !== null && batteryLevel >= 0 && batteryLevel <= 100) {
		updateBatteryLevel(batteryLevel).catch((err) => {
			console.error("[Render API] Failed to update battery level:", err);
		});
	}

	// CRITICAL: Always generate fresh image on demand for the device
	// The device only calls this once per wake cycle, so we need fresh content
	console.log("[Render] Device requesting image, generating fresh content...");
	await generateImage(batteryLevel, screenParam, humidityParam);

	if (!imageCache) {
		return NextResponse.json({ error: "Generation failed" }, { status: 500 });
	}

	// Return the fresh image with no-cache headers
	return new NextResponse(imageCache as any, {
		headers: {
			"Content-Type": "image/png",
			"Content-Length": imageCache.length.toString(),
			"Cache-Control": "no-store, max-age=0",
		},
	});
}
