'use client';

import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';

export default function SuperAuditPage() {
  const { isAuthenticated, isLoading } = useAuth({ required: true, role: 'SuperAdmin' });
  const [filters, setFilters] = useState<{ actorId?: string; labId?: string; action?: string; from?: string; to?: string }>({});
  const [applied, setApplied] = useState(filters);

  const search = useQuery({
    queryKey: ['super', 'audit', applied],
    queryFn: () => api.searchAudit(applied),
    enabled: isAuthenticated && !isLoading,
  });

  const apply = (e: FormEvent) => {
    e.preventDefault();
    setApplied({ ...filters });
  };

  return (
    <div className="stack stack-6">
      <div className="page-header">
        <h1 className="page-title">Audit log</h1>
        <p className="page-subtitle">Search by actor, lab, action, and date.</p>
      </div>

      <form onSubmit={apply} className="card">
        <div className="card-body grid grid-cols-3 gap-3">
          <div className="field">
            <label className="field-label">Actor ID</label>
            <input className="input" value={filters.actorId || ''} onChange={(e) => setFilters({ ...filters, actorId: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">Lab ID</label>
            <input className="input" value={filters.labId || ''} onChange={(e) => setFilters({ ...filters, labId: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">Action</label>
            <input className="input" placeholder="e.g. report.created" value={filters.action || ''} onChange={(e) => setFilters({ ...filters, action: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">From</label>
            <input className="input" type="datetime-local" value={filters.from || ''} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">To</label>
            <input className="input" type="datetime-local" value={filters.to || ''} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
          <div className="field flex items-end">
            <button type="submit" className="btn btn-primary">Apply filters</button>
          </div>
        </div>
      </form>

      {search.isLoading && <LoadingState />}
      {search.error && <ErrorState message={(search.error as Error).message} onRetry={() => search.refetch()} />}
      {search.data && search.data.items.length === 0 && (
        <EmptyState title="No audit entries" body="Adjust your filters and try again." />
      )}
      {search.data && search.data.items.length > 0 && (
        <div className="card">
          <div className="card-body card-body--flush">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Lab</th>
                    <th>Action</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {search.data.items.map((row) => (
                    <tr key={row._id}>
                      <td className="muted">{new Date(row.createdAt).toLocaleString()}</td>
                      <td>
                        {row.actor ? (
                          <>
                            <strong>{row.actor.name}</strong>
                            <div className="muted text-sm">
                              {row.actorRole || row.actor.role}
                              {row.actor.phone ? ` · ${row.actor.phone}` : ''}
                            </div>
                          </>
                        ) : row.actorId === 'system' ? (
                          <span className="muted">system</span>
                        ) : (
                          <>
                            <code>{row.actorId.slice(0, 8)}…</code>
                            {row.actorRole && (
                              <span className="muted ml-1">{row.actorRole}</span>
                            )}
                          </>
                        )}
                      </td>
                      <td>
                        {row.lab ? (
                          <>
                            <strong>{row.lab.name}</strong>
                            <div className="muted text-sm">#{row.lab.licenseNumber}</div>
                          </>
                        ) : row.labId ? (
                          <code>{String(row.labId).slice(0, 8)}…</code>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td><code>{row.action}</code></td>
                      <td className="muted">
                        {row.targetType ? `${row.targetType}/${(row.targetId || '').slice(0, 8)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
