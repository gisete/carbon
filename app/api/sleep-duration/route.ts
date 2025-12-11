import { NextRequest, NextResponse } from "next/server";
import { tick, updateBatteryLevel } from "@/lib/director";
import { getSettings } from "@/lib/settings";
import { calculateSyncedSleep, isNightMode } from "@/lib/sleep";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams;
	const batteryParam = searchParams.get("battery");
	const batteryLevel = batteryParam ? parseFloat(batteryParam) : null;

	// Update battery level if provided (await to catch errors)
	if (batteryLevel !== null && batteryLevel >= 0 && batteryLevel <= 100) {
		try {
			await updateBatteryLevel(batteryLevel);
		} catch (err) {
			console.error("[Sleep API] Failed to update battery level:", err);
		}
	}

	try {
		const settings = await getSettings();

		// Use global settings for start/end time
		const { startTime, endTime } = settings.system;

		const status = await tick();
		const isNight = isNightMode(startTime, endTime);

		// Pass global startTime to calculation for "Smart Night Sleep"
		const sleepSeconds = calculateSyncedSleep(status.nextSwitchTime, batteryLevel, isNight, startTime);

		const data = {
			sleepSeconds,
			currentItem: status.currentItem?.title || "Night Mode",
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
