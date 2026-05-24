import GlucoseChart from '@/components/GlucoseChart';

export default function PatientDashboardPage() {
  return (
    <div>
      <h2>Your Dashboard</h2>
      <p>Your report list will appear here.</p>
      <h3>Glucose Trends</h3>
      <GlucoseChart />
    </div>
  );
}
