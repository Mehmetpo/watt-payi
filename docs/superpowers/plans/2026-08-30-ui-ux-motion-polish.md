# UI/UX & Motion Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the perceived quality of watt-payi's four main surfaces (Home, History, Profile, BottomNav) and its shared `BillBreakdown` component through a set of small, independent visual / interaction / motion-performance fixes — without changing any data model, routing, or business logic.

**Architecture:** Every task is a self-contained change to one screen or component. Tasks share nothing and can be executed in any order, each in its own fresh session, each ending with its own commit. Two tasks extract a pure helper into `src/lib/*.ts` (unit-tested with vitest); the rest are hand-written CSS + small JSX edits on the project's existing `tokens.css` / `global.css` design-token system. No new runtime dependencies. One task *removes* a dependency.

**Tech Stack:** React 18 + TypeScript + Vite 7, Tailwind v4 (`@theme inline` token mapping in `src/styles/global.css`), shadcn/base-ui components, `lucide-react` icons, hand-written CSS using `src/styles/tokens.css` design tokens, `vitest` (`environment: 'node'`, `src/**/*.test.ts` only — pure functions, never components).

---

## Shared context for every session

Read this block before starting any task. Each session starts cold — this is the context you need.

### Project location & layout

- Project root: `D:\Projects\watt-payi(mobile app)` (note the space and parens — always quote the path).
- Screens: `src/screens/{home,history,profile,add,auth}/`. Shared components: `src/components/`. Pure helpers: `src/lib/`. Design tokens: `src/styles/tokens.css` (palette, light + dark) and `src/styles/global.css` (Tailwind mapping, base element styles, motion tokens).
- Routing lives in `src/App.tsx` → `AuthedShell` renders `<Routes>` for `/`, `/add`, `/history`, `/history/:billId`, `/profile`, plus `<BottomNav />`. Screens only render when the user is authenticated.

### Design tokens (use these — never raw hex, never raw ms)

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | `150ms` | micro-interactions (hover, press, color) |
| `--dur-base` | `220ms` | state transitions, list-item entrance |
| `--dur-slow` | `300ms` | screen/section entrance, progress fills |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | all UI easing |
| `--accent` / `--accent-soft` / `--accent-strong` | brand purple set | |
| `--accent-button` | solid-fill purple (WCAG-safe under white text in both themes) | filled buttons/badges only |
| `--coral` / `--coral-soft` | danger red (tuned for 4.5:1) | errors, over-budget, destructive |
| `--good` / `--good-soft` | green (tuned for 4.5:1) | positive delta, savings |
| `--ink` / `--ink-muted` / `--ink-faint` | text greys (all ≥4.5:1 on plain surfaces) | |
| `--surface` / `--surface-sunken` | card / recessed backgrounds | |
| `--line` | hairline borders | |
| `--radius` `0.75rem`, `--radius-md` `0.6rem`, `--radius-lg` `0.75rem`, `--radius-hero` `2.125rem` | | |

### Mandatory rules

1. **Every new or changed animation MUST have a `@media (prefers-reduced-motion: reduce)` guard** that disables it. Every existing stylesheet in this project already has such a block near the bottom — add to it, don't create a second one.
2. **Animate only `transform` and `opacity`.** Never animate `width`, `height`, `max-height`, `top`, `left`, `margin`, or `filter`. (Task 7 and Task 10 exist specifically to remove existing violations of this.)
3. **Do not run `git add -A` / `git add .`.** The working tree already carries unrelated uncommitted work from earlier sessions in these files — leave them alone:
   `package.json`, `src/components/BillBreakdown.tsx`, `src/data/deviceCatalog.ts`, `src/screens/add/steps/DevicesStep.tsx`, `src/screens/add/steps/ResultStep.tsx`, `src/screens/add/steps/UsageStep.tsx`, `src/screens/home/HomeScreen.css`, `src/screens/profile/ProfileScreen.tsx`, plus untracked `artifacts/`, `public/`, `scripts/`, `src/components/ApplianceVisual.tsx`, `src/data/deviceCatalog.test.ts`, `src/lib/applianceVisuals.*`, `store-assets/`.
   Each task's commit step lists the **exact** paths to `git add`. Two tasks below (2, and the Home tasks) touch files that are *already* dirty — those tasks tell you how to handle it.
4. **Never touch `src/lib/ads.ts` `AD_TEST_MODE`.** Never run `./gradlew assembleRelease` / `bundleRelease` (a hook blocks it anyway).
5. **No device automation.** ADB `input tap` on the test device is unreliable and `npx cap sync` / `adb install` are not part of these tasks. You verify with `npm run build` + `npm test`. Final on-device visual QA is Mehmet's — each task ends with a **"Visual QA checklist for Mehmet"** he runs after a batch of tasks lands.
6. Commit messages: conventional commits (`feat:` / `fix:` / `perf:` / `refactor:` / `chore:`), body in prose explaining the *why*. End the commit body with:
   `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
7. Branch is `master`. Commit directly to it (matches this repo's established flow). Push is pre-authorized if you want to, but not required by any task.

### Baseline (verified 2026-08-30, clean tree minus the unrelated dirty files above)

- `npm run build` → `tsc -b && vite build`, passes in ~6s. One **non-error** warning: "Some chunks are larger than 500 kB". That warning is pre-existing — ignore it.
- `npm test` → `vitest run`, **18 tests / 6 files pass** in ~1.7s. Several tests print `stderr` `console.error` lines (`native bridge unavailable`, etc.) on purpose while exercising rejection paths — that is expected output, not a failure. Only the final `Test Files … passed` / `Tests … passed` line matters.

### Standard verification (unless a task says otherwise)

```bash
npm run build
```
Expected: completes, no TypeScript errors, same single chunk-size warning as baseline.

```bash
npm test
```
Expected: all tests pass (baseline 18, plus any this task added).

---

## Task list

| # | Area | Type | Extracts a tested helper? |
|---|---|---|---|
| 1 | Home hero — period label + secondary line + stable layout | JSX + CSS | no |
| 2 | BillBreakdown — donut segment gaps + centered donut-only layout | JSX + CSS + helper | **yes** (`donutGradient.ts`) |
| 3 | History — summary strip + single-bill bar fix | JSX + CSS + helper | **yes** (`billStats.ts`) |
| 4 | History — "add more bills" trend nudge | JSX + CSS | no |
| 5 | Profile — correct button emphasis (sign-out ≠ destructive) | JSX | no |
| 6 | Profile — progressive disclosure of the watt list | JSX + CSS | no |
| 7 | BottomNav — always-visible labels (also removes a `max-height` animation) | CSS | no |
| 8 | Route-change transition continuity | JSX + CSS | no |
| 9 | Perf — remove `background-attachment: fixed` | CSS | no |
| 10 | Perf — tame the animated hero glow (drop `filter: blur`) | CSS | no |
| 11 | Chore — remove unused `animejs` dependency | package.json | no |
| 12 | Login — make the "confirm your email" message a prominent callout | JSX + CSS | no |

---

### Task 1: Home hero — period label, secondary line, stable layout

**Problem:** The hero shows a big total in a wide purple panel with a lot of empty space to its right. The eyebrow is a generic "Bu Ay". When there is no previous bill, the delta badge is absent and the row looks unbalanced, and the row height changes depending on whether the badge renders (layout shift on load).

**Fix:** Eyebrow shows the actual bill month. Add a small secondary line under the total (unit price — data already loaded). Reserve the row's height so the badge appearing doesn't shift layout.

**Files:**
- Modify: `src/screens/home/HomeScreen.tsx` (JSX around lines 133–155; `latestBill` already carries `periodMonth` and `rateTlPerKwh`)
- Modify: `src/screens/home/HomeScreen.css` (`.home-eyebrow`, `.home-hero-row`, add `.home-hero-sub`)

> ⚠️ `src/screens/home/HomeScreen.css` is **already dirty** (unrelated prior work — the `.home-card-wrap` z-index fix). That is fine: your edits here are additive and in different rules. When you `git add`, add both files; the diff will include the prior `.home-card-wrap` change. That change is deliberate and already reviewed — mention in the commit body that it rides along.

- [ ] **Step 1: Confirm `Bill` type carries the fields**

Run: `grep -n "rateTlPerKwh\|periodMonth" src/types/domain.ts`
Expected: both fields present on the `Bill` interface (they are — `HomeScreen` already sets `rateTlPerKwh: latest.rate_tl_per_kwh` and `periodMonth: latest.period_month`).

- [ ] **Step 2: Update the hero JSX in `src/screens/home/HomeScreen.tsx`**

Replace this block (currently lines ~135–155):

```tsx
      <div className="home-hero">
        <div className="home-hero-glow" aria-hidden="true" />
        <span className="home-eyebrow">Bu Ay</span>
        {loading ? (
          <div className="home-hero-skeleton" aria-hidden="true" />
        ) : latestBill ? (
          <div className="home-hero-row">
            <div className="home-hero-total mono">
              {heroTotal.toLocaleString('tr-TR')}
              <span>TL</span>
            </div>
            {delta !== null && (
              <span className={'home-delta' + (delta <= 0 ? ' down' : ' up')}>
                {delta <= 0 ? '↓' : '↑'} %{Math.abs(delta).toFixed(0)}
              </span>
            )}
          </div>
        ) : (
          <h1 className="display home-hero-empty-title">Watt Payı</h1>
        )}
      </div>
