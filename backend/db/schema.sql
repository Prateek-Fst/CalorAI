-- CalorAI database schema for Supabase / Postgres
-- HOW TO APPLY: open Supabase → SQL Editor → New query → paste this entire file → Run.
-- This is idempotent (`if not exists`), so it's safe to re-run.

create extension if not exists "pgcrypto";

-- USERS
create table if not exists public.users (
  id                    uuid primary key default gen_random_uuid(),
  telegram_id           text unique not null,
  username              text,
  first_name            text,
  experiment_group      text check (experiment_group in ('control', 'test')),
  onboarding_step       int  not null default 0,
  onboarding_completed  boolean not null default false,
  blocked               boolean not null default false,
  expo_push_token       text,
  last_active_at        timestamptz not null default now(),
  created_at            timestamptz not null default now()
);

create index if not exists users_telegram_id_idx on public.users (telegram_id);
create index if not exists users_experiment_group_idx on public.users (experiment_group);

-- MEALS
create table if not exists public.meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  name        text not null,
  calories    int,
  notes       text,
  logged_at   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists meals_user_id_idx on public.meals (user_id);
create index if not exists meals_logged_at_idx on public.meals (logged_at);

-- EVENTS
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete set null,
  event_name  text not null,
  properties  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists events_event_name_idx on public.events (event_name);
create index if not exists events_created_at_idx on public.events (created_at);

-- Row Level Security: disabled because the backend uses the publishable key
-- as a trusted server-side intermediary. The bot is the user trust boundary.
alter table public.users  disable row level security;
alter table public.meals  disable row level security;
alter table public.events disable row level security;
