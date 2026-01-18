import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { DocsClient } from './docs-client';

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

            <DocsClient content={content} toc={toc} />
        </div>
    );
}
