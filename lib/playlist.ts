import { promises as fs } from 'fs';
import path from 'path';

// --- TYPES ---

export interface PlaylistItem {
  id: string;
  type: 'weather' | 'calendar' | 'custom-text' | 'logo' | 'image' | 'system' | 'comic';
  title: string;
  subtitle: string;
  config: Record<string, any> & {
    bitDepth?: 1 | 2;
    // Image-specific config
    url?: string;
    fit?: 'cover' | 'contain';
    grayscale?: boolean;
  }; // For plugin settings
  lastUpdated: string;
  duration?: number; // Duration in minutes (how long this screen displays)
  visible?: boolean; // Whether this item is visible/displayed (default: true)
}

export interface Schedule {
  type: 'manual' | 'weekly';
  activeDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string; // "HH:MM" format, default "00:00"
  endTime: string; // "HH:MM" format, default "23:59"
}

export interface Playlist {
  id: string;
  name: string;
  schedule: Schedule;
  items: PlaylistItem[];
  isDefault: boolean; // True if this is the fallback/default playlist
}

export interface PlaylistCollection {
  playlists: Playlist[];
  activePlaylistId: string | null; // For manual override
}

// --- FILE PATHS ---

const DATA_DIR = path.join(process.cwd(), 'data');
const PLAYLIST_FILE = path.join(DATA_DIR, 'playlist.json');

// --- LOCKING MECHANISM ---

let isSaving = false;
let saveQueue: Array<{ collection: PlaylistCollection; resolve: () => void; reject: (error: any) => void }> = [];

// --- HELPER: ENSURE DATA DIRECTORY EXISTS ---

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// --- HELPER FUNCTIONS ---

/**
 * Generate a unique ID for playlists
 */
function generatePlaylistId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Create a default playlist collection with migrated items
 */
function createDefaultCollection(items: PlaylistItem[]): PlaylistCollection {
  return {
    playlists: [
      {
        id: 'default',
        name: 'Default Playlist',
        schedule: {
          type: 'weekly',
          activeDays: [0, 1, 2, 3, 4, 5, 6], // All days
          startTime: '00:00',
          endTime: '23:59',
        },
        items,
        isDefault: true, // First playlist is always default
      },
    ],
    activePlaylistId: null,
  };
}

/**
 * Ensures exactly one playlist is marked as default.
 * If no default exists, marks the first playlist as default.
 * If multiple defaults exist, keeps only the first one.
 */
function ensureSingleDefault(collection: PlaylistCollection): void {
  const defaults = collection.playlists.filter(p => p.isDefault);

  if (defaults.length === 0 && collection.playlists.length > 0) {
    // No default found - mark first playlist as default
    collection.playlists[0].isDefault = true;
  } else if (defaults.length > 1) {
    // Multiple defaults found - keep only the first, unmark the rest
    let foundFirst = false;
    collection.playlists.forEach(p => {
      if (p.isDefault) {
        if (foundFirst) {
          p.isDefault = false;
        } else {
          foundFirst = true;
        }
      }
    });
  }
}

/**
 * Check if two time ranges overlap
 * @param start1 "HH:MM" format
 * @param end1 "HH:MM" format
 * @param start2 "HH:MM" format
 * @param end2 "HH:MM" format
 * @returns true if the time ranges overlap
 */
function timeRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  // Convert "HH:MM" to minutes since midnight for easier comparison
  const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const start1Min = toMinutes(start1);
  const end1Min = toMinutes(end1);
  const start2Min = toMinutes(start2);
  const end2Min = toMinutes(end2);

  // Check overlap: StartA < EndB && StartB < EndA
  return start1Min < end2Min && start2Min < end1Min;
}

/**
 * Detect if a playlist schedule conflicts with existing playlists
 * @param newPlaylist The playlist to check
 * @param existingPlaylists All existing playlists
 * @param excludeId Optional playlist ID to exclude from conflict check (for updates)
 * @returns The conflicting playlist if found, null otherwise
 *
 * Rules:
 * - Specific playlists (isDefault: false) CAN overlap with default playlist
 * - Specific playlists CANNOT overlap with each other
 * - Default playlist CAN overlap with everything (it's the fallback)
 */
export function detectScheduleConflict(
  newPlaylist: Playlist,
  existingPlaylists: Playlist[],
  excludeId?: string
): Playlist | null {
  // If this is the default playlist, no conflicts possible (it's the fallback)
  if (newPlaylist.isDefault) {
    return null;
  }

  const { activeDays, startTime, endTime } = newPlaylist.schedule;

  for (const existing of existingPlaylists) {
    // Skip if this is the same playlist (for update operations)
    if (excludeId && existing.id === excludeId) {
      continue;
    }

    // Skip default playlists - specific playlists can overlap with default
    if (existing.isDefault) {
      continue;
    }

    const { activeDays: existingDays, startTime: existingStart, endTime: existingEnd } = existing.schedule;

    // Check if they share any active days
    const sharedDays = activeDays.some(day => existingDays.includes(day));

    if (sharedDays) {
      // Check if time windows overlap
      if (timeRangesOverlap(startTime, endTime, existingStart, existingEnd)) {
        return existing; // Conflict found
      }
    }
  }

  return null; // No conflict
}

