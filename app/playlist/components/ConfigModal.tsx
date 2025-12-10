"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/components/Modal";
import type { PlaylistItem } from "@/lib/playlist";

interface ConfigModalProps {
	isOpen: boolean;
	item: PlaylistItem | null;
	onClose: () => void;
	onSave: (updatedItem: PlaylistItem) => void;
}

export default function ConfigModal({ isOpen, item, onClose, onSave }: ConfigModalProps) {
	// Local state for form fields
	const [config, setConfig] = useState<Record<string, any>>({});
	const [duration, setDuration] = useState<number>(15);
	const [title, setTitle] = useState<string>("");

	// Initialize config when item changes
	useEffect(() => {
		if (item) {
			setConfig(item.config || {});
			setDuration(item.duration ?? 15);
			setTitle(item.title || "");
		}
	}, [item]);

	if (!item) return null;

	const handleSave = () => {
		// Update subtitle based on config
		let subtitle = item.subtitle;
		if (item.type === "calendar") {
			const viewMode = config.viewMode || "daily";
			subtitle = viewMode.charAt(0).toUpperCase() + viewMode.slice(1);
		} else if (item.type === "weather") {
			const viewMode = config.viewMode || "current";
			subtitle = viewMode === "current" ? "Current Conditions" : "7-Day Forecast";
		} else if (item.type === "custom-text") {
			subtitle = config.text ? "Message configured" : "No message set";
		}

		const updatedItem: PlaylistItem = {
			...item,
			title: title.trim() || item.title, // Use edited title or fallback to original
			config,
			subtitle,
			lastUpdated: "Just now",
			duration,
		};

		onSave(updatedItem);
	};

	const handleCancel = () => {
		// Reset to original config
		setConfig(item.config || {});
		setDuration(item.duration ?? 15);
		setTitle(item.title || "");
		onClose();
	};

	// Determine subtitle based on plugin type
	const getSubtitle = () => {
		switch (item.type) {
			case "calendar":
				return "Configure Calendar Data Source";
			case "weather":
				return "Configure Weather Display";
			case "custom-text":
				return "Configure Custom Message";
			case "logo":
				return "Configure Logo Display";
			default:
				return "Configure Plugin Settings";
		}
	};

	// Check if duration is below recommended minimum
	const isBelowMinimum = duration < 2;

	return (
		<Modal isOpen={isOpen} onClose={handleCancel} title={item.title} subtitle={getSubtitle()}>
			<div className="space-y-8">
				{/* TITLE FIELD (Common to all plugins) */}
				<div>
					<label className="block font-mono text-[10px] tracking-[1.5px] uppercase text-warm-gray mb-3">
						Plugin Name
					</label>
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder={`Enter a custom name (e.g., "Family Calendar")`}
						className="w-full px-4 py-3 border border-light-gray bg-off-white text-charcoal placeholder-warm-gray focus:outline-none focus:border-bright-blue focus:bg-white transition-colors"
					/>
					<p className="mt-2 text-xs text-warm-gray">Custom name for this plugin (optional)</p>
				</div>

				{/* DURATION FIELD (Common to all plugins) */}
				<div>
					<label className="block font-mono text-[10px] tracking-[1.5px] uppercase text-warm-gray mb-3">
						Duration (Minutes)
					</label>
					<input
						type="number"
						min="2"
						value={duration}
						onChange={(e) => setDuration(parseInt(e.target.value) || 2)}
						className={`w-full px-4 py-3 border ${
							isBelowMinimum ? "border-bold-red" : "border-light-gray"
						} bg-off-white text-charcoal focus:outline-none focus:border-bright-blue focus:bg-white transition-colors`}
					/>
					<p className="mt-2 text-xs text-warm-gray">How many minutes this screen stays active before rotating</p>
					{isBelowMinimum && (
						<div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
							<p className="text-sm text-amber-800">
								<strong>⚠️ Minimum 2 minutes recommended.</strong>
								<br />
								The device takes ~30 seconds to wake, fetch, and display content. With shorter durations, the screen
								will be visible for less than half its intended time.
							</p>
						</div>
					)}
				</div>

				{/* CALENDAR CONFIG */}
				{item.type === "calendar" && (
					<>
						<div>
							<label className="block font-mono text-[10px] tracking-[1.5px] uppercase text-warm-gray mb-3">
								iCal URL
							</label>
							<input
								type="text"
								value={config.icalUrl || ""}
								onChange={(e) => setConfig({ ...config, icalUrl: e.target.value })}
								placeholder="https://calendar.example.com/ical/..."
								className="w-full px-4 py-3 border border-light-gray bg-off-white text-charcoal placeholder-warm-gray focus:outline-none focus:border-bright-blue focus:bg-white transition-colors font-mono text-sm"
							/>
							<p className="mt-2 text-xs text-warm-gray">
								Enter your iCal/ICS calendar feed URL (Google Calendar, iCloud, etc.)
							</p>
						</div>

						<div>
							<label className="block font-mono text-[10px] tracking-[1.5px] uppercase text-warm-gray mb-3">
								View Mode
							</label>
							<select
								value={config.viewMode || "daily"}
								onChange={(e) => setConfig({ ...config, viewMode: e.target.value })}
								className="w-full px-4 py-3 border border-light-gray bg-off-white text-charcoal focus:outline-none focus:border-bright-blue focus:bg-white transition-colors"
							>
								<option value="daily">Daily</option>
								<option value="weekly">Weekly</option>
								<option value="monthly">Monthly</option>
							</select>
							<p className="mt-2 text-xs text-warm-gray">Choose how calendar events are displayed</p>
						</div>
					</>
				)}

				{/* WEATHER CONFIG */}
				{item.type === "weather" && (
					<>
						<div>
							<label className="block font-mono text-[10px] tracking-[1.5px] uppercase text-warm-gray mb-3">
								Location
							</label>
							<div className="w-full px-4 py-3 border border-light-gray bg-off-white text-charcoal">
								Caldas da Rainha
							</div>
							<p className="mt-2 text-xs text-warm-gray">Default location (currently fixed)</p>
						</div>

						<div>
							<label className="block font-mono text-[10px] tracking-[1.5px] uppercase text-warm-gray mb-3">
								View Mode
							</label>
							<select
								value={config.viewMode || "current"}
								onChange={(e) => setConfig({ ...config, viewMode: e.target.value })}
								className="w-full px-4 py-3 border border-light-gray bg-off-white text-charcoal focus:outline-none focus:border-bright-blue focus:bg-white transition-colors"
							>
								<option value="current">Current Conditions</option>
								<option value="weekly">7-Day Forecast</option>
							</select>
							<p className="mt-2 text-xs text-warm-gray">Choose how weather information is displayed</p>
						</div>
					</>
				)}

				{/* CUSTOM TEXT CONFIG */}
				{item.type === "custom-text" && (
					<div>
						<label className="block font-mono text-[10px] tracking-[1.5px] uppercase text-warm-gray mb-3">
							Message
						</label>
						<textarea
							value={config.text || ""}
							onChange={(e) => setConfig({ ...config, text: e.target.value })}
							placeholder="Enter your custom message"
							rows={4}
							className="w-full px-4 py-3 border border-light-gray bg-off-white text-charcoal placeholder-warm-gray focus:outline-none focus:border-bright-blue focus:bg-white transition-colors resize-none"
						/>
						<p className="mt-2 text-xs text-warm-gray">Custom text to display on the screen</p>
					</div>
				)}

				{/* LOGO CONFIG */}
				{item.type === "logo" && (
					<div>
						<label className="block font-mono text-[10px] tracking-[1.5px] uppercase text-warm-gray mb-3">
							Font Size (px)
						</label>
						<input
							type="number"
							min="40"
							max="200"
							value={config.fontSize || "120"}
							onChange={(e) => setConfig({ ...config, fontSize: e.target.value })}
							className="w-full px-4 py-3 border border-light-gray bg-off-white text-charcoal focus:outline-none focus:border-bright-blue focus:bg-white transition-colors"
						/>
						<p className="mt-2 text-xs text-warm-gray">Adjust the size of the Carbon logo (40-200px)</p>
					</div>
				)}

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-light-gray">
					<button
						onClick={handleCancel}
						className="px-6 py-3 text-sm font-mono tracking-widest text-charcoal hover:bg-off-white transition-colors uppercase cursor-pointer"
					>
						Cancel
					</button>
					<button
						onClick={handleSave}
						className="px-6 py-3 text-sm font-mono tracking-widest bg-charcoal text-white hover:bg-black transition-colors uppercase cursor-pointer"
					>
						Save Changes
					</button>
				</div>
			</div>
		</Modal>
	);
}
