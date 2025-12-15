import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import sharp from "sharp";
import zlib from "zlib";
import { getCurrentItem, getDirectorState, updateBatteryLevel } from "@/lib/director";
import { getPlaylistCollection } from "@/lib/playlist";
import type { PlaylistItem } from "@/lib/playlist";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// --- CONSTANTS ---
const WIDTH = 800;
const HEIGHT = 480;

// CRC32 Table
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        if (c & 1) c = 0xedb88320 ^ (c >>> 1);
        else c = c >>> 1;
    }
    CRC_TABLE[n] = c;
}

function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ 0xffffffff;
}

function createChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Packs 2-bit Grayscale PNG (Color Type 0).
 * Maps 0=White, 3=Black (Reverse of standard) to fix device inversion.
 */
function createGrayscalePng(rawData: Buffer, width: number, height: number, invertInput: boolean): Buffer {
    // 1. IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr.writeUInt8(2, 8);        // Bit Depth 2
    ihdr.writeUInt8(0, 9);        // Color Type 0 (Grayscale)
    ihdr.writeUInt8(0, 10);       // Compression 0
    ihdr.writeUInt8(0, 11);       // Filter 0
    ihdr.writeUInt8(0, 12);       // Interlace 0

    // 2. IDAT (Pixel Data)
    const pixelsPerByte = 4; // 8 bits / 2 bits per pixel
    const packedRowSize = 1 + Math.ceil(width / pixelsPerByte);
    const packedData = Buffer.alloc(packedRowSize * height);

    for (let y = 0; y < height; y++) {
        const rowOffset = y * packedRowSize;
        packedData[rowOffset] = 0; // Filter Type 0 (None)

        for (let x = 0; x < width; x++) {
            const pixelVal = rawData[y * width + x];

            // Map 0-255 to 0-3
            // Standard: 0=Black, 3=White
            // TRMNL Fix: 0=White, 3=Black (We flip the logic here)

            let val = 0;
            // Quantize
            if (pixelVal < 64) val = 0;      // Black
            else if (pixelVal < 128) val = 1; // Dark Gray
            else if (pixelVal < 192) val = 2; // Light Gray
            else val = 3;                     // White

            // If "invertInput" is false (default), we output "Fixed" (Inverted) mapping
            // Device expects 0=White, 3=Black.
            // So if pixel is White (3), we write 0.
            // If pixel is Black (0), we write 3.

            let finalVal = 3 - val; // 3->0, 0->3

            if (invertInput) {
                // If user requests "invert", we flip it back to Standard (0=Black)
                finalVal = val;
            }

            // Pack bits (MSB first)
            const byteIndex = rowOffset + 1 + Math.floor(x / pixelsPerByte);
            const shift = 6 - ((x % 4) * 2);
            packedData[byteIndex] |= (finalVal << shift);
        }
    }

    // Use Level 4 compression to avoid "streaks" from complex dictionaries
    const compressed = zlib.deflateSync(packedData, { level: 4 });

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        createChunk("IHDR", ihdr),
        // No PLTE for Grayscale
        createChunk("IDAT", compressed),
        createChunk("IEND", Buffer.alloc(0))
    ]);
}

let imageCache: Buffer | null = null;
let isGenerating = false;

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

        if (screenParam) {
            const collection = await getPlaylistCollection();
            let foundItem = null;
            for (const playlist of collection.playlists) {
                foundItem = playlist.items.find((i) => i.id === screenParam);
                if (foundItem) break;
            }
            targetUrl = foundItem ? buildScreenUrl(foundItem) : `${process.env.BASE_URL || "http://localhost:3000"}/screens/${screenParam}?humidity=${humidityParam || ""}`;
        } else {
            const currentItem = await getCurrentItem();
            targetUrl = buildScreenUrl(currentItem);
        }

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

        // Sharp: Resize & Grayscale only
        const pipeline = sharp(screenshotBuffer)
            .resize(WIDTH, HEIGHT, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
            .grayscale();

        const { data: rawData, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

        // Dither in-place if needed
        const processedData = Buffer.from(rawData);
        if (ditherParam) {
            for (let y = 0; y < info.height; y++) {
                for (let x = 0; x < info.width; x++) {
                    const idx = y * info.width + x;
                    const oldPixel = processedData[idx];

                    // Quantize 4 levels
                    let newPixel = 0;
                    if (oldPixel < 42) newPixel = 0;
                    else if (oldPixel < 128) newPixel = 85;
                    else if (oldPixel < 212) newPixel = 170;
                    else newPixel = 255;

                    processedData[idx] = newPixel;
                    const error = oldPixel - newPixel;

                    // Atkinson Dithering (Cleaner than Floyd)
                    if (x + 1 < info.width) processedData[idx + 1] += error / 8;
                    if (x + 2 < info.width) processedData[idx + 2] += error / 8;
                    if (y + 1 < info.height) {
                        if (x > 0) processedData[idx + info.width - 1] += error / 8;
                        processedData[idx + info.width] += error / 8;
                        if (x + 1 < info.width) processedData[idx + info.width + 1] += error / 8;
                    }
                    if (y + 2 < info.height) processedData[idx + 2 * info.width] += error / 8;
                }
            }
        }

        console.log(`[Render] Packing 2-bit Grayscale PNG...`);
        imageCache = createGrayscalePng(processedData, WIDTH, HEIGHT, invertParam);
        console.log(`[Render] Done. Size: ${imageCache.length} bytes`);

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
    const dither = searchParams.get("dither") !== "false"; // Default True

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
