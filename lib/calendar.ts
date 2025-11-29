import * as ical from "node-ical";
import { getSettings } from "./settings";

// --- TYPES ---

export interface CalendarEvent {
	title: string;
	start: Date;
	end: Date;
	isAllDay: boolean;
	location?: string;
}

// --- MAIN FUNCTION ---

/**
 * Fetches and parses calendar events from the configured iCal URL.
 * Returns upcoming events only, sorted by start date.
 */
export async function getCalendarEvents(limit: number = 5): Promise<CalendarEvent[]> {
	try {
		// Get settings
		const settings = await getSettings();
		const icalUrl = settings.calendar.icalUrl;

		// If no URL configured, return empty array
		if (!icalUrl) {
			console.warn("No iCal URL configured");
			return [];
		}

		// Fetch and parse the iCal feed
		const events = await ical.async.fromURL(icalUrl);

		// Current time for filtering
		const now = new Date();

		// Process events
		const upcomingEvents: CalendarEvent[] = [];

		for (const key in events) {
			const event = events[key];

			// Only process VEVENT types
			if (event.type !== "VEVENT") continue;

			// Get start and end dates
			const start = event.start;
			const end = event.end;

			if (!start) continue;

			// Filter for upcoming events only
			if (start < now) continue;

			// Determine if all-day event
			const isAllDay = typeof start === "string" || (start as any).dateOnly || false;

			upcomingEvents.push({
				title: event.summary || "Untitled Event",
				start: start instanceof Date ? start : new Date(start),
				end: end instanceof Date ? end : new Date(end || start),
				isAllDay,
				location: event.location || undefined,
			});
		}

		// Sort by start date (ascending)
		upcomingEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

		// Limit results
		return upcomingEvents.slice(0, limit);
	} catch (error) {
		console.error("Failed to fetch calendar events:", error);
		return [];
	}
}

/**
 * Helper to check if an event is happening now.
 */
export function isEventNow(event: CalendarEvent): boolean {
	const now = new Date();
	return now >= event.start && now <= event.end;
}
