# Onboarding Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-login onboarding dialog that walks the user through watt-payi's 4-step
bill flow, replayable anytime from Profile.

**Architecture:** A new `OnboardingContext` (mirrors the existing `AuthContext` pattern) tracks
whether the tour has been seen, backed by a small pure-TS storage module
(`src/lib/onboardingStorage.ts`) wrapping `@capacitor/preferences`. A presentational
`OnboardingTour` component (no framer-motion/Embla — plain CSS transitions on the project's
`--dur-*`/`--ease-out` tokens) renders the 4 slides. `AuthedShell` in `App.tsx` auto-triggers
it once after first login; `ProfileScreen` gets a button to replay it on demand.

**Tech Stack:** React + TypeScript, `@capacitor/preferences` (already a dependency),
`lucide-react` icons, hand-written CSS using `tokens.css`/`global.css` design tokens, `vitest`
for the storage module's unit tests.

**Reference spec:** [docs/superpowers/specs/2026-08-24-onboarding-tutorial-design.md](../specs/2026-08-24-onboarding-tutorial-design.md)

---

## Note on the spec's test plan

The spec mentions a unit test for the context's "flag read/write logic." This project's vitest
config (`vite.config.ts`) runs with `environment: 'node'` and only includes `src/**/*.test.ts`
— there is no `jsdom`/`@testing-library/react` set up, so React hooks/contexts can't be
rendered in a test (confirmed: no such dependency in `package.json`, and every existing test
file — `calc.test.ts`, `trends.test.ts` — tests plain `.ts` functions, never a component).

To keep the flag logic genuinely testable, Task 1 extracts it into a plain-TypeScript module
(`src/lib/onboardingStorage.ts`, following the same `src/lib/*.ts` pattern as `calc.ts`) with
no React involved. `OnboardingContext.tsx` (Task 2) just calls these two functions and is not
itself unit-tested — consistent with `AuthContext.tsx`, which also has no test file.

---

### Task 1: Onboarding "seen" flag storage

**Files:**
- Create: `src/lib/onboardingStorage.ts`
- Test: `src/lib/onboardingStorage.test.ts`

- [x] **Step 1: Write the failing test**

