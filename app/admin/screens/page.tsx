"use client";

import React, { useState } from "react";
import { Save, Cloud, CalendarDays, Settings, MapPin, Globe, Clock } from "lucide-react";

// --- TYPES ---

interface WeatherConfig {
	locationName: string;
	latitude: string;
	longitude: string;
}

interface CalendarConfig {
	icalUrl: string;
}

interface SystemConfig {
	timezone: string;
	refreshInterval: string;
}

// --- COMPONENT ---

export default function ScreensConfig() {
	const [weatherConfig, setWeatherConfig] = useState<WeatherConfig>({
		locationName: "Caldas da Rainha",
		latitude: "39.4062",
		longitude: "-9.1364",
	});

	const [calendarConfig, setCalendarConfig] = useState<CalendarConfig>({
		icalUrl: "",
	});

	const [systemConfig, setSystemConfig] = useState<SystemConfig>({
		timezone: "Europe/Lisbon",
		refreshInterval: "30",
	});

	const handleSave = () => {
		console.log("Saving configuration:", {
			weather: weatherConfig,
			calendar: calendarConfig,
			system: systemConfig,
		});
		// TODO: Wire up to backend
	};

	return (
		<>
			{/* ACTION BAR (Matching playlist page style) */}
			<div className="flex justify-end gap-6 mb-8 -mt-20 pointer-events-none">
				<div className="pointer-events-auto flex gap-6">
					<button
						onClick={handleSave}
						className="group flex items-center gap-2 text-xs font-mono tracking-widest bg-bold-red text-white px-5 py-2 hover:bg-charcoal transition-colors shadow-sm"
					>
						<Save className="w-3 h-3" />
						SAVE CONFIG
					</button>
				</div>
			</div>

			{/* CONFIGURATION CARDS */}
				<div className="space-y-6">
					{/* WEATHER CONFIGURATION */}
					<div className="bg-pure-white border border-light-gray p-8 group">
						{/* Card Header */}
						<div className="flex items-center gap-3 mb-6 pb-4 border-b border-light-gray">
							<div className="p-2 bg-off-white border border-light-gray rounded">
								<Cloud className="w-5 h-5 text-bright-blue" />
							</div>
							<div>
								<h2 className="font-serif text-3xl text-charcoal leading-none">Weather Plugin</h2>
								<p className="font-mono text-xs text-warm-gray uppercase tracking-wider mt-1">
									Location Configuration
								</p>
							</div>
						</div>

						{/* Form Fields */}
						<div className="space-y-6">
							{/* Location Name */}
							<div className="group/field">
								<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
									<MapPin className="w-3 h-3" />
									Location Name
								</label>
								<input
									type="text"
									value={weatherConfig.locationName}
									onChange={(e) => setWeatherConfig({ ...weatherConfig, locationName: e.target.value })}
									className="w-full bg-transparent border-b-2 border-light-gray py-2 px-1 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal transition-colors"
									placeholder="e.g., Caldas da Rainha"
								/>
							</div>

							{/* Coordinates Grid */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Latitude */}
								<div className="group/field">
									<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
										<Globe className="w-3 h-3" />
										Latitude
									</label>
									<input
										type="text"
										value={weatherConfig.latitude}
										onChange={(e) => setWeatherConfig({ ...weatherConfig, latitude: e.target.value })}
										className="w-full bg-transparent border-b-2 border-light-gray py-2 px-1 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal transition-colors"
										placeholder="e.g., 39.4062"
									/>
								</div>

								{/* Longitude */}
								<div className="group/field">
									<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
										<Globe className="w-3 h-3" />
										Longitude
									</label>
									<input
										type="text"
										value={weatherConfig.longitude}
										onChange={(e) => setWeatherConfig({ ...weatherConfig, longitude: e.target.value })}
										className="w-full bg-transparent border-b-2 border-light-gray py-2 px-1 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal transition-colors"
										placeholder="e.g., -9.1364"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* CALENDAR CONFIGURATION */}
					<div className="bg-pure-white border border-light-gray p-8 group">
						{/* Card Header */}
						<div className="flex items-center gap-3 mb-6 pb-4 border-b border-light-gray">
							<div className="p-2 bg-off-white border border-light-gray rounded">
								<CalendarDays className="w-5 h-5 text-bright-blue" />
							</div>
							<div>
								<h2 className="font-serif text-3xl text-charcoal leading-none">Calendar Plugin</h2>
								<p className="font-mono text-xs text-warm-gray uppercase tracking-wider mt-1">
									iCal Integration
								</p>
							</div>
						</div>

						{/* Form Fields */}
						<div className="space-y-6">
							{/* iCal URL */}
							<div className="group/field">
								<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
									<Globe className="w-3 h-3" />
									iCal URL
								</label>
								<input
									type="url"
									value={calendarConfig.icalUrl}
									onChange={(e) => setCalendarConfig({ ...calendarConfig, icalUrl: e.target.value })}
									className="w-full bg-transparent border-b-2 border-light-gray py-2 px-1 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal transition-colors"
									placeholder="https://calendar.google.com/calendar/ical/..."
								/>
								<p className="font-mono text-xs text-warm-gray mt-2 italic">
									Supports Google Calendar, Apple Calendar, or any standard iCal feed
								</p>
							</div>
						</div>
					</div>

					{/* SYSTEM CONFIGURATION */}
					<div className="bg-pure-white border border-light-gray p-8 group">
						{/* Card Header */}
						<div className="flex items-center gap-3 mb-6 pb-4 border-b border-light-gray">
							<div className="p-2 bg-off-white border border-light-gray rounded">
								<Settings className="w-5 h-5 text-bright-blue" />
							</div>
							<div>
								<h2 className="font-serif text-3xl text-charcoal leading-none">System Settings</h2>
								<p className="font-mono text-xs text-warm-gray uppercase tracking-wider mt-1">
									Global Configuration
								</p>
							</div>
						</div>

						{/* Form Fields */}
						<div className="space-y-6">
							{/* Timezone */}
							<div className="group/field">
								<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
									<Globe className="w-3 h-3" />
									Timezone
								</label>
								<select
									value={systemConfig.timezone}
									onChange={(e) => setSystemConfig({ ...systemConfig, timezone: e.target.value })}
									className="w-full bg-transparent border-b-2 border-light-gray py-2 px-1 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal transition-colors cursor-pointer"
								>
									<option value="Europe/Lisbon">Europe/Lisbon</option>
									<option value="Europe/London">Europe/London</option>
									<option value="America/New_York">America/New York</option>
									<option value="America/Los_Angeles">America/Los Angeles</option>
									<option value="Asia/Tokyo">Asia/Tokyo</option>
									<option value="Australia/Sydney">Australia/Sydney</option>
								</select>
							</div>

							{/* Refresh Interval */}
							<div className="group/field">
								<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
									<Clock className="w-3 h-3" />
									Refresh Interval (minutes)
								</label>
								<input
									type="number"
									value={systemConfig.refreshInterval}
									onChange={(e) => setSystemConfig({ ...systemConfig, refreshInterval: e.target.value })}
									className="w-full bg-transparent border-b-2 border-light-gray py-2 px-1 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal transition-colors"
									placeholder="30"
									min="1"
									max="1440"
								/>
								<p className="font-mono text-xs text-warm-gray mt-2 italic">
									How often the e-ink display refreshes (1-1440 minutes)
								</p>
							</div>
						</div>
					</div>
				</div>
		</>
	);
}
