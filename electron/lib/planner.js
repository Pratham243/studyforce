// Daily quotas, carry-forward and projected completion dates.

const { addDays } = require('./dates');

const PACES = {
  // perDay: topics/day for topic tracks. hours: study hours/day for phased tracks.
  normal: { label: 'Normal', perDay: 5, range: '4–5/day', hours: 2 },
  fast: { label: 'Fast', perDay: 8, range: '7–8/day', hours: 3.5 },
  intensive: { label: 'Intensive', perDay: 10, range: '10+/day', hours: 5 }
};

// Estimated minutes per topic, used by the morning briefing.
const MINUTES_BY_DIFFICULTY = { EASY: 20, MEDIUM: 35, HARD: 60 };
const MINUTES_PER_APPLICATION = 20;

function basePerDay(track) {
  if (track.kind === 'count') return Math.max(0, track.dailyTarget || 0);
  if (track.kind === 'phased') return 1; // placeholder; real units come from daily_logs
  return (PACES[track.pace] || PACES.normal).perDay;
}

// Quota for a day, given yesterday's row for the same track.
// Shortfall carries forward; a fully missed day adds one penalty topic.
// Carry is capped at twice the base pace so long absences go through the
// recovery plan instead of producing an impossible day.
function nextQuota({ base, prev, prevDayMissed, remaining, recoveryExtra, isCount }) {
  let carry = 0;
  if (recoveryExtra != null) {
    carry = recoveryExtra;
  } else if (prev) {
    const shortfall = Math.max(0, prev.quota - prev.done);
    carry = Math.min(shortfall + (prevDayMissed && shortfall > 0 ? 1 : 0), base * 2);
  }
  let quota = base + carry;
  if (!isCount && remaining != null) quota = Math.min(quota, remaining);
  return { base, carry, quota: Math.max(0, quota) };
}

// Projected finish date: remaining topics ÷ daily pace. Today counts as a
// working day until today's quota is met.
function projectFinish({ remaining, perDay, doneToday, quotaToday, today }) {
  if (remaining <= 0) return null;
  if (perDay <= 0) return null;
  const todayLeft = Math.max(0, quotaToday - doneToday);
  if (todayLeft >= remaining) return today;
  // Whatever is left after today's quota is spread over the following days.
  return addDays(today, Math.ceil((remaining - todayLeft) / perDay));
}

function estimateMinutes(topics) {
  return topics.reduce((sum, t) => sum + (MINUTES_BY_DIFFICULTY[t.difficulty] || 35), 0);
}

// Split a backlog over N catch-up days, front-loading any remainder.
function recoverySchedule(backlog, days) {
  const out = [];
  const n = Math.max(1, days);
  for (let i = 0; i < n; i++) {
    out.push(Math.floor(backlog / n) + (i < backlog % n ? 1 : 0));
  }
  return out;
}

module.exports = {
  PACES, MINUTES_BY_DIFFICULTY, MINUTES_PER_APPLICATION,
  basePerDay, nextQuota, projectFinish, estimateMinutes, recoverySchedule
};
