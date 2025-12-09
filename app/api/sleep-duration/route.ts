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
function calculateSleepDuration(
	itemDurationMinutes: number,
	batteryLevel: number | null,
	isNight: boolean
): number {
	// 1. Critical Battery (< 20%) -> Sleep 2 hours (7200s)
	if (batteryLevel !== null && batteryLevel < 20) {
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

		// Return response
		return NextResponse.json({
			sleepSeconds,
			currentItem: currentItem?.title || "None",
			isNight,
		});
	} catch (error) {
		console.error("[Sleep Duration API] Error:", error);
		return NextResponse.json(
			{ error: "Failed to calculate sleep duration" },
			{ status: 500 }
		);
	}
}
