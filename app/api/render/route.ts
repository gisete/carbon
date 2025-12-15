import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { getCurrentItem, getDirectorState, updateBatteryLevel } from "@/lib/director";
import { getPlaylistCollection } from "@/lib/playlist";
import type { PlaylistItem } from "@/lib/playlist";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// --- CONSTANTS ---
const WIDTH = 800;
const HEIGHT = 480;

// --- CACHE ---
let imageCache: Buffer | null = null;
let isGenerating = false;

// --- HELPERS ---

function buildScreenUrl(item: PlaylistItem | null): string {
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    if (!item) return `${baseUrl}/screens/weather?view=current`;

    switch (item.type) {
        case "weather": return `${baseUrl}/screens/weather?view=${item.config?.viewMode || "current"}`;
        case "calendar": return `${baseUrl}/screens/calendar?view=${item.config?.viewMode || "daily"}`;
        case "custom-text": return `${baseUrl}/screens/custom-text?text=${encodeURIComponent(item.config?.text || "")}`;
        case "logo": return `${baseUrl}/screens/logo?fontSize=${item.config?.fontSize || "120"}`;
        case "image": return `${baseUrl}/screens/image?id=${item.id}`;
        default: return `${baseUrl}/screens/weather`;
    }
}

async function generateImage(batteryParam: number | null, screenParam: string | null, humidityParam: string | null, invertParam: boolean, ditherParam: boolean) {
    if (isGenerating) {
        // Wait for existing generation to finish
        while (isGenerating) await new Promise((r) => setTimeout(r, 100));
        return;
    }
    isGenerating = true;
    console.log("[Render] Starting generation...");

    try {
        let batteryLevel = batteryParam;
        if (batteryLevel === null) {
            const state = await getDirectorState();
            batteryLevel = state.batteryLevel ?? null;
        }

        const settings = await getSettings();
        let bitDepth = settings.system.bitDepth; // 1 or 2
        let targetUrl = "";

        // --- RESOLVE URL ---
        if (screenParam) {
            const collection = await getPlaylistCollection();
            let foundItem;
            for (const playlist of collection.playlists) {
                foundItem = playlist.items.find((i) => i.id === screenParam);
                if (foundItem) break;
            }
            if (foundItem) {
                targetUrl = buildScreenUrl(foundItem);
                if (foundItem.config?.bitDepth) bitDepth = foundItem.config.bitDepth;
            } else {
                const baseUrl = process.env.BASE_URL || "http://localhost:3000";
                targetUrl = `${baseUrl}/screens/${screenParam}?humidity=${humidityParam || ""}`;
            }
        } else {
            const currentItem = await getCurrentItem();
            targetUrl = buildScreenUrl(currentItem);
            if (currentItem?.config?.bitDepth) bitDepth = currentItem.config.bitDepth;
        }

        // --- PUPPETEER SCREENSHOT ---
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
            executablePath: process.env.NODE_ENV === "production" ? "/usr/bin/chromium-browser" : undefined,
        });
        const page = await browser.newPage();
        await page.setViewport({ width: WIDTH, height: HEIGHT });

        const pageUrl = new URL(targetUrl);
        if (batteryLevel !== null) pageUrl.searchParams.set("battery", batteryLevel.toString());

        console.log(`[Render] Visiting: ${pageUrl.toString()}`);
        await page.goto(pageUrl.toString(), { waitUntil: "networkidle0", timeout: 8000 });
        const screenshotBuffer = await page.screenshot({ type: "png" });
        await browser.close();

        // --- 1. PRE-PROCESS WITH SHARP ---
        // Resize and standard grayscale conversion
        let pipeline = sharp(screenshotBuffer)
            .resize(WIDTH, HEIGHT, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
            .grayscale(); // Ensure 1 channel

        if (invertParam) {
            console.log("[Render] Inverting image...");
            pipeline = pipeline.negate();
        }

        // Get raw pixel data (8-bit grayscale)
        const { data: rawData, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

        // --- 2. MANUAL QUANTIZATION & DITHERING ---
        // We modify the buffer in-place to enforce our specific palette (1-bit or 2-bit)
        // This ensures that when we save as PNG later, the colors are exactly what we want.

        const processedData = Buffer.from(rawData); // Copy buffer
        const width = info.width;
        const height = info.height;

        console.log(`[Render] Processing pixels (BitDepth: ${bitDepth}, Dither: ${ditherParam})...`);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const oldPixel = processedData[idx];
                let newPixel = 0;

                // Quantize to target levels
                if (bitDepth === 1) {
                    // 1-bit: 0 (Black) or 255 (White)
                    newPixel = oldPixel < 128 ? 0 : 255;
                } else {
                    // 2-bit: 0, 85, 170, 255
                    if (oldPixel < 42) newPixel = 0;
                    else if (oldPixel < 128) newPixel = 85;
                    else if (oldPixel < 212) newPixel = 170;
                    else newPixel = 255;
                }

                processedData[idx] = newPixel;

                // Floyd-Steinberg Dithering
                if (ditherParam) {
                    const error = oldPixel - newPixel;
                    if (x + 1 < width)
                        processedData[idx + 1] = Math.min(255, Math.max(0, processedData[idx + 1] + (error * 7) / 16));
                    if (y + 1 < height) {
                        if (x > 0)
                            processedData[idx + width - 1] = Math.min(255, Math.max(0, processedData[idx + width - 1] + (error * 3) / 16));
                        processedData[idx + width] = Math.min(255, Math.max(0, processedData[idx + width] + (error * 5) / 16));
                        if (x + 1 < width)
                            processedData[idx + width + 1] = Math.min(255, Math.max(0, processedData[idx + width + 1] + (error * 1) / 16));
                    }
                }
            }
        }

        // --- 3. ENCODE TO PNG WITH SHARP ---
        // We create a new Sharp instance from our manually processed raw buffer.
        // We tell Sharp to use a palette (indexed color) which compresses strictly.
        console.log(`[Render] Encoding to PNG...`);

        imageCache = await sharp(processedData, {
            raw: {
                width: width,
                height: height,
                channels: 1 // Grayscale
            }
        })
        .png({
            palette: true, // Use indexed color (PLTE)
            colors: bitDepth === 1 ? 2 : 4, // Force 2 or 4 colors
            compressionLevel: 9, // Max compression
            adaptiveFiltering: false
        })
        .toBuffer();

        console.log(`[Render] Generated PNG size: ${imageCache.length} bytes`);

    } catch (error) {
        console.error("[Render] Error:", error);
    } finally {
        isGenerating = false;
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const battery = searchParams.get("battery");
    const batteryLevel = battery ? parseInt(battery) : null;
    const screen = searchParams.get("screen");
    const humidity = searchParams.get("humidity");
    const invert = searchParams.get("invert") === "true";
    const dither = searchParams.get("dither") !== "false";

    if (batteryLevel !== null) updateBatteryLevel(batteryLevel).catch(console.error);

    await generateImage(batteryLevel, screen, humidity, invert, dither);

    if (!imageCache) return NextResponse.json({ error: "Generation failed" }, { status: 500 });

    return new NextResponse(imageCache as any, {
        headers: {
            "Content-Type": "image/png",
            "Content-Length": imageCache.length.toString(),
            "Cache-Control": "no-store, max-age=0",
        },
    });
}
