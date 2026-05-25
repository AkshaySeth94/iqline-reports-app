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

const AXIS_COLOR = '#94a3b8';
const GRID_COLOR = '#334155';
const LINE_COLOR = '#14b8a6';

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2.5 text-xs text-slate-50 shadow-lg">
      <div className="mb-1 text-slate-400">{label}</div>
      <div className="text-[15px] font-semibold">
        {value}
        <span className="ml-1 font-medium text-slate-400">mg/dL</span>
      </div>
    </div>
  );
}

export default function GlucoseChart({ data }: GlucoseChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="empty px-4 py-12">
        <div className="empty-title">No chart data yet</div>
        <div>Glucose trends will appear here once you have at least one report.</div>
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
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
