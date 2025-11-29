"use client";

import React, { useState, useEffect } from "react";
import { Plus, Clock, ChevronDown, Cloud, CalendarDays, Type } from "lucide-react";
import { fetchPlaylist, updatePlaylist } from "@/app/actions";
import type { PlaylistItem } from "@/lib/playlist";
import PlaylistGrid from "./components/PlaylistGrid";
import Modal from "@/app/components/Modal";

// --- TYPES ---
type PluginType = "weather" | "calendar" | "custom-text";

interface PluginOption {
	type: PluginType;
	title: string;
	description: string;
	icon: React.ElementType;
}

// --- PLUGIN OPTIONS ---
const PLUGIN_OPTIONS: PluginOption[] = [
	{
		type: "weather",
		title: "Weather",
		description: "Display current weather conditions",
		icon: Cloud,
	},
	{
		type: "calendar",
		title: "Calendar",
		description: "Show upcoming events from iCal",
		icon: CalendarDays,
	},
	{
		type: "custom-text",
		title: "Custom Text",
		description: "Display custom text message",
		icon: Type,
	},
];

// --- HELPERS ---
function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- COMPONENT ---
export default function PlaylistPage() {
	const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Load playlist
	useEffect(() => {
		async function loadPlaylist() {
			try {
				const data = await fetchPlaylist();
				setPlaylist(data);
			} catch (error) {
				console.error("Failed to load playlist:", error);
			} finally {
				setIsLoading(false);
			}
		}
		loadPlaylist();
	}, []);

	// Save playlist
	async function savePlaylistToBackend(items: PlaylistItem[]) {
		try {
			await updatePlaylist(items);
		} catch (error) {
			console.error("Failed to save playlist:", error);
		}
	}

	// Add Plugin (Generic)
	async function addPlugin(type: PluginType) {
		let newItem: PlaylistItem;

		switch (type) {
			case "weather":
				newItem = {
					id: generateId(),
					type: "weather",
					title: "Weather",
					subtitle: "Coordinates: Not Set",
					scheduleMode: "cycle",
					config: { location: "", latitude: null, longitude: null },
					lastUpdated: "Just now",
				};
				break;
			case "calendar":
				newItem = {
					id: generateId(),
					type: "calendar",
					title: "Calendar",
					subtitle: "No iCal URL configured",
					scheduleMode: "cycle",
					config: { icalUrl: "" },
					lastUpdated: "Just now",
				};
				break;
			case "custom-text":
				newItem = {
					id: generateId(),
					type: "custom-text",
					title: "Custom Text",
					subtitle: "No message set",
					scheduleMode: "cycle",
					config: { text: "" },
					lastUpdated: "Just now",
				};
				break;
		}

		const updatedPlaylist = [...playlist, newItem];
		setPlaylist(updatedPlaylist);
		await savePlaylistToBackend(updatedPlaylist);
		setIsModalOpen(false);
	}

	// Remove Plugin
	async function removeItem(id: string) {
		const updatedPlaylist = playlist.filter((item) => item.id !== id);
		setPlaylist(updatedPlaylist);
		await savePlaylistToBackend(updatedPlaylist);
	}

	return (
		<>
			{/* ACTION BAR (Replaces buttons previously in Header) */}
			<div className="flex justify-end gap-6 mb-8 pointer-events-none">
				{/* Note: pointer-events-none with auto on children allows buttons to be clickable but lets clicks pass through the spacer */}
				<div className="pointer-events-auto flex gap-6">
					<button className="group flex items-center gap-2 text-xs font-mono tracking-widest hover:text-bright-blue transition-colors">
						[ + ADD GROUP ]
					</button>
					<button
						onClick={() => setIsModalOpen(true)}
						className="group flex items-center gap-2 text-xs font-mono tracking-widest bg-bold-red text-white px-5 py-2 hover:bg-charcoal transition-colors shadow-sm"
					>
						<Plus className="w-3 h-3" />
						ADD PLUGIN
					</button>
				</div>
			</div>

			{/* TIMELINE CONTROLS */}
			<div className="mb-12 pt-4">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
					<div className="flex items-center gap-2">
						<Clock className="w-3 h-3 text-bright-blue" />
						<span className="uppercase tracking-widest font-bold text-bright-blue">Timeline Scope: All Day</span>
					</div>
					{/* Technical Inputs */}
					<div className="flex items-center gap-8 border-b border-light-gray pb-2 md:border-none md:pb-0">
						<div className="flex items-center gap-3 group">
							<label className="text-warm-gray uppercase group-hover:text-bright-blue transition-colors">Start</label>
							<div className="relative">
								<select className="appearance-none bg-transparent border-b border-warm-gray pr-6 py-1 focus:outline-none focus:border-bright-blue cursor-pointer font-medium text-charcoal">
									<option>00:00</option>
								</select>
								<ChevronDown className="w-3 h-3 absolute right-0 top-1/2 -translate-y-1/2 text-warm-gray pointer-events-none" />
							</div>
						</div>
						<span className="text-light-gray hidden md:inline">—</span>
						<div className="flex items-center gap-3 group">
							<label className="text-warm-gray uppercase group-hover:text-bright-blue transition-colors">End</label>
							<div className="relative">
								<select className="appearance-none bg-transparent border-b border-warm-gray pr-6 py-1 focus:outline-none focus:border-bright-blue cursor-pointer font-medium text-charcoal">
									<option>23:45</option>
								</select>
								<ChevronDown className="w-3 h-3 absolute right-0 top-1/2 -translate-y-1/2 text-warm-gray pointer-events-none" />
							</div>
						</div>
						<div className="w-px h-4 bg-light-gray hidden md:block"></div>
						<div className="flex items-center gap-3 group">
							<label className="text-warm-gray uppercase group-hover:text-bright-blue transition-colors">Cycle</label>
							<div className="relative">
								<select className="appearance-none bg-transparent border-b border-warm-gray pr-6 py-1 focus:outline-none focus:border-bright-blue cursor-pointer font-medium text-charcoal">
									<option>15m</option>
								</select>
								<ChevronDown className="w-3 h-3 absolute right-0 top-1/2 -translate-y-1/2 text-warm-gray pointer-events-none" />
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* PLAYLIST GRID */}
			<PlaylistGrid playlist={playlist} isLoading={isLoading} onRemoveItem={removeItem} />

			{/* ADD PLUGIN MODAL */}
			<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Select Plugin">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{PLUGIN_OPTIONS.map((option) => {
						const Icon = option.icon;
						return (
							<button
								key={option.type}
								onClick={() => addPlugin(option.type)}
								className="group w-full bg-pure-white border border-light-gray p-4 text-left hover:border-bright-blue transition-all duration-200 flex items-center gap-4"
							>
								{/* Icon */}
								<div className="flex-shrink-0">
									<div className="inline-flex p-3 bg-off-white border border-light-gray rounded group-hover:border-bright-blue transition-colors">
										<Icon className="w-6 h-6 text-charcoal group-hover:text-bright-blue transition-colors" />
									</div>
								</div>

								{/* Content */}
								<div className="flex-1">
									{/* Title */}
									<h3 className="text-lg text-charcoal mb-1 group-hover:text-bright-blue transition-colors">
										{option.title}
									</h3>

									{/* Description */}
									<p className="font-mono text-xs text-warm-gray uppercase tracking-wider">
										{option.description}
									</p>
								</div>

								{/* Plus indicator */}
								<div className="flex-shrink-0 text-light-gray group-hover:text-bright-blue transition-colors">
									<Plus className="w-5 h-5" />
								</div>
							</button>
						);
					})}
				</div>
			</Modal>
		</>
	);
}
