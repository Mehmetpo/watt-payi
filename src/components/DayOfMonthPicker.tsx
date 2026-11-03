import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { useI18n } from '../i18n/I18nContext';
import './DayOfMonthPicker.css';

export interface DayOfMonthPickerProps {
  value: number;
  onChange: (day: number) => void;
  max?: number;
  labelId?: string;
}

export function DayOfMonthPicker({ value, onChange, max = 28, labelId }: DayOfMonthPickerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const days = Array.from({ length: max }, (_, i) => i + 1);
  const gridId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) selectedRef.current?.focus();
  }, [open]);

  function selectDay(day: number) {
    onChange(day);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="day-picker">
      <button
        type="button"
        ref={triggerRef}
        className="day-picker-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={gridId}
        aria-labelledby={labelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          {t('dayPicker.pre')}
          <strong className="mono">
            {value}
            {t('dayPicker.daySuffix')}
          </strong>
          {t('dayPicker.post')}
        </span>
        <ChevronDown size={15} strokeWidth={2} className={'day-picker-chevron' + (open ? ' open' : '')} />
      </button>
      {open && (
        <div id={gridId} className="day-picker-grid" role="group" aria-label={t('dayPicker.aria')}>
          {days.map((day) => (
            <button
              type="button"
              key={day}
              ref={day === value ? selectedRef : undefined}
              className={cn('day-picker-cell mono', day === value && 'selected')}
              aria-pressed={day === value}
              onClick={() => selectDay(day)}
            >
              {day}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
