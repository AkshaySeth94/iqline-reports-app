'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import { labColor, toMgDl } from '@/lib/palette';
import type { AggregatedReport } from '@/types';

const AXIS = '#94a3b8';
const GRID = '#334155';

interface Props {
  reports: AggregatedReport[];
}

interface Row {
  date: string;
  ts: number;
  valueMgDl: number;
  originalValue: number;
  originalUnit: 'mg/dL' | 'mmol/L';
  labName: string;
  labId: string;
  mealContext: string;
  status: string;
  color: string;
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const row = (payload[0].payload as unknown) as Row;
  return (
    <div className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-50 shadow-lg">
      <div className="font-semibold">{row.labName}</div>
      <div className="text-sm">
        <strong>{row.valueMgDl}</strong> mg/dL
        {row.originalUnit !== 'mg/dL' && (
          <span className="muted ml-1">
            (original {row.originalValue} {row.originalUnit})
          </span>
        )}
      </div>
      <div className="muted">{row.mealContext} · {row.status}</div>
      <div className="muted">{row.date}</div>
    </div>
  );
}

export default function GlucoseChart({ reports }: Props) {
  if (!reports || reports.length === 0) return null;

  // Sort oldest-first so the bars read left-to-right chronologically
  const rows: Row[] = [...reports]
    .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
    .map((r) => {
      const labId = r.lab?._id ?? 'unknown';
      const labName = r.lab?.name ?? 'Unknown lab';
      const value = (r.data as any).glucoseValue;
      return {
        date: new Date(r.reportDate).toLocaleDateString(),
        ts: new Date(r.reportDate).getTime(),
        valueMgDl: toMgDl(value, r.unit),
        originalValue: value,
        originalUnit: r.unit,
        labName: r.lab?.status === 'Suspended' ? `${labName} (Suspended)` : labName,
        labId,
        mealContext: r.mealContext,
        status: r.status,
        color: labColor(labId),
      };
    });

  // Legend: one entry per unique lab (name+color). Recharts doesn't expose a
  // simple per-bar legend directly, so render a custom legend below.
  const labLegend = Array.from(
    new Map(rows.map((r) => [r.labId, { name: r.labName, color: r.color }])).values(),
  );

  return (
    <div
      role="img"
      aria-label={`Glucose readings bar chart — ${rows.length} reading${rows.length === 1 ? '' : 's'} from ${labLegend.length} lab${labLegend.length === 1 ? '' : 's'}.`}
    >
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="date"
              stroke={AXIS}
              tick={{ fontSize: 12, fill: AXIS }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
            />
            <YAxis
              stroke={AXIS}
              tick={{ fontSize: 12, fill: AXIS }}
              tickLine={false}
              axisLine={false}
              width={50}
              label={{
                value: 'mg/dL',
                angle: -90,
                position: 'insideLeft',
                fill: AXIS,
                fontSize: 11,
              }}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
            />
            <Bar dataKey="valueMgDl" radius={[3, 3, 0, 0]}>
              {rows.map((row, i) => (
                <Cell key={i} fill={row.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Custom legend so each lab appears with its color swatch */}
      <div className="chart-legend" role="list">
        {labLegend.map((l) => (
          <span key={l.name} className="chart-legend-item" role="listitem">
            <span
              className="lab-swatch-sm"
              style={{ background: l.color }}
              aria-hidden
            />
            <span style={{ color: AXIS, fontSize: 12 }}>{l.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
