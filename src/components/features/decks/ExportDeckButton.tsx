'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Braces } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import {
    downloadDeckCsv,
    downloadDeckJson,
    type ExportCard,
} from '@/lib/exportDeck';

interface ExportDeckButtonProps {
    deckName: string;
    description?: string;
    cards: ExportCard[];
}

export function ExportDeckButton({ deckName, description, cards }: ExportDeckButtonProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open]);

    const handleCsv = () => {
        downloadDeckCsv(deckName, cards);
        toast.success(`Exported "${deckName}" as CSV`);
        setOpen(false);
    };

    const handleJson = () => {
        downloadDeckJson({ name: deckName, description, cards });
        toast.success(`Exported "${deckName}" as JSON`);
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label="Export deck"
                aria-expanded={open}
                aria-haspopup="menu"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium border border-border-primary text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface-primary"
            >
                <Download className="w-4 h-4" aria-hidden />
                <span className="hidden sm:inline">Export</span>
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 z-30 w-44 bg-surface-primary border border-border-primary rounded-xl shadow-lg py-1 animate-fade-in-up"
                >
                    <button
                        role="menuitem"
                        type="button"
                        onClick={handleCsv}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                    >
                        <FileText className="w-4 h-4 shrink-0 text-text-tertiary" aria-hidden />
                        <div className="text-left">
                            <p className="font-medium">CSV</p>
                            <p className="text-xs text-text-tertiary">front, back columns</p>
                        </div>
                    </button>
                    <button
                        role="menuitem"
                        type="button"
                        onClick={handleJson}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                    >
                        <Braces className="w-4 h-4 shrink-0 text-text-tertiary" aria-hidden />
                        <div className="text-left">
                            <p className="font-medium">JSON</p>
                            <p className="text-xs text-text-tertiary">full backup with SM-2</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
