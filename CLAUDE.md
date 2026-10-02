# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Watt Payı ("Watt's Share") — a Turkish-language mobile app that lets a household photograph its
electricity bill, pick which appliances they own, and see an estimated per-device breakdown of
the bill. React 18 + Vite + TypeScript, wrapped for Android/iOS via Capacitor 8, backed by
Supabase (Postgres + Auth + Edge Functions + Storage).

## Commands

```bash
npm run dev          # vite dev server (also runnable via the "watt-payi-dev" launch config, port 5173)
npm run build         # tsc -b && vite build — do this before trusting any TS change
npm run preview       # preview the production build
npm run test          # vitest run (single pass)
npm run test:watch    # vitest watch mode
```

Run a single test file: `npx vitest run src/lib/calc.test.ts`

There is no lint script configured — rely on `tsc -b` (via `npm run build`) for type safety.

Capacitor native shells: `android/` and `ios/` are both checked in (`npx cap sync android|ios`,
`npx cap open android|ios`); Codemagic builds the iOS release from `codemagic.yaml`.

All tests pass on `main` (38/38 as of 2026-10-02); the earlier failing proportional-allocation
assertion in `src/lib/calc.test.ts` is fixed.

## Environment

Copy `.env.example` to `.env.local` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
Supabase project functions/migrations live in `supabase/` (see below) but are managed via the
Supabase MCP tools / dashboard, not via a local Supabase CLI workflow in this repo.

## Architecture

### Auth-gated single shell

[App.tsx](src/App.tsx) has no public routes. `AuthProvider` ([AuthContext.tsx](src/contexts/AuthContext.tsx))
resolves a Supabase session before anything renders; `AuthedShell` shows `LoginScreen`,
`ResetPasswordScreen` (password-recovery deep link), or the real `Routes` + `BottomNav` tree.
Password-reset arrives via a Capacitor `appUrlOpen` deep link
(`com.mehmetcebe.wattpayi://login-callback#access_token=...&type=recovery`) parsed in
`AuthContext`'s `handleAuthDeepLink`, not through a normal web route.

Session storage uses a custom Capacitor `Preferences`-backed adapter
([supabaseClient.ts](src/lib/supabaseClient.ts)) instead of `localStorage`, since this runs inside
a native WebView.

### The core domain calculation (`src/lib/`)

This is the part of the app most worth understanding before touching bill/device logic:

- **[calc.ts](src/lib/calc.ts)** — `calculateBreakdown()` splits one bill's TL total across the
  user's selected devices for that month, given each device's watt/hours-per-week. If tracked
  devices imply less kWh than the bill (`calcRatio < 1`), the shortfall is left as an untracked
  "other" bucket rather than force-distributed; if they imply more (hours overestimated),
  everything is scaled down proportionally instead, since "other" can't go negative.
- **[learnCalibration.ts](src/lib/learnCalibration.ts)** — `learnDeviceCorrections()` fits a
  per-device correction *factor* from the user's bill history via ridge-regularized coordinate
  descent (closed-form per-device update, swept repeatedly until convergence), with exponential
  recency decay so recent bills dominate the fit. Output feeds back into `calculateBreakdown()` as
  `DeviceCorrection[]` so a device habitually under/over-estimated gets nudged toward reality over
  time. History must be passed newest-first.
- **[billExtraction.ts](src/lib/billExtraction.ts)** — takes a camera photo (via `@capacitor/camera`)
  and POSTs it to the `extract-bill` Supabase Edge Function, which OCRs/parses the bill total, unit
  rate, kWh, and period dates.
- **[trends.ts](src/lib/trends.ts)**, **[deviceDelta.ts](src/lib/deviceDelta.ts)** — month-over-month
  trend and per-device delta helpers used on Home/History.

### AddFlow: the 4-step bill wizard

[AddFlow.tsx](src/screens/add/AddFlow.tsx) drives `BillStep → DevicesStep → UsageStep → ResultStep`
([src/screens/add/steps/](src/screens/add/steps/)) as one component holding all wizard state (not
routed per-step). On reaching the result step it loads up to the last 12 bills
(`HISTORY_WINDOW`), runs `learnDeviceCorrections`, then `calculateBreakdown`, and `saveBill()`
writes one `bills` row + one `bill_items` row per device (plus an "Other" row when
`otherTl > 1`) and upserts any watt values the user overrode into `user_devices` so the next
Add flow starts from them. A best-effort `suggest-tip` Edge Function call (LLM-generated savings
tip for the priciest device) fires after save without blocking or failing it.

