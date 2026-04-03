# Issue #12 Plan: Reverse Cards (Answer -> Question)

Issue: https://github.com/aberiggs/flashcards/issues/12

## Goal

Allow one-click generation of reverse cards for a deck while avoiding duplicates and enforcing deck/user card limits.

## Scope

- Add a deck-level action to generate reverse cards.
- Add a confirmation modal that previews how many cards will be created.
- Skip reverse cards that already exist.
- Skip duplicate reverse candidates created by repeated/similar source cards.
- Enforce per-deck and per-user card limits with clear errors.
- Keep reverse cards as normal persisted cards with fresh SM-2 state.

## Implementation Plan

1. Add Convex query for reverse-generation preview (counts + capacity checks).
2. Add Convex mutation to create reverse cards and return creation/skip stats.
3. Add deck page CTA (`Generate reverse cards`) near card-management actions.
4. Add confirmation modal with creation count, skip counts, and capacity summary.
5. Disable confirmation when limits are exceeded.
6. Show success/error toasts with outcome details.
7. Run lint/type-check.

## Explicit Decisions (for review later)

- Decision: Persist reverse cards as separate DB rows instead of virtual rendering.
  - Why: Matches issue expectation for independent SM-2 progression by direction.
  - Revisit: Evaluate virtual bidirectional mode if card-edit synchronization becomes a pain point.

- Decision: Deduplicate using normalized text pairs (`trim + collapse whitespace + lowercase`) for `front/back`.
  - Why: Avoid near-identical duplicate reverses caused by casing/spacing differences.
  - Revisit: Could become too aggressive for case-sensitive topics (e.g., coding symbols, proper nouns).

- Decision: Keep reverse generation as a separate action on deck detail page (not bundled into AI generation flow yet).
  - Why: Smaller scope and clearer behavior for beta launch.
  - Revisit: Add optional "also generate reverses" toggle in AI flow later.

## Validation Checklist

- [ ] User can open reverse-generation confirmation from deck page.
- [ ] Confirmation shows how many reverses will be created before write.
- [ ] Existing reverses and duplicate candidates are skipped.
- [ ] Deck/user limits are validated and blocking errors are clear.
- [ ] New reverses have fresh SM-2 state (no carried schedule).
- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes.
