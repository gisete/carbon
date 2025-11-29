"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutTemplate, MonitorPlay } from "lucide-react";
import { IBM_Plex_Serif, JetBrains_Mono } from "next/font/google";
import Logo from "@/app/components/Logo";
import PageHeader from "@/app/components/PageHeader";

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const isPlaylist = pathname === "/admin/playlist";
	const isScreens = pathname === "/admin/screens";

	return (
		<div className={`min-h-screen bg-off-white text-charcoal p-6 md:p-12 font-sans ${ibmPlexSerif.variable} ${jetBrainsMono.variable}`}>
			{/* OUTER FRAME */}
			<div className="max-w-5xl mx-auto relative min-h-[80vh] border-l border-r border-light-gray bg-off-white md:px-12">
				{/* --- LOGO & NAVIGATION --- */}
				<div className="flex items-center justify-between border-b border-light-gray mb-8 pt-8 pb-4">
					{/* Logo */}
					<Link href="/admin">
						<Logo />
					</Link>

					{/* Navigation Tabs */}
					<div className="flex items-center gap-8">
					{/* Playlist Tab */}
					<Link
						href="/admin/playlist"
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
							Playlist
						</span>
					</Link>

					{/* Screens Tab */}
					<Link
						href="/admin/screens"
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
					</div>
				</div>

				{/* --- PAGE HEADER --- */}
				<PageHeader title={isScreens ? "Screens" : "Playlist"} />

				{/* --- PAGE CONTENT --- */}
				<main>{children}</main>
			</div>
		</div>
	);
}
