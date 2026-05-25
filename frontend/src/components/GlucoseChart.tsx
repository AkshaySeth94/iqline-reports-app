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
import { useEffect, useState } from 'react';

interface ChartData {
  name: string;
  glucoseValue: number;
}

interface GlucoseChartProps {
  data: ChartData[];
}

const defaultColors = {
  axis: '#8a93a1',
  grid: '#e4e8ef',
  line: '#0f766e',
};

function ChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-[10px] border border-border bg-surface p-3 text-xs text-text shadow-md">
      <div className="mb-1 text-text-muted">{label}</div>
      <div className="text-[15px] font-semibold">
        {value}
        <span className="ml-1 font-medium text-text-subtle">
          mg/dL
        </span>
      </div>
    </div>
  );
}

export default function GlucoseChart({ data }: GlucoseChartProps) {
  const [colors, setColors] = useState(defaultColors);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // This runs only on the client, after the component has mounted.
    setIsMounted(true);
    const style = getComputedStyle(document.documentElement);
    setColors({
      axis:
        style.getPropertyValue('--color-text-subtle').trim() ||
        defaultColors.axis,
      grid: style.getPropertyValue('--color-border').trim() || defaultColors.grid,
      line:
        style.getPropertyValue('--color-primary').trim() || defaultColors.line,
    });
  }, []);

  if (!isMounted) {
    // To prevent hydration mismatch, render a placeholder on the server.
    // The chart will appear on the client after useEffect runs.
    return <div className="h-[280px] w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="empty p-12 px-4">
        <div className="empty-title">No chart data yet</div>
        <div>
          Glucose trends will appear here once you have at least one report.
        </div>
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
              <stop offset="0%" stopColor={colors.line} stopOpacity={0.28} />
              <stop offset="100%" stopColor={colors.line} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={colors.grid}
            strokeDasharray="4 4"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke={colors.axis}
            tick={{ fontSize: 12, fill: colors.axis }}
            tickLine={false}
            axisLine={{ stroke: colors.grid }}
          />
          <YAxis
            stroke={colors.axis}
            tick={{ fontSize: 12, fill: colors.axis }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: colors.grid, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="glucoseValue"
            stroke={colors.line}
            strokeWidth={2}
            fill="url(#glucoseFill)"
            activeDot={{ r: 5, strokeWidth: 0, fill: colors.line }}
            dot={{ r: 3, strokeWidth: 0, fill: colors.line }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
