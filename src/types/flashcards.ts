export type Card = {
    id: string;
    deckId: string;
    front: string;
    back: string;
    createdAt: Date;
    updatedAt?: Date;
    lastStudied?: Date;
}

export type Deck = {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt?: Date;
}

export type DeckStats = {
    cardCount: number;
    lastStudied?: Date;
}