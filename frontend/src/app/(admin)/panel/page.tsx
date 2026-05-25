'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { User } from '@/types';

type Banner = { kind: 'success' | 'error'; text: string } | null;

export default function AdminPanelPage() {
  const { user } = useAuth({ required: true, role: 'Admin' });

  // Create Patient state
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [patientBanner, setPatientBanner] = useState<Banner>(null);

  // Create Report state
  const [patients, setPatients] = useState<User[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [glucoseValue, setGlucoseValue] = useState('');
  const [status, setStatus] = useState<'Final' | 'Corrected'>('Final');
  const [notes, setNotes] = useState('');
  const [creatingReport, setCreatingReport] = useState(false);
  const [reportBanner, setReportBanner] = useState<Banner>(null);

  const loadPatients = async () => {
    setPatientsLoading(true);
    try {
      const data = await api.getPatients();
      setPatients(data);
      if (data.length > 0 && !selectedPatient) {
        setSelectedPatient(data[0]._id);
      }
    } catch {
      setReportBanner({ kind: 'error', text: 'Failed to load patients list.' });
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreatePatient = async (e: FormEvent) => {
    e.preventDefault();
    setPatientBanner(null);
    setCreatingPatient(true);
    try {
      await api.createPatient({ name: patientName, phone: patientPhone });
      setPatientBanner({ kind: 'success', text: `${patientName} added successfully.` });
      setPatientName('');
      setPatientPhone('');
      await loadPatients();
    } catch (err: unknown) {
      setPatientBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to create patient.',
      });
    } finally {
      setCreatingPatient(false);
    }
  };

  const handleCreateReport = async (e: FormEvent) => {
    e.preventDefault();
    setReportBanner(null);
    if (!selectedPatient) {
      setReportBanner({ kind: 'error', text: 'Please select a patient.' });
      return;
    }
    setCreatingReport(true);
    try {
      await api.createReport({
        patient: selectedPatient,
        reportDate: new Date(reportDate),
        status,
        reportType: 'GlucoseMarker',
        data: { glucoseValue: Number(glucoseValue) },
        notes,
      });
      setReportBanner({ kind: 'success', text: 'Report created successfully.' });
      setReportDate('');
      setGlucoseValue('');
      setNotes('');
    } catch (err: unknown) {
      setReportBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to create report.',
      });
    } finally {
      setCreatingReport(false);
    }
  };

  return (
    <div className="stack stack-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name || 'Admin'}</h1>
          <p className="page-subtitle">
            Onboard patients and publish new lab reports.
          </p>
        </div>
        <span className="badge badge-info">{patients.length} patient{patients.length === 1 ? '' : 's'} on file</span>
      </div>

      <div className="grid grid-cols-2">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">New patient</div>
              <div className="card-subtitle">Create a patient account</div>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreatePatient} className="stack stack-4">
              <div className="field">
                <label className="field-label" htmlFor="np-name">Full name</label>
                <input
                  id="np-name"
                  className="input"
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  required
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="np-phone">Phone number</label>
                <input
                  id="np-phone"
                  className="input"
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  pattern="\d{10}"
                  inputMode="numeric"
                  placeholder="10-digit phone number"
                  required
                />
              </div>
              {patientBanner && (
                <div
                  className={`alert ${
                    patientBanner.kind === 'success' ? 'alert-success' : 'alert-error'
                  }`}
                >
                  {patientBanner.text}
                </div>
              )}
              <button type="submit" className="btn btn-primary" disabled={creatingPatient}>
                {creatingPatient ? 'Creating…' : 'Create patient'}
              </button>
            </form>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">New report</div>
              <div className="card-subtitle">Publish a glucose marker report</div>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateReport} className="stack stack-4">
              <div className="field">
                <label className="field-label" htmlFor="nr-patient">Patient</label>
                <select
                  id="nr-patient"
                  className="select"
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  required
                  disabled={patientsLoading || patients.length === 0}
                >
                  <option value="" disabled>
                    {patientsLoading
                      ? 'Loading patients…'
                      : patients.length === 0
                      ? 'No patients yet — create one first'
                      : 'Select a patient'}
                  </option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} · {p.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2" style={{ gap: 'var(--space-4)' }}>
                <div className="field">
                  <label className="field-label" htmlFor="nr-date">Report date</label>
                  <input
                    id="nr-date"
                    className="input"
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="nr-glucose">Glucose (mg/dL)</label>
                  <input
                    id="nr-glucose"
                    className="input"
                    type="number"
                    value={glucoseValue}
                    onChange={(e) => setGlucoseValue(e.target.value)}
                    min={0}
                    placeholder="e.g. 110"
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="nr-status">Status</label>
                <select
                  id="nr-status"
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Final' | 'Corrected')}
                >
                  <option value="Final">Final</option>
                  <option value="Corrected">Corrected</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="nr-notes">Notes</label>
                <textarea
                  id="nr-notes"
                  className="textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional clinical notes"
                />
              </div>
              {reportBanner && (
                <div
                  className={`alert ${
                    reportBanner.kind === 'success' ? 'alert-success' : 'alert-error'
                  }`}
                >
                  {reportBanner.text}
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creatingReport || patientsLoading || patients.length === 0}
              >
                {creatingReport ? 'Publishing…' : 'Publish report'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
