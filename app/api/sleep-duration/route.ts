import { NextRequest, NextResponse } from "next/server";
import { getCurrentItem } from "@/lib/director";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * 1. NIGHT MODE CHECK
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
 * 2. SYNCED SLEEP CALCULATION
 * Calculates seconds remaining until the next "Slot" to prevent drift.
 */
function calculateSyncedSleep(itemDurationMinutes: number, batteryLevel: number | null, isNight: boolean): number {
	// A. Critical Battery (< 20%) -> Sleep 2 hours (7200s)
	// We assume battery comes in as 0-100% from the ESP32
	if (batteryLevel !== null && batteryLevel > 0 && batteryLevel < 20) {
		console.log(`[Sleep] Critical Battery (${batteryLevel}%). Sleeping 2h.`);
		return 7200;
	}

	// B. Night Mode -> Sleep 1 hour (3600s)
	if (isNight) {
		console.log(`[Sleep] Night Mode. Sleeping 1h.`);
		return 3600;
	}

	// C. Day Mode -> Sync to Wall Clock
	const durationMinutes = itemDurationMinutes || 5;
	const durationSeconds = durationMinutes * 60;

	const now = new Date();
	// Get total seconds passed in the current hour
	const secondsInHour = now.getMinutes() * 60 + now.getSeconds();

	// Calculate where we are in the current block (e.g., 125s into a 300s block)
	const secondsIntoBlock = secondsInHour % durationSeconds;

	// Calculate remaining time
	let sleepSeconds = durationSeconds - secondsIntoBlock;

	// SAFETY: If we are less than 20s from the switch, skip to the NEXT block.
	// This prevents the screen from waking up, loading for 15s, and then immediately needing to switch again.
	if (sleepSeconds < 20) {
		console.log(`[Sleep] Too close to switch (${sleepSeconds}s). Skipping to next slot.`);
		sleepSeconds += durationSeconds;
	}

	return sleepSeconds;
}

export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams;
	const batteryParam = searchParams.get("battery");
	const batteryLevel = batteryParam ? parseFloat(batteryParam) : null;

	try {
		const settings = await getSettings();
		const currentItem = await getCurrentItem();

		const isNight = isNightMode(settings.system.startTime, settings.system.endTime);
		const itemDuration = currentItem?.duration || settings.system.refreshInterval;

		// Use the new Synced calculation
		const sleepSeconds = calculateSyncedSleep(itemDuration, batteryLevel, isNight);

		const data = {
			sleepSeconds,
			currentItem: currentItem?.title || "None",
			isNight,
			battery: batteryLevel,
		};

		const jsonString = JSON.stringify(data);

		return new NextResponse(jsonString, {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				// Crucial for ESP32 stability
				"Content-Length": Buffer.byteLength(jsonString).toString(),
			},
		});
	} catch (error) {
		console.error("[Sleep API] Error:", error);
		return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
	}
}
