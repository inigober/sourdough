# Vercel deployment

The production frontend is hosted on [Vercel](https://vercel.com), connected to the GitHub repo `inigober/sourdough`.

## Automatic deploys on push to `main`

Vercel redeploys when GitHub receives a push to the branch you configured as **Production Branch** (usually `main`). No extra workflow file is required in this repo — the integration lives in Vercel.

### One-time setup (if not already done)

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → **Add New…** → **Project**.
2. Import `inigober/sourdough` from GitHub and grant Vercel access to the repo.
3. Framework preset: **Vite** (or Other with the settings below).
4. Build settings:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm ci` (default `npm install` also works)
5. **Environment variables** (Production, and Preview if you want auth on preview URLs):

   | Name | Value |
   |------|--------|
   | `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → API → Publishable key (`sb_publishable_…`) |

   Vite reads `VITE_*` variables at **build time**. After adding or changing them, trigger a **Redeploy** so the new bundle is produced.

   #### If you connected Supabase via the Vercel Marketplace

   The integration syncs `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_*`, and Postgres vars. **This app does not read those names** — it only reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (see `src/lib/auth/config.ts`).

   Add the two `VITE_*` variables manually and copy values from the synced `SUPABASE_*` pair. Keep the synced vars if you like; they are harmless and may update when the integration re-syncs. The `VITE_*` copies are **not** created or updated by that sync — if you rotate keys in Supabase, update both sets (or at least the `VITE_*` pair) and redeploy.

   Never prefix the secret key with `VITE_`.

6. Deploy. Confirm **Settings → Git → Production Branch** is `main` and **Deploy Hooks** / automatic deployments are enabled.

After that, every `git push` to `main` starts a Vercel production deployment. Pull requests can get preview deployments if that option is on in the Vercel project.

### Verify auto-deploy is working

1. Push a small commit to `main`.
2. Vercel → your project → **Deployments** — a new **Production** deployment should appear within a minute or two.
3. Open the deployment → **Building** logs should show `npm run build` succeeding.

If pushes do not trigger builds, check **Settings → Git** (repo still connected), GitHub App permissions, and that you pushed to `main`, not only a feature branch.

### Manual redeploy

Useful after changing environment variables without a code change:

**Deployments** → latest production deployment → **⋯** → **Redeploy**.

Or **Settings → Environment Variables** → after saving, Vercel offers to redeploy affected environments.

## SPA routing

Client routes (`/history`, `/build/flour`, etc.) are handled by React Router. [`vercel.json`](../../vercel.json) rewrites unknown paths to `index.html` so direct links and refreshes work.

## Local parity check

```bash
cp .env.example .env.local   # fill in Supabase values
npm run build
npm run preview
```

Open `http://localhost:4173`, confirm sign-in and saved recipes work before relying on production.

## Deploy checks (what you have vs optional extras)

### Already in place

| Check | Where | What it catches |
|-------|--------|-----------------|
| Unit + component tests | GitHub Actions [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) on every PR and push to `main` | Logic regressions |
| Typecheck + production build | Same CI job (`npm run build`) | Type errors, broken imports |
| Vercel build | Every deploy runs `npm run build` | Deploy fails if the build fails |

That is enough for a project this size. Vercel does not need a separate test runner unless you want stricter gating.

### Optional: require CI before production deploy

In **Vercel → Settings → Git**, if your plan supports it, enable waiting for GitHub status checks so production only deploys after the **CI** workflow passes. That avoids shipping a broken build when tests fail but Vercel would still build.

### Optional: fail the build when `VITE_*` vars are missing on Vercel

CI on GitHub often runs **without** Supabase env vars (build still succeeds; cloud sync is simply off in that artifact). A stricter check only makes sense **on Vercel**, where production should always have the vars. A small pre-build script could read `VERCEL=1` and `VERCEL_ENV=production` and exit with an error if `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is unset. Worth adding if you want to prevent another silent “cloud sync unavailable” production deploy.

Not recommended for now unless you want that guardrail: E2E browser tests against a live deploy (Playwright + preview URL) — heavier setup for little gain at this stage.

## Related docs

- [Supabase operations](./supabase-ops.md) — database keepalive (GitHub Actions secrets; separate from Vercel env vars)
