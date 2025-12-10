"use client";

import React, { useMemo } from "react";
import { ChevronDown, Edit2, Trash2 } from "lucide-react";
import type { Playlist } from "@/lib/playlist";

interface PlaylistHeaderProps {
	playlist: Playlist;
	isActive?: boolean;
	onScheduleChange: (startTime: string, endTime: string) => void;
	onEdit: () => void;
	onDelete: () => void;
}

// Generate time options in 15-minute intervals - memoized to prevent hydration issues
const TIME_OPTIONS = (() => {
	const times: string[] = [];
	for (let hour = 0; hour < 24; hour++) {
		for (let minute = 0; minute < 60; minute += 15) {
			const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
			times.push(timeStr);
		}
	}
	return times;
})();

export default function PlaylistHeader({ playlist, isActive, onScheduleChange, onEdit, onDelete }: PlaylistHeaderProps) {
	return (
		<div className="flex items-center justify-between pb-4 border-b-2 border-charcoal/10">
			{/* LEFT: Playlist Name + Badges */}
			<div className="flex items-center gap-3">
				<h2 className="text-lg font-mono font-bold text-black tracking-wide">
					{playlist.name}
				</h2>
				{playlist.isDefault && (
					<span className="inline-flex items-center px-3 py-1 text-sm font-mono tracking-widest uppercase border border-bold-red text-bold-red bg-transparent rounded-full">
						Default
					</span>
				)}
				{isActive && (
					<span className="inline-flex items-center px-3 py-1 text-sm font-mono tracking-widest uppercase border border-green-600 text-green-600 bg-transparent rounded-full">
						Active
					</span>
				)}
			</div>

			{/* RIGHT: Schedule Controls + Edit/Delete Icons */}
			<div className="flex items-center gap-6">
				{/* Schedule Controls */}
				{playlist.isDefault ? (
					/* Default Playlist: Show "ALL DAY" text */
					<div className="flex items-center gap-3 font-mono text-sm border-l border-light-gray pl-6">
						<span className="text-warm-gray uppercase tracking-wider">
							ALL DAY
						</span>
					</div>
				) : (
					/* Non-Default Playlists: Show time pickers */
					<div className="flex items-center gap-6 font-mono text-sm border-l border-light-gray pl-6">
						<div className="flex items-center gap-3 group">
							<label className="text-warm-gray uppercase group-hover:text-bright-blue transition-colors">Start</label>
							<div className="relative">
								<select
									value={playlist.schedule.startTime}
									onChange={(e) => onScheduleChange(e.target.value, playlist.schedule.endTime)}
									className="appearance-none bg-transparent border-b border-warm-gray pr-6 py-1 focus:outline-none focus:border-bright-blue cursor-pointer font-medium text-charcoal"
								>
									{TIME_OPTIONS.map(time => (
										<option key={time} value={time}>{time}</option>
									))}
								</select>
								<ChevronDown className="w-3 h-3 absolute right-0 top-1/2 -translate-y-1/2 text-warm-gray pointer-events-none" />
							</div>
						</div>
						<span className="text-light-gray">—</span>
						<div className="flex items-center gap-3 group">
							<label className="text-warm-gray uppercase group-hover:text-bright-blue transition-colors">End</label>
							<div className="relative">
								<select
									value={playlist.schedule.endTime}
									onChange={(e) => onScheduleChange(playlist.schedule.startTime, e.target.value)}
									className="appearance-none bg-transparent border-b border-warm-gray pr-6 py-1 focus:outline-none focus:border-bright-blue cursor-pointer font-medium text-charcoal"
								>
									{TIME_OPTIONS.map(time => (
										<option key={time} value={time}>{time}</option>
									))}
								</select>
								<ChevronDown className="w-3 h-3 absolute right-0 top-1/2 -translate-y-1/2 text-warm-gray pointer-events-none" />
							</div>
						</div>
					</div>
				)}

				{/* Edit/Delete Icons */}
				<div className="flex items-center gap-3 border-l border-light-gray pl-6">
					<button
						onClick={onEdit}
						className="p-2 text-warm-gray hover:text-bright-blue transition-colors cursor-pointer"
						title="Edit playlist"
					>
						<Edit2 className="w-4 h-4" />
					</button>
					<button
						onClick={onDelete}
						className="p-2 text-warm-gray hover:text-bold-red transition-colors cursor-pointer"
						title="Delete playlist"
					>
						<Trash2 className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