```

with:

```tsx
      <div className="home-hero">
        <div className="home-hero-glow" aria-hidden="true" />
        <span className="home-eyebrow">
          {latestBill ? formatPeriod(latestBill.periodMonth) : 'Bu Ay'}
        </span>
        {loading ? (
          <div className="home-hero-skeleton" aria-hidden="true" />
        ) : latestBill ? (
          <>
            <div className="home-hero-row">
              <div className="home-hero-total mono">
                {heroTotal.toLocaleString('tr-TR')}
                <span>TL</span>
              </div>
              {delta !== null && (
                <span className={'home-delta' + (delta <= 0 ? ' down' : ' up')}>
                  {delta <= 0 ? '↓' : '↑'} %{Math.abs(delta).toFixed(0)}
                </span>
              )}
            </div>
            {latestBill.rateTlPerKwh != null && (
              <span className="home-hero-sub mono">
                {latestBill.rateTlPerKwh.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺/kWh birim fiyat
              </span>
            )}
          </>
        ) : (
          <h1 className="display home-hero-empty-title">Watt Payı</h1>
        )}
      </div>
```

`formatPeriod` is already imported at the top of the file (`import { formatPeriod } from '../../lib/format';`). Leave that import as-is.

- [ ] **Step 3: Update `src/screens/home/HomeScreen.css`**

Change `.home-hero-row` (currently lines ~25–29) to reserve height:

```css
.home-hero-row {
  position: relative; display: flex; align-items: center; gap: .75rem; flex-wrap: wrap;
  min-height: 2.75rem;
  animation: home-hero-in var(--dur-slow) var(--ease-out) backwards;
  animation-delay: 60ms;
}
```

Add this new rule immediately after the `.home-hero-total span` rule (after line ~33):

```css
.home-hero-sub {
  position: relative; display: block; margin-top: .4rem;
  color: rgba(255,255,255,.72); font-size: .8rem; font-weight: 600;
  animation: home-hero-in var(--dur-slow) var(--ease-out) backwards;
  animation-delay: 120ms;
}
```

Add `.home-hero-sub` to the existing reduced-motion guard. Change (line ~75):

```css
@media (prefers-reduced-motion: reduce) {
  .home-card-anim { animation: none; }
  .home-hero-glow, .home-eyebrow, .home-hero-row, .home-hero-empty-title, .home-hero-skeleton { animation: none; }
}
```

to:

```css
@media (prefers-reduced-motion: reduce) {
  .home-card-anim { animation: none; }
  .home-hero-glow, .home-eyebrow, .home-hero-row, .home-hero-empty-title, .home-hero-skeleton, .home-hero-sub { animation: none; }
}
```

- [ ] **Step 4: Verify**

```bash
npm run build
```
Expected: passes, no TS errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/home/HomeScreen.tsx src/screens/home/HomeScreen.css
git commit -m "feat: show bill month and unit price in the home hero

The hero led with a generic 'Bu Ay' eyebrow and left a large empty band
to the right of the total. It now names the actual bill month and adds a
small unit-price line beneath the figure, and the total row reserves its
height so the delta badge appearing on load no longer shifts the layout.

The HomeScreen.css diff also carries a previously-made .home-card-wrap
z-index fix from an earlier session that had not been committed.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Visual QA checklist for Mehmet:**
- Home with ≥1 bill: eyebrow reads e.g. "Ağustos 2026"; a faint "…₺/kWh birim fiyat" line sits under the total.
- Home with exactly 1 bill (no delta badge): the total row still has the same height as when a badge is present — no jump when the screen finishes loading.
- Empty state (no bills) unchanged: "Watt Payı" title.
- Dark mode: secondary line is readable, not glaring.

---

### Task 2: BillBreakdown — donut segment gaps + centered donut-only layout

**Problem:** (a) The donut's `conic-gradient` segments butt directly against each other with no separation — at some boundaries this renders as a hairline seam and the whole donut looks flat/cheap. (b) On Home the component is rendered with `showTotal={false}`, which leaves the donut alone on the left with dead space filling the right half of the card.

**Fix:** (a) Insert a small angular gap between segments (only when there is more than one segment). (b) When `showTotal` is false, center the donut and make it slightly larger.

**Files:**
- Create: `src/lib/donutGradient.ts`
- Create: `src/lib/donutGradient.test.ts`
- Modify: `src/components/BillBreakdown.tsx` (the `arcs.map` that builds `.breakdown-donut-seg`, ~lines 48–57; and the `.breakdown-summary` wrapper, ~line 45)
- Modify: `src/components/BillBreakdown.css` (`.breakdown-summary`, `.breakdown-donut`)

> ⚠️ `src/components/BillBreakdown.tsx` is **already dirty** from earlier work. Before you start, run `git stash list` and `git diff src/components/BillBreakdown.tsx` and read the existing uncommitted change so your edit composes with it rather than clobbering it. Do **not** stash or revert it. Your commit will include that prior change; note in the commit body that it rides along (same situation as Task 1's CSS file).

- [ ] **Step 1: Write the failing test — `src/lib/donutGradient.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { donutSegmentGradient } from './donutGradient';

describe('donutSegmentGradient', () => {
  it('builds a conic-gradient string with the colour band between start and end', () => {
    expect(donutSegmentGradient(0, 40, 'var(--chart-1)', 0)).toBe(
      'conic-gradient(transparent 0 0%, var(--chart-1) 0% 40%, transparent 40% 100%)'
    );
  });

  it('insets both edges by half the gap when a gap is given', () => {
    expect(donutSegmentGradient(0, 40, 'red', 1)).toBe(
      'conic-gradient(transparent 0 0.5%, red 0.5% 39.5%, transparent 39.5% 100%)'
    );
  });

  it('never lets the coloured band invert on a sliver segment smaller than the gap', () => {
    // 2%-wide segment, 4% gap requested -> band collapses to zero width, not negative
    const result = donutSegmentGradient(10, 12, 'red', 4);
    expect(result).toBe('conic-gradient(transparent 0 11%, red 11% 11%, transparent 11% 100%)');
  });

  it('clamps to the 0–100 range', () => {
    expect(donutSegmentGradient(0, 100, 'red', 2)).toBe(
      'conic-gradient(transparent 0 1%, red 1% 99%, transparent 99% 100%)'
    );
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/lib/donutGradient.test.ts`
Expected: FAIL — `Failed to resolve import "./donutGradient"` / module not found.

- [ ] **Step 3: Implement `src/lib/donutGradient.ts`**

```ts
/**
 * Builds the `background` value for one segment of the breakdown donut.
 *
 * The donut is a stack of absolutely-positioned divs, each painting a single
 * coloured arc via a hard-stop conic-gradient (transparent · colour · transparent).
 * `gap` (in percent of the full circle) is subtracted evenly from both edges so
 * adjacent segments show a thin sliver of the card behind them instead of butting
 * together. On a segment narrower than `gap` the band is clamped to zero width
 * (its midpoint) rather than inverting.
 */
export function donutSegmentGradient(
  startPct: number,
  endPct: number,
  color: string,
  gapPct: number
): string {
  const half = gapPct / 2;
  const mid = (startPct + endPct) / 2;
  const start = clamp(Math.min(startPct + half, mid));
  const end = clamp(Math.max(endPct - half, mid));
  return `conic-gradient(transparent 0 ${start}%, ${color} ${start}% ${end}%, transparent ${end}% 100%)`;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
```

- [ ] **Step 4: Run it — verify it passes**

Run: `npx vitest run src/lib/donutGradient.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Use it in `src/components/BillBreakdown.tsx`**

Add the import near the other imports at the top:

```tsx
import { donutSegmentGradient } from '../lib/donutGradient';
```

Add a module-level constant just below the `CAT_COLORS` array (after line ~16):

```tsx
/** Angular gap between donut segments, in % of the full circle. Applied only when >1 segment. */
const DONUT_GAP_PCT = 1.4;
```

Replace the segment `map` (currently lines ~48–57):

```tsx
          {arcs.map((a, i) => (
            <div
              key={a.deviceKey ?? a.deviceName}
              className={'breakdown-donut-seg' + (active !== null && active !== i ? ' dim' : '')}
              style={{
                background: `conic-gradient(transparent 0 ${a.start}%, ${a.color} ${a.start}% ${a.end}%, transparent ${a.end}% 100%)`,
              }}
              onClick={() => toggle(i)}
            />
          ))}
```

with:

```tsx
          {arcs.map((a, i) => (
            <div
              key={a.deviceKey ?? a.deviceName}
              className={'breakdown-donut-seg' + (active !== null && active !== i ? ' dim' : '')}
              style={{
                background: donutSegmentGradient(
                  a.start,
                  a.end,
                  a.color,
                  arcs.length > 1 ? DONUT_GAP_PCT : 0
                ),
              }}
              onClick={() => toggle(i)}
            />
          ))}
```

Change the summary wrapper (currently line ~45) from:

```tsx
      <div className="breakdown-summary">
```

to:

```tsx
      <div className={'breakdown-summary' + (showTotal ? '' : ' breakdown-summary--donut-only')}>
```

- [ ] **Step 6: Update `src/components/BillBreakdown.css`**

Change `.breakdown-summary` and `.breakdown-donut` (currently lines ~1–5) and add the modifier:

```css
.breakdown-summary { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.4rem; }
.breakdown-summary--donut-only { justify-content: center; }
.breakdown-donut {
  width: 136px; height: 136px; border-radius: 50%; position: relative; flex: none;
  animation: breakdown-donut-in 520ms var(--ease-out) backwards;
}
.breakdown-summary--donut-only .breakdown-donut { width: 152px; height: 152px; }
```

(The `::after` hole is `inset: 20px` — it scales fine with the larger donut; leave it.)

- [ ] **Step 7: Verify**

```bash
npm run build
npm test
```
Expected: build passes; tests pass (baseline 18 + 4 new = 22).

- [ ] **Step 8: Commit**

```bash
git add src/lib/donutGradient.ts src/lib/donutGradient.test.ts src/components/BillBreakdown.tsx src/components/BillBreakdown.css
git commit -m "feat: gap the breakdown donut segments and centre the donut-only layout

Adjacent conic-gradient arcs butted together and rendered as a hairline
seam. A small angular gap (via the new pure donutSegmentGradient helper,
unit-tested) now separates them, clamped so a sliver segment can't invert.

When BillBreakdown is rendered without its total figure (the Home card),
the donut is now centred and slightly larger instead of sitting alone in
the left half of the card.

The BillBreakdown.tsx diff also carries an earlier uncommitted change
from a previous session.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Visual QA checklist for Mehmet:**
- Home breakdown card: donut is centered horizontally, a touch larger, thin gaps visible between colour arcs, no seam.
- History-detail and Add-flow result: donut still sits left with the big total on the right; segments now gapped there too.
- Single-device bill (one 100% arc): no weird sliver/gap — one clean ring.
- Tap a segment: the others still dim as before.

---

### Task 3: History — summary strip + single-bill bar fix

**Problem:** (a) With one bill the screen is a single row plus a large empty area — no sense of "history". (b) `.history-row-bar` scales to `bill.total_tl / maxTotal`; with one bill that is always `1.0`, so the row is fully washed in `--accent-soft` and reads like a selected / error state.

**Fix:** (a) Add a small stats strip (average / highest / lowest) above the list once there are ≥2 bills. (b) Only render the comparison bar when there are ≥2 bills.

**Files:**
- Create: `src/lib/billStats.ts`
- Create: `src/lib/billStats.test.ts`
- Modify: `src/screens/history/HistoryScreen.tsx`
- Modify: `src/screens/history/HistoryScreen.css`

- [ ] **Step 1: Write the failing test — `src/lib/billStats.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { summarizeBills } from './billStats';

describe('summarizeBills', () => {
  it('returns null for fewer than two bills', () => {
    expect(summarizeBills([])).toBeNull();
    expect(summarizeBills([{ total_tl: 1000 }])).toBeNull();
  });

  it('computes rounded average, highest and lowest across bills', () => {
    const result = summarizeBills([
      { total_tl: 1000 },
      { total_tl: 2000 },
      { total_tl: 1500 },
    ]);
    expect(result).toEqual({ averageTl: 1500, highestTl: 2000, lowestTl: 1000, count: 3 });
  });

  it('rounds the average to the nearest lira', () => {
    const result = summarizeBills([{ total_tl: 1000 }, { total_tl: 1001 }]);
    expect(result?.averageTl).toBe(1001); // 1000.5 -> 1001
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/lib/billStats.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/billStats.ts`**

```ts
export interface BillTotal {
  total_tl: number;
}

export interface BillSummary {
  averageTl: number;
  highestTl: number;
  lowestTl: number;
  count: number;
}

/** Average / highest / lowest bill total. Returns null with fewer than 2 bills, where a summary would be noise. */
export function summarizeBills(bills: BillTotal[]): BillSummary | null {
  if (bills.length < 2) return null;
  const totals = bills.map((b) => b.total_tl);
  const sum = totals.reduce((a, b) => a + b, 0);
  return {
    averageTl: Math.round(sum / totals.length),
    highestTl: Math.max(...totals),
    lowestTl: Math.min(...totals),
    count: totals.length,
  };
}
```

- [ ] **Step 4: Run it — verify it passes**

Run: `npx vitest run src/lib/billStats.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire it into `src/screens/history/HistoryScreen.tsx`**

Add the import next to the other `lib` imports (after the `trends` import, ~line 5):

```tsx
import { summarizeBills } from '../../lib/billStats';
```

Inside the component, compute the summary from `bills` — add this line right after the `return (` … actually add it just before `return (` (after line ~65, after the `useEffect`):

```tsx
  const summary = summarizeBills(bills);
```

Render the strip: immediately after the `<h1 …>Geçmiş</h1>` line and before the `{rising.length > 0 && ( … )}` block (~line 70), insert:

```tsx
      {!loading && !error && summary && (
        <div className="history-summary history-in" style={{ '--i': 1 } as CSSProperties}>
          <div className="history-summary-cell">
            <span className="history-summary-label">Ortalama</span>
            <span className="history-summary-value mono">{summary.averageTl.toLocaleString('tr-TR')} TL</span>
          </div>
          <div className="history-summary-cell">
            <span className="history-summary-label">En yüksek</span>
            <span className="history-summary-value mono">{summary.highestTl.toLocaleString('tr-TR')} TL</span>
          </div>
          <div className="history-summary-cell">
            <span className="history-summary-label">En düşük</span>
            <span className="history-summary-value mono">{summary.lowestTl.toLocaleString('tr-TR')} TL</span>
          </div>
        </div>
      )}
```

Bump the `rising` insight's stagger index so it doesn't collide with the summary's `--i: 1`. Change (in the `{rising.length > 0 && (` block, ~line 72):

```tsx
        <div className="history-insight history-in" style={{ '--i': 1 } as CSSProperties}>
```

to:

```tsx
        <div className="history-insight history-in" style={{ '--i': 2 } as CSSProperties}>
```

Guard the comparison bar — change (~lines 104–119) from:

```tsx
          {(() => {
            const maxTotal = Math.max(...bills.map((b) => b.total_tl));
            return bills.map((bill, i) => {
              const prev = bills[i + 1];
              const delta = prev ? ((bill.total_tl - prev.total_tl) / prev.total_tl) * 100 : null;
              return (
                <Link
                  key={bill.id}
                  to={`/history/${bill.id}`}
                  className="history-row"
                  style={{ '--i': i } as CSSProperties}
                >
                  <div
                    className="history-row-bar"
                    style={{ transform: `scaleX(${Math.max(0.04, bill.total_tl / maxTotal)})` }}
                  />
```

to:

```tsx
          {(() => {
            const maxTotal = Math.max(...bills.map((b) => b.total_tl));
            const showBars = bills.length >= 2;
            return bills.map((bill, i) => {
              const prev = bills[i + 1];
              const delta = prev ? ((bill.total_tl - prev.total_tl) / prev.total_tl) * 100 : null;
              return (
                <Link
                  key={bill.id}
                  to={`/history/${bill.id}`}
                  className="history-row"
                  style={{ '--i': i } as CSSProperties}
                >
                  {showBars && (
                    <div
                      className="history-row-bar"
                      style={{ transform: `scaleX(${Math.max(0.04, bill.total_tl / maxTotal)})` }}
                    />
                  )}
```

(`CSSProperties` is already imported in this file: `import { … type CSSProperties } from 'react';`.)

- [ ] **Step 6: Add styles to `src/screens/history/HistoryScreen.css`**

Add after the `.history-insight` rule (~line 43):

```css
.history-summary {
  display: flex; gap: .5rem; margin-bottom: 1.2rem;
}
.history-summary-cell {
  flex: 1; display: flex; flex-direction: column; gap: .2rem;
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg);
  padding: .7rem .6rem; box-shadow: var(--shadow);
}
.history-summary-label { font-size: .68rem; font-weight: 600; color: var(--ink-faint); }
.history-summary-value { font-size: .82rem; font-weight: 700; color: var(--ink); white-space: nowrap; }
```

No new animation (it reuses `.history-in`), so no reduced-motion change is needed.

- [ ] **Step 7: Verify**

```bash
npm run build
npm test
```
Expected: build passes; tests pass (22 + 3 = 25 if Task 2 already landed, else 18 + 3 = 21).

- [ ] **Step 8: Commit**

```bash
git add src/lib/billStats.ts src/lib/billStats.test.ts src/screens/history/HistoryScreen.tsx src/screens/history/HistoryScreen.css
git commit -m "feat: add a summary strip to History and hide the one-bill comparison bar

With a single bill the screen was one lonely row over a large blank area,
and that row's comparison bar (scaled to total/maxTotal = 1.0) washed the
whole row in accent-soft so it looked selected. The per-row bar now only
renders with two or more bills, and once there are two or more a small
average / highest / lowest strip sits above the list.

Adds the pure summarizeBills helper with unit tests.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Visual QA checklist for Mehmet:**
- History with 1 bill: no summary strip, the row is a plain card (no accent wash).
- History with 2+ bills: three-cell strip (Ortalama / En yüksek / En düşük) above the list; rows have the comparison bar again.
- Numbers use tabular figures and match what the rows show.
- Dark mode: cells read as cards, not flat.

---

### Task 4: History — "add more bills" trend nudge

**Problem:** The rising-device insight and any real trend only appear at ≥3 bills (`detectRisingDevices` needs 3). A user with 1–2 bills gets no hint that adding more unlocks anything.

**Fix:** Below the list, when there are between 1 and 2 bills, show a quiet nudge with a CTA to `/add`.

**Files:**
- Modify: `src/screens/history/HistoryScreen.tsx`
- Modify: `src/screens/history/HistoryScreen.css`

- [ ] **Step 1: Add the nudge JSX**

In `src/screens/history/HistoryScreen.tsx`, find the closing of the populated-list branch. It currently ends (~lines 133–136):

```tsx
            });
          })()}
        </div>
      )}
    </div>
  );
```

Change to:

```tsx
            });
          })()}
        </div>
      )}

      {!loading && !error && bills.length >= 1 && bills.length < 3 && (
        <Link to="/add" className="history-nudge history-state-in">
          <span>Trend grafiğini ve cihaz artış uyarılarını görmek için en az 3 fatura ekle.</span>
          <span className="history-nudge-cta">+ Fatura ekle</span>
        </Link>
      )}
    </div>
  );
