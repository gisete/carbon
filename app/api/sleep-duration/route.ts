import { NextRequest, NextResponse } from "next/server";
import { tick } from "@/lib/director";
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
 * Calculates seconds remaining until the next switch based on Director's state.
 */
function calculateSyncedSleep(directorNextSwitchTime: number, batteryLevel: number | null, isNight: boolean): number {
	// A. Critical Battery (< 20%) -> Sleep 2 hours (7200s)
	if (batteryLevel !== null && batteryLevel > 0 && batteryLevel < 20) {
		console.log(`[Sleep] Critical Battery (${batteryLevel}%). Sleeping 2h.`);
		return 7200;
	}

	// B. Night Mode -> Sleep 1 hour (3600s)
	if (isNight) {
		console.log(`[Sleep] Night Mode. Sleeping 1h.`);
		return 3600;
	}

	// C. Day Mode -> Use Director's next switch time
	const now = Date.now();
	const sleepMs = Math.max(0, directorNextSwitchTime - now);
	let sleepSeconds = Math.floor(sleepMs / 1000);

	// Add buffer time for device wake/render (20 seconds)
	// This ensures the device wakes up slightly before the switch time
	sleepSeconds = Math.max(30, sleepSeconds - 20);

	console.log(
		`[Sleep] Calculated sleep: ${sleepSeconds}s (Director switches in ${Math.floor(sleepMs / 1000)}s, waking 20s early)`
	);

	return sleepSeconds;
}

export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams;
	const batteryParam = searchParams.get("battery");
	const batteryLevel = batteryParam ? parseFloat(batteryParam) : null;

	try {
		const settings = await getSettings();

		// Tick the Director to get current state and next switch time
		const status = await tick();

		const isNight = isNightMode(settings.system.startTime, settings.system.endTime);

		// Use Director's next switch time to calculate sleep
		const sleepSeconds = calculateSyncedSleep(status.nextSwitchTime, batteryLevel, isNight);

		const data = {
			sleepSeconds,
			currentItem: status.currentItem?.title || "None",
			nextSwitchTime: new Date(status.nextSwitchTime).toISOString(),
			isNight,
			battery: batteryLevel,
		};

		const jsonString = JSON.stringify(data);

		return new NextResponse(jsonString, {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(jsonString).toString(),
			},
		});
	} catch (error) {
		console.error("[Sleep API] Error:", error);
		return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
	}
}
