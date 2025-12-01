import * as ical from "node-ical";
import { getSettings } from "./settings";
import {
	startOfDay,
	endOfDay,
	startOfWeek,
	endOfWeek,
	startOfMonth,
	endOfMonth,
	isSameDay,
} from "date-fns";

// --- TYPES ---

export type CalendarView = "daily" | "weekly" | "monthly";

export interface CalendarEvent {
	title: string;
	description?: string;
	start: Date;
	end: Date;
	allDay: boolean;
	location?: string;
}

// --- HELPER FUNCTIONS ---

/**
 * Normalize calendar URLs
 * - Convert webcal:// to https://
 */
function normalizeCalendarUrl(url: string): string {
	// Convert webcal:// to https://
	if (url.startsWith("webcal://")) {
		url = url.replace("webcal://", "https://");
	}

	return url;
}

/**
 * Get week start based on configuration
 */
function getWeekStart(date: Date, weekStartDay: "sunday" | "monday" = "sunday"): Date {
	const dayOfWeek = weekStartDay === "monday" ? 1 : 0;
	return startOfWeek(date, { weekStartsOn: dayOfWeek as 0 | 1 });
}

/**
 * Get week end based on configuration
 */
function getWeekEnd(date: Date, weekStartDay: "sunday" | "monday" = "sunday"): Date {
	const dayOfWeek = weekStartDay === "monday" ? 1 : 0;
	return endOfWeek(date, { weekStartsOn: dayOfWeek as 0 | 1 });
}

/**
 * Filter events within a date range.
 * Includes events that start, end, or span across the range.
 */
function getEventsInRange(
	events: CalendarEvent[],
	start: Date,
	end: Date
): CalendarEvent[] {
	return events.filter((event) => {
		return (
			(event.start >= start && event.start < end) ||
			(event.end > start && event.end <= end) ||
			(event.start <= start && event.end >= end)
		);
	});
}

// --- MAIN FUNCTION ---

/**
 * Fetches and parses calendar events from the configured iCal URL.
 * Filters events based on the specified view (daily, weekly, monthly).
 * Returns events sorted by start time.
 *
 * Priority:
 * 1. Uses icalUrl parameter if provided (from playlist item config)
 * 2. Falls back to global settings if no URL provided
 * This allows multiple calendar plugins to show different calendars
 */
export async function getCalendarEvents(
	view: CalendarView = "daily",
	icalUrl?: string
): Promise<CalendarEvent[]> {
	try {
		// Priority: playlist item config > global settings
		let calendarUrl = icalUrl;
		if (!calendarUrl) {
			const settings = await getSettings();
			calendarUrl = settings.calendar.icalUrl;
		}

		// If no URL configured, return empty array
		if (!calendarUrl) {
			console.warn("No iCal URL configured");
			return [];
		}

		// Normalize the URL (add /webcal for iCloud URLs)
		calendarUrl = normalizeCalendarUrl(calendarUrl);

		// Fetch the iCal feed with Next.js caching (15 minutes)
		const response = await fetch(calendarUrl, {
			next: { revalidate: 900 },
			headers: {
				"Accept": "text/calendar",
				"Cache-Control": "no-cache, no-store, must-revalidate",
				Pragma: "no-cache",
				Expires: "0",
			},
		});

		if (!response.ok) {
			console.error(`Failed to fetch calendar from ${calendarUrl}: ${response.status} ${response.statusText}`);
			throw new Error(`Failed to fetch calendar: ${response.statusText}`);
		}

		const icsData = await response.text();

		// Parse the iCal data
		const events = ical.sync.parseICS(icsData);

		// Process all events first
		const allEvents: CalendarEvent[] = [];

		for (const key in events) {
			const event = events[key];

			// Only process VEVENT types
			if (event.type !== "VEVENT") continue;

			// Get start and end dates
			const eventStart = event.start;
			const eventEnd = event.end;

			if (!eventStart) continue;

			// Convert to Date objects
			const start = eventStart instanceof Date ? eventStart : new Date(eventStart);
			const end = eventEnd instanceof Date ? eventEnd : new Date(eventEnd || eventStart);

			// Determine if all-day event (check if start has dateOnly property or no time component)
			const allDay = !(eventStart as any).dateTime;

			allEvents.push({
				title: event.summary || "Untitled Event",
				description: event.description || undefined,
				start,
				end,
				allDay,
				location: event.location || undefined,
			});
		}

		// Filter events based on view
		const now = new Date();
		let filteredEvents: CalendarEvent[] = [];

		switch (view) {
			case "daily": {
				// Get events for today
				const dayStart = startOfDay(now);
				const dayEnd = endOfDay(now);

				filteredEvents = allEvents.filter((event) => {
					// Event overlaps with today
					return (
						(event.start >= dayStart && event.start < dayEnd) ||
						(event.end > dayStart && event.end <= dayEnd) ||
						(event.start <= dayStart && event.end >= dayEnd)
					);
				});

				// Filter out past events (except all-day events)
				const currentTime = now;
				filteredEvents = filteredEvents.filter((event) => {
					return event.end >= currentTime || event.allDay;
				});

				break;
			}

			case "weekly": {
				// Get events for this week
				const weekStart = getWeekStart(now);
				const weekEnd = getWeekEnd(now);

				filteredEvents = getEventsInRange(allEvents, weekStart, weekEnd);

				// Filter out past events (except all-day events)
				const currentTime = now;
				filteredEvents = filteredEvents.filter((event) => {
					return event.end >= currentTime || event.allDay;
				});

				break;
			}

			case "monthly": {
				// Get events for this month (plus a few days on either side for grid)
				const monthStart = startOfMonth(now);
				const monthEnd = endOfMonth(now);

				// Expand range slightly to include events in grid cells from adjacent months
				const rangeStart = new Date(monthStart);
				rangeStart.setDate(rangeStart.getDate() - 7);

				const rangeEnd = new Date(monthEnd);
				rangeEnd.setDate(rangeEnd.getDate() + 7);

				filteredEvents = getEventsInRange(allEvents, rangeStart, rangeEnd);
				break;
			}

			default:
				filteredEvents = allEvents;
		}

		// Sort by start time (ascending)
		filteredEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

		return filteredEvents;
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

/**
 * Helper to check if an event is today.
 */
export function isEventToday(event: CalendarEvent): boolean {
	return isSameDay(event.start, new Date());
}

/**
 * Get events for a specific day
 */
export function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
	const dayStart = startOfDay(day);
	const dayEnd = endOfDay(day);

	return events.filter((event) => {
		return (
			(event.start >= dayStart && event.start < dayEnd) ||
			(event.end > dayStart && event.end <= dayEnd) ||
			(event.start <= dayStart && event.end >= dayEnd)
		);
	});
}
