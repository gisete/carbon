import { promises as fs } from 'fs';
import si from 'systeminformation';
import { Barlow_Condensed } from 'next/font/google';
import { getHaEntity } from '@/lib/ha';
import { Server, Monitor, Cpu, MemoryStick, HardDrive, Clock, Calendar, Network, Globe, Thermometer } from 'lucide-react';

const barlow = Barlow_Condensed({ weight: ['400', '600', '700'], subsets: ['latin'] });

// --- TYPES ---
interface ServerData {
	name: string;
	cpuLoad: number;
	cpuTemp: number; // in Celsius
	ramUsedPercent: number; // 0-100
	ramText: string; // e.g. "4.2 / 8 GB"
	storageUsedPercent: number; // 0-100
	storageText: string; // e.g. "1.2 / 4 TB"
	driveTemp: number | null; // Celsius (optional)
	uptimeDays: string; // e.g. "12.5"
}

// --- UGREEN NAS Entity IDs ---
const NAS_CPU_USAGE = 'sensor.ugreen_nas_cpu_usage';
const NAS_CPU_TEMP = 'sensor.ugreen_nas_cpu_temperature';
const NAS_RAM_USAGE = 'sensor.ugreen_nas_ram_usage';
const NAS_UPTIME = 'sensor.ugreen_nas_total_runtime';
const NAS_HD_SIZE = 'sensor.ugreen_nas_pool_1_disk_1_size';
const NAS_HD_USED = 'sensor.ugreen_nas_pool_1_volume_1_used_size';
const NAS_DISK_TEMP = 'sensor.ugreen_nas_disk_1_temperature';

// --- STATUS HELPERS ---
function tempStatus(t: number) {
	if (t >= 85) return 'Critical';
	if (t >= 75) return 'Hot';
	if (t >= 60) return 'Warm';
	return 'Normal';
}
function cpuStatus(c: number) {
	if (c >= 90) return 'Maxed';
	if (c >= 60) return 'High';
	if (c >= 20) return 'Active';
	return 'Idle';
}
function ramStatus(p: number) {
	if (p >= 90) return 'Critical';
	if (p >= 75) return 'High';
	if (p >= 50) return 'Moderate';
	return 'Normal';
}
function hdStatus(p: number) {
	if (p >= 90) return 'Full';
	if (p >= 75) return 'High';
	if (p >= 50) return 'Moderate';
	return 'Normal';
}

// --- SEGBAR ---
function SegBar({ pct, total = 14 }: { pct: number; total?: number }) {
	const filled = Math.round((pct / 100) * total);
	return (
		<div style={{ display: 'flex', gap: 2 }}>
			{Array.from({ length: total }).map((_, i) =>
				i < filled ? (
					<div key={i} style={{ width: 10, height: 11, background: '#000', borderRadius: 2 }} />
				) : (
					<div key={i} style={{ width: 10, height: 11, background: 'transparent', border: '1.5px solid #000', borderRadius: 2 }} />
				)
			)}
		</div>
	);
}

