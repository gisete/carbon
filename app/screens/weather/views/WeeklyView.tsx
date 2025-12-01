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
		<div className="w-[800px] h-[480px] bg-white flex border-4 border-black font-sans">
			{/* LEFT PANEL - Current Weather (35%) */}
			<div className="w-[35%] bg-neutral-100 p-6 flex flex-col justify-between">
				{/* Date Header */}
				<div className="text-center">
					<h1 className="text-sm font-bold text-black leading-tight">
						{getCurrentDate()}
					</h1>
				</div>

				{/* Current Temperature & Icon (Center) */}
				<div className="flex flex-col items-center justify-center -mt-8">
					<div className="text-7xl font-bold text-black leading-none mb-4">
						{Math.round(parseFloat(data.current.temp))}°
					</div>
					<CurrentIcon className="w-24 h-24 text-black" strokeWidth={1.5} />
				</div>

				{/* Current Conditions (Footer) */}
				<div className="space-y-2">
					<div className="flex items-center gap-3">
						<Droplets className="w-4 h-4 text-gray-500" strokeWidth={2} />
						<span className="text-xs uppercase tracking-widest text-gray-500 w-20">
							HUMIDITY
						</span>
						<span className="text-sm font-bold text-black tabular-nums">
							{data.current.humidity}%
						</span>
					</div>
					<div className="flex items-center gap-3">
						<Wind className="w-4 h-4 text-gray-500" strokeWidth={2} />
						<span className="text-xs uppercase tracking-widest text-gray-500 w-20">
							WIND
						</span>
						<span className="text-sm font-bold text-black tabular-nums">
							{data.current.windDir} {data.current.windSpeed} km/h
						</span>
					</div>
					<div className="flex items-center gap-3">
						<Sunrise className="w-4 h-4 text-gray-500" strokeWidth={2} />
						<span className="text-xs uppercase tracking-widest text-gray-500 w-20">
							SUNRISE
						</span>
						<span className="text-sm font-bold text-black tabular-nums">
							{data.current.sunrise}
						</span>
					</div>
					<div className="flex items-center gap-3">
						<Sunset className="w-4 h-4 text-gray-500" strokeWidth={2} />
						<span className="text-xs uppercase tracking-widest text-gray-500 w-20">
							SUNSET
						</span>
						<span className="text-sm font-bold text-black tabular-nums">
							{data.current.sunset}
						</span>
					</div>
				</div>
			</div>

			{/* RIGHT PANEL - 7-Day Forecast (65%) */}
			<div className="w-[65%] bg-white flex flex-col">
				{/* Header */}
				<div className="border-b-2 border-black px-6 py-2 flex justify-end items-center">
					<p className="text-sm font-bold text-black">
						{data.location}
					</p>
				</div>

				{/* Forecast List */}
				<div className="flex-1">
					{data.daily.slice(1, 8).map((day, index) => {
						const IconComponent = getIpmaIcon(day.idWeatherType);
						const precipProb = parseInt(day.precipitaProb);

						return (
							<div
								key={index}
								className="border-b border-gray-200 px-6 py-4 flex items-center gap-5"
							>
								{/* Day & Date */}
								<div className="w-24 flex items-baseline gap-2 tabular-nums">
									<span className="text-base font-bold text-black">
										{getDayName(day.forecastDate)}
									</span>
									<span className="text-sm text-gray-500">
										{getDateNum(day.forecastDate)}
									</span>
								</div>

								{/* Weather Icon */}
								<div className="flex-shrink-0">
									<IconComponent className="w-7 h-7 text-black" strokeWidth={2} />
								</div>

								{/* Precipitation (Only if > 0) */}
								<div className="w-14 text-center">
									{precipProb > 0 && (
										<span className="text-sm font-bold text-gray-500 tabular-nums">
											{day.precipitaProb}%
										</span>
									)}
								</div>

								{/* Temperature Range */}
								<div className="flex items-center gap-3 flex-1 justify-end">
									{/* Min Temp */}
									<span className="text-base text-gray-500 tabular-nums w-10 text-right">
										{Math.round(parseFloat(day.tMin))}°
									</span>

									{/* Visual Bar */}
									<div className="w-20 h-1.5 bg-gray-200 rounded-full relative overflow-hidden">
										<div
											className="absolute inset-y-0 left-0 bg-gray-500 rounded-full"
											style={{ width: '70%' }}
										/>
									</div>

									{/* Max Temp */}
									<span className="text-base font-bold text-black tabular-nums w-10">
										{Math.round(parseFloat(day.tMax))}°
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
