'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import GlucoseChart from '@/components/GlucoseChart';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { humanTimeBand, labColor, toMgDl } from '@/lib/palette';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import TosModal from './TosModal';
import type { AggregatedReport, MealContext } from '@/types';

function statusBadge(status: AggregatedReport['status']) {
  if (status === 'Final') return <span className="badge badge-success">Final</span>;
  return <span className="badge badge-warning">Corrected</span>;
}

export default function PatientDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth({
    required: true,
    role: 'Patient',
  });

  const reports = useQuery({
    queryKey: ['patient', 'reports'],
    queryFn: () => api.getMyReports(),
    enabled: isAuthenticated && !isLoading,
  });

  // ToS modal — show once per local-storage flag (server also tracks termsAcknowledgedAt)
  const [tosOpen, setTosOpen] = useState(false);
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;
    const acked = localStorage.getItem('patient.tosAck');
    if (!acked) setTosOpen(true);
  }, [isAuthenticated]);

  const [labFilter, setLabFilter] = useState<string | 'all'>('all');
  const [mealFilter, setMealFilter] = useState<MealContext | 'all'>('all');

  const allLabs = useMemo(() => {
    if (!reports.data) return [] as { id: string; name: string }[];
    const map = new Map<string, string>();
    for (const r of reports.data) {
      if (r.lab) map.set(r.lab._id, r.lab.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [reports.data]);

  const filtered = useMemo(() => {
    if (!reports.data) return [];
    return reports.data.filter((r) => {
      if (labFilter !== 'all' && r.lab?._id !== labFilter) return false;
      if (mealFilter !== 'all' && r.mealContext !== mealFilter) return false;
      return true;
    });
  }, [reports.data, labFilter, mealFilter]);

  const mostRecent = reports.data && reports.data.length > 0 ? reports.data[0] : null;

  return (
    <div className="stack stack-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name || 'Patient'}</h1>
          <p className="page-subtitle">Your glucose readings across every lab you&apos;ve visited.</p>
        </div>
      </div>

      {tosOpen && (
        <TosModal
          onAcknowledge={async () => {
            try { await api.ackTerms(); } catch { /* localStorage still suppresses */ }
            localStorage.setItem('patient.tosAck', new Date().toISOString());
            setTosOpen(false);
          }}
        />
      )}

      {reports.isLoading && <LoadingState />}
      {reports.error && (
        <ErrorState message={(reports.error as Error).message} onRetry={() => reports.refetch()} />
      )}
      {reports.data && reports.data.length === 0 && (
        <EmptyState
          title="You have no reports yet"
          body="Visit one of our partnered labs to add your first reading."
        />
      )}

      {reports.data && reports.data.length > 0 && (
        <>
          {mostRecent && (
            <div className="card">
              <div className="card-body flex justify-between items-center">
                <div>
                  <div className="muted">Most recent reading</div>
                  <div className="kpi-value">
                    {toMgDl((mostRecent.data as any).glucoseValue, mostRecent.unit)}
                    <span className="kpi-meta ml-1">mg/dL</span>
                  </div>
                  <div className="muted">
                    {mostRecent.lab?.name || 'Unknown lab'} · {humanTimeBand(mostRecent.reportDate)}
                  </div>
                </div>
                <span
                  className="lab-swatch"
                  style={{ background: labColor(mostRecent.lab?._id || null) }}
                  aria-hidden
                />
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-body stack stack-3">
              <div className="chips" role="group" aria-label="Filter by lab">
                <button className={`chip ${labFilter === 'all' ? 'chip-active' : ''}`} onClick={() => setLabFilter('all')}>
                  All labs
                </button>
                {allLabs.map((l) => (
                  <button
                    key={l.id}
                    className={`chip ${labFilter === l.id ? 'chip-active' : ''}`}
                    onClick={() => setLabFilter(l.id)}
                  >
                    <span className="lab-swatch-sm" style={{ background: labColor(l.id) }} aria-hidden /> {l.name}
                  </button>
                ))}
              </div>
              <div className="chips" role="group" aria-label="Filter by meal context">
                {(['all', 'Fasting', 'PostMeal', 'Random'] as const).map((m) => (
                  <button
                    key={m}
                    className={`chip ${mealFilter === m ? 'chip-active' : ''}`}
                    onClick={() => setMealFilter(m as any)}
                  >
                    {m === 'all' ? 'All meals' : m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Glucose trend</div>
                <div className="card-subtitle">Color + shape encode the source lab.</div>
              </div>
            </div>
            <div className="card-body">
              <GlucoseChart reports={filtered as AggregatedReport[]} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Reports</div>
                <div className="card-subtitle">{filtered.length} matching</div>
              </div>
            </div>
            <div className="card-body card-body--flush">
              {filtered.length === 0 ? (
                <EmptyState title="No reports match the current filters" />
              ) : (
                <div className="stack stack-2 p-3">
                  {filtered.map((r) => (
                    <article key={r._id} className="card-inset">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-semibold">
                            <span
                              className="lab-swatch-sm"
                              style={{ background: labColor(r.lab?._id || null) }}
                              aria-hidden
                            />{' '}
                            {r.lab?.name || 'Unknown lab'}
                            {r.lab?.status === 'Suspended' && (
                              <span className="badge badge-warning ml-2">Lab suspended</span>
                            )}
                          </div>
                          <div className="muted">{new Date(r.reportDate).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="kpi-value text-base">
                            <strong>{(r.data as any).glucoseValue}</strong>
                            <span className="kpi-meta ml-1">{r.unit}</span>
                          </div>
                          <div className="flex gap-1 justify-end mt-1">
                            <span className="badge">{r.mealContext}</span>
                            {statusBadge(r.status)}
                          </div>
                        </div>
                      </div>
                      {r.notes && <p className="muted mt-2">{r.notes}</p>}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
