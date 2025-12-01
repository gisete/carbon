"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, subtitle, children }: ModalProps) {
	// Handle ESC key to close modal
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "unset";
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop - White with blur for Carbon aesthetic */}
			<div
				className="absolute inset-0 bg-white/85 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Modal Content */}
			<div className="relative bg-white border border-light-gray w-full max-h-[90vh] overflow-hidden" style={{ maxWidth: "672px", boxShadow: "0 15px 50px rgba(0,0,0,0.1)" }}>
				{/* Header */}
				<div className="flex items-start justify-between pt-8 px-10 pb-6 border-b border-light-gray">
					<div>
						<h2 className="text-2xl font-normal text-charcoal">{title}</h2>
						{subtitle && (
							<span className="block font-mono text-warm-gray text-[11px] tracking-wider mt-2 uppercase">
								{subtitle}
							</span>
						)}
					</div>
					<button
						onClick={onClose}
						className="text-2xl text-warm-gray hover:text-bold-red transition-colors leading-none -mt-1 cursor-pointer"
					>
						×
					</button>
				</div>

				{/* Body */}
				<div className="px-10 py-8 overflow-y-auto" style={{ maxHeight: "calc(90vh - 140px)" }}>
					{children}
				</div>
			</div>
		</div>
	);
}
