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
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-8">
                    {/* Appearance */}
                    <section className="bg-surface-primary border border-border-primary rounded-lg p-6">
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

                    {/* Theme Demo */}
                    <section className="bg-surface-primary border border-border-primary rounded-lg p-6">
                        <h2 className="text-2xl font-semibold text-text-primary mb-4">
                            Theme Preview
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Color Palette */}
                            <div>
                                <h3 className="text-lg font-medium text-text-primary mb-4">
                                    Color Palette
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-surface-primary border border-border-primary rounded-md"></div>
                                        <div>
                                            <div className="text-sm font-medium text-text-primary">Surface Primary</div>
                                            <div className="text-xs text-text-tertiary">Main background color</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-surface-secondary border border-border-primary rounded-md"></div>
                                        <div>
                                            <div className="text-sm font-medium text-text-primary">Surface Secondary</div>
                                            <div className="text-xs text-text-tertiary">Secondary background</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-surface-tertiary border border-border-primary rounded-md"></div>
                                        <div>
                                            <div className="text-sm font-medium text-text-primary">Surface Tertiary</div>
                                            <div className="text-xs text-text-tertiary">Tertiary background</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-accent-primary rounded-md"></div>
                                        <div>
                                            <div className="text-sm font-medium text-text-primary">Accent Primary</div>
                                            <div className="text-xs text-text-tertiary">Primary action color</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Text Colors */}
                            <div>
                                <h3 className="text-lg font-medium text-text-primary mb-4">
                                    Text Colors
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-text-primary font-medium">Primary Text</div>
                                        <div className="text-xs text-text-tertiary">Main content text</div>
                                    </div>

                                    <div>
                                        <div className="text-text-secondary font-medium">Secondary Text</div>
                                        <div className="text-xs text-text-tertiary">Supporting content</div>
                                    </div>

                                    <div>
                                        <div className="text-text-tertiary font-medium">Tertiary Text</div>
                                        <div className="text-xs text-text-tertiary">Muted content</div>
                                    </div>

                                    <div>
                                        <div className="text-accent-success font-medium">Success Text</div>
                                        <div className="text-xs text-text-tertiary">Positive actions</div>
                                    </div>

                                    <div>
                                        <div className="text-accent-error font-medium">Error Text</div>
                                        <div className="text-xs text-text-tertiary">Error states</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Component Examples */}
                    <section className="bg-surface-primary border border-border-primary rounded-lg p-6">
                        <h2 className="text-2xl font-semibold text-text-primary mb-4">
                            Component Examples
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Buttons */}
                            <div>
                                <h3 className="text-lg font-medium text-text-primary mb-3">Buttons</h3>
                                <div className="space-y-2">
                                    <button className="w-full bg-accent-primary text-text-inverse py-2 px-4 rounded-md hover:bg-accent-primary-hover transition-colors cursor-pointer">
                                        Primary Button
                                    </button>
                                    <button className="w-full bg-surface-primary text-text-primary border border-border-primary py-2 px-4 rounded-md hover:bg-surface-secondary transition-colors cursor-pointer">
                                        Secondary Button
                                    </button>
                                    <button className="w-full bg-accent-success text-text-inverse py-2 px-4 rounded-md hover:opacity-90 transition-colors cursor-pointer">
                                        Success Button
                                    </button>
                                    <button className="w-full bg-accent-error text-text-inverse py-2 px-4 rounded-md hover:opacity-90 transition-colors cursor-pointer">
                                        Error Button
                                    </button>
                                </div>
                            </div>

                            {/* Cards */}
                            <div>
                                <h3 className="text-lg font-medium text-text-primary mb-3">Cards</h3>
                                <div className="space-y-3">
                                    <div className="bg-surface-secondary border border-border-primary rounded-lg p-4">
                                        <h4 className="font-medium text-text-primary mb-2">Card Title</h4>
                                        <p className="text-text-secondary text-sm">
                                            This is an example card with some content to demonstrate the theme.
                                        </p>
                                    </div>

                                    <div className="bg-surface-tertiary border border-border-primary rounded-lg p-4">
                                        <h4 className="font-medium text-text-primary mb-2">Tertiary Card</h4>
                                        <p className="text-text-secondary text-sm">
                                            Another card example with different background.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* App Settings */}
                    <section className="bg-surface-primary border border-border-primary rounded-lg p-6">
                        <h2 className="text-2xl font-semibold text-text-primary mb-4">
                            App Settings
                        </h2>

                        <div className="space-y-4">
                            {/* Study Settings */}
                            <div>
                                <h3 className="text-lg font-medium text-text-primary mb-3">Study Preferences</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            className="rounded border-border-primary text-accent-primary focus:ring-accent-primary"
                                        />
                                        <span className="text-text-primary">Auto-advance to next card</span>
                                    </label>

                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            className="rounded border-border-primary text-accent-primary focus:ring-accent-primary"
                                        />
                                        <span className="text-text-primary">Show progress bar</span>
                                    </label>

                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            className="rounded border-border-primary text-accent-primary focus:ring-accent-primary"
                                        />
                                        <span className="text-text-primary">Enable keyboard shortcuts</span>
                                    </label>
                                </div>
                            </div>

                            {/* Data Settings */}
                            <div>
                                <h3 className="text-lg font-medium text-text-primary mb-3">Data Management</h3>
                                <div className="space-y-3">
                                    <button className="bg-accent-primary text-text-inverse py-2 px-4 rounded-md hover:bg-accent-primary-hover transition-colors cursor-pointer">
                                        Export Flashcards
                                    </button>
                                    <button className="bg-surface-primary text-text-primary border border-border-primary py-2 px-4 rounded-md hover:bg-surface-secondary transition-colors cursor-pointer">
                                        Import Flashcards
                                    </button>
                                    <button className="bg-accent-error text-text-inverse py-2 px-4 rounded-md hover:opacity-90 transition-colors cursor-pointer">
                                        Clear All Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* About Section */}
                    <section className="bg-surface-primary border border-border-primary rounded-lg p-6">
                        <h2 className="text-2xl font-semibold text-text-primary mb-4">
                            About
                        </h2>

                        <div className="space-y-3 text-text-secondary">
                            <p>
                                <strong>Version:</strong> 1.0.0
                            </p>
                            <p>
                                <strong>Theme System:</strong> CSS Custom Properties with Tailwind CSS
                            </p>
                            <p>
                                <strong>Features:</strong> Light/Dark/System themes with smooth transitions
                            </p>
                            <p>
                                <strong>Storage:</strong> Theme preferences saved to localStorage
                            </p>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
} 