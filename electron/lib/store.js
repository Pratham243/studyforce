// SQLite persistence (sql.js — WebAssembly SQLite, so no native rebuild is
// needed for Electron). The database lives in a single file that is rewritten
// after every change.

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { toDateStr, addDays, daysBetween } = require('./dates');
const { basePerDay, nextQuota } = require('./planner');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'topics',
  pace TEXT NOT NULL DEFAULT 'normal', deadline TEXT NOT NULL DEFAULT '20:00',
  daily_target INTEGER NOT NULL DEFAULT 0, color TEXT, sort INTEGER NOT NULL DEFAULT 0,
  created_on TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS daily_logs (
  date TEXT NOT NULL, track_id TEXT NOT NULL, phase INTEGER NOT NULL DEFAULT 1,
  hours_studied REAL NOT NULL DEFAULT 0,
  practice_grammar INTEGER NOT NULL DEFAULT 0, practice_vocab INTEGER NOT NULL DEFAULT 0,
  practice_reading INTEGER NOT NULL DEFAULT 0, practice_listening INTEGER NOT NULL DEFAULT 0,
  notes TEXT, mock_exam_score INTEGER, mock_exam_passed INTEGER, exam_phase INTEGER,
  units_done INTEGER NOT NULL DEFAULT 0, units_quota INTEGER NOT NULL DEFAULT 0, score REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (date, track_id)
);
CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT, track_id TEXT NOT NULL, title TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'MEDIUM', sort INTEGER NOT NULL DEFAULT 0,
  optional INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT, track_id TEXT NOT NULL, section_id INTEGER NOT NULL,
  title TEXT NOT NULL, difficulty TEXT NOT NULL DEFAULT 'MEDIUM', sort INTEGER NOT NULL DEFAULT 0,
  done_date TEXT, done_at INTEGER, optional INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS topics_track ON topics(track_id, sort);
CREATE INDEX IF NOT EXISTS topics_done ON topics(done_date);
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company TEXT, role TEXT, subject TEXT,
  source TEXT NOT NULL DEFAULT 'manual', message_id TEXT UNIQUE, date TEXT NOT NULL, sent_at INTEGER
);
CREATE TABLE IF NOT EXISTS days (
  date TEXT NOT NULL, track_id TEXT NOT NULL, base INTEGER NOT NULL, carry INTEGER NOT NULL,
  quota INTEGER NOT NULL, PRIMARY KEY (date, track_id)
);
CREATE TABLE IF NOT EXISTS pomodoros (
  id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, started_at INTEGER NOT NULL,
  minutes INTEGER NOT NULL, topic_id INTEGER
);
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

// Columns added after the first release; migrate() adds any that are missing.
const ADDED_COLUMNS = {
  tracks: {
    weight: 'REAL NOT NULL DEFAULT 0.35', meta: 'TEXT', current_phase: 'INTEGER NOT NULL DEFAULT 1',
    phase1_hours: 'REAL NOT NULL DEFAULT 0', phase2_hours: 'REAL NOT NULL DEFAULT 0', phase3_hours: 'REAL NOT NULL DEFAULT 0',
    phase1_exam_passed: 'INTEGER NOT NULL DEFAULT 0', phase2_exam_passed: 'INTEGER NOT NULL DEFAULT 0',
    phase3_exam_passed: 'INTEGER NOT NULL DEFAULT 0'
  },
  sections: { optional: 'INTEGER NOT NULL DEFAULT 0', phase: 'INTEGER NOT NULL DEFAULT 0' },
  topics: { optional: 'INTEGER NOT NULL DEFAULT 0' }
};
const LOG_FIELDS = ['hours_studied', 'practice_grammar', 'practice_vocab', 'practice_reading', 'practice_listening',
  'notes', 'mock_exam_score', 'mock_exam_passed', 'exam_phase', 'units_done', 'units_quota', 'score'];

