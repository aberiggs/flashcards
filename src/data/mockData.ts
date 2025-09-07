import type { Deck, Card } from '@/types/flashcards';

export const createMockDecks = (): Deck[] => [
    {
        id: crypto.randomUUID(),
        name: 'JavaScript Fundamentals',
        description: 'Core JavaScript concepts and syntax',
        createdAt: new Date('2025-01-15'),
    },
    {
        id: crypto.randomUUID(),
        name: 'React Hooks',
        description: 'useState, useEffect, and custom hooks',
        createdAt: new Date('2025-02-10'),
    },
    {
        id: crypto.randomUUID(),
        name: 'Spanish Vocabulary',
        description: 'Common Spanish words and phrases',
        createdAt: new Date('2025-03-05'),
    },
    {
        id: crypto.randomUUID(),
        name: 'CSS Grid & Flexbox',
        description: 'Modern CSS layout techniques',
        createdAt: new Date('2025-04-20'),
    }
];

export const createMockCards = (decks: Deck[]): Card[] => [
    // JavaScript Fundamentals cards
    {
        id: crypto.randomUUID(),
        deckId: decks[0].id,
        front: 'What is the difference between let, const, and var?',
        back: 'let and const are block-scoped, var is function-scoped. const cannot be reassigned, let can be reassigned, var can be both redeclared and reassigned.',
        createdAt: new Date('2025-01-15'),
        lastStudied: new Date('2025-01-20'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[0].id,
        front: 'What is a closure in JavaScript?',
        back: 'A closure is a function that has access to variables in its outer (enclosing) scope even after the outer function returns.',
        createdAt: new Date('2025-01-15'),
        lastStudied: new Date('2025-02-05'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[0].id,
        front: 'What is the difference between == and ===?',
        back: '== performs type coercion before comparison, === performs strict comparison without type coercion.',
        createdAt: new Date('2025-01-15'),
        lastStudied: new Date('2025-01-18'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[0].id,
        front: 'What is hoisting in JavaScript?',
        back: 'Hoisting is JavaScript\'s behavior of moving declarations to the top of their scope before code execution.',
        createdAt: new Date('2025-01-15'),
        lastStudied: new Date('2025-03-10'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[0].id,
        front: 'What is the event loop?',
        back: 'The event loop is a mechanism that allows JavaScript to perform non-blocking operations by offloading operations to the system kernel.',
        createdAt: new Date('2025-01-15'),
        // This card hasn't been studied yet
    },

    // React Hooks cards
    {
        id: crypto.randomUUID(),
        deckId: decks[1].id,
        front: 'What is useState used for?',
        back: 'useState is a React Hook that lets you add state to functional components.',
        createdAt: new Date('2025-02-10'),
        lastStudied: new Date('2025-02-15'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[1].id,
        front: 'What is useEffect used for?',
        back: 'useEffect is a React Hook that lets you perform side effects in functional components, such as data fetching or subscriptions.',
        createdAt: new Date('2025-02-10'),
        lastStudied: new Date('2025-02-12'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[1].id,
        front: 'What is the dependency array in useEffect?',
        back: 'The dependency array tells React when to re-run the effect. If empty [], it runs only once. If it contains values, it runs when those values change.',
        createdAt: new Date('2025-02-10'),
        lastStudied: new Date('2025-03-20'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[1].id,
        front: 'What is useCallback used for?',
        back: 'useCallback returns a memoized callback function that only changes if one of its dependencies has changed.',
        createdAt: new Date('2025-02-10'),
        // This card hasn't been studied yet
    },

    // Spanish Vocabulary cards
    {
        id: crypto.randomUUID(),
        deckId: decks[2].id,
        front: 'Hello',
        back: 'Hola',
        createdAt: new Date('2025-03-05'),
        lastStudied: new Date('2025-03-08'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[2].id,
        front: 'Thank you',
        back: 'Gracias',
        createdAt: new Date('2025-03-05'),
        lastStudied: new Date('2025-03-12'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[2].id,
        front: 'Good morning',
        back: 'Buenos días',
        createdAt: new Date('2025-03-05'),
        lastStudied: new Date('2025-04-15'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[2].id,
        front: 'How are you?',
        back: '¿Cómo estás?',
        createdAt: new Date('2025-03-05'),
        lastStudied: new Date('2025-03-10'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[2].id,
        front: 'Goodbye',
        back: 'Adiós',
        createdAt: new Date('2025-03-05'),
        lastStudied: new Date('2025-05-02'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[2].id,
        front: 'Please',
        back: 'Por favor',
        createdAt: new Date('2025-03-05'),
        // This card hasn't been studied yet
    },

    // CSS Grid & Flexbox cards
    {
        id: crypto.randomUUID(),
        deckId: decks[3].id,
        front: 'What is CSS Grid?',
        back: 'CSS Grid is a two-dimensional layout system that allows you to create complex layouts with rows and columns.',
        createdAt: new Date('2025-04-20'),
        lastStudied: new Date('2025-04-25'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[3].id,
        front: 'What is Flexbox?',
        back: 'Flexbox is a one-dimensional layout method for laying out items in rows or columns.',
        createdAt: new Date('2025-04-20'),
        lastStudied: new Date('2025-04-22'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[3].id,
        front: 'What is the difference between justify-content and align-items?',
        back: 'justify-content aligns items along the main axis, align-items aligns items along the cross axis.',
        createdAt: new Date('2025-04-20'),
        lastStudied: new Date('2025-05-10'),
    },
    {
        id: crypto.randomUUID(),
        deckId: decks[3].id,
        front: 'What is grid-template-columns used for?',
        back: 'grid-template-columns defines the size and number of columns in a CSS Grid.',
        createdAt: new Date('2025-04-20'),
        // This card hasn't been studied yet
    }
];

export const seedSampleData = (): { decks: Deck[]; cards: Card[] } => {
    const decks = createMockDecks();
    const cards = createMockCards(decks);
    return { decks, cards };
};
