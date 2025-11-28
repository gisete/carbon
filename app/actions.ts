'use server';

import { revalidatePath } from 'next/cache';
import { getPlaylist, savePlaylist, PlaylistItem } from '@/lib/playlist';

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
