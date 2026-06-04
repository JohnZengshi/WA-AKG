import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    WASocket,
    ConnectionState
} from "@whiskeysockets/baileys";
import { prisma } from "@/lib/prisma";
import { usePrismaAuthState } from "./auth/usePrismaAuthState";
import { Server } from "socket.io";
import pino from "pino";
import { bindSessionStore } from "./store";
import { syncGroups } from "./store/groups";
import { bindContactSync } from "./store/contacts";
import { bindAutoReply } from "./store/autoreply";
import { bindPpGuard } from "./store/ppguard";
import { antispam } from "./antispam";
import { logger } from "@/lib/logger";
import { getOrCreateFingerprint, buildBrowserDescription, validateFingerprint } from "@/lib/browser-fingerprint";
import { createProxyAgent } from "@/lib/proxy-agent";

export class WhatsAppInstance {
    socket: WASocket | null = null;
    qr: string | null = null;
    rq: string | null = null;
    status: string = "DISCONNECTED";
    sessionId: string;
    userId: string;
    io: Server;
    config: any = {};
    startTime: Date | null = null;
    pairingCode: string | null = null;

    isStopped: boolean = false;

    // Reconnection control
    private reconnectAttempts: number = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private initLock: boolean = false;
    private readonly MAX_RECONNECT_DELAY = 30000; // 30s cap
    private readonly INITIAL_RECONNECT_DELAY = 2000; // 2s first retry

    get isInitializing(): boolean {
        return this.initLock;
    }

