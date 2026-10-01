const test = require('node:test');
const assert = require('node:assert/strict');
const curriculum = require('../data/curriculum');
const { Store } = require('../electron/lib/store');
const { buildSnapshot } = require('../electron/lib/snapshot');
const { dailyScore, PASS_SCORE } = require('../electron/lib/german');

const at = (date, time = '10:00') => new Date(`${date}T${time}:00`);
const fresh = () => Store.open(null, { seed: curriculum, seedDate: '2026-09-01' });
const german = (store, now) => buildSnapshot(store, now).tracks.find((t) => t.id === 'german');

test('German track has 64 topics in three phases and 625 hours', async () => {
  const g = german(await fresh(), at('2026-10-02')).german;
  assert.deepEqual(g.phases.map((p) => [p.topicsTotal, p.hours]), [[32, 150], [19, 225], [13, 250]]);
  assert.equal(g.totalTarget, 625);
  assert.equal(g.currentPhase, 1);
});

test('pace projections match the spec from Oct 2, 2026', async () => {
  const g = german(await fresh(), at('2026-10-02')).german;
  assert.deepEqual(g.paceProjections, { normal: '2027-08-11', fast: '2027-03-30', intensive: '2027-02-04' });
});

test('projection follows the actual daily average', async () => {
  const store = await fresh();
  store.addHours('2026-10-02', 'german', 3);
  store.addHours('2026-10-03', 'german', 1.6);
  const g = german(store, at('2026-10-03', '20:00')).german;
  assert.equal(g.avgHours, 2.3);
  // 625 - 4.6 = 620.4 h ÷ 2.3 h/day = 270 days after Oct 3
  assert.equal(g.projected, '2027-06-30');
  assert.equal(g.daysRemaining, 270);
});

test('daily percentage formula', () => {
  assert.equal(dailyScore({ hours: 2, targetHours: 2, checked: 4, grammarDone: 1, grammarTarget: 0.5 }), 1);
  assert.equal(dailyScore({ hours: 1, targetHours: 2, checked: 2, grammarDone: 0, grammarTarget: 1 }), 0.25 + 0.125);
  assert.equal(dailyScore({ hours: 0, targetHours: 2, checked: 0, grammarDone: 0, grammarTarget: 0 }), 0.25);
});

test('German counts 30% of the overall daily score', async () => {
  const store = await fresh();
  const now = at('2026-10-02');
  store.addHours('2026-10-02', 'german', 2);
  for (const k of ['practice_grammar', 'practice_vocab', 'practice_reading', 'practice_listening']) store.updateLog('2026-10-02', 'german', { [k]: 1 });
  const snap0 = buildSnapshot(store, now);
  store.setTopicDone(snap0.tracks.find((t) => t.id === 'german').today[0].id, true, now);
  const snap = buildSnapshot(store, now);
  const g = snap.tracks.find((t) => t.id === 'german');
  assert.equal(g.score, 1);
  assert.equal(g.left, 0);
  assert.equal(snap.totals.percent, 30);
});

test('later phases are locked and the exam needs topics and hours', async () => {
  const store = await fresh();
  const now = at('2026-10-02');
  let g = german(store, now);
  const p2topic = g.sections.find((s) => s.phase === 2).topics[0];
  assert.equal(store.setTopicDone(p2topic.id, true, now), false);
  assert.equal(g.german.phases[0].exam.status, 'not-ready');
  for (const s of g.sections.filter((x) => x.phase === 1)) for (const t of s.topics) store.setTopicDone(t.id, true, now);
  assert.equal(german(store, now).german.phases[0].exam.status, 'not-ready');
  store.addHours('2026-10-02', 'german', 150);
  g = german(store, now);
  assert.equal(g.german.phases[0].exam.status, 'available');
  assert.equal(g.german.phases[1].exam.status, 'locked');
});

test('failing a mock exam needs 7 more study days; passing unlocks the next phase', async () => {
  const store = await fresh();
  const now = at('2026-10-02');
  const g = german(store, now);
  for (const s of g.sections.filter((x) => x.phase === 1)) for (const t of s.topics) store.setTopicDone(t.id, true, now);
  store.addHours('2026-10-02', 'german', 150);
  assert.equal(store.recordExam('german', 1, 55, '2026-10-02', PASS_SCORE), false);
  let ex = german(store, at('2026-10-03')).german.phases[0].exam;
  assert.equal(ex.status, 'cooldown');
  assert.equal(ex.retryInDays, 7);
  for (let d = 3; d <= 9; d++) store.addHours(`2026-10-0${d}`, 'german', 1);
  ex = german(store, at('2026-10-09', '21:00')).german.phases[0].exam;
  assert.equal(ex.status, 'available');
  assert.equal(store.recordExam('german', 1, 72, '2026-10-09', PASS_SCORE), true);
  const after = german(store, at('2026-10-09', '21:05'));
  assert.equal(after.german.currentPhase, 2);
  assert.equal(after.german.phases[0].exam.status, 'passed');
  const p2topic = after.sections.find((s) => s.phase === 2).topics[0];
  assert.equal(store.setTopicDone(p2topic.id, true, at('2026-10-09', '21:05')), true);
});

test('German is inactive before its start date', async () => {
  const snap = buildSnapshot(await fresh(), at('2026-10-01'));
  const g = snap.tracks.find((t) => t.id === 'german');
  assert.equal(g.active, false);
  assert.equal(g.left, 0);
});

test('session notes are stored per day', async () => {
  const store = await fresh();
  store.updateLog('2026-10-02', 'german', { notes: 'Konjunktiv II drills' });
  assert.equal(store.notes('2026-10-01', '2026-10-03')[0].notes, 'Konjunktiv II drills');
});
