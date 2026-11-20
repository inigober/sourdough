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

## Bake photos (Supabase Storage)

Loaf photos for finished bakes live in a **private** Storage bucket, `bake-photos`. The migration is [`supabase/migrations/20260601120000_bake_photos.sql`](../../supabase/migrations/20260601120000_bake_photos.sql). It:

- adds a nullable `photo_path text` column to `public.bake_sessions`;
- creates the bucket `bake-photos` as private, JPEG only, 1 MB maximum per file (the app compresses photos to roughly 250 KB first);
- adds Row Level Security policies on `storage.objects` so a signed-in user can read, add, replace and delete only objects whose first folder is their own user id (`<user_id>/<bake_session_id>.jpg`).

It is safe to run more than once.

### Apply the migration (once, before shipping the app update)

The app update reads `photo_path` from `bake_sessions`, so **apply the migration first**. Until then, loading History while signed in fails with a database error about the missing column.

Option A, Supabase CLI (the repo's `supabase/migrations` folder is the source):

1. Install the CLI and sign in: `supabase login`.
2. From the repo root, link the project once: `supabase link --project-ref <your-project-ref>` (the ref is in the dashboard URL and under Project Settings, General).
3. Run `supabase db push`. It lists the migrations it will apply; confirm that `20260601120000_bake_photos.sql` is in the list.

Option B, SQL editor (no CLI needed):

1. Open the Supabase Dashboard, select this project, then **SQL Editor** and **New query**.
2. Paste the full contents of `supabase/migrations/20260601120000_bake_photos.sql` and press **Run**. It should finish with "Success".

### Verify

1. **Storage**: a bucket named `bake-photos` exists and is marked **Private**; its settings show a 1 MB file size limit and `image/jpeg` as the allowed type.
2. **Table Editor**: `bake_sessions` has a `photo_path` column.
3. **Policies**: under Authentication, Policies, the `storage.objects` table lists four "Users ... own bake photos" policies.
4. In the app, signed in, finish a bake with a photo. The object appears in the bucket under a folder named after your user id, and the bake's `photo_path` is filled in.

### Free-tier limits

Storage space, download traffic (egress) and project pausing are limited on the free plan. The exact limits change over time, so **check your dashboard** (Settings, Usage, and the plan details under Billing) rather than relying on numbers written here. As a rough guide, the 250 KB per photo budget means each GB of storage holds a few thousand photos. Photos are viewed through signed links that expire after an hour, and every view downloads the image again, so very heavy browsing of a large history counts towards egress.

### Cleaning up

Deleting a bake in the app also deletes its photo. If a photo is ever left behind (for example the delete request failed), you can remove it from the dashboard under Storage, `bake-photos`.

## Coach limits (sign-in and server-side counting)

The `coach` edge function only answers signed-in users and counts questions in `public.coach_usage` (migration `supabase/migrations/20260619120000_coach_usage.sql`). Apply the migration and deploy the function together:

```bash
supabase db push
supabase functions deploy coach
```

Verify: calling the function with only the public key (signed out) returns 401 "Sign in required to use the coach."; `coach_usage` exists with row level security on. The `OPENAI_API_KEY` secret must already be set on the project. Tune the limits in `supabase/functions/coach/usageRules.ts`.
