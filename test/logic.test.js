const test = require('node:test');
const assert = require('node:assert/strict');
const curriculum = require('../data/curriculum');
const { Store } = require('../electron/lib/store');
const { buildSnapshot } = require('../electron/lib/snapshot');
const { nextQuota, projectFinish, recoverySchedule } = require('../electron/lib/planner');
const punishment = require('../electron/lib/punishment');

const at = (date, time = '10:00') => new Date(`${date}T${time}:00`);

async function freshStore() {
  return Store.open(null, { seed: curriculum, seedDate: '2026-09-01' });
}

function completeToday(store, now) {
  const snap = buildSnapshot(store, now);
  for (const t of snap.tracks) {
    if (t.kind === 'count') {
      for (let i = 0; i < t.left; i++) store.addApplication({ company: `Co${i}`, sentAt: now.getTime() });
    } else {
      for (const topic of t.today.filter((x) => !x.doneDate)) store.setTopicDone(topic.id, true, now);
    }
  }
}

test('seed loads the three tracks', async () => {
  const store = await freshStore();
  const snap = buildSnapshot(store, at('2026-10-01'));
  const byId = Object.fromEntries(snap.tracks.map((t) => [t.id, t]));
  assert.equal(byId.ai.total, 190);
  assert.equal(byId.german.total, 105);
  assert.equal(byId.apps.kind, 'count');
  assert.equal(snap.punishment.level, 1);
  assert.equal(snap.streak, 0);
});

test('completing every quota builds a streak', async () => {
  const store = await freshStore();
  completeToday(store, at('2026-10-01'));
  let snap = buildSnapshot(store, at('2026-10-01', '12:00'));
  assert.equal(snap.todayComplete, true);
  assert.equal(snap.streak, 1);
  completeToday(store, at('2026-10-02'));
  snap = buildSnapshot(store, at('2026-10-02', '12:00'));
  assert.equal(snap.streak, 2);
  assert.equal(snap.punishment.level, 1);
});

test('a fully missed day escalates to level 3 and carries work forward with a penalty', async () => {
  const store = await freshStore();
  completeToday(store, at('2026-10-01'));
  // Oct 2: nothing done. Oct 3: open the app.
  const snap = buildSnapshot(store, at('2026-10-03'));
  assert.equal(snap.punishment.yesterday, 'missed');
  assert.equal(snap.punishment.level, 3);
  assert.equal(snap.streak, 0);
  const ai = snap.tracks.find((t) => t.id === 'ai');
  assert.equal(ai.quota, 5 + 5 + 1);
  assert.equal(ai.carry, 6);
});

test('two missed days in a row is level 4', async () => {
  const store = await freshStore();
  completeToday(store, at('2026-10-01'));
  const snap = buildSnapshot(store, at('2026-10-04'));
  assert.equal(snap.punishment.consecutiveMissed, 2);
  assert.equal(snap.punishment.level, 4);
  assert.equal(snap.punishment.mood, 'disappointed');
});

test('partial yesterday is level 2 until something is checked off', async () => {
  const store = await freshStore();
  const d1 = at('2026-10-01');
  const snap1 = buildSnapshot(store, d1);
  store.setTopicDone(snap1.tracks[0].today[0].id, true, d1);
  let snap = buildSnapshot(store, at('2026-10-02'));
  assert.equal(snap.punishment.yesterday, 'partial');
  assert.equal(snap.punishment.level, 2);
  store.setTopicDone(snap.tracks[0].today.find((x) => !x.doneDate).id, true, at('2026-10-02'));
  snap = buildSnapshot(store, at('2026-10-02', '10:05'));
  assert.equal(snap.punishment.level, 1);
});

test('a partial day followed by a missed day is level 3, not 4', async () => {
  const store = await freshStore();
  completeToday(store, at('2026-10-01'));
  const snap2 = buildSnapshot(store, at('2026-10-02'));
  store.setTopicDone(snap2.tracks[0].today[0].id, true, at('2026-10-02'));
  const snap = buildSnapshot(store, at('2026-10-04'));
  assert.equal(snap.punishment.consecutiveMissed, 1);
  assert.equal(snap.punishment.level, 3);
});

test('passing a deadline with work left is level 2', async () => {
  const store = await freshStore();
  completeToday(store, at('2026-10-01'));
  const snap = buildSnapshot(store, at('2026-10-02', '14:30'));
  assert.equal(snap.punishment.level, 2);
  assert.deepEqual(snap.punishment.overdue, ['ai']);
  assert.equal(snap.punishment.intervalMin, 15);
});

test('changing pace re-plans today and moves the finish date', async () => {
  const store = await freshStore();
  const now = at('2026-10-01');
  completeToday(store, now);
  let ai = buildSnapshot(store, at('2026-10-02')).tracks.find((t) => t.id === 'ai');
  const before = ai.projectedFinish;
  store.updateTrack('ai', { pace: 'intensive' }, '2026-10-02');
  ai = buildSnapshot(store, at('2026-10-02')).tracks.find((t) => t.id === 'ai');
  assert.equal(ai.quota, 10);
  assert.ok(ai.projectedFinish < before);
});

test('recovery plan replaces carry with the planned extra', async () => {
  const store = await freshStore();
  completeToday(store, at('2026-10-01'));
  buildSnapshot(store, at('2026-10-04'));
  store.setState({ recovery: { start: '2026-10-04', extra: { ai: [3, 3], german: [2, 2], apps: [0, 0] } }, recoveryRequired: false });
  store.replanFrom('2026-10-04');
  const ai = buildSnapshot(store, at('2026-10-04')).tracks.find((t) => t.id === 'ai');
  assert.equal(ai.quota, 8);
});

test('planner helpers', () => {
  assert.deepEqual(nextQuota({ base: 5, prev: { quota: 5, done: 2 }, prevDayMissed: false, remaining: 100 }), { base: 5, carry: 3, quota: 8 });
  assert.equal(nextQuota({ base: 5, prev: { quota: 15, done: 0 }, prevDayMissed: true, remaining: 100 }).carry, 10);
  assert.equal(nextQuota({ base: 5, prev: null, remaining: 2 }).quota, 2);
  assert.equal(projectFinish({ remaining: 20, perDay: 5, doneToday: 0, quotaToday: 5, today: '2026-10-01' }), '2026-10-04');
  assert.equal(projectFinish({ remaining: 20, perDay: 5, doneToday: 5, quotaToday: 5, today: '2026-10-01' }), '2026-10-05');
  assert.deepEqual(recoverySchedule(7, 3), [3, 2, 2]);
});

test('alert tone escalates', () => {
  const t = (minutesToDeadline, doneTotal = 1) => ({ doneTotal, tracks: [{ id: 'ai', name: 'AI', remaining: 4, minutesToDeadline }] });
  assert.match(punishment.alertMessage({ level: 1, today: t(600) }), /You got this/);
  assert.match(punishment.alertMessage({ level: 1, today: t(110, 0) }), /haven't started/);
  assert.match(punishment.alertMessage({ level: 2, today: t(-30) }), /FINISH YOUR TASKS/);
});
