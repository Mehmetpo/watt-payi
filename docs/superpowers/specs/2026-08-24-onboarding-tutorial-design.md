# Onboarding Tutorial — Design

**Date:** 2026-08-24
**Status:** Approved

*(Note: written in English per the user's standing rule that all Markdown files use English regardless of conversation language — unlike the three earlier specs in this directory, which predate that rule being applied consistently.)*

## Context

watt-payi has no first-run explanation of what the app does or how the 4-step bill wizard
works. A new user lands directly on an empty [HomeScreen](../../../src/screens/home/HomeScreen.tsx)
right after login with zero guidance.

The user picked a specific reference: 21st.dev's "Onboarding Dialog" component (multi-step
modal, carousel navigation, animated progress dots, cross-fading content, Back/Skip/Next→Get
Started footer) and asked for it "100% identical." Per this project's standing convention (no
framer-motion, no animation library — see [CLAUDE.md](../../../CLAUDE.md)), the reference's
`motion/react` + `embla-carousel-react` implementation is rebuilt using plain CSS
transitions/`@keyframes` gated by the project's existing `--dur-*`/`--ease-out` tokens. The
layout, structure, and interaction pattern are preserved exactly — only the animation engine
changes, plus the demo's placeholder gradient art and English copy are swapped for
watt-payi's own token colors and real Turkish product content.

## Scope

- A 4-slide onboarding dialog mapped 1:1 to the [AddFlow](../../../src/screens/add/AddFlow.tsx)
  wizard's real steps, shown as a modal overlay.
- Shown automatically once, right after a user's first successful login.
- Replayable anytime from [ProfileScreen](../../../src/screens/profile/ProfileScreen.tsx) via
  a "Tanıtımı Tekrar İzle" button.
- No swipe/carousel gesture library — Back/Next buttons drive the active slide, consistent
  with AddFlow itself (which also has no swipe-between-steps gesture).
- No new npm dependencies. No `framer-motion`/`motion`, no `embla-carousel-react`.

## Slide content

Approved via a visual-companion mockup (gradient tile + centered white icon badge, recolored
from the demo's own palette to watt-payi's tokens):

| # | Title (tr) | Description (tr) | Tile color token | Icon (lucide-react) |
|---|---|---|---|---|
| 1 | watt-payi'ye hoş geldin | Elektrik faturanı cihazlarına göre otomatik olarak bölüştürüp, evindeki gerçek tüketim dağılımını gösterir. | `--accent` | `User` |
| 2 | Faturanı fotoğrafla | Elektrik faturanın fotoğrafını çek, tutarı ve dönemi biz senin için okuyalım — elle girmene gerek kalmasın. | `--chart-4` (amber) | `Camera` |
| 3 | Cihazlarını seç | Evindeki buzdolabı, klima, çamaşır makinesi gibi cihazları işaretle, biz saatlik kullanımına göre payını hesaplayalım. | `--chart-5` (blue) | `Zap` |
| 4 | Harcamanı gör | Hangi cihaz ne kadar tüketiyor, grafikte gör — ve tasarruf için kişisel önerini al. | `--good` (teal) | `PieChart` |

Each tile is a 135° gradient (token color → a lighter tint of it) in a 16:10 rounded rect,
with a centered white circular badge holding the slide's icon.

## Architecture

### New: `src/contexts/OnboardingContext.tsx`

Mirrors [AuthContext](../../../src/contexts/AuthContext.tsx)'s shape and pattern.

```ts
interface OnboardingContextValue {
  loading: boolean;    // still reading the Preferences flag
  open: boolean;       // dialog currently visible
  show: () => void;    // force-open (used by the replay button)
  dismiss: () => void; // close + persist the "seen" flag
}
```

- On mount, reads `onboarding_seen_v1` from `@capacitor/preferences` (already a project
  dependency; on the web platform it transparently falls back to `localStorage`, no extra
  code needed).
- Does **not** auto-open itself — auto-showing on first login is driven by `AuthedShell` (see
  Data flow below), keeping this provider ignorant of auth state.
