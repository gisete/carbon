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

// TRMNL 2-bit Palette (0=Black, 1=Dark, 2=Light, 3=White)
const PALETTE_2BIT = [0x00, 0x55, 0xAA, 0xFF];

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

/**
 * Creates a Windows V3 BMP Buffer from raw pixel data.
 * Handles 1-bit and 2-bit depths.
 */
function createBmp(data: Buffer, width: number, height: number, bitDepth: number): Buffer {
    // BMP Header Sizes
    const fileHeaderSize = 14;
    const infoHeaderSize = 40;
    const paletteSize = (1 << bitDepth) * 4; // 2 colors (8 bytes) or 4 colors (16 bytes)
    const stride = Math.ceil((width * bitDepth) / 32) * 4; // Row size in bytes (must be multiple of 4)
    const pixelDataSize = stride * height;
    const fileSize = fileHeaderSize + infoHeaderSize + paletteSize + pixelDataSize;

    const buffer = Buffer.alloc(fileSize);
    let offset = 0;

    // --- 1. BITMAPFILEHEADER ---
    buffer.write("BM", offset);           // Signature
    offset += 2;
    buffer.writeUInt32LE(fileSize, offset); // FileSize
    offset += 4;
    buffer.writeUInt16LE(0, offset);      // Reserved1
    offset += 2;
    buffer.writeUInt16LE(0, offset);      // Reserved2
    offset += 2;
    buffer.writeUInt32LE(fileHeaderSize + infoHeaderSize + paletteSize, offset); // DataOffset
    offset += 4;

    // --- 2. BITMAPINFOHEADER ---
    buffer.writeUInt32LE(infoHeaderSize, offset); // Size
    offset += 4;
    buffer.writeInt32LE(width, offset);           // Width
    offset += 4;
    buffer.writeInt32LE(-height, offset);         // Height (Negative = Top-Down)
    offset += 4;
    buffer.writeUInt16LE(1, offset);              // Planes
    offset += 2;
    buffer.writeUInt16LE(bitDepth, offset);       // BitCount (1 or 2)
    offset += 2;
    buffer.writeUInt32LE(0, offset);              // Compression (BI_RGB)
    offset += 4;
    buffer.writeUInt32LE(pixelDataSize, offset);  // ImageSize
    offset += 4;
    buffer.writeInt32LE(2835, offset);            // XPixelsPerMeter (72 DPI)
    offset += 4;
    buffer.writeInt32LE(2835, offset);            // YPixelsPerMeter
    offset += 4;
    buffer.writeUInt32LE(0, offset);              // ColorsUsed
    offset += 4;
    buffer.writeUInt32LE(0, offset);              // ColorsImportant
    offset += 4;

    // --- 3. COLOR PALETTE ---
    if (bitDepth === 1) {
        // Black
        buffer.writeUInt8(0, offset++); buffer.writeUInt8(0, offset++); buffer.writeUInt8(0, offset++); buffer.writeUInt8(0, offset++);
        // White
        buffer.writeUInt8(255, offset++); buffer.writeUInt8(255, offset++); buffer.writeUInt8(255, offset++); buffer.writeUInt8(0, offset++);
    } else {
        // 4-Color Grayscale Palette
        for (const c of PALETTE_2BIT) {
            buffer.writeUInt8(c, offset++); // Blue
            buffer.writeUInt8(c, offset++); // Green
            buffer.writeUInt8(c, offset++); // Red
            buffer.writeUInt8(0, offset++); // Reserved
        }
    }

    // --- 4. PIXEL DATA ---
    // Data is assumed to be 1 byte per pixel (grayscale 0-255)
    // We assume input `data` is exactly width * height bytes

    // We need to pack the bits
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const byteIdx = (fileHeaderSize + infoHeaderSize + paletteSize) + (y * stride) + Math.floor(x * bitDepth / 8);
            const pixelVal = data[y * width + x];

            // Get palette index
            let colorIndex = 0;
            if (bitDepth === 1) {
                colorIndex = pixelVal > 127 ? 1 : 0;
                // Pack 1-bit: MSB first
                const bitPos = 7 - (x % 8);
                if (colorIndex) {
                   buffer[byteIdx] |= (1 << bitPos);
                }
            } else {
                // 2-bit mapping
                if (pixelVal < 64) colorIndex = 0;      // Black
                else if (pixelVal < 128) colorIndex = 1; // Dark Gray
                else if (pixelVal < 192) colorIndex = 2; // Light Gray
                else colorIndex = 3;                     // White

                // Pack 2-bit: MSB first (pixels 0,1,2,3 in a byte)
                const shift = 6 - ((x % 4) * 2);
                buffer[byteIdx] |= (colorIndex << shift);
            }
        }
    }

    return buffer;
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
        let bitDepth = settings.system.bitDepth;
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

        // --- PUPPETEER ---
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

        // --- IMAGE PROCESSING (SHARP) ---
        let pipeline = sharp(screenshotBuffer)
            .resize(WIDTH, HEIGHT, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
            .grayscale();

        // Fix: Invert BEFORE mapping to palette
        if (invertParam) {
            console.log("[Render] Inverting image...");
            pipeline = pipeline.negate();
        }

        // Get raw 8-bit grayscale buffer
        const { data: rawData, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

        // --- DITHERING & MAPPING ---
        // We do this manually on the buffer to ensure exact control over the palette indices
        const processedData = Buffer.from(rawData); // Copy

        if (ditherParam) {
            console.log(`[Render] Applying Floyd-Steinberg dithering (${bitDepth}-bit)...`);
            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {
                    const idx = y * WIDTH + x;
                    const oldPixel = processedData[idx];
                    let newPixel = 0;

                    // Quantize
                    if (bitDepth === 1) {
                         newPixel = oldPixel < 128 ? 0 : 255;
                    } else {
                        // 2-bit quantization (0, 85, 170, 255)
                        if (oldPixel < 42) newPixel = 0;
                        else if (oldPixel < 128) newPixel = 85;
                        else if (oldPixel < 212) newPixel = 170;
                        else newPixel = 255;
                    }

                    processedData[idx] = newPixel;
                    const error = oldPixel - newPixel;

                    // Distribute error
                    if (x + 1 < WIDTH) processedData[idx + 1] = Math.min(255, Math.max(0, processedData[idx + 1] + (error * 7) / 16));
                    if (y + 1 < HEIGHT) {
                        if (x > 0) processedData[idx + WIDTH - 1] = Math.min(255, Math.max(0, processedData[idx + WIDTH - 1] + (error * 3) / 16));
                        processedData[idx + WIDTH] = Math.min(255, Math.max(0, processedData[idx + WIDTH] + (error * 5) / 16));
                        if (x + 1 < WIDTH) processedData[idx + WIDTH + 1] = Math.min(255, Math.max(0, processedData[idx + WIDTH + 1] + (error * 1) / 16));
                    }
                }
            }
        }

        // --- CREATE BMP ---
        console.log(`[Render] Packing to ${bitDepth}-bit BMP...`);
        imageCache = createBmp(processedData, WIDTH, HEIGHT, bitDepth);
        console.log(`[Render] Generated ${imageCache.length} bytes.`);

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

    return new NextResponse(imageCache, {
        headers: {
            "Content-Type": "image/bmp", // Serving BMP now
            "Content-Length": imageCache.length.toString(),
            "Cache-Control": "no-store, max-age=0",
        },
    });
}
