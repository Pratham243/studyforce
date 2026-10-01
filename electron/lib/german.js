// Phased hour-based track (German A2 → C1): grammar topics + minimum hours
// per phase, gated by a Goethe mock exam.

const { addDays, daysBetween } = require('./dates');
const { PACES } = require('./planner');

const PASS_SCORE = 60;
const RETRY_STUDY_DAYS = 7;
const PRACTICE = [
  ['practice_grammar', 'Grammar exercise'],
  ['practice_vocab', 'Vocabulary (SeedLang)'],
  ['practice_reading', 'Reading/Writing'],
  ['practice_listening', 'Listening/Speaking']
];

const hoursPerDay = (pace) => (PACES[pace] || PACES.normal).hours;

// Date the remaining hours are done at `rate` hours/day, counting from
// `from` (today, or the start date if that's still ahead).
function finishDate(from, remainingHours, rate) {
  if (remainingHours <= 0) return from;
  if (!rate || rate <= 0) return null;
  return addDays(from, Math.ceil(remainingHours / rate));
}

// The German daily percentage, 0–1:
//   hours/target × 0.5 + checked/4 × 0.25 + grammar done/grammar target × 0.25
// Each part is capped at its share. No grammar due today counts as met.
function dailyScore({ hours, targetHours, checked, grammarDone, grammarTarget }) {
  const h = targetHours > 0 ? Math.min(1, hours / targetHours) : 1;
  const g = grammarTarget > 0 ? Math.min(1, grammarDone / grammarTarget) : 1;
  return h * 0.5 + (checked / 4) * 0.25 + g * 0.25;
}

function examStatus({ phase, currentPhase, passed, topicsDone, topicsTotal, hours, minHours, attempts, logs }) {
  const lastFail = attempts.filter((a) => !a.passed).map((a) => a.date).sort().pop() || null;
  const studyDaysSinceFail = lastFail ? logs.filter((l) => l.date > lastFail && l.hours_studied > 0).length : 0;
  const ready = topicsDone >= topicsTotal && hours >= minHours;
  let status;
  if (passed) status = 'passed';
  else if (phase > currentPhase) status = 'locked';
  else if (!ready) status = 'not-ready';
  else if (lastFail && studyDaysSinceFail < RETRY_STUDY_DAYS) status = 'cooldown';
  else status = 'available';
  return {
    status, ready, lastFail,
    retryInDays: lastFail ? Math.max(0, RETRY_STUDY_DAYS - studyDaysSinceFail) : 0,
    best: attempts.reduce((a, x) => Math.max(a, x.score), -1),
    attempts
  };
}

