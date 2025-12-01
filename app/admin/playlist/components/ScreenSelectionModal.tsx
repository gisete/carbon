"use client";

import React from "react";
import { Plus, Cloud, CalendarDays, Type } from "lucide-react";
import Modal from "@/app/components/Modal";

type ScreenType = "weather" | "calendar" | "custom-text";

interface ScreenOption {
	type: ScreenType;
	title: string;
	description: string;
	icon: React.ElementType;
}

interface ScreenSelectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectScreen: (type: ScreenType) => void;
}

const SCREEN_OPTIONS: ScreenOption[] = [
	{
		type: "weather",
		title: "Weather",
		description: "Display current weather conditions",
		icon: Cloud,
	},
	{
		type: "calendar",
		title: "Calendar",
		description: "Show upcoming events from iCal",
		icon: CalendarDays,
	},
	{
		type: "custom-text",
		title: "Custom Text",
		description: "Display custom text message",
		icon: Type,
	},
];

export default function ScreenSelectionModal({ isOpen, onClose, onSelectScreen }: ScreenSelectionModalProps) {
	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Select Screen" subtitle="Choose a screen to add to your playlist">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{SCREEN_OPTIONS.map((option) => {
					const Icon = option.icon;
					return (
						<button
							key={option.type}
							onClick={() => onSelectScreen(option.type)}
							className="group w-full bg-pure-white border border-light-gray p-4 text-left hover:border-bright-blue transition-all duration-200 flex items-center gap-4 cursor-pointer"
						>
							{/* Icon */}
							<div className="flex-shrink-0">
								<div className="inline-flex p-3 bg-off-white border border-light-gray rounded group-hover:border-bright-blue transition-colors">
									<Icon className="w-6 h-6 text-charcoal group-hover:text-bright-blue transition-colors" />
								</div>
							</div>

							{/* Content */}
							<div className="flex-1">
								{/* Title */}
								<h3 className="text-lg text-charcoal mb-1 group-hover:text-bright-blue transition-colors">
									{option.title}
								</h3>

								{/* Description */}
								<p className="font-mono text-xs text-warm-gray uppercase tracking-wider">
									{option.description}
								</p>
							</div>

							{/* Plus indicator */}
							<div className="flex-shrink-0 text-light-gray group-hover:text-bright-blue transition-colors">
								<Plus className="w-5 h-5" />
							</div>
						</button>
					);
				})}
			</div>
		</Modal>
	);
}

export type { ScreenType };
