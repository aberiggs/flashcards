import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'dashed' | 'hover';
    onClick?: () => void;
}

export function Card({ children, className = '', variant = 'default', onClick }: CardProps) {
    const baseClasses = "bg-surface-primary border rounded-lg p-6";

    const variantClasses = {
        default: "border-border-primary",
        dashed: "border-2 border-dashed border-border-primary",
        hover: "border-border-primary hover:shadow-md transition-all duration-200 hover:border-accent-primary/50 group"
    };

    const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

    return (
        <div className={classes} onClick={onClick}>
            {children}
        </div>
    );
} 