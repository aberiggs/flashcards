import { Plus, Layers, Clock, CalendarClock } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface DeckWithStats {
    _id: string;
    name: string;
    description?: string;
    _creationTime: number;
    cardCount: number;
    lastStudied?: number;
    dueCount?: number;
    nextReviewAt?: number;
}

interface DeckCardProps {
    deck: DeckWithStats;
    onStudy?: (deckId: string) => void;
    onEdit?: (deckId: string) => void;
}

function formatLastStudied(timestamp: number) {
    const now = Date.now();
    const diffTime = Math.abs(now - timestamp);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours < 1) {
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            if (diffMinutes < 1) return 'just now';
            if (diffMinutes === 1) return '1 minute ago';
            return `${diffMinutes} minutes ago`;
        }
        if (diffHours === 1) return '1 hour ago';
        return `${diffHours} hours ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

function formatNextReviewIn(timestamp: number) {
    const now = Date.now();
    const diffTime = timestamp - now;
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) return diffMinutes <= 1 ? 'in 1 minute' : `in ${diffMinutes} minutes`;
    if (diffHours < 24) return diffHours === 1 ? 'in 1 hour' : `in ${diffHours} hours`;
    if (diffDays === 1) return 'tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;
    if (diffDays < 30) return `in ${Math.floor(diffDays / 7)} weeks`;
    return `in ${Math.floor(diffDays / 30)} months`;
}

export function DeckCard({ deck, onStudy, onEdit }: DeckCardProps) {
    const hasDue = (deck.dueCount ?? 0) > 0;

    return (
        <Card variant="hover" className="flex flex-col min-h-[220px]">
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors truncate">
                        {deck.name}
                    </h3>
                    {hasDue && (
                        <span className="shrink-0 rounded-full bg-accent-primary/15 px-2.5 py-0.5 text-xs font-medium text-accent-primary">
                            {deck.dueCount} due
                        </span>
                    )}
                </div>
                {deck.description && (
                    <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                        {deck.description}
                    </p>
                )}

                <div className="mt-auto space-y-2 text-sm text-text-tertiary">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 shrink-0 text-text-tertiary" aria-hidden />
                        <span>{deck.cardCount} cards</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0 text-text-tertiary" aria-hidden />
                        <span>
                            {deck.lastStudied
                                ? `Studied ${formatLastStudied(deck.lastStudied)}`
                                : 'Never studied'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 shrink-0 text-text-tertiary" aria-hidden />
                        <span className={hasDue ? 'text-accent-primary font-medium' : ''}>
                            {hasDue
                                ? `${deck.dueCount} cards ready to review`
                                : deck.nextReviewAt != null
                                    ? `Next review ${formatNextReviewIn(deck.nextReviewAt)}`
                                    : 'All caught up'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-5 pt-4 border-t border-border-primary flex gap-2">
                <button
                    onClick={() => hasDue && onStudy?.(deck._id)}
                    disabled={!hasDue}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium cursor-pointer
                        transition-all duration-200 ease-out
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-primary
                        ${!hasDue
                            ? 'bg-surface-tertiary text-text-tertiary cursor-not-allowed focus:ring-border-primary'
                            : 'bg-accent-primary text-text-inverse hover:bg-accent-primary-hover focus:ring-accent-primary'
                        }`}
                >
                    Study
                </button>
                <button
                    onClick={() => onEdit?.(deck._id)}
                    className="flex-1 py-2.5 px-3 rounded-lg text-sm font-medium cursor-pointer bg-surface-secondary text-text-primary border border-border-primary
                        hover:bg-surface-tertiary hover:border-border-secondary
                        focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface-primary
                        transition-all duration-200"
                >
                    Edit
                </button>
            </div>
        </Card>
    );
}

export function CreateDeckCard({ onClick }: { onClick?: () => void }) {
    return (
        <div
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
            className="min-h-[220px] bg-surface-primary border-2 border-dashed border-border-primary rounded-lg p-6
                hover:border-accent-primary/50 hover:bg-surface-secondary hover:shadow-md
                focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface-primary
                transition-all duration-200 ease-out group cursor-pointer flex flex-col items-center justify-center text-center"
        >
            <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center mb-4 group-hover:bg-accent-primary/20 transition-colors">
                <Plus className="w-6 h-6 text-accent-primary" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-accent-primary transition-colors">
                Create New Deck
            </h3>
            <p className="text-text-secondary text-sm">
                Start building your knowledge
            </p>
        </div>
    );
}
