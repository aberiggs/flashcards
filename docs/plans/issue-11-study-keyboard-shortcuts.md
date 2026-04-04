# Issue #11 Plan: Keyboard Shortcuts for Study Mode

Issue: https://github.com/aberiggs/flashcards/issues/11

## Goal

Add keyboard shortcuts to `/decks/[id]/study` so review can be completed without reaching for the mouse.

## Scope

- Add `Space` to reveal the answer when the question side is visible.
- Add `1` / `2` / `3` / `4` to select `Wrong` / `Close` / `Hard` / `Easy` when the answer side is visible.
- Make shortcuts inactive while focus is in text entry contexts (`input`, `textarea`, `select`, or contentEditable).
- Add visual affordances for discoverability (button labels and a compact shortcut hint).

## Implementation Plan

1. Add a `keydown` listener effect in `src/app/(protected)/decks/[id]/study/page.tsx`.
2. Guard shortcut handling with an active-element check for text-entry contexts.
3. Wire `Space` to `handleShowAnswer()` only when `showAnswer` is false.
4. Wire numeric shortcuts to existing `handleConfidence(...)` flows.
5. Add visible key labels (`1`, `2`, `3`, `4`) to confidence buttons plus one-line hint text.
6. Run lint/type-check and confirm no behavior regressions.

## Explicit Decisions (for review later)

- Decision: Use raw `keydown` + numeric keys (`1`-`4`) rather than numpad-specific handling.
  - Why: Simpler and aligns with proposed acceptance criteria.
  - Revisit: Add explicit numpad support if users report inconsistency.

- Decision: Keep shortcuts globally active on the page except in text-entry contexts.
  - Why: There are no editable fields on normal study UI, so this maximizes speed.
  - Revisit: Scope to card container if future UI adds interactive controls.

- Decision: Add persistent visible shortcut hints directly near confidence controls.
  - Why: New users discover shortcuts without opening a help modal.
  - Revisit: Replace with tooltip/help drawer if UI density becomes an issue.

## Validation Checklist

- [ ] Space reveals answer when on question side.
- [ ] `1`/`2`/`3`/`4` map to `Wrong`/`Close`/`Hard`/`Easy` on answer side.
- [ ] Key handling does not fire while typing in form fields.
- [ ] Shortcut hints are visible and understandable.
- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes.
