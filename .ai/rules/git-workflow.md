# Git workflow

All changes should be in the form of pull requests opened in **draft** mode,
based off the `main` branch, unless the user explicitly says otherwise.

- Branch from `main` (or rebase onto it before pushing if `main` has moved).
- Open the PR as a draft. Mark it ready for review only when the user asks.
- Do not push directly to `main`, and do not merge a PR without explicit user
  approval.
- Keep commits focused; stage only the intended files and never commit secrets.