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
		<div className="w-[800px] h-[480px] bg-white text-black font-eink-sans relative flex flex-col overflow-hidden select-none">
			{/* --- Header --- */}
			<header className="h-[60px] flex justify-between items-center px-6 border-b-[1px] border-eink-dark-gray shrink-0">
				<div className="flex items-center gap-3">
					<MapPin className="w-5 h-5 stroke-black stroke-2" />
					<h1 className="text-xl font-medium uppercase tracking-wider font-eink-serif">{data.location}</h1>
				</div>
				<div className="text-2xl font-black">{headerDate}</div>
			</header>

			{/* --- Main Section --- */}
			<div className="flex-1 flex flex-row items-center">
				{/* Col 1: Main Icon (33.33%) */}
				<div className="w-1/3 flex items-center justify-center">
					<CurrentIcon className="w-40 h-40 stroke-black stroke-[2.5]" />
				</div>

				{/* Separator Line 1 */}
				<div className="w-[5px] h-[70%] bg-eink-light-gray shrink-0"></div>

				{/* Col 2: Big Temp & Sun Times (33.33%) */}
				<div className="w-1/3 flex flex-col items-center justify-center relative">
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

				{/* Separator Line 2 */}
				<div className="w-[5px] h-[70%] bg-eink-light-gray shrink-0"></div>

				{/* Col 3: Details List (33.33%) */}
				<div className="w-1/3 flex flex-col justify-center px-10 gap-8">
					{/* Feels Like (Using IPMA tMed as proxy) */}
					<div>
						<div className="flex items-center gap-3 mb-1">
							<Thermometer className="w-6 h-6 stroke-[2.5]" />
							<span className="text-3xl font-black tracking-tight">{Math.round(Number(data.current.feelsLike))}°</span>
						</div>
						<div className="text-xs font-bold uppercase tracking-[0.15em] pl-9 text-eink-dark-gray">Feels Like</div>
					</div>

					{/* Humidity (Dynamic!) */}
					<div>
						<div className="flex items-center gap-3 mb-1">
							<Droplets className="w-6 h-6 fill-black stroke-black" />
							<span className="text-3xl font-black tracking-tight">{Math.round(Number(data.current.humidity))}%</span>
						</div>
						<div className="text-xs font-bold uppercase tracking-[0.15em] pl-9 text-eink-dark-gray">Humidity</div>
					</div>

					{/* Wind */}
					<div>
						<div className="flex items-center gap-3 mb-1">
							<Wind className="w-6 h-6 stroke-[2.5]" />
							<span className="text-2xl font-black tracking-tight uppercase">
								{data.current.windDir} {data.current.windSpeed}
							</span>
						</div>
						<div className="text-xs font-bold uppercase tracking-[0.15em] pl-9 text-eink-dark-gray">Current Wind</div>
					</div>
				</div>
			</div>

			{/* --- Hourly Forecast Section (Real Data) --- */}
			<div className="h-[140px] border-t-[1px] border-eink-dark-gray py-4 px-6 flex items-center shrink-0">
				<div className="flex justify-between items-center w-full">
					{data.hourly.map((hour, idx) => {
						const HourlyIcon = getIpmaIcon(hour.idWeatherType);

						// Simple heuristic for night icons in hourly strip (before 7am or after 8pm)
						const hourNum = new Date(hour.forecastDate).getHours();
						const isNight = hourNum >= 20 || hourNum < 7;
						const DisplayIcon = isNight ? Moon : HourlyIcon;

						return (
							<div key={idx} className="flex flex-col items-center gap-3 w-full">
								<span className="text-sm font-bold text-black">{formatHourlyLabel(hour.forecastDate, idx)}</span>

								<div className="flex items-center">
									<DisplayIcon className="w-10 h-10 stroke-[2.5]" />
								</div>

								<span className="text-2xl font-bold leading-none">{Math.round(Number(hour.temp))}°</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
