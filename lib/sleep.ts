/**
 * Sleep calculation utilities for Carbon
 * Handles Smart Sleep logic that syncs with Director schedule and battery levels
 */

/**
 * Helper: Calculate seconds until a specific time string (e.g., "07:00")
 * Returns seconds from NOW until that time (either today or tomorrow).
 */
export function getSecondsUntilStartTime(startTime: string): number {
	const now = new Date();
	const [targetHour, targetMinute] = startTime.split(":").map(Number);

	const targetTime = new Date(now);
	targetTime.setHours(targetHour, targetMinute, 0, 0);

	// If target time is in the past, it means it's for tomorrow
	if (targetTime.getTime() <= now.getTime()) {
		targetTime.setDate(targetTime.getDate() + 1);
	}

	const diffMs = targetTime.getTime() - now.getTime();
	return Math.floor(diffMs / 1000);
}

/**
 * NIGHT MODE CHECK
 * Determines if the current time is outside the active window (start/end time)
 */
export function isNightMode(startTime: string, endTime: string): boolean {
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
 * SYNCED SLEEP CALCULATION
 * Calculates optimal sleep duration based on:
 * - Battery level (critical = 2 hours)
 * - Night mode (sleep until wake time)
 * - Day mode (wake just before Director switches screens)
 */
export function calculateSyncedSleep(
	directorNextSwitchTime: number,
	batteryLevel: number | null,
	isNight: boolean,
	startTime: string
): number {
	// A. Critical Battery (< 20%) -> Sleep 2 hours
	if (batteryLevel !== null && batteryLevel > 0 && batteryLevel < 20) {
		console.log(`[Sleep] Critical Battery (${batteryLevel}%). Sleeping 2h.`);
		return 7200;
	}

	// B. Smart Night Mode -> Sleep EXACTLY until wake time
	if (isNight) {
		const secondsUntilWake = getSecondsUntilStartTime(startTime);
		// Add 60s buffer to ensure we land safely inside the "Day" window
		const sleepTime = secondsUntilWake + 60;
		console.log(`[Sleep] Night Mode. Sleeping ${Math.round((sleepTime / 3600) * 10) / 10}h until ${startTime}.`);
		return sleepTime;
	}

	// C. Day Mode -> Wake AFTER Director switches
	const now = Date.now();
	const sleepMs = Math.max(0, directorNextSwitchTime - now);
	let sleepSeconds = Math.floor(sleepMs / 1000);

	// Add 5 seconds buffer
	sleepSeconds = sleepSeconds + 5;

	// Subtract estimated device render time (WiFi connect + download)
	// This ensures we wake up *just* before the switch time to prep
	const DEVICE_PREP_TIME = 25;
	sleepSeconds = Math.max(10, sleepSeconds - DEVICE_PREP_TIME);

	return sleepSeconds;
}
