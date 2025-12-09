import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { getCurrentItem, advanceCycle } from "@/lib/director";
import { getSettings } from "@/lib/settings";
import type { PlaylistItem } from "@/lib/playlist";

export const dynamic = "force-dynamic";

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
	const baseUrl = "http://localhost:3000/screens";

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

export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams;

	// 1. Get Context
	const batteryParam = searchParams.get("battery");
	const batteryLevel = batteryParam ? parseInt(batteryParam) : null;
	const screenParam = searchParams.get("screen");

	// 2. Determine State
	const settings = await getSettings();
	const isNight = isNightMode(settings.system.startTime, settings.system.endTime);

	let targetUrl: string;
	let itemDuration = settings.system.refreshInterval;

	// 3. Resolve Target URL
	if (screenParam) {
		const humidityParam = searchParams.get("humidity") || "";
		targetUrl = `http://localhost:3000/screens/${screenParam}?humidity=${humidityParam}`;
	} else {
		const currentItem = await getCurrentItem();

		if (!currentItem) {
			console.log("[Render] No active item from Director (Night Mode or Empty)");
			targetUrl = buildScreenUrl(null);
		} else {
			targetUrl = buildScreenUrl(currentItem);
			itemDuration = currentItem.duration || itemDuration;
			await advanceCycle();
		}
	}

	// 4. Calculate Sleep Duration
	const sleepSeconds = calculateSleepDuration(itemDuration, batteryLevel, isNight);

	try {
		// --- CRITICAL CHANGE: Use System Chromium ---
		const browser = await puppeteer.launch({
			headless: true,
			executablePath: "/usr/bin/chromium-browser", // <--- Points to Alpine Chromium
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

		await page.goto(pageUrl.toString(), { waitUntil: "networkidle0", timeout: 8000 });

		const screenshotBuffer = await page.screenshot({ type: "png" });
		await browser.close();

		const ditheredBuffer = await sharp(screenshotBuffer)
			.resize(800, 480, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
			.grayscale() // Convert to grayscale first
			.png({
				palette: true,
				colors: 2,
				dither: 1.0, // Floyd-Steinberg dithering - simulates grays with B&W patterns
			})
			.toBuffer();

		const fileSize = ditheredBuffer.length.toString();

		return new NextResponse(ditheredBuffer as any, {
			headers: {
				"Content-Type": "image/png",
				"Content-Length": fileSize,
				"Cache-Control": "no-store, max-age=0",
				"X-Sleep-Seconds": sleepSeconds.toString(),
			},
		});
	} catch (error) {
		console.error("Renderer Error:", error);
		return NextResponse.json({ error: "Failed to render image" }, { status: 500 });
	}
}
