'use client';

import { ReactNode, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Info, Pencil, Trash2, X, RotateCcw } from 'lucide-react';
import type { Doc, Id } from '../../../../convex/_generated/dataModel';
import { MarkdownContent } from '@/components/ui/MarkdownContent';

interface CardViewerModalProps {
    cards: Doc<"cards">[];
    initialIndex: number;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (card: Doc<"cards">) => void;
    onDelete: (cardId: Id<"cards">) => void;
    /** When set, this content replaces the card viewer (e.g. edit form). Escape will call onCancelEdit. */
    editContent?: ReactNode | null;
    onCancelEdit?: () => void;
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
    editContent = null,
    onCancelEdit,
    infoContent = null,
    onCancelInfo,
    onShowInfo,
}: CardViewerModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isFlipped, setIsFlipped] = useState(false);

    // Sync currentIndex when initialIndex changes (opening a different card)
    useEffect(() => {
        setCurrentIndex(initialIndex);
        setIsFlipped(false);
    }, [initialIndex]);

    const canGoPrev = currentIndex > 0;
    const canGoNext = currentIndex < cards.length - 1;

    const goToPrev = useCallback(() => {
        if (canGoPrev) {
            setCurrentIndex((i) => i - 1);
            setIsFlipped(false);
        }
    }, [canGoPrev]);

    const goToNext = useCallback(() => {
        if (canGoNext) {
            setCurrentIndex((i) => i + 1);
            setIsFlipped(false);
        }
    }, [canGoNext]);

    const handleFlip = useCallback(() => {
        setIsFlipped((prev) => !prev);
    }, []);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    goToPrev();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    goToNext();
                    break;
                case ' ':
                    e.preventDefault();
                    handleFlip();
                    break;
                case 'Escape':
                    e.preventDefault();
                    if (editContent != null && onCancelEdit) {
                        onCancelEdit();
                    } else if (infoContent != null && onCancelInfo) {
                        onCancelInfo();
                    } else {
                        onClose();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, goToPrev, goToNext, handleFlip, onClose, editContent, onCancelEdit, infoContent, onCancelInfo]);

    if (!isOpen || cards.length === 0) return null;

    // Guard against out-of-bounds if cards array changes while open
    const safeIndex = Math.min(currentIndex, cards.length - 1);
    const card = cards[safeIndex];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
                onClick={onClose}
            />

            {/* Modal shell - narrower when showing edit or info */}
            <div className={`relative flex items-center gap-3 w-full mx-4 ${editContent != null || infoContent != null ? 'max-w-xl' : 'max-w-3xl'}`}>
                {/* Prev arrow - hide when editing or showing info */}
                {editContent == null && infoContent == null && (
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

                {/* Card container */}
                <div className="flex-1 h-[80vh] max-h-[600px] flex flex-col bg-surface-primary border border-border-primary rounded-xl shadow-xl overflow-hidden">
                    {editContent != null ? (
                        <>
                            {/* Edit mode header */}
                            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border-primary">
                                <h2 className="text-lg font-semibold text-text-primary">Edit Card</h2>
                                <button
                                    type="button"
                                    onClick={onCancelEdit}
                                    className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                                    aria-label="Back to card"
                                >
                                    <ChevronLeft className="w-4 h-4" aria-hidden />
                                </button>
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto p-6">
                                {editContent}
                            </div>
                        </>
                    ) : infoContent != null ? (
                        <>
                            {/* Card info header */}
                            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border-primary">
                                <h2 className="text-lg font-semibold text-text-primary">Card info</h2>
                                <button
                                    type="button"
                                    onClick={onCancelInfo}
                                    className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                                    aria-label="Back to card"
                                >
                                    <ChevronLeft className="w-4 h-4" aria-hidden />
                                </button>
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto p-6">
                                {infoContent}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Viewer header bar */}
                            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border-primary">
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
                                        onClick={() => onEdit(card)}
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
                            </div>

                            {/* Card content with flip */}
                            <div
                                className="relative flex-1 min-h-0"
                                style={{ perspective: '1200px' }}
                            >
                                <div
                                    className="absolute inset-0 transition-transform duration-500"
                                    style={{
                                        transformStyle: 'preserve-3d',
                                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                    }}
                                >
                                    {/* Front face */}
                                    <div
                                        className="absolute inset-0 flex flex-col items-center p-8 overflow-y-auto"
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            WebkitBackfaceVisibility: 'hidden',
                                        }}
                                    >
                                        <div className="flex-1 flex flex-col items-center justify-center w-full">
                                            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-4">
                                                Front
                                            </span>
                                            <div className="text-lg text-text-primary text-center leading-relaxed max-w-prose">
                                                <MarkdownContent content={card.front} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Back face */}
                                    <div
                                        className="absolute inset-0 flex flex-col items-center p-8 overflow-y-auto bg-surface-primary"
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            WebkitBackfaceVisibility: 'hidden',
                                            transform: 'rotateY(180deg)',
                                        }}
                                    >
                                        <div className="flex-1 flex flex-col items-center justify-center w-full">
                                            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-4">
                                                Back
                                            </span>
                                            <div className="text-lg text-text-primary text-center leading-relaxed max-w-prose">
                                                <MarkdownContent content={card.back} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer bar */}
                            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-border-primary">
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
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                                               bg-accent-primary text-text-inverse hover:bg-accent-primary-hover transition-colors cursor-pointer
                                               focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface-primary"
                                >
                                    <RotateCcw className="w-4 h-4" aria-hidden />
                                    Flip
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Next arrow - hide when editing or showing info */}
                {editContent == null && infoContent == null && (
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
