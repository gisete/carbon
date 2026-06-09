"use client";

import React from "react";
import { Plus } from "lucide-react";
import Modal from "@/app/components/Modal";
import { SCREENS, type ScreenType } from "@/lib/screens";

interface ScreenSelectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectScreen: (type: ScreenType) => void;
}

export default function ScreenSelectionModal({ isOpen, onClose, onSelectScreen }: ScreenSelectionModalProps) {
	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Select Screen" subtitle="Choose a screen to add to your playlist">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{SCREENS.map((screen) => {
					const Icon = screen.icon;
					return (
						<button
							key={screen.type}
							onClick={() => onSelectScreen(screen.type)}
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
									{screen.title}
								</h3>

								{/* Description */}
								<p className="font-mono text-xs text-warm-gray uppercase tracking-wider">
									{screen.description}
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
