"use client";

import React, { useState, useEffect } from "react";
import { Clock, Play, List, Calendar, Cloud, Type, Moon } from "lucide-react";
import { getActivePlaylistItems, tickDirector } from "@/app/actions";
import type { PlaylistItem } from "@/lib/playlist";
import type { DirectorStatus } from "@/lib/director";

function getPluginIcon(type: string) {
	switch (type) {
		case "weather":
			return Cloud;
		case "calendar":
			return Calendar;
		case "custom-text":
			return Type;
		default:
			return Play;
	}
}

function buildScreenUrl(item: PlaylistItem): string {
	const baseUrl = `${window.location.origin}/screens`;
	switch (item.type) {
		case "weather":
			const weatherView = item.config?.viewMode || "current";
			return `${baseUrl}/weather?view=${weatherView}`;
		case "calendar":
			const calendarView = item.config?.viewMode || "daily";
			return `${baseUrl}/calendar?view=${calendarView}`;
		case "custom-text":
			return `${baseUrl}/custom-text?text=${encodeURIComponent(item.config?.text || "")}`;
		default:
			return baseUrl;
	}
}

export default function SimulatorPage() {
	const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
	const [directorStatus, setDirectorStatus] = useState<DirectorStatus | null>(null);
	const [currentTime, setCurrentTime] = useState(new Date());
	const [nextSwitchIn, setNextSwitchIn] = useState<number>(0);

	useEffect(() => {
		async function pollDirector() {
			try {
				const status = await tickDirector();
				setDirectorStatus(status);
				const items = await getActivePlaylistItems();
				setPlaylist(items);
			} catch (error) {
				console.error("Failed to poll director:", error);
			}
		}
		pollDirector();
		const interval = setInterval(pollDirector, 5000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(new Date());
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		const interval = setInterval(() => {
			if (!directorStatus || directorStatus.isSleeping) {
				setNextSwitchIn(0);
				return;
			}
			const now = Date.now();
			const remaining = Math.max(0, Math.floor((directorStatus.nextSwitchTime - now) / 1000));
			setNextSwitchIn(remaining);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		if (!directorStatus || directorStatus.isSleeping) {
			setNextSwitchIn(0);
			return;
		}
		const now = Date.now();
		const remaining = Math.max(0, Math.floor((directorStatus.nextSwitchTime - now) / 1000));
		setNextSwitchIn(remaining);
	}, [directorStatus]);

	const activeItem = directorStatus?.currentItem;
	const activeUrl = activeItem ? buildScreenUrl(activeItem) : "";
	const displayCountdown = nextSwitchIn;
	const isSleeping = directorStatus?.isSleeping;

	return (
		<div className="min-h-screen bg-neutral-900 p-8">
			<div className="max-w-[1600px] mx-auto">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-white mb-2">Device Simulator</h1>
					<p className="text-gray-400">Test playlist rotation and scheduling logic</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-[800px_1fr] gap-8">
					{/* LEFT: Device Screen */}
					<div>
						<div className="bg-neutral-800 p-6 rounded-lg">
							<div className="flex items-center gap-3 mb-4">
								<div className={`w-3 h-3 rounded-full ${isSleeping ? "bg-amber-500" : "bg-green-500"}`}></div>
								<span className="text-sm font-mono text-gray-400">
									{isSleeping ? "DEVICE SLEEPING (NIGHT MODE)" : "DEVICE ACTIVE"}
								</span>
							</div>

							<div className="border-4 border-black bg-white relative" style={{ width: "800px", height: "480px" }}>
								{isSleeping ? (
									<div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 text-neutral-400">
										<Moon className="w-16 h-16 mb-4 text-neutral-300" />
										<p className="text-2xl font-bold">Sleeping...</p>
										<p className="text-sm font-mono mt-2">Power Saving Mode Active</p>
									</div>
								) : activeUrl ? (
									<iframe key={activeItem?.id} src={activeUrl} className="w-full h-full" style={{ border: "none" }} />
								) : (
									<div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
										No active item
									</div>
								)}
							</div>
						</div>
					</div>

					{/* RIGHT: Debug Info */}
					<div className="space-y-6">
						<div className="bg-neutral-800 p-6 rounded-lg">
							<div className="flex items-center gap-2 mb-4">
								<Clock className="w-4 h-4 text-blue-500" />
								<h3 className="text-sm font-bold text-white uppercase tracking-wider">System Clock</h3>
							</div>
							<div className="text-4xl font-mono font-bold text-white">
								{currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
							</div>
							<div className="text-sm text-gray-400 mt-2">
								{currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
							</div>
						</div>

						<div className="bg-neutral-800 p-6 rounded-lg">
							<div className="flex items-center gap-2 mb-4">
								<Play className="w-4 h-4 text-green-500" />
								<h3 className="text-sm font-bold text-white uppercase tracking-wider">Status</h3>
							</div>
							<div className="flex items-center gap-3">
								<div className={`w-3 h-3 rounded-full ${isSleeping ? "bg-amber-500" : "bg-blue-500"}`}></div>
								<span className="text-white font-medium">
									{isSleeping ? "Night Mode (Zero Refresh)" : "Standard Cycle"}
								</span>
							</div>
						</div>

						{!isSleeping && (
							<div className="bg-neutral-800 p-6 rounded-lg">
								<div className="flex items-center gap-2 mb-4">
									<Clock className="w-4 h-4 text-purple-500" />
									<h3 className="text-sm font-bold text-white uppercase tracking-wider">Next Switch</h3>
								</div>
								<div className="text-3xl font-mono font-bold text-white">
									{Math.floor(displayCountdown / 60)}:{String(displayCountdown % 60).padStart(2, "0")}
								</div>
								<div className="text-sm text-gray-400 mt-2">minutes:seconds remaining</div>
							</div>
						)}

						<div className="bg-neutral-800 p-6 rounded-lg">
							<div className="flex items-center gap-2 mb-4">
								<List className="w-4 h-4 text-pink-500" />
								<h3 className="text-sm font-bold text-white uppercase tracking-wider">Playlist Queue</h3>
							</div>
							<div className="space-y-2">
								{playlist.length === 0 ? (
									<div className="text-gray-500 text-sm">No items in active playlist</div>
								) : (
									playlist.map((item) => {
										const Icon = getPluginIcon(item.type);
										const isActive = item.id === activeItem?.id;

										return (
											<div
												key={item.id}
												className={`p-3 rounded border-2 transition-colors ${
													isActive && !isSleeping
														? "bg-blue-500/20 border-blue-500"
														: "bg-neutral-700/50 border-neutral-600"
												}`}
											>
												<div className="flex items-center gap-3">
													<Icon className={`w-5 h-5 ${isActive && !isSleeping ? "text-blue-400" : "text-gray-400"}`} />
													<div className="flex-1">
														<div className={`font-medium ${isActive && !isSleeping ? "text-white" : "text-gray-300"}`}>
															{item.title}
														</div>
														<div className="text-xs text-gray-500">Duration: {item.duration || 5} min</div>
													</div>
													{isActive && !isSleeping && (
														<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
													)}
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
