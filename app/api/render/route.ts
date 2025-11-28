import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import sharp from "sharp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams;
	const screenName = searchParams.get("screen") || "weather";

	// 1. CAPTURE THE HUMIDITY PARAM
	const humidityParam = searchParams.get("humidity") || "";

	// 2. PASS IT TO THE INTERNAL URL
	const targetUrl = `http://localhost:3000/screens/${screenName}?humidity=${humidityParam}`;

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
