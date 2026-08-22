alter table public.profiles add column budget_tl numeric check (budget_tl > 0);
