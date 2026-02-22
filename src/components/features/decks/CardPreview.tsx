'use client';

interface CardPreviewProps {
    front: string;
    index: number;
    onClick: () => void;
}

export function CardPreview({ front, index, onClick }: CardPreviewProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group h-32 sm:h-[140px] w-full text-left rounded-xl border border-border-primary bg-surface-primary p-4 sm:p-5 shadow-sm
                       hover:border-accent-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer
                       focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
        >
            <div className="flex flex-col h-full">
                <span className="text-xs font-medium text-text-tertiary mb-2 uppercase tracking-wider">
                    Card {index + 1}
                </span>
                <p className="text-text-primary text-sm whitespace-pre-wrap break-words line-clamp-3 flex-1">
                    {front || '\u00A0'}
                </p>
            </div>
        </button>
    );
}
