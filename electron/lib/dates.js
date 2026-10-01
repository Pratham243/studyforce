// Local-calendar date helpers. Dates are 'YYYY-MM-DD' strings in local time.

const pad = (n) => String(n).padStart(2, '0');

function toDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(str, n) {
  const d = parseDate(str);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

// Date object for HH:MM on the given date string.
function atTime(dateStr, hhmm) {
  const d = parseDate(dateStr);
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function minutesUntil(now, dateStr, hhmm) {
  return Math.round((atTime(dateStr, hhmm) - now) / 60000);
}

module.exports = { toDateStr, parseDate, addDays, daysBetween, atTime, minutesUntil };
