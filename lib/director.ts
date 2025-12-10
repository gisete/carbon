import { promises as fs } from "fs";
import path from "path";
import { getPlaylist, PlaylistItem, getPlaylistCollection, Playlist } from "./playlist";
import { getSettings } from "./settings";

// --- TYPES ---

interface DirectorState {
	currentCycleIndex: number;
	lastSwitchTime: number; // Timestamp in milliseconds
	lastUpdate: string;
	activePlaylistId: string | null; // Track which playlist is currently active
	batteryLevel?: number; // Battery level from device (0-100)
}

export interface DirectorStatus {
	currentItem: PlaylistItem | null;
	nextSwitchTime: number; // Timestamp when next switch should occur
	cycleIndex: number;
	totalItems: number;
	activePlaylistId: string | null; // Which playlist is currently active
	activePlaylistName: string | null; // Name of active playlist
	isSleeping: boolean; // NEW: Explicit sleep state
	batteryLevel?: number; // Battery level from device (0-100)
}

// --- FILE PATHS ---

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

// Debug logging (set to false to disable)
const DEBUG = true;

// --- HELPER: ENSURE DATA DIRECTORY EXISTS ---

async function ensureDataDir() {
	try {
		await fs.access(DATA_DIR);
	} catch {
		await fs.mkdir(DATA_DIR, { recursive: true });
	}
}

// --- STATE MANAGEMENT ---

async function getState(): Promise<DirectorState> {
	await ensureDataDir();

	try {
		const data = await fs.readFile(STATE_FILE, "utf-8");
		const parsed = JSON.parse(data);

		// Migrate old state format if needed
		if (!("activePlaylistId" in parsed)) {
			const state: DirectorState = {
				...parsed,
				activePlaylistId: null,
			};
			return state;
		}

		return parsed as DirectorState;
	} catch (error: any) {
		if (error.code === "ENOENT") {
			return {
				currentCycleIndex: 0,
				lastSwitchTime: Date.now(),
				lastUpdate: new Date().toISOString(),
				activePlaylistId: null,
			};
		}
		throw error;
	}
}

async function saveState(state: DirectorState): Promise<void> {
	await ensureDataDir();
	const tempFile = STATE_FILE + ".tmp";
	const jsonData = JSON.stringify(state, null, 2);

	try {
		await fs.writeFile(tempFile, jsonData, "utf-8");
		await fs.rename(tempFile, STATE_FILE);
	} catch (error) {
		try {
			await fs.unlink(tempFile);
		} catch {}
		console.error("[Director] Failed to save state:", error);
		throw error;
	}
}

// --- TIME HELPERS ---

function isWithinActiveWindow(startTime: string, endTime: string): boolean {
	const now = new Date();
	const currentMinutes = now.getHours() * 60 + now.getMinutes();

	const [startHour, startMin] = startTime.split(":").map(Number);
	const startMinutes = startHour * 60 + startMin;

	const [endHour, endMin] = endTime.split(":").map(Number);
	const endMinutes = endHour * 60 + endMin;

	if (endMinutes < startMinutes) {
		return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
	} else {
		return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
	}
}

// --- PLAYLIST RESOLUTION STRATEGY ---

