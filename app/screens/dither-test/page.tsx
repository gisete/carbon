export default function DitherTestScreen() {
	const colorBlocks = [
		{ name: "BLACK", bgClass: "bg-black", textClass: "text-white" },
		{ name: "DARK GRAY", bgClass: "bg-dark-gray", textClass: "text-white" },
		{ name: "MID GRAY", bgClass: "bg-mid-gray", textClass: "text-black" },
		{ name: "LIGHT GRAY", bgClass: "bg-eink-light-gray", textClass: "text-black" },
		{ name: "WHITE", bgClass: "bg-white", textClass: "text-black" },
	];

	return (
		<div className="w-[800px] h-[480px] flex">
			{colorBlocks.map((block, index) => (
				<div
					key={index}
					className={`w-[20%] h-full ${block.bgClass} flex items-center justify-center`}
				>
					<p className={`${block.textClass} text-3xl font-bold text-center px-2 leading-tight`}>
						{block.name}
					</p>
				</div>
			))}
		</div>
	);
}
