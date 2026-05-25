'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';

interface ChartData {
  name: string;
  glucoseValue: number;
}

interface GlucoseChartProps {
  data: ChartData[];
}

const AXIS_COLOR = '#8a93a1';
const GRID_COLOR = '#e4e8ef';
const LINE_COLOR = '#0f766e';

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value;
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e4e8ef',
        borderRadius: 10,
        padding: '10px 12px',
        boxShadow: '0 6px 24px -8px rgba(15, 23, 42, 0.18)',
        fontSize: 12,
        color: '#0b1220',
      }}
    >
      <div style={{ color: '#5b6573', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>
        {value}
        <span style={{ color: '#8a93a1', marginLeft: 4, fontWeight: 500 }}>mg/dL</span>
      </div>
    </div>
  );
}

export default function GlucoseChart({ data }: GlucoseChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="empty" style={{ padding: '48px 16px' }}>
        <div className="empty-title">No chart data yet</div>
        <div>Glucose trends will appear here once you have at least one report.</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="glucoseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.28} />
              <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="name"
            stroke={AXIS_COLOR}
            tick={{ fontSize: 12, fill: AXIS_COLOR }}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
          />
          <YAxis
            stroke={AXIS_COLOR}
            tick={{ fontSize: 12, fill: AXIS_COLOR }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: GRID_COLOR, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="glucoseValue"
            stroke={LINE_COLOR}
            strokeWidth={2}
            fill="url(#glucoseFill)"
            activeDot={{ r: 5, strokeWidth: 0, fill: LINE_COLOR }}
            dot={{ r: 3, strokeWidth: 0, fill: LINE_COLOR }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
