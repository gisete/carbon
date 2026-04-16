import { CalendarEvent } from "@/lib/calendar";
import { format, startOfWeek, addDays, isSameDay, isSameMonth } from "date-fns";

interface MonthlyViewProps {
	events: CalendarEvent[];
}

const formatTime = (date: Date): string => {
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const h = hours % 12 || 12;
	const ampm = hours >= 12 ? "PM" : "AM";
	const m = minutes === 0 ? "" : `:${String(minutes).padStart(2, "0")}`;
	return `${h}${m} ${ampm}`;
};

const getEventsForDay = (events: CalendarEvent[], day: Date): CalendarEvent[] => {
	const dayStart = new Date(day);
	dayStart.setHours(0, 0, 0, 0);
	const dayEnd = new Date(day);
	dayEnd.setHours(23, 59, 59, 999);

	return events.filter(
		(e) =>
			(e.start >= dayStart && e.start < dayEnd) ||
			(e.end > dayStart && e.end <= dayEnd) ||
			(e.start <= dayStart && e.end >= dayEnd),
	);
};

export default function MonthlyView({ events }: MonthlyViewProps) {
	const now = new Date();

	// Build 2-week grid: current week (Mon start) + next week
	const weekStart = startOfWeek(now, { weekStartsOn: 1 });
	const twoWeekDays: Date[] = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));
	const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

	// Find days with events within the 2-week window, sorted, max 3
	const daysWithEvents = twoWeekDays
		.map((day) => ({ day, dayEvents: getEventsForDay(events, day) }))
		.filter(({ dayEvents }) => dayEvents.length > 0)
		.slice(0, 3);

	return (
		<div className="w-[800px] h-[480px] bg-white text-eink-black font-eink-sans flex flex-col select-none px-10 pt-10 pb-8">
			{/* ===== HEADER ===== */}
			<div className="flex items-baseline gap-3 mb-7">
				<h1 className="text-4xl font-semibold leading-none">{format(now, "MMMM")}</h1>
				<span className="text-4xl font-normal text-eink-light-gray leading-none">{format(now, "yyyy")}</span>
			</div>

			{/* ===== 2-WEEK GRID ===== */}
			<div className="grid grid-cols-7 text-center mb-4">
				{/* Weekday headers */}
				{weekDayLabels.map((label) => (
					<div key={label} className="text-sm font-medium text-eink-dark-gray mb-3">
						{label}
					</div>
				))}

				{/* Day cells — 2 rows */}
				{twoWeekDays.map((day, idx) => {
					const isToday = isSameDay(day, now);
					const isCurrentMonth = isSameMonth(day, now);
					const dayEvents = getEventsForDay(events, day);
					const dotCount = Math.min(dayEvents.length, 3);

					return (
						<div key={idx} className="flex flex-col items-center justify-center h-16">
							{isToday ? (
								<div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-eink-black relative">
									<span className="text-2xl font-semibold text-white leading-none">{day.getDate()}</span>
									{dotCount > 0 && (
										<div className="flex gap-[3px] absolute bottom-[7px]">
											{Array.from({ length: dotCount }).map((_, i) => (
												<div key={i} className="w-[3px] h-[3px] rounded-full bg-white" />
											))}
										</div>
									)}
								</div>
							) : (
								<div className="flex flex-col items-center">
									<span
										className={`text-2xl font-normal leading-none ${
											isCurrentMonth ? "text-eink-black" : "text-eink-light-gray"
										}`}
									>
										{day.getDate()}
									</span>
									{dotCount > 0 && (
										<div className="flex gap-[3px] mt-1">
											{Array.from({ length: dotCount }).map((_, i) => (
												<div key={i} className="w-[3px] h-[3px] rounded-full bg-eink-black" />
											))}
										</div>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* ===== DIVIDER ===== */}
			<div className="w-full mb-5" style={{ borderTop: "1px dotted #AAAAAA" }} />

			{/* ===== AGENDA ===== */}
			{daysWithEvents.length === 0 ? (
				<p className="text-eink-dark-gray text-lg">No appointments, enjoy!</p>
			) : (
				<div className="grid gap-10" style={{ gridTemplateColumns: `repeat(${daysWithEvents.length}, 1fr)` }}>
					{daysWithEvents.map(({ day, dayEvents }) => (
						<div key={day.toISOString()}>
							{/* Column header */}
							<h2 className="text-xl font-semibold mb-4 leading-none">{format(day, "EEE d MMM")}</h2>

							{/* Events */}
							<div className="flex flex-col gap-0">
								{dayEvents.map((event, idx) => {
									const isLast = idx === dayEvents.length - 1;
									return (
										<div
											key={idx}
											className={`pb-3 ${!isLast ? "mb-3" : ""}`}
											style={!isLast ? { borderBottom: "1px dotted #AAAAAA" } : {}}
										>
											{event.allDay ? (
												<div className="bg-eink-light-gray px-3 py-2 mb-1">
													<span className="text-base font-medium leading-tight">{event.title}</span>
												</div>
											) : (
												<>
													<span className="block text-[11px] font-semibold text-eink-dark-gray mb-1 uppercase tracking-wide">
														{formatTime(event.start)} — {formatTime(event.end)}
													</span>
													<div className="text-base font-semibold leading-snug">{event.title}</div>
												</>
											)}
										</div>
									);
								})}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
