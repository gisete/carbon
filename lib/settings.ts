import { promises as fs } from "fs";
import path from "path";

// --- TYPES ---

export interface Settings {
	weather: {
		location: string;
		latitude: number;
		longitude: number;
	};
	calendar: {
		icalUrl: string;
	};
	system: {
		timezone: string;
		refreshInterval: number;
	};
}

// --- FILE PATHS ---

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

// --- DEFAULT SETTINGS ---

const DEFAULT_SETTINGS: Settings = {
	weather: {
		location: "Caldas da Rainha",
		latitude: 39.4062,
		longitude: -9.1364,
	},
	calendar: {
		icalUrl: "",
	},
	system: {
		timezone: "Europe/Lisbon",
		refreshInterval: 30,
	},
};

// --- HELPER: ENSURE DATA DIRECTORY EXISTS ---

async function ensureDataDir() {
	try {
		await fs.access(DATA_DIR);
	} catch {
		await fs.mkdir(DATA_DIR, { recursive: true });
	}
}

// --- PUBLIC API ---

/**
 * Reads the settings from the JSON file.
 * Returns default settings if the file doesn't exist.
 */
export async function getSettings(): Promise<Settings> {
	await ensureDataDir();

	try {
		const data = await fs.readFile(SETTINGS_FILE, "utf-8");
		return JSON.parse(data) as Settings;
	} catch (error: any) {
		// If file doesn't exist, return default settings
		if (error.code === "ENOENT") {
			return DEFAULT_SETTINGS;
		}
		throw error;
	}
}

/**
 * Saves the settings to the JSON file.
 * Creates the data directory if it doesn't exist.
 */
export async function saveSettings(settings: Settings): Promise<void> {
	await ensureDataDir();
	await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}
