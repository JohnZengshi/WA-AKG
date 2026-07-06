import { Server } from "socket.io";
import { logger } from "../lib/logger";

/**
 * Check if any connected client in the session room supports DUPLICATE_ACCOUNT status.
 * Returns true if at least one socket has supportDuplicateAccountStatus flag set.
 */
export function roomSupportsDuplicateStatus(io: Server, sessionId: string): boolean {
    const room = io.sockets.adapter.rooms.get(sessionId);
    if (!room) return false;
    for (const socketId of room) {
        const s = io.sockets.sockets.get(socketId);
        if (s?.data?.supportDuplicateAccountStatus) return true;
    }
    return false;
}

export function setupSocket(io: Server) {
    io.on("connection", (socket) => {
        logger.info("Socket", "Client connected:", socket.id);

        socket.data.supportDuplicateAccountStatus = false;

        socket.on("disconnect", () => {
            logger.info("Socket", "Client disconnected:", socket.id);
        });

        // Handle joining room for specific WA session
        // Accepts both legacy string sessionId and new object format:
        //   { sessionId: string, supportDuplicateAccountStatus?: boolean }
        socket.on("join-session", (data: string | { sessionId: string; supportDuplicateAccountStatus?: boolean }) => {
            const payload = typeof data === "string"
                ? { sessionId: data, supportDuplicateAccountStatus: false }
                : data;

            socket.join(payload.sessionId);
            socket.data.supportDuplicateAccountStatus = !!payload.supportDuplicateAccountStatus;

            logger.debug("Socket", `Socket ${socket.id} joined session room: ${payload.sessionId} (dupStatus: ${payload.supportDuplicateAccountStatus})`);
        });

        // Handle joining user-specific room for notifications
        socket.on("join-user-room", (userId: string) => {
            socket.join(`user:${userId}`);
            logger.debug("Socket", `Socket ${socket.id} joined user room: user:${userId}`);
        });
    });
}