- `dismiss()` sets `open = false` and writes `onboarding_seen_v1 = "true"` to Preferences
  (fire-and-forget).
- `show()` sets `open = true` without touching the stored flag — replaying the tour does not
  reset "seen" status.

### New: `src/components/onboarding/OnboardingTour.tsx` + `OnboardingTour.css`

Presentational modal, no data fetching — reads `useOnboarding()` directly (same
direct-context-consumption style as the rest of the app's screen-level components).

- Local `activeIndex` state (`0`–`3`), driven only by the footer buttons.
- Renders the current slide's gradient tile + icon, the dot row, title/description, and the
  footer.
- Transitions: the tile and title/description cross-fade via a CSS `opacity` transition
  (`--dur-base` + `--ease-out`) keyed on `activeIndex`; dots animate `width`/`opacity` via
  `transition: width var(--dur-fast) var(--ease-out)`. Every animated rule gets a
  `prefers-reduced-motion: reduce` override that disables it, matching the rest of the
  codebase's convention.
- Footer: "Geri" (hidden on slide 0), "Geç" and "İleri" ("Başla" on the last slide). "Geç" and
  "Başla" both call `dismiss()`; "İleri" advances `activeIndex`.
- Rendered inside a fixed `.onboarding-backdrop` overlay. Tapping the backdrop does **not**
  dismiss it — mirrors the reference's explicit Skip/Next-only dismissal and avoids losing
  the tour by an accidental tap.

### Data flow / wiring

- `OnboardingProvider` wraps `AuthedShell` inside [App.tsx](../../../src/App.tsx), nested the
  same way `AuthProvider` is (since `AuthedShell` needs to read both contexts).
- Inside `AuthedShell`, a `useEffect` watches `[session, onboarding.loading]`: once a session
  first becomes truthy and `onboarding.loading` has finished with the stored flag unset, it
  calls `onboarding.show()` exactly once (guarded by a `useRef` so later re-renders don't
  re-trigger it).
- `<OnboardingTour />` renders only when `session && onboarding.open` — never while `loading`,
  never on `LoginScreen`, never during the `recovery` (password-reset) flow.
- `ProfileScreen.tsx` gets one new button in its existing settings list that calls
  `onboarding.show()` directly.

## Error handling / edge cases

- Preferences read/write can in principle reject (native plugin call): both paths are wrapped
  in try/catch. A read failure defaults to "not seen" (worst case: the tour shows again,
  harmless); a write failure is silently ignored (worst case: it reshows on the next login
  too — never a crash).
- The tour must not flash before the Preferences read resolves — gated by
  `OnboardingContext.loading` in the auto-show effect.
- Never shown before a session exists or during the password-recovery screen — enforced by
  the render guard described above.
- Rotation/resize: the dialog's width is set with `min(92vw, 420px)`, no fixed pixel width,
  consistent with the rest of the app's mobile-first CSS.

## Testing

- `OnboardingContext`'s flag read/write logic gets a small `vitest` unit test (mocking
  `@capacitor/preferences`): loading→resolved transition, `show()`/`dismiss()` state changes,
  and that `dismiss()` persists the flag.
- This project has no UI test harness (documented in [CLAUDE.md](../../../CLAUDE.md)) — the
  visual/interaction behavior (slide transitions, footer navigation, the replay button) is
  verified manually via `npm run dev`, and optionally on-device via the CDP-based method
  established in the prior full-app test pass.

## Files touched

- `src/contexts/OnboardingContext.tsx` (new)
- `src/contexts/OnboardingContext.test.ts` (new)
- `src/components/onboarding/OnboardingTour.tsx` (new)
- `src/components/onboarding/OnboardingTour.css` (new)
- `src/App.tsx` (wrap with `OnboardingProvider`, add the auto-show effect and
  `<OnboardingTour />` render)
- `src/screens/profile/ProfileScreen.tsx` (add the replay button)
- `src/screens/profile/ProfileScreen.css` (button styling, reusing the existing settings-list
  item pattern)
