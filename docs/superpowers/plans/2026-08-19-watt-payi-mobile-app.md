# Watt Payı Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Watt Payı Android app (React + Capacitor + Supabase) that lets a user log a monthly electricity bill (by hand or by photo), split it across household appliances, and track the breakdown over time.

**Architecture:** A Vite/React/TypeScript SPA wrapped by Capacitor for Android. All calculation logic lives in framework-independent, unit-tested pure functions (`src/lib/calc.ts`, `src/lib/trends.ts`). Supabase provides auth, Postgres (with RLS), and Storage; a Supabase Edge Function calls the Claude Vision API to read bill photos server-side so the API key never reaches the client.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, React Router 6, `@supabase/supabase-js`, Capacitor 6 (`camera`, `local-notifications`, `preferences`, `android`), Supabase (Postgres, Auth, Storage, Edge Functions on Deno).

**Spec:** `docs/superpowers/specs/2026-08-19-watt-payi-mobile-app-design.md`

---

## File Structure

```
watt-payi(mobile app)/
  package.json, tsconfig.json, tsconfig.node.json, vite.config.ts, index.html, capacitor.config.ts
  .env.local                          (gitignored — Supabase URL/anon key)
  src/
    main.tsx, App.tsx
    styles/tokens.css, styles/global.css
    lib/
      calc.ts, calc.test.ts           (calculation engine — pure)
      trends.ts, trends.test.ts       (rising-device detection — pure)
      supabaseClient.ts               (Supabase client + Capacitor storage adapter)
      billExtraction.ts               (Camera capture + Edge Function call)
      notifications.ts                (monthly local notification scheduling)
    types/domain.ts                   (shared TS types)
    data/deviceCatalog.ts             (13 preset appliances, mirrors devices_catalog seed)
    contexts/AuthContext.tsx
    components/
      BottomNav.tsx, BottomNav.css
      ApplianceIcon.tsx
      BillBreakdown.tsx, BillBreakdown.css   (shared donut + line-item list)
    screens/
      auth/LoginScreen.tsx, LoginScreen.css
      add/AddFlow.tsx, AddFlow.css
      add/steps/BillStep.tsx, DevicesStep.tsx, UsageStep.tsx, ResultStep.tsx
      home/HomeScreen.tsx, HomeScreen.css
      history/HistoryScreen.tsx, HistoryDetailScreen.tsx, HistoryScreen.css
      profile/ProfileScreen.tsx, ProfileScreen.css
  supabase/
    migrations/0001_init_schema.sql
    functions/extract-bill/index.ts
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `capacitor.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`

- [x] **Step 1: Write `package.json`**

```json
{
  "name": "watt-payi",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@capacitor/android": "^6.1.2",
    "@capacitor/camera": "^6.0.2",
    "@capacitor/core": "^6.1.2",
    "@capacitor/local-notifications": "^6.1.0",
    "@capacitor/preferences": "^6.0.2",
    "@supabase/supabase-js": "^2.45.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@capacitor/cli": "^6.1.2",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.3",
    "vitest": "^2.0.5"
  }
}
```

- [x] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [x] **Step 3: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [x] **Step 4: Write `vite.config.ts`** (added `/// <reference types="vitest/config" />` — without it `tsc -b` fails with "'test' does not exist in type 'UserConfigExport'")

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [x] **Step 5: Write `index.html`**

```html
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Watt Payı</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [x] **Step 6: Write `capacitor.config.ts`**

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mehmetcebe.wattpayi',
  appName: 'Watt Payı',
  webDir: 'dist',
};

export default config;
```

- [x] **Step 7: Write minimal `src/App.tsx` and `src/main.tsx`** (routing is filled in by Task 9; this just makes the build succeed)

`src/App.tsx`:
```tsx
export default function App() {
  return <div>Watt Payı</div>;
}
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [x] **Step 8: Install and verify the build**

Run: `npm install && npm run build`
Expected: build succeeds, `dist/` is created, no TypeScript errors.

- [x] **Step 9: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts index.html capacitor.config.ts src/App.tsx src/main.tsx package-lock.json
git commit -m "chore: scaffold Vite + React + TS + Capacitor project"
```

---

### Task 2: Design tokens & global styles

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Modify: `index.html` (add Google Fonts links)

- [x] **Step 1: Write `src/styles/tokens.css`** ("Enerji Canlı" palette from the design spec, light + dark)

```css
:root {
  --bg: #FAFAFC;
  --surface: #FFFFFF;
  --surface-sunken: #F1F1F6;
  --ink: #191A23;
  --ink-muted: #6B6F80;
  --ink-faint: #9A9EB0;
  --accent: #6D5EF0;
  --accent-soft: #ECE9FE;
  --coral: #FF5D5D;
  --coral-soft: #FFE7E7;
  --good: #2BC5A0;
  --good-soft: #E2F8F2;
  --line: #E4E4EC;
  --shadow: 0 1px 2px rgba(25,26,35,.04), 0 8px 20px -10px rgba(25,26,35,.16);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #14141C;
    --surface: #1E1E29;
    --surface-sunken: #262632;
    --ink: #EDEDF4;
    --ink-muted: #A6A9BC;
    --ink-faint: #6E7186;
    --accent: #8B7DFF;
    --accent-soft: #2C2650;
    --coral: #FF7A7A;
    --coral-soft: #3A2020;
    --good: #4FDBB5;
    --good-soft: #16332C;
    --line: #2E2E3D;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 12px 26px -12px rgba(0,0,0,.6);
  }
}
```

- [x] **Step 2: Write `src/styles/global.css`**

```css
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, .display { font-family: 'Manrope', system-ui, sans-serif; }
.mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
button { font-family: inherit; }
a { color: inherit; }
```