// --- PUBLIC API ---

/**
 * Reads the playlist collection from the JSON file with retry logic.
 * Automatically migrates old flat array structure to new collection structure.
 * Ensures exactly one default playlist exists.
 * Returns a default empty collection if the file doesn't exist.
 */
export async function getPlaylistCollection(): Promise<PlaylistCollection> {
  await ensureDataDir();

  // Retry logic for race conditions when file is being written
  const maxRetries = 3;
  const retryDelay = 100; // ms

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await fs.readFile(PLAYLIST_FILE, 'utf-8');

      // Handle empty file (corrupted state)
      if (!data || data.trim() === '') {
        console.warn('[playlist] Empty playlist file detected, creating default collection');
        const collection = createDefaultCollection([]);
        await savePlaylistCollection(collection);
        return collection;
      }

      const parsed = JSON.parse(data);

      // Check if this is the old format (array) or new format (object with playlists)
      if (Array.isArray(parsed)) {
        // Old format - migrate to new structure
        console.log('[playlist] Migrating old format to new collection structure');
        const collection = createDefaultCollection(parsed as PlaylistItem[]);
        // Auto-save the migrated structure
        await savePlaylistCollection(collection);
        return collection;
      }

      // New format - ensure all playlists have isDefault field (migration)
      const collection = parsed as PlaylistCollection;
      let needsSave = false;

      collection.playlists.forEach(p => {
        if (p.isDefault === undefined) {
          p.isDefault = false; // Default to false, will be corrected by ensureSingleDefault
          needsSave = true;
        }
      });

      // Check if we need to fix default playlist
      const defaults = collection.playlists.filter(p => p.isDefault);
      if (defaults.length !== 1 && collection.playlists.length > 0) {
        needsSave = true;
      }

      // Ensure exactly one default exists
      ensureSingleDefault(collection);

      // Only save if migration was needed
      if (needsSave) {
        console.log('[playlist] Migration needed, saving collection');
        await savePlaylistCollection(collection);
      }

      return collection;
    } catch (error: any) {
      // If file doesn't exist, return empty collection
      if (error.code === 'ENOENT') {
        return createDefaultCollection([]);
      }

      // If JSON parse error and we have retries left, wait and retry
      if (error instanceof SyntaxError && attempt < maxRetries) {
        console.warn(`[playlist] JSON parse error on attempt ${attempt + 1}, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      // Otherwise, throw the error
      throw error;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Failed to read playlist collection after retries');
}

/**
 * Internal function to actually write to disk
 */
async function _savePlaylistCollectionToDisk(collection: PlaylistCollection): Promise<void> {
  await ensureDataDir();

  // Write directly to the file (no temp file needed with our queue system)
  const jsonData = JSON.stringify(collection, null, 2);

  try {
    await fs.writeFile(PLAYLIST_FILE, jsonData, 'utf-8');
    console.log('[Playlist] Successfully saved playlist collection');
  } catch (error) {
    console.error('[Playlist] Failed to save playlist collection:', error);
    throw error;
  }
}

/**
 * Saves the playlist collection to the JSON file using a queue to prevent race conditions.
 * Creates the data directory if it doesn't exist.
 */
export async function savePlaylistCollection(collection: PlaylistCollection): Promise<void> {
  return new Promise((resolve, reject) => {
    // Add to queue
    saveQueue.push({ collection, resolve, reject });

    // Process queue if not already processing
    if (!isSaving) {
      processSaveQueue();
    }
  });
}

/**
 * Process the save queue sequentially
 */
async function processSaveQueue(): Promise<void> {
  if (isSaving || saveQueue.length === 0) {
    return;
  }

  isSaving = true;

  while (saveQueue.length > 0) {
    // Get the latest save request (discard older ones for the same collection)
    const request = saveQueue.shift()!;

    try {
      await _savePlaylistCollectionToDisk(request.collection);
      request.resolve();

      // Also resolve any other pending requests in the queue
      // (they're redundant since we just saved the latest state)
      while (saveQueue.length > 0) {
        const redundantRequest = saveQueue.shift()!;
        redundantRequest.resolve();
      }
    } catch (error) {
      request.reject(error);

      // Also reject all pending requests
      while (saveQueue.length > 0) {
        const failedRequest = saveQueue.shift()!;
        failedRequest.reject(error);
      }
    }
  }

  isSaving = false;
}

/**
 * LEGACY: Reads the playlist from the JSON file.
 * Returns items from the currently active playlist.
 * Maintained for backward compatibility.
 */
export async function getPlaylist(): Promise<PlaylistItem[]> {
  const collection = await getPlaylistCollection();

  // Return items from the first playlist (for backward compatibility)
  if (collection.playlists.length === 0) {
    return [];
  }

  return collection.playlists[0].items;
}

/**
 * LEGACY: Saves the playlist to the JSON file.
 * Updates the first playlist in the collection.
 * Maintained for backward compatibility.
 */
export async function savePlaylist(items: PlaylistItem[]): Promise<void> {
  const collection = await getPlaylistCollection();

  if (collection.playlists.length === 0) {
    // Create default playlist if none exists
    collection.playlists.push({
      id: 'default',
      name: 'Default Playlist',
      schedule: {
        type: 'weekly',
        activeDays: [0, 1, 2, 3, 4, 5, 6],
        startTime: '00:00',
        endTime: '23:59',
      },
      items,
      isDefault: true,
    });
  } else {
    // Update first playlist
    collection.playlists[0].items = items;
  }

  await savePlaylistCollection(collection);
}

/**
 * Get a specific playlist by ID
 */
export async function getPlaylistById(id: string): Promise<Playlist | null> {
  const collection = await getPlaylistCollection();
  return collection.playlists.find(p => p.id === id) || null;
}

/**
 * Create a new playlist with schedule conflict validation and default handling
 */
export async function createPlaylist(name: string, schedule: Schedule, isDefault: boolean = false): Promise<Playlist> {
  const collection = await getPlaylistCollection();

  // Ensure schedule has time windows (default to all-day if not specified)
  const fullSchedule: Schedule = {
    ...schedule,
    startTime: schedule.startTime || '00:00',
    endTime: schedule.endTime || '23:59',
  };

  const newPlaylist: Playlist = {
    id: generatePlaylistId(),
    name,
    schedule: fullSchedule,
    items: [],
    isDefault,
  };

  // If setting this as default, unmark the current default
  if (isDefault) {
    collection.playlists.forEach(p => {
      if (p.isDefault) {
        p.isDefault = false;
      }
    });
  }

  // Check for schedule conflicts (only for non-default playlists)
  const conflict = detectScheduleConflict(newPlaylist, collection.playlists);
  if (conflict) {
    throw new Error(
      `Schedule conflict detected with playlist "${conflict.name}". ` +
      `Both playlists share days and have overlapping time windows.`
    );
  }

  collection.playlists.push(newPlaylist);
  await savePlaylistCollection(collection);

  return newPlaylist;
}

/**
 * Update an existing playlist with schedule conflict validation and default handling
 */
export async function updatePlaylistById(id: string, updates: Partial<Omit<Playlist, 'id'>>): Promise<void> {
  const collection = await getPlaylistCollection();
  const playlistIndex = collection.playlists.findIndex(p => p.id === id);

  if (playlistIndex === -1) {
    throw new Error(`Playlist with id ${id} not found`);
  }

  const updatedPlaylist: Playlist = {
    ...collection.playlists[playlistIndex],
    ...updates,
  };

  // If setting this as default, unmark the current default
  if (updates.isDefault === true) {
    collection.playlists.forEach((p, idx) => {
      if (idx !== playlistIndex && p.isDefault) {
        p.isDefault = false;
      }
    });
  }

  // If schedule or isDefault is being updated, check for conflicts
  if (updates.schedule || updates.isDefault !== undefined) {
    const conflict = detectScheduleConflict(updatedPlaylist, collection.playlists, id);
    if (conflict) {
      throw new Error(
        `Schedule conflict detected with playlist "${conflict.name}". ` +
        `Both playlists share days and have overlapping time windows.`
      );
    }
  }

  collection.playlists[playlistIndex] = updatedPlaylist;
  await savePlaylistCollection(collection);
}

/**
 * Delete a playlist by ID with safety check for default playlist
 */
export async function deletePlaylist(id: string): Promise<void> {
  const collection = await getPlaylistCollection();
  const targetPlaylist = collection.playlists.find(p => p.id === id);

  if (!targetPlaylist) {
    throw new Error(`Playlist with id ${id} not found`);
  }

  // Safety check: cannot delete the default playlist
  if (targetPlaylist.isDefault) {
    throw new Error(
      `Cannot delete the Default playlist "${targetPlaylist.name}". ` +
      `Please assign a new Default playlist first.`
    );
  }

  collection.playlists = collection.playlists.filter(p => p.id !== id);

  // Clear active playlist ID if it was deleted
  if (collection.activePlaylistId === id) {
    collection.activePlaylistId = null;
  }

  await savePlaylistCollection(collection);
}

/**
 * Set the active playlist ID (for manual override)
 */
export async function setActivePlaylist(playlistId: string | null): Promise<void> {
  const collection = await getPlaylistCollection();

  // Validate playlist exists if not null
  if (playlistId !== null && !collection.playlists.find(p => p.id === playlistId)) {
    throw new Error(`Playlist with id ${playlistId} not found`);
  }

  collection.activePlaylistId = playlistId;
  await savePlaylistCollection(collection);
}
