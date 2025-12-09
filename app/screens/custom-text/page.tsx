interface CustomTextScreenProps {
	searchParams: Promise<{
		text?: string;
	}>;
}

export default async function CustomTextScreen({ searchParams }: CustomTextScreenProps) {
	// Await and parse search params
	const params = await searchParams;
	const text = params.text || "Hello World";

	return (
		<div className="w-[800px] h-[480px] bg-white text-black flex items-center justify-center p-8">
			<div className="text-center">
				<p className="text-6xl font-bold leading-tight break-words">
					{text}
				</p>
			</div>
		</div>
	);
}
