import { NextResponse } from "next/server";
import { getMachineId } from "@/lib/machine-id";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const machineId = getMachineId();
        return NextResponse.json({
            status: true,
            machineId,
        });
    } catch (error: any) {
        console.error("Machine ID API Error:", error);
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
