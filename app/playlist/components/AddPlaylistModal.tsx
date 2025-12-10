"use client";

import React, { useState, useEffect, useMemo } from "react";
import Modal from "@/app/components/Modal";
import { ChevronDown, AlertTriangle } from "lucide-react";
import type { Playlist } from "@/lib/playlist";

interface AddPlaylistModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (name: string, isDefault?: boolean, startTime?: string, endTime?: string) => void;
	existingPlaylist?: Playlist; // If provided, we're in edit mode
	allPlaylists: Playlist[]; // All existing playlists for validation
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

// Validation: Check for schedule conflicts
interface ValidationResult {
	isValid: boolean;
	error?: string;
	warningMessage?: string;
}

function validateSchedule(
	isDefault: boolean,
	startTime: string,
	endTime: string,
	allPlaylists: Playlist[],
	currentPlaylistId?: string
): ValidationResult {
	// Rule 2: Default playlists can overlap with anything - no validation needed
	if (isDefault) {
		// Check if there's already a default playlist
		const existingDefault = allPlaylists.find(
			p => p.isDefault && p.id !== currentPlaylistId
		);

		if (existingDefault) {
			return {
				isValid: true,
				warningMessage: `This will replace "${existingDefault.name}" as the default playlist`
			};
		}

		return { isValid: true };
	}

	// Rule 1: Specific playlists cannot overlap with other specific playlists
	// Convert times to minutes for easier comparison
	const [startHour, startMin] = startTime.split(':').map(Number);
	const [endHour, endMin] = endTime.split(':').map(Number);
	const startMinutes = startHour * 60 + startMin;
	const endMinutes = endHour * 60 + endMin;

	// Check against all other specific (non-default) playlists
	for (const playlist of allPlaylists) {
		// Skip default playlists and the current playlist being edited
		if (playlist.isDefault || playlist.id === currentPlaylistId) continue;

		// Check for day overlap (all playlists currently run on all days)
		// If schedules have activeDays, we'd check those here

		// Check for time overlap
		const [pStartHour, pStartMin] = (playlist.schedule.startTime || '00:00').split(':').map(Number);
		const [pEndHour, pEndMin] = (playlist.schedule.endTime || '23:59').split(':').map(Number);
		const pStartMinutes = pStartHour * 60 + pStartMin;
		const pEndMinutes = pEndHour * 60 + pEndMin;

		// Time overlap formula: (StartA < EndB) && (StartB < EndA)
		const hasOverlap = (startMinutes < pEndMinutes) && (pStartMinutes < endMinutes);

		if (hasOverlap) {
			return {
				isValid: false,
				error: `Conflict with "${playlist.name}" (${playlist.schedule.startTime} - ${playlist.schedule.endTime})`
			};
		}
	}

	return { isValid: true };
}

