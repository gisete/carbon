import { NextRequest, NextResponse } from "next/server";
import { tick, updateBatteryLevel } from "@/lib/director";
import { getSettings } from "@/lib/settings";
import { calculateSyncedSleep, isNightMode } from "@/lib/sleep";

export const dynamic = "force-dynamic";

/**
 * TRMNL Director Endpoint (BYOS Protocol)
 * Returns JSON with image_url and refresh_rate for the TRMNL firmware
 */
export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams;
	const batteryParam = searchParams.get("battery");
	const batteryLevel = batteryParam ? parseFloat(batteryParam) : null;

	// Update battery level if provided
	if (batteryLevel !== null && batteryLevel >= 0 && batteryLevel <= 100) {
		try {
			await updateBatteryLevel(batteryLevel);
		} catch (err) {
			console.error("[Display API] Failed to update battery level:", err);
		}
	}

	try {
		// 1. Get current playlist status from Director
		const status = await tick();

		// 2. Get system settings for start/end times
		const settings = await getSettings();
		const { startTime, endTime } = settings.system;

		// 3. Calculate smart sleep duration
		const isNight = isNightMode(startTime, endTime);
		const sleepSeconds = calculateSyncedSleep(status.nextSwitchTime, batteryLevel, isNight, startTime);

		// 4. Construct absolute image URL
		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
		const timestamp = Date.now();
		const screenId = status.currentItem?.id || "default";
		const imageUrl = `${baseUrl}/api/render?screen=${screenId}&ts=${timestamp}`;

		// 5. Build TRMNL response
		const response = {
			status: 0, // 0 = success
			image_url: imageUrl,
			filename: `carbon-${timestamp}`,
			refresh_rate: sleepSeconds,
			reset_firmware: false,
			update_firmware: false,
		};

		console.log(`[Display API] Serving: ${status.currentItem?.title || "Night Mode"}, refresh in ${sleepSeconds}s`);

		return NextResponse.json(response, {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (error) {
		console.error("[Display API] Error:", error);
		return NextResponse.json(
			{
				status: 1, // Error status
				error: "Display endpoint failed",
			},
			{ status: 500 }
		);
	}
}