const DEFAULT_SETTINGS = {
  theme: 'dark',
  wakeTime: '07:30',
  sleepTime: '23:30',
  reportTime: '22:30',
  alertsEnabled: true,
  alertSound: 'siren', // siren | soft | off
  alertVolume: 100,
  sirenSeconds: 5,
  widgetOnTop: true,
  openAtLogin: true,
  wallpaperPunish: true,
  publicPosting: false,
  lofiUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  pomodoro: { work: 25, short: 5, long: 15 },
  telegram: { enabled: false, token: '', chatId: '', channelId: '' },
  discordWebhook: '',
  gmail: {
    enabled: false, clientId: '', clientSecret: '', refreshToken: '', email: '',
    query: 'in:sent newer_than:3d (subject:application OR subject:applying OR subject:bewerbung OR "cover letter" OR "my resume" OR "my CV")'
  }
};

const DEFAULT_STATE = {
  startedOn: null,
  redUntil: 0,
  disappointedUntil: 0,
  recoveryRequired: false,
  recovery: null,
  alarmPending: false,
  lastPunishedDate: null,
  lastBriefingDate: null,
  lastReportDate: null,
  lastPostDate: null,
  milestones: {},
  savedWallpaper: null,
  wallpaperLocked: false
};

function mergeDeep(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object'
      ? mergeDeep(base[k], v)
      : v;
  }
  return out;
}

