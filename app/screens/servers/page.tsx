import si from 'systeminformation';
import PageHeader from '@/app/components/PageHeader';
import { getHaEntity } from '@/lib/ha';
import { Server, Database, Thermometer, Activity, Clock, HardDrive } from 'lucide-react';

// UGREEN NAS Entity IDs - Edit these to match your Home Assistant setup
const UGREEN_CPU = 'sensor.ugreen_nas_cpu_usage';
const UGREEN_RAM = 'sensor.ugreen_nas_ram_usage';
const UGREEN_TEMP = 'sensor.ugreen_nas_cpu_temperature';
const UGREEN_UPTIME = 'sensor.ugreen_nas_total_runtime';
const UGREEN_STORAGE_FREE = 'sensor.ugreen_nas_pool_1_available_size';
const UGREEN_STORAGE_TOTAL = 'sensor.ugreen_nas_pool_1_total_size';

export default async function ServersScreen() {
	// Fetch Local Server Information
	const [cpuTemp, cpuLoad, mem, uptime] = await Promise.all([
		si.cpuTemperature(),
		si.currentLoad(),
		si.mem(),
		si.time(),
	]);

	// Calculate Local Server Values
	const localCpuLoad = (cpuLoad.currentLoad || 0).toFixed(1);
	const localCpuTemp = (cpuTemp.main || 0).toFixed(1);
	const localMemUsedGB = (mem.used / 1024 / 1024 / 1024).toFixed(1);
	const localMemTotalGB = (mem.total / 1024 / 1024 / 1024).toFixed(1);
	const localMemPercent = ((mem.used / mem.total) * 100).toFixed(1);
	const localUptimeHours = (uptime.uptime / 3600).toFixed(1);

	// Fetch UGREEN NAS Information from Home Assistant
	const [ugreenCpu, ugreenRam, ugreenTemp, ugreenUptime, ugreenStorageFree, ugreenStorageTotal] = await Promise.all([
		getHaEntity(UGREEN_CPU),
		getHaEntity(UGREEN_RAM),
		getHaEntity(UGREEN_TEMP),
		getHaEntity(UGREEN_UPTIME),
		getHaEntity(UGREEN_STORAGE_FREE),
		getHaEntity(UGREEN_STORAGE_TOTAL),
	]);

	// Parse UGREEN Values (with fallbacks)
	const ugreenCpuValue = ugreenCpu?.state ? parseFloat(ugreenCpu.state) : 0;
	const ugreenRamValue = ugreenRam?.state ? parseFloat(ugreenRam.state) : 0;
	const ugreenTempValue = ugreenTemp?.state ? parseFloat(ugreenTemp.state) : 0;
	const ugreenUptimeValue = ugreenUptime?.state || '0h';

	// Calculate Storage Usage
	let storageDisplay = 'N/A';
	let storagePercent = 0;

	if (ugreenStorageTotal?.state && ugreenStorageFree?.state) {
		const totalTB = parseFloat(ugreenStorageTotal.state);
		const freeTB = parseFloat(ugreenStorageFree.state);
		const usedTB = totalTB - freeTB;
		storagePercent = ((usedTB / totalTB) * 100);
		storageDisplay = `${usedTB.toFixed(1)}/${totalTB.toFixed(1)} TB`;
	} else if (ugreenStorageFree?.state) {
		const freeTB = parseFloat(ugreenStorageFree.state);
		storageDisplay = `${freeTB.toFixed(1)} TB Free`;
	}

	return (
		<div className="w-[800px] h-[480px] bg-white p-6 flex flex-col font-chareink">
			<PageHeader title="Infrastructure" />

			<div className="grid grid-cols-2 gap-0 flex-1 mt-4">
				{/* LEFT COLUMN: Carbon Node */}
				<div className="flex flex-col gap-2 pr-3 border-r-2 border-black">
					{/* Carbon Node Header */}
					<div className="border-2 border-black p-2">
						<div className="flex items-center gap-2">
							<Server className="w-5 h-5" />
							<div className="text-lg font-bold">CARBON NODE</div>
						</div>
					</div>

					{/* Local CPU Load */}
					<div className="border-2 border-black p-2 flex flex-col">
						<div className="flex items-center gap-2 mb-1">
							<Activity className="w-4 h-4" />
							<div className="text-xs font-medium">CPU LOAD</div>
						</div>
						<div className="text-3xl font-bold mb-1">{localCpuLoad}%</div>
						<div className="w-full h-2 border border-black bg-white">
							<div
								className="h-full bg-black transition-all"
								style={{ width: `${localCpuLoad}%` }}
							/>
						</div>
					</div>

					{/* Local RAM Usage */}
					<div className="border-2 border-black p-2 flex flex-col">
						<div className="flex items-center gap-2 mb-1">
							<Database className="w-4 h-4" />
							<div className="text-xs font-medium">RAM USAGE</div>
						</div>
						<div className="text-2xl font-bold mb-1">{localMemUsedGB}/{localMemTotalGB} GB</div>
						<div className="w-full h-2 border border-black bg-white">
							<div
								className="h-full bg-black transition-all"
								style={{ width: `${localMemPercent}%` }}
							/>
						</div>
					</div>

					{/* Local CPU Temp */}
					<div className="border-2 border-black p-2 flex flex-col">
						<div className="flex items-center gap-2 mb-1">
							<Thermometer className="w-4 h-4" />
							<div className="text-xs font-medium">CPU TEMP</div>
						</div>
						<div className="text-3xl font-bold">{localCpuTemp}°C</div>
					</div>

					{/* Local Uptime */}
					<div className="border-2 border-black p-2 flex flex-col">
						<div className="flex items-center gap-2 mb-1">
							<Clock className="w-4 h-4" />
							<div className="text-xs font-medium">UPTIME</div>
						</div>
						<div className="text-xl font-bold">{localUptimeHours}h</div>
					</div>
				</div>

				{/* RIGHT COLUMN: UGREEN NAS */}
				<div className="flex flex-col gap-2 pl-3">
					{/* UGREEN NAS Header */}
					<div className="border-2 border-black p-2">
						<div className="flex items-center gap-2">
							<Server className="w-5 h-5" />
							<div className="text-lg font-bold">UGREEN NAS</div>
						</div>
					</div>

					{/* UGREEN CPU Usage */}
					<div className="border-2 border-black p-2 flex flex-col">
						<div className="flex items-center gap-2 mb-1">
							<Activity className="w-4 h-4" />
							<div className="text-xs font-medium">CPU USAGE</div>
						</div>
						<div className="text-3xl font-bold mb-1">{ugreenCpuValue.toFixed(1)}%</div>
						<div className="w-full h-2 border border-black bg-white">
							<div
								className="h-full bg-black transition-all"
								style={{ width: `${ugreenCpuValue}%` }}
							/>
						</div>
					</div>

					{/* UGREEN RAM Usage */}
					<div className="border-2 border-black p-2 flex flex-col">
						<div className="flex items-center gap-2 mb-1">
							<Database className="w-4 h-4" />
							<div className="text-xs font-medium">RAM USAGE</div>
						</div>
						<div className="text-3xl font-bold mb-1">{ugreenRamValue.toFixed(1)}%</div>
						<div className="w-full h-2 border border-black bg-white">
							<div
								className="h-full bg-black transition-all"
								style={{ width: `${ugreenRamValue}%` }}
							/>
						</div>
					</div>

					{/* UGREEN Temperature */}
					<div className="border-2 border-black p-2 flex flex-col">
						<div className="flex items-center gap-2 mb-1">
							<Thermometer className="w-4 h-4" />
							<div className="text-xs font-medium">TEMPERATURE</div>
						</div>
						<div className="text-3xl font-bold">{ugreenTempValue.toFixed(1)}°C</div>
					</div>

					{/* UGREEN Storage */}
					<div className="border-2 border-black p-2 flex flex-col">
						<div className="flex items-center gap-2 mb-1">
							<HardDrive className="w-4 h-4" />
							<div className="text-xs font-medium">STORAGE (POOL 1)</div>
						</div>
						<div className="text-2xl font-bold mb-1">{storageDisplay}</div>
						{storagePercent > 0 && (
							<div className="w-full h-2 border border-black bg-white">
								<div
									className="h-full bg-black transition-all"
									style={{ width: `${storagePercent}%` }}
								/>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