```

`Link` is already imported.

- [ ] **Step 2: Add styles to `src/screens/history/HistoryScreen.css`**

Add after the `.history-summary-value` rule from Task 3 (or after `.history-insight` if Task 3 hasn't landed):

```css
.history-nudge {
  display: flex; flex-direction: column; gap: .5rem; margin-top: 1rem;
  padding: 1rem 1.1rem; border-radius: var(--radius-lg);
  background: var(--accent-soft); color: var(--accent-strong);
  text-decoration: none; font-size: .82rem; font-weight: 600; line-height: 1.45;
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  transition: transform var(--dur-fast) var(--ease-out);
}
.history-nudge:active { transform: scale(.99); }
.history-nudge:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.history-nudge-cta { font-weight: 700; color: var(--accent); }
@media (prefers-reduced-motion: reduce) { .history-nudge { transition: none; } }
```

(`.history-state-in` already has its own reduced-motion guard in this file.)

- [ ] **Step 3: Verify**

```bash
npm run build
```
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/screens/history/HistoryScreen.tsx src/screens/history/HistoryScreen.css
git commit -m "feat: nudge users toward 3 bills on the History screen

Trend detection needs three bills. A user sitting at one or two saw no
indication that more bills unlock anything; a quiet tappable nudge below
the list now says so and links to the add flow.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Visual QA checklist for Mehmet:**
- History with 1 or 2 bills: nudge card appears below the list, tapping it opens the add flow.
- History with 0 bills: no nudge (the empty state already has its own CTA).
- History with 3+ bills: no nudge.

---

### Task 5: Profile — correct button emphasis

**Problem:** "Çıkış yap" uses `variant="destructive"` (red-tinted). Signing out is not destructive, and the red tint pulls the eye away from the only genuinely destructive control — "Hesabımı kalıcı olarak sil". Also, "Tanıtımı tekrar izle" and "Çıkış yap" would then both be `outline` and look identical.

**Fix:** Sign-out → `outline`. Replay-tour → `ghost` (lower emphasis — it's a rare action). Delete stays the lone danger-coloured control.

**Files:**
- Modify: `src/screens/profile/ProfileScreen.tsx` (two `<Button>` blocks, ~lines 277–296)

> Note: `ProfileScreen.tsx` is in the "already dirty" list. Verify with `git diff src/screens/profile/ProfileScreen.tsx` that the existing change doesn't touch these two buttons (it shouldn't — prior work was elsewhere in the file). Your commit rides along with it; note that in the body.

- [ ] **Step 1: Edit the two buttons**

Change (~line 277):

```tsx
      <Button
        variant="outline"
        size="lg"
        className="w-full h-12 text-base profile-in"
        style={{ '--i': 3 } as CSSProperties}
        onClick={onboarding.show}
      >
        <PlayCircle strokeWidth={1.8} />
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
```

to:

```tsx
      <Button
        variant="ghost"
        size="lg"
        className="w-full h-12 text-base profile-in"
        style={{ '--i': 3 } as CSSProperties}
        onClick={onboarding.show}
      >
        <PlayCircle strokeWidth={1.8} />
        Tanıtımı tekrar izle
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="w-full h-12 text-base profile-in"
        style={{ '--i': 4 } as CSSProperties}
        onClick={signOut}
      >
        Çıkış yap
      </Button>
