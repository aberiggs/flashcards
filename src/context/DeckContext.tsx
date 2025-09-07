"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Deck, Card } from "@/types/flashcards";
import { seedSampleData } from "@/data/mockData";

type DeckContextType = {
    // State
    decks: Deck[];
    cards: Card[];

    // Deck operations
    addDeck: (name: string, description?: string) => void;
    updateDeck: (id: string, updates: Partial<Pick<Deck, 'name' | 'description'>>) => void;
    deleteDeck: (id: string) => void;
    getDeck: (id: string) => Deck | undefined;

    // Card operations
    addCard: (deckId: string, front: string, back: string) => void;
    updateCard: (id: string, updates: Partial<Pick<Card, 'front' | 'back'>>) => void;
    deleteCard: (id: string) => void;
    getCardsByDeck: (deckId: string) => Card[];
    getCard: (id: string) => Card | undefined;

    // Utility functions
    getDeckWithCards: (deckId: string) => (Deck & { cards: Card[] }) | undefined;
    getDeckStats: (deckId: string) => { totalCards: number; lastStudied?: Date };
};

const DeckContext = createContext<DeckContextType | undefined>(undefined);

// Local storage keys
const DECKS_STORAGE_KEY = 'flashcards_decks';
const CARDS_STORAGE_KEY = 'flashcards_cards';

export function DeckProvider({ children }: { children: ReactNode }) {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [cards, setCards] = useState<Card[]>([]);

    // Load data from localStorage on mount
    useEffect(() => {
        try {
            const savedDecks = localStorage.getItem(DECKS_STORAGE_KEY);
            const savedCards = localStorage.getItem(CARDS_STORAGE_KEY);

            if (savedDecks && savedDecks !== '[]') {
                const parsedDecks = JSON.parse(savedDecks).map((deck: Omit<Deck, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt?: string }) => ({
                    ...deck,
                    createdAt: new Date(deck.createdAt),
                    updatedAt: deck.updatedAt ? new Date(deck.updatedAt) : undefined,
                }));
                setDecks(parsedDecks);
            } else {
                // Seed with sample data if no data exists
                const { decks: sampleDecks, cards: sampleCards } = seedSampleData();
                setDecks(sampleDecks);
                setCards(sampleCards);
            }

            if (savedCards && savedCards !== '[]') {
                const parsedCards = JSON.parse(savedCards).map((card: Omit<Card, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt?: string }) => ({
                    ...card,
                    createdAt: new Date(card.createdAt),
                    updatedAt: card.updatedAt ? new Date(card.updatedAt) : undefined,
                }));
                setCards(parsedCards);
            }
        } catch (error) {
            console.error('Failed to load data from localStorage:', error);
            // Seed with sample data on error
            const { decks: sampleDecks, cards: sampleCards } = seedSampleData();
            setDecks(sampleDecks);
            setCards(sampleCards);
        }
    }, []);


    // Save to localStorage whenever decks or cards change
    useEffect(() => {
        try {
            localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks));
        } catch (error) {
            console.error('Failed to save decks to localStorage:', error);
        }
    }, [decks]);

    useEffect(() => {
        try {
            localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(cards));
        } catch (error) {
            console.error('Failed to save cards to localStorage:', error);
        }
    }, [cards]);

    // Deck operations
    const addDeck = (name: string, description?: string) => {
        const newDeck: Deck = {
            id: crypto.randomUUID(),
            name,
            description,
            createdAt: new Date(),
        };
        setDecks((prev) => [...prev, newDeck]);
    };

    const updateDeck = (id: string, updates: Partial<Pick<Deck, 'name' | 'description'>>) => {
        setDecks((prev) =>
            prev.map(deck =>
                deck.id === id
                    ? { ...deck, ...updates, updatedAt: new Date() }
                    : deck
            )
        );
    };

    const deleteDeck = (id: string) => {
        setDecks((prev) => prev.filter(deck => deck.id !== id));
        // Also delete all cards in this deck
        setCards((prev) => prev.filter(card => card.deckId !== id));
    };

    const getDeck = (id: string) => {
        return decks.find(deck => deck.id === id);
    };

    // Card operations
    const addCard = (deckId: string, front: string, back: string) => {
        const newCard: Card = {
            id: crypto.randomUUID(),
            deckId,
            front,
            back,
            createdAt: new Date(),
        };
        setCards((prev) => [...prev, newCard]);
    };

    const updateCard = (id: string, updates: Partial<Pick<Card, 'front' | 'back'>>) => {
        setCards((prev) =>
            prev.map(card =>
                card.id === id
                    ? { ...card, ...updates, updatedAt: new Date() }
                    : card
            )
        );
    };

    const deleteCard = (id: string) => {
        setCards((prev) => prev.filter(card => card.id !== id));
    };

    const getCardsByDeck = (deckId: string) => {
        return cards.filter(card => card.deckId === deckId);
    };

    const getCard = (id: string) => {
        return cards.find(card => card.id === id);
    };

    // Utility functions
    const getDeckWithCards = (deckId: string) => {
        const deck = getDeck(deckId);
        if (!deck) return undefined;

        const deckCards = getCardsByDeck(deckId);
        return { ...deck, cards: deckCards };
    };

    const getDeckStats = (deckId: string) => {
        const deckCards = getCardsByDeck(deckId);
        return {
            totalCards: deckCards.length,
            // You can add lastStudied logic here when you implement study sessions
        };
    };

    return (
        <DeckContext.Provider value={{
            decks,
            cards,
            addDeck,
            updateDeck,
            deleteDeck,
            getDeck,
            addCard,
            updateCard,
            deleteCard,
            getCardsByDeck,
            getCard,
            getDeckWithCards,
            getDeckStats,
        }}>
            {children}
        </DeckContext.Provider>
    );
}

export function useDecks() {
    const ctx = useContext(DeckContext);
    if (!ctx) throw new Error("useDecks must be used within DeckProvider");
    return ctx;
}
