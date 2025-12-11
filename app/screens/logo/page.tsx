import { Silkscreen } from "next/font/google";

const silkscreen = Silkscreen({
	weight: ["400", "700"],
	subsets: ["latin"],
});

interface LogoScreenProps {
	searchParams: Promise<{
		fontSize?: string;
	}>;
}

export default async function LogoScreen({ searchParams }: LogoScreenProps) {
	// Await and parse search params
	const params = await searchParams;
	const fontSize = params.fontSize || "120";

	// Calculate subtitle size (proportional to main logo)
	const subtitleSize = Math.floor(parseInt(fontSize) * 0.23);

	return (
		<div className="w-[800px] h-[480px] bg-white text-black flex items-center justify-center">
			<div className="flex flex-col items-center gap-4">
				<div
					className={`font-bold text-black leading-none tracking-wider ${silkscreen.className}`}
					style={{ fontSize: `${fontSize}px` }}
				>
					<span className="text-eink-dark-gray">C</span>
					<span>ARBON</span>
				</div>
				<div
					className="tracking-[0.125em] text-eink-dark-gray uppercase font-bold"
					style={{ fontSize: `${subtitleSize}px` }}
				>
					E-Ink // Dashboard
				</div>
			</div>
		</div>
	);
}
