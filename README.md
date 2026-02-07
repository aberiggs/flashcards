# Flashcards

A flashcard app for creating and studying decks. Built with Next.js, React, Convex, and Tailwind CSS.

## Features

- **Decks & cards** — Create decks, add/edit/remove flashcards (front & back), delete decks
- **Study mode** — Review cards with flip-and-rate; progress, “last studied”, and due counts are tracked
- **Spaced repetition (SM-2)** — Rate cards as wrong / close / hard / easy; next review is scheduled automatically
- **Theme** — Light, dark, and system themes (Options page)
- **Auth** — Sign in with GitHub; data is scoped to your account

## Getting started

```bash
npm install
npx convex dev   # Run in a separate terminal (or first run)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other commands

- `npm run build` — Production build
- `npm run start` — Run production server (after build)
- `npm run lint` — Run ESLint
- `npx convex deploy` — Deploy Convex backend (production)

## Convex

[Convex](https://convex.dev) is the backend: a real-time database and serverless functions. The app uses:

- **Queries** — `useQuery(api.decks.list)` and similar for reactive, live-updating data
- **Mutations** — `useMutation(api.cards.recordReview)` for writes; Convex handles sync and persistence
- **Auth** — Convex Auth (GitHub OAuth); `getAuthUserId` enforces user-scoped access

Data lives in Convex tables (`decks`, `cards`, plus auth tables). Study sessions call `recordReview` to update SM-2 state (`efactor`, `repetitions`, `nextReview`) on each card.

## Tech stack

- [Next.js](https://nextjs.org) 15 (App Router, Turbopack in dev)
- React 19
- [Convex](https://convex.dev) — backend, auth, real-time DB
- TypeScript
- Tailwind CSS 4

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Deploy on Vercel](https://nextjs.org/docs/app/building-your-application/deploying)
