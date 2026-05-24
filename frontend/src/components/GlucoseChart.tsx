'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartData {
  name: string;
  glucoseValue: number;
}

interface GlucoseChartProps {
  data: ChartData[];
}

export default function GlucoseChart({ data }: GlucoseChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: 300,
          border: '1px solid #ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p>No data available for chart.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="glucoseValue" fill="#8884d8" name="Glucose Value" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
