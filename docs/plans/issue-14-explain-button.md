# Issue #14 Plan: "Explain this" Button During Study

Issue: https://github.com/aberiggs/flashcards/issues/14

## Goal

Add an AI explanation affordance to study sessions so learners can get immediate context without leaving the app.

## Scope

- Add an `Explain` action in study mode when the answer is revealed.
- Use BYOK OpenAI key requirement (same settings pattern as generation).
- Add loading and error states.
- Render explanation inline under the answer controls.
- Keep explanations contextual to the current card content.
- Cache explanations by card within the session to avoid duplicate API calls.

## Implementation Plan

1. Add a Convex AI action that takes card front/back and returns a concise explanation.
2. Build a specialized system prompt to adapt output for different study domains.
3. Integrate the action in `study/page.tsx` with loading/error/display states.
4. Add per-session client cache keyed by card ID.
5. Gate explain action by `settings.hasApiKey`.
6. Update docs and validate lint/type-check.

## Explicit Decisions (for review later)

- Decision: Add domain-aware prompt guidance now (history context + language examples) instead of a generic explanation-only prompt.
  - Why: Better learning utility for core beta use cases, aligned with product feedback.
  - Revisit: Move to explicit user-selectable explanation styles (e.g., "concise", "examples", "mnemonic").

- Decision: Implement explain UI in study mode first on this branch.
  - Why: Keeps this PR scoped to issue #14 on current `main` while cram mode ships in its own PR.
  - Revisit: Reuse the same explain panel/action in cram mode after cram PR merges.

- Decision: Cache explanations only in-memory for the active session.
  - Why: Avoids redundant calls without introducing persistence complexity.
  - Revisit: Persist explanation cache server-side if repeated deck sessions become expensive.

## Validation Checklist

- [ ] Explain button appears when answer is shown and API key exists.
- [ ] Explanation loads and displays in-context for the current card.
- [ ] Loading state is visible while waiting for response.
- [ ] Graceful error feedback appears on failure.
- [ ] Cached explanation prevents repeated calls for same card in-session.
- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes.
