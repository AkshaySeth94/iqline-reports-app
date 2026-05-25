'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import PatientDrawer from './PatientDrawer';
import LabInfoCard from './LabInfoCard';
import type { PatientListItem, PatientSearchResult } from '@/types';

export default function LabAdminPanelPage() {
  const { user, isAuthenticated, isLoading } = useAuth({
    required: true,
    role: ['LabAdmin', 'Admin'],
  });
  const qc = useQueryClient();

  const [phone, setPhone] = useState('');
  const [searchResult, setSearchResult] = useState<PatientSearchResult | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const list = useQuery({
    queryKey: ['lab', 'patients', user?.labId],
    queryFn: () => api.listLabPatients(),
    enabled: isAuthenticated && !isLoading,
  });

  // Debounced search
  useEffect(() => {
    if (!phone || phone.length < 10) {
      setSearchResult(null);
      return;
    }
    const t = setTimeout(() => {
      api.searchPatient(phone).then(setSearchResult).catch(() => setSearchResult(null));
    }, 300);
    return () => clearTimeout(t);
  }, [phone]);

  const link = useMutation({
    mutationFn: (patientId: string) => api.linkPatient(patientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab', 'patients'] });
      setSearchResult(null);
      setPhone('');
    },
  });

  return (
    <div className="stack stack-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">Find a patient by phone or register a new one.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + Add new patient
        </button>
      </div>

      <LabInfoCard />

      <div className="card">
        <div className="card-header">
          <div className="card-title">Find or add a patient</div>
        </div>
        <div className="card-body stack stack-4">
          <input
            className="input"
            type="tel"
            placeholder="Enter 10-digit phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
          />
          {searchResult && (
            <SearchResultPanel
              result={searchResult}
              onConfirmLink={(pid) => link.mutate(pid)}
              onAddNew={() => setShowAddModal(true)}
              onSelectInLab={(pid) => setSelectedPatientId(pid)}
              busy={link.isPending}
            />
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Your lab&apos;s patients</div>
        </div>
        <div className="card-body card-body--flush">
          {list.isLoading && <LoadingState />}
          {list.error && (
            <ErrorState message={(list.error as Error).message} onRetry={() => list.refetch()} />
          )}
          {list.data && list.data.items.length === 0 && (
            <EmptyState title="No patients yet" body="Use the search above to add your first patient." />
          )}
          {list.data && list.data.items.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>DOB</th>
                    <th>Visiting since</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((p: PatientListItem) => (
                    <tr key={p.patientId}>
                      <td>{p.name}</td>
                      <td>{p.phone}</td>
                      <td className="muted">
                        {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : '—'}
                      </td>
                      <td className="muted">{new Date(p.linkedAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-ghost" onClick={() => setSelectedPatientId(p.patientId)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddPatientModal
          initialPhone={phone}
          onClose={() => setShowAddModal(false)}
          onCreated={(patientId) => {
            setShowAddModal(false);
            qc.invalidateQueries({ queryKey: ['lab', 'patients'] });
            setSelectedPatientId(patientId);
            setPhone('');
            setSearchResult(null);
          }}
        />
      )}

      {selectedPatientId && (
        <PatientDrawer patientId={selectedPatientId} onClose={() => setSelectedPatientId(null)} />
      )}
    </div>
  );
}

function SearchResultPanel({
  result,
  onConfirmLink,
  onAddNew,
  onSelectInLab,
  busy,
}: {
  result: PatientSearchResult;
  onConfirmLink: (patientId: string) => void;
  onAddNew: () => void;
  onSelectInLab: (patientId: string) => void;
  busy: boolean;
}) {
  if (result.status === 'in-lab' && result.patient) {
    return (
      <div className="card-inset">
        <div className="font-semibold">{result.patient.name}</div>
        <div className="muted">{result.patient.phone}</div>
        <button className="btn btn-primary mt-2" onClick={() => onSelectInLab(result.patient!._id)}>
          Open patient
        </button>
      </div>
    );
  }
  if (result.status === 'cross-lab' && result.patient) {
    return (
      <div className="card-inset" role="dialog" aria-label="Cross-lab match">
        <div className="font-semibold mb-1">Patient found in another lab</div>
        <div>
          <strong>{result.patient.name}</strong>
          {result.patient.dateOfBirth && (
            <span className="muted ml-2">
              DOB {new Date(result.patient.dateOfBirth).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="muted mt-1">Confirm identity before linking to your lab.</div>
        <div className="flex gap-2 mt-3">
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => onConfirmLink(result.patient!._id)}
          >
            Link to your lab
          </button>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>
            Cancel
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="card-inset">
      <div>No patient with that phone yet.</div>
      <button className="btn btn-primary mt-2" onClick={onAddNew}>
        + Add new patient
      </button>
    </div>
  );
}

function AddPatientModal({
  initialPhone,
  onClose,
  onCreated,
}: {
  initialPhone: string;
  onClose: () => void;
  onCreated: (patientId: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(initialPhone);
  const [dob, setDob] = useState('');
  const [tempPwd, setTempPwd] = useState('');
  const [err, setErr] = useState('');
  const [match, setMatch] = useState<any | null>(null);
  // Lock the field only when the modal was opened from search (phone already known)
  const phoneLocked = initialPhone.length > 0;

  const create = useMutation({
    mutationFn: () =>
      api.addAndLinkPatient({
        name,
        phone,
        dateOfBirth: dob,
        temporaryPassword: tempPwd,
      }),
    onSuccess: (res) => onCreated(res.patient._id),
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409 && e.data?.existing) {
        setMatch(e.data.existing);
      } else {
        setErr(e instanceof Error ? e.message : 'Failed to add patient');
      }
    },
  });

  const link = useMutation({
    mutationFn: (id: string) => api.linkPatient(id),
    onSuccess: (_data, id) => onCreated(id),
  });

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2 className="card-title mb-2">Add new patient</h2>
        {match ? (
          <>
            <p>Phone is already registered:</p>
            <div className="card-inset my-3">
              <strong>{match.name}</strong>
              {match.dateOfBirth && (
                <span className="muted ml-2">
                  DOB {new Date(match.dateOfBirth).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                onClick={() => link.mutate(match._id)}
                disabled={link.isPending}
              >
                Link to your lab
              </button>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); setErr(''); create.mutate(); }}
            className="stack stack-4"
          >
            <div className="field">
              <label className="field-label" htmlFor="ap-phone">Phone</label>
              <input
                id="ap-phone"
                className="input"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                readOnly={phoneLocked}
                required
                autoFocus={!phoneLocked}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="ap-name">Name</label>
              <input id="ap-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="ap-dob">Date of birth</label>
              <input id="ap-dob" className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="ap-pwd">Temporary password</label>
              <input
                id="ap-pwd"
                className="input"
                type="text"
                value={tempPwd}
                onChange={(e) => setTempPwd(e.target.value)}
                required
                minLength={10}
                placeholder="≥10 chars, letter + digit"
              />
              <span className="field-hint">
                The patient must change this on first login. Share it with them after creating.
              </span>
            </div>
            {err && <div className="alert alert-error">{err}</div>}
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={create.isPending}>
                {create.isPending ? 'Adding…' : 'Add patient'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
