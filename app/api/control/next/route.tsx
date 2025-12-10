import { NextResponse } from "next/server";
import { advanceCycle } from "@/lib/director";

export const dynamic = "force-dynamic";

export async function POST() {
	try {
		console.log("[API] Manual 'Next' triggered via API");
		await advanceCycle();
		return NextResponse.json({ success: true, message: "Cycle advanced" });
	} catch (error) {
		console.error("[API] Failed to advance cycle:", error);
		return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
	}
}
