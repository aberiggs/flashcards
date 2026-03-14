'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useTheme } from '@/components/theme/ThemeProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AppHeader } from '@/components/layout/AppHeader';
import { useToast } from '@/components/ui/Toast';
import { Key, Trash2 } from 'lucide-react';

export default function OptionsPage() {
    const { theme, resolvedTheme } = useTheme();
    const { toast } = useToast();
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
            toast.success('API key saved');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save API key');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveKey = async () => {
        try {
            await removeApiKeyMutation();
            toast.success('API key removed');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to remove API key');
        }
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
                            Your key is stored securely and never shared.{' '}
                            <a
                                href="https://platform.openai.com/api-keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent-primary hover:underline"
                            >
                                Get your API key from OpenAI
                            </a>
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