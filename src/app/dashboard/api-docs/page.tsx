"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FileText, Code, ExternalLink } from "lucide-react";

export default function ApiDocsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [filter, setFilter] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/login");
        }
    }, [status, router]);

    const apiEndpoints = [
        // Sessions (5)
        { category: "Sessions", method: "GET", path: "/api/sessions", description: "List all sessions" },
        { category: "Sessions", method: "POST", path: "/api/sessions", description: "Create new session" },
        { category: "Sessions", method: "DELETE", path: "/api/sessions/[id]", description: "Delete session" },
        { category: "Sessions", method: "GET", path: "/api/sessions/[id]/qr", description: "Get QR code" },
        { category: "Sessions", method: "GET", path: "/api/sessions/[id]/bot-config", description: "Get bot config" },
        { category: "Sessions", method: "PUT", path: "/api/sessions/[id]/bot-config", description: "Update bot config" },
        { category: "Sessions", method: "PUT", path: "/api/sessions/[id]/settings", description: "Update settings" },

        // Groups (10)
        { category: "Groups", method: "GET", path: "/api/groups", description: "List groups" },
        { category: "Groups", method: "POST", path: "/api/groups/create", description: "Create group" },
        { category: "Groups", method: "POST", path: "/api/groups/invite/accept", description: "Accept invite" },
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/picture", description: "Update group picture" },
        { category: "Groups", method: "DELETE", path: "/api/groups/[jid]/picture", description: "Remove group picture" },
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/subject", description: "Update group name" },
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/description", description: "Update description" },
        { category: "Groups", method: "GET", path: "/api/groups/[jid]/invite", description: "Get invite code" },
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/invite/revoke", description: "Revoke invite" },
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/members", description: "Manage members" },
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/settings", description: "Update settings" },
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/ephemeral", description: "Toggle disappearing" },
        { category: "Groups", method: "POST", path: "/api/groups/[jid]/leave", description: "Leave group" },

        // Profile (4)
        { category: "Profile", method: "GET", path: "/api/profile", description: "Get own profile" },
        { category: "Profile", method: "PUT", path: "/api/profile/name", description: "Update name" },
        { category: "Profile", method: "PUT", path: "/api/profile/status", description: "Update status" },
        { category: "Profile", method: "PUT", path: "/api/profile/picture", description: "Update picture" },
        { category: "Profile", method: "DELETE", path: "/api/profile/picture", description: "Remove picture" },

        // Messaging (9)
        { category: "Messaging", method: "POST", path: "/api/chat/send", description: "Send message" },
        { category: "Messaging", method: "POST", path: "/api/messages/poll", description: "Send poll" },
        { category: "Messaging", method: "POST", path: "/api/messages/list", description: "Send list message" },
        { category: "Messaging", method: "POST", path: "/api/messages/location", description: "Send location" },
        { category: "Messaging", method: "POST", path: "/api/messages/contact", description: "Send contact" },
        { category: "Messaging", method: "POST", path: "/api/messages/react", description: "Send reaction" },
        { category: "Messaging", method: "POST", path: "/api/messages/forward", description: "Forward message" },
        { category: "Messaging", method: "POST", path: "/api/messages/sticker", description: "Send sticker" },
        { category: "Messaging", method: "POST", path: "/api/messages/broadcast", description: "Broadcast message" },
        { category: "Messaging", method: "POST", path: "/api/messages/spam", description: "Report spam" },
        { category: "Messaging", method: "DELETE", path: "/api/messages/delete", description: "Delete message" },
        { category: "Messaging", method: "GET", path: "/api/messages/[id]/media", description: "Download media" },

        // Chat (11)
        { category: "Chat", method: "GET", path: "/api/chat/[sessionId]", description: "Get chats" },
        { category: "Chat", method: "GET", path: "/api/chat/[sessionId]/[jid]", description: "Get specific chat" },
        { category: "Chat", method: "POST", path: "/api/chat/check", description: "Check WhatsApp numbers" },
        { category: "Chat", method: "PUT", path: "/api/chat/read", description: "Mark as read" },
        { category: "Chat", method: "PUT", path: "/api/chat/archive", description: "Archive chat" },
        { category: "Chat", method: "POST", path: "/api/chat/presence", description: "Send presence" },
        { category: "Chat", method: "POST", path: "/api/chat/profile-picture", description: "Get profile picture" },
        { category: "Chat", method: "PUT", path: "/api/chat/mute", description: "Mute chat" },
        { category: "Chat", method: "PUT", path: "/api/chat/pin", description: "Pin chat" },

        // Contacts (3)
        { category: "Contacts", method: "GET", path: "/api/contacts", description: "List contacts" },
        { category: "Contacts", method: "POST", path: "/api/contacts/block", description: "Block contact" },
        { category: "Contacts", method: "POST", path: "/api/contacts/unblock", description: "Unblock contact" },

        // Labels (4)
        { category: "Labels", method: "GET", path: "/api/labels", description: "List labels" },
        { category: "Labels", method: "POST", path: "/api/labels", description: "Create label" },
        { category: "Labels", method: "PUT", path: "/api/labels/[id]", description: "Update label" },
        { category: "Labels", method: "DELETE", path: "/api/labels/[id]", description: "Delete label" },
        { category: "Labels", method: "GET", path: "/api/labels/chat-labels?jid=xxx", description: "Get chat labels" },
        { category: "Labels", method: "PUT", path: "/api/labels/chat-labels?jid=xxx", description: "Add/remove labels" },
        { category: "Labels", method: "GET", path: "/api/chats/by-label/[labelId]", description: "Filter by label" },

        // Auto Reply (2)
        { category: "Auto Reply", method: "GET", path: "/api/autoreplies", description: "List auto replies" },
        { category: "Auto Reply", method: "POST", path: "/api/autoreplies", description: "Create auto reply" },
        { category: "Auto Reply", method: "GET", path: "/api/autoreplies/[id]", description: "Get auto reply" },
        { category: "Auto Reply", method: "PUT", path: "/api/autoreplies/[id]", description: "Update auto reply" },
        { category: "Auto Reply", method: "DELETE", path: "/api/autoreplies/[id]", description: "Delete auto reply" },

        // Scheduler (2)
        { category: "Scheduler", method: "GET", path: "/api/scheduler", description: "List scheduled" },
        { category: "Scheduler", method: "POST", path: "/api/scheduler", description: "Create scheduled" },
        { category: "Scheduler", method: "GET", path: "/api/scheduler/[id]", description: "Get scheduled" },
        { category: "Scheduler", method: "PUT", path: "/api/scheduler/[id]", description: "Update scheduled" },
        { category: "Scheduler", method: "DELETE", path: "/api/scheduler/[id]", description: "Delete scheduled" },

        // Webhooks (2)
        { category: "Webhooks", method: "GET", path: "/api/webhooks", description: "List webhooks" },
        { category: "Webhooks", method: "POST", path: "/api/webhooks", description: "Create webhook" },
        { category: "Webhooks", method: "GET", path: "/api/webhooks/[id]", description: "Get webhook" },
        { category: "Webhooks", method: "PUT", path: "/api/webhooks/[id]", description: "Update webhook" },
        { category: "Webhooks", method: "DELETE", path: "/api/webhooks/[id]", description: "Delete webhook" },

        // Notifications (3)
        { category: "Notifications", method: "GET", path: "/api/notifications", description: "List notifications" },
        { category: "Notifications", method: "POST", path: "/api/notifications", description: "Create notification" },
        { category: "Notifications", method: "PATCH", path: "/api/notifications/read", description: "Mark as read" },
        { category: "Notifications", method: "DELETE", path: "/api/notifications/delete", description: "Delete notifications" },

        // Users (4)
        { category: "Users", method: "GET", path: "/api/users", description: "List users" },
        { category: "Users", method: "POST", path: "/api/users", description: "Create user" },
        { category: "Users", method: "GET", path: "/api/users/[id]", description: "Get user" },
        { category: "Users", method: "PUT", path: "/api/users/[id]", description: "Update user" },
        { category: "Users", method: "DELETE", path: "/api/users/[id]", description: "Delete user" },
        { category: "Users", method: "GET", path: "/api/user/api-key", description: "Get API key" },
        { category: "Users", method: "POST", path: "/api/user/api-key", description: "Generate API key" },

        // System (4)
        { category: "System", method: "GET", path: "/api/settings/system", description: "Get system settings" },
        { category: "System", method: "PUT", path: "/api/settings/system", description: "Update system settings" },
        { category: "System", method: "POST", path: "/api/status/update", description: "Update status" },
        { category: "System", method: "GET", path: "/api/system/check-updates", description: "Check updates" },
    ];

    const categories = ["All", ...Array.from(new Set(apiEndpoints.map(e => e.category)))];

    const filteredEndpoints = apiEndpoints.filter(endpoint => {
        const matchesFilter = endpoint.path.toLowerCase().includes(filter.toLowerCase()) ||
            endpoint.description.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = selectedCategory === "All" || endpoint.category === selectedCategory;
        return matchesFilter && matchesCategory;
    });

    const getMethodColor = (method: string) => {
        switch (method) {
            case "GET": return "bg-green-100 text-green-800 border-green-300";
            case "POST": return "bg-blue-100 text-blue-800 border-blue-300";
            case "PUT": return "bg-yellow-100 text-yellow-800 border-yellow-300";
            case "PATCH": return "bg-orange-100 text-orange-800 border-orange-300";
            case "DELETE": return "bg-red-100 text-red-800 border-red-300";
            default: return "bg-gray-100 text-gray-800 border-gray-300";
        }
    };

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">API Documentation</h1>
                    <p className="text-gray-600">Complete API reference with {apiEndpoints.length} endpoints</p>
                </div>

                {/* Quick Links */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <a
                            href="/docs"
                            target="_blank"
                            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                            <Code className="w-10 h-10 text-blue-600 mr-4" />
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-800 group-hover:text-blue-600">Swagger UI</h3>
                                <p className="text-sm text-gray-600">Interactive API testing</p>
                            </div>
                            <ExternalLink className="w-5 h-5 text-gray-400" />
                        </a>
                        <a
                            href="/api/docs"
                            target="_blank"
                            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                            <FileText className="w-10 h-10 text-green-600 mr-4" />
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-800 group-hover:text-green-600">OpenAPI Spec</h3>
                                <p className="text-sm text-gray-600">JSON specification</p>
                            </div>
                            <ExternalLink className="w-5 h-5 text-gray-400" />
                        </a>
                        <div className="flex items-center p-4 border rounded-lg bg-gray-50">
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-800">Base URL</h3>
                                <p className="text-sm text-gray-600 font-mono break-all">{process.env.NEXT_PUBLIC_API_URL || '/api'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                            <input
                                type="text"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                placeholder="Search endpoints..."
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Endpoints List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredEndpoints.map((endpoint, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getMethodColor(endpoint.method)}`}>
                                                {endpoint.method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <code className="text-sm text-gray-900 font-mono">{endpoint.path}</code>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{endpoint.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                                {endpoint.category}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredEndpoints.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No endpoints found matching your criteria
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-blue-600">{apiEndpoints.length}</div>
                        <div className="text-sm text-gray-600">Total Endpoints</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-green-600">{categories.length - 1}</div>
                        <div className="text-sm text-gray-600">Categories</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-yellow-600">{apiEndpoints.filter(e => e.method === "POST").length}</div>
                        <div className="text-sm text-gray-600">POST Endpoints</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-purple-600">{apiEndpoints.filter(e => e.method === "GET").length}</div>
                        <div className="text-sm text-gray-600">GET Endpoints</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
