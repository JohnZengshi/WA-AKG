import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

export const metadata = {
    title: 'Public API Documentation - WA-AKG',
    description: 'Complete API reference for WA-AKG WhatsApp Gateway',
};

export default async function PublicDocsPage() {
    const filePath = path.join(process.cwd(), 'docs', 'API_DOCUMENTATION.md');
    let content = '';

    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        content = '# Error\n\nCould not load documentation file.';
    }

    // Simple TOC generation (very basic regex)
    const toc = content.split('\n')
        .filter(line => line.startsWith('## ') || line.startsWith('### '))
        .map(line => {
            const level = line.startsWith('### ') ? 3 : 2;
            const text = line.replace(/^#+ /, '').trim();
            const id = text.toLowerCase().replace(/[^\w]+/g, '-');
            return { level, text, id };
        });

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            WA-AKG
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            v1.2
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/swagger"
                            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            Swagger UI
                        </Link>
                        <Link
                            href="/dashboard"
                            className="text-sm font-medium px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <div className="flex-1 max-w-7xl mx-auto w-full flex items-start">
                {/* Sidebar (Desktop) */}
                <aside className="hidden lg:block w-64 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-gray-200 bg-gray-50/50 backdrop-blur-sm p-4">
                    <nav className="space-y-1">
                        {toc.map((item, index) => (
                            <a
                                key={index}
                                href={`#${item.id}`}
                                className={`block text-sm py-1.5 px-3 rounded-md transition-colors ${item.level === 2
                                        ? 'font-semibold text-gray-900 hover:bg-gray-100'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 ml-3'
                                    }`}
                            >
                                {item.text}
                            </a>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0 p-4 sm:p-8 lg:p-12 bg-white min-h-[calc(100vh-4rem)]">
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

                    <article className="prose prose-slate prose-blue max-w-none prose-headings:scroll-mt-20 prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h2: ({ node, ...props }) => {
                                    const id = props.children?.toString().toLowerCase().replace(/[^\w]+/g, '-') || '';
                                    return <h2 id={id} {...props} className="text-2xl font-bold mt-8 mb-4 border-b pb-2" />
                                },
                                h3: ({ node, ...props }) => {
                                    const id = props.children?.toString().toLowerCase().replace(/[^\w]+/g, '-') || '';
                                    return <h3 id={id} {...props} className="text-xl font-semibold mt-6 mb-3" />
                                },
                                table: ({ node, ...props }) => (
                                    <div className="overflow-x-auto my-4 border rounded-lg">
                                        <table {...props} className="min-w-full divide-y divide-gray-200" />
                                    </div>
                                ),
                                thead: ({ node, ...props }) => <thead {...props} className="bg-gray-50" />,
                                th: ({ node, ...props }) => <th {...props} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />,
                                td: ({ node, ...props }) => <td {...props} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" />,
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </article>

                    <footer className="mt-16 pt-8 border-t text-center text-sm text-gray-400">
                        <p>© {new Date().getFullYear()} WA-AKG. All rights reserved.</p>
                    </footer>
                </main>
            </div>
        </div>
    );
}
