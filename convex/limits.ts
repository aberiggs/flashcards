import { query } from "./_generated/server";

// Resource caps — edit here to change limits across the entire backend.
export const MAX_DECKS_PER_USER = 50;
export const MAX_CARDS_PER_DECK = 500;
export const MAX_CARDS_PER_USER = 5_000;

/** Public query so the client can display live limit values. */
export const getLimits = query({
    args: {},
    handler: async () => ({
        maxDecks: MAX_DECKS_PER_USER,
        maxCardsPerDeck: MAX_CARDS_PER_DECK,
        maxCardsPerUser: MAX_CARDS_PER_USER,
    }),
});
