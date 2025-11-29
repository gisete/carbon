'use server';

import { revalidatePath } from 'next/cache';
import { getPlaylist, savePlaylist, PlaylistItem } from '@/lib/playlist';
import { getSettings, saveSettings, Settings } from '@/lib/settings';

/**
 * Fetches the current playlist from storage
 */
export async function fetchPlaylist(): Promise<PlaylistItem[]> {
  return await getPlaylist();
}

/**
 * Updates the playlist in storage and revalidates the page
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
