import { NextResponse } from "next/server";

export async function GET(request: Request) {
	// 1. Calculate your Dynamic Sleep logic
	// Example logic:
	const sleepDuration = 60; // Calculate this based on your database/logic

	const data = {
		sleep_duration: sleepDuration,
	};

	// 2. Convert to string explicitly
	const jsonString = JSON.stringify(data);

	// 3. Create the response object
	return new NextResponse(jsonString, {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			// CRITICAL: Calculate byte length and set header explicitly
			"Content-Length": Buffer.byteLength(jsonString).toString(),
		},
	});
}