```

- [ ] **Step 2: Verify**

```bash
npm run build
```
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/screens/profile/ProfileScreen.tsx
git commit -m "fix: stop styling sign-out as a destructive action on Profile

Sign-out was red-tinted (variant='destructive'), competing for attention
with the actual destructive control below it (permanent account deletion).
Sign-out is now a neutral outline button and 'replay tour' drops to ghost,
leaving delete as the only danger-coloured action on the screen.

Rides along with an unrelated uncommitted ProfileScreen.tsx change from an
earlier session.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Visual QA checklist for Mehmet:**
- Profile bottom: "Tanıtımı tekrar izle" is quiet (no border fill), "Çıkış yap" is a normal outline button, "Hesabımı kalıcı olarak sil" is the only red text.
- Dark mode: same hierarchy holds.
- All three still tappable, press feedback intact.

---

### Task 6: Profile — progressive disclosure of the watt list

**Problem:** The "Varsayılan watt değerleri" card renders a number input for *every* device in `DEVICE_CATALOG` — a long wall of inputs most users never touch.

**Fix:** Show only devices the user has overridden, plus the first few, then a toggle to reveal the rest.

**Files:**
- Modify: `src/screens/profile/ProfileScreen.tsx`
- Modify: `src/screens/profile/ProfileScreen.css`

- [ ] **Step 1: Add collapse state**

In `src/screens/profile/ProfileScreen.tsx`, add to the `useState` block near the top of the component (after `const [deleteError, …]`, ~line 27):

```tsx
  const [showAllDevices, setShowAllDevices] = useState(false);