- [x] **Step 3: Add font links to `index.html`** (inside `<head>`, after `<title>`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" />
```

- [x] **Step 4: Import stylesheets in `src/main.tsx`** (add above `import App`)

```tsx
import './styles/tokens.css';
import './styles/global.css';
```

- [x] **Step 5: Verify**

Run: `npm run dev`
Expected: dev server starts, page background/font visibly match the new tokens when opened in a browser.

- [x] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/styles/global.css src/main.tsx index.html
git commit -m "feat: add Enerji Canlı design tokens and global styles"
```

---

### Task 3: Calculation engine (TDD)

**Files:**
- Create: `src/lib/calc.ts`
- Test: `src/lib/calc.test.ts`

- [x] **Step 1: Write the failing tests**

`src/lib/calc.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { monthlyKwh, calculateBreakdown } from './calc';

describe('monthlyKwh', () => {
  it('converts watt + hours/week into kWh/month using 4.345 weeks/month', () => {
    const result = monthlyKwh({ key: 'fridge', watt: 130, hoursPerWeek: 168 });
    expect(result).toBeCloseTo(94.8948, 4);
  });
});

describe('calculateBreakdown', () => {
  it('returns empty items and zero ratio when there are no devices', () => {
    const result = calculateBreakdown([], { billTl: 1000, ratePerKwh: 3.5 });
    expect(result.items).toEqual([]);
    expect(result.totalRawKwh).toBe(0);
    expect(result.calcRatio).toBe(0);
    expect(result.impliedKwh).toBeCloseTo(285.7142857, 4);
  });

  it('guards against a zero rate instead of dividing by zero', () => {
    const result = calculateBreakdown(
      [{ key: 'fridge', watt: 130, hoursPerWeek: 168 }],
      { billTl: 1000, ratePerKwh: 0 }
    );
    expect(result.impliedKwh).toBe(0);
  });

  it('allocates the full bill amount proportionally across devices', () => {
    const result = calculateBreakdown(
      [
        { key: 'fridge', watt: 130, hoursPerWeek: 168 },
        { key: 'toaster', watt: 800, hoursPerWeek: 1 },
      ],
      { billTl: 1000, ratePerKwh: 3.5 }
    );

    const sumTl = result.items.reduce((sum, item) => sum + item.calibratedTl, 0);
    const sumPct = result.items.reduce((sum, item) => sum + item.pctShare, 0);

    expect(sumTl).toBeCloseTo(1000, 6);
    expect(sumPct).toBeCloseTo(100, 6);
    expect(result.items[0].calibratedTl).toBeGreaterThan(result.items[1].calibratedTl);
  });
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/calc.test.ts`
Expected: FAIL — `Cannot find module './calc'`

- [x] **Step 3: Write the implementation**

`src/lib/calc.ts`:
```ts
export interface DeviceUsage {
  key: string;
  watt: number;
  hoursPerWeek: number;
}

export interface BillCalibration {
  billTl: number;
  ratePerKwh: number;
}

export interface DeviceShare {
  key: string;
  monthlyKwhRaw: number;
  calibratedTl: number;
  pctShare: number;
}

export interface CalcResult {
  items: DeviceShare[];
  totalRawKwh: number;
  impliedKwh: number;
  calcRatio: number;
}

const WEEKS_PER_MONTH = 4.345;

export function monthlyKwh(device: DeviceUsage): number {
  return (device.watt / 1000) * device.hoursPerWeek * WEEKS_PER_MONTH;
}

export function calculateBreakdown(devices: DeviceUsage[], bill: BillCalibration): CalcResult {
  const rawKwhList = devices.map((d) => ({ key: d.key, kwh: monthlyKwh(d) }));
  const totalRawKwh = rawKwhList.reduce((sum, d) => sum + d.kwh, 0);
  const impliedKwh = bill.ratePerKwh > 0 ? bill.billTl / bill.ratePerKwh : 0;
  const calcRatio = totalRawKwh > 0 ? (totalRawKwh * bill.ratePerKwh) / bill.billTl : 0;

  const items: DeviceShare[] = rawKwhList.map(({ key, kwh }) => {
    const share = totalRawKwh > 0 ? kwh / totalRawKwh : 0;
    return {
      key,
      monthlyKwhRaw: kwh,
      calibratedTl: share * bill.billTl,
      pctShare: share * 100,
    };
  });

  return { items, totalRawKwh, impliedKwh, calcRatio };
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/calc.test.ts`
Expected: PASS — 4 tests passed

- [x] **Step 5: Commit**

```bash
git add src/lib/calc.ts src/lib/calc.test.ts
git commit -m "feat: add device-breakdown calculation engine"
```

---

### Task 4: Rising-device trend detection (TDD)

**Files:**
- Create: `src/lib/trends.ts`
- Test: `src/lib/trends.test.ts`

- [x] **Step 1: Write the failing test**

`src/lib/trends.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { detectRisingDevices } from './trends';

describe('detectRisingDevices', () => {
  it('flags a device whose cost strictly increased for 3+ consecutive months', () => {
    const bills = [
      { periodMonth: '2026-05-01', items: [
        { deviceKey: 'ac', deviceName: 'Klima', calibratedTl: 400 },
        { deviceKey: 'fridge', deviceName: 'Buzdolabı', calibratedTl: 300 },
      ]},
      { periodMonth: '2026-06-01', items: [
        { deviceKey: 'ac', deviceName: 'Klima', calibratedTl: 500 },
        { deviceKey: 'fridge', deviceName: 'Buzdolabı', calibratedTl: 300 },
      ]},
      { periodMonth: '2026-07-01', items: [
        { deviceKey: 'ac', deviceName: 'Klima', calibratedTl: 650 },
        { deviceKey: 'fridge', deviceName: 'Buzdolabı', calibratedTl: 300 },
      ]},
      { periodMonth: '2026-08-01', items: [
        { deviceKey: 'ac', deviceName: 'Klima', calibratedTl: 850 },
        { deviceKey: 'fridge', deviceName: 'Buzdolabı', calibratedTl: 300 },
      ]},
    ];

    const result = detectRisingDevices(bills);

    expect(result).toEqual([{ deviceName: 'Klima', months: 4 }]);
  });

  it('returns an empty list when nothing rises for the minimum streak', () => {
    const bills = [
      { periodMonth: '2026-06-01', items: [{ deviceKey: 'ac', deviceName: 'Klima', calibratedTl: 400 }] },
      { periodMonth: '2026-07-01', items: [{ deviceKey: 'ac', deviceName: 'Klima', calibratedTl: 500 }] },
    ];

    expect(detectRisingDevices(bills)).toEqual([]);
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/trends.test.ts`
Expected: FAIL — `Cannot find module './trends'`

- [x] **Step 3: Write the implementation**

`src/lib/trends.ts`:
```ts
export interface BillItemForTrend {
  deviceKey: string | null;
  deviceName: string;
  calibratedTl: number;
}

export interface BillWithItems {
  periodMonth: string;
  items: BillItemForTrend[];
}

export interface RisingDevice {
  deviceName: string;
  months: number;
}

export function detectRisingDevices(bills: BillWithItems[], minConsecutiveMonths = 3): RisingDevice[] {
  const sorted = [...bills].sort((a, b) => a.periodMonth.localeCompare(b.periodMonth));
  const byDevice = new Map<string, { deviceName: string; values: number[] }>();

  for (const bill of sorted) {
    for (const item of bill.items) {
      const id = item.deviceKey ?? item.deviceName;
      const entry = byDevice.get(id) ?? { deviceName: item.deviceName, values: [] };
      entry.values.push(item.calibratedTl);
      byDevice.set(id, entry);
    }
  }

  const rising: RisingDevice[] = [];
  for (const { deviceName, values } of byDevice.values()) {
    let streak = 1;
    let maxStreak = 1;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) {
        streak += 1;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 1;
      }
    }
    if (maxStreak >= minConsecutiveMonths) {
      rising.push({ deviceName, months: maxStreak });
    }
  }

  return rising;
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/trends.test.ts`
Expected: PASS — 2 tests passed

- [x] **Step 5: Commit**

```bash
git add src/lib/trends.ts src/lib/trends.test.ts
git commit -m "feat: add rising-device trend detection"
```

---

### Task 5: Supabase schema

**Files:**
- Create: `supabase/migrations/0001_init_schema.sql`

- [x] **Step 1: Write the migration**

`supabase/migrations/0001_init_schema.sql`:
```sql
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
```

- [x] **Step 2: Apply the migration** — Applied 2026-08-20 via Supabase MCP (`apply_migration`) to the new `watt-payi` project (`vwdgadvnatgjkmhikuax`, region `eu-central-1`). Resolved the free-tier limit by pausing `flort-asistan` (per user instruction 2026-08-20) rather than reactivating "Mehmetpo's Project", then creating a fresh dedicated project. Verified via `list_tables`: `profiles`, `devices_catalog` (13 seed rows), `user_devices`, `bills`, `bill_items` all present with RLS enabled; `get_advisors` (security) returned zero lints.

- [x] **Step 3: Commit**

```bash
git add supabase/migrations/0001_init_schema.sql
git commit -m "feat: add Supabase schema (profiles, devices, bills, bill_items, storage)"
```

---

### Task 6: Supabase client + env

**Files:**
- Create: `src/lib/supabaseClient.ts`
- Create: `.env.local` (gitignored)
- Create: `.env.example`

- [x] **Step 1: Write `.env.example`** (committed, documents the required variables without real secrets)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [x] **Step 2: Create `.env.local`** with real values — updated 2026-08-20 with the `watt-payi` project's URL and anon key (`https://vwdgadvnatgjkmhikuax.supabase.co`) once the project existed (see Task 5 Step 2). File remains gitignored.

- [x] **Step 3: Write `src/lib/supabaseClient.ts`** (also added `src/vite-env.d.ts` with `/// <reference types="vite/client" />` — without it, `tsc -b` fails with "Property 'env' does not exist on type 'ImportMeta'")

```ts
import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

const capacitorStorageAdapter = {
  getItem: async (key: string) => (await Preferences.get({ key })).value,
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
  },
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: capacitorStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [x] **Step 4: Verify**

Run: `npm run build`
Expected: builds without error (env vars are read at runtime, not required for the build to type-check).

- [x] **Step 5: Commit**

```bash
git add src/lib/supabaseClient.ts src/vite-env.d.ts .env.example
git commit -m "feat: add Supabase client with Capacitor-backed session storage"
```

---

### Task 7: Domain types, device catalog data, appliance icons

**Files:**
- Create: `src/types/domain.ts`
- Create: `src/data/deviceCatalog.ts`
- Create: `src/components/ApplianceIcon.tsx`

- [x] **Step 1: Write `src/types/domain.ts`**

```ts
export interface DeviceCatalogEntry {
  key: string;
  name: string;
  defaultWatt: number;
  iconKey: string;
}

export interface UserDevice {
  id: string;
  deviceKey: string | null;
  customName: string | null;
  watt: number;
  isCustom: boolean;
}

export interface Bill {
  id: string;
  periodMonth: string;
  totalTl: number;
  rateTlPerKwh: number;
  photoUrl: string | null;
}

export interface BillItem {
  id: string;
  deviceKey: string | null;
  deviceName: string;
  watt: number;
  hoursPerWeek: number;
  monthlyKwhRaw: number;
  calibratedTl: number;
  pctShare: number;
}
```

- [x] **Step 2: Write `src/data/deviceCatalog.ts`** (mirrors the seed rows in `0001_init_schema.sql` for offline defaults/tests)

```ts
import type { DeviceCatalogEntry } from '../types/domain';

export const DEVICE_CATALOG: DeviceCatalogEntry[] = [
  { key: 'fridge', name: 'Buzdolabı', defaultWatt: 130, iconKey: 'fridge' },
  { key: 'ac', name: 'Klima', defaultWatt: 1200, iconKey: 'ac' },
  { key: 'washer', name: 'Çamaşır Makinesi', defaultWatt: 700, iconKey: 'washer' },
  { key: 'dishwasher', name: 'Bulaşık Makinesi', defaultWatt: 1300, iconKey: 'dishwasher' },
  { key: 'oven', name: 'Fırın', defaultWatt: 2000, iconKey: 'oven' },
  { key: 'toaster', name: 'Tost Makinesi', defaultWatt: 800, iconKey: 'toaster' },
  { key: 'kettle', name: 'Su Isıtıcısı', defaultWatt: 2000, iconKey: 'kettle' },
  { key: 'tv', name: 'Televizyon', defaultWatt: 120, iconKey: 'tv' },
  { key: 'pc', name: 'Bilgisayar', defaultWatt: 250, iconKey: 'pc' },
  { key: 'lighting', name: 'Aydınlatma', defaultWatt: 200, iconKey: 'lighting' },
  { key: 'vacuum', name: 'Süpürge', defaultWatt: 900, iconKey: 'vacuum' },
  { key: 'dryer', name: 'Kurutucu', defaultWatt: 2500, iconKey: 'dryer' },
  { key: 'heater', name: 'Şofben', defaultWatt: 2000, iconKey: 'heater' },
];
```

- [x] **Step 3: Write `src/components/ApplianceIcon.tsx`** (ported from the approved web prototype's icon set)

```tsx
const PATHS: Record<string, string> = {
  fridge: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><line x1="5" y1="10" x2="19" y2="10"/><line x1="8" y1="5.5" x2="8" y2="7"/><line x1="8" y1="13" x2="8" y2="14.5"/>',
  ac: '<rect x="3" y="7" width="18" height="7" rx="2"/><path d="M6 17c0 1.5 1 2 1 3.5M12 17c0 1.5 1 2 1 3.5M18 17c0 1.5 1 2 1 3.5"/><circle cx="17.5" cy="10.5" r=".6" fill="currentColor" stroke="none"/>',
  washer: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="5.2"/><circle cx="12" cy="13" r="2"/><line x1="7" y1="6" x2="8.6" y2="6"/><line x1="10.4" y1="6" x2="12" y2="6"/>',
  dishwasher: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><line x1="4" y1="7.5" x2="20" y2="7.5"/><circle cx="12" cy="14.5" r="4.3"/><line x1="12" y1="11" x2="12" y2="18"/><line x1="8.7" y1="14.5" x2="15.3" y2="14.5"/>',
  oven: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="6" y="10" width="12" height="8" rx="1.4"/><line x1="6.5" y1="6.2" x2="9.5" y2="6.2"/><line x1="12" y1="6.2" x2="15" y2="6.2"/>',
  toaster: '<path d="M4 10c0-3 1.5-5 3-5h10c1.5 0 3 2 3 5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18Z"/><line x1="9" y1="8.5" x2="9" y2="14.5"/><line x1="15" y1="8.5" x2="15" y2="14.5"/>',
  kettle: '<path d="M5 20h11a2 2 0 0 0 2-2v-2.2c2.6-.5 3.6-2 3.6-2s-1.4-1.2-3.6-1V11a5.5 5.5 0 0 0-5.5-5.5H9A5.5 5.5 0 0 0 5 11Z"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="14" y1="20" x2="14" y2="22"/>',
  tv: '<rect x="3" y="4" width="18" height="12.5" rx="2"/><line x1="8" y1="20.5" x2="16" y2="20.5"/><line x1="12" y1="16.5" x2="12" y2="20.5"/>',
  pc: '<rect x="4" y="4" width="16" height="11" rx="2"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="15" x2="12" y2="20"/>',
  lighting: '<circle cx="12" cy="9.5" r="5.5"/><path d="M9.5 19h5M10 22h4"/><line x1="12" y1="14.8" x2="12" y2="17.2"/>',
  vacuum: '<circle cx="8" cy="7" r="3.4"/><path d="M10.8 9.2 18 16.4a2 2 0 1 1-2.8 2.8L8 11.9"/><line x1="18" y1="16.4" x2="21" y2="19.4"/>',
  dryer: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="13.5" r="5"/><circle cx="12" cy="13.5" r="1.7"/>',
  heater: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M9 8c0 1.2-1.5 1.6-1.5 3S9 13.5 9 12.3M13 8c0 1.2-1.5 1.6-1.5 3S13 13.5 13 12.3M17 8c0 1.2-1.5 1.6-1.5 3S17 13.5 17 12.3"/><line x1="8" y1="17" x2="16" y2="17"/>',
};

export interface ApplianceIconProps {
  iconKey: string;
  size?: number;
}

export function ApplianceIcon({ iconKey, size = 20 }: ApplianceIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: PATHS[iconKey] ?? '' }}
    />
  );
}
```

- [x] **Step 4: Verify**

Run: `npm run build`
Expected: builds without TypeScript errors.

- [x] **Step 5: Commit**

```bash
git add src/types/domain.ts src/data/deviceCatalog.ts src/components/ApplianceIcon.tsx
git commit -m "feat: add domain types, device catalog data, and appliance icons"
```

---

### Task 8: AuthContext + LoginScreen (email OTP)

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/screens/auth/LoginScreen.tsx`
- Create: `src/screens/auth/LoginScreen.css`

