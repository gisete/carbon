import { NextRequest, NextResponse } from "next/server";
import { getCurrentItem } from "@/lib/director";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Helper to determine if we are in "Night Mode" (outside active hours)
 */
function isNightMode(startTime: string, endTime: string): boolean {
	const now = new Date();
	const currentMinutes = now.getHours() * 60 + now.getMinutes();

	const [startHour, startMin] = startTime.split(":").map(Number);
	const startMinutes = startHour * 60 + startMin;

	const [endHour, endMin] = endTime.split(":").map(Number);
	const endMinutes = endHour * 60 + endMin;

	if (endMinutes < startMinutes) {
		return !(currentMinutes >= startMinutes || currentMinutes <= endMinutes);
	}
	return !(currentMinutes >= startMinutes && currentMinutes <= endMinutes);
}

/**
 * Calculate how long the ESP32 should sleep (in seconds)
 */
function calculateSleepDuration(itemDurationMinutes: number, batteryLevel: number | null, isNight: boolean): number {
	// FIX: Ensure battery is > 0. If it's 0, it's likely an error or USB power.
	if (batteryLevel !== null && batteryLevel > 0 && batteryLevel < 20) {
		console.log(`[Sleep Logic] Critical Battery (${batteryLevel}%). Sleeping 2 hours.`);
		return 7200;
	}

	// 2. Night Mode -> Sleep 1 hour (3600s)
	if (isNight) {
		console.log(`[Sleep Logic] Night Mode. Sleeping 1 hour.`);
		return 3600;
	}

	// 3. Day Mode -> Use Item Duration (default 5 mins if missing)
	const duration = itemDurationMinutes || 5;
	return duration * 60;
}

export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams;

	// Get battery parameter (optional)
	const batteryParam = searchParams.get("battery");
	const batteryLevel = batteryParam ? parseFloat(batteryParam) : null;

	try {
		// Get current settings and item
		const settings = await getSettings();
		const currentItem = await getCurrentItem();

		// Determine if we're in night mode
		const isNight = isNightMode(settings.system.startTime, settings.system.endTime);

		// Get item duration (use current item duration or fallback to system refresh interval)
		const itemDuration = currentItem?.duration || settings.system.refreshInterval;

		// Calculate sleep duration
		const sleepSeconds = calculateSleepDuration(itemDuration, batteryLevel, isNight);

		// Prepare the data object
		const data = {
			sleepSeconds,
			currentItem: currentItem?.title || "None",
			isNight,
		};

		// --- FIX: Explicitly serialize and set Content-Length ---
		const jsonString = JSON.stringify(data);

		return new NextResponse(jsonString, {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(jsonString).toString(),
			},
		});
	} catch (error) {
		console.error("[Sleep Duration API] Error:", error);

		// Even for errors, try to return a valid length if possible, or just standard json
		const errorData = { error: "Failed to calculate sleep duration" };
		const errorString = JSON.stringify(errorData);

		return new NextResponse(errorString, {
			status: 500,
			headers: {
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(errorString).toString(),
			},
		});
	}
}
