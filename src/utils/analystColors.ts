/**
 * Deterministic per-analyst color palette.
 * Each analyst ID maps to a stable color — same ID always = same color.
 */

const PALETTE: { color: string; bg: string }[] = [
  { color: '#38bdf8', bg: 'rgba(56,189,248,0.15)'  }, // sky
  { color: '#34d399', bg: 'rgba(52,211,153,0.15)'  }, // emerald
  { color: '#f472b6', bg: 'rgba(244,114,182,0.15)' }, // pink
  { color: '#fb923c', bg: 'rgba(251,146,60,0.15)'  }, // orange
  { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' }, // violet
  { color: '#facc15', bg: 'rgba(250,204,21,0.15)'  }, // yellow
  { color: '#4ade80', bg: 'rgba(74,222,128,0.15)'  }, // green
  { color: '#f87171', bg: 'rgba(248,113,113,0.15)' }, // red
  { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)'  }, // blue
  { color: '#e879f9', bg: 'rgba(232,121,249,0.15)' }, // fuchsia
  { color: '#2dd4bf', bg: 'rgba(45,212,191,0.15)'  }, // teal
  { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)'  }, // amber
];

export function getAnalystColor(analystId: number): { color: string; bg: string } {
  return PALETTE[analystId % PALETTE.length];
}
