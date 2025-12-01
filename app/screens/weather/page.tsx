import { getIpmaForecast } from "@/lib/ipma";
import { getPlaylist } from "@/lib/playlist";
import CurrentView from "./views/CurrentView";
import WeeklyView from "./views/WeeklyView";

type WeatherView = "current" | "weekly";

interface WeatherScreenProps {
	searchParams: Promise<{
		humidity?: string;
		view?: string;
		pluginId?: string;
	}>;
}

export default async function WeatherScreen({ searchParams }: WeatherScreenProps) {
	// Await and parse search params
	const params = await searchParams;
	const viewParam = params.view;
	const humidityOverride = params.humidity;
	const pluginId = params.pluginId;

	// Get playlist to find weather config
	const playlist = await getPlaylist();
	const weatherItem = pluginId
		? playlist.find((item) => item.id === pluginId && item.type === "weather")
		: playlist.find((item) => item.type === "weather");

	// Get view mode from config
	const configView = weatherItem?.config?.viewMode;

	// Priority: URL parameter > config setting > default
	const finalViewParam = viewParam || configView || "current";

	// Validate view parameter
	const validViews: WeatherView[] = ["current", "weekly"];
	const view: WeatherView = validViews.includes(finalViewParam as WeatherView)
		? (finalViewParam as WeatherView)
		: "current";

	// Fetch real data (passing the humidity override if present)
	const data = await getIpmaForecast(humidityOverride);

	if (!data) {
		return (
			<div className="w-[800px] h-[480px] bg-white border-4 border-black flex items-center justify-center font-bold text-2xl">
				DATA UNAVAILABLE
			</div>
		);
	}

	// Render appropriate view component
	let ViewComponent;
	switch (view) {
		case "weekly":
			ViewComponent = <WeeklyView data={data} />;
			break;
		case "current":
		default:
			ViewComponent = <CurrentView data={data} />;
			break;
	}

	return ViewComponent;
}