- [x] **Step 1: Write `src/contexts/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [x] **Step 2: Write `src/screens/auth/LoginScreen.tsx`** (email + 6-digit OTP, no password to manage)

```tsx
import { useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './LoginScreen.css';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'email' | 'otp'>('email');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: sendError } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    if (sendError) {
      setError('Kod gönderilemedi, e-posta adresini kontrol et.');
      return;
    }
    setStage('otp');
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    setBusy(false);
    if (verifyError) {
      setError('Kod hatalı ya da süresi doldu, tekrar dene.');
    }
  }

  return (
    <div className="login-shell">
      <h1 className="display">Watt Payı</h1>
      <p className="login-sub">Faturanı cihaz cihaz takip et.</p>

      {stage === 'email' ? (
        <form onSubmit={sendOtp} className="login-form">
          <label htmlFor="email">E-posta</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@eposta.com"
          />
          <button type="submit" disabled={busy}>{busy ? 'Gönderiliyor...' : 'Giriş kodu gönder'}</button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="login-form">
          <label htmlFor="otp">E-postana gelen 6 haneli kod</label>
          <input
            id="otp"
            inputMode="numeric"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
          />
          <button type="submit" disabled={busy}>{busy ? 'Doğrulanıyor...' : 'Giriş yap'}</button>
        </form>
      )}

      {error && <p className="login-error">{error}</p>}
    </div>
  );
}
```

- [x] **Step 3: Write `src/screens/auth/LoginScreen.css`**

```css
.login-shell { max-width: 360px; margin: 0 auto; padding: 4rem 1.5rem; display: flex; flex-direction: column; gap: .5rem; }
.login-sub { color: var(--ink-muted); margin: 0 0 1.5rem; }
.login-form { display: flex; flex-direction: column; gap: .5rem; }
.login-form label { font-size: .8rem; font-weight: 600; color: var(--ink-muted); }
.login-form input {
  border: 1.5px solid var(--line); border-radius: 12px; padding: .8rem 1rem;
  background: var(--surface-sunken); color: var(--ink); font-size: 1rem; outline: 0;
}
.login-form input:focus { border-color: var(--accent); }
.login-form button {
  margin-top: .5rem; border: 0; border-radius: 12px; padding: .85rem;
  background: var(--accent); color: #fff; font-weight: 700; cursor: pointer;
}
.login-form button:disabled { opacity: .6; cursor: not-allowed; }
.login-error { color: var(--coral); font-size: .85rem; margin-top: .75rem; }
```

- [x] **Step 4: Verify**

Run: `npm run build`
Expected: builds without TypeScript errors.

- [x] **Step 5: Commit**

```bash
git add src/contexts/AuthContext.tsx src/screens/auth/LoginScreen.tsx src/screens/auth/LoginScreen.css
git commit -m "feat: add auth context and email-OTP login screen"
```

---

### Task 9: App shell — routing + bottom navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Create: `src/components/BottomNav.tsx`
- Create: `src/components/BottomNav.css`

- [x] **Step 1: Write `src/components/BottomNav.tsx`**

```tsx
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const TABS = [
  { to: '/', label: 'Ana Sayfa', icon: '◆' },
  { to: '/history', label: 'Geçmiş', icon: '▤' },
  { to: '/add', label: 'Ekle', icon: '+' },
  { to: '/profile', label: 'Profil', icon: '◐' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => 'bottom-nav__item' + (isActive ? ' active' : '')}
        >
          <span className="bottom-nav__icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

- [x] **Step 2: Write `src/components/BottomNav.css`**

```css
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; justify-content: space-around;
  background: var(--surface); border-top: 1px solid var(--line);
  padding: .5rem 0 calc(.5rem + env(safe-area-inset-bottom));
}
.bottom-nav__item {
  display: flex; flex-direction: column; align-items: center; gap: .2rem;
  text-decoration: none; color: var(--ink-faint); font-size: .68rem; font-weight: 600;
}
.bottom-nav__item.active { color: var(--accent); }
.bottom-nav__icon { font-size: 1.1rem; }
```

- [x] **Step 3: Rewrite `src/App.tsx`**

```tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './screens/auth/LoginScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { AddFlow } from './screens/add/AddFlow';
import { HistoryScreen } from './screens/history/HistoryScreen';
import { HistoryDetailScreen } from './screens/history/HistoryDetailScreen';
import { ProfileScreen } from './screens/profile/ProfileScreen';
import { BottomNav } from './components/BottomNav';

function AuthedShell() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <LoginScreen />;

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/add" element={<AddFlow />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/history/:billId" element={<HistoryDetailScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthedShell />
    </AuthProvider>
  );
}
```

- [x] **Step 4: Add the router to `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/tokens.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [x] **Step 5: Verify**

Note: this task references `HomeScreen`, `AddFlow`, `HistoryScreen`, `HistoryDetailScreen`, `ProfileScreen`, which don't exist yet — the build will fail until Tasks 11–18 add them. Skip the build check here and run it at the end of Task 14 (once `AddFlow` exists) and again at the end of Task 19.

- [x] **Step 6: Commit**

```bash
git add src/App.tsx src/main.tsx src/components/BottomNav.tsx src/components/BottomNav.css
git commit -m "feat: add app shell with routing and bottom navigation"
```

---

### Task 10: Shared BillBreakdown component

**Files:**
- Create: `src/components/BillBreakdown.tsx`
- Create: `src/components/BillBreakdown.css`

This component renders the donut + line-item list used by the Add flow's result step, the home dashboard, and the history detail screen — written once, reused three times.

- [x] **Step 1: Write `src/components/BillBreakdown.css`**

```css
.breakdown-summary { display: flex; align-items: center; gap: 1.25rem; margin-bottom: 1.25rem; }
.breakdown-donut { width: 104px; height: 104px; border-radius: 50%; position: relative; flex: none; }
.breakdown-donut::after { content: ''; position: absolute; inset: 15px; border-radius: 50%; background: var(--surface); }
.breakdown-donut-center {
  position: absolute; inset: 15px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center;
}
.breakdown-donut-center b { font-size: .9rem; }
.breakdown-donut-center small { font-size: .6rem; color: var(--ink-faint); text-transform: uppercase; letter-spacing: .04em; }
.breakdown-total { font-size: 1.9rem; font-weight: 800; }
.breakdown-total span { font-size: 1rem; color: var(--ink-faint); font-weight: 600; margin-left: .2rem; }
.breakdown-list { display: flex; flex-direction: column; gap: .9rem; }
.breakdown-row { display: flex; align-items: center; gap: .7rem; }
.breakdown-icon { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex: none; }
.breakdown-main { flex: 1; min-width: 0; }
.breakdown-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: .3rem; gap: .5rem; }
.breakdown-name { font-weight: 700; font-size: .84rem; }
.breakdown-amount { font-weight: 600; font-size: .84rem; white-space: nowrap; }
.breakdown-amount small { color: var(--ink-faint); font-weight: 500; margin-left: .3rem; }
.breakdown-track { height: 6px; border-radius: 4px; background: var(--surface-sunken); overflow: hidden; }
.breakdown-fill { height: 100%; border-radius: 4px; }
```

- [x] **Step 2: Write `src/components/BillBreakdown.tsx`**

```tsx
import { ApplianceIcon } from './ApplianceIcon';
import type { BillItem } from '../types/domain';
import './BillBreakdown.css';

