import { promises as fs } from 'fs';
import path from 'path';

// --- TYPES ---

export interface PlaylistItem {
  id: string;
  type: 'weather' | 'calendar' | 'custom-text';
  title: string;
  subtitle: string;
  scheduleMode: 'cycle' | 'fixed-time';
  startTime?: string;
  endTime?: string;
  config: Record<string, any>; // For plugin settings
  lastUpdated: string;
}

// --- FILE PATHS ---

const DATA_DIR = path.join(process.cwd(), 'data');
const PLAYLIST_FILE = path.join(DATA_DIR, 'playlist.json');

// --- HELPER: ENSURE DATA DIRECTORY EXISTS ---

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// --- PUBLIC API ---

/**
 * Reads the playlist from the JSON file.
 * Returns an empty array if the file doesn't exist.
 */
export async function getPlaylist(): Promise<PlaylistItem[]> {
  await ensureDataDir();

  try {
    const data = await fs.readFile(PLAYLIST_FILE, 'utf-8');
    return JSON.parse(data) as PlaylistItem[];
  } catch (error: any) {
    // If file doesn't exist, return empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Saves the playlist to the JSON file.
 * Creates the data directory if it doesn't exist.
 */
export async function savePlaylist(items: PlaylistItem[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(PLAYLIST_FILE, JSON.stringify(items, null, 2), 'utf-8');
}
