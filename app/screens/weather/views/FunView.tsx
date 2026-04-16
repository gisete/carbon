export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import { WeatherData, getIpmaIcon } from '@/lib/ipma';
import { Wind, Droplets } from 'lucide-react';

const CONDITION_LABELS: Record<number, string> = {
	1: 'Clear',
	2: 'Partly Cloudy', 3: 'Partly Cloudy', 25: 'Partly Cloudy',
	4: 'Cloudy', 5: 'Cloudy', 27: 'Cloudy',
	6: 'Drizzle', 7: 'Drizzle', 10: 'Drizzle', 13: 'Drizzle', 15: 'Drizzle',
	8: 'Rain', 9: 'Rain', 11: 'Rain', 14: 'Rain',
	16: 'Foggy', 17: 'Foggy', 26: 'Foggy',
	18: 'Snow', 21: 'Snow', 22: 'Snow',
	19: 'Thunderstorm', 20: 'Thunderstorm', 23: 'Thunderstorm',
};

interface FunViewProps {
	data: WeatherData;
}

export default function FunView({ data }: FunViewProps) {
	const idWeatherType = Number(data.today.idWeatherType);
	const conditionLabel = CONDITION_LABELS[idWeatherType] ?? 'Clear';
	const ConditionIcon = getIpmaIcon(idWeatherType);

	// Pick background image — rotates on every page load
	const imagesDir = path.join(process.cwd(), 'public', 'images', 'weather');
	let bgImage = '/images/weather/bg-weather-default.jpg';

	try {
		const matches = fs.readdirSync(imagesDir).filter(f => /^bg-weather-.+\.jpg$/.test(f));
		if (matches.length > 0) {
			bgImage = `/images/weather/${matches[Math.floor(Date.now() / 1000) % matches.length]}`;
		}
	} catch {
		// directory doesn't exist yet, use default
	}

	// Parse temperature into integer and decimal parts
	const tempNum = parseFloat(data.current.temp);
	const tempInt = Math.floor(tempNum);
	const tempDecimal = (tempNum - tempInt).toFixed(1).slice(1); // ".3" or ".0"

	// High / Low from today's daily forecast
	const tMax = Math.round(parseFloat(data.today.tMax));
	const tMin = Math.round(parseFloat(data.today.tMin));

	return (
		<div style={{ position: 'relative', width: 800, height: 480, overflow: 'hidden' }}>
			{/* Full-bleed background */}
			<img
				src={bgImage}
				alt=""
				style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
			/>

			{/* Floating weather card */}
			<div
				style={{
					position: 'absolute',
					top: 28,
					right: 36,
					width: 210,
					background: 'rgba(255,255,255,0.95)',
					border: '4px solid #1a1a1a',
					borderRadius: 20,
					padding: '22px 24px',
					fontFamily: "'Nunito', sans-serif",
					boxSizing: 'border-box',
					WebkitFontSmoothing: 'antialiased',
				}}
			>
				{/* Temperature */}
				<div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 10 }}>
					<span style={{ fontSize: 68, fontWeight: 900, lineHeight: 1, color: '#000000' }}>{tempInt}</span>
					<span style={{ fontSize: 26, fontWeight: 700, color: '#000000', marginLeft: 2, lineHeight: 1.2 }}>
						{tempDecimal}°C
					</span>
				</div>

				{/* Condition row */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
					<ConditionIcon size={22} color="#000000" strokeWidth={2.5} />
					<span style={{ fontSize: 17, fontWeight: 700, color: '#000000' }}>{conditionLabel}</span>
				</div>

				{/* Divider */}
				<div style={{ borderTop: '1px solid #000000', marginBottom: 12 }} />

				{/* High / Low */}
				<div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
					<div>
						<div style={{ fontSize: 12, fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
							High
						</div>
						<div style={{ fontSize: 24, fontWeight: 800, color: '#000000' }}>{tMax}°</div>
					</div>
					<div>
						<div style={{ fontSize: 12, fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
							Low
						</div>
						<div style={{ fontSize: 24, fontWeight: 800, color: '#000000' }}>{tMin}°</div>
					</div>
				</div>

				{/* Wind row */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
					<Wind size={16} color="#000000" strokeWidth={2.5} />
					<span style={{ fontSize: 16, fontWeight: 600, color: '#000000' }}>
						{data.current.windSpeed} km/h · {data.current.windDir}
					</span>
				</div>

				{/* Humidity row */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
					<Droplets size={16} color="#000000" strokeWidth={2.5} />
					<span style={{ fontSize: 16, fontWeight: 600, color: '#000000' }}>
						{Math.round(parseFloat(data.current.humidity))}%
					</span>
				</div>
			</div>
		</div>
	);
}
