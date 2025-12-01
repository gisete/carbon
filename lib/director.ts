import { promises as fs } from 'fs';
import path from 'path';
import { getPlaylist, PlaylistItem, getPlaylistCollection, Playlist } from './playlist';
import { getSettings } from './settings';

// --- TYPES ---

interface DirectorState {
  currentCycleIndex: number;
  lastSwitchTime: number; // Timestamp in milliseconds
  lastUpdate: string;
  activePlaylistId: string | null; // Track which playlist is currently active
}

export interface DirectorStatus {
  currentItem: PlaylistItem | null;
  nextSwitchTime: number; // Timestamp when next switch should occur
  cycleIndex: number;
  totalItems: number;
  activePlaylistId: string | null; // Which playlist is currently active
  activePlaylistName: string | null; // Name of active playlist
}

// --- FILE PATHS ---

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

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

/**
 * Reads the director state from state.json.
 * Returns default state if file doesn't exist.
 */
async function getState(): Promise<DirectorState> {
  await ensureDataDir();

  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(data);

    // Migrate old state format if needed
    if (!('activePlaylistId' in parsed)) {
      const state: DirectorState = {
        ...parsed,
        activePlaylistId: null,
      };
      return state;
    }

    return parsed as DirectorState;
  } catch (error: any) {
    // If file doesn't exist, return default state
    if (error.code === 'ENOENT') {
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

/**
 * Saves the director state to state.json.
 */
async function saveState(state: DirectorState): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

// --- TIME HELPERS ---

/**
 * Checks if the current time is within the active playlist window.
 * Returns true if current time is between startTime and endTime.
 * Returns false if outside the window (device should sleep).
 */
function isWithinActiveWindow(startTime: string, endTime: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = startTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;

  const [endHour, endMin] = endTime.split(':').map(Number);
  const endMinutes = endHour * 60 + endMin;

  // Handle case where end time is before start time (crosses midnight)
  if (endMinutes < startMinutes) {
    // Active window crosses midnight: true if current >= start OR current <= end
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  } else {
    // Normal case: true if current is between start and end
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
}

// --- PLAYLIST RESOLUTION STRATEGY ---

/**
 * Resolves which playlist should be active based on:
 * 1. Manual Override (activePlaylistId set in collection)
 * 2. Specific Match (non-default playlist matching current day AND time window)
 * 3. Default Fallback (playlist with isDefault: true)
 *
 * Returns the active playlist or null if no playlists exist.
 */
async function resolveActivePlaylist(): Promise<Playlist | null> {
  const collection = await getPlaylistCollection();

  if (collection.playlists.length === 0) {
    if (DEBUG) console.log('[Director] No playlists available');
    return null;
  }

  // Priority 1: Manual Override
  if (collection.activePlaylistId !== null) {
    const manualPlaylist = collection.playlists.find(p => p.id === collection.activePlaylistId);
    if (manualPlaylist) {
      if (DEBUG) console.log('[Director] Using manual override playlist:', manualPlaylist.name);
      return manualPlaylist;
    }
    // If manual override playlist not found, fall through to other strategies
    if (DEBUG) console.log('[Director] Manual override playlist not found, falling back');
  }

  // Priority 2: Specific Match (non-default playlist with Day + Time Window match)
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Helper to check if current time is within playlist's time window
  const isInTimeWindow = (startTime: string, endTime: string): boolean => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;

    const [endHour, endMin] = endTime.split(':').map(Number);
    const endMinutes = endHour * 60 + endMin;

    // Handle case where end time is before start time (crosses midnight)
    if (endMinutes < startMinutes) {
      // Active window crosses midnight: true if current >= start OR current <= end
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    } else {
      // Normal case: true if current is between start and end
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
  };

  // Find SPECIFIC (non-default) playlist matching current day AND time window
  // Find the most specific match (smallest time window)
  let bestMatch: Playlist | null = null;
  let smallestWindow = Infinity;

  for (const playlist of collection.playlists) {
    // Skip default playlists - they are only used as fallback
    if (playlist.isDefault) continue;

    if (playlist.schedule.type !== 'weekly') continue;
    if (!playlist.schedule.activeDays.includes(currentDay)) continue;

    // Ensure schedule has time windows (for backward compatibility)
    const startTime = playlist.schedule.startTime || '00:00';
    const endTime = playlist.schedule.endTime || '23:59';

    if (!isInTimeWindow(startTime, endTime)) continue;

    // Calculate window size in minutes
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const windowSize = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    // Use smallest time window (most specific)
    if (windowSize < smallestWindow) {
      smallestWindow = windowSize;
      bestMatch = playlist;
    }
  }

  if (bestMatch) {
    if (DEBUG) console.log('[Director] Using specific playlist:', bestMatch.name, 'for day:', currentDay, 'time window:', bestMatch.schedule.startTime, '-', bestMatch.schedule.endTime);
    return bestMatch;
  }

  // Priority 3: Default Fallback
  const defaultPlaylist = collection.playlists.find(p => p.isDefault);
  if (defaultPlaylist) {
    if (DEBUG) console.log('[Director] Using default fallback playlist:', defaultPlaylist.name);
    return defaultPlaylist;
  }

  // Last resort: return first playlist if no default is set
  if (DEBUG) console.log('[Director] No default found, using first playlist:', collection.playlists[0].name);
  return collection.playlists[0];
}

// --- MAIN DIRECTOR FUNCTIONS ---

/**
 * Gets the current item that should be displayed.
 *
 * Returns the item based on currentCycleIndex from the resolved active playlist.
 * Returns null if no items are available or outside active time window.
 */
export async function getCurrentItem(): Promise<PlaylistItem | null> {
  // Check if we're within the active time window
  const settings = await getSettings();
  if (!isWithinActiveWindow(settings.system.startTime, settings.system.endTime)) {
    if (DEBUG) console.log('[Director] Outside active window - device should sleep');
    return null;
  }

  // Resolve which playlist should be active
  const activePlaylist = await resolveActivePlaylist();

  if (!activePlaylist || activePlaylist.items.length === 0) {
    return null;
  }

  // Filter out hidden items (visible !== false means visible by default)
  const visibleItems = activePlaylist.items.filter(item => item.visible !== false);

  if (visibleItems.length === 0) {
    return null;
  }

  // Get current cycle index
  const state = await getState();

  // Check if we need to reset cycle index (playlist changed or index out of bounds)
  const needsReset = state.activePlaylistId !== activePlaylist.id ||
                     state.currentCycleIndex >= visibleItems.length;

  if (needsReset) {
    if (DEBUG) console.log('[Director] Playlist changed or index out of bounds, resetting cycle');
    const newState: DirectorState = {
      currentCycleIndex: 0,
      lastSwitchTime: Date.now(),
      lastUpdate: new Date().toISOString(),
      activePlaylistId: activePlaylist.id,
    };
    await saveState(newState);

    if (DEBUG) console.log('[Director] Current item:', visibleItems[0].title, `(1/${visibleItems.length}) from playlist: ${activePlaylist.name}`);
    return visibleItems[0];
  }

  const cycleIndex = state.currentCycleIndex % visibleItems.length;
  const currentItem = visibleItems[cycleIndex];

  if (DEBUG) console.log('[Director] Current item:', currentItem.title, `(${cycleIndex + 1}/${visibleItems.length}) from playlist: ${activePlaylist.name}`);
  return currentItem;
}

/**
 * Advances the cycle index to the next item.
 * This should be called after a successful render.
 *
 * Increments the index and wraps around within the active playlist.
 */
export async function advanceCycle(): Promise<void> {
  const activePlaylist = await resolveActivePlaylist();

  if (!activePlaylist || activePlaylist.items.length === 0) {
    if (DEBUG) console.log('[Director] No items to advance');
    return;
  }

  // Filter out hidden items (visible !== false means visible by default)
  const visibleItems = activePlaylist.items.filter(item => item.visible !== false);

  if (visibleItems.length === 0) {
    if (DEBUG) console.log('[Director] No visible items to advance');
    return;
  }

  // Advance the cycle index
  const state = await getState();
  const newIndex = (state.currentCycleIndex + 1) % visibleItems.length;

  const newState: DirectorState = {
    currentCycleIndex: newIndex,
    lastSwitchTime: Date.now(),
    lastUpdate: new Date().toISOString(),
    activePlaylistId: activePlaylist.id,
  };

  await saveState(newState);
  if (DEBUG) console.log('[Director] Advanced cycle:', state.currentCycleIndex, '->', newIndex, 'in playlist:', activePlaylist.name);
}

/**
 * Resets the cycle index to 0.
 * Useful for testing or manual reset.
 */
export async function resetCycle(): Promise<void> {
  const activePlaylist = await resolveActivePlaylist();

  const newState: DirectorState = {
    currentCycleIndex: 0,
    lastSwitchTime: Date.now(),
    lastUpdate: new Date().toISOString(),
    activePlaylistId: activePlaylist?.id || null,
  };

  await saveState(newState);
  if (DEBUG) console.log('[Director] Reset cycle to 0');
}

/**
 * Gets the current state for debugging/monitoring.
 */
export async function getDirectorState(): Promise<DirectorState> {
  return await getState();
}

/**
 * Main tick function - checks time and advances rotation if needed.
 * This should be called periodically (e.g., every 5 seconds from the simulator).
 *
 * Returns the current status including active item and next switch time.
 */
export async function tick(): Promise<DirectorStatus> {
  const settings = await getSettings();
  const activePlaylist = await resolveActivePlaylist();
  let state = await getState();
  const now = Date.now();

  // Check if we're within the active time window
  if (!isWithinActiveWindow(settings.system.startTime, settings.system.endTime)) {
    if (DEBUG) console.log('[Director Tick] Outside active window - device should sleep');
    return {
      currentItem: null,
      nextSwitchTime: now + 60000, // Check again in 1 minute
      cycleIndex: state.currentCycleIndex % Math.max(activePlaylist?.items.length || 1, 1),
      totalItems: activePlaylist?.items.length || 0,
      activePlaylistId: activePlaylist?.id || null,
      activePlaylistName: activePlaylist?.name || null,
    };
  }

  // If lastSwitchTime is very old (more than 1 day) or in the future, reset it
  // This handles the case where state file was just created or is corrupt
  const timeSinceSwitch = now - state.lastSwitchTime;
  if (timeSinceSwitch > 86400000 || timeSinceSwitch < 0) {
    if (DEBUG) console.log('[Director Tick] Resetting lastSwitchTime (was invalid)');
    state = {
      ...state,
      lastSwitchTime: now,
    };
    await saveState(state);
  }

  if (!activePlaylist || activePlaylist.items.length === 0) {
    return {
      currentItem: null,
      nextSwitchTime: now + 60000, // Check again in 1 minute
      cycleIndex: 0,
      totalItems: 0,
      activePlaylistId: null,
      activePlaylistName: null,
    };
  }

  // Filter out hidden items (visible !== false means visible by default)
  const visibleItems = activePlaylist.items.filter(item => item.visible !== false);

  if (visibleItems.length === 0) {
    return {
      currentItem: null,
      nextSwitchTime: now + 60000, // Check again in 1 minute
      cycleIndex: 0,
      totalItems: 0,
      activePlaylistId: activePlaylist.id,
      activePlaylistName: activePlaylist.name,
    };
  }

  // Check if playlist changed or index out of bounds - reset if needed
  if (state.activePlaylistId !== activePlaylist.id || state.currentCycleIndex >= visibleItems.length) {
    if (DEBUG) console.log('[Director Tick] Playlist changed or index out of bounds, resetting cycle');
    state = {
      currentCycleIndex: 0,
      lastSwitchTime: now,
      lastUpdate: new Date().toISOString(),
      activePlaylistId: activePlaylist.id,
    };
    await saveState(state);
  }

  // Get current cycle item
  const cycleIndex = state.currentCycleIndex % visibleItems.length;
  const currentItem = visibleItems[cycleIndex];
  const itemDuration = (currentItem.duration || settings.system.refreshInterval) * 60 * 1000; // Convert minutes to ms

  // Calculate when this item should end (fixed point in time)
  const itemEndTime = state.lastSwitchTime + itemDuration;

  // Check if it's time to advance
  if (now >= itemEndTime) {
    // Time to advance to next item
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

    if (DEBUG) console.log('[Director Tick] Advanced cycle:', cycleIndex, '->', newIndex, nextItem.title, 'in playlist:', activePlaylist.name);

    return {
      currentItem: nextItem,
      nextSwitchTime: nextEndTime,
      cycleIndex: newIndex,
      totalItems: visibleItems.length,
      activePlaylistId: activePlaylist.id,
      activePlaylistName: activePlaylist.name,
    };
  }

  // Still showing current item - return the fixed end time
  if (DEBUG) {
    const remainingSeconds = Math.floor((itemEndTime - now) / 1000);
    console.log('[Director Tick] Item active:', currentItem.title, `(${cycleIndex + 1}/${visibleItems.length})`, `- ${remainingSeconds}s remaining`, 'in playlist:', activePlaylist.name);
    console.log('[Director Tick] lastSwitchTime:', new Date(state.lastSwitchTime).toISOString(), 'nextSwitchTime:', new Date(itemEndTime).toISOString());
  }

  return {
    currentItem,
    nextSwitchTime: itemEndTime, // This stays constant until we switch
    cycleIndex,
    totalItems: visibleItems.length,
    activePlaylistId: activePlaylist.id,
    activePlaylistName: activePlaylist.name,
  };
}
