"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getCookie, setCookie } from "@/lib/client-cookie";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getMachineId, fetchServerMachineId } from "@/lib/machine-id";

interface Session {
    id: string;
    sessionId: string;
    name: string;
    status: string;
    assignedTo?: string | null;
}

interface SessionContextType {
    sessions: Session[];
    sessionId: string;
    setSessionId: (id: string) => void;
    refreshSessions: () => Promise<void>;
    loading: boolean;
    machineId: string;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionId, setSessionIdState] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [machineId, setMachineId] = useState<string>(() => getMachineId());
    const router = useRouter();

    useEffect(() => {
        fetchServerMachineId().then((id) => {
            if (id && id !== machineId) {
                setMachineId(id);
            }
        });
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/sessions');
            if (res.ok) {
                const responseData = await res.json();
                const data = responseData?.data || [];
                // Filter connected only? Or showing all but disabled?
                // Logic: Only show CONNECTED in selector for "Active" operations.
                // Show all sessions so users can manage disconnected ones (e.g. webhooks, settings)
                setSessions(data);

                const cookieId = getCookie("sessionId");
                const cookieSession = cookieId ? data.find((s: Session) => s.sessionId === cookieId) : null;
                const isCookieOwned = cookieSession && (!cookieSession.assignedTo || cookieSession.assignedTo === machineId);
                if (isCookieOwned) {
                    setSessionIdState(cookieId as string);
                } else {
                    const firstOwned = data.find((s: Session) => !s.assignedTo || s.assignedTo === machineId);
                    if (firstOwned) {
                        setSessionIdState(firstOwned.sessionId);
                        setCookie("sessionId", firstOwned.sessionId);
                    } else {
                        setSessionIdState("");
                    }
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch sessions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const setSessionId = (id: string) => {
        setSessionIdState(id);
        setCookie("sessionId", id); // Sync Cookie
        router.refresh(); // Sync Server Components
    };

    return (
        <SessionContext.Provider value={{ sessions, sessionId, setSessionId, refreshSessions: fetchSessions, loading, machineId }}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error("useSession must be used within a SessionProvider");
    }
    return context;
}
