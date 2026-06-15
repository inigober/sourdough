# Supabase operations

Notes for keeping the hosted Supabase project available between bakes.

## Free-tier inactivity

Supabase may **pause** free-tier projects after a period without API activity. This app is not used every day, so we run a lightweight GitHub Actions workflow to ping the database on a schedule.

Workflow file: [`.github/workflows/supabase-keepalive.yml`](../../.github/workflows/supabase-keepalive.yml)

## What the keepalive does

Once per day (09:00 UTC), the workflow sends a single `GET` to the `saved_recipes` table via the Supabase REST API — the same credentials the app uses locally. No data is written.

The schedule is **daily** rather than weekly because GitHub can skip or delay scheduled workflows on low-activity repositories; more frequent runs improve the chance that at least one ping lands before the inactivity window.

## GitHub Actions secrets (not `.env.local`)

Local dev uses `.env.local`. The keepalive runs on GitHub and needs the same values configured in the repository:

**Settings → Secrets and variables → Actions**

Add either **Secrets** or **Variables** with these exact names:

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Project URL (e.g. `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key from Project Settings → API |

The `VITE_` prefix matches the app env names so you can copy values from `.env.local`.

If either value is missing, the workflow fails fast with a clear log message.

## Manual run

**Actions → Supabase keepalive → Run workflow**

Use this after first setting up secrets, or to confirm the project is still reachable.

## Verifying it works

1. Open **Actions** and find a recent **Supabase keepalive** run.
2. The job should succeed and log `Supabase keepalive ping succeeded.`
3. In Supabase dashboard, confirm the project is not paused.

If scheduled runs stop appearing, check that the default branch includes the workflow file and that repository activity has not caused GitHub to defer schedules — use **Run workflow** to test immediately.
