import { NextResponse, NextRequest } from "next/server";
import { waManager } from "@/modules/whatsapp/manager";
import { getAuthenticatedUser, canAccessSession } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

const BATCH_DELETE_LIMIT = 50;
const DELETE_TIMEOUT_MS = 30000;
const TIMEOUT_ERROR_MESSAGE = "delete timed out";

interface BatchDeleteResult {
    deleted: number;
    failed: number;
    errors: string[];
}

interface TaskResult {
    sessionId: string;
    success: boolean;
    error?: string;
}

function createTimeout(signal: AbortController): Promise<never> {
    return new Promise((_, reject) => {
        const timer = setTimeout(() => {
            signal.abort();
            reject(new Error(TIMEOUT_ERROR_MESSAGE));
        }, DELETE_TIMEOUT_MS);
        signal.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
    });
}

async function deleteSessionWithTimeout(sessionId: string): Promise<void> {
    const controller = new AbortController();
    await Promise.race([
        waManager.deleteSession(sessionId),
        createTimeout(controller),
    ]);
}

async function processDelete(sessionId: string, userId: string, userRole: string): Promise<TaskResult> {
    try {
        const canAccess = await canAccessSession(userId, userRole, sessionId);
        if (!canAccess) {
            return { sessionId, success: false, error: "Forbidden" };
        }

        await deleteSessionWithTimeout(sessionId);
        return { sessionId, success: true };
    } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return { sessionId, success: false, error: message };
    }
}

function aggregateResults(tasks: TaskResult[]): BatchDeleteResult {
    const results: BatchDeleteResult = { deleted: 0, failed: 0, errors: [] };
    for (const result of tasks) {
        if (result.success) {
            results.deleted++;
        } else {
            results.failed++;
            results.errors.push(`${result.sessionId}: ${result.error}`);
        }
    }
    return results;
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return NextResponse.json(
                { status: false, message: "Unauthorized", error: "Unauthorized" },
                { status: 401 }
            );
        }

        let sessionIds: string[];
        try {
            const body = await request.json();
            sessionIds = body?.sessionIds;
        } catch {
            return NextResponse.json(
                { status: false, message: "Invalid JSON body", error: "Invalid JSON body" },
                { status: 400 }
            );
        }

        if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
            return NextResponse.json(
                { status: false, message: "sessionIds array is required", error: "sessionIds array is required" },
                { status: 400 }
            );
        }

        if (sessionIds.length > BATCH_DELETE_LIMIT) {
            return NextResponse.json(
                { status: false, message: `Maximum ${BATCH_DELETE_LIMIT} sessions per batch`, error: `Maximum ${BATCH_DELETE_LIMIT} sessions per batch` },
                { status: 400 }
            );
        }

        const taskResults = await Promise.all(
            sessionIds.map(sid => processDelete(sid, user.id, user.role))
        );

        const results = aggregateResults(taskResults);

        logger.info("Manager", `Batch delete: ${results.deleted} deleted, ${results.failed} failed`);

        return NextResponse.json({
            status: true,
            message: `Batch delete completed: ${results.deleted} deleted, ${results.failed} failed`,
            data: results
        });

    } catch (e) {
        logger.error("Manager", "Batch delete sessions error:", e);
        return NextResponse.json(
            { status: false, message: "Failed to batch delete sessions", error: "Failed to batch delete sessions" },
            { status: 500 }
        );
    }
}
