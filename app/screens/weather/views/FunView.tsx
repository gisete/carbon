export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import { WeatherData, getIpmaIcon } from '@/lib/ipma';
import { Wind, Droplets } from 'lucide-react';

// Map IPMA idWeatherType → condition slug
const CONDITION_SLUGS: Record<number, string> = {
	1: 'clear',
	2: 'partly-cloudy',
	3: 'partly-cloudy',
	4: 'cloudy',
	5: 'cloudy',
	6: 'drizzle',
	7: 'drizzle',
	8: 'rain',
	9: 'rain',
	10: 'drizzle',
	11: 'rain',
	13: 'drizzle',
	14: 'rain',
	15: 'drizzle',
	16: 'fog',
	17: 'fog',
	18: 'snow',
	19: 'storm',
	20: 'storm',
	21: 'snow',
	22: 'snow',
	23: 'storm',
	25: 'partly-cloudy',
	26: 'fog',
	27: 'cloudy',
};

const SLUG_LABELS: Record<string, string> = {
	clear: 'Clear',
	'partly-cloudy': 'Partly Cloudy',
	cloudy: 'Cloudy',
	drizzle: 'Drizzle',
	rain: 'Rain',
	fog: 'Foggy',
	snow: 'Snow',
	storm: 'Thunderstorm',
};

interface FunViewProps {
	data: WeatherData;
}

export default function FunView({ data }: FunViewProps) {
	const idWeatherType = Number(data.today.idWeatherType);
	const slug = CONDITION_SLUGS[idWeatherType] ?? 'clear';
	const conditionLabel = SLUG_LABELS[slug] ?? 'Clear';
	const ConditionIcon = getIpmaIcon(idWeatherType);

	// Day-of-year for daily image rotation
	const now = new Date();
	const startOfYear = new Date(now.getFullYear(), 0, 0);
	const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

	// Pick background image
	const imagesDir = path.join(process.cwd(), 'public', 'images', 'weather');
	let bgImage = '/images/weather/bg-weather-default.jpg';

	try {
		const files = fs.readdirSync(imagesDir);
		const slugPattern = new RegExp(`^bg-weather-${slug}(-\\d+)?\\.jpg$`);
		const matches = files.filter(f => slugPattern.test(f));
		if (matches.length > 0) {
			bgImage = `/images/weather/${matches[dayOfYear % matches.length]}`;
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
					background: 'rgba(255,255,255,0.88)',
					border: '1px solid #d1d5db',
					borderRadius: 20,
					padding: '22px 24px',
					fontFamily: "'Nunito', sans-serif",
					boxSizing: 'border-box',
					WebkitFontSmoothing: 'antialiased',
				}}
			>
				{/* Temperature */}
				<div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 10 }}>
					<span style={{ fontSize: 68, fontWeight: 900, lineHeight: 1 }}>{tempInt}</span>
					<span style={{ fontSize: 26, fontWeight: 700, color: '#555', marginLeft: 2, lineHeight: 1.2 }}>
						{tempDecimal}°C
					</span>
				</div>

				{/* Condition row */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
					<ConditionIcon size={22} />
					<span style={{ fontSize: 17, fontWeight: 700, color: '#222' }}>{conditionLabel}</span>
				</div>

				{/* Dashed divider */}
				<div style={{ borderTop: '1px dashed rgba(0,0,0,0.12)', marginBottom: 12 }} />

				{/* High / Low */}
				<div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
					<div>
						<div style={{ fontSize: 11, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
							High
						</div>
						<div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a' }}>{tMax}°</div>
					</div>
					<div>
						<div style={{ fontSize: 11, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
							Low
						</div>
						<div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a' }}>{tMin}°</div>
					</div>
				</div>

				{/* Wind row */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
					<Wind size={16} strokeWidth={2} />
					<span style={{ fontSize: 14, fontWeight: 600, color: '#444' }}>
						{data.current.windSpeed} km/h · {data.current.windDir}
					</span>
				</div>

				{/* Humidity row */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
					<Droplets size={16} strokeWidth={2} />
					<span style={{ fontSize: 14, fontWeight: 600, color: '#444' }}>
						{Math.round(parseFloat(data.current.humidity))}%
					</span>
				</div>
			</div>
		</div>
	);
}
