'use client';

import { ReactNode } from 'react';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="card">
      <div className="card-body">
        <div className="skeleton skeleton-line" style={{ width: '40%' }} />
        <div className="skeleton skeleton-line" style={{ width: '70%' }} />
        <div className="skeleton skeleton-line" style={{ width: '60%' }} />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card" role="alert">
      <div className="card-body">
        <div className="empty">
          <div className="empty-title">Something went wrong</div>
          <div className="muted">{message}</div>
          {onRetry && (
            <button className="btn btn-secondary mt-3" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="empty">
          <div className="empty-title">{title}</div>
          {body && <div className="muted">{body}</div>}
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
