import { NextRequest, NextResponse } from "next/server";
import { tick, updateBatteryLevel, advanceCycle } from "@/lib/director";
import { getSettings } from "@/lib/settings";
import { calculateSyncedSleep, isNightMode } from "@/lib/sleep";

export const dynamic = "force-dynamic";

/**
 * TRMNL Director Endpoint (BYOS Protocol)
 * Returns JSON with image_url and refresh_rate for the TRMNL firmware
 */
export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams;
	console.log("Params:", req.nextUrl.searchParams.toString());
	console.log("Headers:", Object.fromEntries(req.headers));

	// Calculate battery percentage from TRMNL voltage header or fallback to query param
	let batteryLevel: number | null = null;

	// 1. Try TRMNL header (official firmware sends voltage)
	const batteryVoltageHeader = req.headers.get("battery-voltage");
	if (batteryVoltageHeader) {
		const voltage = parseFloat(batteryVoltageHeader);
		// TRMNL formula: percentage = (voltage - 3) / 0.012
		const percentage = Math.round((voltage - 3) / 0.012);
		batteryLevel = Math.max(0, Math.min(100, percentage)); // Clamp between 0-100
		console.log(`[Display API] Battery from header: ${voltage}V -> ${batteryLevel}%`);
	}
	// 2. Fallback to query param (for simulator or legacy calls)
	else {
		const batteryParam = searchParams.get("battery");
		if (batteryParam) {
			batteryLevel = parseFloat(batteryParam);
			console.log(`[Display API] Battery from query param: ${batteryLevel}%`);
		}
	}

	// Update battery level if we got one
	if (batteryLevel !== null && batteryLevel >= 0 && batteryLevel <= 100) {
		try {
			await updateBatteryLevel(batteryLevel);
		} catch (err) {
			console.error("[Display API] Failed to update battery level:", err);
		}
	}

	try {
		// 1. Get current playlist status from Director
		const initialStatus = await tick();

		// 2. Check for early wake-up (user button press)
		const timeRemaining = initialStatus.nextSwitchTime - Date.now();
		let status;

		if (timeRemaining > 60000) {
			// More than 60 seconds early -> user pressed button
			console.log(`[Display API] Early wake detected (${Math.round(timeRemaining / 1000)}s early) -> Advancing Cycle`);
			await advanceCycle();
			status = await tick(); // Re-fetch to get the new next screen
		} else {
			status = initialStatus;
		}

		// 3. Get system settings for start/end times
		const settings = await getSettings();
		const { startTime, endTime } = settings.system;

		// 4. Calculate smart sleep duration
		const isNight = isNightMode(startTime, endTime);
		const sleepSeconds = calculateSyncedSleep(status.nextSwitchTime, batteryLevel, isNight, startTime);

		// 4. Construct absolute image URL
		const baseUrl = process.env.BASE_URL || "http://localhost:3000";
		const timestamp = Date.now();
		const screenId = status.currentItem?.id || "logo";
		const config = status.currentItem?.config || {};
		const dither = config.dither !== undefined ? config.dither : true;
		const imageUrl = `${baseUrl}/api/render?screen=${screenId}&ts=${timestamp}&dither=${dither}`;

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
