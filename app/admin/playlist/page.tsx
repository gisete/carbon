"use client";

import React, { useState, useEffect } from "react";
import {
	Sun,
	CalendarDays,
	Type,
	Plus,
	Clock,
	ChevronDown,
	GripVertical,
	SlidersHorizontal,
	X,
	Cloud,
	Eye,
} from "lucide-react";
import { fetchPlaylist, updatePlaylist } from "@/app/actions";
import type { PlaylistItem } from "@/lib/playlist";

// --- TYPES ---
type PluginType = "weather" | "calendar" | "custom-text";

// --- HELPERS ---
function isItemActive(item: PlaylistItem): boolean {
	if (item.scheduleMode !== "fixed-time" || !item.startTime || !item.endTime) {
		return false;
	}
	const now = new Date();
	const currentTime = now.getHours() * 60 + now.getMinutes();
	const [startHour, startMin] = item.startTime.split(":").map(Number);
	const [endHour, endMin] = item.endTime.split(":").map(Number);
	const startTimeInMinutes = startHour * 60 + startMin;
	const endTimeInMinutes = endHour * 60 + endMin;
	return currentTime >= startTimeInMinutes && currentTime <= endTimeInMinutes;
}

function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- COMPONENT ---
export default function PlaylistPage() {
	const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);

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

	// Add Plugin
	async function addWeatherPlugin() {
		const newItem: PlaylistItem = {
			id: generateId(),
			type: "weather",
			title: "Weather",
			subtitle: "Coordinates: Not Set",
			scheduleMode: "cycle",
			config: { location: "", latitude: null, longitude: null },
			lastUpdated: "Just now",
		};
		const updatedPlaylist = [...playlist, newItem];
		setPlaylist(updatedPlaylist);
		await savePlaylistToBackend(updatedPlaylist);
	}

	// Remove Plugin
	async function removeItem(id: string) {
		const updatedPlaylist = playlist.filter((item) => item.id !== id);
		setPlaylist(updatedPlaylist);
		await savePlaylistToBackend(updatedPlaylist);
	}

	// Render Helpers
	const renderPluginIcon = (type: PluginType, colorClass: string) => {
		switch (type) {
			case "weather":
				return <Sun className={`w-5 h-5 ${colorClass} stroke-1`} />;
			case "calendar":
				return <CalendarDays className={`w-5 h-5 ${colorClass} stroke-1`} />;
			case "custom-text":
				return <Type className={`w-5 h-5 ${colorClass} stroke-1`} />;
			default:
				return <Sun className={`w-5 h-5 ${colorClass} stroke-1`} />;
		}
	};

	const renderPreview = (type: PluginType, groupHoverClass: string) => {
		if (type === "weather") {
			return (
				<div className="flex flex-col items-center gap-1">
					<Cloud className={`w-3 h-3 text-warm-gray ${groupHoverClass}`} />
					<div className={`w-6 h-px bg-warm-gray ${groupHoverClass.replace("text-", "bg-")}`}></div>
				</div>
			);
		}
		if (type === "calendar") {
			return (
				<div className="absolute inset-0 flex gap-0.5 justify-center py-2 px-1">
					{[...Array(4)].map((_, i) => (
						<div
							key={i}
							className={`w-px h-full bg-light-gray ${groupHoverClass.replace("text-bright-blue", "bg-bright-blue/20")}`}
						></div>
					))}
				</div>
			);
		}
		return <span className="font-serif italic text-[8px] text-warm-gray">Hello World</span>;
	};

	return (
		<>
			{/* ACTION BAR (Replaces buttons previously in Header) */}
			<div className="flex justify-end gap-6 mb-8 -mt-20 pointer-events-none">
				{/* Note: pointer-events-none with auto on children allows buttons to be clickable but lets clicks pass through the spacer */}
				<div className="pointer-events-auto flex gap-6">
					<button className="group flex items-center gap-2 text-xs font-mono tracking-widest hover:text-bright-blue transition-colors">
						[ + ADD GROUP ]
					</button>
					<button
						onClick={addWeatherPlugin}
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

			{/* LIST HEADER */}
			<div className="grid grid-cols-12 gap-4 border-b border-charcoal/10 pb-2 mb-4 font-mono text-xs text-warm-gray uppercase tracking-widest px-4">
				<div className="col-span-1"></div>
				<div className="col-span-1">No.</div>
				<div className="col-span-1">Type</div>
				<div className="col-span-2">Preview</div>
				<div className="col-span-4">Description</div>
				<div className="col-span-2">Status</div>
				<div className="col-span-1 text-right">Settings</div>
			</div>

			{/* LIST CONTAINER */}
			<div className="flex flex-col space-y-3">
				{isLoading ? (
					<div className="text-center py-12 font-mono text-sm text-warm-gray">Loading playlist...</div>
				) : playlist.length === 0 ? (
					<div className="text-center py-12 font-mono text-sm text-warm-gray">
						No plugins yet. Click "ADD PLUGIN" to get started.
					</div>
				) : (
					playlist.map((item, index) => {
						const isActive = isItemActive(item);
						return (
							<div
								key={item.id}
								className={`group relative bg-pure-white border ${
									isActive
										? "border-transparent shadow-sm"
										: "border-light-gray"
								}`}
							>
								{isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-bold-red"></div>}
								{!isActive && (
									<div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] border-transparent group-hover:border-bright-blue transition-all"></div>
								)}
								<div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 pl-6">
									<div className="col-span-1">
										<button className="cursor-grab hover:text-bright-blue text-warm-gray transition-colors flex items-center justify-center p-1">
											<GripVertical className="w-5 h-5 stroke-1" />
										</button>
									</div>
									<div
										className={`col-span-1 font-mono text-xl font-bold ${
											isActive ? "text-bold-red" : "text-warm-gray group-hover:text-bright-blue transition-colors"
										}`}
									>
										{String(index + 1).padStart(2, "0")}
									</div>
									<div className="col-span-1">
										{renderPluginIcon(
											item.type,
											isActive ? "text-bold-red" : "text-charcoal group-hover:text-bright-blue transition-colors"
										)}
									</div>
									<div className="col-span-2">
										<div className="w-20 h-12 border border-light-gray group-hover:border-bright-blue/30 flex items-center justify-center bg-off-white relative overflow-hidden">
											{renderPreview(item.type, isActive ? "text-bold-red" : "group-hover:text-bright-blue")}
										</div>
									</div>
									<div className="col-span-4">
										<h3 className="font-serif text-2xl text-charcoal leading-none mb-1 group-hover:text-bright-blue transition-colors">
											{item.title}
										</h3>
										<p className="font-mono text-xs text-warm-gray uppercase tracking-wider">{item.subtitle}</p>
									</div>
									<div className="col-span-2">
										{isActive ? (
											<div className="flex items-center gap-2 px-3 py-1 w-fit bg-bold-red/5 border border-bold-red/20 rounded-full">
												<div className="w-1.5 h-1.5 bg-bold-red rounded-full animate-pulse"></div>
												<span className="font-mono text-xs uppercase text-bold-red font-bold">Broadcasting</span>
											</div>
										) : (
											<span className="font-mono text-xs text-warm-gray border-b border-warm-gray pb-0.5">
												Updated {item.lastUpdated}
											</span>
										)}
									</div>
									<div className="col-span-1 flex justify-end gap-3 text-warm-gray">
										<button className="hover:text-bright-blue transition-colors">
											<SlidersHorizontal className="w-4 h-4 stroke-1" />
										</button>
										{isActive && (
											<button className="hover:text-bright-blue transition-colors">
												<Eye className="w-4 h-4 stroke-1" />
											</button>
										)}
										<button onClick={() => removeItem(item.id)} className="hover:text-bold-red transition-colors">
											<X className="w-4 h-4 stroke-1" />
										</button>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>
		</>
	);
}
