"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { QrCode, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMachineId } from "@/lib/machine-id";

type SessionItem = {
    id: string;
    name: string;
    sessionId: string;
    status: string;
    assignedTo?: string | null;
};

export function DashboardSessionList({ sessions }: { sessions: SessionItem[] }) {
    const [machineId, setMachineId] = useState<string | null>(null);

    useEffect(() => {
        setMachineId(getMachineId());
    }, []);

    if (sessions.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-200 shadow-none">
                <CardContent className="py-12 text-center">
                    <div className="bg-slate-100 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <QrCode className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600 mb-1">No sessions yet</p>
                    <p className="text-xs text-slate-400 mb-4">Connect your first WhatsApp device to get started</p>
                    <Link href="/dashboard/sessions">
                        <Button size="sm" variant="outline" className="gap-2">
                            <Plus className="h-4 w-4" /> Create Session
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    const hydrated = machineId !== null;

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => {
                const isConnected = s.status === "CONNECTED";
                const isDisconnected = !isConnected;
                const isOwned = hydrated ? !s.assignedTo || s.assignedTo === machineId : true;

                const card = (
                    <Card
                        className={`glass-panel border-border/50 shadow-sm transition-all duration-300 h-full ${
                            isOwned
                                ? "hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 cursor-pointer"
                                : "opacity-50 cursor-not-allowed bg-gray-50"
                        }`}
                        data-testid="session-item"
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-foreground truncate">
                                        {s.name}
                                        {hydrated && !isOwned && (
                                            <span className="ml-2 text-[10px] text-red-500 font-normal">
                                                (Other machine)
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                                        {s.sessionId}
                                    </p>
                                    {s.assignedTo && (
                                        <p className="text-[10px] text-muted-foreground/60 font-mono truncate mt-1">
                                            Machine: {s.assignedTo.substring(0, 8)}...
                                        </p>
                                    )}
                                </div>
                                <div
                                    className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                                        isConnected
                                            ? "bg-emerald-50 text-emerald-700"
                                            : isDisconnected
                                              ? "bg-red-50 text-red-600"
                                              : "bg-amber-50 text-amber-600"
                                    }`}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                            isConnected
                                                ? "bg-emerald-500"
                                                : isDisconnected
                                                  ? "bg-red-400"
                                                  : "bg-amber-400"
                                        }`}
                                    />
                                    {s.status}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );

                if (isOwned) {
                    return (
                        <Link key={s.id} href={`/dashboard/sessions/${s.sessionId}`}>
                            {card}
                        </Link>
                    );
                }
                return <div key={s.id}>{card}</div>;
            })}
        </div>
    );
}
