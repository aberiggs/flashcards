'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex items-center space-x-2" role="radiogroup" aria-label="Theme selection">
            <button
                onClick={() => setTheme('light')}
                className={`p-2.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary ${theme === 'light'
                    ? 'bg-surface-secondary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                    }`}
                aria-label="Light theme"
                role="radio"
                aria-checked={theme === 'light'}
            >
                <Sun className="w-5 h-5" aria-hidden />
            </button>

            <button
                onClick={() => setTheme('dark')}
                className={`p-2.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary ${theme === 'dark'
                    ? 'bg-surface-secondary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                    }`}
                aria-label="Dark theme"
                role="radio"
                aria-checked={theme === 'dark'}
            >
                <Moon className="w-5 h-5" aria-hidden />
            </button>

            <button
                onClick={() => setTheme('system')}
                className={`p-2.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary ${theme === 'system'
                    ? 'bg-surface-secondary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                    }`}
                aria-label="System theme"
                role="radio"
                aria-checked={theme === 'system'}
            >
                <Monitor className="w-5 h-5" aria-hidden />
            </button>
        </div>
    );
}
