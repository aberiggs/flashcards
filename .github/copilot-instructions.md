# GitHub Copilot Instructions

This project's detailed agent guidelines live in [`AGENTS.md`](../../AGENTS.md)
and the `.ai/` directory. Read `AGENTS.md` first — it is a short index that
points into:

- `.ai/rules/*.md` — always-true conventions (stack, layout, TypeScript, code
  style, backend, styling, accessibility, auth, state management, etc.).
- `.ai/skills/*/SKILL.md` — task-specific end-to-end recipes (adding a backend
  endpoint, building a client component, schema migration, completing a task).

Load only the rule or skill relevant to the current task instead of holding
all of them in context. Keep `.ai/` current when you run into undocumented
conventions (see `.ai/rules/iterating-on-ai-docs.md`).