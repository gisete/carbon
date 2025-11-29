import React from "react";
import { Silkscreen } from "next/font/google";

const silkscreen = Silkscreen({
	weight: ["400", "700"],
	subsets: ["latin"],
});

export default function Logo() {
	return (
		<div className="flex flex-col items-start gap-2">
			<div className={`text-[1.75rem] font-bold text-[#111111] leading-none tracking-wider ${silkscreen.className}`}>
				<span className="text-bold-red">C</span>
				<span>ARBON</span>
			</div>
			<div className="text-[0.65rem] tracking-[0.125em] text-medium-gray uppercase font-bold ml-0.5">
				E-Ink // Dashboard
			</div>
		</div>
	);
}
