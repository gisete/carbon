"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { SCREENS, type ScreenType } from "@/lib/screens";
import { buildScreenUrl } from "@/lib/screen-url";
import type { PlaylistItem } from "@/lib/playlist";

function mockItemForPreview(type: ScreenType): PlaylistItem {
	const screen = SCREENS.find((s) => s.type === type)!;
	return {
		id: '',
		type,
		title: screen.title,
		subtitle: screen.defaultSubtitle,
		lastUpdated: '',
		duration: screen.defaultDuration,
		config: screen.defaultConfig,
	};
}

export default function ScreensPage() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{SCREENS.map((screen) => {
				const Icon = screen.icon;
				return (
					<button
						key={screen.type}
						onClick={() => {
							const url = buildScreenUrl(mockItemForPreview(screen.type), `${window.location.origin}/screens`);
							window.open(url, '_blank');
						}}
						className="group bg-pure-white border border-[#E7E5E4] p-8 text-left hover:border-bright-blue transition-all duration-200 cursor-pointer"
					>
						{/* Icon */}
						<div className="mb-6">
							<div className="inline-flex p-3 bg-off-white border border-[#E7E5E4] rounded group-hover:border-bright-blue transition-colors">
								<Icon className="w-8 h-8 text-charcoal group-hover:text-bright-blue transition-colors" />
							</div>
						</div>

						{/* Title */}
						<h3 className="text-3xl text-charcoal mb-2 leading-none group-hover:text-bright-blue transition-colors">
							{screen.title}
						</h3>

						{/* Description */}
						<p className="font-mono text-xs text-warm-gray uppercase tracking-wider">{screen.description}</p>

						{/* Preview link hint */}
						<div className="mt-4 flex items-center gap-1.5 font-mono text-xs text-warm-gray group-hover:text-bright-blue transition-colors">
							<ExternalLink className="w-3 h-3" />
							<span>PREVIEW</span>
						</div>
					</button>
				);
			})}
		</div>
	);
}
