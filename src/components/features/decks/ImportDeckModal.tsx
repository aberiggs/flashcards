'use client';

import { useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { parseDeckFile, type ParsedCard } from '@/lib/parseDeck';
import { Upload, FileText, Braces, AlertCircle } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'pick' | 'preview' | 'importing';

interface ParsedDeck {
    name: string;
    description?: string;
    cards: ParsedCard[];
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ImportDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const PREVIEW_CARD_COUNT = 3;

export function ImportDeckModal({ isOpen, onClose }: ImportDeckModalProps) {
    const importDeck = useMutation(api.import.importDeck);
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('pick');
    const [parseError, setParseError] = useState('');
    const [parsed, setParsed] = useState<ParsedDeck | null>(null);
    const [deckName, setDeckName] = useState('');
    const [nameError, setNameError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Reset ──────────────────────────────────────────────────────────────────

    const reset = () => {
        setStep('pick');
        setParseError('');
        setParsed(null);
        setDeckName('');
        setNameError('');
        setIsDragging(false);
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    // ── File processing ────────────────────────────────────────────────────────

    const processFile = async (file: File) => {
        setParseError('');
        try {
            const result = await parseDeckFile(file);
            setParsed({ name: result.suggestedName, description: result.description, cards: result.cards });
            setDeckName(result.suggestedName);
            setStep('preview');
        } catch (err) {
            setParseError(err instanceof Error ? err.message : 'Failed to parse file.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) void processFile(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) void processFile(file);
    };

    // ── Import ─────────────────────────────────────────────────────────────────

    const handleImport = async () => {
        if (!parsed) return;

        const trimmed = deckName.trim();
        if (!trimmed) {
            setNameError('Deck name is required.');
            return;
        }
        if (trimmed.length < 3) {
            setNameError('Deck name must be at least 3 characters.');
            return;
        }
        if (trimmed.length > 50) {
            setNameError('Deck name must be less than 50 characters.');
            return;
        }

        setNameError('');
        setIsImporting(true);
        setStep('importing');

        try {
            await importDeck({
                name: trimmed,
                description: parsed.description,
                cards: parsed.cards,
            });
            toast.success(
                `Imported ${parsed.cards.length} card${parsed.cards.length !== 1 ? 's' : ''} into "${trimmed}"`
            );
            reset();
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Import failed.');
            setIsImporting(false);
            setStep('preview');
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    const title =
        step === 'pick' ? 'Import Deck'
        : step === 'preview' ? 'Preview Import'
        : 'Importing…';

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title}>
            {step === 'pick' && (
                <PickStep
                    parseError={parseError}
                    isDragging={isDragging}
                    fileInputRef={fileInputRef}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onFileChange={handleFileChange}
                    onBrowseClick={() => fileInputRef.current?.click()}
                />
            )}

            {step === 'preview' && parsed && (
                <PreviewStep
                    parsed={parsed}
                    deckName={deckName}
                    nameError={nameError}
                    isLoading={isImporting}
                    onNameChange={(v) => { setDeckName(v); if (nameError) setNameError(''); }}
                    onBack={reset}
                    onImport={() => void handleImport()}
                />
            )}

            {step === 'importing' && (
                <div className="py-8 text-center text-text-secondary text-sm">
                    Importing cards…
                </div>
            )}
        </Modal>
    );
}

// ── PickStep ──────────────────────────────────────────────────────────────────

interface PickStepProps {
    parseError: string;
    isDragging: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: () => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBrowseClick: () => void;
}

function PickStep({
    parseError,
    isDragging,
    fileInputRef,
    onDrop,
    onDragOver,
    onDragLeave,
    onFileChange,
    onBrowseClick,
}: PickStepProps) {
    return (
        <div className="space-y-4">
            {/* Drop zone */}
            <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={onBrowseClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onBrowseClick()}
                aria-label="Click or drag a file to import"
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary ${
                    isDragging
                        ? 'border-accent-primary bg-accent-primary/5'
                        : 'border-border-primary hover:border-accent-primary/50 hover:bg-surface-secondary'
                }`}
            >
                <Upload className="w-8 h-8 text-text-tertiary" aria-hidden />
                <div className="text-center">
                    <p className="text-sm font-medium text-text-primary">
                        Drop a file here, or <span className="text-accent-primary">browse</span>
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                        Supports .csv, .txt, and .json (max 5 MB)
                    </p>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.json"
                onChange={onFileChange}
                className="sr-only"
                aria-hidden
                tabIndex={-1}
            />

            {parseError && (
                <div className="flex items-start gap-2 rounded-lg bg-status-error-bg border border-status-error-border px-3 py-2.5 text-sm text-status-error-text">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                    <span>{parseError}</span>
                </div>
            )}

            {/* Format hints */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border-primary bg-surface-secondary p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-text-tertiary" aria-hidden />
                        <span className="text-xs font-semibold text-text-primary">CSV / TXT</span>
                    </div>
                    <p className="text-xs text-text-tertiary leading-relaxed">
                        Two columns: <code className="font-mono">front</code>, <code className="font-mono">back</code>.
                        Header row auto-detected.
                    </p>
                </div>
                <div className="rounded-lg border border-border-primary bg-surface-secondary p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Braces className="w-4 h-4 text-text-tertiary" aria-hidden />
                        <span className="text-xs font-semibold text-text-primary">JSON</span>
                    </div>
                    <p className="text-xs text-text-tertiary leading-relaxed">
                        App export format. Restores deck name and SM-2 progress.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── PreviewStep ───────────────────────────────────────────────────────────────

interface PreviewStepProps {
    parsed: ParsedDeck;
    deckName: string;
    nameError: string;
    isLoading: boolean;
    onNameChange: (v: string) => void;
    onBack: () => void;
    onImport: () => void;
}

function PreviewStep({
    parsed,
    deckName,
    nameError,
    isLoading,
    onNameChange,
    onBack,
    onImport,
}: PreviewStepProps) {
    const preview = parsed.cards.slice(0, PREVIEW_CARD_COUNT);
    const remaining = parsed.cards.length - preview.length;

    return (
        <div className="space-y-4">
            {/* Deck name */}
            <div>
                <label htmlFor="import-deck-name" className="block text-sm font-medium text-text-secondary mb-1.5">
                    Deck name
                </label>
                <input
                    id="import-deck-name"
                    type="text"
                    value={deckName}
                    onChange={(e) => onNameChange(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg border border-border-primary bg-surface-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-sm"
                />
                {nameError && (
                    <p className="mt-1 text-xs text-accent-error">{nameError}</p>
                )}
            </div>

            {/* Summary */}
            <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">{parsed.cards.length}</span>
                {' '}card{parsed.cards.length !== 1 ? 's' : ''} ready to import
            </p>

            {/* Card preview */}
            <div className="space-y-2">
                {preview.map((card, i) => (
                    <div
                        key={i}
                        className="rounded-lg border border-border-primary bg-surface-secondary px-3 py-2.5 text-sm"
                    >
                        <p className="font-medium text-text-primary truncate">{card.front}</p>
                        <p className="text-text-secondary mt-0.5 truncate">{card.back}</p>
                    </div>
                ))}
                {remaining > 0 && (
                    <p className="text-xs text-text-tertiary text-center pt-1">
                        …and {remaining} more card{remaining !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border border-border-primary text-text-primary bg-surface-secondary hover:bg-surface-tertiary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={onImport}
                    disabled={isLoading}
                    className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-accent-primary text-text-inverse hover:bg-accent-primary-hover transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Importing…' : `Import ${parsed.cards.length} card${parsed.cards.length !== 1 ? 's' : ''}`}
                </button>
            </div>
        </div>
    );
}
