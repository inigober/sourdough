-- Phase 5: saved recipes synced per authenticated user.
-- Run in the Supabase SQL editor or via the Supabase CLI.

create table if not exists public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  recipe_input jsonb not null,
  schedule_input jsonb,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_recipes_user_updated_idx
  on public.saved_recipes (user_id, updated_at desc);

alter table public.saved_recipes enable row level security;

create policy "Users read own saved recipes"
  on public.saved_recipes
  for select
  using (auth.uid() = user_id);

create policy "Users insert own saved recipes"
  on public.saved_recipes
  for insert
  with check (auth.uid() = user_id);

create policy "Users update own saved recipes"
  on public.saved_recipes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own saved recipes"
  on public.saved_recipes
  for delete
  using (auth.uid() = user_id);
