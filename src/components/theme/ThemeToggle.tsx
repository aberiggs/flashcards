'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex items-center space-x-2">
            <button
                onClick={() => setTheme('light')}
                className={`p-2 rounded-md transition-colors cursor-pointer ${theme === 'light'
                    ? 'bg-surface-secondary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                    }`}
                title="Light theme"
            >
                <Sun className="w-5 h-5" aria-hidden />
            </button>

            <button
                onClick={() => setTheme('dark')}
                className={`p-2 rounded-md transition-colors cursor-pointer ${theme === 'dark'
                    ? 'bg-surface-secondary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                    }`}
                title="Dark theme"
            >
                <Moon className="w-5 h-5" aria-hidden />
            </button>

            <button
                onClick={() => setTheme('system')}
                className={`p-2 rounded-md transition-colors cursor-pointer ${theme === 'system'
                    ? 'bg-surface-secondary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                    }`}
                title="System theme"
            >
                <Monitor className="w-5 h-5" aria-hidden />
            </button>
        </div>
    );
} 