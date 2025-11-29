import { WeatherData, getIpmaIcon } from "@/lib/ipma";
import { MapPin, Droplets, Thermometer, Wind, Sunrise, Moon, Sunset } from "lucide-react";

interface CurrentViewProps {
	data: WeatherData;
}

// Helper to format timestamps relative to "Now"
const formatHourlyLabel = (dateStr: string, index: number) => {
	if (index === 0) return "Now";
	const date = new Date(dateStr);
	const hours = date.getHours();
	const ampm = hours >= 12 ? "PM" : "AM";
	const h = hours % 12 || 12;
	return `${h} ${ampm}`;
};

export default function CurrentView({ data }: CurrentViewProps) {
	// Resolve Icons based on real IDs
	const CurrentIcon = getIpmaIcon(Number(data.today.idWeatherType));

	// Format Date for Header
	const headerDate = new Date().toLocaleDateString("en-US", {
		weekday: "long",
		month: "short",
		day: "numeric",
	});

	return (
		<div className="w-[800px] h-[480px] bg-white text-black font-sans relative flex flex-col overflow-hidden select-none">
			{/* --- Header --- */}
			<header className="h-[60px] flex justify-between items-center px-6 border-b-2 border-black shrink-0">
				<div className="flex items-center gap-3">
					<MapPin className="w-5 h-5 stroke-black stroke-2" />
					<h1 className="text-xl font-medium uppercase tracking-wider">{data.location}</h1>
				</div>
				<div className="text-xl font-black tracking-tight">{headerDate}</div>
			</header>

			{/* --- Main Section --- */}
			<div className="flex-1 flex flex-row">
				{/* Col 1: Main Icon (25%) */}
				<div className="w-[25%] flex items-center justify-center">
					<CurrentIcon className="w-40 h-40 stroke-black stroke-[2.5]" />
				</div>

				{/* Col 2: Big Temp & Sun Times (40%) */}
				<div className="w-[40%] flex flex-col items-center justify-center border-x-[3px] border-dotted border-black relative">
					<div className="text-[160px] leading-[0.8] font-bold tracking-tighter indent-[-10px]">
						{Math.round(Number(data.current.temp))}°
					</div>

					<div className="flex items-center justify-between w-full px-10 mt-8">
						<div className="flex items-center gap-2">
							<Sunrise className="w-6 h-6 stroke-2" />
							<span className="text-lg font-bold">{data.current.sunrise}</span>
						</div>
						<div className="flex items-center gap-2">
							<Sunset className="w-6 h-6 stroke-2" />
							<span className="text-lg font-bold">{data.current.sunset}</span>
						</div>
					</div>
				</div>

				{/* Col 3: Details List (35%) */}
				<div className="w-[35%] flex flex-col justify-center px-10 gap-8">
					{/* Feels Like (Using IPMA tMed as proxy) */}
					<div>
						<div className="flex items-center gap-3 mb-1">
							<Thermometer className="w-6 h-6 stroke-[2.5]" />
							<span className="text-3xl font-black tracking-tight">{Math.round(Number(data.current.feelsLike))}°</span>
						</div>
						<div className="text-xs font-bold uppercase tracking-[0.15em] pl-9 text-gray-600">Feels Like</div>
					</div>

					{/* Humidity (Dynamic!) */}
					<div>
						<div className="flex items-center gap-3 mb-1">
							<Droplets className="w-6 h-6 fill-black stroke-black" />
							<span className="text-3xl font-black tracking-tight">{Math.round(Number(data.current.humidity))}%</span>
						</div>
						<div className="text-xs font-bold uppercase tracking-[0.15em] pl-9 text-gray-600">Humidity</div>
					</div>

					{/* Wind */}
					<div>
						<div className="flex items-center gap-3 mb-1">
							<Wind className="w-6 h-6 stroke-[2.5]" />
							<span className="text-2xl font-black tracking-tight uppercase">
								{data.current.windDir} {data.current.windSpeed}
							</span>
						</div>
						<div className="text-xs font-bold uppercase tracking-[0.15em] pl-9 text-gray-600">Current Wind</div>
					</div>
				</div>
			</div>

			{/* --- Hourly Forecast Section (Real Data) --- */}
			<div className="h-[140px] border-t-[3px] border-dotted border-black p-4 flex flex-col justify-between shrink-0">
				<h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2 ml-2">Hourly Forecast</h3>

				<div className="flex justify-between items-end px-2 pb-1">
					{data.hourly.map((hour, idx) => {
						const HourlyIcon = getIpmaIcon(hour.idWeatherType);

						// Simple heuristic for night icons in hourly strip (before 7am or after 8pm)
						const hourNum = new Date(hour.forecastDate).getHours();
						const isNight = hourNum >= 20 || hourNum < 7;
						const DisplayIcon = isNight ? Moon : HourlyIcon;

						return (
							<div key={idx} className="flex flex-col items-center gap-2 w-full">
								<span className="text-xs font-bold text-black">{formatHourlyLabel(hour.forecastDate, idx)}</span>

								<div className="h-6 flex items-center">
									<DisplayIcon className="w-7 h-7 stroke-[2.5]" />
								</div>

								<div className="flex flex-col items-center h-8 justify-start">
									<span className="text-lg font-bold leading-none">{Math.round(Number(hour.temp))}°</span>

									{/* Only show rain tag if probability > 0 */}
									{Number(hour.precipitaProb) > 0 && (
										<span className="text-[9px] font-black mt-1 bg-black text-white px-1 rounded-sm">
											{hour.precipitaProb}%
										</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
