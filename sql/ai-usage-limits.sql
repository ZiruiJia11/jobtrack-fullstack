-- Additive schema: existing applications, users and files are never rewritten.
create table if not exists public.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  attempts integer not null default 0 check (attempts between 0 and 2),
  primary key (user_id, usage_date)
);
create table if not exists public.ai_daily_budget (
  usage_date date primary key,
  attempts integer not null default 0 check (attempts between 0 and 20)
);
alter table public.ai_daily_usage enable row level security;
alter table public.ai_daily_budget enable row level security;
revoke all on public.ai_daily_usage, public.ai_daily_budget from anon, authenticated;
grant select on public.ai_daily_usage to authenticated;
grant all on public.ai_daily_usage, public.ai_daily_budget to service_role;
create policy "Read own AI usage" on public.ai_daily_usage
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.consume_ai_match_attempt(p_user_id uuid)
returns table (allowed boolean, used integer, daily_limit integer, resets_at timestamptz, reason text)
language plpgsql security invoker set search_path = '' as $$
declare
  day_key date := (statement_timestamp() at time zone 'Pacific/Auckland')::date;
  next_reset timestamptz := ((day_key + 1)::timestamp at time zone 'Pacific/Auckland');
  user_used integer;
  total_used integer;
begin
  -- Every caller locks the shared budget before the user row to avoid races and deadlocks.
  insert into public.ai_daily_budget (usage_date) values (day_key) on conflict do nothing;
  select b.attempts into total_used from public.ai_daily_budget b where b.usage_date = day_key for update;
  insert into public.ai_daily_usage (user_id, usage_date) values (p_user_id, day_key) on conflict do nothing;
  select u.attempts into user_used from public.ai_daily_usage u
    where u.user_id = p_user_id and u.usage_date = day_key for update;
  if user_used >= 2 then
    return query select false, user_used, 2, next_reset, 'user_limit'::text;
    return;
  end if;
  if total_used >= 20 then
    return query select false, user_used, 2, next_reset, 'site_limit'::text;
    return;
  end if;
  update public.ai_daily_usage set attempts = attempts + 1 where user_id = p_user_id and usage_date = day_key;
  update public.ai_daily_budget set attempts = attempts + 1 where usage_date = day_key;
  return query select true, user_used + 1, 2, next_reset, 'allowed'::text;
end;
$$;
revoke all on function public.consume_ai_match_attempt(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_match_attempt(uuid) to service_role;
