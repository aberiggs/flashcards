import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
} as const;

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    size?: keyof typeof sizeClasses;
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Close modal on Escape key + manage focus
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            previousFocusRef.current = document.activeElement as HTMLElement;
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
            // Focus the dialog on open
            requestAnimationFrame(() => {
                dialogRef.current?.focus();
            });
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
            // Restore focus on close
            if (previousFocusRef.current) {
                previousFocusRef.current.focus();
                previousFocusRef.current = null;
            }
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
                onClick={onClose}
                aria-hidden
            />

            {/* Modal */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className={`relative bg-surface-primary border border-border-primary rounded-xl shadow-xl ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-y-auto focus:outline-none`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border-primary">
                    <h2 className="text-xl font-semibold text-text-primary">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-surface-secondary cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" aria-hidden />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
} 