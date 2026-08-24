import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: ReactNode;
  message: string;
  actionTo?: string;
  actionLabel?: string;
}

/** Icon badge + message + optional CTA. Parent supplies the outer wrapper (Card, bare div, …) and its own text/link styling. */
export function EmptyState({ icon, message, actionTo, actionLabel }: EmptyStateProps) {
  return (
    <>
      <div className="empty-icon-badge">{icon}</div>
      <p>{message}</p>
      {actionTo && actionLabel && <Link to={actionTo}>{actionLabel}</Link>}
    </>
  );
}
