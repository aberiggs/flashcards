# Issue #13 Plan: Cram Mode

Issue: https://github.com/aberiggs/flashcards/issues/13

## Goal

Ship a dedicated cram flow that is fast, round-based, and independent from SM-2 scheduling.

## Scope

- Add a `Cram` entry point on deck detail page when a deck has cards.
- Add a new cram route at `/decks/[id]/cram`.
- Include all deck cards regardless of due date.
- Use binary grading: `Got it` / `Missed it`.
- Recycle missed cards into subsequent rounds until cleared.
- Show timer, round number, and cards remaining.
- Show end-of-session summary with rounds, time, and retry stats.
- Do not update SM-2 state.
- Record cram sessions for activity metrics in a distinguishable way.
- Attempt optional AI-based ordering when user has an API key, else fallback ordering.

## Implementation Plan

1. Add cram session mode support in `studySessions` (`study` vs `cram`).
2. Update session mutations to accept/read mode while keeping existing study behavior.
3. Add AI action to optionally prioritize cram card order using card metadata.
4. Build cram page with round state machine and binary grading.
5. Track elapsed time and final summary stats.
6. Add `Cram` button on deck detail page.
7. Ensure existing dashboard/activity logic still works with mixed session modes.
8. Run lint/type-check and regenerate Convex types if schema changes require it.

## Explicit Decisions (for review later)

- Decision: Use dedicated route (`/decks/[id]/cram`) instead of query-param mode.
  - Why: Keeps study and cram logic isolated and easier to evolve independently.
  - Revisit: Could consolidate with shared components if maintenance cost grows.

- Decision: Track cram sessions in `studySessions` with a new `mode` field instead of a new table.
  - Why: Reuses existing metrics pipeline while allowing mode-level distinction.
  - Revisit: If cram analytics diverge, move to a dedicated table.

- Decision: AI ordering is best-effort and optional; fallback is deterministic local shuffle.
  - Why: Maintains availability without API key or if LLM response fails.
  - Revisit: Add richer heuristics and cached embeddings if ordering quality is weak.

## Validation Checklist

- [ ] Cram button appears on deck detail page when cards exist.
- [ ] Cram mode includes all deck cards (not due-filtered).
- [ ] `Got it` / `Missed it` flow works and recycles misses into next rounds.
- [ ] Timer, round, and cards-remaining are visible.
- [ ] Session summary reports rounds/time/retry insight.
- [ ] No SM-2 updates occur from cram actions.
- [ ] Cram sessions are recorded and distinguishable from normal study sessions.
- [ ] AI ordering runs when API key exists and falls back safely otherwise.
- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes.
