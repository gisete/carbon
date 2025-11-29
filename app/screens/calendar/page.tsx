import { getCalendarEvents, isEventNow } from "@/lib/calendar";
import { CalendarDays, Clock, MapPin } from "lucide-react";

// Helper to format date and time
const formatEventDate = (date: Date): string => {
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const ampm = hours >= 12 ? "PM" : "AM";
	const h = hours % 12 || 12;
	const m = minutes.toString().padStart(2, "0");
	return `${h}:${m} ${ampm}`;
};

const formatEventDay = (date: Date): string => {
	const today = new Date();
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	// Check if same day
	if (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	) {
		return "Today";
	}

	// Check if tomorrow
	if (
		date.getDate() === tomorrow.getDate() &&
		date.getMonth() === tomorrow.getMonth() &&
		date.getFullYear() === tomorrow.getFullYear()
	) {
		return "Tomorrow";
	}

	// Otherwise show day of week
	return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

export default async function CalendarScreen() {
	// Fetch upcoming events
	const events = await getCalendarEvents(5);

	// Format current date for header
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
					<CalendarDays className="w-5 h-5 stroke-black stroke-2" />
					<h1 className="text-xl font-medium uppercase tracking-wider">Upcoming Events</h1>
				</div>
				<div className="text-xl font-black tracking-tight">{headerDate}</div>
			</header>

			{/* --- Main Section --- */}
			<div className="flex-1 flex flex-col p-6">
				{events.length === 0 ? (
					<div className="flex-1 flex items-center justify-center">
						<p className="text-2xl font-medium text-gray-400 uppercase tracking-wider">
							No upcoming events
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{events.map((event, idx) => {
							const isNow = isEventNow(event);
							const showTime = !event.isAllDay;

							return (
								<div
									key={idx}
									className={`border-2 p-4 transition-all ${
										isNow
											? "bg-black text-white border-black"
											: "bg-white text-black border-black"
									}`}
								>
									{/* Event Header: Day + Time */}
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center gap-3">
											<span className="text-xs font-bold uppercase tracking-[0.2em]">
												{formatEventDay(event.start)}
											</span>
											{showTime && (
												<>
													<span className="text-xs">•</span>
													<div className="flex items-center gap-1">
														<Clock className="w-3 h-3 stroke-2" />
														<span className="text-xs font-bold">
															{formatEventDate(event.start)}
														</span>
													</div>
												</>
											)}
										</div>
										{isNow && (
											<span className="text-xs font-black bg-white text-black px-2 py-0.5 uppercase tracking-wider">
												Now
											</span>
										)}
									</div>

									{/* Event Title */}
									<h3 className="text-2xl font-black tracking-tight mb-2 leading-tight">
										{event.title}
									</h3>

									{/* Event Location (if available) */}
									{event.location && (
										<div className="flex items-center gap-2">
											<MapPin className="w-4 h-4 stroke-2" />
											<span className="text-sm font-medium">{event.location}</span>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
