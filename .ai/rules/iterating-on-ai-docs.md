# Iterating on AI docs

The files under `.ai/` are living docs. When the agent (or the developer) runs
into a rough edge, an undocumented convention, or a clarification during work,
update the relevant file so the next session doesn't hit the same problem.

## When to update

- You discovered a convention that wasn't written down anywhere.
- A rule in `.ai/rules/` contradicted what you actually had to do.
- A skill in `.ai/skills/` was missing a step you had to figure out.
- A tool command, env var, or build step changed.
- You had to ask the user for clarification on something that should be
  documented.

## Where to update

| Change                                                | File                                       |
| ----------------------------------------------------- | ------------------------------------------ |
| Always-true convention (style, TS, auth, backend)    | `.ai/rules/<topic>.md` (edit or create)    |
| Task-specific workflow (how to do X end-to-end)       | `.ai/skills/<name>/SKILL.md` (edit/create) |
| Stack, commands, CI                                    | `.ai/rules/stack-and-commands.md`         |
| Project layout                                          | `.ai/rules/project-layout.md`             |
| User-visible feature change                            | `docs/features.md` (per `keeping-docs-current.md`) |
| Dev setup / env / deployment change                    | `docs/build.md`                            |

## How to update

- Keep entries short and scannable — bullets, not prose.
- Don't duplicate: if a rule already lives in one file, link to it instead of
  restating it.
- If you create a new rule file, add it to the index in `AGENTS.md`.
- If you create a new skill, add it to `opencode.json` `skills.paths` is already
  wired to scan `.ai/skills/` — just make a new folder with `SKILL.md`.

## Do not

- Don't reformat or reorganize these files for style alone. Only change them when
  you have something concrete to add or fix.
- Don't delete a rule without confirming with the user.