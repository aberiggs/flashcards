# Agent Guidelines for `flashcards`

A Next.js 15 + Postgres + Drizzle full-stack flashcard app with SM-2 spaced
repetition, Auth.js (Credentials provider) authentication, and Docker Compose
self-hosted deployment.

The detailed rules and skills live under `.ai/` so this file stays a short
index. Load only the rule or skill you need for the current task instead of
holding all of it in context.

---

## Rules (always-true conventions)

Read the ones relevant to what you're touching.

| File | Summary |
| --- | --- |
| [`.ai/rules/stack-and-commands.md`](.ai/rules/stack-and-commands.md) | Stack table, npm scripts, CI pipeline. |
| [`.ai/rules/project-layout.md`](.ai/rules/project-layout.md) | Directory map of `src/`, `drizzle/`, Docker files. |
| [`.ai/rules/typescript.md`](.ai/rules/typescript.md) | Strict TS, `@/*` alias, `interface` vs `type`, no `I` prefix. |
| [`.ai/rules/code-style.md`](.ai/rules/code-style.md) | Import order, `'use client'`, named exports, props interfaces, naming table. |
| [`.ai/rules/backend.md`](.ai/rules/backend.md) | Drizzle query layer, thin Route Handlers, auth scoping, ownership checks. |
| [`.ai/rules/error-handling.md`](.ai/rules/error-handling.md) | Client try/catch pattern, `void expression()`, no silent swallows. |
| [`.ai/rules/styling.md`](.ai/rules/styling.md) | Tailwind v4 `@theme`, CSS variable tokens, when to use `style=`. |
| [`.ai/rules/accessibility.md`](.ai/rules/accessibility.md) | aria-labels, decorative icons, keyboard handlers, focus rings. |
| [`.ai/rules/state-management.md`](.ai/rules/state-management.md) | React built-ins + TanStack Query, snapshot-into-local-state for sessions. |
| [`.ai/rules/git-workflow.md`](.ai/rules/git-workflow.md) | Draft PRs off `main`; commit at every checkpoint without waiting to be asked. |
| [`.ai/rules/auth.md`](.ai/rules/auth.md) | NextAuth v5 Credentials provider, JWT sessions, first-user setup, env vars. |
| [`.ai/rules/keeping-docs-current.md`](.ai/rules/keeping-docs-current.md) | When to update `docs/features.md` and `docs/build.md`. |
| [`.ai/rules/do-not.md`](.ai/rules/do-not.md) | Global state libs, test frameworks, `console.log`, Prettier/ESLint changes. |
| [`.ai/rules/iterating-on-ai-docs.md`](.ai/rules/iterating-on-ai-docs.md) | When and how to update these AI docs as we learn. **Read this one first.** |

## Skills (task-specific workflows)

Each skill is a short end-to-end recipe. Load it when the task matches its
description.

| Skill | Summary |
| --- | --- |
| [`.ai/skills/adding-backend-endpoint/SKILL.md`](.ai/skills/adding-backend-endpoint/SKILL.md) | Add a Drizzle query + thin Route Handler + client hook, auth-scoped. |
| [`.ai/skills/building-client-component/SKILL.md`](.ai/skills/building-client-component/SKILL.md) | Create a `'use client'` component: props, imports, Tailwind tokens, a11y. |
| [`.ai/skills/schema-migration/SKILL.md`](.ai/skills/schema-migration/SKILL.md) | Edit `schema.ts` → `db:generate` → `db:migrate` → commit the SQL file. |
| [`.ai/skills/completing-task/SKILL.md`](.ai/skills/completing-task/SKILL.md) | Run lint + typecheck, update docs, don't commit unless asked. |
| [`.ai/skills/adding-test/SKILL.md`](.ai/skills/adding-test/SKILL.md) | Add a Vitest test: pure-logic, server query, or route handler. |

## Quick reference

- **Dev**: `npm run dev`
- **Lint**: `npm run lint`
- **Type-check**: `npm run typecheck`
- **DB migrate**: `npm run db:generate` then `npm run db:migrate`
- **Build**: `npm run build`
- **Test**: `npm run test` (requires Docker — testcontainers starts Postgres)

## Keep these docs current

Every time you (the agent) run into a convention that wasn't written down, a
rule that contradicted reality, or a clarification you had to ask the user for,
update the relevant file under `.ai/rules/` or `.ai/skills/`. Full guidance in
[`.ai/rules/iterating-on-ai-docs.md`](.ai/rules/iterating-on-ai-docs.md).

## Cross-tool compatibility

This `.ai/` layout is the source of truth. Other AI tools read thin pointers
from it rather than maintaining separate copies:

- **opencode** — `opencode.json` registers `.ai/skills/` as a skills path.
- **Claude Code** — `CLAUDE.md` `@`-imports the rules and skills below.
- **GitHub Copilot** — `.github/copilot-instructions.md` points here.

If you add a rule or skill, update `AGENTS.md` (this file) and the relevant
pointer file so the other tools stay in sync.