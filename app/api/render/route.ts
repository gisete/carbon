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
        case "system": return `${baseUrl}/screens/system`;
        case "comic": return `${baseUrl}/screens/comic`;
        case "servers": return `${baseUrl}/screens/servers`;
        default: return `${baseUrl}/screens/weather`;
    }
}

async function generateImage(batteryParam: number | null, screenParam: string | null, humidityParam: string | null, invertParam: boolean, ditherParam: boolean) {
    if (isGenerating) {
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
        let targetUrl = "";

        // Resolve URL
        if (screenParam) {
            const collection = await getPlaylistCollection();
            let foundItem;
            for (const playlist of collection.playlists) {
                foundItem = playlist.items.find((i) => i.id === screenParam);
                if (foundItem) break;
            }
            if (foundItem) {
                targetUrl = buildScreenUrl(foundItem);
            } else {
                const baseUrl = process.env.BASE_URL || "http://localhost:3000";
                targetUrl = `${baseUrl}/screens/${screenParam}?humidity=${humidityParam || ""}`;
            }
        } else {
            const currentItem = await getCurrentItem();
            targetUrl = buildScreenUrl(currentItem);
        }

        // Puppeteer: Screenshot
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
        await page.goto(pageUrl.toString(), { waitUntil: "networkidle0", timeout: 15000 });

        // Wait for images to load (especially important for comic screen with external images)
        await page.evaluate(() => {
            return Promise.all(
                Array.from(document.images)
                    .filter(img => !img.complete)
                    .map(img => new Promise(resolve => {
                        img.addEventListener('load', resolve);
                        img.addEventListener('error', resolve);
                    }))
            );
        });

        const screenshotBuffer = await page.screenshot({ type: "png" });
        await browser.close();

        // Sharp: Pipeline
        // 1. Resize & Grayscale
        let pipeline = sharp(screenshotBuffer)
            .resize(WIDTH, HEIGHT, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
            .grayscale();

        // 2. Invert (If requested)
        // We do this BEFORE quantization to ensure colors map correctly
        if (invertParam) {
            console.log("[Render] Inverting image...");
            pipeline = pipeline.negate();
        }

        // 3. Output to PNG with STRICT settings
        // adaptiveFiltering: false is KEY to fixing streaks (forces Filter None)
        // colors: 4 forces 2-bit palette
        imageCache = await pipeline
            .png({
                palette: true,
                colors: 4,
                compressionLevel: 9,
                adaptiveFiltering: false, // <--- CRITICAL FIX FOR STREAKS
                dither: ditherParam ? 1.0 : 0 // Use Sharp's high-quality dithering
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