// Everything the UI and the scheduler need for a phased track on `today`.
// `track.meta` holds the phase definitions; topics carry their phase number.
function computePhased({ track, sections, topics, logs, today, now, timerStart }) {
  const meta = track.meta || { phases: [] };
  const phases = meta.phases;
  const current = Math.min(track.currentPhase || 1, phases.length + 1);
  const finished = current > phases.length;
  const activePhase = Math.min(current, phases.length);
  const startDate = meta.startDate || track.createdOn;
  const totalTarget = phases.reduce((a, p) => a + p.hours, 0);

  const logByDate = new Map(logs.map((l) => [l.date, l]));
  const todayLog = logByDate.get(today) || {};
  const todayHours = todayLog.hours_studied || 0;
  const timerHours = timerStart ? Math.max(0, (now.getTime() - timerStart) / 3600000) : 0;
  const targetHours = hoursPerDay(track.pace);

  const sectionPhase = new Map(sections.map((s) => [s.id, s.phase]));
  const phaseOf = (t) => sectionPhase.get(t.section_id) || 1;

  const phaseList = phases.map((p) => {
    const pt = topics.filter((t) => phaseOf(t) === p.n);
    const hours = logs.filter((l) => (l.phase || 1) === p.n).reduce((a, l) => a + (l.hours_studied || 0), 0);
    const attempts = logs.filter((l) => l.exam_phase === p.n && l.mock_exam_score != null)
      .map((l) => ({ date: l.date, score: l.mock_exam_score, passed: !!l.mock_exam_passed }));
    const passed = !!track[`phase${p.n}ExamPassed`];
    const done = pt.filter((t) => t.done_date).length;
    return {
      ...p,
      examName: p.exam,
      locked: p.n > current,
      current: p.n === current,
      passed,
      hoursDone: hours,
      topicsTotal: pt.length,
      topicsDone: done,
      exam: examStatus({ phase: p.n, currentPhase: current, passed, topicsDone: done, topicsTotal: pt.length,
        hours, minHours: p.hours, attempts, logs })
    };
  });

  const totalHours = logs.reduce((a, l) => a + (l.hours_studied || 0), 0);
  const ph = phaseList[activePhase - 1] || { hoursDone: 0, hours: 0, topicsTotal: 0, topicsDone: 0 };
  const phaseTopics = topics.filter((t) => phaseOf(t) === activePhase);

  // Today's grammar target is fixed from start-of-day numbers:
  // remaining phase topics ÷ days until the phase's hours are reached at pace.
  const hoursBeforeToday = ph.hoursDone - ((todayLog.phase || 1) === activePhase ? todayHours : 0);
  const daysToPhaseEnd = Math.max(1, Math.ceil(Math.max(0, ph.hours - hoursBeforeToday) / targetHours));
  const remainingAtStart = finished ? 0 : phaseTopics.filter((t) => !t.done_date || t.done_date >= today).length;
  const grammarTarget = remainingAtStart / daysToPhaseEnd;
  const grammarDone = topics.filter((t) => t.done_date === today).length;
  const checks = Object.fromEntries(PRACTICE.map(([k]) => [k, !!todayLog[k]]));
  const checked = Object.values(checks).filter(Boolean).length;
  const score = dailyScore({ hours: todayHours, targetHours, checked, grammarDone, grammarTarget });

  // Whole-number "tasks" for alerts, the widget and day completion:
  // 1 for the hours, 4 for the checklist, ⌈grammar target⌉ for topics.
  const grammarUnits = Math.ceil(grammarTarget - 1e-9);
  const grammarUnitsDone = grammarDone >= grammarTarget ? grammarUnits : Math.min(grammarDone, grammarUnits);
  const quota = 1 + PRACTICE.length + grammarUnits;
  const doneUnits = (todayHours >= targetHours ? 1 : 0) + checked + grammarUnitsDone;

  // Projections: at the actual average, and at each pace mode.
  const from = today < startDate ? startDate : today;
  const elapsed = Math.max(0, daysBetween(startDate, today)) + (todayHours > 0 ? 1 : 0);
  const avg = totalHours > 0 && elapsed > 0 ? totalHours / elapsed : null;
  const remainingHours = Math.max(0, totalTarget - totalHours);
  const rate = avg || targetHours;
  const projected = finished ? null : finishDate(from, remainingHours, rate);
  const paceProjections = Object.fromEntries(Object.entries(PACES)
    .map(([id, p]) => [id, finishDate(from, remainingHours, p.hours)]));

  const leftGrammar = Math.max(0, grammarUnits - grammarUnitsDone);
  const upNext = phaseTopics.filter((t) => !t.done_date).slice(0, leftGrammar);
  const youAreHere = finished ? null : (phaseTopics.find((t) => !t.done_date) || {}).id || null;

  return {
    target: meta.target,
    startDate,
    started: today >= startDate,
    totalTarget,
    totalHours,
    todayHours,
    timerHours,
    timerRunning: !!timerStart,
    timerStart: timerStart || null,
    targetHours,
    currentPhase: current,
    finished,
    phase: ph,
    phases: phaseList,
    checks,
    practice: PRACTICE.map(([key, label]) => ({ key, label, done: checks[key] })),
    grammarTarget,
    grammarDone,
    daysToPhaseEnd,
    score,
    quota,
    doneUnits: Math.min(doneUnits, quota),
    avgHours: avg,
    projected,
    daysRemaining: projected ? Math.max(0, daysBetween(today, projected)) : 0,
    paceProjections,
    notes: todayLog.notes || '',
    upNext,
    youAreHere
  };
}

module.exports = { computePhased, dailyScore, finishDate, examStatus, hoursPerDay, PASS_SCORE, RETRY_STUDY_DAYS, PRACTICE };
