import { CalendarEvent } from "@/lib/calendar";

interface DailyViewProps {
	events: CalendarEvent[];
}

// Helper to format time (24h format)
const formatTime = (date: Date): string => {
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const h = hours.toString().padStart(2, "0");
	const m = minutes.toString().padStart(2, "0");
	return `${h}:${m}`;
};

// Helper to format current date
const formatCurrentDate = (): string => {
	const now = new Date();
	const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
	const monthName = now.toLocaleDateString("en-US", { month: "long" });
	const day = now.getDate();
	const year = now.getFullYear();

	return `${dayName}, ${monthName} ${day}, ${year}`;
};

export default function DailyView({ events }: DailyViewProps) {
	const dateStr = formatCurrentDate();
	const maxEventsToShow = 6;
	const visibleEvents = events.slice(0, maxEventsToShow);

	return (
		<div className="w-[800px] h-[480px] bg-white text-black font-eink-sans flex flex-col select-none">
			{/* ===== HEADER SECTION ===== */}
			<div className="px-10 pt-10 pb-6">
				{/* Title */}
				<h1 className="text-5xl font-bold mb-2 font-eink-serif">Today's Schedule</h1>

				{/* Date Subtitle */}
				<p className="text-2xl text-eink-dark-gray">{dateStr}</p>

				{/* Divider */}
				<div className="border-b-2 border-eink-light-gray mt-5"></div>
			</div>

			{/* ===== EVENTS SECTION ===== */}
			<div className="flex-1 px-10 overflow-hidden">
				{events.length === 0 ? (
					// No events message
					<div className="flex items-start pt-6">
						<p className="text-3xl text-eink-dark-gray">No events scheduled for today</p>
					</div>
				) : (
					// Events list
					<div className="space-y-10 pt-2">
						{visibleEvents.map((event, idx) => (
							<div key={idx} className="flex gap-6">
								{/* ===== TIME COLUMN ===== */}
								<div className="w-[140px] flex-shrink-0">
									<span className="text-2xl font-bold text-eink-dark-gray">
										{event.allDay ? "All Day" : formatTime(event.start)}
									</span>
								</div>

								{/* ===== CONTENT COLUMN ===== */}
								<div className="flex-1">
									{/* Event Title */}
									<h3 className="text-3xl font-bold mb-1 leading-tight">
										{event.title}
									</h3>

									{/* Event Description (if available and fits) */}
									{event.description && (
										<p className="text-xl text-eink-dark-gray line-clamp-2 mt-2">
											{event.description}
										</p>
									)}

									{/* Event Location (if available and no description) */}
									{event.location && !event.description && (
										<p className="text-lg text-eink-dark-gray italic mt-1">
											📍 {event.location}
										</p>
									)}
								</div>
							</div>
						))}

						{/* More events indicator */}
						{events.length > maxEventsToShow && (
							<p className="text-xl text-eink-dark-gray italic pl-[164px]">
								+{events.length - maxEventsToShow} more event{events.length - maxEventsToShow !== 1 ? "s" : ""}...
							</p>
						)}
					</div>
				)}
			</div>

			{/* ===== FOOTER ===== */}
			<div className="flex justify-between items-center px-10 pb-6 pt-4">
				<span className="text-lg text-eink-dark-gray">
					Updated: {formatTime(new Date())}
				</span>
				{events.length > 0 && (
					<span className="text-lg text-eink-dark-gray">
						{events.length} event{events.length !== 1 ? "s" : ""} today
					</span>
				)}
			</div>
		</div>
	);
}