Step navigation is a `role="tablist"`: only steps `<= furthest-visited` are clickable/focusable,
enforced both via `disabled` and arrow-key handling — don't let a user jump ahead of data they
haven't entered.

### Data model (Supabase, see `supabase/migrations/`)

`profiles` (1:1 with `auth.users`, reminder day + budget), `devices_catalog` (public read-only
appliance reference data — wattages, Turkish names, icon keys), `user_devices` (per-user watt
overrides and custom devices, RLS-scoped), `bills` (one per user per `period_month`), `bill_items`
(per-device breakdown of a bill, `device_key` nullable for the "Other" pseudo-row). Every
user-owned table is RLS-scoped to `auth.uid()`. Bill photos live in the `bill-photos` storage
bucket under a per-user folder.

Edge Functions ([supabase/functions/](supabase/functions/)): `extract-bill` (OCR/parse a photo),
`suggest-tip` (LLM savings tip), `delete-account` (full account + data teardown, invoked from
ProfileScreen's delete flow).

### Styling: token-driven CSS, not a component library skin

Design tokens live in [tokens.css](src/styles/tokens.css) (`--accent`/`--coral`/`--good` +
`-soft`/`-strong` variants, `--ink*`, `--surface*`, `--chart-1..8`) with a `prefers-color-scheme`
dark override block. Comments in that file document *why* certain tokens (`--ink-faint`, `--coral`,
`--good`, `--accent-button`) are deliberately darkened/pinned off the raw brand hue — for WCAG
contrast reasons — don't "fix" them back to the brighter brand color.

Two conventions coexist and are both intentional:
- **`src/components/ui/*`** — shadcn-style atoms (`button`, `card`, `input`, `label`, `skeleton`,
  `slider`) built on `@base-ui/react` primitives (not Radix) + `class-variance-authority` + the
  `cn()` helper ([lib/utils.ts](src/lib/utils.ts): `clsx` + `tailwind-merge`).
- **Screen-level components** (`src/screens/**`, most of `src/components/*`) — each has a
  dedicated hand-written `.css` file using the token custom properties directly, `@keyframes`
  animations, and a `--i` stagger variable for list entrance animation, not Tailwind utility
  soup.

No `framer-motion` and no animation library — all motion is plain CSS transitions/`@keyframes`
gated behind `--dur-fast/base/slow` + `--ease-out` tokens, and every animated rule has a
`prefers-reduced-motion: reduce` fallback. Keep new animated UI consistent with this: don't
introduce a JS animation library for something CSS already handles elsewhere in the codebase.

Icons are `lucide-react` throughout — don't mix in another icon set.

### Routing/navigation shape

Bottom nav ([BottomNav.tsx](src/components/BottomNav.tsx)) is a fixed tab bar with a sliding pill
indicator (position measured via `getBoundingClientRect` in a `useLayoutEffect`) and a raised
center FAB linking to `/add` that is not one of the tracked tabs. `BottomNav` renders as a sibling
of `<Routes>` in `AuthedShell`, so it stays visible on every route including `/add` — it doesn't
hide itself inside the wizard. Screens: `/` (Home), `/history` + `/history/:billId` (list + detail),
`/profile`, `/add` (wizard).

## Product/UX conventions worth preserving

- All user-facing copy is Turkish.
- 21st.dev (when used) is a *pattern/interaction* reference only, never a visual-style reference —
  rebuild ideas using this app's own token/CSS conventions rather than importing the source's
  dependencies (framer-motion, Radix, HeroUI, etc. do not belong in this codebase).
- When the user wants to pull a component from 21st.dev, use the **`get_component`** tool
  (21st.dev's MCP server is named **magic** in this environment) — **never** use the `generate` tool.
- Destructive actions (account deletion) use a two-step reveal (link → confirm panel with a
  cancel escape hatch) plus a press-and-hold confirm button
  ([HoldToConfirmButton.tsx](src/components/HoldToConfirmButton.tsx)), not a single tap.
