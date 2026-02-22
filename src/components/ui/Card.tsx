import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'dashed' | 'hover';
    onClick?: () => void;
}

export function Card({ children, className = '', variant = 'default', onClick }: CardProps) {
    const baseClasses = "bg-surface-primary border rounded-xl shadow-sm p-6";

    const variantClasses = {
        default: "border-border-primary",
        dashed: "border-2 border-dashed border-border-primary shadow-none",
        hover: "border-border-primary hover:shadow-md transition-all duration-200 hover:border-accent-primary/50 group"
    };

    const clickableClass = onClick ? "cursor-pointer" : "";

    const classes = `${baseClasses} ${variantClasses[variant]} ${clickableClass} ${className}`;

    const handleKeyDown = onClick ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    } : undefined;

    return (
        <div
            className={classes}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={handleKeyDown}
        >
            {children}
        </div>
    );
} 