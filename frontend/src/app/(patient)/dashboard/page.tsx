'use client';

import { useEffect, useMemo, useState } from 'react';
import GlucoseChart from '@/components/GlucoseChart';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { Report } from '@/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusBadge(status: Report['status']) {
  if (status === 'Final') return <span className="badge badge-success">Final</span>;
  if (status === 'Corrected') return <span className="badge badge-warning">Corrected</span>;
  return <span className="badge">{status}</span>;
}

export default function PatientDashboardPage() {
  const { user } = useAuth({ required: true, role: 'Patient' });
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await api.getReports();
        setReports(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch reports.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const chartData = useMemo(
    () =>
      [...reports]
        .sort(
          (a, b) =>
            new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime(),
        )
        .map((report) => ({
          name: new Date(report.reportDate).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
          glucoseValue: report.data.glucoseValue,
        })),
    [reports],
  );

  const kpis = useMemo(() => {
    if (reports.length === 0) {
      return { latest: null as number | null, average: null as number | null, count: 0 };
    }
    const sorted = [...reports].sort(
      (a, b) =>
        new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime(),
    );
    const values = reports.map((r) => r.data.glucoseValue);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return {
      latest: sorted[0].data.glucoseValue,
      average: Math.round(avg * 10) / 10,
      count: reports.length,
    };
  }, [reports]);

  return (
    <div className="stack stack-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name || 'Patient'}</h1>
          <p className="page-subtitle">Your recent glucose reports and trends.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="card">
          <div className="card-body">
            <p className="muted">Loading dashboard…</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3">
            <div className="kpi">
              <span className="kpi-label">Latest glucose</span>
              <span className="kpi-value">
                {kpis.latest !== null ? kpis.latest : '—'}
                {kpis.latest !== null && (
                  <span className="kpi-meta ml-1.5">mg/dL</span>
                )}
              </span>
              <span className="kpi-meta">Most recent report value</span>
            </div>
            <div className="kpi">
              <span className="kpi-label">Average</span>
              <span className="kpi-value">
                {kpis.average !== null ? kpis.average : '—'}
                {kpis.average !== null && (
                  <span className="kpi-meta ml-1.5">mg/dL</span>
                )}
              </span>
              <span className="kpi-meta">Across all reports</span>
            </div>
            <div className="kpi">
              <span className="kpi-label">Reports</span>
              <span className="kpi-value">{kpis.count}</span>
              <span className="kpi-meta">Total on file</span>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Glucose trend</div>
                <div className="card-subtitle">Chronological values across all reports</div>
              </div>
            </div>
            <div className="card-body">
              <GlucoseChart data={chartData} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Your reports</div>
                <div className="card-subtitle">{reports.length} report{reports.length === 1 ? '' : 's'}</div>
              </div>
            </div>
            <div className="card-body card-body--flush">
              {reports.length === 0 ? (
                <div className="empty">
                  <div className="empty-title">No reports yet</div>
                  <div>New lab reports will appear here once they&apos;re published.</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Glucose</th>
                        <th>Status</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...reports]
                        .sort(
                          (a, b) =>
                            new Date(b.reportDate).getTime() -
                            new Date(a.reportDate).getTime(),
                        )
                        .map((report) => (
                          <tr key={report._id}>
                            <td>{formatDate(report.reportDate)}</td>
                            <td className="tabular-nums">
                              <strong>{report.data.glucoseValue}</strong>
                              <span className="muted ml-1">mg/dL</span>
                            </td>
                            <td>{statusBadge(report.status)}</td>
                            <td className="muted">{report.notes || '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