Create `src/lib/onboardingStorage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import { getOnboardingSeen, setOnboardingSeen, ONBOARDING_SEEN_KEY } from './onboardingStorage';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('getOnboardingSeen', () => {
  beforeEach(() => {
    vi.mocked(Preferences.get).mockReset();
  });

  it('returns false when the flag was never set', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    expect(await getOnboardingSeen()).toBe(false);
  });

  it('returns true when the flag is "true"', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: 'true' });
    expect(await getOnboardingSeen()).toBe(true);
  });

  it('returns false when Preferences.get rejects', async () => {
    vi.mocked(Preferences.get).mockRejectedValue(new Error('native bridge unavailable'));
    expect(await getOnboardingSeen()).toBe(false);
  });
});

describe('setOnboardingSeen', () => {
  beforeEach(() => {
    vi.mocked(Preferences.set).mockReset();
  });

  it('writes the flag as "true"', async () => {
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
    await setOnboardingSeen();
    expect(Preferences.set).toHaveBeenCalledWith({ key: ONBOARDING_SEEN_KEY, value: 'true' });
  });

  it('does not throw when Preferences.set rejects', async () => {
    vi.mocked(Preferences.set).mockRejectedValue(new Error('native bridge unavailable'));
    await expect(setOnboardingSeen()).resolves.toBeUndefined();
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/onboardingStorage.test.ts`
Expected: FAIL — `Cannot find module './onboardingStorage'` (the module doesn't exist yet).

- [x] **Step 3: Write the implementation**

Create `src/lib/onboardingStorage.ts`:

```ts
import { Preferences } from '@capacitor/preferences';

export const ONBOARDING_SEEN_KEY = 'onboarding_seen_v1';

export async function getOnboardingSeen(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: ONBOARDING_SEEN_KEY });
    return value === 'true';
  } catch (err) {
    console.error('onboardingStorage: seen bayrağı okunamadı', err);
    return false;
  }
}

export async function setOnboardingSeen(): Promise<void> {
  try {
    await Preferences.set({ key: ONBOARDING_SEEN_KEY, value: 'true' });
  } catch (err) {
    console.error('onboardingStorage: seen bayrağı kaydedilemedi', err);
  }
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/onboardingStorage.test.ts`
Expected: PASS — 5 tests green.

- [x] **Step 5: Commit** — `31eff60`

```bash
git add src/lib/onboardingStorage.ts src/lib/onboardingStorage.test.ts
git commit -m "feat: add onboarding-seen flag storage"
```

---

### Task 2: OnboardingContext

**Files:**
- Create: `src/contexts/OnboardingContext.tsx`

- [x] **Step 1: Write the context**

Create `src/contexts/OnboardingContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getOnboardingSeen, setOnboardingSeen } from '../lib/onboardingStorage';

interface OnboardingContextValue {
  loading: boolean;
  seen: boolean;
  open: boolean;
  show: () => void;
  dismiss: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  loading: true,
  seen: false,
  open: false,
  show: () => {},
  dismiss: () => {},
});

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [seen, setSeen] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getOnboardingSeen().then((value) => {
      setSeen(value);
      setLoading(false);
    });
  }, []);

  function dismiss() {
    setOpen(false);
    setSeen(true);
    setOnboardingSeen();
  }

  return (
    <OnboardingContext.Provider value={{ loading, seen, open, show: () => setOpen(true), dismiss }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
```

This mirrors `src/contexts/AuthContext.tsx`'s shape on purpose (a `Provider` + a `useX` hook,
default context value that's safe to consume even outside the provider). `dismiss()` writes
`seen = true` immediately (optimistic UI, matching how `AuthContext`/`ProfileScreen` treat
Preferences/Supabase writes elsewhere in this codebase) and fires `setOnboardingSeen()`
without awaiting it — a failed write only means the tour might show again next login, never a
crash (see spec's Error handling section).

- [x] **Step 2: Type-check**

Run: `npm run build`
Expected: succeeds (this file isn't wired into the app yet, but must still type-check on its
own).

- [x] **Step 3: Commit** — `36ed844`

```bash
git add src/contexts/OnboardingContext.tsx
git commit -m "feat: add OnboardingContext"
```

---

### Task 3: OnboardingTour component

**Files:**
- Create: `src/components/onboarding/OnboardingTour.tsx`
- Create: `src/components/onboarding/OnboardingTour.css`

- [x] **Step 1: Write the component**

Create `src/components/onboarding/OnboardingTour.tsx`:

```tsx
import { useState, type CSSProperties } from 'react';
import { User, Camera, Zap, PieChart, type LucideIcon } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import './OnboardingTour.css';

interface Slide {
  id: string;
  title: string;
  description: string;
  tileColor: string;
  Icon: LucideIcon;
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    title: "watt-payi'ye hoş geldin",
    description:
      'Elektrik faturanı cihazlarına göre otomatik olarak bölüştürüp, evindeki gerçek tüketim dağılımını gösterir.',
    tileColor: 'var(--accent)',
    Icon: User,
  },
  {
    id: 'bill',
    title: 'Faturanı fotoğrafla',
    description:
      'Elektrik faturanın fotoğrafını çek, tutarı ve dönemi biz senin için okuyalım — elle girmene gerek kalmasın.',
    tileColor: 'var(--chart-4)',
    Icon: Camera,
  },
  {
    id: 'devices',
    title: 'Cihazlarını seç',
    description:
      'Evindeki buzdolabı, klima, çamaşır makinesi gibi cihazları işaretle, biz saatlik kullanımına göre payını hesaplayalım.',
    tileColor: 'var(--chart-5)',
    Icon: Zap,
  },
  {
    id: 'result',
    title: 'Harcamanı gör',
    description: 'Hangi cihaz ne kadar tüketiyor, grafikte gör — ve tasarruf için kişisel önerini al.',
    tileColor: 'var(--good)',
    Icon: PieChart,
  },
];

export function OnboardingTour() {
  const { dismiss } = useOnboarding();
  const [activeIndex, setActiveIndex] = useState(0);

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex];

  function handleNext() {
    if (isLast) {
      dismiss();
      return;
    }
    setActiveIndex((i) => i + 1);
  }

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-dialog" role="dialog" aria-modal="true" aria-label="Uygulama tanıtımı">
        <div
          className="onboarding-tile"
          key={slide.id}
          style={{ '--tile-color': slide.tileColor } as CSSProperties}
        >
          {/* Badge stays a fixed white circle in both themes (see .onboarding-badge),
              so the icon uses a fixed dark hex rather than --ink — --ink flips to a
              light color in dark mode and would vanish against this white badge. */}
          <div className="onboarding-badge">
            <slide.Icon size={30} strokeWidth={1.8} color="#191A23" />
          </div>
        </div>

        <div className="onboarding-dots">
          {SLIDES.map((s, i) => (
            <span key={s.id} className={'onboarding-dot' + (i === activeIndex ? ' active' : '')} />
          ))}
        </div>

        <div className="onboarding-text" key={slide.id + '-text'}>
          <h2>{slide.title}</h2>
          <p>{slide.description}</p>
        </div>

        <div className="onboarding-footer">
          <button
            type="button"
            className="onboarding-btn-ghost"
            onClick={() => setActiveIndex((i) => i - 1)}
            style={{ visibility: isFirst ? 'hidden' : 'visible' }}
          >
            Geri
          </button>
          <div className="onboarding-footer-right">
            <button type="button" className="onboarding-btn-ghost" onClick={dismiss}>
              Geç
            </button>
            <button type="button" className="onboarding-btn-primary" onClick={handleNext}>
              {isLast ? 'Başla' : 'İleri'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Note: `key={slide.id}` on `.onboarding-tile` and `.onboarding-text` forces React to remount
those nodes on every slide change, which re-triggers their CSS `animation` (see CSS below) —
this is the project's established way of doing enter animations (e.g.
`.profile-save-error`'s `animation: profile-save-error-in ...` in `ProfileScreen.css`), used
here instead of a JS-driven transition library.

- [x] **Step 2: Write the styles**

Create `src/components/onboarding/OnboardingTour.css`:

```css
.onboarding-backdrop {
  position: fixed; inset: 0; z-index: 50;
  display: flex; align-items: center; justify-content: center;
  background: rgba(10, 10, 18, .6);
  padding: 1.25rem;
  animation: onboarding-backdrop-in var(--dur-base) var(--ease-out);
}
@keyframes onboarding-backdrop-in { from { opacity: 0; } to { opacity: 1; } }

.onboarding-dialog {
  width: min(92vw, 420px);
  background: var(--surface);
  border-radius: var(--radius-xl);
  padding: 1.1rem;
  box-shadow: var(--shadow);
  animation: onboarding-dialog-in var(--dur-base) var(--ease-out);
}
@keyframes onboarding-dialog-in {
  from { opacity: 0; transform: scale(.96) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.onboarding-tile {
  aspect-ratio: 16 / 10;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--tile-color) 0%, color-mix(in srgb, var(--tile-color) 45%, white) 100%);
  display: flex; align-items: center; justify-content: center;
  animation: onboarding-fade-in var(--dur-base) var(--ease-out);
}
@keyframes onboarding-fade-in { from { opacity: 0; } to { opacity: 1; } }

.onboarding-badge {
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(255, 255, 255, .9);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, .15);
}

.onboarding-dots { display: flex; justify-content: center; gap: 6px; margin-top: .9rem; }
.onboarding-dot {
  width: 16px; height: 6px; border-radius: 999px; background: var(--line); opacity: .5;
  transition:
    width var(--dur-fast) var(--ease-out),
    opacity var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}
.onboarding-dot.active { width: 24px; opacity: 1; background: var(--accent); }

.onboarding-text { margin-top: 1rem; padding: 0 .15rem; animation: onboarding-fade-in var(--dur-base) var(--ease-out); }
.onboarding-text h2 { margin: 0; font-size: 1.05rem; }
.onboarding-text p { margin: .5rem 0 0; font-size: .85rem; line-height: 1.5; color: var(--ink-muted); }

.onboarding-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 1.4rem; }
.onboarding-footer-right { display: flex; align-items: center; gap: .4rem; }

