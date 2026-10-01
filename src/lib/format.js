export function fmtCountdown(min) {
  const neg = min < 0;
  const m = Math.abs(min);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  return `${neg ? '-' : ''}${h}:${mm}`;
}

export function fmtHours(min) {
  if (!min) return '0m';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
}

export function fmtDate(str, opts = { month: 'short', day: 'numeric' }) {
  if (!str) return '—';
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
}

export const weekday = (str) => fmtDate(str, { weekday: 'short' });

export const LEVEL_NAMES = { 1: 'Gentle nudge', 2: 'Annoying', 3: 'Shame', 4: 'Nuclear' };