export default function AddPlaylistModal({ isOpen, onClose, onSave, existingPlaylist, allPlaylists }: AddPlaylistModalProps) {
	const [playlistName, setPlaylistName] = useState("");
	const [isDefault, setIsDefault] = useState(false);
	const [startTime, setStartTime] = useState("00:00");
	const [endTime, setEndTime] = useState("23:59");

	const isEditMode = !!existingPlaylist;

	// Real-time validation
	const validation = useMemo(() => {
		return validateSchedule(
			isDefault,
			startTime,
			endTime,
			allPlaylists,
			existingPlaylist?.id
		);
	}, [isDefault, startTime, endTime, allPlaylists, existingPlaylist?.id]);

	useEffect(() => {
		if (isOpen) {
			if (existingPlaylist) {
				// Edit mode - populate with existing data
				setPlaylistName(existingPlaylist.name);
				setIsDefault(existingPlaylist.isDefault);
				setStartTime(existingPlaylist.schedule.startTime || "00:00");
				setEndTime(existingPlaylist.schedule.endTime || "23:59");
			} else {
				// Create mode - reset to defaults
				setPlaylistName("");
				setIsDefault(false);
				setStartTime("00:00");
				setEndTime("23:59");
			}
		}
	}, [isOpen, existingPlaylist]);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (playlistName.trim()) {
			onSave(playlistName.trim(), isDefault, startTime, endTime);
		}
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={isEditMode ? "Edit Playlist" : "Create New Playlist"}
			subtitle={isEditMode ? "Update playlist settings" : "Add a new playlist to your collection"}
		>
			<form onSubmit={handleSubmit}>
				<div className="space-y-8">
					<div>
						<label className="block font-mono text-[10px] tracking-[1.5px] uppercase text-warm-gray mb-3">
							Playlist Name
						</label>
						<input
							type="text"
							value={playlistName}
							onChange={(e) => setPlaylistName(e.target.value)}
							placeholder="e.g., Work Week, Weekend, Home"
							className="w-full px-4 py-3 border border-light-gray bg-off-white text-charcoal placeholder-warm-gray focus:outline-none focus:border-bright-blue focus:bg-white transition-colors"
							autoFocus
						/>
						<p className="mt-2 text-sm text-warm-gray">
							Give your playlist a descriptive name
						</p>
					</div>

					{/* Time Window - Only show if NOT default */}
					{!isDefault && (
						<div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block font-mono text-[10px] tracking-[1.5px] uppercase text-warm-gray mb-3">
										Start Time
									</label>
									<div className="relative">
										<select
											value={startTime}
											onChange={(e) => setStartTime(e.target.value)}
											className={`w-full px-4 py-3 pr-10 border bg-off-white text-charcoal focus:outline-none focus:bg-white transition-colors appearance-none ${
												validation.error ? 'border-bold-red focus:border-bold-red' : 'border-light-gray focus:border-bright-blue'
											}`}
										>
											{TIME_OPTIONS.map(time => (
												<option key={time} value={time}>{time}</option>
											))}
										</select>
										<ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray pointer-events-none" />
									</div>
								</div>
								<div>
									<label className="block font-mono text-[10px] tracking-[1.5px] uppercase text-warm-gray mb-3">
										End Time
									</label>
									<div className="relative">
										<select
											value={endTime}
											onChange={(e) => setEndTime(e.target.value)}
											className={`w-full px-4 py-3 pr-10 border bg-off-white text-charcoal focus:outline-none focus:bg-white transition-colors appearance-none ${
												validation.error ? 'border-bold-red focus:border-bold-red' : 'border-light-gray focus:border-bright-blue'
											}`}
										>
											{TIME_OPTIONS.map(time => (
												<option key={time} value={time}>{time}</option>
											))}
										</select>
										<ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray pointer-events-none" />
									</div>
								</div>
							</div>

							{/* Validation Error */}
							{validation.error && (
								<div className="mt-3 flex items-start gap-2 text-bold-red">
									<AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
									<p className="text-sm font-medium">{validation.error}</p>
								</div>
							)}
						</div>
					)}

					<div>
						<label className="flex items-center gap-3 cursor-pointer group">
							<input
								type="checkbox"
								checked={isDefault}
								onChange={(e) => setIsDefault(e.target.checked)}
								className="w-4 h-4 border border-light-gray bg-off-white text-bright-blue focus:ring-2 focus:ring-bright-blue focus:ring-offset-0 rounded"
							/>
							<span className="text-sm text-charcoal group-hover:text-bright-blue transition-colors">
								Set as Default Playlist
							</span>
						</label>
						<p className="mt-2 ml-7 text-sm text-warm-gray">
							The default playlist runs when no specific playlist matches the current time
						</p>

						{/* Default Warning */}
						{validation.warningMessage && (
							<div className="mt-3 ml-7 flex items-start gap-2 text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded">
								<AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
								<p className="text-sm font-medium">{validation.warningMessage}</p>
							</div>
						)}
					</div>
				</div>

				<div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-light-gray">
					<button
						type="button"
						onClick={onClose}
						className="px-6 py-3 text-sm font-mono tracking-widest text-charcoal hover:bg-off-white transition-colors uppercase cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!playlistName.trim() || !validation.isValid}
						className="px-6 py-3 text-sm font-mono tracking-widest bg-charcoal text-white hover:bg-black transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
					>
						{isEditMode ? "Save Changes" : "Create Playlist"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
