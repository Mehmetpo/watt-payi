import { useState, type CSSProperties } from 'react';
import { ApplianceIcon } from './ApplianceIcon';
import { useCountUp } from '../hooks/useCountUp';
import type { BillItem } from '../types/domain';
import './BillBreakdown.css';

const CAT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];

export interface BillBreakdownProps {
  totalTl: number;
  items: Pick<BillItem, 'deviceKey' | 'deviceName' | 'calibratedTl' | 'pctShare'>[];
  iconKeyFor: (deviceKey: string | null) => string;
  /** Hide the total figure next to the donut — for screens (Home) that already lead with it. */
  showTotal?: boolean;
}

export function BillBreakdown({ totalTl, items, iconKeyFor, showTotal = true }: BillBreakdownProps) {
  const [active, setActive] = useState<number | null>(null);
  const sorted = [...items].sort((a, b) => b.calibratedTl - a.calibratedTl);
  const top = sorted[0];
  const totalDisplay = useCountUp(Math.round(totalTl));

  let acc = 0;
  const arcs = sorted.map((item, i) => {
    const start = acc;
    acc += item.pctShare;
    return { ...item, start, end: acc, color: CAT_COLORS[i % CAT_COLORS.length] };
  });

  function toggle(i: number) {
    setActive((prev) => (prev === i ? null : i));
  }

  return (
    <div>
      <div className="breakdown-summary">
        <div className="breakdown-donut">
          {arcs.length === 0 && <div className="breakdown-donut-seg" style={{ background: 'var(--surface-sunken)' }} />}
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
          {top && (
            <div className="breakdown-donut-center" style={{ color: CAT_COLORS[0] }}>
              <ApplianceIcon iconKey={iconKeyFor(top.deviceKey)} size={20} />
              <span className="breakdown-donut-top-name">{top.deviceName}</span>
              <span className="breakdown-donut-top-pct mono">%{top.pctShare.toFixed(0)}</span>
            </div>
          )}
        </div>
        {showTotal && (
          <div className="breakdown-total mono">
            {totalDisplay.toLocaleString('tr-TR')}
            <span>TL</span>
          </div>
        )}
      </div>

      <div className="breakdown-list">
        {arcs.map((item, i) => (
          <div
            className={'breakdown-row' + (active !== null && active !== i ? ' dim' : '')}
            key={item.deviceKey ?? item.deviceName}
            style={{ '--i': i } as CSSProperties}
            onClick={() => toggle(i)}
          >
            <div
              className="breakdown-icon"
              style={{ background: `color-mix(in srgb, ${item.color} 15%, transparent)`, color: item.color }}
            >
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
                  style={{ transform: `scaleX(${item.pctShare / 100})`, background: item.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
