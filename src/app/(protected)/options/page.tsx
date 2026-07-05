'use client';

import { useTheme } from '@/components/theme/ThemeProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AppHeader } from '@/components/layout/AppHeader';

export default function OptionsPage() {
    const { theme, resolvedTheme } = useTheme();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <AppHeader title="Options" />

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-8">
                    {/* Appearance */}
                    <section className="bg-surface-primary border border-border-primary rounded-xl shadow-sm p-6">
                        <h2 className="text-2xl font-semibold text-text-primary mb-4">
                            Appearance
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Theme Mode
                                </label>
                                <div className="flex items-center space-x-4">
                                    <ThemeToggle />
                                    <span className="text-sm text-text-tertiary">
                                        Current: {theme} ({resolvedTheme})
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* About Section */}
                    <section className="bg-surface-primary border border-border-primary rounded-xl shadow-sm p-6">
                        <h2 className="text-2xl font-semibold text-text-primary mb-4">
                            About
                        </h2>

                        <div className="space-y-3 text-sm text-text-secondary">
                            <p>
                                <strong className="text-text-primary">Version:</strong> 0.1.0
                            </p>
                            <p>
                                <strong className="text-text-primary">Contact:</strong>{' '}
                                <a
                                    href="mailto:aberiggsiv@gmail.com"
                                    className="text-accent-primary hover:underline"
                                >
                                    aberiggsiv@gmail.com
                                </a>
                            </p>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}