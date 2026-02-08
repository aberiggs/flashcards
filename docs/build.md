# Build & Run Instructions

## Prerequisites

- Node.js 18+
- npm

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run Convex backend** (in a separate terminal)

   ```bash
   npx convex dev
   ```

   Keep this running during development. On first run, Convex will prompt you to log in or create an account and link the project.

3. **Run the development server**

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server with Turbopack |
| `npm run build` | Create a production build |
| `npm run start` | Run production server (after `npm run build`) |
| `npm run lint` | Run ESLint |
| `npx convex dev` | Run Convex backend in development mode |
| `npx convex deploy` | Deploy Convex backend to production |

## Convex setup

[Convex](https://convex.dev) is the backend: a real-time database and serverless functions.

- **Queries** — `useQuery(api.decks.list)` and similar for reactive, live-updating data.
- **Mutations** — `useMutation(api.cards.recordReview)` for writes; Convex handles sync and persistence.
- **Auth** — Convex Auth with GitHub OAuth; `getAuthUserId` enforces user-scoped access.

Data lives in Convex tables (`decks`, `cards`, plus auth tables). Study sessions call `recordReview` to update SM-2 state (`efactor`, `repetitions`, `nextReview`) on each card.

## Environment

The app uses Convex environment variables (configured via `npx convex env set`) for auth providers. No `.env` file is required for basic development after `npx convex dev` links the project.
