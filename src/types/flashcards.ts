export type Card = {
    id: string;
    front: string;
    back: string;
    createdAt: Date;
    updatedAt?: Date;
    deckId: string;
}

export type Deck = {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt?: Date;
}