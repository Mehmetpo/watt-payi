-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  reminder_day smallint not null default 5 check (reminder_day between 1 and 28),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- devices_catalog (public read-only reference data)
create table public.devices_catalog (
  key text primary key,
  name text not null,
  default_watt integer not null,
  icon_key text not null
);

alter table public.devices_catalog enable row level security;

create policy "devices_catalog_public_read" on public.devices_catalog for select using (true);

insert into public.devices_catalog (key, name, default_watt, icon_key) values
  ('fridge', 'Buzdolabı', 130, 'fridge'),
  ('ac', 'Klima', 1200, 'ac'),
  ('washer', 'Çamaşır Makinesi', 700, 'washer'),
  ('dishwasher', 'Bulaşık Makinesi', 1300, 'dishwasher'),
  ('oven', 'Fırın', 2000, 'oven'),
  ('toaster', 'Tost Makinesi', 800, 'toaster'),
  ('kettle', 'Su Isıtıcısı', 2000, 'kettle'),
  ('tv', 'Televizyon', 120, 'tv'),
  ('pc', 'Bilgisayar', 250, 'pc'),
  ('lighting', 'Aydınlatma', 200, 'lighting'),
  ('vacuum', 'Süpürge', 900, 'vacuum'),
  ('dryer', 'Kurutucu', 2500, 'dryer'),
  ('heater', 'Şofben', 2000, 'heater');

-- user_devices: per-user watt overrides + custom devices
create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_key text references public.devices_catalog(key),
  custom_name text,
  watt integer not null,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  constraint device_identity check (device_key is not null or custom_name is not null),
  unique (user_id, device_key)
);

alter table public.user_devices enable row level security;

create policy "user_devices_all_own" on public.user_devices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- bills: one row per month per user
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_month date not null,
  total_tl numeric(10,2) not null check (total_tl >= 0),
  rate_tl_per_kwh numeric(6,3) not null check (rate_tl_per_kwh > 0),
  photo_url text,
  created_at timestamptz not null default now(),
  unique (user_id, period_month)
);

alter table public.bills enable row level security;

create policy "bills_all_own" on public.bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- bill_items: the per-device breakdown of a bill
create table public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  device_key text,
  device_name text not null,
  watt integer not null,
  hours_per_week numeric(5,1) not null,
  monthly_kwh_raw numeric(8,3) not null,
  calibrated_tl numeric(10,2) not null,
  pct_share numeric(5,2) not null
);

alter table public.bill_items enable row level security;

create policy "bill_items_all_own" on public.bill_items
  for all using (
    exists (select 1 from public.bills b where b.id = bill_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.bills b where b.id = bill_id and b.user_id = auth.uid())
  );

-- storage bucket for bill photos, one folder per user
insert into storage.buckets (id, name, public)
  values ('bill-photos', 'bill-photos', false)
  on conflict (id) do nothing;

create policy "bill_photos_owner_read" on storage.objects
  for select using (bucket_id = 'bill-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "bill_photos_owner_write" on storage.objects
  for insert with check (bucket_id = 'bill-photos' and (storage.foldername(name))[1] = auth.uid()::text);
