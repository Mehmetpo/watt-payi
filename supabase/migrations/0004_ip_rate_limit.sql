-- ip_usage: per-IP, per-function, per-day call counter. Backs a second,
-- coarser rate-limit layer on top of function_usage (0003) so a single IP
-- spinning up many accounts can't multiply past the per-user daily cap.
-- Only ever touched by edge functions via the service-role key, never by
-- the client directly — RLS is enabled with no policies.
create table public.ip_usage (
  ip_address text not null,
  function_name text not null,
  day date not null default current_date,
  call_count integer not null default 0,
  primary key (ip_address, function_name, day)
);

alter table public.ip_usage enable row level security;

-- Atomically increments today's counter for (ip_address, function_name) and
-- returns the new count. security definer so it can run as the table owner
-- regardless of caller role; only granted to service_role below.
create function public.increment_ip_usage(p_ip_address text, p_function_name text)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.ip_usage (ip_address, function_name, day, call_count)
  values (p_ip_address, p_function_name, current_date, 1)
  on conflict (ip_address, function_name, day)
  do update set call_count = ip_usage.call_count + 1
  returning call_count;
$$;

-- Supabase grants execute on newly created public-schema functions to
-- anon/authenticated by default (via ALTER DEFAULT PRIVILEGES), independent
-- of PUBLIC — see 0003_function_rate_limit.sql for the same gotcha. Revoke
-- from all three explicitly; this takes an arbitrary p_ip_address with no
-- caller-identity check, since that check happens in the edge function.
revoke execute on function public.increment_ip_usage(text, text) from public, anon, authenticated;
grant execute on function public.increment_ip_usage(text, text) to service_role;
