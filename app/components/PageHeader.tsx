import React from "react";

interface PageHeaderProps {
	title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
	return (
		<header className="pb-6">
			<h1 className="text-2xl font-light tracking-tight text-charcoal">
				{title}
			</h1>
		</header>
	);
}
