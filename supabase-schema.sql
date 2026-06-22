create extension if not exists pgcrypto;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null default '',
  role text not null default '',
  category text not null default 'Other',
  status text not null default 'Applied',
  applied_date date,
  follow_up_date date,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.applications enable row level security;

drop policy if exists "Users can read own applications" on public.applications;
create policy "Users can read own applications"
on public.applications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own applications" on public.applications;
create policy "Users can insert own applications"
on public.applications
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own applications" on public.applications;
create policy "Users can update own applications"
on public.applications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own applications" on public.applications;
create policy "Users can delete own applications"
on public.applications
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists applications_user_updated_idx
on public.applications (user_id, updated_at desc);

create index if not exists applications_user_status_idx
on public.applications (user_id, status);

create index if not exists applications_user_category_idx
on public.applications (user_id, category);