.onboarding-btn-ghost {
  border: 0; background: transparent; color: var(--ink-muted); font-size: .85rem; font-weight: 600;
  padding: .5rem .6rem; border-radius: var(--radius-md); cursor: pointer; font-family: inherit;
  transition: background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.onboarding-btn-ghost:hover { background: var(--surface-sunken); color: var(--ink); }
.onboarding-btn-ghost:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.onboarding-btn-primary {
  border: 0; background: var(--accent-button); color: #fff; font-size: .85rem; font-weight: 700;
  padding: .55rem 1.15rem; border-radius: var(--radius-md); cursor: pointer; font-family: inherit;
  transition: transform var(--dur-fast) var(--ease-out), opacity var(--dur-fast) var(--ease-out);
}
.onboarding-btn-primary:hover { opacity: .92; }
.onboarding-btn-primary:active { transform: scale(.97); }
.onboarding-btn-primary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .onboarding-backdrop, .onboarding-dialog, .onboarding-tile, .onboarding-text { animation: none; }
  .onboarding-dot, .onboarding-btn-ghost, .onboarding-btn-primary { transition: none; }
}
```

- [x] **Step 3: Type-check**

Run: `npm run build`
Expected: succeeds.

- [x] **Step 4: Commit** — `037e74b`; two review-driven fix-up commits followed:
  `47bfbf2` (focus trap, Escape, back-button guard) and `3054fa4` (fixed a focus-eviction
  bug that `47bfbf2` introduced on the "Geri"→slide-0 transition).

```bash
git add src/components/onboarding/OnboardingTour.tsx src/components/onboarding/OnboardingTour.css
git commit -m "feat: add OnboardingTour component"
```

---

### Task 4: Wire the tour into the app shell

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the file's contents**

`src/App.tsx` currently has no onboarding wiring. Replace it entirely with:

```tsx
import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';
import { LoginScreen } from './screens/auth/LoginScreen';
import { ResetPasswordScreen } from './screens/auth/ResetPasswordScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { AddFlow } from './screens/add/AddFlow';
import { HistoryScreen } from './screens/history/HistoryScreen';
import { HistoryDetailScreen } from './screens/history/HistoryDetailScreen';
import { ProfileScreen } from './screens/profile/ProfileScreen';
import { BottomNav } from './components/BottomNav';
import { OnboardingTour } from './components/onboarding/OnboardingTour';

