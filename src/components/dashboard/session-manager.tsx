'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import QRCode from 'qrcode';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { Label } from '@/components/ui/label';
import { useSession } from './session-provider';
import { Plus, Trash2, Settings, UserPlus, Smartphone, CheckSquare, Square, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Session = {
    id: string;
    name: string;
    sessionId: string;
    status: string;
    qr?: string | null;
    assignedTo?: string | null;
};

export function SessionManager({ user }: { user: any }) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [newSessionName, setNewSessionName] = useState("");
    const [newSessionId, setNewSessionId] = useState("");
    const [newSessionProxy, setNewSessionProxy] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { machineId } = useSession();
    const router = useRouter();

    useEffect(() => {
        fetchSessions();

        // Init Socket
        const socketInstance = io({
            path: "/api/socket/io",
            addTrailingSlash: false,
        });

        socketInstance.on('connect', () => {
            console.log('Socket connected');
        });

        socketInstance.on('connection.update', (data: { sessionId?: string, status: string, qr: string | null }) => {
            if (!data.sessionId) return;
            setSessions(prev => prev.map(s => {
                if (s.sessionId === data.sessionId) {
                    return { ...s, status: data.status, qr: data.qr };
                }
                return s;
            }));

            if (data.status === 'CONNECTED') {
                fetchSessions();
            }
        });

        setSocket(socketInstance);

        const pollTimer = setInterval(fetchSessions, 15_000);

        return () => {
            socketInstance.disconnect();
            clearInterval(pollTimer);
        };
    }, []);

    const fetchSessions = async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/sessions');
            const responseData = await res.json();
            const data = responseData?.data || [];
            if (Array.isArray(data)) {
                setSessions(data);
                setSelected([]);
            }
        } catch {
            toast.error("Failed to fetch sessions");
        } finally {
            setRefreshing(false);
        }
    }

    const createSession = async () => {
        if (!newSessionName) {
            toast.error("Session name is required");
            return;
        }

        if (newSessionId && sessions.some(s => s.sessionId === newSessionId)) {
            toast.error("Session ID already exists");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    name: newSessionName,
                    sessionId: newSessionId || undefined,
                    ...(newSessionProxy && { proxyUrl: newSessionProxy }),
                })
            });
            const responseData = await res.json();
            const session = responseData?.data;

            if (!res.ok || !session) throw new Error(responseData.error || responseData.message || "Failed to create");

            setSessions([...sessions, session]);
            setNewSessionName("");
            setNewSessionId("");
            setNewSessionProxy("");
            toast.success("Session created successfully");

        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Failed to create session");
        } finally {
            setLoading(false);
        }
    };

    const handleManageSession = (sessionId: string) => {
        router.push(`/dashboard/sessions/${sessionId}`);
    }

    const toggleSelect = (sessionId: string) => {
        setSelected(prev => {
            if (prev.includes(sessionId)) {
                return prev.filter(id => id !== sessionId);
            }
            return [...prev, sessionId];
        });
    };

    const isSessionOwned = (session: Session): boolean => {
        return !session.assignedTo || session.assignedTo === machineId;
    };

    const handleCardClick = (sessionId: string) => {
        const session = sessions.find(s => s.sessionId === sessionId);
        if (session && !isSessionOwned(session)) {
            const isAdmin = user?.role === "SUPERADMIN" || user?.role === "OWNER";
            if (!isAdmin) return;
        }
        toggleSelect(sessionId);
    };

    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    const selectAll = () => {
        const isAdmin = user?.role === "SUPERADMIN" || user?.role === "OWNER";
        const targetIds = isAdmin
            ? sessions.map(s => s.sessionId)
            : sessions.filter(s => isSessionOwned(s)).map(s => s.sessionId);
        if (selected.length === targetIds.length) {
            setSelected([]);
        } else {
            setSelected(targetIds);
        }
    };

    const handleBatchDelete = async () => {
        if (selected.length === 0) return;
        setShowDeleteConfirm(false);
        setDeleting(true);
        try {
            const res = await fetch("/api/sessions/batch-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionIds: selected }),
            });
            if (!res.ok) throw new Error("Failed to delete");
            const responseData = await res.json();
            const data = responseData?.data;
            toast.success(`Deleted ${data?.deleted || 0} session(s)`);
            if (data?.failed > 0) toast.warning(`Failed to delete ${data.failed} session(s)`);
            setSelected([]);
            await fetchSessions();
        } catch {
            toast.error("Failed to delete sessions");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Create New Session Card */}
            <Card className="bg-slate-50 border-dashed border-2">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Plus className="h-5 w-5" /> Create New Session
                    </CardTitle>
                    <CardDescription>
                        Add a new WhatsApp account to manage.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                        <div className="space-y-2">
                            <Label htmlFor="session-name">Session Name</Label>
                            <Input
                                id="session-name"
                                value={newSessionName}
                                onChange={e => setNewSessionName(e.target.value)}
                                placeholder="My Business WA"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="session-id">Custom Session ID (Optional)</Label>
                            <Input
                                id="session-id"
                                value={newSessionId}
                                onChange={e => setNewSessionId(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                                placeholder="unique-id-123"
                            />
                            <p className="text-[10px] text-muted-foreground">Only letters, numbers, hyphens.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="proxy-url">Proxy URL (optional)</Label>
                            <Input
                                id="proxy-url"
                                value={newSessionProxy}
                                onChange={e => setNewSessionProxy(e.target.value)}
                                placeholder="socks5://proxy:1080"
                            />
                        </div>
                        <div className="space-y-2 ml-auto">
                            <Label className='opacity-0'>--</Label>
                            <Button onClick={createSession} disabled={loading}>
                                {loading ? 'Creating...' : 'Create Session'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sessions Grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-800">Active Sessions ({sessions.length})</h2>
                    {sessions.length > 0 && (
                        <Button variant="outline" size="sm" onClick={selectAll}>
                            {selected.length > 0 && selected.length === (user?.role === "SUPERADMIN" || user?.role === "OWNER" ? sessions.length : sessions.filter(s => isSessionOwned(s)).length) ? 'Deselect All' : 'Select All'}
                        </Button>
                    )}
                </div>

                {selected.length > 0 && (
                    <div className="flex items-center gap-3 p-2.5 bg-destructive/5 border border-destructive/20 rounded-lg mb-4">
                        <span className="text-sm font-medium">{selected.length} selected</span>
                        <Button variant="destructive" size="sm" className="gap-1.5 h-8" onClick={() => setShowDeleteConfirm(true)} disabled={deleting}>
                            <Trash2 className="h-3.5 w-3.5" /> {deleting ? "Deleting..." : "Delete"}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelected([])}>
                            <X className="h-3.5 w-3.5 mr-1" /> Clear
                        </Button>
                    </div>
                )}

                {refreshing && sessions.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground bg-slate-50 rounded-lg border">
                        Loading sessions...
                    </div>
                )}

                {sessions.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-slate-50 rounded-lg border">
                        No sessions found. Create one above to get started.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sessions.map(session => {
                            const isSelected = selected.includes(session.sessionId);
                            const notOwned = !isSessionOwned(session);
                            const isAdmin = user?.role === "SUPERADMIN" || user?.role === "OWNER";
                            const canSelect = isAdmin || !notOwned;
                            return (
                                <Card key={session.id} data-testid="session-card"
                                    className={`transition-shadow ${!canSelect ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:shadow-md cursor-pointer'} ${isSelected && canSelect ? "ring-2 ring-primary border-primary" : ""}`}
                                    onClick={() => {
                                        if (canSelect) handleCardClick(session.sessionId);
                                    }}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <div className="flex items-center gap-2">
                                            {!canSelect ? (
                                                <Square className="h-4 w-4 text-muted-foreground/20" />
                                            ) : isSelected ? (
                                                <CheckSquare className="h-4 w-4 text-primary" />
                                            ) : (
                                                <Square className="h-4 w-4 text-muted-foreground/40" />
                                            )}
                                            <CardTitle className={`text-base font-medium truncate ${!canSelect ? 'text-muted-foreground' : ''}`}>
                                                {session.name}
                                            </CardTitle>
                                        </div>
                                        <Smartphone className={`h-4 w-4 ${!canSelect ? 'text-muted-foreground/30' : 'text-muted-foreground'}`} />
                                    </CardHeader>
                                    <CardContent>
                                        <div className={`text-2xl font-bold truncate mb-2 ${!canSelect ? 'text-muted-foreground' : ''}`}>{session.sessionId}</div>
                                        {session.assignedTo && (
                                            <p className={`text-[10px] font-mono truncate mb-2 ${!canSelect ? 'text-red-400' : 'text-muted-foreground/60'}`}>
                                                Machine: {session.assignedTo.substring(0, 8)}...
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge data-testid="status-badge" variant={session.status === 'CONNECTED' ? 'default' : 'secondary'}
                                                className={session.status === 'CONNECTED' ? 'bg-green-500 hover:bg-green-600' : ''}>
                                                {session.status}
                                            </Badge>
                                            {notOwned && !isAdmin && (
                                                <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                                                    Other machine
                                                </Badge>
                                            )}
                                            {notOwned && isAdmin && (
                                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                                                    Other machine (admin bypass)
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-slate-50/50 p-3 flex justify-end gap-2">
                                        <Button variant="outline" size="sm" disabled={!isSessionOwned(session)}
                                            onClick={(e) => handleActionClick(e, () => router.push(`/dashboard/sessions/access?session=${session.sessionId}`))}>
                                            <UserPlus className="h-4 w-4 mr-1" /> Share
                                        </Button>
                                        <Button variant="outline" size="sm" disabled={!isSessionOwned(session)}
                                            onClick={(e) => handleActionClick(e, () => handleManageSession(session.sessionId))}>
                                            <Settings className="h-4 w-4 mr-1" /> Manage
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selected.length} session(s)?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The selected sessions will be permanently deleted along with all their data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBatchDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
