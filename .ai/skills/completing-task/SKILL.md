---
name: completing-task
description: Use when finishing any software engineering task in the flashcards repo. Covers running lint, typecheck, and tests, updating docs/features.md and docs/build.md for user-visible or build/deploy changes, and the commit-at-every-checkpoint rule.
---

# Completing a task

Run these before considering a task done:

## 1. Lint, type-check, and test

```bash
npm run lint
npm run typecheck
npm run test
```

CI runs lint + typecheck on every push/PR, and tests run via Vitest with
testcontainers (requires Docker). Run all three locally before committing.

If you can't find the correct command, ask the user and suggest writing it into
`AGENTS.md` so future sessions know.

## 2. Update docs

After **user-visible** feature work or significant UX changes, update
`docs/features.md`:

- Add or revise user-visible functionality in the appropriate section.
- Write feature notes as user-visible capabilities, not implementation details.
- Trivial bug fixes and refactors don't need feature doc updates.

After changes to the **dev setup, environment variables, deployment process, or
tooling**, update `docs/build.md`.

## 3. Commit

Follow [`.ai/rules/git-workflow.md`](../../rules/git-workflow.md) — commit at
every checkpoint and push to the feature branch without waiting to be asked.
Stage only the intended files and never commit secrets. Only direct commits to
`main` require explicit approval.

## 4. Iterate on these AI docs

If you ran into a rough edge, an undocumented convention, or a clarification
during the work, update the relevant file under `.ai/rules/` or
`.ai/skills/` so the next session doesn't hit the same problem. See `.ai/rules/iterating-on-ai-docs.md`.