const CAT_COLORS = ['#6D5EF0', '#FF5D5D', '#2BC5A0', '#E0A83F', '#3F8FE0', '#B85AC9', '#5AC98F', '#C97A3F'];

export interface BillBreakdownProps {
  totalTl: number;
  items: Pick<BillItem, 'deviceKey' | 'deviceName' | 'calibratedTl' | 'pctShare'>[];
  iconKeyFor: (deviceKey: string | null) => string;
}

export function BillBreakdown({ totalTl, items, iconKeyFor }: BillBreakdownProps) {
  const sorted = [...items].sort((a, b) => b.calibratedTl - a.calibratedTl);

  let acc = 0;
  const stops = sorted.map((item, i) => {
    const start = acc;
    acc += item.pctShare;
    return `${CAT_COLORS[i % CAT_COLORS.length]} ${start.toFixed(2)}% ${acc.toFixed(2)}%`;
  });
  const donutBackground = stops.length ? `conic-gradient(${stops.join(',')})` : 'var(--surface-sunken)';

  return (
    <div>
      <div className="breakdown-summary">
        <div className="breakdown-donut" style={{ background: donutBackground }}>
          <div className="breakdown-donut-center">
            <b className="mono">{Math.round(totalTl).toLocaleString('tr-TR')}</b>
            <small>TL</small>
          </div>
        </div>
        <div className="breakdown-total mono">
          {Math.round(totalTl).toLocaleString('tr-TR')}
          <span>TL</span>
        </div>
      </div>

      <div className="breakdown-list">
        {sorted.map((item, i) => {
          const color = CAT_COLORS[i % CAT_COLORS.length];
          return (
            <div className="breakdown-row" key={item.deviceKey ?? item.deviceName}>
              <div className="breakdown-icon" style={{ background: `${color}26`, color }}>
                <ApplianceIcon iconKey={iconKeyFor(item.deviceKey)} size={16} />
              </div>
              <div className="breakdown-main">
                <div className="breakdown-top">
                  <span className="breakdown-name">{item.deviceName}</span>
                  <span className="breakdown-amount mono">
                    {Math.round(item.calibratedTl).toLocaleString('tr-TR')} TL
                    <small>%{item.pctShare.toFixed(0)}</small>
                  </span>
                </div>
                <div className="breakdown-track">
                  <div className="breakdown-fill" style={{ width: `${item.pctShare}%`, background: color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [x] **Step 3: Verify** — `npm run build` shows only the pre-existing Task 9 errors (missing `HomeScreen`/`AddFlow`/`HistoryScreen`/`HistoryDetailScreen`/`ProfileScreen`, expected until Tasks 11–18); no errors reference `BillBreakdown`, so the new component type-checks cleanly.

- [x] **Step 4: Commit**

```bash
git add src/components/BillBreakdown.tsx src/components/BillBreakdown.css
git commit -m "feat: add shared BillBreakdown donut + list component"
```

---

### Task 11: Add flow — Adım 1: Fatura

**Files:**
- Create: `src/screens/add/AddFlow.tsx`
- Create: `src/screens/add/AddFlow.css`
- Create: `src/screens/add/steps/BillStep.tsx`

This task creates the wizard container with in-memory state for all 4 steps, and implements the first step (manual bill entry only — photo capture is wired in Task 16 once the Edge Function exists).

- [x] **Step 1: Write `src/screens/add/AddFlow.css`**

```css
.add-shell { max-width: 640px; margin: 0 auto; padding: 1.5rem 1.25rem 6rem; }
.add-progress { display: flex; gap: .4rem; margin-bottom: 1.5rem; }
.add-progress i { flex: 1; height: 3px; border-radius: 2px; background: var(--line); }
.add-progress i.done, .add-progress i.active { background: var(--accent); }
.add-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); padding: 1.5rem; }
.add-field { margin-bottom: 1.25rem; }
.add-field label { display: block; font-size: .8rem; font-weight: 600; color: var(--ink-muted); margin-bottom: .5rem; }
.add-amount { display: flex; align-items: baseline; gap: .5rem; border: 1.5px solid var(--line); border-radius: 12px; padding: .8rem 1rem; background: var(--surface-sunken); }
.add-amount input { border: 0; background: transparent; outline: 0; font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 1.5rem; width: 100%; color: var(--ink); }
.add-amount .unit { color: var(--ink-faint); font-weight: 600; }
.add-row-btns { display: flex; gap: .7rem; margin-top: 1.5rem; }
.add-btn { border: 0; border-radius: 11px; padding: .85rem 1.2rem; font-weight: 700; cursor: pointer; }
.add-btn-primary { background: var(--accent); color: #fff; flex: 1; }
.add-btn-primary:disabled { opacity: .4; cursor: not-allowed; }
.add-btn-ghost { background: transparent; color: var(--ink-muted); border: 1.5px solid var(--line); }
.add-photo-btn { width: 100%; border: 1.5px dashed var(--line); border-radius: 12px; padding: .9rem; background: transparent; color: var(--accent); font-weight: 700; cursor: pointer; margin-bottom: 1rem; }
```

- [x] **Step 2: Write `src/screens/add/steps/BillStep.tsx`**

```tsx
export interface BillStepValue {
  billTl: number;
  ratePerKwh: number;
}

export interface BillStepProps {
  value: BillStepValue;
  onChange: (value: BillStepValue) => void;
}

export function BillStep({ value, onChange }: BillStepProps) {
  return (
    <div>
      <div className="add-field">
        <label htmlFor="billTl">Aylık fatura tutarı</label>
        <div className="add-amount">
          <input
            id="billTl"
            type="number"
            min={0}
            value={value.billTl || ''}
            onChange={(e) => onChange({ ...value, billTl: Number(e.target.value) })}
            placeholder="2000"
          />
          <span className="unit">TL</span>
        </div>
      </div>
      <div className="add-field">
        <label htmlFor="rate">Birim fiyat</label>
        <div className="add-amount">
          <input
            id="rate"
            type="number"
            min={0.1}
            step={0.1}
            value={value.ratePerKwh || ''}
            onChange={(e) => onChange({ ...value, ratePerKwh: Number(e.target.value) })}
          />
          <span className="unit">TL / kWh</span>
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 3: Write `src/screens/add/AddFlow.tsx`** (wizard container; steps 2–4 are stubbed with a "sonraki görevde" placeholder body until Tasks 12–14 fill them in — the container itself has no TBD logic, only the not-yet-built child steps are absent)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BillStep, type BillStepValue } from './steps/BillStep';
import './AddFlow.css';

const STEP_LABELS = ['Fatura', 'Cihazlar', 'Kullanım', 'Sonuç'];

export function AddFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [bill, setBill] = useState<BillStepValue>({ billTl: 0, ratePerKwh: 3.5 });

  return (
    <div className="add-shell">
      <div className="add-progress">
        {STEP_LABELS.map((_, i) => (
          <i key={i} className={i < step ? 'done' : i === step ? 'active' : ''} />
        ))}
      </div>
      <div className="add-card">
        {step === 0 && <BillStep value={bill} onChange={setBill} />}
      </div>
      <div className="add-row-btns">
        {step > 0 ? (
          <button className="add-btn add-btn-ghost" onClick={() => setStep(step - 1)}>Geri</button>
        ) : (
          <button className="add-btn add-btn-ghost" onClick={() => navigate('/')}>İptal</button>
        )}
        <button
          className="add-btn add-btn-primary"
          disabled={step === 0 && bill.billTl <= 0}
          onClick={() => setStep(Math.min(step + 1, STEP_LABELS.length - 1))}
        >
          Devam et
        </button>
      </div>
    </div>
  );
}
```

- [x] **Step 4: Verify** — `npm run build` shows only the pre-existing Task 9 errors (missing `HomeScreen`/`HistoryScreen`/`HistoryDetailScreen`/`ProfileScreen`, expected until Tasks 13/15/17 add them); `AddFlow` resolves cleanly with no errors referencing it.

- [x] **Step 5: Commit**

```bash
git add src/screens/add/AddFlow.tsx src/screens/add/AddFlow.css src/screens/add/steps/BillStep.tsx
git commit -m "feat: add Add-flow wizard shell and Fatura step"
```

---

### Task 12: Add flow — Adım 2: Cihazlar

**Files:**
- Create: `src/screens/add/steps/DevicesStep.tsx`
- Modify: `src/screens/add/AddFlow.css`
- Modify: `src/screens/add/AddFlow.tsx`

- [x] **Step 1: Add device-grid styles to `src/screens/add/AddFlow.css`** (append)

```css
.device-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; }
.device-card {
  border: 1.5px solid var(--line); border-radius: 13px; background: var(--surface-sunken);
  padding: .85rem .5rem; text-align: center; cursor: pointer; display: flex;
  flex-direction: column; align-items: center; gap: .4rem;
}
.device-card span { font-size: .7rem; font-weight: 600; color: var(--ink-muted); }
.device-card svg { color: var(--ink-muted); }
.device-card.on { background: var(--accent-soft); border-color: var(--accent); }
.device-card.on span, .device-card.on svg { color: #4A3FCF; }
```

- [x] **Step 2: Write `src/screens/add/steps/DevicesStep.tsx`**

```tsx
import { DEVICE_CATALOG } from '../../../data/deviceCatalog';
import { ApplianceIcon } from '../../../components/ApplianceIcon';

export interface DevicesStepProps {
  selected: Set<string>;
  onToggle: (deviceKey: string) => void;
}

export function DevicesStep({ selected, onToggle }: DevicesStepProps) {
  return (
    <div className="device-grid">
      {DEVICE_CATALOG.map((device) => (
        <div
          key={device.key}
          className={'device-card' + (selected.has(device.key) ? ' on' : '')}
          onClick={() => onToggle(device.key)}
        >
          <ApplianceIcon iconKey={device.iconKey} size={22} />
          <span>{device.name}</span>
        </div>
      ))}
    </div>
  );
}
```

- [x] **Step 3: Wire the step into `src/screens/add/AddFlow.tsx`**

Add imports:
```tsx
import { DevicesStep } from './steps/DevicesStep';
```

Add state (inside the `AddFlow` function, after the `bill` state line):
```tsx
const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

function toggleDevice(key: string) {
  setSelectedDevices((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
}
```

Replace the card body:
```tsx
<div className="add-card">
  {step === 0 && <BillStep value={bill} onChange={setBill} />}
  {step === 1 && <DevicesStep selected={selectedDevices} onToggle={toggleDevice} />}
</div>
```

Update the "Devam et" disabled condition:
```tsx
disabled={(step === 0 && bill.billTl <= 0) || (step === 1 && selectedDevices.size === 0)}
```

- [x] **Step 4: Verify** — `npm run build` shows only the pre-existing Task 9 errors (missing `HomeScreen`/`HistoryScreen`/`HistoryDetailScreen`/`ProfileScreen`, expected until Tasks 13/15/17 add them); no errors reference `DevicesStep` or `AddFlow`.

- [x] **Step 5: Commit**

```bash
git add src/screens/add/steps/DevicesStep.tsx src/screens/add/AddFlow.css src/screens/add/AddFlow.tsx
git commit -m "feat: add Cihazlar step to Add flow"
```

---

### Task 13: Add flow — Adım 3: Kullanım

**Files:**
- Create: `src/screens/add/steps/UsageStep.tsx`
- Modify: `src/screens/add/AddFlow.css`
- Modify: `src/screens/add/AddFlow.tsx`

- [x] **Step 1: Add usage-row styles to `src/screens/add/AddFlow.css`** (append)

```css
.usage-row { padding: .9rem 0; border-bottom: 1px solid var(--line); }
.usage-row:first-child { padding-top: 0; }
.usage-row:last-child { border-bottom: 0; padding-bottom: 0; }
.usage-top { display: flex; align-items: center; gap: .6rem; margin-bottom: .6rem; }
.usage-icon { width: 32px; height: 32px; border-radius: 9px; background: var(--surface-sunken); display: flex; align-items: center; justify-content: center; color: var(--ink-muted); }
.usage-name { font-weight: 700; font-size: .88rem; flex: 1; }
.usage-watt { display: flex; align-items: center; gap: .2rem; background: var(--surface-sunken); border: 1px solid var(--line); border-radius: 8px; padding: .25rem .45rem; }
.usage-watt input { width: 3rem; border: 0; background: transparent; outline: 0; font-family: 'IBM Plex Mono', monospace; font-size: .75rem; font-weight: 600; text-align: right; color: var(--ink); }
.usage-watt span { font-size: .68rem; color: var(--ink-faint); }
.usage-slider-row { display: flex; align-items: center; gap: .8rem; }
.usage-slider-row input[type=range] { flex: 1; accent-color: var(--accent); }
.usage-val { font-family: 'IBM Plex Mono', monospace; font-size: .8rem; font-weight: 600; min-width: 5.5rem; text-align: right; }
```

- [x] **Step 2: Write `src/screens/add/steps/UsageStep.tsx`**

```tsx
import { DEVICE_CATALOG } from '../../../data/deviceCatalog';
import { ApplianceIcon } from '../../../components/ApplianceIcon';
import type { DeviceUsage } from '../../../lib/calc';

export interface UsageStepProps {
  selectedKeys: Set<string>;
  usageByKey: Map<string, DeviceUsage>;
  overridesByKey: Map<string, number>;
  onChange: (key: string, patch: Partial<DeviceUsage>) => void;
}

export function UsageStep({ selectedKeys, usageByKey, overridesByKey, onChange }: UsageStepProps) {
  const devices = DEVICE_CATALOG.filter((d) => selectedKeys.has(d.key));

  return (
    <div>
      {devices.map((device) => {
        const defaultWatt = overridesByKey.get(device.key) ?? device.defaultWatt;
        const usage = usageByKey.get(device.key) ?? { key: device.key, watt: defaultWatt, hoursPerWeek: 0 };
        return (
          <div className="usage-row" key={device.key}>
            <div className="usage-top">
              <div className="usage-icon"><ApplianceIcon iconKey={device.iconKey} size={17} /></div>
              <div className="usage-name">{device.name}</div>
              <div className="usage-watt">
                <input
                  type="number"
                  value={usage.watt}
                  onChange={(e) => onChange(device.key, { watt: Number(e.target.value) })}
                />
                <span>W</span>
              </div>
            </div>
            <div className="usage-slider-row">
              <input
                type="range"
                min={0}
                max={168}
                step={0.5}
                value={usage.hoursPerWeek}
                onChange={(e) => onChange(device.key, { hoursPerWeek: Number(e.target.value) })}
              />
              <span className="usage-val mono">{usage.hoursPerWeek.toFixed(1)} sa/hafta</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [x] **Step 3: Wire the step into `src/screens/add/AddFlow.tsx`**

Add import:
```tsx
import { useEffect } from 'react';
import { UsageStep } from './steps/UsageStep';
import type { DeviceUsage } from '../../lib/calc';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import { supabase } from '../../lib/supabaseClient';
```

Add state (after `toggleDevice`) — `deviceOverrides` holds the user's previously-saved watt values from `user_devices` (edited on the Profil screen in Task 19), so a device the user already personalized starts at their value instead of the catalog default:
```tsx
const [usageByKey, setUsageByKey] = useState<Map<string, DeviceUsage>>(new Map());
const [deviceOverrides, setDeviceOverrides] = useState<Map<string, number>>(new Map());

useEffect(() => {
  async function loadOverrides() {
    const { data } = await supabase.from('user_devices').select('device_key, watt').eq('is_custom', false);
    const overrides = new Map<string, number>();
    for (const row of data ?? []) {
      if (row.device_key) overrides.set(row.device_key, row.watt);
    }
    setDeviceOverrides(overrides);
  }
  loadOverrides();
}, []);

function updateUsage(key: string, patch: Partial<DeviceUsage>) {
  setUsageByKey((prev) => {
    const next = new Map(prev);
    const catalogEntry = DEVICE_CATALOG.find((d) => d.key === key)!;
    const defaultWatt = deviceOverrides.get(key) ?? catalogEntry.defaultWatt;
    const current = next.get(key) ?? { key, watt: defaultWatt, hoursPerWeek: 0 };
    next.set(key, { ...current, ...patch });
    return next;
  });
}
```

Add to the card body:
```tsx
{step === 2 && (
  <UsageStep
    selectedKeys={selectedDevices}
    usageByKey={usageByKey}
    overridesByKey={deviceOverrides}
    onChange={updateUsage}
  />
)}
```

- [x] **Step 4: Verify** — `npm run build` shows only the pre-existing Task 9 errors (missing `HomeScreen`/`HistoryScreen`/`HistoryDetailScreen`/`ProfileScreen`, expected until Tasks 15/17/18 add them); no errors reference `UsageStep` or `AddFlow`.

- [x] **Step 5: Commit**

```bash
git add src/screens/add/steps/UsageStep.tsx src/screens/add/AddFlow.css src/screens/add/AddFlow.tsx
git commit -m "feat: add Kullanım step to Add flow"
```

---

### Task 14: Add flow — Adım 4: Sonuç + Supabase'e kaydetme

**Files:**
- Create: `src/screens/add/steps/ResultStep.tsx`
- Modify: `src/screens/add/AddFlow.tsx`
- Modify: `src/screens/add/AddFlow.css`

- [x] **Step 1: Write `src/screens/add/steps/ResultStep.tsx`**

```tsx
import { useMemo } from 'react';
import { calculateBreakdown, type DeviceUsage } from '../../../lib/calc';
import { BillBreakdown } from '../../../components/BillBreakdown';
import { DEVICE_CATALOG } from '../../../data/deviceCatalog';

export interface ResultStepProps {
  billTl: number;
  ratePerKwh: number;
  devices: DeviceUsage[];
}

export function ResultStep({ billTl, ratePerKwh, devices }: ResultStepProps) {
  const result = useMemo(
    () => calculateBreakdown(devices, { billTl, ratePerKwh }),
    [devices, billTl, ratePerKwh]
  );

  const nameByKey = (key: string) => DEVICE_CATALOG.find((d) => d.key === key)?.name ?? key;
  const iconByKey = (key: string | null) => DEVICE_CATALOG.find((d) => d.key === key)?.iconKey ?? 'lighting';

  const insight =
    result.totalRawKwh === 0
      ? 'Hiç cihaz seçilmedi.'
      : result.calcRatio < 0.6
        ? `Girdiğin sürelere göre hesaplanan tüketim faturanın yalnızca %${Math.round(result.calcRatio * 100)}'i kadar — dağılım faturana göre orantılandı.`
        : result.calcRatio > 1.6
          ? `Girdiğin süreler faturandan çok daha yüksek bir tüketime işaret ediyor (%${Math.round(result.calcRatio * 100)}).`
          : `Hesaplanan tüketim faturanın %${Math.round(result.calcRatio * 100)}'i kadar çıktı.`;

  return (
    <div>
      <p className="add-insight">{insight}</p>
      <BillBreakdown
        totalTl={billTl}
        items={result.items.map((item) => ({
          deviceKey: item.key,
          deviceName: nameByKey(item.key),
          calibratedTl: item.calibratedTl,
          pctShare: item.pctShare,
        }))}
        iconKeyFor={iconByKey}
      />
    </div>
  );
}
```

- [x] **Step 2: Append insight styles to `src/screens/add/AddFlow.css`**

```css
.add-insight { background: var(--surface-sunken); border-radius: 11px; padding: .8rem .9rem; font-size: .82rem; color: var(--ink-muted); margin-bottom: 1.25rem; line-height: 1.5; }
```

- [x] **Step 3: Wire the step + save action into `src/screens/add/AddFlow.tsx`**

Add imports:
```tsx
import { ResultStep } from './steps/ResultStep';
import { supabase } from '../../lib/supabaseClient';
import { calculateBreakdown } from '../../lib/calc';
```

Add to the card body:
```tsx
{step === 3 && (
  <ResultStep billTl={bill.billTl} ratePerKwh={bill.ratePerKwh} devices={Array.from(usageByKey.values())} />
)}
```

Add a `saving` state and a `saveBill` function (after `updateUsage`):
```tsx
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState<string | null>(null);

async function saveBill() {
  setSaving(true);
  setSaveError(null);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    setSaveError('Oturum bulunamadı, tekrar giriş yap.');
    setSaving(false);
    return;
  }

  const devices = Array.from(usageByKey.values());
  const result = calculateBreakdown(devices, { billTl: bill.billTl, ratePerKwh: bill.ratePerKwh });
  const periodMonth = new Date();
  periodMonth.setDate(1);

  const { data: billRow, error: billError } = await supabase
    .from('bills')
    .insert({
      user_id: userId,
      period_month: periodMonth.toISOString().slice(0, 10),
      total_tl: bill.billTl,
      rate_tl_per_kwh: bill.ratePerKwh,
    })
    .select()
    .single();

  if (billError || !billRow) {
    setSaveError('Fatura kaydedilemedi, tekrar dene.');
    setSaving(false);
    return;
  }

  const catalogByKey = new Map(DEVICE_CATALOG.map((d) => [d.key, d]));
  const itemRows = result.items.map((item) => ({
    bill_id: billRow.id,
    device_key: item.key,
    device_name: catalogByKey.get(item.key)?.name ?? item.key,
    watt: devices.find((d) => d.key === item.key)!.watt,
    hours_per_week: devices.find((d) => d.key === item.key)!.hoursPerWeek,
    monthly_kwh_raw: item.monthlyKwhRaw,
    calibrated_tl: item.calibratedTl,
    pct_share: item.pctShare,
  }));

  const { error: itemsError } = await supabase.from('bill_items').insert(itemRows);

  if (itemsError) {
    setSaving(false);
    setSaveError('Cihaz kırılımı kaydedilemedi, tekrar dene.');
    return;
  }

  // Remember any watt values the user edited so the next Add flow starts from them.
  const overrideRows = devices
    .filter((d) => d.watt !== (deviceOverrides.get(d.key) ?? catalogByKey.get(d.key)?.defaultWatt))
    .map((d) => ({ user_id: userId, device_key: d.key, watt: d.watt, is_custom: false }));

  if (overrideRows.length > 0) {
    await supabase.from('user_devices').upsert(overrideRows, { onConflict: 'user_id,device_key' });
  }

  setSaving(false);
  navigate('/');
}
```

Replace the final "Devam et" button so step 3 saves instead of advancing:
```tsx
{step < STEP_LABELS.length - 1 ? (
  <button
    className="add-btn add-btn-primary"
    disabled={(step === 0 && bill.billTl <= 0) || (step === 1 && selectedDevices.size === 0)}
    onClick={() => setStep(step + 1)}
  >
    Devam et
  </button>
) : (
  <button className="add-btn add-btn-primary" disabled={saving} onClick={saveBill}>
    {saving ? 'Kaydediliyor...' : 'Kaydet'}
  </button>
)}
```

Add the error message just above `</div>` closing `.add-shell`:
```tsx
{saveError && <p className="login-error">{saveError}</p>}
```

- [x] **Step 4: Verify** — `npm run build` shows only the pre-existing errors (missing `HomeScreen`/`HistoryScreen`/`HistoryDetailScreen`/`ProfileScreen`, expected until Tasks 17–19); no errors reference `ResultStep` or `AddFlow`.

- [x] **Step 5: Commit**

```bash
git add src/screens/add/steps/ResultStep.tsx src/screens/add/AddFlow.tsx src/screens/add/AddFlow.css
git commit -m "feat: add Sonuç step and Supabase save to Add flow"
```

---

### Task 15: Supabase Edge Function — extract-bill (Claude Vision)

**Files:**
- Create: `supabase/functions/extract-bill/index.ts`

- [x] **Step 1: Write `supabase/functions/extract-bill/index.ts`**

```ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ExtractedBill {
  toplam_tutar: number | null;
  birim_fiyat: number | null;
  kwh: number | null;
  donem_baslangic: string | null;
  donem_bitis: string | null;
}

serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'missing_auth' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401 });
  }

  const { imageBase64, mediaType } = await req.json();
  if (!imageBase64 || !mediaType) {
    return new Response(JSON.stringify({ error: 'missing_image' }), { status: 400 });
  }

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            {
              type: 'text',
              text:
                'Bu bir Türkiye elektrik faturası fotoğrafı. Şu alanları JSON olarak çıkar: ' +
                '{"toplam_tutar": number|null, "birim_fiyat": number|null, "kwh": number|null, ' +
                '"donem_baslangic": "YYYY-MM-DD"|null, "donem_bitis": "YYYY-MM-DD"|null}. ' +
                'Emin olmadığın alanı null bırak. Sadece JSON döndür, başka metin ekleme.',
            },
          ],
        },
      ],
    }),
  });

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text();
    return new Response(JSON.stringify({ error: 'vision_request_failed', detail }), { status: 502 });
  }

  const anthropicJson = await anthropicRes.json();
  const rawText: string = anthropicJson.content?.[0]?.text ?? '{}';

  let extracted: ExtractedBill;
  try {
    extracted = JSON.parse(rawText);
  } catch {
    return new Response(JSON.stringify({ error: 'parse_failed', raw: rawText }), { status: 502 });
  }

  return new Response(JSON.stringify(extracted), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
```

- [x] **Step 2: Deploy and configure secrets** — Deployed 2026-08-20 via Supabase MCP to the new `watt-payi` project (`vwdgadvnatgjkmhikuax`), created after temporarily pausing `flort-asistan` to free a slot under the account's 2-project free-tier limit. Function is `ACTIVE`. `ANTHROPIC_API_KEY` secret added by the user directly via the Supabase Dashboard (Project Settings → Edge Functions → Secrets) on 2026-08-20.

- [x] **Step 3: Smoke-test with curl** — Partial: confirmed the deployed function is live and its auth guard works — a request with no `Authorization` header returned `401` as expected (`curl -o /dev/null -w "%{http_code}" -X POST https://vwdgadvnatgjkmhikuax.functions.supabase.co/extract-bill -d '{}'`). Full end-to-end test (real user JWT + real bill photo → `200` with parsed fields) needs a logged-in session and is deferred to Task 21's on-device manual test, since getting a JWT here requires completing the email OTP flow. To run it manually once signed in on-device:

```bash
curl -X POST "https://<project-ref>.functions.supabase.co/extract-bill" \
  -H "Authorization: Bearer <anon-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"<base64>","mediaType":"image/jpeg"}'
```
Expected: `200` with a JSON body containing `toplam_tutar` (or `null` if the model wasn't confident).

- [x] **Step 4: Commit**

```bash
git add supabase/functions/extract-bill/index.ts
git commit -m "feat: add extract-bill Edge Function using Claude Vision"
```

---

### Task 16: Fotoğraf çekme entegrasyonu (Adım 1)

**Files:**
- Create: `src/lib/billExtraction.ts`
- Modify: `src/screens/add/steps/BillStep.tsx`
- Modify: `src/screens/add/AddFlow.css`

- [x] **Step 1: Write `src/lib/billExtraction.ts`**

```ts
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { supabase } from './supabaseClient';

export interface ExtractedBillFields {
  toplam_tutar: number | null;
  birim_fiyat: number | null;
  kwh: number | null;
  donem_baslangic: string | null;
  donem_bitis: string | null;
}

export async function captureBillPhoto(): Promise<{ base64: string; mediaType: string } | null> {
  const photo = await Camera.getPhoto({
    resultType: CameraResultType.Base64,
    source: CameraSource.Prompt,
    quality: 80,
  });
  if (!photo.base64String) return null;
  const mediaType = photo.format === 'png' ? 'image/png' : 'image/jpeg';
  return { base64: photo.base64String, mediaType };
}

export async function extractBillFromPhoto(base64: string, mediaType: string): Promise<ExtractedBillFields> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('not_authenticated');

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-bill`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ imageBase64: base64, mediaType }),
  });

  if (!res.ok) throw new Error('extract_failed');
  return res.json();
}
```

- [x] **Step 2: Add the capture button + error state to `src/screens/add/steps/BillStep.tsx`**

```tsx
import { useState } from 'react';
import { captureBillPhoto, extractBillFromPhoto } from '../../../lib/billExtraction';

