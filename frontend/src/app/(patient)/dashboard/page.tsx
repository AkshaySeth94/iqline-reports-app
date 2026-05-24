'use client';

import { useEffect, useState } from 'react';
import GlucoseChart from '@/components/GlucoseChart';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { Report } from '@/types';

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
      } catch (err: any) {
        setError(err.message || 'Failed to fetch reports.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const chartData = reports
    .map((report) => ({
      name: new Date(report.reportDate).toLocaleDateString(),
      glucoseValue: report.data.glucoseValue,
    }))
    .reverse(); // To show oldest to newest

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h2>Welcome, {user?.name || 'Patient'}</h2>
      <h3>Glucose Trends</h3>
      <GlucoseChart data={chartData} />

      <h3>Your Reports</h3>
      {reports.length === 0 ? (
        <p>You have no reports yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Date</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>
                Glucose Value
              </th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>
                Status
              </th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report._id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {new Date(report.reportDate).toLocaleDateString()}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {report.data.glucoseValue}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {report.status}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {report.notes || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
