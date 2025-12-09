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
 * Calculates seconds to sleep so device wakes AFTER the Director switches.
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

	// C. Day Mode -> Wake AFTER Director switches (add 5s buffer)
	const now = Date.now();
	const sleepMs = Math.max(0, directorNextSwitchTime - now);
	let sleepSeconds = Math.floor(sleepMs / 1000);

	// Add 5 seconds AFTER the switch to ensure Director has advanced
	sleepSeconds = sleepSeconds + 5;

	// CRITICAL: Subtract estimated device render time (WiFi + download + display)
	// This accounts for the time between calculating sleep and actually sleeping
	const DEVICE_RENDER_TIME = 20; // seconds (WiFi:2s + Download:12s + Display:6s)
	sleepSeconds = Math.max(10, sleepSeconds - DEVICE_RENDER_TIME);

	console.log(
		`[Sleep] Calculated sleep: ${sleepSeconds}s (Director switches in ${Math.floor(
			sleepMs / 1000
		)}s, +5s buffer, -${DEVICE_RENDER_TIME}s render time)`
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
