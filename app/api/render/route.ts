import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { getCurrentItem, advanceCycle } from "@/lib/director";
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
		default:
			return `${baseUrl}/screens/weather`;
	}
}

/**
 * GENERATOR
 */
async function generateImage(batteryLevel: number | null, screenParam: string | null, humidityParam: string | null) {
	if (isGenerating) return;
	isGenerating = true;
	console.log("[Render] Starting generation...");

	try {
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

		lastGeneratedTime = Date.now();

		// 2. Advance the cycle AFTER capture
		if (!screenParam) {
			await advanceCycle();
			console.log("[Render] Cycle advanced.");
		}

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

	// --- LOGIC CHANGE: Generate on Demand ---
	// If the cache is older than 60 seconds (or doesn't exist), generate NEW content.
	const isStale = !imageCache || Date.now() - lastGeneratedTime > 60 * 1000;

	if (isStale) {
		console.log("[Render] Cache stale/empty. Generating FRESH image...");
		// Await the generation so we serve FRESH content
		await generateImage(batteryLevel, screenParam, humidityParam);
	} else {
		console.log("[Render] Serving valid cache.");
	}

	if (!imageCache) {
		return NextResponse.json({ error: "Generation failed" }, { status: 500 });
	}

	// We don't strictly need the sleep header here anymore since the separate API handles it,
	// but we return the image buffer.
	return new NextResponse(imageCache as any, {
		headers: {
			"Content-Type": "image/png",
			"Content-Length": imageCache.length.toString(),
			"Cache-Control": "no-store, max-age=0",
		},
	});
}
