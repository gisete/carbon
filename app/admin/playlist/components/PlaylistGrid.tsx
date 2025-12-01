"use client";

import React, { useState } from "react";
import { Sun, CalendarDays, Type, GripVertical, SlidersHorizontal, X, Cloud, Eye, EyeOff } from "lucide-react";
import type { PlaylistItem } from "@/lib/playlist";

// --- TYPES ---
type ScreenType = "weather" | "calendar" | "custom-text";

interface PlaylistGridProps {
	playlist: PlaylistItem[];
	isLoading: boolean;
	activeItemId: string | null;
	onRemoveItem: (id: string) => void;
	onEditItem: (item: PlaylistItem) => void;
	onReorder: (reorderedItems: PlaylistItem[]) => void;
	onToggleVisibility: (id: string) => void;
}

// --- RENDER HELPERS ---
const renderScreenIcon = (type: ScreenType, colorClass: string) => {
	switch (type) {
		case "weather":
			return <Sun className={`w-6 h-6 ${colorClass} stroke-1`} />;
		case "calendar":
			return <CalendarDays className={`w-6 h-6 ${colorClass} stroke-1`} />;
		case "custom-text":
			return <Type className={`w-6 h-6 ${colorClass} stroke-1`} />;
		default:
			return <Sun className={`w-6 h-6 ${colorClass} stroke-1`} />;
	}
};

const renderPreview = (type: ScreenType, groupHoverClass: string) => {
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
export default function PlaylistGrid({ playlist, isLoading, activeItemId, onRemoveItem, onEditItem, onReorder, onToggleVisibility }: PlaylistGridProps) {
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

	const handleDragStart = (index: number) => {
		setDraggedIndex(index);
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		setDragOverIndex(index);
	};

	const handleDrop = (e: React.DragEvent, dropIndex: number) => {
		e.preventDefault();

		if (draggedIndex === null || draggedIndex === dropIndex) {
			setDraggedIndex(null);
			setDragOverIndex(null);
			return;
		}

		const newPlaylist = [...playlist];
		const draggedItem = newPlaylist[draggedIndex];

		// Remove from old position
		newPlaylist.splice(draggedIndex, 1);
		// Insert at new position
		newPlaylist.splice(dropIndex, 0, draggedItem);

		onReorder(newPlaylist);
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	const handleDragEnd = () => {
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	return (
		<>
			{/* LIST CONTAINER */}
			<div className="flex flex-col border-t border-l border-r border-light-gray">
				{isLoading ? (
					<div className="text-center py-12 font-mono text-sm text-warm-gray border-b border-light-gray">Loading playlist...</div>
				) : playlist.length === 0 ? (
					<div className="text-center py-12 font-mono text-sm text-warm-gray border-b border-light-gray">
						No screens yet. Click "ADD SCREEN" to get started.
					</div>
				) : (
					playlist.map((item, index) => {
						const isActive = item.id === activeItemId;
						const isDragging = draggedIndex === index;
						const isDragOver = dragOverIndex === index;
						return (
							<div
								key={item.id}
								draggable
								onDragStart={() => handleDragStart(index)}
								onDragOver={(e) => handleDragOver(e, index)}
								onDrop={(e) => handleDrop(e, index)}
								onDragEnd={handleDragEnd}
								className={`group relative bg-pure-white border-b border-light-gray ${
									isActive ? "shadow-sm" : ""
								} ${isDragging ? "opacity-50" : ""} ${isDragOver && draggedIndex !== index ? "border-t-2 border-t-bright-blue" : ""} transition-opacity`}
							>
								{isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-bold-red"></div>}
								{!isActive && (
									<div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] border-transparent group-hover:border-bright-blue transition-all"></div>
								)}
								<div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-6 pl-6">
									<div className="col-span-1">
										<div className={`${isDragging ? "cursor-grabbing" : "cursor-grab"} hover:text-bright-blue text-warm-gray transition-colors flex items-center justify-center p-1`}>
											<GripVertical className="w-6 h-6 stroke-1" />
										</div>
									</div>
									<div
										className={`col-span-1 font-mono text-xl font-bold ${
											isActive ? "text-bold-red" : "text-warm-gray group-hover:text-bright-blue transition-colors"
										}`}
									>
										{String(index + 1).padStart(2, "0")}
									</div>
									<div className="col-span-1">
										{renderScreenIcon(
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
										<p className="font-mono text-sm text-warm-gray uppercase tracking-wider">{item.subtitle}</p>
									</div>
									<div className="col-span-2">
										{isActive && (
											<div className="flex items-center gap-2 px-3 py-1 w-fit bg-warm-gray/5 border border-green-500 rounded-full">
												<div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
												<span className="font-mono text-sm uppercase text-green-500">Active</span>
											</div>
										)}
									</div>
									<div className="col-span-1 flex justify-end gap-3 text-warm-gray">
										<button
											onClick={() => onEditItem(item)}
											className="hover:text-bright-blue transition-colors cursor-pointer"
											aria-label="Edit settings"
										>
											<SlidersHorizontal className="w-5 h-5 stroke-1" />
										</button>
										<button
											onClick={() => onToggleVisibility(item.id)}
											className="hover:text-bright-blue transition-colors cursor-pointer"
											aria-label={item.visible === false ? "Show item" : "Hide item"}
										>
											{item.visible === false ? (
												<EyeOff className="w-5 h-5 stroke-1" />
											) : (
												<Eye className="w-5 h-5 stroke-1" />
											)}
										</button>
										<button
											onClick={() => onRemoveItem(item.id)}
											className="hover:text-bold-red transition-colors cursor-pointer"
											aria-label="Remove item"
										>
											<X className="w-5 h-5 stroke-1" />
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
