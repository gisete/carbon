"use client";

import React from "react";
import { Plus } from "lucide-react";

interface AddScreenButtonProps {
	onClick: () => void;
}

export default function AddScreenButton({ onClick }: AddScreenButtonProps) {
	return (
		<div className="flex justify-end pt-6">
			<button
				onClick={onClick}
				className="group flex items-center gap-2 text-sm font-mono tracking-widest bg-bold-red text-white px-5 py-2 hover:bg-charcoal transition-colors shadow-sm cursor-pointer"
			>
				<Plus className="w-3 h-3" />
				ADD SCREEN
			</button>
		</div>
	);
}
