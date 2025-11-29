"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/components/Modal";
import type { PlaylistItem } from "@/lib/playlist";
import { X } from "lucide-react";

interface ConfigModalProps {
	isOpen: boolean;
	item: PlaylistItem | null;
	onClose: () => void;
	onSave: (updatedItem: PlaylistItem) => void;
}

export default function ConfigModal({ isOpen, item, onClose, onSave }: ConfigModalProps) {
	// Local state for form fields
	const [config, setConfig] = useState<Record<string, any>>({});

	// Initialize config when item changes
	useEffect(() => {
		if (item) {
			console.log("ConfigModal - Item changed:", item);
			console.log("ConfigModal - Setting config to:", item.config);
			setConfig(item.config || {});
		}
	}, [item]);

	if (!item) return null;

	const handleSave = () => {
		// Update subtitle based on config
		let subtitle = item.subtitle;
		if (item.type === "calendar") {
			subtitle = config.icalUrl ? "iCal URL configured" : "No iCal URL configured";
		} else if (item.type === "weather") {
			subtitle = config.location ? `Location: ${config.location}` : "No location set";
		} else if (item.type === "custom-text") {
			subtitle = config.text ? "Message configured" : "No message set";
		}

		const updatedItem: PlaylistItem = {
			...item,
			config,
			subtitle,
			lastUpdated: "Just now",
		};

		console.log("Saving config:", updatedItem);
		onSave(updatedItem);
	};

	const handleCancel = () => {
		// Reset to original config
		setConfig(item.config || {});
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={handleCancel} title="">
			<div className="flex flex-col h-full">
				{/* Custom Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-light-gray flex-shrink-0">
					<h2 className="text-2xl font-bold text-charcoal">{item.title}</h2>
					<button
						onClick={handleCancel}
						className="p-2 hover:bg-off-white transition-colors rounded"
						aria-label="Close"
					>
						<X className="w-5 h-5 text-charcoal" />
					</button>
				</div>

				{/* Body - Dynamic Fields */}
				<div className="flex-1 px-6 py-6 overflow-y-auto">
					<div className="space-y-6">
						{/* CALENDAR CONFIG */}
						{item.type === "calendar" && (
							<>
								<div>
									<label className="block text-sm font-bold text-charcoal mb-2 uppercase tracking-wide">
										iCal URL
									</label>
									<input
										type="text"
										value={config.icalUrl || ""}
										onChange={(e) => setConfig({ ...config, icalUrl: e.target.value })}
										placeholder="https://calendar.example.com/ical/..."
										className="w-full px-4 py-3 border border-light-gray bg-white text-charcoal placeholder-warm-gray focus:outline-none focus:border-bright-blue transition-colors font-mono text-sm"
									/>
									<p className="mt-2 text-xs text-warm-gray">
										Enter your iCal/ICS calendar feed URL (Google Calendar, iCloud, etc.)
									</p>
								</div>

								<div>
									<label className="block text-sm font-bold text-charcoal mb-2 uppercase tracking-wide">
										View Mode
									</label>
									<select
										value={config.viewMode || "daily"}
										onChange={(e) => setConfig({ ...config, viewMode: e.target.value })}
										className="w-full px-4 py-3 border border-light-gray bg-white text-charcoal focus:outline-none focus:border-bright-blue transition-colors"
									>
										<option value="daily">Daily</option>
										<option value="weekly">Weekly</option>
										<option value="monthly">Monthly</option>
									</select>
									<p className="mt-2 text-xs text-warm-gray">
										Choose how calendar events are displayed
									</p>
								</div>
							</>
						)}

						{/* WEATHER CONFIG */}
						{item.type === "weather" && (
							<>
								<div>
									<label className="block text-sm font-bold text-charcoal mb-2 uppercase tracking-wide">
										Location
									</label>
									<input
										type="text"
										value={config.location || ""}
										onChange={(e) => setConfig({ ...config, location: e.target.value })}
										placeholder="Enter city name"
										className="w-full px-4 py-3 border border-light-gray bg-white text-charcoal placeholder-warm-gray focus:outline-none focus:border-bright-blue transition-colors"
									/>
									<p className="mt-2 text-xs text-warm-gray">City or location for weather data</p>
								</div>

								<div>
									<label className="flex items-center justify-between cursor-pointer">
										<div>
											<span className="block text-sm font-bold text-charcoal uppercase tracking-wide">
												Show Hourly Forecast
											</span>
											<p className="mt-1 text-xs text-warm-gray">
												Display hourly weather instead of daily
											</p>
										</div>
										<div className="relative">
											<input
												type="checkbox"
												checked={config.showHourly || false}
												onChange={(e) =>
													setConfig({ ...config, showHourly: e.target.checked })
												}
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bright-blue"></div>
										</div>
									</label>
								</div>
							</>
						)}

						{/* CUSTOM TEXT CONFIG */}
						{item.type === "custom-text" && (
							<div>
								<label className="block text-sm font-bold text-charcoal mb-2 uppercase tracking-wide">
									Message
								</label>
								<textarea
									value={config.text || ""}
									onChange={(e) => setConfig({ ...config, text: e.target.value })}
									placeholder="Enter your custom message"
									rows={4}
									className="w-full px-4 py-3 border border-light-gray bg-white text-charcoal placeholder-warm-gray focus:outline-none focus:border-bright-blue transition-colors resize-none"
								/>
								<p className="mt-2 text-xs text-warm-gray">
									Custom text to display on the screen
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-light-gray flex-shrink-0">
					<button
						onClick={handleCancel}
						className="px-6 py-2 text-sm font-mono tracking-widest text-charcoal hover:bg-off-white transition-colors uppercase"
					>
						Cancel
					</button>
					<button
						onClick={handleSave}
						className="px-6 py-2 text-sm font-mono tracking-widest bg-charcoal text-white hover:bg-black transition-colors uppercase"
					>
						Save
					</button>
				</div>
			</div>
		</Modal>
	);
}
