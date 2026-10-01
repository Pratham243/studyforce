// Builds the complete view-model the renderer draws from.

const { toDateStr, addDays, daysBetween, minutesUntil } = require('./dates');
const { PACES, basePerDay, projectFinish, estimateMinutes, MINUTES_PER_APPLICATION } = require('./planner');
const punishment = require('./punishment');
const { computePhased } = require('./german');

const MILESTONES = [25, 50, 75, 100];

function buildSnapshot(store, now = new Date()) {
  const today = toDateStr(now);
  store.ensureDays(today);
  const state = store.getState();
  const settings = store.getSettings();
  const counts = store.doneCounts(today);

  const tracks = store.tracks().map((t) => {
    const row = store.todayRow(t.id, today);
    const base = basePerDay(t);
    const quota = row ? row.quota : base;
    const doneToday = counts.get(`${today}|${t.id}`) || 0;
    const left = Math.max(0, quota - doneToday);
    const out = {
      ...t,
      paceInfo: PACES[t.pace] || PACES.normal,
      base,
      carry: row ? row.carry : 0,
      quota,
      doneToday,
      left,
      minutesToDeadline: minutesUntil(now, today, t.deadline),
      score: quota > 0 ? Math.min(1, doneToday / quota) : 1
    };

    if (t.kind === 'count') {
      out.estimatedMinutes = left * MINUTES_PER_APPLICATION;
      return out;
    }

    const topics = store.topics(t.id);
    const sections = store.sections(t.id).map((s) => {
      const st = topics.filter((x) => x.section_id === s.id);
      return {
        id: s.id, title: s.title, difficulty: s.difficulty, optional: !!s.optional, phase: s.phase,
        total: st.length, done: st.filter((x) => x.done_date).length,
        topics: st.map((x) => ({ id: x.id, title: x.title, difficulty: x.difficulty, doneDate: x.done_date }))
      };
    });
    if (t.kind === 'phased') return phasedTrack(store, out, { topics, sections, today, now, state });

    // Optional sections can be checked off but don't count toward progress.
    const core = topics.filter((x) => !x.optional);
    const total = core.length;
    const done = core.filter((x) => x.done_date).length;
    const remaining = total - done;
    // Today's list: what was checked off today, then the next undone topics.
    const upNext = core.filter((x) => !x.done_date).slice(0, left);
    const sectionTitle = (sid) => (sections.find((s) => s.id === sid) || {}).title;
    out.today = [
      ...core.filter((x) => x.done_date === today),
      ...upNext
    ].map((x) => ({ id: x.id, title: x.title, difficulty: x.difficulty, doneDate: x.done_date, section: sectionTitle(x.section_id) }));
    out.estimatedMinutes = estimateMinutes(upNext);
    out.total = total;
    out.done = done;
    out.remaining = remaining;
    out.percent = total ? Math.round((done / total) * 1000) / 10 : 0;
    out.projectedFinish = projectFinish({ remaining, perDay: base, doneToday, quotaToday: quota, today });
    out.sections = sections;
    return out;
  });

  const historyFrom = addDays(today, -60);
  const history = store.history(historyFrom, today);
  const past = history.filter((d) => d.date < today);
  const todayHist = history.find((d) => d.date === today);

  const evalInput = {
    now,
    history: past,
    today: {
      doneTotal: tracks.reduce((a, t) => a + t.doneToday, 0),
      tracks: tracks.map((t) => ({ id: t.id, name: t.name, remaining: t.left, minutesToDeadline: t.minutesToDeadline }))
    },
    flags: state
  };
  const verdict = state.startedOn
    ? punishment.evaluate(evalInput)
    : { level: 1, reason: 'Check off your first topic to start Day 1', red: false, disappointed: false,
        allDone: false, consecutiveMissed: 0, overdue: [], intervalMin: 30, yesterday: null, mood: 'neutral' };
  if (state.recoveryRequired) verdict.level = Math.max(verdict.level, 4);

  const todayComplete = tracks.every((t) => t.left === 0);
  for (const t of tracks) {
    if (t.kind !== 'phased') continue;
    let n = 0;
    for (let i = past.length - 1; i >= 0; i--) {
      const r = past[i].tracks[t.id];
      if (!r || r.done < r.quota) break;
      n++;
    }
    t.german.streak = n + (t.left === 0 && t.german.started ? 1 : 0);
  }
  // Overall daily score: each active track's completion, weighted.
  const active = tracks.filter((t) => t.active !== false);
  const weightSum = active.reduce((a, t) => a + (t.weight || 0), 0);
  const percent = weightSum ? active.reduce((a, t) => a + (t.weight || 0) * t.score, 0) / weightSum : 0;
  return {
    now: now.getTime(),
    today,
    tracks,
    totals: {
      quota: tracks.reduce((a, t) => a + t.quota, 0),
      doneToday: tracks.reduce((a, t) => a + t.doneToday, 0),
      left: tracks.reduce((a, t) => a + t.left, 0),
      estimatedMinutes: tracks.reduce((a, t) => a + (t.estimatedMinutes || 0), 0),
      percent: Math.round(percent * 100)
    },
    notes: store.notes(addDays(today, -60), today),
    streak: state.startedOn ? punishment.streak(past, todayComplete) : 0,
    dayNumber: state.startedOn ? Math.max(1, daysBetween(state.startedOn, today) + 1) : 0,
    todayComplete,
    punishment: verdict,
    message: punishment.alertMessage({ level: verdict.level, today: evalInput.today }),
    history: history.map((d) => ({ ...d, isToday: d.date === today })),
    todayHistory: todayHist || null,
    pomodoro: store.pomodoroMinutes(addDays(today, -60)),
    applications: store.applications(100),
    state,
    settings
  };
}

