# Supabase operations

Notes for keeping the hosted Supabase project available between bakes.

## Free-tier inactivity

Supabase may **pause** free-tier projects after a period without API activity. This app is not used every day, so we ping the database on a schedule from **[cron-job.org](https://cron-job.org)** (same place as the project’s other external pings).

The ping no longer runs via GitHub Actions `schedule`. Public repos auto-disable GitHub-scheduled workflows after ~60 days without repository activity, which made Actions an unreliable keepalive host.

## What the keepalive does

Once per day, cron-job.org sends a single `GET` to the `saved_recipes` table via the Supabase REST API. It uses the **secret key** (server-only) so the request bypasses RLS and always hits Postgres — stronger than the publishable key the app uses in the browser.

No data is written.

## Setup walkthrough (cron-job.org)

### 1. Copy values from Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select **this** project.
2. Go to **Project Settings** → **API**.
3. Copy:
   - **Project URL** — e.g. `https://xxxx.supabase.co`
   - **Secret key** — `sb_secret_...` (or legacy `service_role` JWT). Treat it like a password.

**Do not** put the secret key in `.env.local`, frontend code, Vercel `VITE_*` vars, or any client bundle. It bypasses Row Level Security.

### 2. Create the cron job

1. Sign in at [cron-job.org](https://cron-job.org) (same account used for your other pings).
2. Create a new cron job with:

| Setting | Value |
|---------|--------|
| **URL** | `{Project URL}/rest/v1/saved_recipes?select=id&limit=1` |
| **Schedule** | Daily (any quiet hour is fine) |
| **Request method** | `GET` |
| **Header** | `apikey: {Secret key}` |

Example URL shape (not a real project):

`https://abcdefghijklmnop.supabase.co/rest/v1/saved_recipes?select=id&limit=1`

Notes:

- Use the **apikey** header only. Do **not** put new `sb_secret_...` keys on `Authorization` (they are not JWTs).
- Enable failure notifications in cron-job.org so a broken ping is obvious.
- Store the secret key only in cron-job.org’s request config (same trust model as any other hosted secret).

### 3. Run once and verify

1. Use cron-job.org’s **Run now** / test action for the job.
2. Expect HTTP **200** (and a small JSON array body).
3. In Supabase dashboard, confirm the project status is **Active**.

### 4. Ongoing checks

- Confirm the job still shows successful runs in cron-job.org history.
- If the job starts failing with `401` / `403`, the secret key was rotated or mistyped — update the header value.
- If Supabase pauses despite successful pings, check that the URL hits **this** project and that the schedule is at least daily.

## Manual ping (optional)

From a machine that may hold the secret temporarily:

```bash
curl -fsS -X GET \
  "${SUPABASE_URL%/}/rest/v1/saved_recipes?select=id&limit=1" \
  -H "apikey: ${SUPABASE_SECRET_KEY}"
```

Success prints a JSON array (often one row or `[]`) and exits 0.

## Cleaning up old GitHub Actions keepalive

The former `.github/workflows/supabase-keepalive.yml` schedule is removed from this repo.

1. GitHub will no longer schedule a ping (disable or ignore any leftover “Supabase keepalive” workflow entry in Actions if GitHub still lists it).
2. You can delete Actions secrets that existed **only** for keepalive (`VITE_SUPABASE_URL`, `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` under **Settings → Secrets and variables → Actions**), unless something else still needs them.
3. App/Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) are unrelated and must stay.

## GitHub’s 60-day schedule policy (why we moved)

On **public** repositories, GitHub automatically disables workflows that use the `schedule` (cron) event after ~60 days with no repository activity (pushes and similar). The workflow’s own scheduled runs **do not** count as activity.

That policy targets **GitHub-owned schedules**, not external systems:

| Trigger | Affected by 60-day inactivity disable? |
|---------|----------------------------------------|
| GitHub `schedule:` cron | Yes |
| External ping (cron-job.org → Supabase) | No — never goes through GitHub |
| GitHub `workflow_dispatch` / `repository_dispatch` only (no `schedule`) | No — not a scheduled workflow |

So keepalive from cron-job.org keeps working with zero repo commits. You do not need dummy commits to keep Supabase awake.
