import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { getCurrentItem, advanceCycle, updateBatteryLevel, getDirectorState } from "@/lib/director";
import { getPlaylistCollection } from "@/lib/playlist"; // <--- Added this import
import type { PlaylistItem } from "@/lib/playlist";

export const dynamic = "force-dynamic";

// --- GLOBAL CACHE ---
let imageCache: Buffer | null = null;
let lastGeneratedTime = 0;
let isGenerating = false;

function buildScreenUrl(item: PlaylistItem | null): string {
	const baseUrl = process.env.BASE_URL || "http://localhost:3000";
	if (!item) return `${baseUrl}/screens/weather?view=current`;

	switch (item.type) {
		case "weather":
			return `${baseUrl}/screens/weather?view=${item.config?.viewMode || "current"}`;
		case "calendar":
			return `${baseUrl}/screens/calendar?view=${item.config?.viewMode || "daily"}`;
		case "custom-text":
			return `${baseUrl}/screens/custom-text?text=${encodeURIComponent(item.config?.text || "")}`;
		case "logo":
			return `${baseUrl}/screens/logo?fontSize=${item.config?.fontSize || "120"}`;
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
		while (isGenerating) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		return;
	}

	isGenerating = true;
	console.log("[Render] Starting generation...");

	try {
		let batteryLevel = batteryParam;
		if (batteryLevel === null) {
			const state = await getDirectorState();
			if (state.batteryLevel !== undefined) {
				batteryLevel = state.batteryLevel;
			}
		}

		let targetUrl: string;

		// --- FIX STARTS HERE ---
		if (screenParam) {
			// 1. Try to find an item with this ID
			const collection = await getPlaylistCollection();
			let foundItem: PlaylistItem | undefined;

			for (const playlist of collection.playlists) {
				foundItem = playlist.items.find((i) => i.id === screenParam);
				if (foundItem) break;
			}

			if (foundItem) {
				console.log(`[Render] Found item by ID: ${foundItem.title} (${foundItem.type})`);
				targetUrl = buildScreenUrl(foundItem);
			} else {
				// 2. Fallback: If no ID found, assume it's a direct path (legacy support for ?screen=weather)
				console.log(`[Render] ID not found, trying as direct path: ${screenParam}`);
				const baseUrl = process.env.BASE_URL || "http://localhost:3000";
				targetUrl = `${baseUrl}/screens/${screenParam}?humidity=${humidityParam || ""}`;
			}
		} else {
			// 3. No param? Ask Director what to show
			const currentItem = await getCurrentItem();
			if (!currentItem) {
				console.log("[Render] No active item.");
				targetUrl = buildScreenUrl(null);
			} else {
				console.log(`[Render] Generating active item: ${currentItem.title}`);
				targetUrl = buildScreenUrl(currentItem);
			}
		}
		// --- FIX ENDS HERE ---

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

		console.log(`[Render] Visiting: ${pageUrl.toString()}`); // Debug log
		await page.goto(pageUrl.toString(), { waitUntil: "networkidle0", timeout: 8000 });

		const screenshotBuffer = await page.screenshot({ type: "png" });
		await browser.close();

		imageCache = await sharp(screenshotBuffer)
			.resize(800, 480, {
				fit: "contain",
				background: { r: 255, g: 255, b: 255 },
			})
			.grayscale()
			.png({
				palette: true,
				colors: 16,
				dither: 0,
			})
			.toBuffer();

		lastGeneratedTime = Date.now();
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

	if (batteryLevel !== null && batteryLevel >= 0 && batteryLevel <= 100) {
		updateBatteryLevel(batteryLevel).catch((err) => {
			console.error("[Render API] Failed to update battery level:", err);
		});
	}

	console.log("[Render] Device requesting image...");
	await generateImage(batteryLevel, screenParam, humidityParam);

	if (!imageCache) {
		return NextResponse.json({ error: "Generation failed" }, { status: 500 });
	}

	return new NextResponse(imageCache as any, {
		headers: {
			"Content-Type": "image/png",
			"Content-Length": imageCache.length.toString(),
			"Cache-Control": "no-store, max-age=0",
		},
	});
}
