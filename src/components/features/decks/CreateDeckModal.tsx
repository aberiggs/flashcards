'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

interface CreateDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateDeckModal({ isOpen, onClose }: CreateDeckModalProps) {
    const createDeck = useMutation(api.decks.create);
    const [deckName, setDeckName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedName = deckName.trim();

        if (!trimmedName) {
            setError('Deck name is required');
            return;
        }

        if (trimmedName.length < 3) {
            setError('Deck name must be at least 3 characters');
            return;
        }

        if (trimmedName.length > 50) {
            setError('Deck name must be less than 50 characters');
            return;
        }

        setError('');
        await createDeck({
            name: trimmedName,
            description: 'Add your first card to get started',
        });
        setDeckName('');
        onClose();
    };

    const handleClose = () => {
        setDeckName('');
        setError('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Create New Deck">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="deckName" className="block text-sm font-medium text-text-secondary mb-2">
                        Deck Name
                    </label>
                    <input
                        id="deckName"
                        type="text"
                        value={deckName}
                        onChange={(e) => {
                            setDeckName(e.target.value);
                            if (error) setError('');
                        }}
                        className="w-full px-3 py-2 border border-border-primary rounded-md 
              focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent
              bg-surface-primary text-text-primary placeholder-text-tertiary"
                        placeholder="Enter deck name..."
                        autoFocus
                    />
                    {error && (
                        <p className="text-accent-error text-sm mt-1">{error}</p>
                    )}
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 bg-surface-secondary text-text-primary border border-border-primary py-2 px-4 rounded-md 
              hover:bg-surface-tertiary hover:scale-105 active:scale-95 transform transition-all duration-200 ease-out
              focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex-1 bg-accent-primary text-text-inverse py-2 px-4 rounded-md font-medium
              hover:bg-accent-primary-hover hover:scale-105 active:scale-95 transform transition-all duration-200 ease-out
              focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
                    >
                        Create Deck
                    </button>
                </div>
            </form>
        </Modal>
    );
}
