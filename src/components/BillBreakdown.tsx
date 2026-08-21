import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ApplianceIcon } from './ApplianceIcon';
import type { BillItem } from '../types/domain';
import './BillBreakdown.css';

const CAT_COLORS = ['#6D5EF0', '#FF5D5D', '#2BC5A0', '#E0A83F', '#3F8FE0', '#B85AC9', '#5AC98F', '#C97A3F'];

function useCountUp(target: number, durationMs = 550) {
  const [value, setValue] = useState(0);
  const reduceMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (reduceMotion.current) {
      setValue(target);
      return;
    }
    let raf: number;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

export interface BillBreakdownProps {
  totalTl: number;
  items: Pick<BillItem, 'deviceKey' | 'deviceName' | 'calibratedTl' | 'pctShare'>[];
  iconKeyFor: (deviceKey: string | null) => string;
}

export function BillBreakdown({ totalTl, items, iconKeyFor }: BillBreakdownProps) {
  const sorted = [...items].sort((a, b) => b.calibratedTl - a.calibratedTl);
  const top = sorted[0];
  const totalDisplay = useCountUp(Math.round(totalTl));

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
          {top && (
            <div className="breakdown-donut-center" style={{ color: CAT_COLORS[0] }}>
              <ApplianceIcon iconKey={iconKeyFor(top.deviceKey)} size={20} />
              <span className="breakdown-donut-top-name">{top.deviceName}</span>
              <span className="breakdown-donut-top-pct mono">%{top.pctShare.toFixed(0)}</span>
            </div>
          )}
        </div>
        <div className="breakdown-total mono">
          {totalDisplay.toLocaleString('tr-TR')}
          <span>TL</span>
        </div>
      </div>

      <div className="breakdown-list">
        {sorted.map((item, i) => {
          const color = CAT_COLORS[i % CAT_COLORS.length];
          return (
            <div
              className="breakdown-row"
              key={item.deviceKey ?? item.deviceName}
              style={{ '--i': i } as CSSProperties}
            >
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
                  <div
                    className="breakdown-fill"
                    style={{ transform: `scaleX(${item.pctShare / 100})`, background: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
