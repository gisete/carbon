"use client";

import React, { useState, useEffect } from "react";
import { Save, Settings2, MapPin, Globe, Clock, Moon, Sun } from "lucide-react";
import { fetchSettings, updateSettings } from "@/app/actions";

// --- TYPES ---

interface SystemConfig {
	timezone: string;
	refreshInterval: string;
	startTime: string; // Device Wake Time
	endTime: string; // Device Sleep Time
	bitDepth: string; // "1" or "2"
}

// Generate time options in 15-minute intervals
const TIME_OPTIONS = (() => {
	const times: string[] = [];
	for (let hour = 0; hour < 24; hour++) {
		for (let minute = 0; minute < 60; minute += 15) {
			const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
			times.push(timeStr);
		}
	}
	return times;
})();

// --- COMPONENT ---

export default function SettingsPage() {
	const [isLoading, setIsLoading] = useState(true);

	const [systemConfig, setSystemConfig] = useState<SystemConfig>({
		timezone: "Europe/Lisbon",
		refreshInterval: "30",
		startTime: "07:00",
		endTime: "23:00",
		bitDepth: "1",
	});

	// Load settings on mount
	useEffect(() => {
		async function loadSettings() {
			try {
				const settings = await fetchSettings();
				setSystemConfig({
					timezone: settings.system.timezone,
					refreshInterval: settings.system.refreshInterval.toString(),
					startTime: settings.system.startTime || "07:00",
					endTime: settings.system.endTime || "23:00",
					bitDepth: settings.system.bitDepth.toString(),
				});
			} catch (error) {
				console.error("Failed to load settings:", error);
			} finally {
				setIsLoading(false);
			}
		}
		loadSettings();
	}, []);

	const handleSave = async () => {
		try {
			const settings = await fetchSettings();
			await updateSettings({
				weather: settings.weather,
				calendar: settings.calendar,
				system: {
					timezone: systemConfig.timezone,
					refreshInterval: parseInt(systemConfig.refreshInterval),
					startTime: systemConfig.startTime,
					endTime: systemConfig.endTime,
					bitDepth: parseInt(systemConfig.bitDepth) as 1 | 2,
				},
			});
			console.log("Settings saved successfully");
		} catch (error) {
			console.error("Failed to save settings:", error);
		}
	};

	return (
		<>
			{/* NAVIGATION BAR */}
			<div className="flex justify-end items-center mb-8">
				<button
					onClick={handleSave}
					className="group flex items-center gap-2 text-xs font-mono tracking-widest bg-bold-red text-white px-5 py-2 hover:bg-charcoal transition-colors shadow-sm"
				>
					<Save className="w-3 h-3" />
					SAVE SETTINGS
				</button>
			</div>

			{/* SYSTEM SETTINGS FORM */}
			<div className="bg-pure-white border border-[#E7E5E4] p-8">
				<div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E7E5E4]">
					<div className="p-2 bg-off-white border border-[#E7E5E4] rounded">
						<Settings2 className="w-5 h-5 text-bright-blue" />
					</div>
					<div>
						<h2 className="text-3xl text-charcoal leading-none">System Settings</h2>
						<p className="font-mono text-xs text-warm-gray uppercase tracking-wider mt-1">Power & Global Config</p>
					</div>
				</div>

				<div className="space-y-8">
					{/* POWER SCHEDULE SECTION */}
					<div>
						<h3 className="text-sm font-bold text-charcoal mb-4 flex items-center gap-2">
							<Moon className="w-4 h-4 text-warm-gray" />
							DEVICE SLEEP SCHEDULE
						</h3>
						<div className="grid grid-cols-2 gap-6 p-4 bg-off-white border border-[#E7E5E4] rounded-sm">
							<div className="group/field">
								<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
									<Sun className="w-3 h-3" />
									Wake Up Time
								</label>
								<select
									value={systemConfig.startTime}
									onChange={(e) => setSystemConfig({ ...systemConfig, startTime: e.target.value })}
									className="w-full bg-white border-b-2 border-[#E7E5E4] py-2 px-3 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal cursor-pointer"
								>
									{TIME_OPTIONS.map((time) => (
										<option key={time} value={time}>
											{time}
										</option>
									))}
								</select>
							</div>
							<div className="group/field">
								<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
									<Moon className="w-3 h-3" />
									Sleep Time
								</label>
								<select
									value={systemConfig.endTime}
									onChange={(e) => setSystemConfig({ ...systemConfig, endTime: e.target.value })}
									className="w-full bg-white border-b-2 border-[#E7E5E4] py-2 px-3 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal cursor-pointer"
								>
									{TIME_OPTIONS.map((time) => (
										<option key={time} value={time}>
											{time}
										</option>
									))}
								</select>
							</div>
						</div>
						<p className="font-mono text-xs text-warm-gray mt-2 italic">
							Outside these hours, the device will sleep continuously to save battery.
						</p>
					</div>

					{/* GENERAL SETTINGS */}
					<div>
						<h3 className="text-sm font-bold text-charcoal mb-4 flex items-center gap-2">
							<Globe className="w-4 h-4 text-warm-gray" />
							GENERAL
						</h3>
						<div className="space-y-6">
							<div className="group/field">
								<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
									Timezone
								</label>
								<select
									value={systemConfig.timezone}
									onChange={(e) => setSystemConfig({ ...systemConfig, timezone: e.target.value })}
									className="w-full bg-transparent border-b-2 border-[#E7E5E4] py-2 px-1 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal transition-colors cursor-pointer"
								>
									<option value="Europe/Lisbon">Europe/Lisbon</option>
									<option value="Europe/London">Europe/London</option>
									<option value="America/New_York">America/New York</option>
									<option value="America/Los_Angeles">America/Los Angeles</option>
									<option value="Asia/Tokyo">Asia/Tokyo</option>
									<option value="Australia/Sydney">Australia/Sydney</option>
								</select>
							</div>

							<div className="group/field">
								<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
									Default Refresh Interval (min)
								</label>
								<input
									type="number"
									value={systemConfig.refreshInterval}
									onChange={(e) => setSystemConfig({ ...systemConfig, refreshInterval: e.target.value })}
									className="w-full bg-transparent border-b-2 border-[#E7E5E4] py-2 px-1 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal transition-colors"
									min="1"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
