# Flashcards

A lightweight study tool that does one thing well: create decks, study cards, and let SM-2 schedule reviews so you remember what matters.

Built for learners who want to spend time studying—not wrestling with clunky UIs or fighting with card creation. Simple, focused, and designed so you can actually retain what you learn.

## Purpose

Flashcards helps you build and maintain long-term retention using spaced repetition. You create decks with front-and-back cards, study them, and rate your confidence. The app schedules when to review each card so you see it again right when you're about to forget—instead of cramming or over-reviewing.

## Features

- **Decks & cards** — Create decks, add and edit flashcards (front and back), delete decks and cards as needed.
- **Study mode** — Review cards with flip-to-reveal; rate each card as wrong, close, hard, or easy. Progress, last-studied times, and due counts are tracked.
- **Spaced repetition (SM-2)** — Confidence ratings drive the scheduling algorithm. Cards are automatically scheduled for future review.
- **Dashboard** — Memory stages (new, learning, reviewing, mastered) and a review forecast (cards due today, tomorrow, in 3 days, in 7 days).
- **Theme** — Light, dark, and system themes via the Options page.
- **Auth** — Sign in with GitHub; your data is scoped to your account and stays private.

## Tech stack

- [Next.js](https://nextjs.org) 15 (App Router, Turbopack in dev)
- React 19
- [Convex](https://convex.dev) — backend, auth, real-time database
- TypeScript
- Tailwind CSS 4

## Docs

- [Build & run instructions](docs/build.md) — How to install, run locally, and deploy.
- [Roadmap](docs/roadmap.md) — What’s built and what’s planned.
