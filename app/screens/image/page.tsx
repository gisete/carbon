import { getPlaylistCollection } from "@/lib/playlist";

interface ImageScreenProps {
	searchParams: Promise<{
		id?: string;
	}>;
}

export default async function ImageScreen({ searchParams }: ImageScreenProps) {
	const params = await searchParams;
	const itemId = params.id;

	// Default config
	let imageUrl = "";
	let fit: "cover" | "contain" = "contain";
	let grayscale = false;

	// Look up the playlist item if ID is provided
	if (itemId) {
		try {
			const collection = await getPlaylistCollection();
			let foundItem;

			for (const playlist of collection.playlists) {
				foundItem = playlist.items.find((item) => item.id === itemId);
				if (foundItem) break;
			}

			if (foundItem && foundItem.type === "image") {
				imageUrl = foundItem.config?.url || "";
				fit = foundItem.config?.fit || "contain";
				grayscale = foundItem.config?.grayscale || false;
			}
		} catch (error) {
			console.error("[Image Screen] Failed to load playlist item:", error);
		}
	}

	// Determine background color based on fit mode
	const bgColor = fit === "contain" ? "bg-white" : "bg-black";
	const objectFit = fit === "cover" ? "object-cover" : "object-contain";
	const grayscaleFilter = grayscale ? "grayscale(100%)" : "none";

	return (
		<div className={`w-[800px] h-[480px] ${bgColor} flex items-center justify-center overflow-hidden`}>
			{imageUrl ? (
				<img
					src={imageUrl}
					alt="Display Image"
					className={`w-full h-full ${objectFit}`}
					style={{ filter: grayscaleFilter }}
				/>
			) : (
				<div className="text-center p-8">
					<p className="text-2xl text-gray-500">No image configured</p>
				</div>
			)}
		</div>
	);
}
