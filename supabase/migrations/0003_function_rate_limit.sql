-- function_usage: per-user, per-function, per-day call counter backing edge
-- function rate limiting. Only ever touched by edge functions via the
-- service-role key (which bypasses RLS), never by the client directly —
-- RLS is enabled with no policies so anon/authenticated roles get no access.
create table public.function_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  function_name text not null,
  day date not null default current_date,
  call_count integer not null default 0,
  primary key (user_id, function_name, day)
);

alter table public.function_usage enable row level security;

-- Atomically increments today's counter for (user_id, function_name) and
-- returns the new count. security definer so it can run as the table owner
-- regardless of caller role; only granted to service_role below.
create function public.increment_function_usage(p_user_id uuid, p_function_name text)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.function_usage (user_id, function_name, day, call_count)
  values (p_user_id, p_function_name, current_date, 1)
  on conflict (user_id, function_name, day)
  do update set call_count = function_usage.call_count + 1
  returning call_count;
$$;

-- Supabase grants execute on newly created public-schema functions to
-- anon/authenticated by default (via ALTER DEFAULT PRIVILEGES), independent
-- of PUBLIC — `revoke ... from public` alone does not undo that. Revoke from
-- all three explicitly so an unauthenticated or merely-logged-in caller can't
-- invoke this directly (it takes an arbitrary p_user_id with no ownership
-- check, since that check happens in the edge function, not here).
revoke execute on function public.increment_function_usage(uuid, text) from public, anon, authenticated;
grant execute on function public.increment_function_usage(uuid, text) to service_role;
