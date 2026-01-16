"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ApiDocsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [endpoints, setEndpoints] = useState<any[]>([]);
    const [filter, setFilter] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/login");
        }
    }, [status, router]);

    const apiEndpoints = [
        // Sessions
        { category: "Sessions", method: "GET", path: "/api/sessions", description: "List all sessions", auth: "Required" },
        { category: "Sessions", method: "POST", path: "/api/sessions", description: "Create new session", auth: "Required" },
        { category: "Sessions", method: "DELETE", path: "/api/sessions/[id]", description: "Delete session", auth: "Required" },
        { category: "Sessions", method: "GET", path: "/api/sessions/[id]/qr", description: "Get QR code", auth: "Required" },

        // Groups
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/picture", description: "Update group picture", auth: "Required" },
        { category: "Groups", method: "DELETE", path: "/api/groups/[jid]/picture", description: "Remove group picture", auth: "Required" },
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/subject", description: "Update group name", auth: "Required" },
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/description", description: "Update description", auth: "Required" },
        { category: "Groups", method: "GET", path: "/api/groups/[jid]/invite", description: "Get invite code", auth: "Required" },
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/invite/revoke", description: "Revoke invite", auth: "Required" },
        { category: "Groups", method: "POST", path: "/api/groups/invite/accept", description: "Accept invite", auth: "Required" },
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/members", description: "Manage members", auth: "Required" },
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/settings", description: "Update settings", auth: "Required" },
        { category: "Groups", method: "PUT", path: "/api/groups/[jid]/ephemeral", description: "Toggle disappearing", auth: "Required" },
        { category: "Groups", method: "POST", path: "/api/groups/[jid]/leave", description: "Leave group", auth: "Required" },

        // Profile
        { category: "Profile", method: "GET", path: "/api/profile", description: "Get own profile", auth: "Required" },
        { category: "Profile", method: "PUT", path: "/api/profile/name", description: "Update name", auth: "Required" },
        { category: "Profile", method: "PUT", path: "/api/profile/status", description: "Update status", auth: "Required" },
        { category: "Profile", method: "PUT", path: "/api/profile/picture", description: "Update picture", auth: "Required" },
        { category: "Profile", method: "DELETE", path: "/api/profile/picture", description: "Remove picture", auth: "Required" },

        // Messaging
        { category: "Messaging", method: "POST", path: "/api/messages/text", description: "Send text message", auth: "Required" },
        { category: "Messaging", method: "POST", path: "/api/messages/poll", description: "Send poll", auth: "Required" },
        { category: "Messaging", method: "POST", path: "/api/messages/list", description: "Send list", auth: "Required" },
        { category: "Messaging", method: "POST", path: "/api/messages/location", description: "Send location", auth: "Required" },
        { category: "Messaging", method: "POST", path: "/api/messages/contact", description: "Send contact", auth: "Required" },
        { category: "Messaging", method: "POST", path: "/api/messages/react", description: "Send reaction", auth: "Required" },
        { category: "Messaging", method: "POST", path: "/api/messages/forward", description: "Forward message", auth: "Required" },
        { category: "Messaging", method: "DELETE", path: "/api/messages/delete", description: "Delete message", auth: "Required" },
        { category: "Messaging", method: "GET", path: "/api/messages/[id]/media", description: "Download media", auth: "Required" },

        // Chat
        { category: "Chat", method: "POST", path: "/api/chat/check", description: "Check WhatsApp numbers", auth: "Required" },
        { category: "Chat", method: "PUT", path: "/api/chat/read", description: "Mark as read", auth: "Required" },
        { category: "Chat", method: "PUT", path: "/api/chat/archive", description: "Archive chat", auth: "Required" },
        { category: "Chat", method: "POST", path: "/api/chat/presence", description: "Send presence", auth: "Required" },
        { category: "Chat", method: "POST", path: "/api/chat/profile-picture", description: "Get profile picture", auth: "Required" },
        { category: "Chat", method: "PUT", path: "/api/chat/[jid]/mute", description: "Mute chat", auth: "Required" },
        { category: "Chat", method: "PUT", path: "/api/chat/[jid]/pin", description: "Pin chat", auth: "Required" },

        // Contacts
        { category: "Contacts", method: "POST", path: "/api/contacts/block", description: "Block contact", auth: "Required" },
        { category: "Contacts", method: "POST", path: "/api/contacts/unblock", description: "Unblock contact", auth: "Required" },

        // Labels
        { category: "Labels", method: "GET", path: "/api/labels", description: "List labels", auth: "Required" },
        { category: "Labels", method: "POST", path: "/api/labels", description: "Create label", auth: "Required" },
        { category: "Labels", method: "PUT", path: "/api/labels/[id]", description: "Update label", auth: "Required" },
        { category: "Labels", method: "DELETE", path: "/api/labels/[id]", description: "Delete label", auth: "Required" },
        { category: "Labels", method: "GET", path: "/api/chat/[jid]/labels", description: "Get chat labels", auth: "Required" },
        { category: "Labels", method: "PUT", path: "/api/chat/[jid]/labels", description: "Add/remove labels", auth: "Required" },
        { category: "Labels", method: "GET", path: "/api/chats/by-label/[labelId]", description: "Filter by label", auth: "Required" },
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
                            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-800">Swagger UI</h3>
                                <p className="text-sm text-gray-600">Interactive API testing</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </a>
                        <a
                            href="/api/docs"
                            target="_blank"
                            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-800">OpenAPI Spec</h3>
                                <p className="text-sm text-gray-600">JSON specification</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </a>
                        <div className="flex items-center p-4 border rounded-lg bg-gray-50">
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-800">Base URL</h3>
                                <p className="text-sm text-gray-600 font-mono">/api</p>
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auth</th>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {endpoint.auth}
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
