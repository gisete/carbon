// Home Assistant API Integration

export interface HaEntity {
	state: string;
	attributes: Record<string, any>;
	entity_id?: string;
	last_changed?: string;
	last_updated?: string;
}

/**
 * Fetches entity state and attributes from Home Assistant REST API
 * @param entityId - The entity ID (e.g., "sensor.ugreen_nas_cpu_usage")
 * @returns HaEntity object with state and attributes
 */
export async function getHaEntity(entityId: string): Promise<HaEntity | null> {
	try {
		const baseUrl = process.env.HA_BASE_URL;
		const token = process.env.HA_ACCESS_TOKEN;

		if (!baseUrl || !token) {
			console.error('Missing HA_BASE_URL or HA_ACCESS_TOKEN environment variables');
			return null;
		}

		const url = `${baseUrl}/api/states/${entityId}`;

		const res = await fetch(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			next: { revalidate: 60 }, // Cache for 60 seconds
		});

		if (!res.ok) {
			console.error(`Failed to fetch entity ${entityId}: ${res.status} ${res.statusText}`);
			return null;
		}

		const data = await res.json();

		return {
			state: data.state,
			attributes: data.attributes || {},
			entity_id: data.entity_id,
			last_changed: data.last_changed,
			last_updated: data.last_updated,
		};
	} catch (error) {
		console.error(`Error fetching HA entity ${entityId}:`, error);
		return null;
	}
}
