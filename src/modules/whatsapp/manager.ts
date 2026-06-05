import { prisma } from "@/lib/prisma";
import { WhatsAppInstance } from "./instance";
import { Server } from "socket.io";
import { initScheduler } from "@/lib/cron";
import { logger } from "@/lib/logger";
import { randomizeBrowser } from "@/lib/browser-fingerprint";
import { getMachineId } from "@/lib/machine-id";
import { antispam } from "./antispam";

export class WhatsAppManager {
    private static instance: WhatsAppManager;
    private sessions: Map<string, WhatsAppInstance> = new Map();
    public io: Server | null = null;

    private constructor() {
        initScheduler();
    }

    public static getInstance(): WhatsAppManager {
        if (!WhatsAppManager.instance) {
            WhatsAppManager.instance = new WhatsAppManager();
        }
        return WhatsAppManager.instance;
    }

    setup(io: Server) {
        this.io = io;
    }

    async loadSessions() {
        if (!this.io) throw new Error("Socket.IO not initialized in WhatsAppManager");
        
        const machineId = getMachineId();
        logger.info("Manager", `Machine ID: ${machineId}`);
        
        // Load sessions assigned to this machine OR unassigned sessions
        const sessions = await prisma.session.findMany({
            where: {
                status: { not: "LOGGED_OUT" },
                OR: [
                    { assignedTo: machineId },
                    { assignedTo: null }
                ]
            }
        });

        // Auto-bind unassigned sessions to this machine
        let boundCount = 0;
        for (const session of sessions) {
            if (session.assignedTo === null) {
                await prisma.session.update({
                    where: { sessionId: session.sessionId },
                    data: { assignedTo: machineId }
                });
                session.assignedTo = machineId;
                boundCount++;
            }
        }

        // Initialize WhatsApp instances for loaded sessions
        for (const session of sessions) {
            const instance = new WhatsAppInstance(session.sessionId, session.userId, this.io);
            this.sessions.set(session.sessionId, instance);
            await instance.init();
        }
        
        logger.success("Manager", `Loaded ${sessions.length} sessions. Bound ${boundCount} unassigned sessions.`);
    }

    async createSession(userId: string, name: string, customSessionId?: string, proxyUrl?: string) {
        // Fallback to global IO if instance IO is missing (Next.js Context Issue)
        if (!this.io && (global as any).io) {
            this.io = (global as any).io;
        }

        if (!this.io) {
            logger.error("Manager", "Socket.IO not initialized in WhatsAppManager, and global fallback failed.");
            throw new Error("Socket.IO not initialized");
        }

        // Use custom ID if provided, otherwise generate random
        const sessionId = customSessionId || Math.random().toString(36).substring(7);

        const browserFingerprint = randomizeBrowser();
        const machineId = getMachineId();

        const session = await prisma.session.create({
            data: {
                userId,
                name,
                sessionId,
                status: "DISCONNECTED",
                assignedTo: machineId,
                config: { browserFingerprint, ...(proxyUrl && { proxyUrl }) },
                botConfig: {
                    create: {
                        enabled: true,
                        botMode: "OWNER",
                        autoReplyMode: "ALL"
                    }
                }
            }
        });

        const instance = new WhatsAppInstance(sessionId, userId, this.io);
        this.sessions.set(sessionId, instance);
        await instance.init();

        return session;
    }

    public getInstance(sessionId: string) {
        return this.sessions.get(sessionId);
    }

    async deleteSession(sessionId: string) {
        const instance = this.sessions.get(sessionId);
        if (instance) {
            instance.isStopped = true;
            try {
                await instance.socket?.logout();
            } catch (e) {
                logger.warn("Manager", `Logout warning for ${sessionId}:`, e);
            }
            
            await instance.destroy();
            this.sessions.delete(sessionId);
        }
        
        antispam.clearSession(sessionId);
        
        await prisma.$transaction([
            prisma.authState.deleteMany({ where: { sessionId } }),
            prisma.session.deleteMany({ where: { sessionId } }),
        ]);
    }

    async stopSession(sessionId: string) {
        const instance = this.sessions.get(sessionId);
        if (instance) {
            instance.isStopped = true; // Prevent auto-reconnect
            if (instance.socket) {
                instance.socket.ev.removeAllListeners("connection.update");
                instance.socket.ev.removeAllListeners("creds.update");
            }
            instance.socket?.end(undefined);
            instance.status = "STOPPED";
        this.io?.to(sessionId).emit("connection.update", { status: "STOPPED", qr: null, sessionId });
        await prisma.session.update({
                where: { sessionId },
                data: { status: "STOPPED", qr: null }
            });
        }
    }

    async startSession(sessionId: string) {
        // If already running, do nothing
        const existingInstance = this.sessions.get(sessionId);
        if (existingInstance && existingInstance.status === "CONNECTED") {
            return;
        }

        const session = await prisma.session.findUnique({ where: { sessionId } });
        if (!session) throw new Error("Session not found");

        const oldInstance = this.sessions.get(sessionId);
        if (oldInstance) {
            oldInstance.isStopped = true;
            if (oldInstance.socket) {
                oldInstance.socket.ev.removeAllListeners("connection.update");
                oldInstance.socket.ev.removeAllListeners("creds.update");
                oldInstance.socket.end(undefined);
            }
        }

        const instance = new WhatsAppInstance(sessionId, session.userId, this.io!);
        this.sessions.set(sessionId, instance);
        await instance.init();

        // Sync DB from stale STOPPED (set by stopSession) to current instance state
        await prisma.session.update({
            where: { sessionId },
            data: { status: instance.status, qr: instance.qr }
        }).catch((e: any) => {
            if (e.code !== 'P2025') {
                logger.error("Manager", `Failed to sync session DB after start:`, e);
            }
        });

        this.io?.to(sessionId).emit("connection.update", {
            status: instance.status,
            qr: instance.qr,
            sessionId
        });
    }

    async restartSession(sessionId: string) {
        await this.stopSession(sessionId);
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.startSession(sessionId);
    }

    async requestPairingCode(sessionId: string, phoneNumber: string) {
        const instance = this.sessions.get(sessionId);
        if (!instance) throw new Error("Instance not found or not running");
        return await instance.requestPairingCode(phoneNumber);
    }
}

const globalForWhatsapp = global as unknown as { waManager: WhatsAppManager };

export const waManager = globalForWhatsapp.waManager || WhatsAppManager.getInstance();

// Always store in global to ensure singleton across Next.js compilations/chunks
globalForWhatsapp.waManager = waManager;