function AuthedShell() {
  const { session, loading, recovery } = useAuth();
  const onboarding = useOnboarding();
  const autoShown = useRef(false);

  useEffect(() => {
    if (
      session &&
      !recovery &&
      !onboarding.loading &&
      !onboarding.seen &&
      !autoShown.current
    ) {
      autoShown.current = true;
      onboarding.show();
    }
  }, [session, recovery, onboarding.loading, onboarding.seen, onboarding.show]);

  if (loading) return null;
  if (recovery) return <ResetPasswordScreen />;
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
      {onboarding.open && <OnboardingTour />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <AuthedShell />
      </OnboardingProvider>
    </AuthProvider>
  );
}
```

What changed vs. the original: `OnboardingProvider` now wraps `AuthedShell` (nested inside
`AuthProvider`, since `AuthedShell` needs both contexts); a `useEffect` auto-triggers the tour
exactly once, guarded by `autoShown` so it can't re-fire on later re-renders, and gated on
`!recovery` so it never appears during the password-reset flow (the reference login flow can
carry a `session` while `recovery` is true — see `AuthContext.tsx`'s `handleAuthDeepLink`);
`<OnboardingTour />` is only rendered once we've already passed the `!session`/`recovery`
early returns, so it's implicitly impossible to render it on the login or recovery screens.

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: auto-show onboarding tour on first login"
```

---

### Task 5: Replay button on ProfileScreen

**Files:**
- Modify: `src/screens/profile/ProfileScreen.tsx`

- [ ] **Step 1: Add the import for the onboarding hook and the new icon**

In `src/screens/profile/ProfileScreen.tsx`, change line 2 from:

```tsx
import { RotateCcw, WifiOff, TriangleAlert } from 'lucide-react';
```

to:

```tsx
import { RotateCcw, WifiOff, TriangleAlert, PlayCircle } from 'lucide-react';
```

Then add a new import right after the existing `supabase` import (currently line 3):

```tsx
import { useOnboarding } from '../../contexts/OnboardingContext';
```

- [ ] **Step 2: Read the flag inside the component**