    constructor(sessionId: string, userId: string, io: Server) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.io = io;
    }

    async destroy(): Promise<void> {
        this.isStopped = true;

        const waitForInitLock = async (): Promise<void> => {
            if (!this.initLock) return;
            await new Promise<void>(resolve => {
                const check = () => {
                    if (!this.initLock) {
                        resolve();
                    } else {
                        setTimeout(check, 50);
                    }
                };
                setTimeout(() => resolve(), 5000);
                check();
            });
        };

        await waitForInitLock();

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.socket) {
            try {
                this.socket.ev.removeAllListeners("connection.update");
                this.socket.ev.removeAllListeners("creds.update");
                this.socket.end(undefined);
            } catch (e) {
                logger.warn("Instance", `Cleanup error for ${this.sessionId}:`, e);
            }
            this.socket = null;
        }
    }

    async init() {
        if (this.initLock) return;
        this.initLock = true;

        try {
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }

            if (this.socket) {
                try {
                    this.socket.ev.removeAllListeners("connection.update");
                    this.socket.ev.removeAllListeners("creds.update");
                    this.socket.end(undefined);
                } catch (e) {}
                this.socket = null;
            }

            if (this.isStopped) return;

            const sessionData = await prisma.session.findUnique({
                where: { sessionId: this.sessionId },
                include: { botConfig: true }
            });
            
            if (this.isStopped) return;
            
            this.config = sessionData?.config || {};
            const botConfig = (sessionData as any)?.botConfig;
            const sessionConfig = (sessionData?.config as Record<string, any>) || {};

            const { state, saveCreds } = await usePrismaAuthState(this.sessionId, () => this.isStopped);
            
            if (this.isStopped) return;
            
            const { version } = await fetchLatestBaileysVersion();

            const proxyConfig = await createProxyAgent({
                proxyUrl: sessionConfig.proxyUrl || null,
                sessionId: this.sessionId,
            });

            let browserFingerprint = sessionConfig.browserFingerprint;
            if (!validateFingerprint(browserFingerprint)) {
                browserFingerprint = await getOrCreateFingerprint(this.sessionId, () => this.isStopped);
            }

            if (this.isStopped) return;

            this.socket = makeWASocket({
                version,
                logger: pino({ level: process.env.BAILEYS_LOG_LEVEL || "error" }) as any,
                printQRInTerminal: false,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: process.env.BAILEYS_LOG_LEVEL || "error" }) as any),
                },
                browser: buildBrowserDescription(browserFingerprint),
                agent: proxyConfig.agent,
                fetchAgent: proxyConfig.fetchAgent,
                markOnlineOnConnect: botConfig?.alwaysOnline ?? true,
                syncFullHistory: true,
            });

            const originalSendMessage = this.socket.sendMessage.bind(this.socket);
            const sessionId = this.sessionId;
            this.socket.sendMessage = async function (jid: string, content: any, options?: any) {
                await antispam.enqueue(sessionId, jid, content);
                return originalSendMessage(jid, content, options);
            } as any;

            bindSessionStore(this.socket, this.sessionId, this.io, () => this.isStopped);
            bindContactSync(this.socket, this.sessionId);

            this.socket.ev.on("creds.update", async () => {
                if (this.isStopped) return;
                await saveCreds();
            });

            this.socket.ev.on("connection.update", async (update) => {
                if (this.isStopped) return;
                await this.handleConnectionUpdate(update);
            });
        } finally {
            this.initLock = false;
        }
    }

    async handleConnectionUpdate(update: Partial<ConnectionState>) {
        const { connection, lastDisconnect, qr } = update;

        try {
            if (qr) {
                if (this.isStopped) return; // Don't emit QR if stopped
                this.qr = qr;
                this.status = "SCAN_QR";

                // Emit QR to Socket Room
                this.io?.to(this.sessionId).emit("connection.update", { status: this.status, qr, sessionId: this.sessionId });

                // Update DB
                await prisma.session.update({
                    where: { sessionId: this.sessionId },
                    data: { qr, status: "SCAN_QR" }
                });
            }

            if (connection === "close") {
                const code = (lastDisconnect?.error as any)?.output?.statusCode;
                const isLoggedOut = code === DisconnectReason.loggedOut;

                // Only reconnect if NOT logged out AND NOT explicitly stopped
                const shouldReconnect = !isLoggedOut && !this.isStopped;

                // Determine status based on reason
                if (isLoggedOut) {
                    this.status = "LOGGED_OUT";
                } else if (this.isStopped) {
                    this.status = "STOPPED";
                } else {
                    this.status = "DISCONNECTED";
                }

                this.io?.to(this.sessionId).emit("connection.update", { status: this.status, qr: null, sessionId: this.sessionId });

                // Use try-catch specifically for update as session might be deleted
                try {
                    await prisma.session.update({
                        where: { sessionId: this.sessionId },
                        data: { status: this.status, qr: null }
                    });
                } catch (e) {
                    // Ignore if session not found (deleted)
                }

                if (shouldReconnect) {
                    // Connection lost unexpectedly, reconnect with exponential backoff
                    this.reconnectAttempts++;
                    const delay = Math.min(
                        this.INITIAL_RECONNECT_DELAY * Math.pow(1.5, this.reconnectAttempts - 1),
                        this.MAX_RECONNECT_DELAY
                    );
                    logger.warn("Instance", `Session ${this.sessionId} disconnected. Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
                    this.initLock = false; // Allow next init
                    this.reconnectTimer = setTimeout(() => this.init(), delay);
                } else if (isLoggedOut) {
                    // Explicit logout: delete credentials
                    logger.info("Instance", `Session ${this.sessionId} logged out. Deleting credentials...`);
                    try {
                        await prisma.$transaction([
                            prisma.session.update({
                                where: { sessionId: this.sessionId },
                                data: { status: "LOGGED_OUT", qr: null }
                            }),
                            prisma.authState.deleteMany({
                                where: { sessionId: this.sessionId }
                            })
                        ]);
                    } catch (e) { /* ignore */ }
                    this.socket = null;
                    this.config = {}; // Clear config cache
                    logger.success("Instance", `Session ${this.sessionId} credentials deleted.`);
                } else if (this.isStopped) {
                    // Stopped: preserve credentials for future restart
                    logger.warn("Instance", `Session ${this.sessionId} stopped. Credentials preserved for auto-login.`);
                    this.socket = null;
                }
            }


            if (connection === "open") {
                this.status = "CONNECTED";
                this.qr = null;
                this.startTime = new Date();
                this.reconnectAttempts = 0; // Reset reconnect counter on successful connection

                this.io?.to(this.sessionId).emit("connection.update", { status: this.status, qr: null, sessionId: this.sessionId });

                // Sync Groups from WhatsApp (with error handling)
                try {
                    await syncGroups(this.socket as WASocket, this.sessionId);
                } catch (e) {
                    logger.error("Instance", "Group sync failed:", e);
                }

                try {
                    bindAutoReply(this.socket as WASocket, this.sessionId);
                } catch (e) {
                    logger.error("Instance", "Auto-reply bind failed:", e);
                }

                try {
                    bindPpGuard(this.socket as WASocket, this.sessionId);
                } catch (e) {
                    logger.error("Instance", "PP guard bind failed:", e);
                }

                await prisma.session.update({
                    where: { sessionId: this.sessionId },
                    data: { status: "CONNECTED", qr: null }
                });

                logger.success("Instance", `Session ${this.sessionId} connected and synced successfully`);
            }
        } catch (error: any) {
            // Catch global errors in handler (like Record Not Found if session deleted mid-process)
            if (error.code === 'P2025') {
                logger.warn("Instance", `Session ${this.sessionId} record not found during update. Stopping instance.`);
                this.socket?.end(undefined);
                this.socket = null;
            } else {
                logger.error("Instance", "Error in handleConnectionUpdate:", error);
            }
        }
    }

    async requestPairingCode(phoneNumber: string) {
        if (!this.socket) {
            throw new Error("Socket not initialized");
        }

        try {
            // Validate phone number (basic check)
            const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
            if (!cleanNumber) throw new Error("Invalid phone number");

            const code = await this.socket.requestPairingCode(cleanNumber);
            this.pairingCode = code;
            this.status = "SCAN_QR"; // Or specialized status? "PAIRING" is better but SCAN_QR triggers the right UI blocks usually

            // Emit update
            this.io?.to(this.sessionId).emit("connection.update", {
                status: this.status,
                qr: this.qr,
                pairingCode: code
            });

            return code;
        } catch (error) {
            logger.error("Instance", "Pairing code error:", error);
            throw error;
        }
    }
}
