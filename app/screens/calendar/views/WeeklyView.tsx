import { CalendarEvent } from "@/lib/calendar";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

interface WeeklyViewProps {
	events: CalendarEvent[];
}

// Helper to get week days
const getWeekDays = (date: Date, weekStartDay: "sunday" | "monday" = "sunday"): Date[] => {
	const dayOfWeek = weekStartDay === "monday" ? 1 : 0;
	const start = startOfWeek(date, { weekStartsOn: dayOfWeek as 0 | 1 });
	const end = endOfWeek(date, { weekStartsOn: dayOfWeek as 0 | 1 });
	return eachDayOfInterval({ start, end });
};

// Helper to get events for a specific day
const getEventsForDay = (events: CalendarEvent[], day: Date): CalendarEvent[] => {
	const dayStart = new Date(day);
	dayStart.setHours(0, 0, 0, 0);
	const dayEnd = new Date(day);
	dayEnd.setHours(23, 59, 59, 999);

	return events.filter((event) => {
		return (
			(event.start >= dayStart && event.start < dayEnd) ||
			(event.end > dayStart && event.end <= dayEnd) ||
			(event.start <= dayStart && event.end >= dayEnd)
		);
	});
};

// Helper to format time (24h format)
const formatTime = (date: Date): string => {
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const h = hours.toString().padStart(2, "0");
	const m = minutes.toString().padStart(2, "0");
	return `${h}:${m}`;
};

// Helper to format date range
const formatDateRange = (start: Date, end: Date): string => {
	const startStr = `${start.getMonth() + 1}/${start.getDate()}`;
	const endStr = `${end.getMonth() + 1}/${end.getDate()}`;
	return `${startStr} - ${endStr}`;
};

// Helper to check if date is today
const isToday = (date: Date): boolean => {
	const today = new Date();
	return (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	);
};

// Helper to truncate text
const truncateText = (text: string, maxLength: number): string => {
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength - 3) + "...";
};

export default function WeeklyView({ events }: WeeklyViewProps) {
	const now = new Date();
	const weekDays = getWeekDays(now);
	const weekStart = weekDays[0];
	const weekEnd = weekDays[6];
	const weekRangeStr = formatDateRange(weekStart, weekEnd);

	// Calculate max events to show per day (based on available height)
	const maxEventsToShow = 6;

	return (
		<div className="w-[800px] h-[480px] bg-white text-black font-sans flex flex-col select-none">
			{/* ===== HEADER SECTION ===== */}
			<div className="h-[80px] px-8 flex items-center justify-between">
				<h1 className="text-4xl font-bold">This Week</h1>
				<p className="text-xl text-gray-500">{weekRangeStr}</p>
			</div>

			{/* ===== DAY HEADERS ===== */}
			<div className="h-[50px] flex border-b-2 border-gray-300">
				{weekDays.map((day, index) => {
					const isCurrent = isToday(day);
					const dayAbbr = format(day, "EEE");
					const dayNum = day.getDate();

					return (
						<div
							key={index}
							className={`flex-1 flex flex-col items-center justify-center ${
								isCurrent ? "bg-gray-200" : ""
							} ${index > 0 ? "border-l border-gray-200" : ""}`}
						>
							<span className={`text-base font-bold ${isCurrent ? "text-black" : "text-gray-700"}`}>
								{dayAbbr}
							</span>
							<span
								className={`${isCurrent ? "text-2xl font-bold text-black" : "text-xl text-gray-500"}`}
							>
								{dayNum}
							</span>
						</div>
					);
				})}
			</div>

			{/* ===== EVENTS GRID ===== */}
			<div className="flex-1 flex overflow-hidden">
				{weekDays.map((day, index) => {
					const dayEvents = getEventsForDay(events, day);
					const sortedEvents = dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
					const visibleEvents = sortedEvents.slice(0, maxEventsToShow);
					const remainingCount = sortedEvents.length - maxEventsToShow;

					return (
						<div
							key={index}
							className={`flex-1 flex flex-col px-1 py-3 ${
								index > 0 ? "border-l border-gray-200" : ""
							}`}
						>
							{sortedEvents.length === 0 ? (
								<div className="flex-1 flex items-start justify-center pt-4">
									<p className="text-sm text-gray-300 italic">No events</p>
								</div>
							) : (
								<div className="space-y-2">
									{visibleEvents.map((event, eventIdx) => (
										<div
											key={eventIdx}
											className="bg-gray-50 border border-gray-300 px-1 py-1 text-xs"
										>
											{/* Event time (if not all-day) */}
											{!event.allDay && (
												<div className="font-bold text-gray-600 mb-0.5">
													{formatTime(event.start)}
												</div>
											)}

											{/* Event title */}
											<div
												className={`${
													event.allDay ? "font-bold text-sm" : "text-xs"
												} text-black leading-tight`}
											>
												{truncateText(event.title, 20)}
											</div>
										</div>
									))}

									{/* More events indicator */}
									{remainingCount > 0 && (
										<p className="text-xs text-gray-400 italic text-center pt-1">
											+{remainingCount} more
										</p>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* ===== FOOTER ===== */}
			<div className="flex justify-between items-center px-8 pb-4 pt-2">
				<span className="text-sm text-gray-400">Updated: {formatTime(new Date())}</span>
				{events.length > 0 && (
					<span className="text-sm text-gray-400">
						{events.length} event{events.length !== 1 ? "s" : ""} this week
					</span>
				)}
			</div>
		</div>
	);
}
