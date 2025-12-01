"use client";

import React, { useState, useEffect } from "react";
import {
	fetchPlaylistCollection,
	updatePlaylistByIdAction,
	createNewPlaylist,
	fetchSettings,
	tickDirector,
	deletePlaylistById,
} from "@/app/actions";
import type { PlaylistItem, PlaylistCollection, Playlist } from "@/lib/playlist";
import PlaylistGrid from "./components/PlaylistGrid";
import ConfigModal from "./components/ConfigModal";
import AddPlaylistModal from "./components/AddPlaylistModal";
import PlaylistHeader from "./components/PlaylistHeader";
import AddScreenButton from "./components/AddScreenButton";
import ScreenSelectionModal, { type ScreenType } from "./components/ScreenSelectionModal";

// --- HELPERS ---
function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- COMPONENT ---
export default function PlaylistPage() {
	// Playlist collection state
	const [collection, setCollection] = useState<PlaylistCollection | null>(null);
	const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Modal states
	const [isScreenModalOpen, setIsScreenModalOpen] = useState(false);
	const [isAddPlaylistModalOpen, setIsAddPlaylistModalOpen] = useState(false);
	const [isEditPlaylistModalOpen, setIsEditPlaylistModalOpen] = useState(false);
	const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
	const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null);
	const [isNewItem, setIsNewItem] = useState(false);

	// Active item tracking (synced with Director state)
	const [activeItemId, setActiveItemId] = useState<string | null>(null);

	// Get current selected playlist
	const selectedPlaylist = collection?.playlists.find(p => p.id === selectedPlaylistId) || null;

	// Load playlist collection
	useEffect(() => {
		async function loadData() {
			try {
				const collectionData = await fetchPlaylistCollection();
				setCollection(collectionData);

				// Set selected playlist to first available or active playlist
				if (collectionData.playlists.length > 0) {
					setSelectedPlaylistId(collectionData.playlists[0].id);
				}
			} catch (error) {
				console.error("Failed to load data:", error);
			} finally {
				setIsLoading(false);
			}
		}
		loadData();
	}, []);

	// Poll Director state every 5 seconds to sync active item
	useEffect(() => {
		async function pollDirectorState() {
			try {
				const status = await tickDirector();
				// Set active item ID based on current item from director
				setActiveItemId(status.currentItem?.id || null);
			} catch (error) {
				console.error("Failed to poll director state:", error);
			}
		}

		// Poll immediately on mount
		pollDirectorState();

		// Set up interval for continuous polling
		const intervalId = setInterval(pollDirectorState, 5000);

		// Cleanup interval on unmount
		return () => clearInterval(intervalId);
	}, []);

	// Save playlist items to backend
	async function savePlaylistItems(items: PlaylistItem[]) {
		if (!selectedPlaylistId) return;

		try {
			await updatePlaylistByIdAction(selectedPlaylistId, { items });

			// Update local state
			if (collection) {
				const updatedPlaylists = collection.playlists.map(p =>
					p.id === selectedPlaylistId ? { ...p, items } : p
				);
				setCollection({ ...collection, playlists: updatedPlaylists });
			}
		} catch (error) {
			console.error("Failed to save playlist:", error);
		}
	}

	// Save playlist schedule (time windows)
	async function savePlaylistSchedule(newStartTime: string, newEndTime: string, playlistId?: string) {
		const targetId = playlistId || selectedPlaylistId;
		if (!targetId || !collection) return;

		const targetPlaylist = collection.playlists.find(p => p.id === targetId);
		if (!targetPlaylist) return;

		try {
			const updatedSchedule = {
				...targetPlaylist.schedule,
				startTime: newStartTime,
				endTime: newEndTime,
			};

			await updatePlaylistByIdAction(targetId, { schedule: updatedSchedule });

			// Update local state
			const updatedPlaylists = collection.playlists.map(p =>
				p.id === targetId ? { ...p, schedule: updatedSchedule } : p
			);
			setCollection({ ...collection, playlists: updatedPlaylists });
		} catch (error) {
			console.error("Failed to save playlist schedule:", error);
			// Show error to user if it's a conflict
			if (error instanceof Error) {
				alert(error.message);
				// Reload collection to reset UI to previous values
				const collectionData = await fetchPlaylistCollection();
				setCollection(collectionData);
			}
		}
	}

	// Add Screen (Generic) - Creates draft item and opens config modal
	async function addScreen(type: ScreenType) {
		let newItem: PlaylistItem;

		// Fetch global settings to get default values
		const settings = await fetchSettings();

		switch (type) {
			case "weather":
				newItem = {
					id: generateId(),
					type: "weather",
					title: "Weather",
					subtitle: "Caldas da Rainha",
					config: {},
					lastUpdated: "Just now",
					duration: 5,
				};
				break;
			case "calendar":
				const defaultIcalUrl = settings.calendar.icalUrl || "";
				newItem = {
					id: generateId(),
					type: "calendar",
					title: "Calendar",
					subtitle: defaultIcalUrl ? "iCal URL configured" : "No iCal URL configured",
					config: { icalUrl: defaultIcalUrl },
					lastUpdated: "Just now",
					duration: 5,
				};
				break;
			case "custom-text":
				newItem = {
					id: generateId(),
					type: "custom-text",
					title: "Custom Text",
					subtitle: "No message set",
					config: { text: "" },
					lastUpdated: "Just now",
					duration: 5,
				};
				break;
		}

		// Close screen selection modal and open config modal with new item
		setIsScreenModalOpen(false);
		setIsNewItem(true);
		setEditingItem(newItem);
	}

	// Remove Screen
	async function removeItem(id: string, playlistId?: string) {
		if (!collection) return;

		// Find which playlist contains this item
		let targetPlaylist: Playlist | undefined;
		if (playlistId) {
			targetPlaylist = collection.playlists.find(p => p.id === playlistId);
		} else {
			// Search all playlists for the item
			targetPlaylist = collection.playlists.find(p => p.items.some(item => item.id === id));
		}

		if (!targetPlaylist) return;

		const updatedItems = targetPlaylist.items.filter((item) => item.id !== id);

		try {
			await updatePlaylistByIdAction(targetPlaylist.id, { items: updatedItems });

			// Update local state
			const updatedPlaylists = collection.playlists.map(p =>
				p.id === targetPlaylist!.id ? { ...p, items: updatedItems } : p
			);
			setCollection({ ...collection, playlists: updatedPlaylists });
		} catch (error) {
			console.error("Failed to remove item:", error);
		}
	}

	// Toggle Item Visibility
	async function toggleItemVisibility(id: string, playlistId?: string) {
		if (!collection) return;

		// Find which playlist contains this item
		let targetPlaylist: Playlist | undefined;
		if (playlistId) {
			targetPlaylist = collection.playlists.find(p => p.id === playlistId);
		} else {
			// Search all playlists for the item
			targetPlaylist = collection.playlists.find(p => p.items.some(item => item.id === id));
		}

		if (!targetPlaylist) return;

		// Toggle the visibility
		const updatedItems = targetPlaylist.items.map(item =>
			item.id === id
				? { ...item, visible: item.visible === false ? true : false }
				: item
		);

		try {
			await updatePlaylistByIdAction(targetPlaylist.id, { items: updatedItems });

			// Update local state
			const updatedPlaylists = collection.playlists.map(p =>
				p.id === targetPlaylist!.id ? { ...p, items: updatedItems } : p
			);
			setCollection({ ...collection, playlists: updatedPlaylists });
		} catch (error) {
			console.error("Failed to toggle item visibility:", error);
		}
	}

	// Reorder Screens
	async function handleReorderItems(reorderedItems: PlaylistItem[], playlistId: string) {
		try {
			await updatePlaylistByIdAction(playlistId, { items: reorderedItems });

			// Update local state
			if (collection) {
				const updatedPlaylists = collection.playlists.map(p =>
					p.id === playlistId ? { ...p, items: reorderedItems } : p
				);
				setCollection({ ...collection, playlists: updatedPlaylists });
			}
		} catch (error) {
			console.error("Failed to reorder items:", error);
		}
	}

	// Edit Screen Configuration
	function handleEditItem(item: PlaylistItem) {
		setEditingItem(item);
	}

	// Save Configuration Changes
	async function handleSaveConfig(updatedItem: PlaylistItem) {
		if (!selectedPlaylist) return;

		let updatedItems: PlaylistItem[];

		if (isNewItem) {
			// Adding new item to playlist
			updatedItems = [...selectedPlaylist.items, updatedItem];
		} else {
			// Updating existing item
			updatedItems = selectedPlaylist.items.map((item) =>
				item.id === updatedItem.id ? updatedItem : item
			);
		}

		await savePlaylistItems(updatedItems);
		setEditingItem(null);
		setIsNewItem(false);
	}

	// Handle config modal close (cancel)
	function handleCancelConfig() {
		setEditingItem(null);
		setIsNewItem(false);
	}

	// Handle adding a new playlist
	async function handleAddPlaylist(name: string, isDefault: boolean = false, startTime: string = "00:00", endTime: string = "23:59") {
		try {
			const newPlaylist = await createNewPlaylist(name, {
				type: "weekly",
				activeDays: [0, 1, 2, 3, 4, 5, 6], // All days by default
				startTime,
				endTime,
			}, isDefault);

			// Refresh collection
			const updatedCollection = await fetchPlaylistCollection();
			setCollection(updatedCollection);

			// Switch to the new playlist
			setSelectedPlaylistId(newPlaylist.id);

			setIsAddPlaylistModalOpen(false);
		} catch (error) {
			console.error("Failed to create playlist:", error);
			// Show error to user if it's a conflict
			if (error instanceof Error) {
				alert(error.message);
			}
		}
	}

	// Handle editing a playlist
	function handleEditPlaylist(playlistId: string) {
		setEditingPlaylistId(playlistId);
		setIsEditPlaylistModalOpen(true);
	}

	// Handle saving edited playlist
	async function handleSaveEditPlaylist(name: string, isDefault: boolean = false, startTime: string = "00:00", endTime: string = "23:59") {
		if (!editingPlaylistId) return;

		try {
			await updatePlaylistByIdAction(editingPlaylistId, {
				name,
				isDefault,
				schedule: {
					type: "weekly",
					activeDays: [0, 1, 2, 3, 4, 5, 6],
					startTime,
					endTime,
				},
			});

			// Refresh collection
			const updatedCollection = await fetchPlaylistCollection();
			setCollection(updatedCollection);

			setIsEditPlaylistModalOpen(false);
			setEditingPlaylistId(null);
		} catch (error) {
			console.error("Failed to update playlist:", error);
			if (error instanceof Error) {
				alert(error.message);
			}
		}
	}

	// Handle deleting a playlist
	async function handleDeletePlaylist(playlistId: string) {
		if (!collection) return;

		const playlist = collection.playlists.find(p => p.id === playlistId);
		if (!playlist) return;

		// Confirm deletion
		const confirmMessage = `Are you sure you want to delete "${playlist.name}"?`;
		if (!confirm(confirmMessage)) return;

		try {
			await deletePlaylistById(playlistId);

			// Refresh collection
			const updatedCollection = await fetchPlaylistCollection();
			setCollection(updatedCollection);
		} catch (error) {
			console.error("Failed to delete playlist:", error);
			if (error instanceof Error) {
				alert(error.message);
			}
		}
	}

	return (
		<>
			{/* GLOBAL ACTION BAR - Add Playlist */}
			<div className="flex justify-end gap-6 mb-12">
				<button
					onClick={() => setIsAddPlaylistModalOpen(true)}
					className="group flex items-center gap-2 text-sm font-mono tracking-widest hover:text-bright-blue transition-colors cursor-pointer"
				>
					[ + ADD PLAYLIST ]
				</button>
			</div>

			{/* ALL PLAYLISTS - Each displayed as a section */}
			<div className="space-y-16">
				{isLoading ? (
					<div className="text-center py-12 font-mono text-sm text-warm-gray">Loading playlists...</div>
				) : collection && collection.playlists.length === 0 ? (
					<div className="text-center py-12 font-mono text-sm text-warm-gray">
						No playlists yet. Click "ADD PLAYLIST" to get started.
					</div>
				) : (
					collection?.playlists.map((playlist) => (
						<div key={playlist.id} className="space-y-6">
							{/* PLAYLIST HEADER */}
							<PlaylistHeader
								playlist={playlist}
								onScheduleChange={(startTime, endTime) => savePlaylistSchedule(startTime, endTime, playlist.id)}
								onEdit={() => handleEditPlaylist(playlist.id)}
								onDelete={() => handleDeletePlaylist(playlist.id)}
							/>

							{/* PLAYLIST GRID */}
							<PlaylistGrid
								playlist={playlist.items}
								isLoading={false}
								activeItemId={activeItemId}
								onRemoveItem={removeItem}
								onEditItem={handleEditItem}
								onReorder={(reorderedItems) => handleReorderItems(reorderedItems, playlist.id)}
								onToggleVisibility={(id) => toggleItemVisibility(id, playlist.id)}
							/>

							{/* ADD SCREEN BUTTON */}
							<AddScreenButton
								onClick={() => {
									setSelectedPlaylistId(playlist.id);
									setIsScreenModalOpen(true);
								}}
							/>
						</div>
					))
				)}
			</div>

			{/* SCREEN SELECTION MODAL */}
			<ScreenSelectionModal
				isOpen={isScreenModalOpen}
				onClose={() => setIsScreenModalOpen(false)}
				onSelectScreen={addScreen}
			/>

			{/* CONFIG MODAL */}
			<ConfigModal
				isOpen={editingItem !== null}
				item={editingItem}
				onClose={handleCancelConfig}
				onSave={handleSaveConfig}
			/>

			{/* ADD PLAYLIST MODAL */}
			<AddPlaylistModal
				isOpen={isAddPlaylistModalOpen}
				onClose={() => setIsAddPlaylistModalOpen(false)}
				onSave={handleAddPlaylist}
				allPlaylists={collection?.playlists || []}
			/>

			{/* EDIT PLAYLIST MODAL */}
			<AddPlaylistModal
				isOpen={isEditPlaylistModalOpen}
				onClose={() => {
					setIsEditPlaylistModalOpen(false);
					setEditingPlaylistId(null);
				}}
				onSave={handleSaveEditPlaylist}
				existingPlaylist={editingPlaylistId ? collection?.playlists.find(p => p.id === editingPlaylistId) : undefined}
				allPlaylists={collection?.playlists || []}
			/>
		</>
	);
}
