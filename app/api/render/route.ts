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

// CRC32 Table for PNG checksums
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

// --- PNG HELPERS ---

function createChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcInput = Buffer.concat([typeBuf, data]);
    const crcVal = crc32(crcInput);

    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal >>> 0, 0); // Ensure unsigned

    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Manually packs a 1-bit or 2-bit PNG.
 * This is required because standard libraries often default to 8-bit palette.
 */
function createPng(rawData: Buffer, width: number, height: number, bitDepth: number): Buffer {
    // 1. IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr.writeUInt8(bitDepth, 8); // 1 or 2
    ihdr.writeUInt8(3, 9);        // Color Type 3 = Indexed Color
    ihdr.writeUInt8(0, 10);       // Compression 0
    ihdr.writeUInt8(0, 11);       // Filter 0
    ihdr.writeUInt8(0, 12);       // Interlace 0

    // 2. PLTE (Palette)
    // TRMNL expects 0=Black ... Max=White.
    let palette: Buffer;
    if (bitDepth === 1) {
        // 1-bit: Black (0), White (1)
        palette = Buffer.from([
            0, 0, 0,       // Index 0: Black
            255, 255, 255  // Index 1: White
        ]);
    } else {
        // 2-bit: Black, Dark Gray, Light Gray, White
        // We use explicit values: 0x00, 0x55, 0xAA, 0xFF
        palette = Buffer.from([
            0, 0, 0,       // 0: Black
            85, 85, 85,    // 1: Dark Gray
            170, 170, 170, // 2: Light Gray
            255, 255, 255  // 3: White
        ]);
    }

    // 3. IDAT (Pixel Data)
    // We must pack bits and prepend a filter byte (0) to each row.
    const pixelsPerByte = 8 / bitDepth;
    // Row size = 1 (filter) + ceil(width / pixelsPerByte)
    const packedRowSize = 1 + Math.ceil(width / pixelsPerByte);
    const packedData = Buffer.alloc(packedRowSize * height);

    for (let y = 0; y < height; y++) {
        const rowOffset = y * packedRowSize;
        packedData[rowOffset] = 0; // Filter Type 0 (None)

        for (let x = 0; x < width; x++) {
            const pixelVal = rawData[y * width + x];

            // Calculate which byte and bit-shift we are targeting
            const byteIndex = rowOffset + 1 + Math.floor(x / pixelsPerByte);
            const shift = 8 - bitDepth - (x % pixelsPerByte) * bitDepth;

            // Map 0-255 pixel to 0-3 index
            let index = 0;
            if (bitDepth === 1) {
                index = pixelVal > 127 ? 1 : 0;
            } else {
                if (pixelVal < 64) index = 0;
                else if (pixelVal < 128) index = 1;
                else if (pixelVal < 192) index = 2;
                else index = 3;
            }

            // OR the bits into place
            packedData[byteIndex] |= (index << shift);
        }
    }

    const compressed = zlib.deflateSync(packedData, { level: 9 });

    // Assemble Chunks
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // Magic
        createChunk("IHDR", ihdr),
        createChunk("PLTE", palette),
        createChunk("IDAT", compressed),
        createChunk("IEND", Buffer.alloc(0))
    ]);
}

// --- GENERATION LOGIC ---

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
        let bitDepth = settings.system.bitDepth;
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

        // Puppeteer
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

        // Sharp Processing
        const pipeline = sharp(screenshotBuffer)
            .resize(WIDTH, HEIGHT, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
            .grayscale();

        // Get Raw 8-bit Data
        const { data: rawData } = await pipeline.raw().toBuffer({ resolveWithObject: true });

        // Dithering & Inversion Logic
        // We modify the buffer in-place or copy it
        const processedData = Buffer.from(rawData);

        // Pre-calculate inversion map
        // If Inverted: 0(Black)->White(Index Max), 255(White)->Black(Index 0)
        // Actually, we handle inversion by flipping the target pixel values before packing

        if (invertParam) {
             console.log("[Render] Inverting pixels...");
             for (let i = 0; i < processedData.length; i++) {
                 processedData[i] = 255 - processedData[i];
             }
        }

        if (ditherParam) {
            console.log(`[Render] Applying Dithering (${bitDepth}-bit)...`);
            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {
                    const idx = y * WIDTH + x;
                    const oldPixel = processedData[idx];
                    let newPixel = 0;

                    // Quantize to target levels
                    if (bitDepth === 1) {
                         newPixel = oldPixel < 128 ? 0 : 255;
                    } else {
                        // 2-bit levels: 0, 85, 170, 255
                        if (oldPixel < 42) newPixel = 0;
                        else if (oldPixel < 128) newPixel = 85;
                        else if (oldPixel < 212) newPixel = 170;
                        else newPixel = 255;
                    }

                    processedData[idx] = newPixel;
                    const error = oldPixel - newPixel;

                    // Floyd-Steinberg
                    if (x + 1 < WIDTH) processedData[idx + 1] = Math.min(255, Math.max(0, processedData[idx + 1] + (error * 7) / 16));
                    if (y + 1 < HEIGHT) {
                        if (x > 0) processedData[idx + WIDTH - 1] = Math.min(255, Math.max(0, processedData[idx + WIDTH - 1] + (error * 3) / 16));
                        processedData[idx + WIDTH] = Math.min(255, Math.max(0, processedData[idx + WIDTH] + (error * 5) / 16));
                        if (x + 1 < WIDTH) processedData[idx + WIDTH + 1] = Math.min(255, Math.max(0, processedData[idx + WIDTH + 1] + (error * 1) / 16));
                    }
                }
            }
        }

        // Pack to PNG
        console.log(`[Render] Packing to ${bitDepth}-bit PNG...`);
        imageCache = createPng(processedData, WIDTH, HEIGHT, bitDepth);
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

    return new NextResponse(imageCache as any, {
        headers: {
            "Content-Type": "image/png",
            "Content-Length": imageCache.length.toString(),
            "Cache-Control": "no-store, max-age=0",
        },
    });
}
