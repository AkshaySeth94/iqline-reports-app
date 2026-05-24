'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { User } from '@/types';

export default function AdminPanelPage() {
  const { user } = useAuth({ required: true, role: 'Admin' });

  // Create Patient state
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [createPatientMessage, setCreatePatientMessage] = useState('');

  // Create Report state
  const [patients, setPatients] = useState<User[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [glucoseValue, setGlucoseValue] = useState('');
  const [status, setStatus] = useState<'Final' | 'Corrected'>('Final');
  const [notes, setNotes] = useState('');
  const [createReportMessage, setCreateReportMessage] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await api.getPatients();
        setPatients(data);
        if (data.length > 0) {
          setSelectedPatient(data[0]._id);
        }
      } catch (error) {
        console.error('Failed to fetch patients', error);
        setCreateReportMessage('Failed to load patients list.');
      }
    };
    fetchPatients();
  }, []);

  const handleCreatePatient = async (e: FormEvent) => {
    e.preventDefault();
    setCreatePatientMessage('');
    try {
      await api.createPatient({ name: patientName, phone: patientPhone });
      setCreatePatientMessage('Patient created successfully!');
      setPatientName('');
      setPatientPhone('');
      // Refresh patient list
      const data = await api.getPatients();
      setPatients(data);
    } catch (error: any) {
      setCreatePatientMessage(error.message || 'Failed to create patient.');
    }
  };

  const handleCreateReport = async (e: FormEvent) => {
    e.preventDefault();
    setCreateReportMessage('');
    if (!selectedPatient) {
      setCreateReportMessage('Please select a patient.');
      return;
    }
    try {
      await api.createReport({
        patient: selectedPatient,
        reportDate: new Date(reportDate),
        status,
        reportType: 'GlucoseMarker',
        data: {
          glucoseValue: Number(glucoseValue),
        },
        notes,
      });
      setCreateReportMessage('Report created successfully!');
      // Reset form
      setReportDate('');
      setGlucoseValue('');
      setNotes('');
    } catch (error: any) {
      setCreateReportMessage(error.message || 'Failed to create report.');
    }
  };

  return (
    <div>
      <h2>Welcome, {user?.name || 'Admin'}</h2>
      <div style={{ display: 'flex', gap: '40px' }}>
        <section>
          <h3>Create New Patient</h3>
          <form onSubmit={handleCreatePatient}>
            <div>
              <label>Name:</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Phone (10 digits):</label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                pattern="\d{10}"
                required
              />
            </div>
            <button type="submit">Create Patient</button>
          </form>
          {createPatientMessage && <p>{createPatientMessage}</p>}
        </section>

        <section>
          <h3>Create New Report</h3>
          <form onSubmit={handleCreateReport}>
            <div>
              <label>Patient:</label>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a patient
                </option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.phone})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Report Date:</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Glucose Value:</label>
              <input
                type="number"
                value={glucoseValue}
                onChange={(e) => setGlucoseValue(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Status:</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'Final' | 'Corrected')
                }
              >
                <option value="Final">Final</option>
                <option value="Corrected">Corrected</option>
              </select>
            </div>
            <div>
              <label>Notes (optional):</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <button type="submit">Create Report</button>
          </form>
          {createReportMessage && <p>{createReportMessage}</p>}
        </section>
      </div>
    </div>
  );
}