export interface BillStepValue {
  billTl: number;
  ratePerKwh: number;
}

export interface BillStepProps {
  value: BillStepValue;
  onChange: (value: BillStepValue) => void;
}

export function BillStep({ value, onChange }: BillStepProps) {
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  async function handleCapture() {
    setReadError(null);
    setReading(true);
    try {
      const photo = await captureBillPhoto();
      if (!photo) {
        setReading(false);
        return;
      }
      const extracted = await extractBillFromPhoto(photo.base64, photo.mediaType);
      onChange({
        billTl: extracted.toplam_tutar ?? value.billTl,
        ratePerKwh: extracted.birim_fiyat ?? value.ratePerKwh,
      });
      if (extracted.toplam_tutar === null) {
        setReadError('Tutarı okuyamadık, elle girebilir misin?');
      }
    } catch {
      setReadError('Fotoğraf işlenemedi, elle girebilir misin?');
    } finally {
      setReading(false);
    }
  }

  return (
    <div>
      <button type="button" className="add-photo-btn" onClick={handleCapture} disabled={reading}>
        {reading ? 'Okunuyor...' : '📷 Fatura fotoğrafı çek'}
      </button>
      {readError && <p className="login-error">{readError}</p>}

      <div className="add-field">
        <label htmlFor="billTl">Aylık fatura tutarı</label>
        <div className="add-amount">
          <input
            id="billTl"
            type="number"
            min={0}
            value={value.billTl || ''}
            onChange={(e) => onChange({ ...value, billTl: Number(e.target.value) })}
            placeholder="2000"
          />
          <span className="unit">TL</span>
        </div>
      </div>
      <div className="add-field">
        <label htmlFor="rate">Birim fiyat</label>
        <div className="add-amount">
          <input
            id="rate"
            type="number"
            min={0.1}
            step={0.1}
            value={value.ratePerKwh || ''}
            onChange={(e) => onChange({ ...value, ratePerKwh: Number(e.target.value) })}
          />
          <span className="unit">TL / kWh</span>
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 3: Verify** — `npm run build` shows only pre-existing pending-screen errors (`HomeScreen`/`HistoryScreen`/`HistoryDetailScreen`/`ProfileScreen`, expected until Tasks 17–19); no errors reference `BillStep` or `billExtraction`. Manual check happens once the app is running on a device (Task 21) since `Camera.getPhoto` needs a native/browser camera permission prompt.

- [x] **Step 4: Commit**

```bash
git add src/lib/billExtraction.ts src/screens/add/steps/BillStep.tsx
git commit -m "feat: wire bill-photo capture and Claude Vision extraction into Fatura step"
```

---

### Task 17: Ana Sayfa

**Files:**
- Create: `src/screens/home/HomeScreen.tsx`
- Create: `src/screens/home/HomeScreen.css`

- [x] **Step 1: Write `src/screens/home/HomeScreen.css`**

```css
.home-shell { max-width: 640px; margin: 0 auto; padding: 1.5rem 1.25rem 6rem; }
.home-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem; }
.home-delta { font-size: .82rem; font-weight: 700; }
.home-delta.down { color: var(--good); }
.home-delta.up { color: var(--coral); }
.home-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); padding: 1.5rem; }
.home-empty { text-align: center; color: var(--ink-muted); padding: 3rem 1rem; }
.home-empty a { display: inline-block; margin-top: 1rem; background: var(--accent); color: #fff; padding: .75rem 1.25rem; border-radius: 11px; font-weight: 700; text-decoration: none; }
```

- [x] **Step 2: Write `src/screens/home/HomeScreen.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { BillBreakdown } from '../../components/BillBreakdown';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import type { Bill, BillItem } from '../../types/domain';
import './HomeScreen.css';

export function HomeScreen() {
  const [latestBill, setLatestBill] = useState<Bill | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [previousTotal, setPreviousTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: bills } = await supabase
        .from('bills')
        .select('id, period_month, total_tl, rate_tl_per_kwh, photo_url')
        .order('period_month', { ascending: false })
        .limit(2);

      if (bills && bills.length > 0) {
        const [latest, previous] = bills;
        setLatestBill({
          id: latest.id,
          periodMonth: latest.period_month,
          totalTl: latest.total_tl,
          rateTlPerKwh: latest.rate_tl_per_kwh,
          photoUrl: latest.photo_url,
        });
        setPreviousTotal(previous ? previous.total_tl : null);

        const { data: billItems } = await supabase
          .from('bill_items')
          .select('id, device_key, device_name, watt, hours_per_week, monthly_kwh_raw, calibrated_tl, pct_share')
          .eq('bill_id', latest.id);

        setItems(
          (billItems ?? []).map((row) => ({
            id: row.id,
            deviceKey: row.device_key,
            deviceName: row.device_name,
            watt: row.watt,
            hoursPerWeek: row.hours_per_week,
            monthlyKwhRaw: row.monthly_kwh_raw,
            calibratedTl: row.calibrated_tl,
            pctShare: row.pct_share,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  const iconByKey = (key: string | null) => DEVICE_CATALOG.find((d) => d.key === key)?.iconKey ?? 'lighting';

  if (loading) return null;

  if (!latestBill) {
    return (
      <div className="home-shell">
        <div className="home-empty">
          <p>Henüz bir fatura eklemedin.</p>
          <Link to="/add">+ İlk faturanı ekle</Link>
        </div>
      </div>
    );
  }

  const delta = previousTotal ? ((latestBill.totalTl - previousTotal) / previousTotal) * 100 : null;

  return (
    <div className="home-shell">
      <div className="home-header">
        <h1 className="display">Bu Ay</h1>
        {delta !== null && (
          <span className={'home-delta ' + (delta <= 0 ? 'down' : 'up')}>
            {delta <= 0 ? '↓' : '↑'} %{Math.abs(delta).toFixed(0)}
          </span>
        )}
      </div>
      <div className="home-card">
        <BillBreakdown totalTl={latestBill.totalTl} items={items} iconKeyFor={iconByKey} />
      </div>
    </div>
  );
}
```

- [x] **Step 3: Verify** — `npm run build` shows only pre-existing pending-screen errors (`HistoryScreen`/`HistoryDetailScreen`/`ProfileScreen`, expected until Tasks 18–19); no errors reference `HomeScreen`.

- [x] **Step 4: Commit**

```bash
git add src/screens/home/HomeScreen.tsx src/screens/home/HomeScreen.css
git commit -m "feat: add Ana Sayfa dashboard"
```

---

### Task 18: Geçmiş listesi + detay ekranı

**Files:**
- Create: `src/screens/history/HistoryScreen.tsx`
- Create: `src/screens/history/HistoryDetailScreen.tsx`
- Create: `src/screens/history/HistoryScreen.css`

- [x] **Step 1: Write `src/screens/history/HistoryScreen.css`**

```css
.history-shell { max-width: 640px; margin: 0 auto; padding: 1.5rem 1.25rem 6rem; }
.history-list { display: flex; flex-direction: column; gap: .6rem; }
.history-row {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--surface); border: 1px solid var(--line); border-radius: 13px;
  padding: 1rem 1.1rem; text-decoration: none; color: var(--ink);
}
.history-row .month { font-weight: 700; font-size: .88rem; }
.history-row .amount { font-family: 'IBM Plex Mono', monospace; font-weight: 600; }
.history-insight {
  background: var(--good-soft); color: var(--good); border-radius: 12px;
  padding: .8rem 1rem; margin-bottom: 1.2rem; font-size: .82rem; font-weight: 600;
}
.history-back { display: inline-block; margin-bottom: 1rem; color: var(--ink-muted); text-decoration: none; font-size: .85rem; }
```

- [x] **Step 2: Write `src/screens/history/HistoryScreen.tsx`** (list + rising-device insight banner)

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { detectRisingDevices, type BillWithItems } from '../../lib/trends';
import './HistoryScreen.css';

interface BillRow {
  id: string;
  period_month: string;
  total_tl: number;
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function formatPeriod(iso: string) {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function HistoryScreen() {
  const [bills, setBills] = useState<BillRow[]>([]);
  const [rising, setRising] = useState<{ deviceName: string; months: number }[]>([]);

  useEffect(() => {
    async function load() {
      const { data: billRows } = await supabase
        .from('bills')
        .select('id, period_month, total_tl')
        .order('period_month', { ascending: false });

      setBills(billRows ?? []);

      if (billRows && billRows.length >= 3) {
        const { data: itemRows } = await supabase
          .from('bill_items')
          .select('bill_id, device_key, device_name, calibrated_tl')
          .in('bill_id', billRows.map((b) => b.id));

        const billsWithItems: BillWithItems[] = billRows.map((b) => ({
          periodMonth: b.period_month,
          items: (itemRows ?? [])
            .filter((i) => i.bill_id === b.id)
            .map((i) => ({ deviceKey: i.device_key, deviceName: i.device_name, calibratedTl: i.calibrated_tl })),
        }));

        setRising(detectRisingDevices(billsWithItems));
      }
    }
    load();
  }, []);

  return (
    <div className="history-shell">
      <h1 className="display">Geçmiş</h1>

      {rising.length > 0 && (
        <div className="history-insight">
          {rising.map((r) => `${r.deviceName} ${r.months} aydır artıyor`).join(' · ')}
        </div>
      )}

      <div className="history-list">
        {bills.map((bill) => (
          <Link key={bill.id} to={`/history/${bill.id}`} className="history-row">
            <span className="month">{formatPeriod(bill.period_month)}</span>
            <span className="amount mono">{Math.round(bill.total_tl).toLocaleString('tr-TR')} TL</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 3: Write `src/screens/history/HistoryDetailScreen.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { BillBreakdown } from '../../components/BillBreakdown';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import type { BillItem } from '../../types/domain';
import './HistoryScreen.css';

export function HistoryDetailScreen() {
  const { billId } = useParams<{ billId: string }>();
  const [totalTl, setTotalTl] = useState(0);
  const [items, setItems] = useState<BillItem[]>([]);

  useEffect(() => {
    async function load() {
      if (!billId) return;
      const { data: bill } = await supabase.from('bills').select('total_tl').eq('id', billId).single();
      if (bill) setTotalTl(bill.total_tl);

      const { data: billItems } = await supabase
        .from('bill_items')
        .select('id, device_key, device_name, watt, hours_per_week, monthly_kwh_raw, calibrated_tl, pct_share')
        .eq('bill_id', billId);

      setItems(
        (billItems ?? []).map((row) => ({
          id: row.id,
          deviceKey: row.device_key,
          deviceName: row.device_name,
          watt: row.watt,
          hoursPerWeek: row.hours_per_week,
          monthlyKwhRaw: row.monthly_kwh_raw,
          calibratedTl: row.calibrated_tl,
          pctShare: row.pct_share,
        }))
      );
    }
    load();
  }, [billId]);

  const iconByKey = (key: string | null) => DEVICE_CATALOG.find((d) => d.key === key)?.iconKey ?? 'lighting';

  return (
    <div className="history-shell">
      <Link to="/history" className="history-back">← Geçmiş</Link>
      <div className="home-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '1.5rem' }}>
        <BillBreakdown totalTl={totalTl} items={items} iconKeyFor={iconByKey} />
      </div>
    </div>
  );
}
```

- [x] **Step 4: Verify** — `npm run build` shows only the `ProfileScreen` missing-module error (expected until Task 19); no errors reference `HomeScreen`, `AddFlow`, `HistoryScreen`, or `HistoryDetailScreen`.

- [x] **Step 5: Commit**

```bash
git add src/screens/history/HistoryScreen.tsx src/screens/history/HistoryDetailScreen.tsx src/screens/history/HistoryScreen.css
git commit -m "feat: add Geçmiş list, detail screen, and rising-device insight"
```

---

### Task 19: Profil ekranı

**Files:**
- Create: `src/screens/profile/ProfileScreen.tsx`
- Create: `src/screens/profile/ProfileScreen.css`

- [x] **Step 1: Write `src/screens/profile/ProfileScreen.css`**

```css
.profile-shell { max-width: 640px; margin: 0 auto; padding: 1.5rem 1.25rem 6rem; }
.profile-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 1.5rem; margin-bottom: 1rem; }
.profile-field { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.profile-field input { width: 4rem; text-align: center; border: 1.5px solid var(--line); border-radius: 8px; padding: .4rem; font-family: 'IBM Plex Mono', monospace; background: var(--surface-sunken); color: var(--ink); }
.profile-signout { width: 100%; border: 1.5px solid var(--coral); color: var(--coral); background: transparent; border-radius: 11px; padding: .8rem; font-weight: 700; cursor: pointer; }
.profile-device-row { display: flex; align-items: center; gap: .6rem; padding: .6rem 0; border-bottom: 1px solid var(--line); }
.profile-device-row:last-child { border-bottom: 0; }
.profile-device-row span { flex: 1; font-size: .85rem; font-weight: 600; }
.profile-device-row input { width: 4.5rem; text-align: right; border: 1.5px solid var(--line); border-radius: 8px; padding: .35rem .5rem; font-family: 'IBM Plex Mono', monospace; background: var(--surface-sunken); color: var(--ink); }
```

- [x] **Step 2: Write `src/screens/profile/ProfileScreen.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { scheduleMonthlyReminder } from '../../lib/notifications';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import './ProfileScreen.css';

export function ProfileScreen() {
  const [reminderDay, setReminderDay] = useState(5);
  const [email, setEmail] = useState('');
  const [watts, setWatts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      setEmail(userData.user?.email ?? '');
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('reminder_day')
        .eq('id', userData.user.id)
        .single();
      if (profile) setReminderDay(profile.reminder_day);

      const { data: overrides } = await supabase
        .from('user_devices')
        .select('device_key, watt')
        .eq('is_custom', false);
      const map = new Map<string, number>();
      for (const row of overrides ?? []) {
        if (row.device_key) map.set(row.device_key, row.watt);
      }
      setWatts(map);
    }
    load();
  }, []);

  async function saveReminderDay(day: number) {
    setReminderDay(day);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('profiles').upsert({ id: userData.user.id, reminder_day: day });
    await scheduleMonthlyReminder(day);
  }

  async function saveWatt(deviceKey: string, watt: number) {
    setWatts((prev) => new Map(prev).set(deviceKey, watt));
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase
      .from('user_devices')
      .upsert(
        { user_id: userData.user.id, device_key: deviceKey, watt, is_custom: false },
        { onConflict: 'user_id,device_key' }
      );
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="profile-shell">
      <h1 className="display">Profil</h1>
      <div className="profile-card">
        <div className="profile-field">
          <span>Hesap</span>
          <span className="mono">{email}</span>
        </div>
        <div className="profile-field">
          <span>Ayın kaçında hatırlat</span>
          <input
            type="number"
            min={1}
            max={28}
            value={reminderDay}
            onChange={(e) => saveReminderDay(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="profile-card">
        <h3>Varsayılan watt değerleri</h3>
        {DEVICE_CATALOG.map((device) => (
          <div className="profile-device-row" key={device.key}>
            <span>{device.name}</span>
            <input
              type="number"
              value={watts.get(device.key) ?? device.defaultWatt}
              onChange={(e) => saveWatt(device.key, Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      <button className="profile-signout" onClick={signOut}>Çıkış yap</button>
    </div>
  );
}
```

- [x] **Step 3: Verify** — as expected, build failed on missing `src/lib/notifications.ts` until Task 20 landed; confirmed resolved in Task 20's full-project build.

- [x] **Step 4: Commit**

```bash
git add src/screens/profile/ProfileScreen.tsx src/screens/profile/ProfileScreen.css
git commit -m "feat: add Profil screen with reminder-day setting and sign out"
```

---

### Task 20: Yerel bildirimler

**Files:**
- Create: `src/lib/notifications.ts`

- [x] **Step 1: Write `src/lib/notifications.ts`**

```ts
import { LocalNotifications } from '@capacitor/local-notifications';

const REMINDER_NOTIFICATION_ID = 1001;

export async function scheduleMonthlyReminder(dayOfMonth: number): Promise<void> {
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') {
    const requested = await LocalNotifications.requestPermissions();
    if (requested.display !== 'granted') return;
  }

  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_NOTIFICATION_ID }] });

  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_NOTIFICATION_ID,
        title: 'Watt Payı',
        body: 'Bu ayın faturasını eklemeyi unutma.',
        schedule: {
          on: { day: dayOfMonth, hour: 10, minute: 0 },
          repeats: true,
        },
      },
    ],
  });
}
```

- [x] **Step 2: Verify** — `npm run build` succeeds with no TypeScript errors: first clean full-project build. `npm run test` also passes (6/6 tests).

- [x] **Step 3: Commit**

```bash
git add src/lib/notifications.ts
git commit -m "feat: schedule monthly local-notification reminder"
```

---

### Task 21: Android derleme + gerçek cihazda test

**Files:**
- No new source files — Capacitor generates the `android/` directory (gitignored).

- [x] **Step 1: Add the Android platform** — done: `npm run build`, `npx cap add android`, `npx cap sync android` all succeeded; `android/` directory created (gitignored, nothing to commit).

- [ ] **Step 2: Run on a connected device via adb** — BLOCKED: `adb devices` shows no connected device. Android SDK and adb are installed (`C:\Users\cebem\AppData\Local\Android\Sdk`), so once a device is plugged in with USB debugging enabled, run `npx cap run android`.

- [ ] **Step 3: Manual end-to-end check on the device** — BLOCKED on Step 2 (needs the app actually running on a device).

- Log in with email OTP
- Tap **+ Ekle**, capture a real bill photo, confirm the amount prefills (or the fallback message appears if unreadable)
- Select 2–3 devices, adjust usage sliders, save
- Confirm the new bill appears on **Ana Sayfa** and in **Geçmiş**
- In **Profil**, set a reminder day and confirm the OS notification-permission prompt appears

Note: Steps 2–3 also depend on Tasks 5/15 being unblocked (a live Supabase project + deployed Edge Function) since login, saving bills, and photo extraction all call Supabase.

- [ ] **Step 4: Commit** (only if any fixes were needed during manual testing; otherwise this task has no code change to commit)

```bash
git add -A
git commit -m "fix: address issues found during on-device Android testing"
```