class Store {
  static async open(filePath, { seed, seedDate } = {}) {
    const SQL = await initSqlJs({
      locateFile: (f) => path.join(path.dirname(require.resolve('sql.js')), f)
        .replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep)
    });
    const buf = filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
    const store = new Store(new SQL.Database(buf), filePath);
    store.db.exec(SCHEMA);
    store.migrate();
    if (seed && !store.get('SELECT 1 AS x FROM tracks LIMIT 1')) {
      store.seed(seed, seedDate);
      store.kvSet('seedVersion', seed.version || 1);
    } else if (seed) {
      store.refreshSeed(seed);
    }
    return store;
  }

  constructor(db, filePath) {
    this.db = db;
    this.filePath = filePath;
    this.persistTimer = null;
  }

  // --- low-level helpers ---------------------------------------------------
  all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
  get(sql, params = []) { return this.all(sql, params)[0] || null; }
  run(sql, params = []) { this.db.run(sql, params); this.schedulePersist(); }
  lastId() { return this.get('SELECT last_insert_rowid() AS id').id; }

  schedulePersist() {
    if (!this.filePath) return;
    clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.flush(), 300);
  }
  flush() {
    if (!this.filePath) return;
    clearTimeout(this.persistTimer);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = this.filePath + '.tmp';
    fs.writeFileSync(tmp, Buffer.from(this.db.export()));
    fs.renameSync(tmp, this.filePath);
  }

  kvGet(key, fallback) {
    const row = this.get('SELECT value FROM kv WHERE key = ?', [key]);
    return row ? JSON.parse(row.value) : fallback;
  }
  kvSet(key, value) {
    this.run('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, JSON.stringify(value)]);
  }

  // Adds columns introduced after a database was first created.
  migrate() {
    for (const [table, cols] of Object.entries(ADDED_COLUMNS)) {
      const have = this.all(`PRAGMA table_info(${table})`).map((c) => c.name);
      for (const [col, def] of Object.entries(cols)) {
        if (!have.includes(col)) this.db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
      }
    }
  }

  // When the bundled curriculum changes, replace the topics of seeded tracks
  // that have no progress yet. Tracks with progress are left alone.
  refreshSeed(seed) {
    const version = seed.version || 1;
    if (this.kvGet('seedVersion', 1) >= version) return;
    for (const t of seed.tracks) {
      if (!this.track(t.id)) continue;
      if (t.weight != null) this.db.run('UPDATE tracks SET weight = ? WHERE id = ?', [t.weight, t.id]);
      if (t.kind === 'count') continue;
      const progress = this.get('SELECT COUNT(*) AS n FROM topics WHERE track_id = ? AND done_date IS NOT NULL', [t.id]).n +
        this.get('SELECT COUNT(*) AS n FROM daily_logs WHERE track_id = ? AND hours_studied > 0', [t.id]).n;
      if (progress > 0) continue;
      this.db.run('DELETE FROM topics WHERE track_id = ?', [t.id]);
      this.db.run('DELETE FROM sections WHERE track_id = ?', [t.id]);
      this.db.run('DELETE FROM days WHERE track_id = ?', [t.id]);
      this.db.run('UPDATE tracks SET kind = ?, meta = ?, current_phase = 1, created_on = COALESCE(?, created_on) WHERE id = ?',
        [t.kind || 'topics', t.meta ? JSON.stringify(t.meta) : null, t.startDate || null, t.id]);
      this.addSections(t.id, t.sections);
    }
    this.kvSet('seedVersion', version);
  }

  // --- settings & state ----------------------------------------------------
  getSettings() { return mergeDeep(DEFAULT_SETTINGS, this.kvGet('settings', {})); }
  setSettings(patch) {
    const next = mergeDeep(this.getSettings(), patch);
    this.kvSet('settings', next);
    return next;
  }
  getState() { return { ...DEFAULT_STATE, ...this.kvGet('state', {}) }; }
  setState(patch) {
    const next = { ...this.getState(), ...patch };
    this.kvSet('state', next);
    return next;
  }

  // --- tracks --------------------------------------------------------------
  seed({ tracks }, today = toDateStr()) {
    this.db.run('BEGIN');
    tracks.forEach((t, i) => this.insertTrack({ ...t, sort: i }, today));
    this.db.run('COMMIT');
    this.schedulePersist();
  }

  insertTrack(t, today = toDateStr()) {
    this.db.run(
      'INSERT INTO tracks (id, name, kind, pace, deadline, daily_target, color, sort, created_on, weight, meta) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [t.id, t.name, t.kind || 'topics', t.pace || 'normal', t.deadline || '20:00', t.dailyTarget || 0,
        t.color || '#E85D1F', t.sort ?? this.get('SELECT COUNT(*) AS n FROM tracks').n, t.startDate || today,
        t.weight ?? 0.35, t.meta ? JSON.stringify(t.meta) : null]
    );
    this.addSections(t.id, t.sections || []);
  }

  addSections(trackId, sections) {
    let sSort = this.get('SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM sections WHERE track_id = ?', [trackId]).n;
    let tSort = this.get('SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM topics WHERE track_id = ?', [trackId]).n;
    for (const s of sections) {
      const diff = (s.difficulty || 'MEDIUM').toUpperCase();
      const optional = s.optional ? 1 : 0;
      this.db.run('INSERT INTO sections (track_id, title, difficulty, sort, optional, phase) VALUES (?,?,?,?,?,?)',
        [trackId, s.title, diff, sSort++, optional, s.phase || 0]);
      const sectionId = this.lastId();
      for (const topic of s.topics) {
        let title = typeof topic === 'string' ? topic : topic.title;
        let tDiff = typeof topic === 'string' ? null : topic.difficulty;
        const tag = title.match(/\s*\[(EASY|MEDIUM|HARD)\]\s*$/i);
        if (tag) { title = title.slice(0, tag.index); tDiff = tag[1].toUpperCase(); }
        this.db.run('INSERT INTO topics (track_id, section_id, title, difficulty, sort, optional) VALUES (?,?,?,?,?,?)',
          [trackId, sectionId, title, tDiff || diff, tSort++, optional]);
      }
    }
  }

  tracks() {
    return this.all('SELECT * FROM tracks ORDER BY sort, created_on').map((t) => ({
      id: t.id, name: t.name, kind: t.kind, pace: t.pace, deadline: t.deadline,
      dailyTarget: t.daily_target, color: t.color, sort: t.sort, createdOn: t.created_on,
      weight: t.weight, meta: t.meta ? JSON.parse(t.meta) : null, currentPhase: t.current_phase,
      phase1Hours: t.phase1_hours, phase2Hours: t.phase2_hours, phase3Hours: t.phase3_hours,
      phase1ExamPassed: !!t.phase1_exam_passed, phase2ExamPassed: !!t.phase2_exam_passed, phase3ExamPassed: !!t.phase3_exam_passed
    }));
  }

  track(id) { return this.tracks().find((t) => t.id === id) || null; }

  updateTrack(id, patch, today = toDateStr()) {
    const map = { name: 'name', pace: 'pace', deadline: 'deadline', dailyTarget: 'daily_target', color: 'color' };
    for (const [k, col] of Object.entries(map)) {
      if (patch[k] !== undefined) this.run(`UPDATE tracks SET ${col} = ? WHERE id = ?`, [patch[k], id]);
    }
    // Pace or target changes re-plan today: keep carry, swap the base.
    if (patch.pace !== undefined || patch.dailyTarget !== undefined) {
      const row = this.get('SELECT * FROM days WHERE date = ? AND track_id = ?', [today, id]);
      if (row) {
        const track = this.track(id);
        const base = basePerDay(track);
        let quota = base + row.carry;
        if (track.kind === 'topics') quota = Math.min(quota, this.remainingBefore(id, today));
        this.run('UPDATE days SET base = ?, quota = ? WHERE date = ? AND track_id = ?', [base, quota, today, id]);
      }
    }
  }

  importTrack({ trackId, name, pace, deadline, color, sections }, today = toDateStr()) {
    this.db.run('BEGIN');
    let id = trackId;
    if (id && this.track(id)) {
      this.addSections(id, sections);
    } else {
      const slug = (name || 'course').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'course';
      id = slug;
      for (let i = 2; this.track(id); i++) id = `${slug}-${i}`;
      this.insertTrack({ id, name: name || 'Imported course', pace, deadline, color, sections }, today);
    }
    this.db.run('COMMIT');
    this.schedulePersist();
    return id;
  }

  deleteTrack(id) {
    for (const table of ['topics', 'sections', 'days']) this.run(`DELETE FROM ${table} WHERE track_id = ?`, [id]);
    this.run('DELETE FROM tracks WHERE id = ?', [id]);
  }

  sections(trackId) { return this.all('SELECT * FROM sections WHERE track_id = ? ORDER BY sort', [trackId]); }
  topics(trackId) { return this.all('SELECT * FROM topics WHERE track_id = ? ORDER BY sort', [trackId]); }
  topic(id) { return this.get('SELECT * FROM topics WHERE id = ?', [id]); }

  // --- progress ------------------------------------------------------------
  markStarted(today) {
    if (!this.getState().startedOn) this.setState({ startedOn: today });
  }

  // Topics in a phase that hasn't been unlocked yet can't be checked off.
  topicLocked(id) {
    const row = this.get(`SELECT s.phase AS phase, t.current_phase AS current, t.kind AS kind FROM topics x
      JOIN sections s ON s.id = x.section_id JOIN tracks t ON t.id = x.track_id WHERE x.id = ?`, [id]);
    return !!row && row.kind === 'phased' && row.phase > row.current;
  }

  setTopicDone(id, done, now = new Date()) {
    const today = toDateStr(now);
    if (this.topicLocked(id)) return false;
    if (done) {
      this.run('UPDATE topics SET done_date = ?, done_at = ? WHERE id = ? AND done_date IS NULL', [today, now.getTime(), id]);
      this.markStarted(today);
    } else {
      this.run('UPDATE topics SET done_date = NULL, done_at = NULL WHERE id = ?', [id]);
    }
    return true;
  }

  // --- daily logs (phased tracks) -------------------------------------------
  logs(trackId) { return this.all('SELECT * FROM daily_logs WHERE track_id = ? ORDER BY date', [trackId]); }
  log(date, trackId) { return this.get('SELECT * FROM daily_logs WHERE date = ? AND track_id = ?', [date, trackId]); }

  updateLog(date, trackId, patch) {
    if (!this.log(date, trackId)) {
      const track = this.track(trackId);
      this.db.run('INSERT INTO daily_logs (date, track_id, phase) VALUES (?,?,?)',
        [date, trackId, Math.min((track && track.currentPhase) || 1, 3)]);
    }
    const cols = Object.keys(patch).filter((k) => LOG_FIELDS.includes(k));
    if (cols.length) {
      this.db.run(`UPDATE daily_logs SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE date = ? AND track_id = ?`,
        [...cols.map((c) => (typeof patch[c] === 'boolean' ? Number(patch[c]) : patch[c])), date, trackId]);
    }
    this.schedulePersist();
  }

  // Adds (or with a negative value, removes) study hours for a day.
  addHours(date, trackId, hours) {
    const current = (this.log(date, trackId) || {}).hours_studied || 0;
    this.updateLog(date, trackId, { hours_studied: Math.max(0, Math.round((current + hours) * 1000) / 1000) });
    if (hours > 0) this.markStarted(date);
    this.refreshPhaseHours(trackId);
  }

  refreshPhaseHours(trackId) {
    for (const n of [1, 2, 3]) {
      const h = this.get('SELECT COALESCE(SUM(hours_studied), 0) AS h FROM daily_logs WHERE track_id = ? AND phase = ?', [trackId, n]).h;
      this.run(`UPDATE tracks SET phase${n}_hours = ? WHERE id = ?`, [h, trackId]);
    }
  }

  // Records a mock exam result. A pass (≥ passScore) unlocks the next phase.
  recordExam(trackId, phase, score, date, passScore) {
    const passed = score >= passScore;
    this.updateLog(date, trackId, { mock_exam_score: score, mock_exam_passed: passed ? 1 : 0, exam_phase: phase });
    if (passed) {
      this.run(`UPDATE tracks SET phase${phase}_exam_passed = 1, current_phase = MAX(current_phase, ?) WHERE id = ?`, [phase + 1, trackId]);
    }
    return passed;
  }

  notes(from, to) {
    return this.all(`SELECT l.date, l.track_id, l.notes, l.hours_studied, t.name FROM daily_logs l JOIN tracks t ON t.id = l.track_id
      WHERE l.date >= ? AND l.date <= ? AND l.notes IS NOT NULL AND l.notes != '' ORDER BY l.date DESC`, [from, to]);
  }

  addApplication({ company, role, subject, source = 'manual', messageId = null, sentAt = Date.now() }) {
    const date = toDateStr(new Date(sentAt));
    if (messageId && this.get('SELECT 1 AS x FROM applications WHERE message_id = ?', [messageId])) return null;
    this.run('INSERT INTO applications (company, role, subject, source, message_id, date, sent_at) VALUES (?,?,?,?,?,?,?)',
      [company || '', role || '', subject || '', source, messageId, date, sentAt]);
    this.markStarted(toDateStr());
    return this.lastId();
  }
  removeApplication(id) { this.run('DELETE FROM applications WHERE id = ?', [id]); }
  applications(limit = 200) {
    return this.all('SELECT * FROM applications ORDER BY sent_at DESC LIMIT ?', [limit]);
  }

  logPomodoro({ minutes, topicId = null, now = new Date() }) {
    this.run('INSERT INTO pomodoros (date, started_at, minutes, topic_id) VALUES (?,?,?,?)',
      [toDateStr(now), now.getTime(), minutes, topicId]);
  }

  remainingBefore(trackId, date) {
    return this.get(
      'SELECT COUNT(*) AS n FROM topics WHERE track_id = ? AND optional = 0 AND (done_date IS NULL OR done_date >= ?)',
      [trackId, date]
    ).n;
  }

  // Completed counts keyed `${date}|${trackId}`.
  doneCounts(fromDate) {
    const map = new Map();
    for (const r of this.all('SELECT done_date AS d, track_id AS t, COUNT(*) AS n FROM topics WHERE done_date >= ? AND optional = 0 GROUP BY d, t', [fromDate])) {
      map.set(`${r.d}|${r.t}`, r.n);
    }
    const tracks = this.tracks();
    const apps = tracks.filter((t) => t.kind === 'count');
    for (const r of this.all('SELECT date AS d, COUNT(*) AS n FROM applications WHERE date >= ? GROUP BY d', [fromDate])) {
      for (const t of apps) map.set(`${r.d}|${t.id}`, r.n);
    }
    // Phased tracks count completed daily "units" (hours, checklist, grammar).
    for (const t of tracks.filter((x) => x.kind === 'phased')) {
      for (const [k] of map) if (k.endsWith(`|${t.id}`)) map.delete(k);
      for (const r of this.all('SELECT date, units_done FROM daily_logs WHERE track_id = ? AND date >= ?', [t.id, fromDate])) {
        map.set(`${r.date}|${t.id}`, r.units_done);
      }
    }
    return map;
  }

  // Creates quota rows for every day from the last recorded day through today.
  // Days the app wasn't opened still get rows, so they count as missed.
  ensureDays(today) {
    const { startedOn, recovery } = this.getState();
    if (!startedOn) return;
    const last = this.get('SELECT MAX(date) AS d FROM days').d;
    let from = last && last >= startedOn ? last : startedOn;
    if (daysBetween(from, today) > 400) from = addDays(today, -400);
    const tracks = this.tracks();
    const counts = this.doneCounts(addDays(from, -1));
    const existing = new Set(this.all('SELECT date, track_id FROM days WHERE date >= ?', [addDays(from, -1)])
      .map((r) => `${r.date}|${r.track_id}`));

    this.db.run('BEGIN');
    for (let d = from; d <= today; d = addDays(d, 1)) {
      const prevDate = addDays(d, -1);
      const prevRows = this.all('SELECT * FROM days WHERE date = ?', [prevDate]);
      const prevTotal = prevRows.reduce((a, r) => a + (counts.get(`${prevDate}|${r.track_id}`) || 0), 0);
      for (const t of tracks) {
        if (t.createdOn > d || existing.has(`${d}|${t.id}`)) continue;
        const prevRow = prevRows.find((r) => r.track_id === t.id);
        const prev = prevRow ? { quota: prevRow.quota, done: counts.get(`${prevDate}|${t.id}`) || 0 } : null;
        let recoveryExtra = null;
        if (recovery && recovery.extra && recovery.extra[t.id]) {
          const idx = daysBetween(recovery.start, d);
          if (idx >= 0 && idx < recovery.extra[t.id].length) recoveryExtra = recovery.extra[t.id][idx];
        }
        const q = t.kind === 'phased' ? { base: 1, carry: 0, quota: 1 } : nextQuota({
          base: basePerDay(t),
          prev,
          prevDayMissed: prevRows.length > 0 && prevTotal === 0,
          remaining: t.kind === 'topics' ? this.remainingBefore(t.id, d) : null,
          recoveryExtra,
          isCount: t.kind === 'count'
        });
        this.db.run('INSERT INTO days (date, track_id, base, carry, quota) VALUES (?,?,?,?,?)',
          [d, t.id, q.base, q.carry, q.quota]);
        existing.add(`${d}|${t.id}`);
      }
    }
    this.db.run('COMMIT');
    this.schedulePersist();
  }

  // Re-plans today and the coming days after a recovery plan is accepted.
  replanFrom(date) {
    this.run('DELETE FROM days WHERE date >= ?', [date]);
    this.ensureDays(date);
  }

  // Per-day results from `from` to `to` inclusive.
  history(from, to) {
    const rows = this.all('SELECT * FROM days WHERE date >= ? AND date <= ? ORDER BY date', [from, to]);
    const counts = this.doneCounts(from);
    const logQuota = new Map(this.all('SELECT date, track_id, units_quota FROM daily_logs WHERE date >= ? AND units_quota > 0', [from])
      .map((l) => [`${l.date}|${l.track_id}`, l.units_quota]));
    const byDate = new Map();
    for (const r of rows) {
      const done = counts.get(`${r.date}|${r.track_id}`) || 0;
      const quota = logQuota.get(`${r.date}|${r.track_id}`) || r.quota;
      if (!byDate.has(r.date)) byDate.set(r.date, { date: r.date, tracks: {}, totalDone: 0, totalQuota: 0, complete: true });
      const day = byDate.get(r.date);
      day.tracks[r.track_id] = { quota, done, base: r.base, carry: r.carry };
      day.totalDone += done;
      day.totalQuota += quota;
      if (done < quota) day.complete = false;
    }
    return [...byDate.values()];
  }

  todayRow(trackId, today) {
    return this.get('SELECT * FROM days WHERE date = ? AND track_id = ?', [today, trackId]);
  }

  pomodoroMinutes(from) {
    return this.all('SELECT date, SUM(minutes) AS minutes FROM pomodoros WHERE date >= ? GROUP BY date', [from]);
  }
}

module.exports = { Store, DEFAULT_SETTINGS, DEFAULT_STATE, mergeDeep };
