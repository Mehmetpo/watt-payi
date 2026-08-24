import { Skeleton } from './ui/skeleton';
import './BillBreakdownSkeleton.css';

// Mirrors BillBreakdown's rendered shape (donut + total, then icon/name/amount
// rows) so the loading state never jumps once real data arrives. Shared by
// every screen that loads a BillBreakdown: HomeScreen and HistoryDetailScreen.
export function BillBreakdownSkeleton() {
  return (
    <div className="breakdown-skeleton">
      <div className="breakdown-skeleton-summary">
        <Skeleton className="breakdown-skeleton-donut" />
        <Skeleton className="breakdown-skeleton-total" />
      </div>
      <div className="breakdown-skeleton-rows">
        {[0, 1, 2].map((i) => (
          <div className="breakdown-skeleton-row" key={i}>
            <Skeleton className="breakdown-skeleton-icon" />
            <div className="breakdown-skeleton-row-text">
              <Skeleton className="breakdown-skeleton-line" />
              <Skeleton className="breakdown-skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
