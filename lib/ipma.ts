import SunCalc from "suncalc";
import { Sun, CloudSun, Cloud, CloudRain, CloudDrizzle, CloudLightning, CloudFog, Snowflake, Moon } from "lucide-react";

// --- Types ---
export interface IpmaDailyForecast {
	forecastDate: string;
	tMin: string;
	tMax: string;
	idWeatherType: number;
	precipitaProb: string;
	predWindDir: string;
	classWindSpeed: number;
}

export interface IpmaHourlyForecast {
	forecastDate: string; // ISO String
	temp: string;
	humidity: string; // hR
	precipitaProb: string;
	idWeatherType: number;
	windSpeed: string; // ffVento
	windDir: string; // ddVento
}

export interface WeatherData {
	current: {
		temp: string;
		humidity: string;
		windDir: string;
		windSpeed: string;
		sunrise: string;
		sunset: string;
		feelsLike?: string;
	};
	today: IpmaDailyForecast;
	hourly: IpmaHourlyForecast[];
	location: string;
}

// --- Constants ---
const LOCATION_ID = 1100600; // Caldas da Rainha
const COORDS = { lat: 39.4062, lon: -9.1364 };

// --- Icon Mapping ---
export const getIpmaIcon = (id: number) => {
	const map: Record<number, any> = {
		1: Sun,
		2: CloudSun,
		3: CloudSun,
		4: Cloud,
		5: Cloud,
		6: CloudDrizzle,
		7: CloudDrizzle,
		8: CloudRain,
		9: CloudRain,
		10: CloudDrizzle,
		11: CloudRain,
		12: CloudDrizzle,
		13: CloudDrizzle,
		14: CloudRain,
		15: CloudDrizzle,
		16: CloudFog,
		17: CloudFog,
		18: Snowflake,
		19: CloudLightning,
		20: CloudLightning,
		21: Snowflake,
		22: Snowflake,
		23: CloudLightning,
		24: Cloud,
		25: CloudSun,
		26: CloudFog,
		27: Cloud,
	};
	return map[id] || Sun;
};

// --- Fetcher ---
export async function getIpmaForecast(overrideHumidity?: string): Promise<WeatherData | null> {
	try {
		const res = await fetch(`https://api.ipma.pt/public-data/forecast/aggregate/${LOCATION_ID}.json`, {
			next: { revalidate: 1800 }, // Cache 30 mins
		});

		if (!res.ok) throw new Error("IPMA API Failed");
		const rawData = await res.json();

		// 1. Separate Daily vs Hourly
		const rawDaily = rawData.filter((item: any) => item.idPeriodo === 24);
		const rawHourly = rawData.filter((item: any) => item.idPeriodo !== 24);

		// 2. Find "Current" (Closest hourly forecast to NOW)
		const now = new Date();
		const currentHour = rawHourly.find((h: any) => new Date(h.dataPrev || h.data) > now) || rawHourly[0];

		// 3. Calculate Sun Times
		const times = SunCalc.getTimes(now, COORDS.lat, COORDS.lon);
		const formatTime = (date: Date) => date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

		// 4. Map Hourly Data (Next 10 entries)
		// CHANGED: Increased slice from 7 to 10 to match your UI requirement
		const nextHours = rawHourly
			.filter((h: any) => new Date(h.dataPrev || h.data) >= now)
			.slice(0, 10)
			.map((h: any) => ({
				forecastDate: h.dataPrev || h.data,
				temp: h.tMed || h.tMax,
				humidity: h.hR || "0",
				precipitaProb: h.probabilidadePrecipita,
				idWeatherType: h.idTipoTempo,
				windSpeed: h.ffVento,
				windDir: h.ddVento,
			}));

		// 5. Map Daily Data
		const mapDaily = (entry: any): IpmaDailyForecast => ({
			forecastDate: entry.dataPrev || entry.data,
			tMin: entry.tMin,
			tMax: entry.tMax,
			idWeatherType: entry.idTipoTempo,
			precipitaProb: entry.probabilidadePrecipita,
			predWindDir: entry.ddVento,
			classWindSpeed: entry.idFfxVento,
		});

		return {
			current: {
				temp: currentHour.tMed || currentHour.tMax,
				// Override humidity if provided (from Home Assistant), else use API
				humidity: overrideHumidity || currentHour.hR || "0",
				windDir: currentHour.ddVento,
				windSpeed: currentHour.ffVento,
				sunrise: formatTime(times.sunrise),
				sunset: formatTime(times.sunset),
				feelsLike: currentHour.tMed,
			},
			today: mapDaily(rawDaily[0]),
			hourly: nextHours,
			location: "Caldas da Rainha",
		};
	} catch (error) {
		console.error("Weather Fetch Error:", error);
		return null;
	}
}
