import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import './DayOfMonthPicker.css';

export interface DayOfMonthPickerProps {
  value: number;
  onChange: (day: number) => void;
  max?: number;
}

export function DayOfMonthPicker({ value, onChange, max = 28 }: DayOfMonthPickerProps) {
  const [open, setOpen] = useState(false);
  const days = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className="day-picker">
      <button
        type="button"
        className="day-picker-trigger"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          Her ayın <strong className="mono">{value}.</strong> günü
        </span>
        <ChevronDown size={15} strokeWidth={2} className={'day-picker-chevron' + (open ? ' open' : '')} />
      </button>
      {open && (
        <div className="day-picker-grid">
          {days.map((day) => (
            <button
              type="button"
              key={day}
              className={cn('day-picker-cell mono', day === value && 'selected')}
              aria-pressed={day === value}
              onClick={() => {
                onChange(day);
                setOpen(false);
              }}
            >
              {day}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
