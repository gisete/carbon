"use client";

import React, { useState, useEffect } from "react";
import { Save, Cloud, CalendarDays, Settings2, MapPin, Globe, Clock, ArrowLeft, Moon, Sun } from "lucide-react";
import { usePlugin } from "@/app/contexts/PluginContext";
import { fetchSettings, updateSettings } from "@/app/actions";

// --- TYPES ---

type PluginType = "weather" | "calendar" | null;

interface WeatherConfig {
	locationName: string;
	latitude: string;
	longitude: string;
}

interface CalendarConfig {
	icalUrl: string;
}


interface PluginCard {
	id: PluginType;
	title: string;
	description: string;
	icon: React.ElementType;
	color: string;
}

// --- PLUGIN DEFINITIONS ---

const PLUGINS: PluginCard[] = [
	{
		id: "weather",
		title: "Weather",
		description: "Configure location & units",
		icon: Cloud,
		color: "text-bright-blue",
	},
	{
		id: "calendar",
		title: "Calendar",
		description: "iCal URL & display settings",
		icon: CalendarDays,
		color: "text-bright-blue",
	},
];

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

export default function ScreensConfig() {
	const { selectedPlugin, setSelectedPlugin } = usePlugin();
	const [isLoading, setIsLoading] = useState(true);

	const [weatherConfig, setWeatherConfig] = useState<WeatherConfig>({
		locationName: "",
		latitude: "",
		longitude: "",
	});

	const [calendarConfig, setCalendarConfig] = useState<CalendarConfig>({
		icalUrl: "",
	});

	// Load settings on mount
	useEffect(() => {
		async function loadSettings() {
			try {
				const settings = await fetchSettings();
				setWeatherConfig({
					locationName: settings.weather.location,
					latitude: settings.weather.latitude.toString(),
					longitude: settings.weather.longitude.toString(),
				});
				setCalendarConfig({
					icalUrl: settings.calendar.icalUrl,
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
				weather: {
					location: weatherConfig.locationName,
					latitude: parseFloat(weatherConfig.latitude),
					longitude: parseFloat(weatherConfig.longitude),
				},
				calendar: {
					icalUrl: calendarConfig.icalUrl,
				},
				system: settings.system,
			});
			console.log("Settings saved successfully");
			setSelectedPlugin(null);
		} catch (error) {
			console.error("Failed to save settings:", error);
		}
	};

	const handleBack = () => {
		setSelectedPlugin(null);
	};

	// --- GRID VIEW ---
	if (!selectedPlugin) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{PLUGINS.map((plugin) => {
					const Icon = plugin.icon;
					return (
						<button
							key={plugin.id}
							onClick={() => setSelectedPlugin(plugin.id)}
							className="group bg-pure-white border border-[#E7E5E4] p-8 text-left hover:border-bright-blue transition-all duration-200"
						>
							{/* Icon */}
							<div className="mb-6">
								<div className="inline-flex p-3 bg-off-white border border-[#E7E5E4] rounded group-hover:border-bright-blue transition-colors">
									<Icon className={`w-8 h-8 ${plugin.color}`} />
								</div>
							</div>

							{/* Title */}
							<h3 className="text-3xl text-charcoal mb-2 leading-none">{plugin.title}</h3>

							{/* Description */}
							<p className="font-mono text-xs text-warm-gray uppercase tracking-wider">{plugin.description}</p>
						</button>
					);
				})}
			</div>
		);
	}

	// --- DETAIL VIEW ---
	return (
		<>
			{/* NAVIGATION BAR */}
			<div className="flex justify-between items-center mb-8">
				<button
					onClick={handleBack}
					className="group flex items-center gap-2 text-xs font-mono tracking-widest text-charcoal hover:text-bright-blue transition-colors"
				>
					<ArrowLeft className="w-3 h-3" />
					BACK TO PLUGINS
				</button>

				<button
					onClick={handleSave}
					className="group flex items-center gap-2 text-xs font-mono tracking-widest bg-bold-red text-white px-5 py-2 hover:bg-charcoal transition-colors shadow-sm"
				>
					<Save className="w-3 h-3" />
					SAVE CONFIG
				</button>
			</div>

			{/* WEATHER PLUGIN FORM */}
			{selectedPlugin === "weather" && (
				<div className="bg-pure-white border border-[#E7E5E4] p-8">
					<div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E7E5E4]">
						<div className="p-2 bg-off-white border border-[#E7E5E4] rounded">
							<Cloud className="w-5 h-5 text-bright-blue" />
						</div>
						<div>
							<h2 className="text-3xl text-charcoal leading-none">Weather Plugin</h2>
							<p className="font-mono text-xs text-warm-gray uppercase tracking-wider mt-1">Location Configuration</p>
						</div>
					</div>
					<div className="space-y-6">
						<div className="group/field">
							<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
								<MapPin className="w-3 h-3" />
								Location Name
							</label>
							<input
								type="text"
								value={weatherConfig.locationName}
								onChange={(e) => setWeatherConfig({ ...weatherConfig, locationName: e.target.value })}
								className="w-full bg-transparent border-b-2 border-[#E7E5E4] py-2 px-1 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal transition-colors"
								placeholder="e.g., Caldas da Rainha"
							/>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="group/field">
								<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
									<Globe className="w-3 h-3" />
									Latitude
								</label>
								<input
									type="text"
									value={weatherConfig.latitude}
									onChange={(e) => setWeatherConfig({ ...weatherConfig, latitude: e.target.value })}
									className="w-full bg-transparent border-b-2 border-[#E7E5E4] py-2 px-1 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal transition-colors"
								/>
							</div>
							<div className="group/field">
								<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
									<Globe className="w-3 h-3" />
									Longitude
								</label>
								<input
									type="text"
									value={weatherConfig.longitude}
									onChange={(e) => setWeatherConfig({ ...weatherConfig, longitude: e.target.value })}
									className="w-full bg-transparent border-b-2 border-[#E7E5E4] py-2 px-1 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal transition-colors"
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* CALENDAR PLUGIN FORM */}
			{selectedPlugin === "calendar" && (
				<div className="bg-pure-white border border-[#E7E5E4] p-8">
					<div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E7E5E4]">
						<div className="p-2 bg-off-white border border-[#E7E5E4] rounded">
							<CalendarDays className="w-5 h-5 text-bright-blue" />
						</div>
						<div>
							<h2 className="text-3xl text-charcoal leading-none">Calendar Plugin</h2>
							<p className="font-mono text-xs text-warm-gray uppercase tracking-wider mt-1">iCal Integration</p>
						</div>
					</div>
					<div className="space-y-6">
						<div className="group/field">
							<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-gray mb-2 group-hover/field:text-bright-blue transition-colors">
								<Globe className="w-3 h-3" />
								iCal URL
							</label>
							<input
								type="url"
								value={calendarConfig.icalUrl}
								onChange={(e) => setCalendarConfig({ ...calendarConfig, icalUrl: e.target.value })}
								className="w-full bg-transparent border-b-2 border-[#E7E5E4] py-2 px-1 focus:outline-none focus:border-bright-blue font-mono text-sm text-charcoal transition-colors"
							/>
						</div>
					</div>
				</div>
			)}

		</>
	);
}
