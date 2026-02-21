'use client';

import { ReactNode, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Info, Pencil, Trash2, X, RotateCcw } from 'lucide-react';
import type { Doc, Id } from '../../../../convex/_generated/dataModel';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { FlipCard } from './FlipCard';
import { CardEditForm } from './CardEditForm';

interface CardViewerModalProps {
    cards: Doc<"cards">[];
    initialIndex: number;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (card: Doc<"cards">, front: string, back: string) => void;
    onDelete: (cardId: Id<"cards">) => void;
    /** When set, this content replaces the card viewer (e.g. card info). Escape will call onCancelInfo. */
    infoContent?: ReactNode | null;
    onCancelInfo?: () => void;
    /** Called when user clicks the info button; receives the current card index so the parent can show that card's info. */
    onShowInfo?: (cardIndex: number) => void;
}

export function CardViewerModal({
    cards,
    initialIndex,
    isOpen,
    onClose,
    onEdit,
    onDelete,
    infoContent = null,
    onCancelInfo,
    onShowInfo,
}: CardViewerModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editFront, setEditFront] = useState('');
    const [editBack, setEditBack] = useState('');

    // Sync currentIndex when initialIndex changes (opening a different card)
    useEffect(() => {
        setCurrentIndex(initialIndex);
        setIsFlipped(false);
        setIsEditing(false);
    }, [initialIndex]);

    const safeIndex = Math.min(currentIndex, cards.length - 1);
    const card = cards[safeIndex];

    const openEdit = useCallback(() => {
        if (!card) return;
        setEditFront(card.front);
        setEditBack(card.back);
        setIsEditing(true);
    }, [card]);

    const closeEdit = useCallback(() => setIsEditing(false), []);

    const saveEdit = useCallback(() => {
        if (!card) return;
        onEdit(card, editFront, editBack);
        setIsEditing(false);
    }, [card, editFront, editBack, onEdit]);

    const canGoPrev = currentIndex > 0;
    const canGoNext = currentIndex < cards.length - 1;

    const goToPrev = useCallback(() => {
        if (canGoPrev) { setCurrentIndex((i) => i - 1); setIsFlipped(false); setIsEditing(false); }
    }, [canGoPrev]);

    const goToNext = useCallback(() => {
        if (canGoNext) { setCurrentIndex((i) => i + 1); setIsFlipped(false); setIsEditing(false); }
    }, [canGoNext]);

    const handleFlip = useCallback(() => {
        if (!isEditing) setIsFlipped((prev) => !prev);
    }, [isEditing]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            const inTextarea = tag === 'TEXTAREA' || tag === 'INPUT';

            if (e.key === 'Escape') {
                e.preventDefault();
                if (isEditing) closeEdit();
                else if (infoContent != null && onCancelInfo) onCancelInfo();
                else onClose();
                return;
            }
            if (inTextarea || isEditing || infoContent != null) return;

            switch (e.key) {
                case 'ArrowLeft':  e.preventDefault(); goToPrev(); break;
                case 'ArrowRight': e.preventDefault(); goToNext(); break;
                case ' ':          e.preventDefault(); handleFlip(); break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, isEditing, infoContent, goToPrev, goToNext, handleFlip, onClose, onCancelInfo, closeEdit]);

    if (!isOpen || cards.length === 0) return null;

    const showSidebar = !isEditing && infoContent == null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
                onClick={onClose}
            />

            {/* Shell — wider when nav arrows are visible */}
            <div className={`relative flex items-center gap-3 w-full mx-4 ${showSidebar ? 'max-w-3xl' : 'max-w-xl'}`}>
                {/* Prev arrow */}
                {showSidebar && (
                    <button
                        type="button"
                        onClick={goToPrev}
                        disabled={!canGoPrev}
                        className="shrink-0 p-2 rounded-full bg-surface-primary/80 border border-border-primary text-text-secondary
                                   hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer
                                   disabled:opacity-30 disabled:cursor-not-allowed hidden sm:flex items-center justify-center"
                        aria-label="Previous card"
                    >
                        <ChevronLeft className="w-5 h-5" aria-hidden />
                    </button>
                )}

                {/* Card frame */}
                <div className="flex-1 h-[80vh] max-h-[600px] flex flex-col bg-surface-primary border border-border-primary rounded-xl shadow-xl overflow-hidden">

                    {/* ── Header ── */}
                    <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border-primary">
                        {isEditing ? (
                            <>
                                <span className="text-sm font-medium text-text-primary">Edit card</span>
                                <button
                                    type="button"
                                    onClick={closeEdit}
                                    className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                                    aria-label="Back to card"
                                >
                                    <ChevronLeft className="w-4 h-4" aria-hidden />
                                </button>
                            </>
                        ) : infoContent != null ? (
                            <>
                                <span className="text-sm font-medium text-text-primary">Card info</span>
                                <button
                                    type="button"
                                    onClick={onCancelInfo}
                                    className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                                    aria-label="Back to card"
                                >
                                    <ChevronLeft className="w-4 h-4" aria-hidden />
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="text-sm text-text-tertiary font-medium">
                                    {safeIndex + 1} / {cards.length}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => onShowInfo?.(safeIndex)}
                                        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                                        aria-label="Card info"
                                    >
                                        <Info className="w-4 h-4" aria-hidden />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openEdit}
                                        className="p-2 rounded-lg text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 transition-colors cursor-pointer"
                                        aria-label="Edit card"
                                    >
                                        <Pencil className="w-4 h-4" aria-hidden />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(card._id)}
                                        className="p-2 rounded-lg text-text-secondary hover:text-accent-error hover:bg-accent-error/10 transition-colors cursor-pointer"
                                        aria-label="Delete card"
                                    >
                                        <Trash2 className="w-4 h-4" aria-hidden />
                                    </button>
                                    <div className="w-px h-5 bg-border-primary mx-1" aria-hidden />
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                                        aria-label="Close"
                                    >
                                        <X className="w-4 h-4" aria-hidden />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── Body ── */}
                    {isEditing ? (
                        <div className="flex-1 min-h-0 overflow-y-auto p-6">
                            <CardEditForm
                                front={editFront}
                                back={editBack}
                                onFrontChange={setEditFront}
                                onBackChange={setEditBack}
                                autoFocus
                            />
                        </div>
                    ) : infoContent != null ? (
                        <div className="flex-1 min-h-0 overflow-y-auto p-6">
                            {infoContent}
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0">
                            <FlipCard
                                front={<MarkdownContent content={card.front} />}
                                back={<MarkdownContent content={card.back} />}
                                isFlipped={isFlipped}
                                clickToFlip
                                onFlip={handleFlip}
                            />
                        </div>
                    )}

                    {/* ── Footer ── */}
                    <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-border-primary">
                        {isEditing ? (
                            <>
                                <button
                                    type="button"
                                    onClick={closeEdit}
                                    className="px-4 py-2 rounded-lg text-sm font-medium border border-border-primary text-text-secondary hover:bg-surface-secondary transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveEdit}
                                    disabled={!editFront.trim() || !editBack.trim()}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-primary text-text-inverse hover:bg-accent-primary-hover transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                >
                                    Save Changes
                                </button>
                            </>
                        ) : infoContent != null ? (
                            <div />
                        ) : (
                            <>
                                {/* Mobile nav arrows */}
                                <div className="flex items-center gap-2 sm:hidden">
                                    <button
                                        type="button"
                                        onClick={goToPrev}
                                        disabled={!canGoPrev}
                                        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                        aria-label="Previous card"
                                    >
                                        <ChevronLeft className="w-4 h-4" aria-hidden />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={goToNext}
                                        disabled={!canGoNext}
                                        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                        aria-label="Next card"
                                    >
                                        <ChevronRight className="w-4 h-4" aria-hidden />
                                    </button>
                                </div>
                                <div className="hidden sm:block" />

                                <button
                                    type="button"
                                    onClick={handleFlip}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface-secondary border border-border-primary text-text-secondary hover:bg-surface-tertiary transition-colors cursor-pointer"
                                >
                                    <RotateCcw className="w-4 h-4" aria-hidden />
                                    Flip
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Next arrow */}
                {showSidebar && (
                    <button
                        type="button"
                        onClick={goToNext}
                        disabled={!canGoNext}
                        className="shrink-0 p-2 rounded-full bg-surface-primary/80 border border-border-primary text-text-secondary
                                   hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer
                                   disabled:opacity-30 disabled:cursor-not-allowed hidden sm:flex items-center justify-center"
                        aria-label="Next card"
                    >
                        <ChevronRight className="w-5 h-5" aria-hidden />
                    </button>
                )}
            </div>
        </div>
    );
}
