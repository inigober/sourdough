# Supabase operations

Notes for keeping the hosted Supabase project available between bakes.

## Free-tier inactivity

Supabase may **pause** free-tier projects after a period without API activity. This app is not used every day, so we run a lightweight GitHub Actions workflow to ping the database on a schedule.

Workflow file: [`.github/workflows/supabase-keepalive.yml`](../../.github/workflows/supabase-keepalive.yml)

## What the keepalive does

Once per day (09:00 UTC), the workflow sends a single `GET` to the `saved_recipes` table via the Supabase REST API. It uses the **secret key** (server-only) so the request bypasses RLS and always hits Postgres — stronger than the publishable key the app uses in the browser.

No data is written.

The schedule is **daily** rather than weekly because GitHub can skip or delay scheduled workflows on low-activity repositories; more frequent runs improve the chance that at least one ping lands before the inactivity window.

## Setup walkthrough

### 1. Copy the secret key from Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select **this** project.
2. Go to **Project Settings** → **API**.
3. Under **Project API keys**, find the **secret** key:
   - New projects: **Secret keys** → `sb_secret_...` (you may need **Create new API keys** first).
   - Older projects: **service_role** → long JWT starting with `eyJ...`.
4. Click **Reveal** / copy the value. Treat it like a password.

**Do not** put this key in `.env.local`, frontend code, or any `VITE_` variable. It bypasses Row Level Security and must stay server-side only.

### 2. Add GitHub Actions secrets

1. Open the repo on GitHub: `inigober/sourdough`.
2. **Settings** → **Secrets and variables** → **Actions**.
3. Confirm these secrets exist (add or update as needed):

| Secret name | Where to get the value | Notes |
|-------------|------------------------|-------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** | Same as `.env.local` |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API → **Secret key** (`sb_secret_...`) | **New** — keepalive only |

If your project still uses the legacy JWT, you can name the secret `SUPABASE_SERVICE_ROLE_KEY` instead; the workflow accepts either name.

You can remove `VITE_SUPABASE_PUBLISHABLE_KEY` from Actions secrets if it was only there for keepalive — the app still needs it in `.env.local` for local dev, but the workflow no longer uses it.

### 3. Merge the workflow change and run a manual ping

After the updated workflow is on `main`:

1. **Actions** → **Supabase keepalive** → **Run workflow** → **Run workflow**.
2. Open the run; the job should succeed and log `Supabase keepalive ping succeeded.`
3. In Supabase dashboard, confirm the project status is **Active**.

### 4. Ongoing checks

- Scheduled runs appear under **Actions** roughly once per day (GitHub may delay cron by a few hours).
- If a run fails with “Missing SUPABASE_SECRET_KEY”, the secret name or value was not set correctly in step 2.

## Manual run

**Actions → Supabase keepalive → Run workflow**

Use this after first setting up secrets, or to confirm the project is still reachable.

## Verifying it works

1. Open **Actions** and find a recent **Supabase keepalive** run.
2. The job should succeed and log `Supabase keepalive ping succeeded.`
3. In Supabase dashboard, confirm the project is not paused.

If scheduled runs stop appearing, check that the default branch includes the workflow file and that repository activity has not caused GitHub to defer schedules — use **Run workflow** to test immediately.
