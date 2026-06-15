-- Bake history v1: store completed bake sessions and per-step actual timings.

create table if not exists public.bake_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  saved_recipe_id uuid references public.saved_recipes (id) on delete set null,
  recipe_name text not null,
  recipe_input jsonb not null,
  schedule_input jsonb not null,
  overall_note text,
  overall_assessment text,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bake_session_steps (
  id uuid primary key default gen_random_uuid(),
  bake_session_id uuid not null references public.bake_sessions (id) on delete cascade,
  step_index integer not null check (step_index >= 0),
  step_key text not null,
  step_label text not null,
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  actual_started_at timestamptz not null,
  actual_completed_at timestamptz not null
);

create unique index if not exists bake_session_steps_session_index_unique
  on public.bake_session_steps (bake_session_id, step_index);

create index if not exists bake_sessions_user_completed_idx
  on public.bake_sessions (user_id, completed_at desc);

create index if not exists bake_sessions_saved_recipe_idx
  on public.bake_sessions (saved_recipe_id);

create index if not exists bake_session_steps_session_idx
  on public.bake_session_steps (bake_session_id);

alter table public.bake_sessions enable row level security;
alter table public.bake_session_steps enable row level security;

create policy "Users read own bake sessions"
  on public.bake_sessions
  for select
  using (auth.uid() = user_id);

create policy "Users insert own bake sessions"
  on public.bake_sessions
  for insert
  with check (auth.uid() = user_id);

create policy "Users update own bake sessions"
  on public.bake_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own bake sessions"
  on public.bake_sessions
  for delete
  using (auth.uid() = user_id);

create policy "Users read own bake session steps"
  on public.bake_session_steps
  for select
  using (
    exists (
      select 1
      from public.bake_sessions
      where bake_sessions.id = bake_session_steps.bake_session_id
        and bake_sessions.user_id = auth.uid()
    )
  );

create policy "Users insert own bake session steps"
  on public.bake_session_steps
  for insert
  with check (
    exists (
      select 1
      from public.bake_sessions
      where bake_sessions.id = bake_session_steps.bake_session_id
        and bake_sessions.user_id = auth.uid()
    )
  );

create policy "Users update own bake session steps"
  on public.bake_session_steps
  for update
  using (
    exists (
      select 1
      from public.bake_sessions
      where bake_sessions.id = bake_session_steps.bake_session_id
        and bake_sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.bake_sessions
      where bake_sessions.id = bake_session_steps.bake_session_id
        and bake_sessions.user_id = auth.uid()
    )
  );

create policy "Users delete own bake session steps"
  on public.bake_session_steps
  for delete
  using (
    exists (
      select 1
      from public.bake_sessions
      where bake_sessions.id = bake_session_steps.bake_session_id
        and bake_sessions.user_id = auth.uid()
    )
  );
