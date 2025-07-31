import { Card } from '@/components/ui/Card';

interface Deck {
    id: string;
    name: string;
    description: string;
    cardCount: number;
    lastStudied: Date;
}

interface DeckCardProps {
    deck: Deck;
    onStudy?: (deckId: string) => void;
    onEdit?: (deckId: string) => void;
}

export function DeckCard({ deck, onStudy, onEdit }: DeckCardProps) {
    const formatLastStudied = (date: Date) => {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
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
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                        {deck.name}
                    </h3>
                    <p className="text-text-secondary text-sm mt-1">
                        {deck.description}
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-center text-sm text-text-tertiary">
                <span>{deck.cardCount} cards</span>
                {deck.lastStudied && (
                    <span>Studied {formatLastStudied(deck.lastStudied)}</span>
                )}
            </div>

            <div className="mt-4 flex gap-2">
                <button
                    onClick={() => onStudy?.(deck.id)}
                    className="flex-1 bg-accent-primary text-text-inverse py-2 px-3 rounded-md text-sm font-medium 
            hover:bg-accent-primary-hover hover:scale-105 hover:shadow-lg 
            active:scale-95 transform transition-all duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
                >
                    Study
                </button>
                <button
                    onClick={() => onEdit?.(deck.id)}
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

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
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
                    <PlusIcon className="w-6 h-6 text-accent-primary" />
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