Inside `export function ProfileScreen() {`, right after the existing `useState` declarations
(after the `deleteError` line, before `const load = useCallback(...)`), add:

```tsx
  const onboarding = useOnboarding();
```

- [ ] **Step 3: Insert the replay button**

Find this block (currently right before the `Çıkış yap` button):

```tsx
      {saveError && (
        <div className="profile-save-error" role="alert">
          <WifiOff size={15} strokeWidth={1.8} />
          <span>{saveError}</span>
        </div>
      )}

      <Button
        variant="destructive"
        size="lg"
        className="w-full h-12 text-base profile-in"
        style={{ '--i': 3 } as CSSProperties}
        onClick={signOut}
      >
        Çıkış yap
      </Button>

      <div className="profile-danger-zone profile-in" style={{ '--i': 4 } as CSSProperties}>
```

Replace it with (adds the replay button at `--i: 3`, bumps the sign-out button to `--i: 4` and
the danger zone to `--i: 5` so the entrance-animation stagger stays sequential):

```tsx
      {saveError && (
        <div className="profile-save-error" role="alert">
          <WifiOff size={15} strokeWidth={1.8} />
          <span>{saveError}</span>
        </div>
      )}

      <Button
        variant="outline"
        size="lg"
        className="w-full h-12 text-base profile-in"
        style={{ '--i': 3 } as CSSProperties}
        onClick={onboarding.show}
      >
        <PlayCircle size={18} strokeWidth={1.8} />
        Tanıtımı tekrar izle
      </Button>

      <Button
        variant="destructive"
        size="lg"
        className="w-full h-12 text-base profile-in"
        style={{ '--i': 4 } as CSSProperties}
        onClick={signOut}
      >
        Çıkış yap
      </Button>

      <div className="profile-danger-zone profile-in" style={{ '--i': 5 } as CSSProperties}>
```

No `ProfileScreen.css` changes are needed — the shadcn `Button`'s `outline` variant and `lg`
size (`src/components/ui/button.tsx`) already provide spacing/hover/focus styling consistent
with the rest of the screen, including the icon+label gap.

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/screens/profile/ProfileScreen.tsx
git commit -m "feat: add onboarding replay button to ProfileScreen"
```

---

### Task 6: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all `onboardingStorage.test.ts` cases pass. `calc.test.ts` may show its one
pre-existing failing assertion (documented in `CLAUDE.md` as unrelated to unrelated changes)
— that is not a regression from this work.

- [ ] **Step 2: Run the full build**

Run: `npm run build`
Expected: `tsc -b && vite build` succeeds with no errors across the whole project.

- [ ] **Step 3: Manual verification in the dev server**

Run: `npm run dev`, open the app, log in with an existing account (the "seen" flag is almost
certainly already set from earlier testing, so the tour won't auto-open — that's expected).

Go to **Profil** and click **"Tanıtımı tekrar izle"**. Verify:
- The dialog opens centered with a dimmed backdrop.
- Slide 1 shows the purple tile with the user icon, "watt-payi'ye hoş geldin", and "Geri" is
  hidden (first slide).
- Clicking "İleri" three times moves through the amber/camera, blue/zap, and teal/pie-chart
  slides in order, with the dot row's active dot tracking the current slide.
- On the 4th slide, the primary button reads "Başla" instead of "İleri"; clicking it closes
  the dialog.
- Reopening via the replay button always starts back at slide 1 (confirms `activeIndex` resets
  since `OnboardingTour` remounts fresh each time `onboarding.open` flips true → the whole
  component mounts new local state).
- Clicking "Geç" on any slide closes the dialog immediately.

- [ ] **Step 4: Verify the first-login auto-show path**

This requires a state with no stored flag. Easiest path: in the browser devtools console
while the dev server tab is open, run `localStorage.removeItem('onboarding_seen_v1')` (the web
Preferences implementation is backed by `localStorage`), then reload the app while already
logged in. Verify the tour auto-opens without visiting Profile.

- [ ] **Step 5: Commit if any fixes were needed**

If manual verification surfaced any issue, fix it, re-run the affected step above, then:

```bash
git add -A
git commit -m "fix: address onboarding tour verification findings"
```

If no issues were found, skip this step — there is nothing to commit.
