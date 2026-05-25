'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import type { Report } from '@/types';

interface Props {
  patientId: string;
  onClose: () => void;
}

export default function PatientDrawer({ patientId, onClose }: Props) {
  const qc = useQueryClient();
  const [showNewReport, setShowNewReport] = useState(false);
  const [editing, setEditing] = useState<Report | null>(null);

  const patient = useQuery({
    queryKey: ['lab', 'patient', patientId],
    queryFn: () => api.getPatientDetail(patientId),
  });
  const reports = useQuery({
    queryKey: ['lab', 'patient', patientId, 'reports'],
    queryFn: () => api.listReportsForPatientThisLab(patientId),
  });

  const remove = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.deleteReport(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab', 'patient', patientId, 'reports'] }),
  });

  return (
    <div className="drawer-backdrop" role="dialog" aria-modal="true">
      <div className="drawer">
        <div className="drawer-header">
          <div>
            {patient.data && (
              <>
                <h2 className="card-title">{patient.data.name}</h2>
                <div className="muted">
                  {patient.data.phone}
                  {patient.data.dateOfBirth && (
                    <> · DOB {new Date(patient.data.dateOfBirth).toLocaleDateString()}</>
                  )}
                </div>
                <div className="muted">
                  Visiting since {new Date(patient.data.visitingSince).toLocaleDateString()}
                </div>
              </>
            )}
          </div>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>

        <div className="drawer-body stack stack-4">
          <div className="flex justify-between items-center">
            <h3 className="card-title">Reports</h3>
            <button className="btn btn-primary" onClick={() => setShowNewReport((v) => !v)}>
              {showNewReport ? 'Cancel' : 'New report'}
            </button>
          </div>

          {showNewReport && (
            <NewReportForm
              patientId={patientId}
              onSaved={() => {
                setShowNewReport(false);
                qc.invalidateQueries({ queryKey: ['lab', 'patient', patientId, 'reports'] });
              }}
            />
          )}

          {reports.isLoading && <LoadingState />}
          {reports.error && (
            <ErrorState
              message={(reports.error as Error).message}
              onRetry={() => reports.refetch()}
            />
          )}
          {reports.data && reports.data.length === 0 && (
            <EmptyState title="No reports for this patient at your lab yet" />
          )}
          {reports.data && reports.data.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Value</th>
                    <th>Meal</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.data.map((r) => (
                    <tr key={r._id}>
                      <td>{new Date(r.reportDate).toLocaleDateString()}</td>
                      <td className="tabular-nums">
                        <strong>{(r.data as any).glucoseValue}</strong>
                        <span className="muted ml-1">{r.unit}</span>
                      </td>
                      <td className="muted">{r.mealContext}</td>
                      <td>
                        <span className={`badge ${r.status === 'Final' ? 'badge-success' : 'badge-warning'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-ghost" onClick={() => setEditing(r)}>Edit</button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => {
                            const reason = prompt('Delete reason (optional):') || '';
                            if (confirm('Delete this report? (soft-delete)')) {
                              remove.mutate({ id: r._id, reason });
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editing && (
            <EditReportForm
              report={editing}
              onClose={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                qc.invalidateQueries({ queryKey: ['lab', 'patient', patientId, 'reports'] });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function NewReportForm({ patientId, onSaved }: { patientId: string; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [reportDate, setReportDate] = useState(today);
  const [glucoseValue, setGlucoseValue] = useState('');
  const [unit, setUnit] = useState<'mg/dL' | 'mmol/L'>('mg/dL');
  const [mealContext, setMealContext] = useState<'Fasting' | 'PostMeal' | 'Random'>('Random');
  const [status, setStatus] = useState<'Final' | 'Corrected'>('Final');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api.createReport({
        patient: patientId,
        reportDate: new Date(reportDate).toISOString(),
        glucoseValue: Number(glucoseValue),
        unit, mealContext, status, notes: notes || undefined,
      }),
    onSuccess: () => onSaved(),
    onError: (e) => setErr(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <form
      className="card"
      onSubmit={(e: FormEvent) => { e.preventDefault(); setErr(''); create.mutate(); }}
    >
      <div className="card-body grid grid-cols-2 gap-3">
        <div className="field">
          <label className="field-label">Date</label>
          <input className="input" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field-label">Value</label>
          <input className="input" type="number" min={0.1} step={0.1} value={glucoseValue} onChange={(e) => setGlucoseValue(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field-label">Unit</label>
          <div className="segmented">
            <button type="button" className="segmented-btn" aria-pressed={unit === 'mg/dL'} onClick={() => setUnit('mg/dL')}>mg/dL</button>
            <button type="button" className="segmented-btn" aria-pressed={unit === 'mmol/L'} onClick={() => setUnit('mmol/L')}>mmol/L</button>
          </div>
        </div>
        <div className="field">
          <label className="field-label">Meal context</label>
          <div className="segmented">
            <button type="button" className="segmented-btn" aria-pressed={mealContext === 'Fasting'} onClick={() => setMealContext('Fasting')}>Fasting</button>
            <button type="button" className="segmented-btn" aria-pressed={mealContext === 'PostMeal'} onClick={() => setMealContext('PostMeal')}>Post-meal</button>
            <button type="button" className="segmented-btn" aria-pressed={mealContext === 'Random'} onClick={() => setMealContext('Random')}>Random</button>
          </div>
        </div>
        <div className="field">
          <label className="field-label">Status</label>
          <div className="segmented">
            <button type="button" className="segmented-btn" aria-pressed={status === 'Final'} onClick={() => setStatus('Final')}>Final</button>
            <button type="button" className="segmented-btn" aria-pressed={status === 'Corrected'} onClick={() => setStatus('Corrected')}>Corrected</button>
          </div>
        </div>
        <div className="field col-span-2">
          <label className="field-label">Notes</label>
          <textarea className="textarea" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {err && <div className="alert alert-error col-span-2">{err}</div>}
        <div className="col-span-2">
          <button type="submit" className="btn btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Save report'}
          </button>
        </div>
      </div>
    </form>
  );
}

function EditReportForm({
  report,
  onClose,
  onSaved,
}: {
  report: Report;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(String((report.data as any).glucoseValue));
  const [mealContext, setMealContext] = useState(report.mealContext);
  const [unit, setUnit] = useState(report.unit);
  const [notes, setNotes] = useState(report.notes || '');
  const isFinal = report.status === 'Final';
  const [err, setErr] = useState('');

  const update = useMutation({
    mutationFn: () =>
      api.updateReport(report._id, {
        glucoseValue: Number(value),
        mealContext,
        unit,
        notes,
        status: 'Corrected',
      } as any),
    onSuccess: () => onSaved(),
    onError: (e) => setErr(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          Edit report
          {isFinal && <span className="badge badge-warning ml-2">Will transition to Corrected</span>}
        </div>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); setErr(''); update.mutate(); }}
        className="card-body grid grid-cols-2 gap-3"
      >
        <div className="field">
          <label className="field-label">Value</label>
          <input className="input" type="number" value={value} onChange={(e) => setValue(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field-label">Unit</label>
          <select className="select" value={unit} onChange={(e) => setUnit(e.target.value as any)}>
            <option value="mg/dL">mg/dL</option>
            <option value="mmol/L">mmol/L</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">Meal context</label>
          <select className="select" value={mealContext} onChange={(e) => setMealContext(e.target.value as any)}>
            <option value="Fasting">Fasting</option>
            <option value="PostMeal">Post-meal</option>
            <option value="Random">Random</option>
          </select>
        </div>
        <div className="field col-span-2">
          <label className="field-label">Notes</label>
          <textarea className="textarea" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {err && <div className="alert alert-error col-span-2">{err}</div>}
        <div className="col-span-2 flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
