import { WeatherData, getIpmaIcon } from "@/lib/ipma";
import { Droplets, Wind, Sunrise, Sunset } from "lucide-react";

interface WeeklyViewProps {
	data: WeatherData;
}

export default function WeeklyView({ data }: WeeklyViewProps) {
	// Get day name from date string (e.g., "SAT")
	const getDayName = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
	};

	// Get formatted date (e.g., "29")
	const getDateNum = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.getDate().toString();
	};

	// Get current date for header (e.g., "SAT NOV 29")
	const getCurrentDate = () => {
		const now = new Date();
		const dayName = now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
		const monthName = now.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
		const day = now.getDate();
		return `${dayName} ${monthName} ${day}`;
	};

	// Get current weather icon
	const CurrentIcon = getIpmaIcon(data.today.idWeatherType);

	return (
		<div className="w-[800px] h-[480px] bg-white flex border-2 border-eink-light-gray font-eink-sans">
			{/* LEFT PANEL - Current Weather (35%) */}
			{/* Background is dark-gray, Text is white for best contrast */}
			<div className="w-[35%] bg-eink-dark-gray border-r-2 border-eink-light-gray p-6 flex flex-col justify-between">
				{/* Location Header */}
				<div className="text-center">
					<h1 className="text-base font-bold text-white leading-tight uppercase">{data.location}</h1>
				</div>

				{/* Current Temperature & Icon (Center) */}
				<div className="flex flex-col items-center justify-center -mt-8">
					<div className="text-7xl font-bold text-white leading-none mb-4">
						{Math.round(parseFloat(data.current.temp))}°
					</div>
					<CurrentIcon className="w-24 h-24 text-white" strokeWidth={2} />
				</div>

				{/* Current Conditions (Footer) */}
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Droplets className="w-5 h-5 text-white flex-shrink-0" strokeWidth={2} />
						<span className="text-sm uppercase tracking-wider text-white w-20 flex-shrink-0">HUMIDITY</span>
						<span className="text-base font-bold text-white tabular-nums">{data.current.humidity}%</span>
					</div>
					<div className="flex items-center gap-2">
						<Wind className="w-5 h-5 text-white flex-shrink-0" strokeWidth={2} />
						<span className="text-sm uppercase tracking-wider text-white w-20 flex-shrink-0">WIND</span>
						<span className="text-base font-bold text-white tabular-nums whitespace-nowrap">
							{data.current.windDir} {data.current.windSpeed} km/h
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Sunrise className="w-5 h-5 text-white flex-shrink-0" strokeWidth={2} />
						<span className="text-sm uppercase tracking-wider text-white w-20 flex-shrink-0">SUNRISE</span>
						<span className="text-base font-bold text-white tabular-nums">{data.current.sunrise}</span>
					</div>
					<div className="flex items-center gap-2">
						<Sunset className="w-5 h-5 text-white flex-shrink-0" strokeWidth={2} />
						<span className="text-sm uppercase tracking-wider text-white w-20 flex-shrink-0">SUNSET</span>
						<span className="text-base font-bold text-white tabular-nums">{data.current.sunset}</span>
					</div>
				</div>
			</div>

			{/* RIGHT PANEL - 7-Day Forecast (65%) */}
			<div className="w-[65%] bg-white flex flex-col justify-between">
				{data.daily.slice(1, 8).map((day, index) => {
					const IconComponent = getIpmaIcon(day.idWeatherType);
					const precipProb = parseInt(day.precipitaProb);

					return (
						<div key={index} className="border-b border-eink-light-gray px-6 flex items-center gap-5 flex-1">
							{/* Day & Date */}
							<div className="w-24 flex items-baseline gap-2 tabular-nums">
								<span className="text-lg font-bold text-black">{getDayName(day.forecastDate)}</span>
								<span className="text-base text-black">{getDateNum(day.forecastDate)}</span>
							</div>

							{/* Weather Icon */}
							<div className="flex-shrink-0">
								<IconComponent className="w-9 h-9 text-black" strokeWidth={2.5} />
							</div>

							{/* Precipitation (Only if > 0) */}
							<div className="w-14 text-center">
								{precipProb > 0 && (
									<span className="text-sm font-bold text-black tabular-nums">{day.precipitaProb}%</span>
								)}
							</div>

							{/* Temperature Range */}
							<div className="flex items-center gap-3 flex-1 justify-end">
								{/* Max Temp */}
								<span className="text-xl font-bold text-black tabular-nums w-12 text-right">
									{Math.round(parseFloat(day.tMax))}°
								</span>

								{/* Separator Line */}
								<div className="w-6 h-[3px] bg-eink-dark-gray"></div>

								{/* Min Temp */}
								<span className="text-xl text-black tabular-nums w-12">
									{Math.round(parseFloat(day.tMin))}°
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
