import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { getCurrentItem, advanceCycle } from "@/lib/director";
import type { PlaylistItem } from "@/lib/playlist";

export const dynamic = "force-dynamic";

/**
 * Build URL for screen based on playlist item
 */
function buildScreenUrl(item: PlaylistItem): string {
	const baseUrl = "http://localhost:3000/screens";

	switch (item.type) {
		case "weather":
			const weatherView = item.config?.viewMode || "current";
			return `${baseUrl}/weather?view=${weatherView}`;
		case "calendar":
			const calendarView = item.config?.viewMode || "daily";
			return `${baseUrl}/calendar?view=${calendarView}`;
		case "custom-text":
			return `${baseUrl}/custom-text?text=${encodeURIComponent(item.config?.text || "")}`;
		default:
			return `${baseUrl}/weather`;
	}
}

export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams;
	const screenParam = searchParams.get("screen");

	let targetUrl: string;

	// Manual override: if screen param is provided, use it directly
	if (screenParam) {
		const humidityParam = searchParams.get("humidity") || "";
		targetUrl = `http://localhost:3000/screens/${screenParam}?humidity=${humidityParam}`;
	} else {
		// Director mode: get current item from playlist rotation
		const currentItem = await getCurrentItem();

		if (!currentItem) {
			console.error("[Render API] No item available from director");
			return NextResponse.json({ error: "No screens available in playlist" }, { status: 404 });
		}

		targetUrl = buildScreenUrl(currentItem);

		// Advance cycle for next render (ESP32 will call this endpoint periodically)
		await advanceCycle();
	}

	try {
		const browser = await puppeteer.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-infobars"],
			ignoreDefaultArgs: ["--enable-automation"],
		});

		const page = await browser.newPage();
		await page.setViewport({ width: 800, height: 480, deviceScaleFactor: 1 });
		await page.goto(targetUrl, { waitUntil: "networkidle0", timeout: 5000 });

		const screenshotBuffer = await page.screenshot({ type: "png" });
		await browser.close();

		const ditheredBuffer = await sharp(screenshotBuffer)
			.resize(800, 480, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
			.toColourspace("b-w")
			.png({ palette: true, colors: 2, dither: 1.0 })
			.toBuffer();

		return new NextResponse(ditheredBuffer as any, {
			headers: { "Content-Type": "image/png", "Cache-Control": "no-store, max-age=0" },
		});
	} catch (error) {
		console.error("Renderer Error:", error);
		return NextResponse.json({ error: "Failed" }, { status: 500 });
	}
}
