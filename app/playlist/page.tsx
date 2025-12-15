"use client";

import React, { useState, useEffect } from "react";
import { Moon, Battery } from "lucide-react";
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

function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function PlaylistPage() {
	const [collection, setCollection] = useState<PlaylistCollection | null>(null);
	const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const [isScreenModalOpen, setIsScreenModalOpen] = useState(false);
	const [isAddPlaylistModalOpen, setIsAddPlaylistModalOpen] = useState(false);
	const [isEditPlaylistModalOpen, setIsEditPlaylistModalOpen] = useState(false);
	const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
	const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null);
	const [isNewItem, setIsNewItem] = useState(false);

	const [activeItemId, setActiveItemId] = useState<string | null>(null);
	const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
	const [isSleeping, setIsSleeping] = useState(false);
	const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

	const selectedPlaylist = collection?.playlists.find((p) => p.id === selectedPlaylistId) || null;

	useEffect(() => {
		async function loadData() {
			try {
				const collectionData = await fetchPlaylistCollection();
				setCollection(collectionData);
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

	useEffect(() => {
		async function pollDirectorState() {
			try {
				const status = await tickDirector();
				setActiveItemId(status.currentItem?.id || null);
				setActivePlaylistId(status.activePlaylistId);
				setIsSleeping(!!status.isSleeping);
				setBatteryLevel(status.batteryLevel !== undefined ? status.batteryLevel : null);
			} catch (error) {
				console.error("Failed to poll director state:", error);
			}
		}
		pollDirectorState();
		const intervalId = setInterval(pollDirectorState, 5000);
		return () => clearInterval(intervalId);
	}, []);

	async function savePlaylistItems(items: PlaylistItem[]) {
		if (!selectedPlaylistId) return;
		try {
			await updatePlaylistByIdAction(selectedPlaylistId, { items });
			if (collection) {
				const updatedPlaylists = collection.playlists.map((p) => (p.id === selectedPlaylistId ? { ...p, items } : p));
				setCollection({ ...collection, playlists: updatedPlaylists });
			}
		} catch (error) {
			console.error("Failed to save playlist:", error);
		}
	}

	async function savePlaylistSchedule(newStartTime: string, newEndTime: string, playlistId?: string) {
		const targetId = playlistId || selectedPlaylistId;
		if (!targetId || !collection) return;
		const targetPlaylist = collection.playlists.find((p) => p.id === targetId);
		if (!targetPlaylist) return;
		try {
			const updatedSchedule = {
				...targetPlaylist.schedule,
				startTime: newStartTime,
				endTime: newEndTime,
			};
			await updatePlaylistByIdAction(targetId, { schedule: updatedSchedule });
			const updatedPlaylists = collection.playlists.map((p) =>
				p.id === targetId ? { ...p, schedule: updatedSchedule } : p
			);
			setCollection({ ...collection, playlists: updatedPlaylists });
		} catch (error) {
			console.error("Failed to save playlist schedule:", error);
			if (error instanceof Error) {
				alert(error.message);
				const collectionData = await fetchPlaylistCollection();
				setCollection(collectionData);
			}
		}
	}

	async function addScreen(type: ScreenType) {
		let newItem: PlaylistItem;
		const settings = await fetchSettings();
		switch (type) {
			case "weather":
				newItem = {
					id: generateId(),
					type: "weather",
					title: "Weather",
					subtitle: "Current Conditions",
					config: { viewMode: "current" },
					lastUpdated: "Just now",
					duration: 15,
				};
				break;
			case "calendar":
				const defaultIcalUrl = settings.calendar.icalUrl || "";
				newItem = {
					id: generateId(),
					type: "calendar",
					title: "Calendar",
					subtitle: "Daily",
					config: { icalUrl: defaultIcalUrl, viewMode: "daily" },
					lastUpdated: "Just now",
					duration: 15,
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
					duration: 15,
				};
				break;
			case "logo":
				newItem = {
					id: generateId(),
					type: "logo",
					title: "Carbon Logo",
					subtitle: "Branding",
					config: { fontSize: "120" },
					lastUpdated: "Just now",
					duration: 15,
				};
				break;
			case "image":
				newItem = {
					id: generateId(),
					type: "image",
					title: "Image",
					subtitle: "No image set",
					config: { url: "", fit: "contain", grayscale: false },
					lastUpdated: "Just now",
					duration: 15,
				};
				break;
			case "system":
				newItem = {
					id: generateId(),
					type: "system",
					title: "System Status",
					subtitle: "CPU, RAM, Disk",
					config: {},
					lastUpdated: "Just now",
					duration: 15,
				};
				break;
			case "comic":
				newItem = {
					id: generateId(),
					type: "comic",
					title: "The New Yorker",
					subtitle: "Daily Cartoon",
					config: {},
					lastUpdated: "Just now",
					duration: 15,
				};
				break;
		}
		setIsScreenModalOpen(false);
		setIsNewItem(true);
		setEditingItem(newItem);
	}

	async function removeItem(id: string, playlistId?: string) {
		if (!collection) return;
		let targetPlaylist: Playlist | undefined;
		if (playlistId) {
			targetPlaylist = collection.playlists.find((p) => p.id === playlistId);
		} else {
			targetPlaylist = collection.playlists.find((p) => p.items.some((item) => item.id === id));
		}
		if (!targetPlaylist) return;
		const updatedItems = targetPlaylist.items.filter((item) => item.id !== id);
		try {
			await updatePlaylistByIdAction(targetPlaylist.id, { items: updatedItems });
			const updatedPlaylists = collection.playlists.map((p) =>
				p.id === targetPlaylist!.id ? { ...p, items: updatedItems } : p
			);
			setCollection({ ...collection, playlists: updatedPlaylists });
		} catch (error) {
			console.error("Failed to remove item:", error);
		}
	}

	async function toggleItemVisibility(id: string, playlistId?: string) {
		if (!collection) return;
		let targetPlaylist: Playlist | undefined;
		if (playlistId) {
			targetPlaylist = collection.playlists.find((p) => p.id === playlistId);
		} else {
			targetPlaylist = collection.playlists.find((p) => p.items.some((item) => item.id === id));
		}
		if (!targetPlaylist) return;
		const updatedItems = targetPlaylist.items.map((item) =>
			item.id === id ? { ...item, visible: item.visible === false ? true : false } : item
		);
		try {
			await updatePlaylistByIdAction(targetPlaylist.id, { items: updatedItems });
			const updatedPlaylists = collection.playlists.map((p) =>
				p.id === targetPlaylist!.id ? { ...p, items: updatedItems } : p
			);
			setCollection({ ...collection, playlists: updatedPlaylists });
		} catch (error) {
			console.error("Failed to toggle item visibility:", error);
		}
	}

	async function handleReorderItems(reorderedItems: PlaylistItem[], playlistId: string) {
		try {
			await updatePlaylistByIdAction(playlistId, { items: reorderedItems });
			if (collection) {
				const updatedPlaylists = collection.playlists.map((p) =>
					p.id === playlistId ? { ...p, items: reorderedItems } : p
				);
				setCollection({ ...collection, playlists: updatedPlaylists });
			}
		} catch (error) {
			console.error("Failed to reorder items:", error);
		}
	}

	function handleEditItem(item: PlaylistItem) {
		setEditingItem(item);
	}

	async function handleSaveConfig(updatedItem: PlaylistItem) {
		if (!selectedPlaylist) return;
		let updatedItems: PlaylistItem[];
		if (isNewItem) {
			updatedItems = [...selectedPlaylist.items, updatedItem];
		} else {
			updatedItems = selectedPlaylist.items.map((item) => (item.id === updatedItem.id ? updatedItem : item));
		}
		await savePlaylistItems(updatedItems);
		setEditingItem(null);
		setIsNewItem(false);
	}

	function handleCancelConfig() {
		setEditingItem(null);
		setIsNewItem(false);
	}

	async function handleAddPlaylist(
		name: string,
		isDefault: boolean = false,
		startTime: string = "00:00",
		endTime: string = "23:59"
	) {
		try {
			const newPlaylist = await createNewPlaylist(
				name,
				{
					type: "weekly",
					activeDays: [0, 1, 2, 3, 4, 5, 6],
					startTime,
					endTime,
				},
				isDefault
			);
			const updatedCollection = await fetchPlaylistCollection();
			setCollection(updatedCollection);
			setSelectedPlaylistId(newPlaylist.id);
			setIsAddPlaylistModalOpen(false);
		} catch (error) {
			console.error("Failed to create playlist:", error);
			if (error instanceof Error) {
				alert(error.message);
			}
		}
	}

	function handleEditPlaylist(playlistId: string) {
		setEditingPlaylistId(playlistId);
		setIsEditPlaylistModalOpen(true);
	}

	async function handleSaveEditPlaylist(
		name: string,
		isDefault: boolean = false,
		startTime: string = "00:00",
		endTime: string = "23:59"
	) {
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

	async function handleDeletePlaylist(playlistId: string) {
		if (!collection) return;
		const playlist = collection.playlists.find((p) => p.id === playlistId);
		if (!playlist) return;
		if (!confirm(`Are you sure you want to delete "${playlist.name}"?`)) return;
		try {
			await deletePlaylistById(playlistId);
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
			<div className="flex justify-between items-center mb-12">
				{/* Battery Indicator */}
				{batteryLevel !== null && (
					<div className="flex items-center gap-2">
						<Battery
							className={`w-5 h-5 ${
								batteryLevel <= 20 ? "text-red-500" : "text-green-600"
							}`}
						/>
						<span
							className={`text-sm font-mono ${
								batteryLevel <= 20 ? "text-red-500" : "text-green-600"
							}`}
						>
							{Math.round(batteryLevel)}%
						</span>
					</div>
				)}
				{batteryLevel === null && <div></div>}
				<button
					onClick={() => setIsAddPlaylistModalOpen(true)}
					className="group flex items-center gap-2 text-sm font-mono tracking-widest hover:text-bright-blue transition-colors cursor-pointer"
				>
					[ + ADD PLAYLIST ]
				</button>
			</div>

			{isSleeping && (
				<div className="mb-8 p-4 bg-off-white border border-light-gray flex items-center gap-4">
					<div className="p-2 bg-charcoal rounded-full text-white">
						<Moon className="w-4 h-4" />
					</div>
					<div>
						<h3 className="text-sm font-bold text-charcoal uppercase tracking-widest">Device Sleeping</h3>
						<p className="text-xs text-warm-gray font-mono mt-1">
							The device is currently in low-power night mode (outside configured active hours).
						</p>
					</div>
				</div>
			)}

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
							<PlaylistHeader
								playlist={playlist}
								isActive={!isSleeping && activePlaylistId === playlist.id}
								onScheduleChange={(startTime, endTime) => savePlaylistSchedule(startTime, endTime, playlist.id)}
								onEdit={() => handleEditPlaylist(playlist.id)}
								onDelete={() => handleDeletePlaylist(playlist.id)}
							/>
							<PlaylistGrid
								playlist={playlist.items}
								isLoading={false}
								activeItemId={isSleeping ? null : activeItemId}
								onRemoveItem={removeItem}
								onEditItem={handleEditItem}
								onReorder={(reorderedItems) => handleReorderItems(reorderedItems, playlist.id)}
								onToggleVisibility={(id) => toggleItemVisibility(id, playlist.id)}
							/>
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

			<ScreenSelectionModal
				isOpen={isScreenModalOpen}
				onClose={() => setIsScreenModalOpen(false)}
				onSelectScreen={addScreen}
			/>
			<ConfigModal
				isOpen={editingItem !== null}
				item={editingItem}
				onClose={handleCancelConfig}
				onSave={handleSaveConfig}
			/>
			<AddPlaylistModal
				isOpen={isAddPlaylistModalOpen}
				onClose={() => setIsAddPlaylistModalOpen(false)}
				onSave={handleAddPlaylist}
				allPlaylists={collection?.playlists || []}
			/>
			<AddPlaylistModal
				isOpen={isEditPlaylistModalOpen}
				onClose={() => {
					setIsEditPlaylistModalOpen(false);
					setEditingPlaylistId(null);
				}}
				onSave={handleSaveEditPlaylist}
				existingPlaylist={editingPlaylistId ? collection?.playlists.find((p) => p.id === editingPlaylistId) : undefined}
				allPlaylists={collection?.playlists || []}
			/>
		</>
	);
}
