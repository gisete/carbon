import type { PlaylistItem } from './playlist';

export function buildScreenUrl(item: PlaylistItem, baseUrl: string): string {
	switch (item.type) {
		case "weather":
			return `${baseUrl}/weather?view=${item.config?.viewMode || "current"}`;
		case "calendar":
			return `${baseUrl}/calendar?view=${item.config?.viewMode || "daily"}`;
		case "custom-text":
			return `${baseUrl}/custom-text?text=${encodeURIComponent(item.config?.text || "")}`;
		case "logo":
			return `${baseUrl}/logo?fontSize=${item.config?.fontSize || "120"}`;
		case "image":
			return `${baseUrl}/image?id=${item.id}`;
		case "system":
			return `${baseUrl}/system`;
		case "comic":
			return `${baseUrl}/comic`;
		case "servers":
			return `${baseUrl}/servers`;
		case "quote":
			return `${baseUrl}/quote`;
		case "youtube":
			return `${baseUrl}/youtube`;
		case "journey":
			return `${baseUrl}/journey`;
		default:
			return baseUrl;
	}
}
