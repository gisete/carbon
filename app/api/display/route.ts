import { NextRequest, NextResponse } from "next/server";
import { tick, updateBatteryLevel, advanceCycle } from "@/lib/director";
import { getSettings } from "@/lib/settings";
import { calculateSyncedSleep, isNightMode } from "@/lib/sleep";

export const dynamic = "force-dynamic";

/**
 * TRMNL Director Endpoint (BYOS Protocol)
 */
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    console.log("Params:", req.nextUrl.searchParams.toString());
    console.log("Headers:", Object.fromEntries(req.headers));

    // Calculate battery percentage
    let batteryLevel: number | null = null;
    const batteryVoltageHeader = req.headers.get("battery-voltage");
    if (batteryVoltageHeader) {
        const voltage = parseFloat(batteryVoltageHeader);
        const percentage = Math.round((voltage - 3) / 0.012);
        batteryLevel = Math.max(0, Math.min(100, percentage));
    } else {
        const batteryParam = searchParams.get("battery");
        if (batteryParam) batteryLevel = parseFloat(batteryParam);
    }

    if (batteryLevel !== null && batteryLevel >= 0 && batteryLevel <= 100) {
        try { await updateBatteryLevel(batteryLevel); } catch (err) { console.error(err); }
    }

    try {
        const initialStatus = await tick();
        const timeRemaining = initialStatus.nextSwitchTime - Date.now();
        let status;

        if (timeRemaining > 60000) {
            console.log(`[Display API] Early wake detected -> Advancing Cycle`);
            await advanceCycle();
            status = await tick();
        } else {
            status = initialStatus;
        }

        const settings = await getSettings();
        const { startTime, endTime } = settings.system;
        const isNight = isNightMode(startTime, endTime);
        const sleepSeconds = calculateSyncedSleep(status.nextSwitchTime, batteryLevel, isNight, startTime);

        const baseUrl = process.env.BASE_URL || "http://localhost:3000";
        const timestamp = Date.now();
        const screenId = status.currentItem?.id || "logo";
        const config = status.currentItem?.config || {};
        const dither = config.dither !== undefined ? config.dither : true;
        const invert = config.invert === true;

        let imageUrl = `${baseUrl}/api/render?screen=${screenId}&ts=${timestamp}&dither=${dither}`;
        if (invert) imageUrl += "&invert=true";

        const response = {
            status: 0,
            image_url: imageUrl,
            filename: `carbon-${timestamp}.png`, // Correct .png extension
            refresh_rate: sleepSeconds,
            reset_firmware: false,
            update_firmware: false,
        };

        console.log(`[Display API] Serving: ${status.currentItem?.title || "Night Mode"}, refresh in ${sleepSeconds}s`);

        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        console.error("[Display API] Error:", error);
        return NextResponse.json({ status: 1, error: "Display endpoint failed" }, { status: 500 });
    }
}
