import { NextResponse, NextRequest } from "next/server";
import { waManager } from "@/modules/whatsapp/manager";
import { getAuthenticatedUser, canAccessSession } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return NextResponse.json(
                { status: false, message: "Unauthorized", error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { sessionIds } = body;

        if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
            return NextResponse.json(
                { status: false, message: "sessionIds array is required", error: "sessionIds array is required" },
                { status: 400 }
            );
        }

        if (sessionIds.length > 50) {
            return NextResponse.json(
                { status: false, message: "Maximum 50 sessions per batch", error: "Maximum 50 sessions per batch" },
                { status: 400 }
            );
        }

        const results = {
            deleted: 0,
            failed: 0,
            errors: [] as string[]
        };

        const deleteWithTimeout = async (sessionId: string) => {
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Timeout")), 30000)
            );
            return Promise.race([
                waManager.deleteSession(sessionId),
                timeout
            ]);
        };

        const tasks = sessionIds.map(async (sessionId) => {
            try {
                const canAccess = await canAccessSession(user.id, user.role, sessionId);
                if (!canAccess) {
                    return { sessionId, success: false, error: "Forbidden" };
                }

                await deleteWithTimeout(sessionId);
                return { sessionId, success: true };
            } catch (e) {
                return { sessionId, success: false, error: e instanceof Error ? e.message : "Failed" };
            }
        });

        const settled = await Promise.allSettled(tasks);
        for (const result of settled) {
            if (result.status === "fulfilled") {
                if (result.value.success) {
                    results.deleted++;
                } else {
                    results.failed++;
                    results.errors.push(`${result.value.sessionId}: ${result.value.error}`);
                }
            } else {
                results.failed++;
                results.errors.push(`Unknown: ${result.reason}`);
            }
        }

        return NextResponse.json({
            status: true,
            message: `Batch delete completed: ${results.deleted} deleted, ${results.failed} failed`,
            data: results
        });

    } catch (e) {
        console.error("Batch delete sessions error:", e);
        return NextResponse.json(
            { status: false, message: "Failed to batch delete sessions", error: "Failed to batch delete sessions" },
            { status: 500 }
        );
    }
}