// Hour-based phased track (German). Writes today's units and score to
// daily_logs so history, streaks and punishment treat it like any track.
function phasedTrack(store, out, { topics, sections, today, now, state }) {
  const timer = (state.timers || {})[out.id];
  const g = computePhased({ track: out, sections, topics, logs: store.logs(out.id), today, now, timerStart: timer });
  const sectionTitle = (sid) => (sections.find((s) => s.id === sid) || {}).title;
  const phaseNow = Math.min(g.currentPhase, g.phases.length);
  const doneToday = topics.filter((x) => x.done_date === today);
  out.german = g;
  out.active = g.started;
  out.sections = sections.map((s) => ({ ...s, locked: s.phase > g.currentPhase }));
  out.today = [...doneToday, ...g.upNext].map((x) => ({
    id: x.id, title: x.title, difficulty: x.difficulty, doneDate: x.done_date, section: sectionTitle(x.section_id)
  }));
  out.total = g.phase.topicsTotal;
  out.done = g.phase.topicsDone;
  out.remaining = out.total - out.done;
  out.percent = out.total ? Math.round((out.done / out.total) * 1000) / 10 : 0;
  out.projectedFinish = g.projected;
  out.phaseNow = phaseNow;

  if (!g.started) {
    Object.assign(out, { quota: 0, doneToday: 0, left: 0, carry: 0, score: 0, estimatedMinutes: 0 });
    return out;
  }
  Object.assign(out, {
    quota: g.quota, doneToday: g.doneUnits, left: g.quota - g.doneUnits, carry: 0, score: g.score,
    estimatedMinutes: Math.round(Math.max(0, g.targetHours - g.todayHours) * 60)
  });
  const log = store.log(today, out.id);
  const score = Math.round(g.score * 1000) / 1000;
  if (!log || log.units_done !== g.doneUnits || log.units_quota !== g.quota || log.score !== score) {
    store.updateLog(today, out.id, { units_done: g.doneUnits, units_quota: g.quota, score });
  }
  return out;
}

// Which milestone percentages (25/50/75/100) a track has newly crossed.
function newMilestones(track, reached = []) {
  return MILESTONES.filter((m) => track.percent >= m && !reached.includes(m));
}

module.exports = { buildSnapshot, newMilestones, MILESTONES };
