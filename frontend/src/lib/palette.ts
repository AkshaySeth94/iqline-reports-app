// Paul Tol Bright qualitative palette — colorblind-safe per NFR-Ac2
export const PAUL_TOL_BRIGHT = [
  '#4477AA', // blue
  '#EE6677', // red
  '#228833', // green
  '#CCBB44', // yellow
  '#66CCEE', // cyan
  '#AA3377', // purple
  '#BBBBBB', // grey
  '#EE7733', // orange
];

export const SHAPES = ['circle', 'triangle', 'square', 'diamond'] as const;
export type Shape = (typeof SHAPES)[number];

function hashLabId(labId: string): number {
  let h = 0;
  for (let i = 0; i < labId.length; i++) {
    h = (h * 31 + labId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function labColor(labId: string | null | undefined): string {
  if (!labId) return PAUL_TOL_BRIGHT[6]; // grey
  return PAUL_TOL_BRIGHT[hashLabId(labId) % PAUL_TOL_BRIGHT.length];
}

export function labShape(labId: string | null | undefined): Shape {
  if (!labId) return 'circle';
  return SHAPES[hashLabId(labId) % SHAPES.length];
}

/** Convert mmol/L → mg/dL (factor per WHO). */
export function toMgDl(value: number, unit: 'mg/dL' | 'mmol/L'): number {
  return unit === 'mmol/L' ? Math.round(value * 18.0182 * 10) / 10 : value;
}

export function humanTimeBand(iso: string, nowMs = Date.now()): string {
  const t = new Date(iso).getTime();
  const diff = nowMs - t;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} minutes ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hours ago`;
  if (diff < 2 * 86_400_000) return 'yesterday';
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} days ago`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / (7 * 86_400_000))} weeks ago`;
  if (diff < 365 * 86_400_000) return `${Math.floor(diff / (30 * 86_400_000))} months ago`;
  return `${Math.floor(diff / (365 * 86_400_000))} years ago`;
}
