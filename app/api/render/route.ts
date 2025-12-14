import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { getCurrentItem, advanceCycle, updateBatteryLevel, getDirectorState } from "@/lib/director";
import { getPlaylistCollection } from "@/lib/playlist"; // <--- Added this import
import type { PlaylistItem } from "@/lib/playlist";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// --- PALETTE CONSTANTS ---
// 1-Bit Palette: Pure Black and White
const PALETTE_1BIT = Buffer.from([
	0, 0, 0,           // Black (#000000)
	255, 255, 255      // White (#FFFFFF)
]);

// 2-Bit Palette: TRMNL-compatible 4-shade grayscale
const PALETTE_2BIT = Buffer.from([
	0, 0, 0,           // Black (#000000)
	85, 85, 85,        // Dark Gray (#555555 - ~33% Gray)
	170, 170, 170,     // Light Gray (#AAAAAA - ~66% Gray)
	255, 255, 255      // White (#FFFFFF)
]);

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
		case "image":
			return `${baseUrl}/screens/image?id=${item.id}`;
		default:
			return `${baseUrl}/screens/weather`;
	}
}

/**
 * GENERATOR
 */
async function generateImage(batteryParam: number | null, screenParam: string | null, humidityParam: string | null, invertParam: boolean, ditherParam: boolean) {
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

		// Get global bit depth setting
		const settings = await getSettings();
		let bitDepth = settings.system.bitDepth;

		let targetUrl: string;
		let foundItem: PlaylistItem | undefined;

		// --- FIX STARTS HERE ---
		if (screenParam) {
			// 1. Try to find an item with this ID
			const collection = await getPlaylistCollection();

			for (const playlist of collection.playlists) {
				foundItem = playlist.items.find((i) => i.id === screenParam);
				if (foundItem) break;
			}

			if (foundItem) {
				console.log(`[Render] Found item by ID: ${foundItem.title} (${foundItem.type})`);
				targetUrl = buildScreenUrl(foundItem);

				// Check for item-specific bit depth override
				if (foundItem.config?.bitDepth) {
					bitDepth = foundItem.config.bitDepth;
					console.log(`[Render] Using item-specific bitDepth: ${bitDepth}`);
				}
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
				foundItem = currentItem;

				// Check for item-specific bit depth override
				if (currentItem.config?.bitDepth) {
					bitDepth = currentItem.config.bitDepth;
					console.log(`[Render] Using item-specific bitDepth: ${bitDepth}`);
				}
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

		// Forward console logs from the page
		page.on('console', (msg) => {
			const text = msg.text();
			console.log(`[Page Console] ${text}`);
		});

		// Forward page errors
		page.on('pageerror', (error) => {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`[Page Error] ${message}`);
		});

		// Forward request failures
		page.on('requestfailed', (request) => {
			console.error(`[Page Request Failed] ${request.url()}`);
		});

		await page.setViewport({ width: 800, height: 480, deviceScaleFactor: 1 });

		const pageUrl = new URL(targetUrl);
		if (batteryLevel) pageUrl.searchParams.set("battery", batteryLevel.toString());

		console.log(`[Render] Visiting: ${pageUrl.toString()}`); // Debug log
		await page.goto(pageUrl.toString(), { waitUntil: "networkidle0", timeout: 8000 });

		const screenshotBuffer = await page.screenshot({ type: "png" });
		await browser.close();

		// Apply bit depth processing
		let sharpPipeline = sharp(screenshotBuffer)
			.resize(800, 480, {
				fit: "contain",
				background: { r: 255, g: 255, b: 255 },
			});

		// If inverted, flip the pixels (White becomes Black)
		if (invertParam) {
			console.log("[Render] Inverting image for device");
			sharpPipeline = sharpPipeline.negate();
		}

		sharpPipeline = sharpPipeline.grayscale();

		if (bitDepth === 2) {
			// 2-bit: Use strict 4-color palette mapping with PALETTE_2BIT
			console.log(`[Render] Using 2-bit mode with TRMNL 4-color palette${ditherParam ? ' + dithering' : ' (solid, no dither)'}`);

			// Get raw grayscale pixel data
			const { data, info } = await sharpPipeline.raw().toBuffer({ resolveWithObject: true });
			const width = info.width;
			const height = info.height;

			// Create indexed image buffer (1 byte per pixel = palette index)
			const indexedData = Buffer.alloc(width * height);

			if (ditherParam) {
				// Floyd-Steinberg dithering for 2-bit
				// Create a copy of data as we'll be modifying error values
				const workingData = Buffer.from(data);

				for (let y = 0; y < height; y++) {
					for (let x = 0; x < width; x++) {
						const idx = y * width + x;
						const oldPixel = workingData[idx];

						// Map to nearest palette color
						let paletteIndex: number;
						if (oldPixel < 64) {
							paletteIndex = 0; // Black
						} else if (oldPixel < 128) {
							paletteIndex = 1; // Dark Gray
						} else if (oldPixel < 192) {
							paletteIndex = 2; // Light Gray
						} else {
							paletteIndex = 3; // White
						}

						const newPixel = paletteIndex * 85; // 0, 85, 170, 255
						indexedData[idx] = paletteIndex;

						// Calculate quantization error
						const error = oldPixel - newPixel;

						// Distribute error to neighboring pixels (Floyd-Steinberg)
						if (x + 1 < width) {
							workingData[idx + 1] = Math.max(0, Math.min(255, workingData[idx + 1] + error * 7 / 16));
						}
						if (y + 1 < height) {
							if (x > 0) {
								workingData[idx + width - 1] = Math.max(0, Math.min(255, workingData[idx + width - 1] + error * 3 / 16));
							}
							workingData[idx + width] = Math.max(0, Math.min(255, workingData[idx + width] + error * 5 / 16));
							if (x + 1 < width) {
								workingData[idx + width + 1] = Math.max(0, Math.min(255, workingData[idx + width + 1] + error * 1 / 16));
							}
						}
					}
				}
			} else {
				// No dithering - simple threshold mapping
				for (let i = 0; i < data.length; i++) {
					const pixel = data[i];
					// Map grayscale value to palette index
					// 0-63 -> 0 (Black), 64-127 -> 1 (Dark), 128-191 -> 2 (Light), 192-255 -> 3 (White)
					if (pixel < 64) {
						indexedData[i] = 0;
					} else if (pixel < 128) {
						indexedData[i] = 1;
					} else if (pixel < 192) {
						indexedData[i] = 2;
					} else {
						indexedData[i] = 3;
					}
				}
			}

			// Create PNG with explicit PALETTE_2BIT
			// Manually construct the PNG with proper PLTE chunk to enforce our palette order
			const zlib = await import('zlib');

			// Pack 2-bit indices into bytes (4 pixels per byte)
			const packedRows: Buffer[] = [];
			for (let y = 0; y < height; y++) {
				const row = Buffer.alloc(1 + Math.ceil(width / 4));
				row[0] = 0; // filter type: none

				for (let x = 0; x < width; x++) {
					const pixelIdx = y * width + x;
					const byteIdx = 1 + Math.floor(x / 4);
					const bitShift = 6 - (x % 4) * 2;
					row[byteIdx] |= (indexedData[pixelIdx] & 0x03) << bitShift;
				}
				packedRows.push(row);
			}

			const packedData = Buffer.concat(packedRows);
			const compressedData = zlib.deflateSync(packedData);

			// Construct PNG manually with proper chunks
			const chunks: Buffer[] = [];

			// PNG signature
			chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

			// Helper to create chunk
			const createChunk = (type: string, data: Buffer): Buffer => {
				const length = Buffer.alloc(4);
				length.writeUInt32BE(data.length, 0);

				const typeBuffer = Buffer.from(type, 'ascii');
				const dataWithType = Buffer.concat([typeBuffer, data]);

				// Calculate CRC32
				let crc = 0xFFFFFFFF;
				for (let i = 0; i < dataWithType.length; i++) {
					crc = crc ^ dataWithType[i];
					for (let j = 0; j < 8; j++) {
						crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
					}
				}
				crc = crc ^ 0xFFFFFFFF;

				const crcBuffer = Buffer.alloc(4);
				crcBuffer.writeUInt32BE(crc >>> 0, 0);

				return Buffer.concat([length, typeBuffer, data, crcBuffer]);
			};

			// IHDR chunk
			const ihdr = Buffer.alloc(13);
			ihdr.writeUInt32BE(width, 0);
			ihdr.writeUInt32BE(height, 4);
			ihdr.writeUInt8(2, 8);  // bit depth
			ihdr.writeUInt8(3, 9);  // color type (indexed)
			ihdr.writeUInt8(0, 10); // compression
			ihdr.writeUInt8(0, 11); // filter
			ihdr.writeUInt8(0, 12); // interlace
			chunks.push(createChunk('IHDR', ihdr));

			// PLTE chunk (our fixed palette)
			chunks.push(createChunk('PLTE', PALETTE_2BIT));

			// IDAT chunk
			chunks.push(createChunk('IDAT', compressedData));

			// IEND chunk
			chunks.push(createChunk('IEND', Buffer.alloc(0)));

			imageCache = Buffer.concat(chunks);
		} else {
			// 1-bit: Black and white output
			if (ditherParam) {
				// Use dithering for 2-color black/white output
				// This creates patterns (like checkerboard) to represent mid-tones
				console.log("[Render] Using 1-bit mode with Floyd-Steinberg dithering");
				imageCache = await sharpPipeline
					.png({
						palette: true,
						colors: 2,
						dither: 1.0,
					})
					.toBuffer();
			} else {
				// Pure black/white (no dithering) - crisp output
				console.log("[Render] Using 1-bit mode (solid, no dither)");
				imageCache = await sharpPipeline
					.png({
						palette: true,
						colors: 2,
						dither: 0,
					})
					.toBuffer();
			}
		}

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
	const invertParam = searchParams.get("invert") === "true";
	const ditherParam = searchParams.get("dither") !== "false"; // Default to true

	if (batteryLevel !== null && batteryLevel >= 0 && batteryLevel <= 100) {
		updateBatteryLevel(batteryLevel).catch((err) => {
			console.error("[Render API] Failed to update battery level:", err);
		});
	}

	console.log("[Render] Device requesting image...");
	await generateImage(batteryLevel, screenParam, humidityParam, invertParam, ditherParam);

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
