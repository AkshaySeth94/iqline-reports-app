'use client';

import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { LoadingState, ErrorState } from '@/components/States';

/** Surfaces the LabAdmin's own lab profile prominently on the panel. */
export default function LabInfoCard() {
  const lab = useQuery({
    queryKey: ['lab', 'mine'],
    queryFn: () => api.getMyLab(),
    staleTime: 60_000,
  });

  if (lab.isLoading) return <LoadingState />;
  if (lab.error) {
    return (
      <ErrorState
        message={(lab.error as Error).message}
        onRetry={() => lab.refetch()}
      />
    );
  }
  if (!lab.data) return null;

  const l = lab.data;
  const addr = l.address;
  const addrLine = [
    addr?.line1,
    addr?.line2,
    addr?.city,
    addr?.state,
    addr?.postalCode,
    addr?.country,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <section className="card" aria-labelledby="lab-info-title">
      <div className="card-header">
        <div>
          <div id="lab-info-title" className="card-title">
            Your lab
          </div>
          <div className="card-subtitle">Active context for everything you do here.</div>
        </div>
        <span
          className={`badge ${l.status === 'Active' ? 'badge-success' : 'badge-error'}`}
        >
          {l.status}
        </span>
      </div>
      <div className="card-body grid grid-cols-2 gap-3">
        <Field label="Name" value={l.name} />
        <Field label="License #" value={l.licenseNumber} />
        {addrLine && <Field label="Address" value={addrLine} wide />}
        {l.primaryContactName && (
          <Field label="Primary contact" value={l.primaryContactName} />
        )}
        {l.primaryContactPhone && (
          <Field label="Contact phone" value={l.primaryContactPhone} />
        )}
        {l.primaryContactEmail && (
          <Field label="Contact email" value={l.primaryContactEmail} />
        )}
      </div>
      {l.status === 'Suspended' && (
        <div className="card-body" style={{ paddingTop: 0 }}>
          <div className="alert alert-error" role="alert">
            This lab is currently suspended. Contact your platform admin to restore
            access.
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`field ${wide ? 'col-span-2' : ''}`}>
      <span className="field-label">{label}</span>
      <span>{value}</span>
    </div>
  );
}
