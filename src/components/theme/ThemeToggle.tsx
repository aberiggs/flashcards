'use client';

import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex items-center space-x-2">
            <button
                onClick={() => setTheme('light')}
                className={`p-2 rounded-md transition-colors ${theme === 'light'
                    ? 'bg-surface-secondary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                    }`}
                title="Light theme"
            >
                <SunIcon className="w-5 h-5" />
            </button>

            <button
                onClick={() => setTheme('dark')}
                className={`p-2 rounded-md transition-colors ${theme === 'dark'
                    ? 'bg-surface-secondary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                    }`}
                title="Dark theme"
            >
                <MoonIcon className="w-5 h-5" />
            </button>

            <button
                onClick={() => setTheme('system')}
                className={`p-2 rounded-md transition-colors ${theme === 'system'
                    ? 'bg-surface-secondary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                    }`}
                title="System theme"
            >
                <MonitorIcon className="w-5 h-5" />
            </button>
        </div>
    );
}

// Simple SVG icons
function SunIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );
}

function MoonIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
    );
}

function MonitorIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    );
} 