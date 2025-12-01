'use server';

import { revalidatePath } from 'next/cache';
import {
  getPlaylist,
  savePlaylist,
  PlaylistItem,
  getPlaylistCollection,
  savePlaylistCollection,
  PlaylistCollection,
  Playlist,
  Schedule,
  getPlaylistById,
  createPlaylist,
  updatePlaylistById,
  deletePlaylist,
  setActivePlaylist,
} from '@/lib/playlist';
import { getSettings, saveSettings, Settings } from '@/lib/settings';
import { getCurrentItem, advanceCycle, resetCycle, getDirectorState, tick, DirectorStatus } from '@/lib/director';

/**
 * Fetches the current playlist from storage
 */
export async function fetchPlaylist(): Promise<PlaylistItem[]> {
  return await getPlaylist();
}

/**
 * LEGACY: Updates the playlist in storage and revalidates the page
 * This updates the first playlist's items for backward compatibility
 */
export async function updatePlaylist(items: PlaylistItem[]): Promise<void> {
  await savePlaylist(items);
  revalidatePath('/admin/playlist');
}

/**
 * Fetches the current settings from storage
 */
export async function fetchSettings(): Promise<Settings> {
  return await getSettings();
}

/**
 * Updates the settings in storage and revalidates pages
 */
export async function updateSettings(settings: Settings): Promise<void> {
  await saveSettings(settings);
  revalidatePath('/admin/screens');
  revalidatePath('/screens/calendar');
}

/**
 * Gets the next screen from the Director (for simulator sync)
 */
export async function getNextScreen(): Promise<PlaylistItem | null> {
  return await getCurrentItem();
}

/**
 * Advances the cycle to the next item (for manual testing)
 */
export async function advanceToNextScreen(): Promise<void> {
  await advanceCycle();
}

/**
 * Resets the cycle index to 0 (for testing)
 */
export async function resetPlaylistCycle(): Promise<void> {
  await resetCycle();
}

/**
 * Gets the current director state (for debugging)
 */
export async function fetchDirectorState() {
  return await getDirectorState();
}

/**
 * Ticks the director and returns current status.
 * This runs the rotation logic and advances if needed.
 */
export async function tickDirector(): Promise<DirectorStatus> {
  return await tick();
}

/**
 * Gets the active playlist items (for simulator display)
 */
export async function getActivePlaylistItems(): Promise<PlaylistItem[]> {
  const collection = await getPlaylistCollection();
  const status = await tick();

  console.log('[getActivePlaylistItems] Active playlist ID:', status.activePlaylistId);
  console.log('[getActivePlaylistItems] Current item:', status.currentItem?.title);

  if (!status.activePlaylistId) {
    console.log('[getActivePlaylistItems] No active playlist ID, returning empty array');
    return [];
  }

  const activePlaylist = collection.playlists.find(p => p.id === status.activePlaylistId);
  console.log('[getActivePlaylistItems] Active playlist:', activePlaylist?.name, 'Items:', activePlaylist?.items.length);
  return activePlaylist?.items || [];
}

// --- NEW PLAYLIST COLLECTION ACTIONS ---

/**
 * Fetches the entire playlist collection
 */
export async function fetchPlaylistCollection(): Promise<PlaylistCollection> {
  return await getPlaylistCollection();
}

/**
 * Saves the entire playlist collection
 */
export async function savePlaylistCollectionAction(collection: PlaylistCollection): Promise<void> {
  await savePlaylistCollection(collection);
  revalidatePath('/admin/playlist');
}

/**
 * Fetches a specific playlist by ID
 */
export async function fetchPlaylistById(id: string): Promise<Playlist | null> {
  return await getPlaylistById(id);
}

/**
 * Creates a new playlist
 */
export async function createNewPlaylist(name: string, schedule: Schedule, isDefault: boolean = false): Promise<Playlist> {
  const playlist = await createPlaylist(name, schedule, isDefault);
  revalidatePath('/admin/playlist');
  return playlist;
}

/**
 * Updates a specific playlist by ID
 */
export async function updatePlaylistByIdAction(id: string, updates: Partial<Omit<Playlist, 'id'>>): Promise<void> {
  await updatePlaylistById(id, updates);
  revalidatePath('/admin/playlist');
}

/**
 * Deletes a playlist by ID
 */
export async function deletePlaylistById(id: string): Promise<void> {
  await deletePlaylist(id);
  revalidatePath('/admin/playlist');
}

/**
 * Sets the active playlist ID for manual override
 */
export async function setActivePlaylistId(playlistId: string | null): Promise<void> {
  await setActivePlaylist(playlistId);
  revalidatePath('/admin/playlist');
}
