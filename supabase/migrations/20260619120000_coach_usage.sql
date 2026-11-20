-- Coach usage log: lets the `coach` edge function enforce per-bake and per-day question limits on the server.
--
-- One row per successfully answered coach question. Only the edge function (service role) reads or writes
-- this table: row level security is on and there are deliberately no policies, so the app's own keys
-- (anon and authenticated) cannot see or change it.

create table if not exists public.coach_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bake_session_id text,
  asked_at timestamptz not null default now()
);

create index if not exists coach_usage_user_asked_idx
  on public.coach_usage (user_id, asked_at desc);

create index if not exists coach_usage_user_bake_idx
  on public.coach_usage (user_id, bake_session_id);

alter table public.coach_usage enable row level security;

revoke all on public.coach_usage from anon, authenticated;
