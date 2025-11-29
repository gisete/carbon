"use client";

import React from "react";
import { Sun, CalendarDays, Type, GripVertical, SlidersHorizontal, X, Cloud, Eye } from "lucide-react";
import type { PlaylistItem } from "@/lib/playlist";

// --- TYPES ---
type PluginType = "weather" | "calendar" | "custom-text";

interface PlaylistGridProps {
	playlist: PlaylistItem[];
	isLoading: boolean;
	onRemoveItem: (id: string) => void;
}

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

// --- RENDER HELPERS ---
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

// --- COMPONENT ---
export default function PlaylistGrid({ playlist, isLoading, onRemoveItem }: PlaylistGridProps) {
	return (
		<>
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
									isActive ? "border-transparent shadow-sm" : "border-light-gray"
								}`}
							>
								{isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-bold-red"></div>}
								{!isActive && (
									<div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] border-transparent group-hover:border-bright-blue transition-all"></div>
								)}
								<div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-6 pl-6">
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
										<h3 className="text-lg text-charcoal leading-none mb-2 group-hover:text-bright-blue transition-colors">
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
										<button onClick={() => onRemoveItem(item.id)} className="hover:text-bold-red transition-colors">
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
