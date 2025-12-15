import si from 'systeminformation';
import PageHeader from '@/app/components/PageHeader';

export default async function SystemScreen() {
	// Fetch system information
	const [cpuTemp, cpuLoad, mem, disk, uptime] = await Promise.all([
		si.cpuTemperature(),
		si.currentLoad(),
		si.mem(),
		si.fsSize(),
		si.time(),
	]);

	// Calculate values
	const cpuTempValue = cpuTemp.main || 0;
	const cpuLoadValue = cpuLoad.currentLoad || 0;
	const memUsedGB = (mem.used / 1024 / 1024 / 1024).toFixed(1);
	const memTotalGB = (mem.total / 1024 / 1024 / 1024).toFixed(1);
	const uptimeHours = (uptime.uptime / 3600).toFixed(1);

	// Get root filesystem usage
	const rootDisk = disk.find(d => d.mount === '/') || disk[0];
	const diskUsedGB = rootDisk ? (rootDisk.used / 1024 / 1024 / 1024).toFixed(1) : '0';
	const diskTotalGB = rootDisk ? (rootDisk.size / 1024 / 1024 / 1024).toFixed(1) : '0';
	const diskUsePercent = rootDisk ? rootDisk.use.toFixed(1) : '0';

	return (
		<div className="w-[800px] h-[480px] bg-white p-8 flex flex-col font-chareink">
			<PageHeader title="System Status" />

			<div className="grid grid-cols-2 grid-rows-2 gap-6 flex-1">
				{/* CPU Load */}
				<div className="border-2 border-black p-6 flex flex-col justify-between">
					<div className="text-sm font-medium mb-2">CPU LOAD</div>
					<div className="text-6xl font-bold">{cpuLoadValue.toFixed(1)}%</div>
				</div>

				{/* CPU Temperature */}
				<div className="border-2 border-black p-6 flex flex-col justify-between">
					<div className="text-sm font-medium mb-2">CPU TEMP</div>
					<div className="text-6xl font-bold">{cpuTempValue.toFixed(1)}°C</div>
				</div>

				{/* RAM Usage */}
				<div className="border-2 border-black p-6 flex flex-col justify-between">
					<div className="text-sm font-medium mb-2">RAM USAGE</div>
					<div className="text-6xl font-bold">{memUsedGB}/{memTotalGB} GB</div>
				</div>

				{/* Disk Usage */}
				<div className="border-2 border-black p-6 flex flex-col justify-between">
					<div className="text-sm font-medium mb-2">DISK USAGE</div>
					<div className="text-5xl font-bold">{diskUsedGB}/{diskTotalGB} GB</div>
					<div className="text-2xl mt-2">({diskUsePercent}%)</div>
				</div>
			</div>

			{/* Uptime at bottom */}
			<div className="mt-6 text-center text-xl">
				Uptime: {uptimeHours} hours
			</div>
		</div>
	);
}