// --- MAIN COMPONENT ---
export default async function ServersScreen() {
	// ===== FETCH LOCAL SERVER DATA =====
	// Read CPU temp directly from thermal_zone2 (x86_pkg_temp) — Linux only
	let localCpuTemp = 0;
	try {
		const cpuTempRaw = await fs.readFile('/sys/class/thermal/thermal_zone2/temp', 'utf-8');
		localCpuTemp = parseInt(cpuTempRaw.trim()) / 1000; // Convert from millidegrees
	} catch {
		// Not available in dev (macOS) or when running outside the target hardware
	}

	const [cpuLoad, mem, disk, uptime] = await Promise.all([
		si.currentLoad(),
		si.mem(),
		si.fsSize(),
		si.time(),
	]);

	// Calculate Local Server Values
	const localCpuLoad = cpuLoad.currentLoad || 0;

	// CRITICAL: Use mem.available to exclude Linux disk cache for accurate RAM usage
	const localMemUsed = mem.total - mem.available;
	const localMemPercent = (localMemUsed / mem.total) * 100;
	const localMemUsedGB = (localMemUsed / 1024 / 1024 / 1024).toFixed(1);
	const localMemTotalGB = (mem.total / 1024 / 1024 / 1024).toFixed(1);
	const localRamText = `${localMemUsedGB} / ${localMemTotalGB} GB`;

	// Get root filesystem usage
	const rootDisk = disk.find(d => d.mount === '/') || disk[0];
	const localDiskPercent = rootDisk ? rootDisk.use : 0;
	const localDiskUsedGB = rootDisk ? (rootDisk.used / 1024 / 1024 / 1024).toFixed(1) : '0';
	const localDiskTotalGB = rootDisk ? (rootDisk.size / 1024 / 1024 / 1024).toFixed(1) : '0';
	const localStorageText = `${localDiskPercent.toFixed(0)}%`;

	const localUptimeDays = (uptime.uptime / 86400).toFixed(0); // Convert seconds to days

	const localServerData: ServerData = {
		name: 'Mini PC',
		cpuLoad: localCpuLoad,
		cpuTemp: localCpuTemp,
		ramUsedPercent: localMemPercent,
		ramText: localRamText,
		storageUsedPercent: localDiskPercent,
		storageText: localStorageText,
		driveTemp: null, // Hard to get in Docker
		uptimeDays: localUptimeDays,
	};

	// ===== FETCH UGREEN NAS DATA =====
	const [nasCpu, nasCpuTemp, nasRam, nasUptime, nasHdSize, nasHdUsed, nasDiskTemp] = await Promise.all([
		getHaEntity(NAS_CPU_USAGE),
		getHaEntity(NAS_CPU_TEMP),
		getHaEntity(NAS_RAM_USAGE),
		getHaEntity(NAS_UPTIME),
		getHaEntity(NAS_HD_SIZE),
		getHaEntity(NAS_HD_USED),
		getHaEntity(NAS_DISK_TEMP),
	]);

	// Parse UGREEN Values (with fallbacks)
	const nasCpuLoad = nasCpu?.state ? parseFloat(nasCpu.state) : 0;
	const nasCpuTempValue = nasCpuTemp?.state ? parseFloat(nasCpuTemp.state) : 0;
	const nasRamPercent = nasRam?.state ? parseFloat(nasRam.state) : 0;

	// Calculate RAM in GB (assuming 8GB total - adjust if needed)
	const nasRamUsedGB = (nasRamPercent * 8 / 100).toFixed(1);
	const nasRamText = `${nasRamUsedGB} / 8 GB`;

	// Calculate Hard Drive Storage
	let nasStoragePercent = 0;
	let nasStorageText = 'N/A';
	if (nasHdSize?.state && nasHdUsed?.state) {
		const totalTB = parseFloat(nasHdSize.state);
		const usedTB = parseFloat(nasHdUsed.state);
		nasStoragePercent = (usedTB / totalTB) * 100;
		nasStorageText = `${usedTB.toFixed(1)} / ${totalTB.toFixed(1)} TB`;
	} else if (nasHdUsed?.state) {
		const usedTB = parseFloat(nasHdUsed.state);
		nasStorageText = `${usedTB.toFixed(1)} TB Used`;
	}

	// Parse Uptime (check if it's already in days, hours, or seconds)
	const nasUptimeRaw = nasUptime?.state ? parseFloat(nasUptime.state) : 0;
	// If the value is very large (like in seconds), convert to days
	// If it's already small (like already in days), use as is
	let nasUptimeDays: string;
	if (nasUptimeRaw > 1000) {
		// Likely in seconds or hours, convert to days
		nasUptimeDays = (nasUptimeRaw / 86400).toFixed(0); // Convert seconds to days
	} else {
		// Already in days or hours
		nasUptimeDays = nasUptimeRaw.toFixed(0);
	}

	// Parse Disk Temp
	const nasDiskTempValue = nasDiskTemp?.state ? parseFloat(nasDiskTemp.state) : null;

	const nasServerData: ServerData = {
		name: 'NAS',
		cpuLoad: nasCpuLoad,
		cpuTemp: nasCpuTempValue,
		ramUsedPercent: nasRamPercent,
		ramText: nasRamText,
		storageUsedPercent: nasStoragePercent,
		storageText: nasStorageText,
		driveTemp: nasDiskTempValue,
		uptimeDays: nasUptimeDays,
	};

	// ===== RENDER =====

	// Uptime display
	const localUptimeNum = parseFloat(localServerData.uptimeDays);
	const localUptimeDisplay = localUptimeNum > 31
		? `${(localUptimeNum / 30).toFixed(1)}mo`
		: `${localServerData.uptimeDays}d`;

	const nasUptimeNum = parseFloat(nasServerData.uptimeDays);
	const nasUptimeDisplay = nasUptimeNum > 31
		? `${(nasUptimeNum / 30).toFixed(1)}mo`
		: `${nasServerData.uptimeDays}d`;

	// Footer values
	const now = new Date();
	const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	const dateStr = now.toISOString().slice(0, 10);
	const lanIp = process.env.LAN_IP ?? '—';
	const wanIp = process.env.WAN_IP ?? '—';

	// Shared metric row styles
	const metricRow: React.CSSProperties = { border: '2px solid #000', borderRadius: 8, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 10 };
	const iconBox: React.CSSProperties = { width: 38, height: 38, border: '2px solid #000', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
	const metricLabel: React.CSSProperties = { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#555', marginBottom: 4, fontWeight: 600 };
	const metricValue: React.CSSProperties = { fontSize: 19, fontWeight: 700, color: '#000' };
	const metricSub: React.CSSProperties = { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#555', marginTop: 2, fontWeight: 600 };
	const metricRight: React.CSSProperties = { textAlign: 'right', minWidth: 80 };

	const sparkline = (
		<svg width="100%" height="18" viewBox="0 0 110 18" preserveAspectRatio="none">
			<polyline points="0,12 6,13 11,9 16,14 21,8 26,13 31,10 36,12 42,13 47,8 52,14 57,10 62,13 67,8 72,12 77,14 82,10 87,13 92,8 97,12 102,13 107,10 110,11" stroke="#000" strokeWidth="1.5" fill="none" />
		</svg>
	);

	return (
		<div className={barlow.className} style={{ width: 800, height: 480, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '10px 10px 8px', gap: 8 }}>

			{/* HEADER */}
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 4 }}>
				<div style={{ flex: 1, maxWidth: 120, height: 1.5, background: '#000' }} />
				<svg width="60" height="18" viewBox="0 0 60 18" fill="none">
					<polyline points="0,9 10,9 13,3 17,15 21,3 25,15 28,9 60,9" stroke="#000" strokeWidth="2" fill="none" />
				</svg>
				<span style={{ fontSize: 17, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: '#000' }}>Server Status</span>
				<svg width="60" height="18" viewBox="0 0 60 18" fill="none">
					<polyline points="0,9 32,9 35,3 39,15 43,3 47,15 50,9 60,9" stroke="#000" strokeWidth="2" fill="none" />
				</svg>
				<div style={{ flex: 1, maxWidth: 120, height: 1.5, background: '#000' }} />
			</div>

			{/* BODY */}
			<div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>

				{/* Mini PC Card */}
				<div style={{ border: '2px solid #000', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<Monitor size={22} color="#000" />
							<span style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#000' }}>Mini PC</span>
						</div>
						<div style={{ border: '2px solid #000', borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#000', display: 'flex', alignItems: 'center', gap: 5 }}>
							<Clock size={12} color="#000" />
							{localUptimeDisplay}
						</div>
					</div>

					{/* CPU Temp */}
					<div style={metricRow}>
						<div style={iconBox}><Thermometer size={19} color="#000" /></div>
						<div style={{ flex: 1 }}>
							<div style={metricLabel}>CPU Temp</div>
							<SegBar pct={Math.min(localCpuTemp, 100)} />
						</div>
						<div style={metricRight}>
							<div style={metricValue}>{localCpuTemp.toFixed(0)}°C</div>
							<div style={metricSub}>{tempStatus(localCpuTemp)}</div>
						</div>
					</div>

					{/* CPU Load */}
					<div style={metricRow}>
						<div style={iconBox}><Cpu size={19} color="#000" /></div>
						<div style={{ flex: 1 }}>
							<div style={metricLabel}>CPU Load</div>
							{sparkline}
						</div>
						<div style={metricRight}>
							<div style={metricValue}>{localCpuLoad.toFixed(1)}%</div>
							<div style={metricSub}>{cpuStatus(localCpuLoad)}</div>
						</div>
					</div>

					{/* RAM */}
					<div style={metricRow}>
						<div style={iconBox}><MemoryStick size={19} color="#000" /></div>
						<div style={{ flex: 1 }}>
							<div style={metricLabel}>RAM</div>
							<SegBar pct={localMemPercent} />
						</div>
						<div style={metricRight}>
							<div style={metricValue}>{localMemUsedGB}/{localMemTotalGB} GB</div>
							<div style={metricSub}>{Math.round(localMemPercent)}% · {ramStatus(Math.round(localMemPercent))}</div>
						</div>
					</div>

					{/* SSD */}
					<div style={metricRow}>
						<div style={iconBox}><HardDrive size={19} color="#000" /></div>
						<div style={{ flex: 1 }}>
							<div style={metricLabel}>SSD</div>
							<SegBar pct={localDiskPercent} />
						</div>
						<div style={metricRight}>
							<div style={metricValue}>{localDiskPercent.toFixed(0)}%</div>
							<div style={metricSub}>{localDiskUsedGB}/{localDiskTotalGB} GB</div>
						</div>
					</div>
				</div>

				{/* Connector Column */}
				<div style={{ width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
					<svg width="48" height="100%" viewBox="0 0 48 320" preserveAspectRatio="none">
						<line x1="24" y1="0" x2="24" y2="130" stroke="#000" strokeWidth="2" />
						<rect x="14" y="130" width="20" height="20" rx="4" fill="white" stroke="#000" strokeWidth="2" />
						<circle cx="19" cy="135" r="2" fill="#000" />
						<circle cx="29" cy="135" r="2" fill="#000" />
						<circle cx="19" cy="145" r="2" fill="#000" />
						<circle cx="29" cy="145" r="2" fill="#000" />
						<line x1="24" y1="150" x2="24" y2="320" stroke="#000" strokeWidth="2" />
					</svg>
				</div>

				{/* NAS Card */}
				<div style={{ border: '2px solid #000', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<Server size={22} color="#000" />
							<span style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#000' }}>NAS</span>
						</div>
						<div style={{ border: '2px solid #000', borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#000', display: 'flex', alignItems: 'center', gap: 5 }}>
							<Clock size={12} color="#000" />
							{nasUptimeDisplay}
						</div>
					</div>

					{/* CPU Temp */}
					<div style={metricRow}>
						<div style={iconBox}><Thermometer size={19} color="#000" /></div>
						<div style={{ flex: 1 }}>
							<div style={metricLabel}>CPU Temp</div>
							<SegBar pct={Math.min(nasCpuTempValue, 100)} />
						</div>
						<div style={metricRight}>
							<div style={metricValue}>{nasCpuTempValue.toFixed(0)}°C</div>
							<div style={metricSub}>{tempStatus(nasCpuTempValue)}</div>
						</div>
					</div>

					{/* CPU Load */}
					<div style={metricRow}>
						<div style={iconBox}><Cpu size={19} color="#000" /></div>
						<div style={{ flex: 1 }}>
							<div style={metricLabel}>CPU Load</div>
							{sparkline}
						</div>
						<div style={metricRight}>
							<div style={metricValue}>{nasCpuLoad.toFixed(1)}%</div>
							<div style={metricSub}>{cpuStatus(nasCpuLoad)}</div>
						</div>
					</div>

					{/* RAM */}
					<div style={metricRow}>
						<div style={iconBox}><MemoryStick size={19} color="#000" /></div>
						<div style={{ flex: 1 }}>
							<div style={metricLabel}>RAM</div>
							<SegBar pct={nasRamPercent} />
						</div>
						<div style={metricRight}>
							<div style={metricValue}>{nasRamText}</div>
							<div style={metricSub}>{Math.round(nasRamPercent)}% · {ramStatus(Math.round(nasRamPercent))}</div>
						</div>
					</div>

					{/* HDD */}
					<div style={metricRow}>
						<div style={iconBox}><HardDrive size={19} color="#000" /></div>
						<div style={{ flex: 1 }}>
							<div style={metricLabel}>HDD</div>
							<SegBar pct={nasStoragePercent} />
						</div>
						<div style={metricRight}>
							<div style={metricValue}>{nasStorageText}</div>
							<div style={metricSub}>{nasStoragePercent.toFixed(0)}% · {hdStatus(Math.round(nasStoragePercent))}</div>
						</div>
					</div>
				</div>
			</div>

			{/* FOOTER */}
			<div style={{ border: '2px solid #000', borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 18px', height: 40, flexShrink: 0 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
					<Clock size={16} color="#000" />
					<div>
						<div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#666', fontWeight: 600 }}>Time</div>
						<div style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>{timeStr}</div>
					</div>
				</div>
				<div style={{ width: 1.5, height: 22, background: '#bbb' }} />
				<div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
					<Calendar size={16} color="#000" />
					<div>
						<div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#666', fontWeight: 600 }}>Date</div>
						<div style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>{dateStr}</div>
					</div>
				</div>
				<div style={{ width: 1.5, height: 22, background: '#bbb' }} />
				<div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
					<Network size={16} color="#000" />
					<div>
						<div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#666', fontWeight: 600 }}>LAN</div>
						<div style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>{lanIp}</div>
					</div>
				</div>
				<div style={{ width: 1.5, height: 22, background: '#bbb' }} />
				<div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
					<Globe size={16} color="#000" />
					<div>
						<div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#666', fontWeight: 600 }}>WAN</div>
						<div style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>{wanIp}</div>
					</div>
				</div>
			</div>
		</div>
	);
}
