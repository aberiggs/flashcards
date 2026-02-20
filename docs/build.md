# Build, Dev & Deployment Guide

## How the environments work

This app has three distinct environments, each with its own isolated Convex backend
(separate database, functions, and configuration):

```
local dev  ──►  Convex dev deployment       (your personal dev backend, hot-reloads)
pull request ──►  Convex preview deployment  (ephemeral per-PR backend, auto-deleted after 5 days)
main branch ──►  Convex production deployment + Vercel  (live app)
```

The key thing to understand: **Convex deployments are in the cloud even during local dev.**
There is no local database running on your machine. Your dev deployment is a real Convex
backend tied to your account, it just has separate data from production.

---

## Local development

### Prerequisites

- Node.js 20+
- npm
- A Convex account at [convex.dev](https://convex.dev)

### First-time setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Link to your Convex dev deployment**

   ```bash
   npx convex dev
   ```

   On first run, the Convex CLI will prompt you to log in and either create a new
   project or link an existing one. Once linked, it writes your dev deployment's
   URL and name into `.env.local` automatically:

   ```
   CONVEX_DEPLOYMENT=dev:your-project-name-abc123
   NEXT_PUBLIC_CONVEX_URL=https://your-project-name-abc123.convex.cloud
   ```

   You do not need to create or edit `.env.local` manually.

3. **Set up auth environment variables**

   Auth credentials live in the Convex backend (not in `.env.local`). Set them
   once via the CLI:

   ```bash
   npx convex env set AUTH_GITHUB_ID your_github_client_id
   npx convex env set AUTH_GITHUB_SECRET your_github_client_secret
   npx convex env set AUTH_GOOGLE_ID your_google_client_id
   npx convex env set AUTH_GOOGLE_SECRET your_google_client_secret
   npx convex env set SITE_URL http://localhost:3000
   ```

   These are stored in your Convex dev deployment and persist across restarts.

### Running the app

```bash
npm run dev
```

This starts both processes together:

| Process | What it does |
|---------|-------------|
| `next dev --turbopack` | Next.js frontend on http://localhost:3000 |
| `convex dev` | Watches `convex/` and hot-reloads functions to your dev deployment; also regenerates `convex/_generated/` types on every change |

The two processes share the terminal output, prefixed with `[next]` (blue) and
`[convex]` (green). Ctrl+C stops both.

### npm scripts reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js + Convex dev together (use this for all local work) |
| `npm run build` | Production build (Next.js only; Convex deploy is separate) |
| `npm run start` | Run the production build locally |
| `npm run lint` | Run ESLint |

---

## CI pipeline (GitHub Actions)

The workflow lives at `.github/workflows/deploy.yml` and has two jobs:

### `check` job — runs on every push and every PR

1. Installs dependencies (`npm ci`)
2. Runs `npx convex codegen` to generate `convex/_generated/` — this directory
   is gitignored and must be produced before TypeScript can resolve Convex imports
3. Runs `npm run lint`
4. Runs `tsc --noEmit` (type-checks `src/` only; `convex/` has its own tsconfig
   and is excluded from the root one)

### `deploy` job — runs on push to `main` only (after `check` passes)

1. Installs dependencies
2. Runs `npx convex deploy --cmd 'npm run build'`
   - Deploys Convex functions to the **production** deployment
   - Automatically injects `NEXT_PUBLIC_CONVEX_URL` into the build environment
     so Next.js points at the production Convex backend
   - Runs `npm run build` inside that environment

### Required GitHub secret

| Secret | Where to get it |
|--------|----------------|
| `CONVEX_DEPLOY_KEY` | Convex dashboard → your project → Settings → Deploy keys → Generate Production Deploy Key |

Add it at: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

---

## Vercel deployment (frontend hosting)

The CI workflow deploys your Convex backend on every push to `main`, but does
**not** build or host the Next.js frontend itself — that's Vercel's job.

### One-time setup

1. Create a Vercel project and link it to this GitHub repo.

2. Override the **Build Command** in Vercel to:
   ```
   npx convex deploy --cmd 'npm run build'
   ```
   This replaces Vercel's default `npm run build`. The Convex CLI handles deploying
   functions and injecting the right `NEXT_PUBLIC_CONVEX_URL` before the build runs.

3. Add environment variables in Vercel → Settings → Environment Variables:

   | Variable | Value | Environment |
   |----------|-------|-------------|
   | `CONVEX_DEPLOY_KEY` | Production deploy key (from Convex dashboard) | Production only |
   | `CONVEX_DEPLOY_KEY` | Preview deploy key (from Convex dashboard) | Preview only |

   The production and preview keys are different keys from the Convex dashboard.
   Using the same variable name with different values scoped to different Vercel
   environments is intentional — the Convex CLI reads `CONVEX_DEPLOY_KEY` and
   knows from the key type whether it's deploying to production or creating a
   preview deployment.

4. Set auth environment variables for production in the **Convex dashboard**
   (not in Vercel — auth secrets belong to the Convex backend, not the frontend):

   ```bash
   npx convex env set --prod AUTH_GITHUB_ID your_github_client_id
   npx convex env set --prod AUTH_GITHUB_SECRET your_github_client_secret
   npx convex env set --prod AUTH_GOOGLE_ID your_google_client_id
   npx convex env set --prod AUTH_GOOGLE_SECRET your_google_client_secret
   npx convex env set --prod SITE_URL https://your-app.vercel.app
   ```

5. Update OAuth callback URIs in your provider consoles to point at the production
   Convex site URL (found in the Convex dashboard under your production deployment):

   - **GitHub OAuth app:** `https://<prod-deployment>.convex.site/api/auth/callback/github`
   - **Google OAuth app:** `https://<prod-deployment>.convex.site/api/auth/callback/google`

### How Vercel + Convex interact

```
push to main
    │
    ├─► GitHub Actions (check job)
    │       lint + typecheck
    │
    ├─► GitHub Actions (deploy job)
    │       convex deploy → pushes functions to prod Convex backend
    │
    └─► Vercel (triggered automatically by Vercel's GitHub integration)
            npx convex deploy --cmd 'npm run build'
            → also pushes functions to prod Convex backend (idempotent)
            → builds Next.js with NEXT_PUBLIC_CONVEX_URL set
            → publishes to your-app.vercel.app
```

The Convex deploy step runs twice on a `main` push (once from GitHub Actions,
once from Vercel). This is harmless — deploying the same functions twice is
idempotent. If you want to simplify, you can remove the `deploy` job from
`.github/workflows/deploy.yml` and let Vercel own the production Convex deploy
entirely, keeping GitHub Actions purely for the `check` job.

### Preview deployments (per PR)

When Vercel builds a preview deployment for a PR, it uses the Preview-scoped
`CONVEX_DEPLOY_KEY`. The Convex CLI detects it's running in a GitHub PR
environment, reads the branch name, and automatically creates an isolated
Convex backend named after that branch. The preview frontend is wired to that
isolated backend.

Preview Convex backends are automatically deleted 5 days after creation
(14 days on Convex's Professional plan). They have no shared data with
production or dev.
