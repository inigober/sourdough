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

## Related docs

- [Supabase operations](./supabase-ops.md) — database keepalive (GitHub Actions secrets; separate from Vercel env vars)
