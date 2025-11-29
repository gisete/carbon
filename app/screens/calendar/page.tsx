import { getCalendarEvents, CalendarView } from "@/lib/calendar";
import { getPlaylist } from "@/lib/playlist";
import DailyView from "./views/DailyView";
import WeeklyView from "./views/WeeklyView";
import MonthlyView from "./views/MonthlyView";

interface CalendarScreenProps {
	searchParams: Promise<{
		view?: string;
		pluginId?: string;
	}>;
}

export default async function CalendarScreen({ searchParams }: CalendarScreenProps) {
	// Await and parse search params
	const params = await searchParams;
	const viewParam = params.view || "daily";
	const pluginId = params.pluginId;

	// Get playlist to find calendar config
	const playlist = await getPlaylist();
	const calendarItem = pluginId
		? playlist.find((item) => item.id === pluginId && item.type === "calendar")
		: playlist.find((item) => item.type === "calendar");

	// Get iCal URL and view mode from config
	const icalUrl = calendarItem?.config?.icalUrl;
	const configView = calendarItem?.config?.viewMode;

	console.log("Calendar Screen - Plugin ID:", pluginId);
	console.log("Calendar Screen - Calendar Item:", calendarItem);
	console.log("Calendar Screen - iCal URL:", icalUrl);
	console.log("Calendar Screen - View Mode from config:", configView);
	console.log("Calendar Screen - View Mode from URL:", viewParam);

	// Priority: URL parameter > config setting > default
	// This allows URL to override the saved view mode for testing/flexibility
	const finalViewParam = viewParam || configView || "daily";
	console.log("Calendar Screen - Final view mode:", finalViewParam);

	// Validate view parameter
	const validViews: CalendarView[] = ["daily", "weekly", "monthly"];
	const view: CalendarView = validViews.includes(finalViewParam as CalendarView)
		? (finalViewParam as CalendarView)
		: "daily";

	// Fetch calendar events based on view and iCal URL
	const events = await getCalendarEvents(view, icalUrl);

	// Render appropriate view component
	let ViewComponent;
	switch (view) {
		case "weekly":
			ViewComponent = <WeeklyView events={events} />;
			break;
		case "monthly":
			ViewComponent = <MonthlyView events={events} />;
			break;
		case "daily":
		default:
			ViewComponent = <DailyView events={events} />;
			break;
	}

	return (
		<div className="w-[800px] h-[480px] bg-white border-4 border-black">
			{ViewComponent}
		</div>
	);
}
