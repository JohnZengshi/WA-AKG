"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Menu, X, Search, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface TocItem {
    level: number;
    text: string;
    id: string;
}

interface DocsClientProps {
    content: string;
    toc: TocItem[];
}

export function DocsClient({ content, toc }: DocsClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredToc, setFilteredToc] = useState(toc);
    const [openMobileMenu, setOpenMobileMenu] = useState(false);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredToc(toc);
            return;
        }

        const lowerQuery = searchQuery.toLowerCase();
        const filtered = toc.filter((item) =>
            item.text.toLowerCase().includes(lowerQuery)
        );
        setFilteredToc(filtered);
    }, [searchQuery, toc]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            // Offset for fixed header
            const headerOffset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
            setOpenMobileMenu(false);
        }
    };

    return (
        <div className="flex-1 max-w-7xl mx-auto w-full flex items-start relative px-4 sm:px-6 lg:px-8">
            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:block w-64 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto border-r border-gray-200 pr-4 mt-8">
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search documentation..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <nav className="space-y-1">
                    {filteredToc.length > 0 ? (
                        filteredToc.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => scrollToSection(item.id)}
                                className={`block text-left w-full text-sm py-1.5 px-3 rounded-md transition-colors truncate ${item.level === 2
                                    ? "font-semibold text-gray-900 hover:bg-gray-100"
                                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 ml-3"
                                    }`}
                                title={item.text}
                            >
                                {item.text}
                            </button>
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-4">No results found</p>
                    )}
                </nav>
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            <div className="lg:hidden fixed bottom-6 right-6 z-50">
                <Sheet open={openMobileMenu} onOpenChange={setOpenMobileMenu}>
                    <SheetTrigger asChild>
                        <Button size="icon" className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
                        <div className="p-4 border-b">
                            <h2 className="text-lg font-bold">Contents</h2>
                        </div>
                        <div className="p-4">
                            <div className="mb-4 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <nav className="space-y-1 max-h-[calc(100vh-10rem)] overflow-y-auto">
                                {filteredToc.length > 0 ? (
                                    filteredToc.map((item, index) => (
                                        <button
                                            key={index}
                                            onClick={() => scrollToSection(item.id)}
                                            className={`block text-left w-full text-sm py-2 px-3 rounded-md transition-colors truncate ${item.level === 2
                                                ? "font-semibold text-gray-900 bg-gray-50"
                                                : "text-gray-500 border-l-2 border-transparent ml-3 pl-3"
                                                }`}
                                        >
                                            {item.text}
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-400 text-center py-4">No results found</p>
                                )}
                            </nav>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Main Content */}
            <main className="flex-1 min-w-0 py-8 lg:pl-12">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded-r-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-blue-700">
                                For the most up-to-date API reference and interactive testing, please check the <Link href="/swagger" className="font-medium underline hover:text-blue-600">Swagger UI</Link> or the <Link href="/dashboard/api-docs" className="font-medium underline hover:text-blue-600">Dashboard API Docs</Link>.
                            </p>
                        </div>
                    </div>
                </div>

                <article className="prose prose-slate prose-blue max-w-none prose-headings:scroll-mt-24 prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            h2: ({ node, ...props }) => {
                                const id = props.children?.toString().toLowerCase().replace(/[^\w]+/g, '-') || '';
                                return <h2 id={id} {...props} className="text-2xl font-bold mt-12 mb-6 border-b pb-2 scroll-mt-24" />
                            },
                            h3: ({ node, ...props }) => {
                                const id = props.children?.toString().toLowerCase().replace(/[^\w]+/g, '-') || '';
                                return <h3 id={id} {...props} className="text-xl font-semibold mt-8 mb-4 scroll-mt-24" />
                            },
                            code: ({ node, inline, className, children, ...props }: any) => {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                    <div className="rounded-lg overflow-hidden my-6 border border-gray-200 shadow-sm">
                                        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                                            <span className="text-xs font-mono text-gray-400 capitalize">{match[1]}</span>
                                        </div>
                                        <SyntaxHighlighter
                                            style={atomOneDark}
                                            language={match[1]}
                                            PreTag="div"
                                            customStyle={{ margin: 0, padding: '1rem', borderRadius: 0, fontSize: '0.9em' }}
                                            {...props}
                                        >
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    </div>
                                ) : (
                                    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200" {...props}>
                                        {children}
                                    </code>
                                )
                            },
                            table: ({ node, ...props }) => (
                                <div className="overflow-x-auto my-6 border rounded-lg shadow-sm">
                                    <table {...props} className="min-w-full divide-y divide-gray-200" />
                                </div>
                            ),
                            thead: ({ node, ...props }) => <thead {...props} className="bg-gray-50" />,
                            th: ({ node, ...props }) => <th {...props} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />,
                            td: ({ node, ...props }) => <td {...props} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" />,
                            pre: ({ node, ...props }) => <pre {...props} /> // Passthrough to code block handler
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </article>

                <footer className="mt-20 pt-8 border-t text-center text-sm text-gray-400">
                    <p>© {new Date().getFullYear()} WA-AKG. All rights reserved.</p>
                </footer>
            </main>
        </div>
    );
}