async function resolveActivePlaylist(): Promise<Playlist | null> {
	const collection = await getPlaylistCollection();

	if (collection.playlists.length === 0) {
		if (DEBUG) console.log("[Director] No playlists available");
		return null;
	}

	// Priority 1: Manual Override
	if (collection.activePlaylistId !== null) {
		const manualPlaylist = collection.playlists.find((p) => p.id === collection.activePlaylistId);
		if (manualPlaylist) {
			if (DEBUG) console.log("[Director] Using manual override playlist:", manualPlaylist.name);
			return manualPlaylist;
		}
	}

	// Priority 2: Specific Match
	const now = new Date();
	const currentDay = now.getDay();
	const currentMinutes = now.getHours() * 60 + now.getMinutes();

	const isInTimeWindow = (startTime: string, endTime: string): boolean => {
		const [startHour, startMin] = startTime.split(":").map(Number);
		const startMinutes = startHour * 60 + startMin;
		const [endHour, endMin] = endTime.split(":").map(Number);
		const endMinutes = endHour * 60 + endMin;

		if (endMinutes < startMinutes) {
			return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
		} else {
			return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
		}
	};

	let bestMatch: Playlist | null = null;
	let smallestWindow = Infinity;

	for (const playlist of collection.playlists) {
		if (playlist.isDefault) continue;
		if (playlist.schedule.type !== "weekly") continue;
		if (!playlist.schedule.activeDays.includes(currentDay)) continue;

		const startTime = playlist.schedule.startTime || "00:00";
		const endTime = playlist.schedule.endTime || "23:59";

		if (!isInTimeWindow(startTime, endTime)) continue;

		const [startHour, startMin] = startTime.split(":").map(Number);
		const [endHour, endMin] = endTime.split(":").map(Number);
		const windowSize = endHour * 60 + endMin - (startHour * 60 + startMin);

		if (windowSize < smallestWindow) {
			smallestWindow = windowSize;
			bestMatch = playlist;
		}
	}

	if (bestMatch) {
		if (DEBUG) console.log("[Director] Using specific playlist:", bestMatch.name);
		return bestMatch;
	}

	// Priority 3: Default Fallback
	const defaultPlaylist = collection.playlists.find((p) => p.isDefault);
	if (defaultPlaylist) {
		if (DEBUG) console.log("[Director] Using default fallback playlist:", defaultPlaylist.name);
		return defaultPlaylist;
	}

	return collection.playlists[0];
}

// --- MAIN DIRECTOR FUNCTIONS ---

export async function getCurrentItem(): Promise<PlaylistItem | null> {
	const settings = await getSettings();
	if (!isWithinActiveWindow(settings.system.startTime, settings.system.endTime)) {
		if (DEBUG) console.log("[Director] Outside active window - device should sleep");
		return null;
	}

	const activePlaylist = await resolveActivePlaylist();

	if (!activePlaylist || activePlaylist.items.length === 0) {
		return null;
	}

	const visibleItems = activePlaylist.items.filter((item) => item.visible !== false);
	if (visibleItems.length === 0) return null;

	const state = await getState();

	const needsReset = state.activePlaylistId !== activePlaylist.id || state.currentCycleIndex >= visibleItems.length;

	if (needsReset) {
		if (DEBUG) console.log("[Director] Playlist changed or index out of bounds, resetting cycle");
		const newState: DirectorState = {
			currentCycleIndex: 0,
			lastSwitchTime: Date.now(),
			lastUpdate: new Date().toISOString(),
			activePlaylistId: activePlaylist.id,
		};
		await saveState(newState);
		return visibleItems[0];
	}

	const cycleIndex = state.currentCycleIndex % visibleItems.length;
	return visibleItems[cycleIndex];
}

export async function advanceCycle(): Promise<void> {
	const activePlaylist = await resolveActivePlaylist();
	if (!activePlaylist || activePlaylist.items.length === 0) return;

	const visibleItems = activePlaylist.items.filter((item) => item.visible !== false);
	if (visibleItems.length === 0) return;

	const state = await getState();
	const newIndex = (state.currentCycleIndex + 1) % visibleItems.length;

	const newState: DirectorState = {
		currentCycleIndex: newIndex,
		lastSwitchTime: Date.now(),
		lastUpdate: new Date().toISOString(),
		activePlaylistId: activePlaylist.id,
	};

	await saveState(newState);
	if (DEBUG) console.log("[Director] Advanced cycle:", state.currentCycleIndex, "->", newIndex);
}

export async function resetCycle(): Promise<void> {
	const activePlaylist = await resolveActivePlaylist();
	const newState: DirectorState = {
		currentCycleIndex: 0,
		lastSwitchTime: Date.now(),
		lastUpdate: new Date().toISOString(),
		activePlaylistId: activePlaylist?.id || null,
	};
	await saveState(newState);
}

export async function getDirectorState(): Promise<DirectorState> {
	return await getState();
}

/**
 * Update battery level in the director state
 * @param level Battery level (0-100)
 */
