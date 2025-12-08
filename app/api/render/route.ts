import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { getCurrentItem, advanceCycle } from "@/lib/director";
import { getSettings } from "@/lib/settings";
import type { PlaylistItem } from "@/lib/playlist";

export const dynamic = "force-dynamic";

/**
 * Helper to determine if we are in "Night Mode" (outside active hours)
 * Logic duplicated from director to ensure availability here
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
		// If no item (e.g. night mode), show a generic "Sleeping" or "Weather" screen
		// You can create a dedicated /screens/sleep page later if you want
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

	// 1. Get Context (Battery & Screen)
	const batteryParam = searchParams.get("battery");
	const batteryLevel = batteryParam ? parseInt(batteryParam) : null;
	const screenParam = searchParams.get("screen");

	// 2. Determine State
	const settings = await getSettings();
	const isNight = isNightMode(settings.system.startTime, settings.system.endTime);

	let targetUrl: string;
	let itemDuration = settings.system.refreshInterval; // Default global interval

	// 3. Resolve Target URL
	if (screenParam) {
		// Manual Override (Testing)
		const humidityParam = searchParams.get("humidity") || "";
		targetUrl = `http://localhost:3000/screens/${screenParam}?humidity=${humidityParam}`;
	} else {
		// Director Mode (Automatic)
		const currentItem = await getCurrentItem();

		// If Director returns null, force Night Mode behavior
		if (!currentItem) {
			console.log("[Render] No active item from Director (likely Night Mode)");
			// Render the default screen (or a specific sleep screen)
			targetUrl = buildScreenUrl(null);
		} else {
			targetUrl = buildScreenUrl(currentItem);
			itemDuration = currentItem.duration || itemDuration;
			// Advance cycle only if we found an item
			await advanceCycle();
		}
	}

	// 4. Calculate Sleep Duration
	const sleepSeconds = calculateSleepDuration(itemDuration, batteryLevel, isNight);

	try {
		const browser = await puppeteer.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-infobars"],
			ignoreDefaultArgs: ["--enable-automation"],
		});

		const page = await browser.newPage();
		await page.setViewport({ width: 800, height: 480, deviceScaleFactor: 1 });

		// Pass battery info to the page in case you want to display it visually later
		const pageUrl = new URL(targetUrl);
		if (batteryLevel) pageUrl.searchParams.set("battery", batteryLevel.toString());
		if (isNight) pageUrl.searchParams.set("mode", "night");

		await page.goto(pageUrl.toString(), { waitUntil: "networkidle0", timeout: 5000 });

		const screenshotBuffer = await page.screenshot({ type: "png" });
		await browser.close();

		const ditheredBuffer = await sharp(screenshotBuffer)
			.resize(800, 480, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
			.toColourspace("b-w")
			.png({ palette: true, colors: 2, dither: 1.0 })
			.toBuffer();

		// 5. Return Image with Sleep Header
		return new NextResponse(ditheredBuffer as any, {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control": "no-store, max-age=0",
				// This is the magic header the ESP32 will read
				"X-Sleep-Seconds": sleepSeconds.toString(),
			},
		});
	} catch (error) {
		console.error("Renderer Error:", error);
		return NextResponse.json({ error: "Failed" }, { status: 500 });
	}
}
