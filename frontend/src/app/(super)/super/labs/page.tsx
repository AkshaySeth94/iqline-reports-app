'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';

export default function SuperLabsPage() {
  const { isAuthenticated, isLoading } = useAuth({ required: true, role: 'SuperAdmin' });
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const qc = useQueryClient();
  const labs = useQuery({
    queryKey: ['super', 'labs', search],
    queryFn: () => api.listLabs({ search: search.length >= 2 ? search : undefined }),
    enabled: isAuthenticated && !isLoading,
  });

  return (
    <div className="stack stack-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Labs</h1>
          <p className="page-subtitle">All partnered labs.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancel' : 'Register lab'}
        </button>
      </div>

      {showCreate && (
        <RegisterLabForm
          onCreated={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ['super', 'labs'] });
          }}
        />
      )}

      <div className="card">
        <div className="card-body">
          <input
            className="input"
            placeholder="Search by name or license #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {labs.isLoading && <LoadingState />}
      {labs.error && (
        <ErrorState message={(labs.error as Error).message} onRetry={() => labs.refetch()} />
      )}
      {labs.data && labs.data.items.length === 0 && (
        <EmptyState
          title="No labs yet"
          body="Register your first partnered lab to get started."
          action={
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Register lab
            </button>
          }
        />
      )}
      {labs.data && labs.data.items.length > 0 && (
        <div className="card">
          <div className="card-body card-body--flush">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>License #</th>
                    <th>Status</th>
                    <th>Patients</th>
                    <th>Reports</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {labs.data.items.map((l) => (
                    <tr key={l._id}>
                      <td>
                        <Link href={`/super/labs/${l._id}`}>{l.name}</Link>
                      </td>
                      <td>{l.licenseNumber}</td>
                      <td>
                        <span className={`badge ${l.status === 'Active' ? 'badge-success' : 'badge-error'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td>{l.patientCount ?? 0}</td>
                      <td>{l.reportCount ?? 0}</td>
                      <td className="muted">
                        {new Date(l.createdAt).toLocaleDateString()}
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

function RegisterLabForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [city, setCity] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [err, setErr] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api.createLab({
        name,
        licenseNumber,
        address: city ? { city } : undefined,
        primaryContactName: contactName || undefined,
        primaryContactPhone: contactPhone || undefined,
        primaryContactEmail: contactEmail || undefined,
      } as any),
    onSuccess: () => onCreated(),
    onError: (e: Error) => setErr(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    create.mutate();
  };

  return (
    <form onSubmit={submit} className="card">
      <div className="card-header">
        <div className="card-title">Register lab</div>
      </div>
      <div className="card-body grid grid-cols-2 gap-4">
        <div className="field">
          <label className="field-label" htmlFor="lab-name">Name</label>
          <input id="lab-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="lab-license">License #</label>
          <input id="lab-license" className="input" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="lab-city">City</label>
          <input id="lab-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="lab-contact-name">Primary contact</label>
          <input id="lab-contact-name" className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="lab-contact-phone">Contact phone</label>
          <input id="lab-contact-phone" className="input" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="lab-contact-email">Contact email</label>
          <input id="lab-contact-email" className="input" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </div>
        {err && <div className="alert alert-error col-span-2">{err}</div>}
        <div className="col-span-2">
          <button type="submit" className="btn btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create lab'}
          </button>
        </div>
      </div>
    </form>
  );
}
