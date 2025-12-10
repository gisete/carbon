"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutTemplate, MonitorPlay, Settings } from "lucide-react";
import { IBM_Plex_Sans, IBM_Plex_Serif, JetBrains_Mono } from "next/font/google";
import Logo from "@/app/components/Logo";
import PageHeader from "@/app/components/PageHeader";
import { PluginProvider, usePlugin } from "./contexts/PluginContext";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
	weight: ["300", "400", "600"],
	subsets: ["latin"],
	variable: "--font-sans",
});

const ibmPlexSerif = IBM_Plex_Serif({
	weight: ["300", "400", "600"],
	style: ["normal", "italic"],
	subsets: ["latin"],
	variable: "--font-serif",
});

const jetBrainsMono = JetBrains_Mono({
	weight: ["300", "400", "500"],
	subsets: ["latin"],
	variable: "--font-mono",
});

function LayoutContent({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	// Skip layout for screen routes (e-ink display pages) and simulator
	if (pathname.startsWith("/screens/") || pathname === "/simulator") {
		return <>{children}</>;
	}

	const isPlaylist = pathname === "/playlist";
	const isScreens = pathname === "/screens";
	const isSettings = pathname === "/settings";
	const { selectedPlugin } = usePlugin();

	// Determine page title based on context
	const getPageTitle = () => {
		if (isPlaylist) return "Playlists";
		if (isScreens) {
			if (selectedPlugin === 'weather') return "Weather";
			if (selectedPlugin === 'calendar') return "Calendar";
			return "Screens";
		}
		if (isSettings) return "Settings";
		return "";
	};

	return (
		<div className={`min-h-screen bg-off-white text-charcoal p-6 md:p-12 font-sans ${ibmPlexSans.variable} ${ibmPlexSerif.variable} ${jetBrainsMono.variable}`}>
			{/* OUTER FRAME */}
			<div className="max-w-5xl mx-auto relative min-h-[80vh] border-l border-r border-light-gray bg-off-white md:px-12">
				{/* --- LOGO & NAVIGATION --- */}
				<div className="flex items-center justify-between border-b border-light-gray mb-8 pt-8 pb-4">
					{/* Logo */}
					<Link href="/">
						<Logo />
					</Link>

					{/* Navigation Tabs */}
					<div className="flex items-center gap-8">
					{/* Playlists Tab */}
					<Link
						href="/playlist"
						className={`flex items-center gap-3 pb-4 border-b-2 -mb-[1px] transition-all group ${
							isPlaylist ? "border-bold-red" : "border-transparent hover:border-bright-blue"
						}`}
					>
						<LayoutTemplate
							className={`w-4 h-4 ${isPlaylist ? "text-bold-red" : "text-warm-gray group-hover:text-bright-blue"}`}
						/>
						<span
							className={`font-mono text-xs font-bold tracking-[0.2em] uppercase ${
								isPlaylist ? "text-charcoal" : "text-warm-gray group-hover:text-bright-blue"
							}`}
						>
							Playlists
						</span>
					</Link>

					{/* Screens Tab */}
					<Link
						href="/screens"
						className={`flex items-center gap-3 pb-4 border-b-2 -mb-[1px] transition-all group ${
							isScreens ? "border-bold-red" : "border-transparent hover:border-bright-blue"
						}`}
					>
						<MonitorPlay
							className={`w-4 h-4 ${isScreens ? "text-bold-red" : "text-warm-gray group-hover:text-bright-blue"}`}
						/>
						<span
							className={`font-mono text-xs font-bold tracking-[0.2em] uppercase ${
								isScreens ? "text-charcoal" : "text-warm-gray group-hover:text-bright-blue"
							}`}
						>
							Screens
						</span>
					</Link>

					{/* Settings Tab */}
					<Link
						href="/settings"
						className={`flex items-center gap-3 pb-4 border-b-2 -mb-[1px] transition-all group ${
							isSettings ? "border-bold-red" : "border-transparent hover:border-bright-blue"
						}`}
					>
						<Settings
							className={`w-4 h-4 ${isSettings ? "text-bold-red" : "text-warm-gray group-hover:text-bright-blue"}`}
						/>
						<span
							className={`font-mono text-xs font-bold tracking-[0.2em] uppercase ${
								isSettings ? "text-charcoal" : "text-warm-gray group-hover:text-bright-blue"
							}`}
						>
							Settings
						</span>
					</Link>
					</div>
				</div>

				{/* --- CONTENT AREA --- */}
				<div className="pt-8">
					{/* PAGE HEADER */}
					{!selectedPlugin && <PageHeader title={getPageTitle()} />}

					{/* PAGE CONTENT */}
					<main>{children}</main>
				</div>
			</div>
		</div>
	);
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className="antialiased">
				<PluginProvider>
					<LayoutContent>{children}</LayoutContent>
				</PluginProvider>
			</body>
		</html>
	);
}
