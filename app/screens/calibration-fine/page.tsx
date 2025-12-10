export default function CalibrationFineScreen() {
	const grayShades = [
		{ percent: "45%", hex: "#737373", textColor: "text-white", label: "Safe Dark" },
		{ percent: "50%", hex: "#808080", textColor: "text-white", label: "Test" },
		{ percent: "55%", hex: "#8c8c8c", textColor: "text-white", label: "Test" },
		{ percent: "60%", hex: "#999999", textColor: "text-black", label: "Safe Mid" },
		{ percent: "65%", hex: "#a6a6a6", textColor: "text-black", label: "Test" },
		{ percent: "70%", hex: "#b3b3b3", textColor: "text-black", label: "Test" },
		{ percent: "75%", hex: "#bfbfbf", textColor: "text-black", label: "Test" },
		{ percent: "80%", hex: "#cccccc", textColor: "text-black", label: "Test" },
		{ percent: "85%", hex: "#d9d9d9", textColor: "text-black", label: "Safe Light" },
	];

	return (
		<div className="w-[800px] h-[480px] bg-white flex">
			{grayShades.map((shade, index) => (
				<div
					key={index}
					className="flex-1 h-full flex items-center justify-center"
					style={{ backgroundColor: shade.hex }}
				>
					<p className={`${shade.textColor} text-sm font-bold text-center px-1 leading-tight`}>
						{shade.percent}
						<br />
						{shade.hex}
					</p>
				</div>
			))}
		</div>
	);
}
