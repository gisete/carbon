import React from "react";

interface PageHeaderProps {
	title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
	return (
		<header className="mb-8">
			<div className="flex flex-col md:flex-row justify-between items-end pb-6">
				<div className="w-full">
					<div className="flex justify-between items-end w-full">
						<h1 className="text-4xl font-serif font-light tracking-tight text-charcoal">
							{title}
							<span className="text-bold-red">.</span>
						</h1>
					</div>
				</div>
			</div>
		</header>
	);
}
