'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { LoadingState, ErrorState } from '@/components/States';

export default function SuperDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth({
    required: true,
    role: 'SuperAdmin',
  });

  const tiles = useQuery({
    queryKey: ['super', 'metrics', 'tiles'],
    queryFn: () => api.getMetricsTiles(),
    enabled: isAuthenticated && !isLoading,
  });

  return (
    <div className="stack stack-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform overview</h1>
          <p className="page-subtitle">Welcome back, {user?.name || 'Platform Admin'}.</p>
        </div>
      </div>

      {tiles.isLoading && <LoadingState />}
      {tiles.error && <ErrorState message={(tiles.error as Error).message} onRetry={() => tiles.refetch()} />}
      {tiles.data && (
        <div className="grid grid-cols-4">
          <Tile label="Active labs" value={tiles.data.activeLabs} href="/super/labs" />
          <Tile label="Active patients" value={tiles.data.activePatients} />
          <Tile label="Reports — last 7d" value={tiles.data.reportsLast7Days} />
          <Tile label="Reports — last 30d" value={tiles.data.reportsLast30Days} />
        </div>
      )}

      <div className="grid grid-cols-2">
        <Link href="/super/labs" className="card card-link">
          <div className="card-header"><div className="card-title">Labs</div></div>
          <div className="card-body muted">Manage labs, lab admins, and suspensions.</div>
        </Link>
        <Link href="/super/audit" className="card card-link">
          <div className="card-header"><div className="card-title">Audit log</div></div>
          <div className="card-body muted">Search by actor, lab, action, and date.</div>
        </Link>
      </div>
    </div>
  );
}

function Tile({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const inner = (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
    </div>
  );
  return href ? <Link href={href} className="kpi-link">{inner}</Link> : inner;
}