```

- [ ] **Step 2: Compute the visible slice**

Just before `return (` (~line 157), add:

```tsx
  const DEVICES_COLLAPSED_COUNT = 4;
  const visibleDevices = showAllDevices
    ? DEVICE_CATALOG
    : DEVICE_CATALOG.filter(
        (device, i) =>
          i < DEVICES_COLLAPSED_COUNT ||
          (watts.get(device.key) ?? device.defaultWatt) !== device.defaultWatt
      );
  const hiddenDeviceCount = DEVICE_CATALOG.length - visibleDevices.length;
```

- [ ] **Step 3: Render the slice + toggle**

Change the non-loading branch of the device list (~lines 235–266) from `DEVICE_CATALOG.map((device, i) => {` to `visibleDevices.map((device, i) => {` — only that one identifier changes on that line:

```tsx
            : visibleDevices.map((device, i) => {
```

Then, immediately after the closing `})}` of that `.map` and before the `</CardContent>` that closes this card (~line 267), insert the toggle:

```tsx
          {!loading && (hiddenDeviceCount > 0 || showAllDevices) && (
            <button
              type="button"
              className="profile-devices-toggle"
              onClick={() => setShowAllDevices((v) => !v)}
            >
              {showAllDevices ? 'Daha az göster' : `Tüm cihazları göster (${hiddenDeviceCount})`}
            </button>
          )}
```

- [ ] **Step 4: Style the toggle in `src/screens/profile/ProfileScreen.css`**

Add after the `.profile-watt-reset` block (~line 41):

```css
.profile-devices-toggle {
  width: 100%; margin-top: .8rem; padding: .6rem; border: 0; background: transparent;
  color: var(--accent); font-family: inherit; font-size: .82rem; font-weight: 700; cursor: pointer;
  border-radius: var(--radius-md);
  transition: background-color var(--dur-fast) var(--ease-out);
}
.profile-devices-toggle:hover { background: var(--accent-soft); }
.profile-devices-toggle:active { transform: scale(.99); }
.profile-devices-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
@media (prefers-reduced-motion: reduce) { .profile-devices-toggle { transition: none; } }
```

- [ ] **Step 5: Verify**

```bash
npm run build
```
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/screens/profile/ProfileScreen.tsx src/screens/profile/ProfileScreen.css
git commit -m "feat: collapse the Profile watt list behind a show-all toggle

The default-watt card rendered an input for every catalogued device. It
now shows the first four plus any the user has overridden, with a
'Tüm cihazları göster (N)' toggle to reveal the rest.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Visual QA checklist for Mehmet:**
- Fresh account (no overrides): card shows 4 device rows + "Tüm cihazları göster (N)".
- Tap it: full list appears, toggle now says "Daha az göster". Tap again: collapses.
- Override a device's watts, collapse: that device stays visible even though it's past the first 4.
- Editing a watt value still saves (the reset arrow still appears on overridden rows).
- Row entrance stagger still looks right (no huge delay on the newly revealed rows — the `--i` cap at 12 already handles this).

---

### Task 7: BottomNav — always-visible labels

**Problem:** Only the active tab shows its text label; inactive tabs are icon-only, which hurts discoverability (`nav-label-icon` guideline). The reveal also animates `max-height` — a non-compositor property this project's own rules forbid.

**Fix:** Show every tab's label at all times. The active tab is distinguished by colour + weight (already colour; add weight) and the existing icon lift. Remove the `max-height` animation entirely.

**Files:**
- Modify: `src/components/BottomNav.css` only (no JSX change — the label span is always rendered already)

- [ ] **Step 1: Replace the label rules**

In `src/components/BottomNav.css`, replace (currently lines ~36–40):

```css
.bottom-nav__label {
  max-height: 0; margin-top: 0; opacity: 0; overflow: hidden;
  transition: max-height var(--dur-fast) var(--ease-out), opacity var(--dur-fast) var(--ease-out), margin-top var(--dur-fast) var(--ease-out);
}
.bottom-nav__item.active .bottom-nav__label { max-height: 1rem; margin-top: .2rem; opacity: 1; }
```

with:

```css
.bottom-nav__label {
  margin-top: .15rem; font-size: .64rem; font-weight: 600; line-height: 1;
}
.bottom-nav__item.active .bottom-nav__label { font-weight: 700; }
```

- [ ] **Step 2: Tighten the item so two lines fit the bar height**

Change `.bottom-nav__item` (currently lines ~23–30) — only the `padding` value changes:

```css
.bottom-nav__item {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-decoration: none; color: var(--ink-faint); font-size: .68rem; font-weight: 600;
  min-width: 56px; min-height: 44px; padding: .15rem 0;
  border-radius: var(--radius-md);
  transition: color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
```

- [ ] **Step 3: Drop `.bottom-nav__label` from the reduced-motion guard**

It no longer animates. Change (line ~59):

```css
@media (prefers-reduced-motion: reduce) {
  .bottom-nav__item, .bottom-nav__icon, .bottom-nav__fab, .bottom-nav__label { transition: none; }
}
```

to:

```css
@media (prefers-reduced-motion: reduce) {
  .bottom-nav__item, .bottom-nav__icon, .bottom-nav__fab { transition: none; }
}
```

- [ ] **Step 4: Verify**

```bash
npm run build
```
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/BottomNav.css
git commit -m "fix: always show BottomNav labels instead of only the active tab

Icon-only inactive tabs hurt discoverability, and the active-tab label
reveal animated max-height — a non-compositor property this project's
motion rules forbid. Every tab now carries its label at all times; the
active tab is set apart by colour, weight and the existing icon lift.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Visual QA checklist for Mehmet:**
- All three tabs (Ana Sayfa / Geçmiş / Profil) show their text under the icon at all times.
- Active tab: purple + bolder. Inactive: grey.
- The sliding pill still tracks the active tab; nothing overflows the bar; FAB unaffected.
- Labels don't collide with the ad banner or the home-indicator safe area.
- Switching tabs no longer has a vertical expand/collapse motion — just the colour + pill slide.

---

### Task 8: Route-change transition continuity

**Problem:** Switching tabs swaps screens instantly. Each screen has its own entrance animation for *its content*, but there's no container-level continuity — the swap itself is abrupt.

**Fix:** Wrap the routed view in a keyed container that does a fast opacity fade on each path change. Keep it subtle (opacity only, short) so it layers cleanly under each screen's existing content animations.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Key a fade wrapper around `<Routes>` in `src/App.tsx`**

Add `useLocation` to the router import (line ~2):

```tsx
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
```

In `AuthedShell`, add near the other hooks (after `const autoShown = useRef(false);`, ~line 18):

```tsx
  const location = useLocation();
```

Change the returned markup (~lines 37–50) from:

```tsx
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
```

to:

```tsx
  return (
    <>
      <div className="route-view" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/add" element={<AddFlow />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/history/:billId" element={<HistoryDetailScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
      {onboarding.open && <OnboardingTour />}
    </>
  );
```

- [ ] **Step 2: Add the animation to `src/styles/global.css`**

Add after the `.form-error` rule (~line 87):

```css
/* Container-level fade on route change (keyed by pathname in App.tsx). Opacity
   only and short, so it sits under each screen's own content entrance anims. */
.route-view { animation: route-view-in var(--dur-base) var(--ease-out); }
@keyframes route-view-in { from { opacity: 0; } to { opacity: 1; } }
```

Add `.route-view` to the existing reduced-motion block at the bottom (~lines 91–93):

```css
@media (prefers-reduced-motion: reduce) {
  .animate-pulse { animation: none; }
  .route-view { animation: none; }
}
```

- [ ] **Step 3: Verify**

```bash
npm run build
```
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/styles/global.css
git commit -m "feat: fade the routed view on tab changes

Screen swaps were instant. A short opacity fade on a pathname-keyed
wrapper gives the navigation some continuity while staying subtle enough
to layer under each screen's own content entrance animations.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Visual QA checklist for Mehmet:**
- Tapping between tabs: the incoming screen fades in quickly (~220ms), no flash of empty/white.
- No double-bounce feeling — the fade should read as one motion with the screen's own content animation, not two.
- Deep link into `/history/:billId` and back still works; back button behaviour unchanged.
- With "reduce motion" on: instant swap, no fade.

---

### Task 9: Perf — remove `background-attachment: fixed`

**Problem:** `src/styles/global.css` sets `background-attachment: fixed` on `body`. In a mobile WebView this is a well-known scroll-jank / repaint source (and is effectively unsupported on some Android WebView versions).

**Fix:** Move the gradient onto a `position: fixed` pseudo-element layer behind everything. Same visual (background stays put while content scrolls), none of the `attachment: fixed` cost.

**Files:**
- Modify: `src/styles/global.css` (the `body` rule, ~lines 59–68)

- [ ] **Step 1: Replace the body background with a fixed layer**

Change (lines ~59–68):

```css
body {
  background:
    radial-gradient(1000px 560px at 100% -8%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 60%),
    radial-gradient(800px 480px at -8% 108%, color-mix(in srgb, var(--coral) 9%, transparent), transparent 60%),
    var(--bg);
  background-attachment: fixed;
  color: var(--ink);
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

to:

```css
body {
  background: var(--bg);
  color: var(--ink);
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
/* Fixed gradient layer behind all content — replaces `background-attachment:
   fixed` on body, which janks / repaints on scroll in the Android WebView. */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(1000px 560px at 100% -8%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 60%),
    radial-gradient(800px 480px at -8% 108%, color-mix(in srgb, var(--coral) 9%, transparent), transparent 60%),
    var(--bg);
}
```

- [ ] **Step 2: Verify no stacking-context regression**

Run: `grep -rn "z-index" src/styles src/components/BottomNav.css src/screens`
Expected: the app's own layers are `z-index: 0/1/10` (nav) and higher; nothing relies on a negative z-index. `body::before` at `z-index: -1` sits behind `#root` (which creates no stacking context of its own at the root). Confirm `#root` has no `position`/`z-index`/`opacity` in `global.css` that would trap the pseudo-element — baseline: `html, body, #root { height: 100%; margin: 0; }` only. Good.

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "perf: replace background-attachment:fixed with a fixed pseudo-element

background-attachment: fixed on body janks and forces repaints on scroll
in the Android WebView. The same 'background stays put while content
scrolls' look now comes from a position:fixed body::before layer at
z-index -1.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Visual QA checklist for Mehmet:**
- Every screen: the soft purple (top-right) and coral (bottom-left) glow is still there and still doesn't move when you scroll a long screen (Profile).
- No content sits *behind* the gradient / gets hidden.
- Dark mode background still correct.
- Scrolling Profile / a long History feels at least as smooth as before (ideally smoother).

---

### Task 10: Perf — tame the animated hero glow

**Problem:** `.home-hero-glow` animates a **blurred** element (`filter: blur(6px)`) on an infinite `9s` loop. Animating a `filter`ed node forces the compositor to re-rasterize every frame — measurable cost on a mid-range device, running forever while Home is visible.

**Fix:** Drop `filter: blur()` — bake the softness into the radial-gradient stops instead. Keep a gentle drift but slower and `transform`-only (already is), and hint the compositor. Reduced-motion already disables it (`global` guard at line ~75 lists `.home-hero-glow`).

**Files:**
- Modify: `src/screens/home/HomeScreen.css` (`.home-hero-glow` + `@keyframes home-hero-glow-drift`, ~lines 9–18)

> `HomeScreen.css` is in the "already dirty" list (and Task 1 also edits it). If Task 1 has landed, this composes on top. If not, same note as Task 1: the diff carries the prior `.home-card-wrap` fix — mention it in the body.

- [ ] **Step 1: Replace the glow rules**

Change (lines ~9–18):

```css
.home-hero-glow {
  position: absolute; inset: -20% -10% auto -10%; height: 220px;
  background: radial-gradient(closest-side, rgba(255,255,255,.4), transparent 70%);
  opacity: .5; filter: blur(6px); pointer-events: none;
  animation: home-hero-glow-drift 9s var(--ease-out) infinite alternate;
}
@keyframes home-hero-glow-drift {
  from { transform: translate(-6%, -4%) scale(1); }
  to { transform: translate(6%, 4%) scale(1.12); }
}
```

to:

```css
.home-hero-glow {
  position: absolute; inset: -20% -10% auto -10%; height: 220px;
  background: radial-gradient(closest-side, rgba(255,255,255,.34), rgba(255,255,255,.12) 45%, transparent 75%);
  opacity: .55; pointer-events: none; will-change: transform;
  animation: home-hero-glow-drift 16s ease-in-out infinite alternate;
}
@keyframes home-hero-glow-drift {
  from { transform: translate3d(-4%, -3%, 0) scale(1); }
  to { transform: translate3d(4%, 3%, 0) scale(1.08); }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/screens/home/HomeScreen.css
git commit -m "perf: drop filter:blur from the animated home hero glow

The glow ran an infinite drift animation on a blur()-filtered element,
forcing a full re-raster every frame for as long as Home was on screen.
The blur is now baked into the gradient's own falloff, the drift is
transform-only (translate3d) on a slower, calmer curve, and reduced-motion
still disables it.

If applied before task 1's hero work, this diff also carries a
.home-card-wrap z-index fix from an earlier session.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Visual QA checklist for Mehmet:**
- Home hero: still has a soft light bloom near the top; the drift is slower and calmer, edges still soft (no hard gradient ring).
- Watch the FPS overlay (or just feel it) on Home for 20–30s — the glow shouldn't cost anything noticeable now.
- Reduce-motion on: glow is static.

---

### Task 11: Chore — remove unused `animejs` dependency

**Problem:** `animejs` is in `package.json` `dependencies` but imported nowhere in `src/` (verified: only `package.json` / lockfiles reference it). Dead weight in the bundle graph and an easy source of confusion ("do we animate with anime.js or CSS?" — the answer is CSS, everywhere).

**Fix:** Uninstall it.

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm)

> `package.json` is in the "already dirty" list. Run `git diff package.json` first and read the existing change. If the existing change is unrelated to dependencies (likely — prior sessions added scripts/assets), `npm uninstall` will cleanly remove just the `animejs` line and you commit both hunks, noting the pre-existing one in the body. **If** the existing dirty change itself involves `animejs`, stop and ask Mehmet instead.

- [ ] **Step 1: Confirm it's unused**

Run: `grep -rn "animejs\|from 'animejs'\|require('animejs')" src/`
Expected: no matches.

- [ ] **Step 2: Uninstall**

```bash
npm uninstall animejs
```
Expected: `animejs` removed from `package.json` `dependencies`; `package-lock.json` updated.

- [ ] **Step 3: Verify**

```bash
npm run build
npm test
```
Expected: build passes; all tests pass — nothing referenced the package.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused animejs dependency

animejs was a dependency but imported nowhere — every animation in the app
is hand-written CSS on the --dur-*/--ease-out tokens. Dropping it removes
an unused package and the ambiguity about which animation approach the
project uses.

(package.json also carries unrelated uncommitted changes from earlier
sessions.)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Visual QA checklist for Mehmet:** none — no runtime change. Just confirm `npm run dev` still boots.

---

### Task 12: Login — make the "confirm your email" message a prominent callout

**Problem:** After signup with email confirmation pending, the message "Hesabını onaylamak için e-postana gelen bağlantıya tıkla." renders through `.login-reset-sent` — a thin centred line of green text, visually identical to the password-reset confirmation and easy to miss. It's the single most important instruction on the screen at that moment (the user cannot proceed until they act on it).

**Fix:** Give the signup-confirmation message its own callout style — a bordered, tinted block with a mail icon — distinct from the subtle reset-confirmation line. Strengthen the copy slightly. Leave `.login-reset-sent` (password reset) as-is.

> Context note: the Supabase "Confirm email" toggle (Authentication → Providers → Email) is currently **off**, so `signUp` returns a session immediately and this `info` message never actually renders today. This task makes it ready for when that toggle is enabled (a separate manual dashboard change). The work is still worth doing now; just don't expect to see it on-device until the toggle flips.

**Files:**
- Modify: `src/screens/auth/LoginScreen.tsx` (import line ~2; the message text ~line 71; the `{info && …}` render ~line 188)
- Modify: `src/screens/auth/LoginScreen.css`

- [ ] **Step 1: Add the icon import**

In `src/screens/auth/LoginScreen.tsx`, change (line ~2):

```tsx
import { Mail, Lock } from 'lucide-react';
```

to:

```tsx
import { Mail, Lock, MailCheck } from 'lucide-react';
```

- [ ] **Step 2: Strengthen the message copy**

Change (line ~71):

```tsx
          setInfo('Hesabını onaylamak için e-postana gelen bağlantıya tıkla.');
```

to:

```tsx
          setInfo('Son bir adım: e-postana gönderdiğimiz onay bağlantısına tıkla, sonra buradan giriş yap.');
```

- [ ] **Step 3: Render it as a callout instead of a plain line**

Change (line ~188):

```tsx
      {error && <p className="form-error">{error}</p>}
      {info && <p className="login-reset-sent">{info}</p>}
```

to:

```tsx
      {error && <p className="form-error">{error}</p>}
      {info && (
        <div className="login-confirm-callout" role="status">
          <MailCheck size={18} strokeWidth={1.8} />
          <p>{info}</p>
        </div>
      )}
```

- [ ] **Step 4: Add the callout style to `src/screens/auth/LoginScreen.css`**

Add after the `.login-reset-sent` rule (line ~23):

```css
.login-confirm-callout {
  display: flex; align-items: flex-start; gap: .6rem; margin-top: .9rem;
  padding: .9rem 1rem; border-radius: var(--radius-lg);
  background: var(--accent-soft); color: var(--accent-strong);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  animation: login-confirm-callout-in var(--dur-base) var(--ease-out);
}
.login-confirm-callout svg { flex: none; margin-top: .1rem; color: var(--accent); }
.login-confirm-callout p { margin: 0; font-size: .86rem; font-weight: 600; line-height: 1.45; text-align: left; }
@keyframes login-confirm-callout-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
```

Add `.login-confirm-callout` to the existing reduced-motion guard. Change (line ~27):

```css
@media (prefers-reduced-motion: reduce) {
  .login-glow, .login-in { animation: none; }
}
```

to:

```css
@media (prefers-reduced-motion: reduce) {
  .login-glow, .login-in, .login-confirm-callout { animation: none; }
}
```

- [ ] **Step 5: Verify**

```bash
npm run build
```
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/screens/auth/LoginScreen.tsx src/screens/auth/LoginScreen.css
git commit -m "feat: surface the email-confirmation instruction as a callout on Login

After signup with confirmation pending, the 'click the link in your email'
line looked identical to the subtle password-reset confirmation and was
easy to miss — despite being the one thing the user must act on to
proceed. It's now a bordered, icon-led callout with firmer copy. The
password-reset line is unchanged.

(Only visible once Supabase's 'Confirm email' toggle is enabled.)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Visual QA checklist for Mehmet:**
- Temporarily enable Supabase "Confirm email", sign up with a fresh address: the message appears as a tinted bordered block with a mail-check icon, left-aligned text, clearly separated from the form.
- Password-reset "Şifre sıfırlama bağlantısı e-postana gönderildi." is still the plain subtle line (unchanged).
- Dark mode: callout readable, border visible.
- Re-disable the toggle afterward if that's still the intended config.

---

## Self-review notes

- **Spec coverage:** All 10 findings from the audit map to tasks: hero dead-space → T1; donut gaps + donut-only layout → T2; History single-bill/empty → T3 + T4; Profile button emphasis → T5; Profile watt-list load → T6; BottomNav labels + `max-height` anim → T7; screen-transition continuity → T8; `background-attachment: fixed` → T9; animated blur glow → T10. Plus T11 (unused dep) surfaced while reading `package.json`, and T12 (login email-confirmation callout) added at Mehmet's request. The audit's "hero number font inconsistency" item was dropped — `HomeScreen.tsx:142` already applies `.mono` to `.home-hero-total`, so there is nothing to fix.
- **Independence:** No task depends on another. T1 and T10 both edit `HomeScreen.css` in non-overlapping rules; T2, T5, T11 touch files already carrying unrelated dirty hunks — each of those tasks says how to handle it. If two of these are run back-to-back in the same tree, commit the first before starting the second so the "already dirty" notes stay accurate.
- **Types:** `donutSegmentGradient(startPct, endPct, color, gapPct)` and `summarizeBills(bills): BillSummary | null` are used with exactly the signatures they're defined with. `BillTotal` (`{ total_tl: number }`) matches the shape `HistoryScreen`'s `BillRow` already has.
- **Test count:** baseline 18 → +4 (T2) +3 (T3) = 25 when all tasks land.
- **Placeholders:** none — every code step carries full code.

---

## Execution handoff

Each task is written to run standalone in a fresh session. For a given task, start the session with:

> Implement Task N from `docs/superpowers/plans/2026-08-30-ui-ux-motion-polish.md`. Read the "Shared context for every session" block first.

Recommended order if you do want one: **11 → 9 → 10 → 7 → 5 → 12 → 1 → 2 → 3 → 4 → 6 → 8** (cheap/low-risk chores and pure-CSS perf first, JSX-heavier and helper-extracting tasks later, the route-transition change last since it's the broadest-reaching). But any order is fine.
