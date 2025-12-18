import si from 'systeminformation';
import PageHeader from '@/app/components/PageHeader';
import { getHaEntity } from '@/lib/ha';
import { Server, Cpu, MemoryStick, HardDrive, Database, Clock } from 'lucide-react';

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

// --- REUSABLE COMPONENT ---
function ServerColumn({ data }: { data: ServerData }) {
	// Format uptime: show months if over 31 days
	const uptimeDaysNum = parseFloat(data.uptimeDays);
	let uptimeDisplay = `${data.uptimeDays}d`;
	if (uptimeDaysNum > 31) {
		const months = (uptimeDaysNum / 30).toFixed(1);
		uptimeDisplay = `${months}mo`;
	}

	return (
		<div className="p-6 flex flex-col justify-between h-full">
			{/* Header */}
			<div className="flex items-center justify-between mb-5">
				<div className="flex items-center gap-2">
					<Server className="w-6 h-6" />
					<div className="text-2xl font-black tracking-tight">{data.name}</div>
				</div>
				<div className="bg-black text-white px-3 py-1 rounded-full flex items-center gap-1.5">
					<Clock className="w-4 h-4" />
					<span className="text-sm font-medium">{uptimeDisplay}</span>
				</div>
			</div>

			{/* Metrics List */}
			<div className="flex flex-col gap-5 flex-1">
				{/* CPU Temperature */}
				<div className="flex flex-col gap-1.5">
					<div className="flex items-end justify-between">
						<div className="flex items-center gap-2">
							<Cpu className="w-5 h-5" />
							<span className="text-lg font-bold">CPU Temp</span>
						</div>
						<div className="text-lg font-normal">{data.cpuTemp.toFixed(0)}°C</div>
					</div>
				</div>

				{/* CPU Load */}
				<div className="flex flex-col gap-1.5">
					<div className="flex items-end justify-between">
						<div className="flex items-center gap-2">
							<Cpu className="w-5 h-5" />
							<span className="text-lg font-bold">CPU</span>
						</div>
						<div className="text-lg font-normal">{data.cpuLoad.toFixed(1)}%</div>
					</div>
					<div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
						<div
							className="h-full bg-black rounded-full transition-all"
							style={{ width: `${data.cpuLoad}%` }}
						/>
					</div>
				</div>

				{/* RAM */}
				<div className="flex flex-col gap-1.5">
					<div className="flex items-end justify-between">
						<div className="flex items-center gap-2">
							<MemoryStick className="w-5 h-5" />
							<span className="text-lg font-bold">RAM</span>
						</div>
						<div className="text-lg font-normal">{data.ramText}</div>
					</div>
					<div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
						<div
							className="h-full bg-black rounded-full transition-all"
							style={{ width: `${data.ramUsedPercent}%` }}
						/>
					</div>
				</div>

				{/* Storage */}
				<div className="flex flex-col gap-1.5">
					<div className="flex items-end justify-between">
						<div className="flex items-center gap-2">
							{data.name.includes('NAS') ? (
								<HardDrive className="w-5 h-5" />
							) : (
								<HardDrive className="w-5 h-5" />
							)}
							<span className="text-lg font-bold">{data.name.includes('NAS') ? 'HD' : 'SSD'}</span>
							{data.driveTemp !== null && (
								<div className="text-xs font-medium border border-black rounded-xl px-2 py-0.5">
									{data.driveTemp.toFixed(0)}°
								</div>
							)}
						</div>
						<div className="text-lg font-normal">{data.storageText}</div>
					</div>
					<div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
						<div
							className="h-full bg-black rounded-full transition-all"
							style={{ width: `${data.storageUsedPercent}%` }}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

// --- MAIN COMPONENT ---
export default async function ServersScreen() {
	// ===== FETCH LOCAL SERVER DATA =====
	const [cpuTemp, cpuLoad, mem, disk, uptime] = await Promise.all([
		si.cpuTemperature(),
		si.currentLoad(),
		si.mem(),
		si.fsSize(),
		si.time(),
	]);

	// Calculate Local Server Values
	const localCpuLoad = cpuLoad.currentLoad || 0;
	const localCpuTemp = cpuTemp.main || 0;
	const localMemPercent = (mem.used / mem.total) * 100;
	const localMemUsedGB = (mem.used / 1024 / 1024 / 1024).toFixed(1);
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
	return (
		<div className="w-[800px] h-[480px] bg-white p-4 flex flex-col font-chareink relative">
			<div className="grid grid-cols-2 gap-4 h-full">
				{/* LEFT COLUMN: Mini PC */}
				<ServerColumn data={localServerData} />

				{/* RIGHT COLUMN: NAS */}
				<ServerColumn data={nasServerData} />
			</div>

			{/* Center Separator Line - 70% height, centered vertically */}
			<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-[70%] bg-gray-300" />
		</div>
	);
}
