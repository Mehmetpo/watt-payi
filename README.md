# Watt Payı

**Status:** closed beta on iOS and Android.

Watt Payı ("each appliance's share") is a Turkish-language mobile app that answers a simple question: *which of my appliances is driving my electricity bill?* You photograph the bill, pick the appliances you own and roughly how much you use them, and the app splits the total into a per-appliance cost. The estimates get more accurate with every bill you add.

## How it works

1. **Read the bill.** The camera photo goes to a Supabase Edge Function, which sends it to Claude and gets back the total, unit price, kWh and billing period as structured data.
2. **Describe the home.** You pick appliances from a catalog and adjust wattage and weekly hours. Your overrides are saved and pre-filled next month.
3. **Split the bill.** `calculateBreakdown()` turns watt × hours into kWh per appliance and allocates the bill. If your appliances add up to less than the bill, the rest stays as an honest "other" bucket instead of being spread around. If they add up to more, everything is scaled down proportionally.
4. **Learn from history.** `learnDeviceCorrections()` fits a correction factor per appliance from your last 12 bills using ridge-regularized coordinate descent with exponential recency weighting. An appliance you keep over- or under-estimating gets nudged toward reality over time.
5. **Suggest a saving.** After a bill is saved, a second Edge Function asks the model for one concrete saving tip for your most expensive appliance. It runs in the background and never blocks the save.

## Engineering notes

- **One codebase, two app stores.** React and TypeScript wrapped with Capacitor for iOS and Android. Native features (camera, secure storage, local notifications, share sheet) go through Capacitor plugins.
- **Native-friendly auth.** Supabase sessions are stored in a Capacitor Preferences adapter instead of `localStorage`, and password reset arrives through a deep link into the app.
- **Row-level security on every table.** Bills, bill items, appliances and profiles are readable and writable only by their owner. Bill photos live in a private storage bucket scoped to the user's folder.
- **Abuse limits on the AI endpoints.** Both Edge Functions verify the user's token and enforce a per-user daily limit plus a per-IP limit, so new accounts can't multiply the paid model calls. Image uploads are validated for type and size before anything reaches the model.
- **Automated native builds.** Codemagic builds and signs the iOS app from `codemagic.yaml`.

## Tech stack

| Layer | Choice |
|---|---|
| App | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Native | Capacitor 8 (iOS and Android) |
| Backend | Supabase: Postgres with RLS, Auth, Storage, Edge Functions (Deno) |
| AI | Claude API for bill reading and saving tips |
| Bot protection | Cloudflare Turnstile |
| CI / release | Codemagic |
| Tests | Vitest |

## Project layout

```
src/lib/                 domain logic: bill split, calibration, trends, bill extraction client
src/screens/add/         the 4-step "add a bill" wizard
src/screens/             home, history, profile, auth
supabase/functions/      extract-bill, suggest-tip, delete-account (+ shared rate limiting)
supabase/migrations/     schema and RLS policies
android/, ios/           Capacitor native projects
```

## Running locally

```bash
npm install
cp .env.example .env.local   # Supabase URL + anon key, Turnstile site key
npm run dev                  # web preview at http://localhost:5173
npm run test                 # Vitest
npm run build                # type check + production build
```

Native shells: `npx cap sync android && npx cap open android` (or `ios`).

## License

Copyright © 2026 Mehmet Cebe. All rights reserved.

The source is public so people can read and review it. It is not open source: you may not copy, modify, distribute or publish this code or app, or use it in another product, without written permission.