export async function updateBatteryLevel(level: number): Promise<void> {
	// Validate battery level
	if (typeof level !== "number" || level < 0 || level > 100) {
		console.warn("[Director] Invalid battery level:", level);
		return;
	}

	const state = await getState();

	// Only save if battery level has changed
	if (state.batteryLevel !== level) {
		const newState: DirectorState = {
			...state,
			batteryLevel: level,
		};
		await saveState(newState);
		console.log("[Director] Successfully saved battery level to state:", level);
	} else {
		console.log("[Director] Battery level unchanged:", level);
	}
}

export async function tick(): Promise<DirectorStatus> {
	const settings = await getSettings();
	const now = Date.now();

	// Check SLEEP MODE
	if (!isWithinActiveWindow(settings.system.startTime, settings.system.endTime)) {
		if (DEBUG) console.log("[Director Tick] Outside active window - SLEEPING");
		const state = await getState();
		return {
			currentItem: null,
			nextSwitchTime: now + 60000,
			cycleIndex: 0,
			totalItems: 0,
			activePlaylistId: null,
			activePlaylistName: null,
			isSleeping: true, // <--- REPORT SLEEP STATE
			batteryLevel: state.batteryLevel,
		};
	}

	// ... (rest of logic remains same, but we add isSleeping: false to returns) ...
	const activePlaylist = await resolveActivePlaylist();
	let state = await getState();

	const timeSinceSwitch = now - state.lastSwitchTime;
	if (timeSinceSwitch > 86400000 || timeSinceSwitch < 0) {
		if (DEBUG) console.log("[Director Tick] Resetting lastSwitchTime");
		state = { ...state, lastSwitchTime: now };
		await saveState(state);
	}

	if (!activePlaylist || activePlaylist.items.length === 0) {
		return {
			currentItem: null,
			nextSwitchTime: now + 60000,
			cycleIndex: 0,
			totalItems: 0,
			activePlaylistId: null,
			activePlaylistName: null,
			isSleeping: false,
			batteryLevel: state.batteryLevel,
		};
	}

	const visibleItems = activePlaylist.items.filter((item) => item.visible !== false);

	if (visibleItems.length === 0) {
		return {
			currentItem: null,
			nextSwitchTime: now + 60000,
			cycleIndex: 0,
			totalItems: 0,
			activePlaylistId: activePlaylist.id,
			activePlaylistName: activePlaylist.name,
			isSleeping: false,
			batteryLevel: state.batteryLevel,
		};
	}

	if (state.activePlaylistId !== activePlaylist.id || state.currentCycleIndex >= visibleItems.length) {
		if (DEBUG) console.log("[Director Tick] Playlist changed, resetting");
		state = {
			currentCycleIndex: 0,
			lastSwitchTime: now,
			lastUpdate: new Date().toISOString(),
			activePlaylistId: activePlaylist.id,
		};
		await saveState(state);
	}

	const cycleIndex = state.currentCycleIndex % visibleItems.length;
	const currentItem = visibleItems[cycleIndex];
	const itemDuration = (currentItem.duration || settings.system.refreshInterval) * 60 * 1000;
	const itemEndTime = state.lastSwitchTime + itemDuration;

	if (now >= itemEndTime) {
		const newIndex = (state.currentCycleIndex + 1) % visibleItems.length;
		const newState: DirectorState = {
			currentCycleIndex: newIndex,
			lastSwitchTime: now,
			lastUpdate: new Date().toISOString(),
			activePlaylistId: activePlaylist.id,
		};
		await saveState(newState);

		const nextItem = visibleItems[newIndex];
		const nextDuration = (nextItem.duration || settings.system.refreshInterval) * 60 * 1000;
		const nextEndTime = now + nextDuration;

		const updatedState = await getState();
		return {
			currentItem: nextItem,
			nextSwitchTime: nextEndTime,
			cycleIndex: newIndex,
			totalItems: visibleItems.length,
			activePlaylistId: activePlaylist.id,
			activePlaylistName: activePlaylist.name,
			isSleeping: false,
			batteryLevel: updatedState.batteryLevel,
		};
	}

	const finalState = await getState();
	return {
		currentItem,
		nextSwitchTime: itemEndTime,
		cycleIndex: cycleIndex,
		totalItems: visibleItems.length,
		activePlaylistId: activePlaylist.id,
		activePlaylistName: activePlaylist.name,
		isSleeping: false,
		batteryLevel: finalState.batteryLevel,
	};
}
