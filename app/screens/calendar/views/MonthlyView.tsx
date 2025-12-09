import { CalendarEvent } from "@/lib/calendar";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";

interface MonthlyViewProps {
	events: CalendarEvent[];
}

// Helper to get month days including leading/trailing days to fill grid
const getMonthDays = (date: Date, weekStartDay: "sunday" | "monday" = "sunday"): Date[] => {
	const monthStart = startOfMonth(date);
	const monthEnd = endOfMonth(date);

	const dayOfWeek = weekStartDay === "monday" ? 1 : 0;
	const calendarStart = startOfWeek(monthStart, { weekStartsOn: dayOfWeek as 0 | 1 });
	const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: dayOfWeek as 0 | 1 });

	return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
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

// Helper to check if date is today
const isToday = (date: Date): boolean => {
	const today = new Date();
	return (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	);
};

export default function MonthlyView({ events }: MonthlyViewProps) {
	const now = new Date();
	const monthName = format(now, "MMMM");
	const yearStr = now.getFullYear().toString();
	const monthDays = getMonthDays(now);
	const numWeeks = monthDays.length / 7;

	// Get first 7 days for weekday headers
	const weekDays = monthDays.slice(0, 7);

	return (
		<div className="w-[800px] h-[480px] bg-white text-black font-sans flex flex-col select-none p-4">
			{/* ===== HEADER SECTION ===== */}
			<div className="h-[50px] flex items-center pb-2">
				<h1 className="text-3xl">
					<span className="font-bold">{monthName}</span>{" "}
					<span className="font-normal text-gray-600">{yearStr}</span>
				</h1>
			</div>

			{/* ===== DAY OF WEEK HEADERS ===== */}
			<div className="grid grid-cols-7 h-[25px] mb-1">
				{weekDays.map((day, index) => {
					const dayAbbr = format(day, "EEE");
					return (
						<div key={index} className="flex items-center justify-center">
							<span className="text-xs font-bold text-gray-500 uppercase">{dayAbbr}</span>
						</div>
					);
				})}
			</div>

			{/* ===== CALENDAR GRID ===== */}
			<div className="flex-1 grid grid-rows-[repeat(var(--num-weeks),1fr)] border-t-2 border-l-2 border-gray-500">
				{Array.from({ length: numWeeks }).map((_, weekIndex) => {
					const weekStart = weekIndex * 7;
					const weekEnd = weekStart + 7;
					const weekDaysSlice = monthDays.slice(weekStart, weekEnd);

					return (
						<div key={weekIndex} className="grid grid-cols-7">
							{weekDaysSlice.map((day, dayIndex) => {
								const dayNum = day.getDate();
								const isCurrentDay = isToday(day);
								const isCurrentMonth = isSameMonth(day, now);
								const dayEvents = getEventsForDay(events, day);

								return (
									<div
										key={dayIndex}
										className="border-r-2 border-b-2 border-gray-500 p-2 flex flex-col overflow-hidden"
									>
										{/* Day Number */}
										{isCurrentDay ? (
											<div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500 mb-1">
												<span className="text-sm font-bold text-white">{dayNum}</span>
											</div>
										) : (
											<span
												className={`text-sm mb-1 font-semibold ${
													isCurrentMonth ? "text-black" : "text-gray-400"
												}`}
											>
												{dayNum}
											</span>
										)}

										{/* Event Titles (truncated) */}
										{isCurrentMonth && dayEvents.length > 0 && (
											<div className="flex flex-col gap-0.5 mt-1 overflow-hidden">
												{dayEvents.slice(0, 3).map((event, eventIdx) => (
													<div
														key={eventIdx}
														className="text-[9px] leading-tight text-black border border-gray-500 px-1 py-0.5 truncate"
														title={event.title}
													>
														{event.title}
													</div>
												))}
												{dayEvents.length > 3 && (
													<span className="text-[8px] text-gray-500">+{dayEvents.length - 3} more</span>
												)}
											</div>
										)}
									</div>
								);
							})}
						</div>
					);
				})}
			</div>
		</div>
	);
}
