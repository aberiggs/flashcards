'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useTheme } from '@/components/theme/ThemeProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AppHeader } from '@/components/layout/AppHeader';
import { Key, Trash2 } from 'lucide-react';

export default function OptionsPage() {
    const { theme, resolvedTheme } = useTheme();
    const settings = useQuery(api.settings.get);
    const saveApiKeyMutation = useMutation(api.settings.saveApiKey);
    const removeApiKeyMutation = useMutation(api.settings.removeApiKey);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSaveKey = async () => {
        if (!apiKeyInput.trim()) return;
        setSaving(true);
        try {
            await saveApiKeyMutation({ apiKey: apiKeyInput.trim() });
            setApiKeyInput('');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveKey = async () => {
        await removeApiKeyMutation();
    };

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

                    {/* AI Card Generation */}
                    <section className="bg-surface-primary border border-border-primary rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Key className="w-5 h-5 text-text-secondary" aria-hidden />
                            <h2 className="text-2xl font-semibold text-text-primary">
                                AI Card Generation
                            </h2>
                        </div>
                        <p className="text-sm text-text-secondary mb-4">
                            Add your OpenAI API key to generate flashcards from topics or notes.
                            Your key is stored securely and never shared.
                        </p>

                        {settings?.hasApiKey ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-text-secondary font-mono bg-surface-secondary px-3 py-1.5 rounded">
                                    {settings.apiKeyHint}
                                </span>
                                <button
                                    onClick={handleRemoveKey}
                                    className="inline-flex items-center gap-1.5 text-sm text-accent-error hover:opacity-80 transition-opacity cursor-pointer px-3 py-2 rounded-lg hover:bg-accent-error/10"
                                >
                                    <Trash2 className="w-3.5 h-3.5" aria-hidden />
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveKey();
                                    }}
                                    placeholder="sk-..."
                                    className="flex-1 bg-surface-secondary border border-border-primary rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                />
                                <button
                                    onClick={handleSaveKey}
                                    disabled={!apiKeyInput.trim() || saving}
                                    className="bg-accent-primary text-text-inverse px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-primary-hover transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Saving...' : 'Save Key'}
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Theme Demo */}
                    <section className="bg-surface-primary border border-border-primary rounded-xl shadow-sm p-6">
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
                    <section className="bg-surface-primary border border-border-primary rounded-xl shadow-sm p-6">
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

                    {/* About Section */}
                    <section className="bg-surface-primary border border-border-primary rounded-xl shadow-sm p-6">
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