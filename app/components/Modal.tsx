"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
	// Handle ESC key to close modal
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			// Prevent body scroll when modal is open
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
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Modal Content */}
			<div className="relative bg-pure-white border border-light-gray shadow-md w-full max-w-4xl max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-light-gray p-6 flex-shrink-0">
					<h2 className="text-2xl text-charcoal">{title}</h2>
					<button
						onClick={onClose}
						className="text-warm-gray hover:text-charcoal transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className="p-6 overflow-y-auto flex-1">
					{children}
				</div>
			</div>
		</div>
	);
}
