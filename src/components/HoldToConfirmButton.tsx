import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '../lib/utils';
import './HoldToConfirmButton.css';

interface HoldToConfirmButtonProps {
  onConfirm: () => void;
  holdDuration?: number;
  disabled?: boolean;
  idleLabel: ReactNode;
  holdingLabel: ReactNode;
  className?: string;
}

/** Press-and-hold destructive action — requires sustained intent instead of a single tap. */
export function HoldToConfirmButton({
  onConfirm,
  holdDuration = 1400,
  disabled = false,
  idleLabel,
  holdingLabel,
  className,
}: HoldToConfirmButtonProps) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start() {
    if (disabled || timerRef.current) return;
    setHolding(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setHolding(false);
      onConfirm();
    }, holdDuration);
  }

  function cancel() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHolding(false);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn('hold-confirm-btn', holding && 'holding', className)}
      style={{ '--hold-duration': `${holdDuration}ms` } as CSSProperties}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start();
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') cancel();
      }}
    >
      <span className="hold-confirm-fill" aria-hidden="true" />
      <span className="hold-confirm-label">{holding ? holdingLabel : idleLabel}</span>
    </button>
  );
}
