'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';

export default function LabDetailPage() {
  const { isAuthenticated, isLoading } = useAuth({ required: true, role: 'SuperAdmin' });
  const params = useParams();
  const labId = params.labId as string;
  const qc = useQueryClient();

  const lab = useQuery({
    queryKey: ['super', 'lab', labId],
    queryFn: () => api.getLabDetail(labId),
    enabled: isAuthenticated && !isLoading && !!labId,
  });

  const admins = useQuery({
    queryKey: ['super', 'lab', labId, 'admins'],
    queryFn: () => api.listLabAdmins(labId),
    enabled: isAuthenticated && !isLoading && !!labId,
  });

  const setStatus = useMutation({
    mutationFn: (s: 'Active' | 'Suspended') => api.setLabStatus(labId, s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super', 'lab', labId] }),
  });

  const setAdminStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Active' | 'Disabled' }) =>
      api.setLabAdminStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super', 'lab', labId, 'admins'] }),
  });

  if (lab.isLoading) return <LoadingState />;
  if (lab.error) return <ErrorState message={(lab.error as Error).message} onRetry={() => lab.refetch()} />;
  if (!lab.data) return null;

  return (
    <div className="stack stack-6">
      <div className="page-header">
        <div>
          <Link href="/super/labs" className="muted">← All labs</Link>
          <h1 className="page-title">{lab.data.name}</h1>
          <p className="page-subtitle">License #{lab.data.licenseNumber}</p>
        </div>
        <div className="flex gap-2">
          {lab.data.status === 'Active' ? (
            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm(`Suspend ${lab.data!.name}? LabAdmins will be locked out.`)) {
                  setStatus.mutate('Suspended');
                }
              }}
            >
              Suspend lab
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setStatus.mutate('Active')}>
              Re-activate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4">
        <Tile label="Status" value={lab.data.status} />
        <Tile label="Patients" value={lab.data.counts.patientCount} />
        <Tile label="Reports 7d" value={lab.data.counts.reportsLast7} />
        <Tile label="Reports 30d" value={lab.data.counts.reportsLast30} />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Lab admins</div>
          <CreateAdminButton labId={labId} onCreated={() => admins.refetch()} />
        </div>
        <div className="card-body card-body--flush">
          {admins.isLoading && <LoadingState />}
          {admins.error && (
            <ErrorState message={(admins.error as Error).message} onRetry={() => admins.refetch()} />
          )}
          {admins.data && admins.data.length === 0 && (
            <EmptyState title="No admins yet" body="Create the first lab admin to begin." />
          )}
          {admins.data && admins.data.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Last login</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {admins.data.map((a) => (
                    <tr key={a._id}>
                      <td>{a.name}</td>
                      <td>{a.phone}</td>
                      <td>
                        <span className={`badge ${a.status === 'Active' ? 'badge-success' : 'badge-error'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="muted">
                        {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : '—'}
                      </td>
                      <td>
                        {a.status === 'Active' ? (
                          <button
                            className="btn btn-ghost"
                            onClick={() => setAdminStatus.mutate({ id: a._id, status: 'Disabled' })}
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            className="btn btn-ghost"
                            onClick={() => setAdminStatus.mutate({ id: a._id, status: 'Active' })}
                          >
                            Re-enable
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
    </div>
  );
}

function CreateAdminButton({ labId, onCreated }: { labId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tempPwd, setTempPwd] = useState('');
  const [err, setErr] = useState('');

  const create = useMutation({
    mutationFn: () => api.createLabAdmin(labId, { name, phone, temporaryPassword: tempPwd }),
    onSuccess: () => {
      setOpen(false);
      setName(''); setPhone(''); setTempPwd('');
      onCreated();
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (!open) return <button className="btn btn-secondary" onClick={() => setOpen(true)}>Add lab admin</button>;
  return (
    <form
      onSubmit={(e: FormEvent) => { e.preventDefault(); setErr(''); create.mutate(); }}
      className="flex gap-2 items-end flex-wrap"
    >
      <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      <input
        className="input"
        type="text"
        placeholder="Temp password (≥10, letter+digit)"
        value={tempPwd}
        onChange={(e) => setTempPwd(e.target.value)}
        required
        minLength={10}
      />
      <button type="submit" className="btn btn-primary" disabled={create.isPending}>
        {create.isPending ? '…' : 'Create'}
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      {err && <span className="alert alert-error">{err}</span>}
    </form>
  );
}
