export default function CalibrationScreen() {
	const calibratedColors = [
		{ name: "BLACK", hex: "#000000", textColor: "text-white", desc: "Pure Black" },
		{ name: "DARK GRAY", hex: "#737373", textColor: "text-white", desc: "45% Best Dark Texture" },
		{ name: "MID GRAY", hex: "#999999", textColor: "text-black", desc: "60% Best Mid Texture" },
		{ name: "LIGHT GRAY", hex: "#d9d9d9", textColor: "text-black", desc: "85% Best Light Texture" },
	];

	return (
		<div className="w-[800px] h-[480px] bg-white flex flex-col">
			{/* Color Swatches Row */}
			<div className="h-[240px] flex">
				{calibratedColors.map((color, index) => (
					<div
						key={index}
						className="flex-1 flex flex-col items-center justify-center gap-4"
						style={{ backgroundColor: color.hex }}
					>
						<p className={`${color.textColor} text-3xl font-bold text-center px-2 leading-tight`}>
							{color.name}
						</p>
						<p className={`${color.textColor} text-xs text-center px-2 opacity-75`}>
							{color.hex}
							<br />
							{color.desc}
						</p>
					</div>
				))}
			</div>

			{/* Text Preview Row - Large white text on dark gray background */}
			<div className="flex-1 bg-eink-dark-gray flex items-center justify-center px-8">
				<p className="text-white text-5xl font-bold text-center leading-tight">
					The quick brown fox jumps over the lazy dog
				</p>
			</div>
		</div>
	);
}
