# Git workflow

All changes should be in the form of pull requests opened in **draft** mode,
based off the `main` branch, unless the user explicitly says otherwise.

- Branch from `main` (or rebase onto it before pushing if `main` has moved).
- Open the PR as a draft. Mark it ready for review only when the user asks.
- Do not push directly to `main`, and do not merge a PR without explicit user
  approval.
- Keep commits focused; stage only the intended files and never commit secrets.
- **Commit at every checkpoint.** When doing feature work and you reach a
  checkpoint (a coherent unit of progress is complete and verified), commit
  and push to the feature branch immediately — do not wait to be asked. The
  user growing tired of having to say "now commit" each time is the failure
  mode this rule exists to prevent.
- When the user asks you to implement a feature or fix based off a GitHub
  issue, default to committing the work to a branch and opening a draft PR
  without asking for confirmation. Verify (lint + typecheck + tests) first.
- **You do not need to ask permission** to commit to a feature branch or open a
  draft PR. Just go ahead and do it after the work is verified (lint + typecheck
  + tests pass). The "don't commit unless asked" rule in the global agent
  instructions is overridden by this file — committing to a branch and opening a
  draft PR is always allowed. Only direct commits to `main` require explicit
  approval (and are likely blocked by branch protection regardless).