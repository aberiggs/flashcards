import { Trash2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface DeckWithStats {
    _id: string;
    name: string;
    description?: string;
    _creationTime: number;
    cardCount: number;
    lastStudied?: number;
}

interface DeckCardProps {
    deck: DeckWithStats;
    onStudy?: (deckId: string) => void;
    onEdit?: (deckId: string) => void;
    onDelete?: (deckId: string) => void;
}

export function DeckCard({ deck, onStudy, onEdit, onDelete }: DeckCardProps) {
    const formatLastStudied = (timestamp: number) => {
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
    };

    return (
        <Card variant="hover">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                        {deck.name}
                    </h3>
                    <p className="text-text-secondary text-sm mt-1">
                        {deck.description}
                    </p>
                </div>
                {onDelete && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(deck._id);
                        }}
                        className="p-2 text-text-tertiary hover:text-accent-error hover:bg-accent-error/10 rounded-md transition-colors shrink-0"
                        title="Delete deck"
                        aria-label="Delete deck"
                    >
                        <Trash2 className="w-4 h-4" aria-hidden />
                    </button>
                )}
            </div>

            <div className="flex justify-between items-center text-sm text-text-tertiary">
                <span>{deck.cardCount} cards</span>
                <span>
                    {deck.lastStudied
                        ? `Studied ${formatLastStudied(deck.lastStudied)}`
                        : 'Never studied'
                    }
                </span>
            </div>

            <div className="mt-4 flex gap-2">
                <button
                    onClick={() => onStudy?.(deck._id)}
                    className="flex-1 bg-accent-primary text-text-inverse py-2 px-3 rounded-md text-sm font-medium 
            hover:bg-accent-primary-hover hover:scale-105 hover:shadow-lg 
            active:scale-95 transform transition-all duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
                >
                    Study
                </button>
                <button
                    onClick={() => onEdit?.(deck._id)}
                    className="flex-1 bg-surface-secondary text-text-primary border border-border-primary py-2 px-3 rounded-md text-sm font-medium 
            hover:bg-surface-tertiary hover:scale-105 hover:shadow-md hover:border-accent-primary/50
            active:scale-95 transform transition-all duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
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
            className="bg-surface-primary border-2 border-dashed border-border-primary rounded-lg p-6 
            hover:border-accent-primary/50 hover:bg-surface-secondary hover:scale-105 hover:shadow-lg
            active:scale-95 transform transition-all duration-200 ease-out group cursor-pointer"
        >
            <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 bg-accent-primary/10 rounded-full flex items-center justify-center mb-4 
                    group-hover:bg-accent-primary/20 group-hover:scale-110 transition-all duration-200">
                    <Plus className="w-6 h-6 text-accent-primary" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-accent-primary transition-colors">
                    Create New Deck
                </h3>
                <p className="text-text-secondary text-sm">
                    Start building your knowledge
                </p>
            </div>
        </div>
    );
}
