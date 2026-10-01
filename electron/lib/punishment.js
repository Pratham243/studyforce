// Escalating accountability levels.
//
// Level 1 — gentle nudge: alerts every 30 min.
// Level 2 — annoying: a deadline passed with work left, or yesterday was
//           only partly done (until the first check-off today). Alerts every
//           15 min, 20% overlay, Telegram nags.
// Level 3 — shame: yesterday was missed entirely. Red dashboard for 24h,
//           streak reset, penalty topic, shame wallpaper, public post.
// Level 4 — nuclear: 2+ fully missed days in a row. Level 3 plus alarm on open,
//           mandatory recovery plan, disappointed owl for a week.

function classifyDay(day) {
  if (!day) return null;
  if (day.complete) return 'complete';
  return day.totalDone > 0 ? 'partial' : 'missed';
}

// Fully missed days (nothing done) in a row, ending yesterday.
function consecutiveMissed(history) {
  let n = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (classifyDay(history[i]) !== 'missed') break;
    n++;
  }
  return n;
}

function streak(history, todayComplete) {
  let n = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (!history[i].complete) break;
    n++;
  }
  return n + (todayComplete ? 1 : 0);
}

function evaluate({ now, history, today, flags = {} }) {
  const yesterday = classifyDay(history[history.length - 1]);
  const missedRun = consecutiveMissed(history);
  const overdue = today.tracks.filter((t) => t.remaining > 0 && t.minutesToDeadline < 0);

  let level = 1;
  let reason = 'On track';
  if (missedRun >= 2) {
    level = 4;
    reason = `${missedRun} days missed in a row`;
  } else if (yesterday === 'missed') {
    level = 3;
    reason = 'Missed yesterday entirely';
  } else if (overdue.length) {
    level = 2;
    reason = `Past deadline: ${overdue.map((t) => t.name).join(', ')}`;
  } else if (yesterday === 'partial' && today.doneTotal === 0) {
    level = 2;
    reason = 'Yesterday was left unfinished';
  }

  const nowMs = now.getTime();
  const red = level >= 3 || (flags.redUntil && flags.redUntil > nowMs);
  const disappointed = !!(flags.disappointedUntil && flags.disappointedUntil > nowMs);
  const allDone = today.tracks.every((t) => t.remaining <= 0);

  return {
    level,
    reason,
    yesterday,
    consecutiveMissed: missedRun,
    overdue: overdue.map((t) => t.id),
    red: !!red,
    disappointed,
    allDone,
    intervalMin: level >= 2 ? 15 : 30,
    mood: moodFor({ level, today, disappointed, allDone })
  };
}

function moodFor({ level, today, disappointed, allDone }) {
  if (allDone) return 'happy';
  if (disappointed || level >= 4) return 'disappointed';
  if (level === 3) return 'crying';
  if (level === 2) return 'angry';
  const pending = today.tracks.filter((t) => t.remaining > 0);
  const soonest = Math.min(...pending.map((t) => t.minutesToDeadline));
  if (soonest < 60) return 'angry';
  if (soonest < 180) return 'worried';
  return 'neutral';
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function formatDuration(min) {
  if (min < 60) return plural(Math.max(0, min), 'minute');
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : plural(h, 'hour');
}

// Owl speech for an alert. Tone escalates with level and closeness of deadline.
function alertMessage({ level, today }) {
  const pending = today.tracks.filter((t) => t.remaining > 0);
  if (!pending.length) return 'Everything is done for today. Proud of you! 🦉';
  const total = pending.reduce((a, t) => a + t.remaining, 0);
  const next = pending.reduce((a, t) => (t.minutesToDeadline < a.minutesToDeadline ? t : a));
  const what = `${plural(total, 'task')} left`;

  if (level >= 4) return `I'm not angry. Just disappointed. ${what}. Finish your recovery plan.`;
  if (level === 3) return `You skipped yesterday. ${what} today, and I'm watching.`;
  if (level === 2) {
    if (next.minutesToDeadline < 0) {
      return `${next.name} deadline passed ${formatDuration(-next.minutesToDeadline)} ago. ${what}. FINISH YOUR TASKS.`;
    }
    return `Yesterday wasn't finished. ${what}. Check something off now.`;
  }
  if (next.minutesToDeadline < 120 && today.doneTotal === 0) {
    return `Seriously, ${formatDuration(next.minutesToDeadline)} left and you haven't started…`;
  }
  if (next.minutesToDeadline < 60) {
    return `${formatDuration(next.minutesToDeadline)} until the ${next.name} deadline. ${what}. Move!`;
  }
  if (next.minutesToDeadline < 180) {
    return `Clock's ticking: ${what}, ${formatDuration(next.minutesToDeadline)} until ${next.name} is due.`;
  }
  return `Hey, ${what}! You got this!`;
}

module.exports = { evaluate, streak, consecutiveMissed, classifyDay, alertMessage, moodFor };
