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
