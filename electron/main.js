const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell, screen, nativeImage, Notification } = require('electron');
const curriculum = require('../data/curriculum');
const { Store } = require('./lib/store');
const { buildSnapshot, newMilestones } = require('./lib/snapshot');
const { toDateStr, atTime } = require('./lib/dates');
const { recoverySchedule } = require('./lib/planner');
const { PASS_SCORE } = require('./lib/german');
const { parseTopics } = require('./lib/topicParser');
const notify = require('./services/notify');
const gmail = require('./services/gmail');
const wallpaper = require('./services/wallpaper');

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const ICON = path.join(__dirname, '..', 'assets', 'icon.png');
const TRAY_ICON = path.join(__dirname, '..', 'assets', 'tray.png');
const GMAIL_POLL_MS = 10 * 60 * 1000;
const OVERLAY_REPEAT_MS = 5 * 60 * 1000;

let store;
const win = { main: null, widget: null, alert: null, overlay: null };
let tray = null;
const runtime = { lastAlertAt: 0, overlayHiddenAt: 0, lastGmailPoll: 0, launchChecked: false, quitting: false };

if (!app.requestSingleInstanceLock()) app.quit();
// Reminder popups open without focus; let them play the siren anyway.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// --- windows ---------------------------------------------------------------
function load(w, route) {
  if (DEV_URL) w.loadURL(`${DEV_URL}#/${route}`);
  else w.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { hash: `/${route}` });
}

const webPreferences = { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false };

// Launched by "open at login": start in the tray with just the widget.
const startedHidden = process.argv.includes('--hidden');

// Only an installed build registers itself; in dev it would register electron.exe.
function applyLoginItem(enabled) {
  if (!app.isPackaged) return;
  app.setLoginItemSettings({ openAtLogin: !!enabled, openAsHidden: true, args: ['--hidden'] });
}

function createMain(show = true) {
  win.main = new BrowserWindow({
    width: 1280, height: 860, minWidth: 900, minHeight: 600, show: false,
    backgroundColor: '#0E0F12', title: 'StudyForce', icon: ICON, webPreferences
  });
  load(win.main, '');
  if (show) win.main.once('ready-to-show', () => win.main.show());
  win.main.on('close', (e) => {
    if (runtime.quitting) return;
    e.preventDefault();
    win.main.hide();
    // Closing the window only hides it; say so once so it doesn't look like a quit.
    if (!store.getState().trayHintShown) {
      store.setState({ trayHintShown: true });
      if (Notification.isSupported()) {
        new Notification({ title: 'StudyForce is still running', body: 'It keeps watching from the system tray (owl icon). Right-click it → Quit to stop.' }).show();
      }
    }
  });
}

function showMain(tab) {
  if (!win.main || win.main.isDestroyed()) createMain();
  win.main.show();
  win.main.focus();
  if (tab) win.main.webContents.send('navigate', tab);
}

function createWidget() {
  const { workArea } = screen.getPrimaryDisplay();
  win.widget = new BrowserWindow({
    width: 300, height: 290, x: workArea.x + workArea.width - 320, y: workArea.y + 20,
    frame: false, resizable: false, skipTaskbar: true, transparent: true, hasShadow: false,
    alwaysOnTop: store.getSettings().widgetOnTop, webPreferences
  });
  win.widget.setAlwaysOnTop(store.getSettings().widgetOnTop, 'floating');
  win.widget.setVisibleOnAllWorkspaces(true);
  load(win.widget, 'widget');
  win.widget.on('closed', () => { win.widget = null; });
}

function toggleWidget() {
  if (win.widget && !win.widget.isDestroyed()) win.widget.close();
  else createWidget();
}

// Owl popup in the bottom-right corner. mode: nudge | briefing | celebrate
function showAlert(mode = 'nudge', extra = {}) {
  if (win.alert && !win.alert.isDestroyed()) win.alert.close();
  const { workArea } = screen.getPrimaryDisplay();
  const big = mode === 'briefing';
  const w = big ? 440 : 400;
  const h = big ? 560 : 250;
  win.alert = new BrowserWindow({
    width: w, height: h, x: workArea.x + workArea.width - w - 16, y: workArea.y + workArea.height - h - 16,
    frame: false, resizable: false, skipTaskbar: true, transparent: true, hasShadow: false,
    alwaysOnTop: true, focusable: big, show: false, webPreferences
  });
  win.alert.setAlwaysOnTop(true, 'screen-saver');
  const qs = new URLSearchParams({ mode, ...extra }).toString();
  load(win.alert, `alert?${qs}`);
  win.alert.once('ready-to-show', () => win.alert && win.alert.showInactive());
  win.alert.on('closed', () => { win.alert = null; });
}

// Translucent strip over the bottom 20% of the screen. Click-through so it
// nags without trapping you.
function showOverlay() {
  if (win.overlay && !win.overlay.isDestroyed()) return;
  const { bounds } = screen.getPrimaryDisplay();
  const h = Math.round(bounds.height * 0.2);
  win.overlay = new BrowserWindow({
    x: bounds.x, y: bounds.y + bounds.height - h, width: bounds.width, height: h,
    frame: false, transparent: true, resizable: false, movable: false, focusable: false,
    skipTaskbar: true, alwaysOnTop: true, hasShadow: false, show: false, webPreferences
  });
  win.overlay.setAlwaysOnTop(true, 'screen-saver');
  win.overlay.setIgnoreMouseEvents(true);
  win.overlay.setVisibleOnAllWorkspaces(true);
  load(win.overlay, 'overlay');
  win.overlay.once('ready-to-show', () => win.overlay && win.overlay.showInactive());
  win.overlay.on('closed', () => { win.overlay = null; });
}

function hideOverlay() {
  if (win.overlay && !win.overlay.isDestroyed()) {
    win.overlay.close();
    runtime.overlayHiddenAt = Date.now();
  }
}

function createTray() {
  const img = fs.existsSync(TRAY_ICON) ? nativeImage.createFromPath(TRAY_ICON) : nativeImage.createEmpty();
  tray = new Tray(img);
  tray.setToolTip('StudyForce');
  tray.on('click', () => showMain());
  refreshTray();
}

function refreshTray(snap) {
  if (!tray) return;
  const s = snap || buildSnapshot(store);
  tray.setToolTip(`StudyForce — ${s.totals.left} tasks left today · 🔥 ${s.streak}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `${s.totals.doneToday}/${s.totals.quota} done today`, enabled: false },
    ...s.tracks.map((t) => ({ label: `  ${t.name}: ${t.doneToday}/${t.quota}`, enabled: false })),
    { type: 'separator' },
    { label: 'Open dashboard', click: () => showMain() },
    { label: 'Toggle desktop widget', click: toggleWidget },
    { label: 'Show reminder now', click: () => showAlert('nudge') },
    { label: 'Weekly review', click: () => showMain('reports') },
    { type: 'separator' },
    { label: 'Quit StudyForce', click: () => { runtime.quitting = true; app.quit(); } }
  ]));
}

function broadcast(channel = 'state:changed', payload) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload);
  }
}

function changed() {
  const snap = buildSnapshot(store);
  broadcast('state:changed');
  refreshTray(snap);
  return snap;
}

// --- punishment side effects ----------------------------------------------
async function renderShameImage() {
  const { size } = screen.getPrimaryDisplay();
  const w = new BrowserWindow({ width: size.width, height: size.height, show: false, webPreferences: { ...webPreferences, offscreen: true } });
  load(w, 'shame');
  await new Promise((r) => w.webContents.once('did-finish-load', r));
  await new Promise((r) => setTimeout(r, 800));
  const image = await w.webContents.capturePage();
  w.destroy();
  const file = path.join(app.getPath('userData'), 'shame-wallpaper.png');
  fs.writeFileSync(file, image.toPNG());
  return file;
}

async function applyShameWallpaper() {
  const state = store.getState();
  if (state.wallpaperLocked) return;
  const original = await wallpaper.getWallpaper();
  const file = await renderShameImage();
  if (await wallpaper.setWallpaper(file)) {
    store.setState({ wallpaperLocked: true, savedWallpaper: original || state.savedWallpaper });
  }
}

async function restoreWallpaper() {
  const { savedWallpaper } = store.getState();
  if (savedWallpaper) await wallpaper.setWallpaper(savedWallpaper);
  store.setState({ wallpaperLocked: false });
  changed();
}

async function applyDailyPunishment(snap) {
  const state = store.getState();
  if (state.lastPunishedDate === snap.today) return;
  const p = snap.punishment;
  if (p.level < 3 || state.recoveryRequired) {
    store.setState({ lastPunishedDate: snap.today });
    return;
  }
  const now = Date.now();
  const patch = { lastPunishedDate: snap.today, redUntil: now + 24 * 3600 * 1000 };
  if (p.level >= 4) {
    Object.assign(patch, { recoveryRequired: true, alarmPending: true, disappointedUntil: now + 7 * 24 * 3600 * 1000 });
  }
  store.setState(patch);
  const settings = store.getSettings();
  if (settings.publicPosting) {
    notify.postPublic(settings, `❌ Missed day — ${p.reason}. Streak reset to 0.`).catch(() => {});
  }
  if (settings.wallpaperPunish) applyShameWallpaper().catch((e) => console.warn(e));
  changed();
}

// --- scheduler -------------------------------------------------------------
function withinActiveHours(now, settings) {
  const today = toDateStr(now);
  return now >= atTime(today, settings.wakeTime) && now <= atTime(today, settings.sleepTime);
}

async function sendNag(snap) {
  const tg = store.getSettings().telegram;
  if (!tg.enabled || !tg.token || !tg.chatId) return;
  const lines = snap.tracks.filter((t) => t.left > 0).map((t) => `• ${t.name}: ${t.left} left (due ${t.deadline})`);
  notify.sendTelegram(tg, `🦉 ${snap.message}\n${lines.join('\n')}`).catch((e) => console.warn('[telegram]', e.message));
}

async function tick() {
  const now = new Date();
  const settings = store.getSettings();
  const state = store.getState();
  const snap = buildSnapshot(store, now);
  const p = snap.punishment;
  const active = withinActiveHours(now, settings);

  await applyDailyPunishment(snap);

  // Morning briefing (it also shows any punishment in effect).
  let briefed = false;
  if (settings.alertsEnabled && active && state.lastBriefingDate !== snap.today) {
    store.setState({ lastBriefingDate: snap.today });
    showAlert('briefing');
    runtime.lastAlertAt = now.getTime();
    briefed = true;
  }

  // Launch: yesterday unfinished → punishment immediately, whatever the hour.
  if (!runtime.launchChecked) {
    runtime.launchChecked = true;
    if (p.level >= 2 && !snap.todayComplete) {
      if (!briefed) showAlert('nudge');
      runtime.lastAlertAt = now.getTime();
      sendNag(snap);
    }
  }

  // Repeating reminders: 30 min, or 15 min once punishment kicks in.
  if (settings.alertsEnabled && active && !snap.todayComplete &&
      now.getTime() - runtime.lastAlertAt >= p.intervalMin * 60000) {
    runtime.lastAlertAt = now.getTime();
    showAlert('nudge');
    sendNag(snap);
  }

  // Level 2+ overlay, re-appearing every 5 minutes after a check-off hides it.
  if (p.level >= 2 && !snap.todayComplete && active) {
    if (now.getTime() - runtime.overlayHiddenAt >= OVERLAY_REPEAT_MS) showOverlay();
  } else {
    hideOverlay();
  }

  // End-of-day report + public progress post.
  if (state.lastReportDate !== snap.today && now >= atTime(snap.today, settings.reportTime)) {
    store.setState({ lastReportDate: snap.today });
    showMain('reports');
    if (settings.publicPosting) notify.postPublic(settings, notify.progressText(snap)).catch(() => {});
  }

  if (settings.gmail.enabled && settings.gmail.refreshToken && now.getTime() - runtime.lastGmailPoll >= GMAIL_POLL_MS) {
    runtime.lastGmailPoll = now.getTime();
    pollGmail().catch((e) => console.warn('[gmail]', e.message));
  }

  broadcast('tick');
  refreshTray(snap);
}

async function pollGmail() {
  const { gmail: cfg } = store.getSettings();
  const found = await gmail.pollSent(cfg);
  let added = 0;
  for (const m of found) {
    if (store.addApplication({ ...m, source: 'gmail' })) added++;
  }
  if (added) {
    changed();
    if (Notification.isSupported()) new Notification({ title: 'StudyForce', body: `Gmail: ${added} new application${added > 1 ? 's' : ''} logged` }).show();
  }
  return { found: found.length, added };
}

// --- check-off handling ------------------------------------------------------
function afterProgress(beforeSnap) {
  const snap = changed();
  hideOverlay();
  const state = store.getState();
  const reached = { ...state.milestones };
  let celebrate = null;
  for (const t of snap.tracks) {
    if (t.kind === 'count') continue;
    // Phased tracks celebrate passed mock exams instead of percentage milestones.
    const fresh = t.kind === 'topics' ? newMilestones(t, reached[t.id] || []) : [];
    if (fresh.length) {
      reached[t.id] = [...(reached[t.id] || []), ...fresh];
      celebrate = { kind: 'milestone', track: t.name, value: String(Math.max(...fresh)) };
    }
    const before = beforeSnap.tracks.find((x) => x.id === t.id);
    for (const s of t.sections) {
      const prev = before && before.sections.find((x) => x.id === s.id);
      if (prev && prev.done < prev.total && s.done === s.total) celebrate = celebrate || { kind: 'section', track: t.name, value: s.title };
    }
  }
  if (!beforeSnap.todayComplete && snap.todayComplete) celebrate = celebrate || { kind: 'day', track: '', value: '' };
  store.setState({ milestones: reached });
  if (celebrate) {
    showAlert('celebrate', celebrate);
    broadcast('celebrate', celebrate);
  }
  return snap;
}

// --- IPC ---------------------------------------------------------------------
function registerIpc() {
  const handle = (ch, fn) => ipcMain.handle(ch, async (_e, ...args) => fn(...args));

  handle('state:get', () => buildSnapshot(store));
  handle('topic:toggle', (id, done) => {
    const before = buildSnapshot(store);
    if (!store.setTopicDone(id, done)) throw new Error('This phase is locked until you pass the previous mock exam');
    return done ? afterProgress(before) : changed();
  });

  // Phased (German) track: hours, timer, checklist, notes, mock exams.
  handle('german:addHours', (trackId, hours) => {
    const before = buildSnapshot(store);
    store.addHours(toDateStr(), trackId, Number(hours) || 0);
    return hours > 0 ? afterProgress(before) : changed();
  });
  handle('german:timer', (trackId, action) => {
    const timers = { ...(store.getState().timers || {}) };
    if (action === 'start' && !timers[trackId]) timers[trackId] = Date.now();
    if (action === 'stop' && timers[trackId]) {
      const hours = (Date.now() - timers[trackId]) / 3600000;
      delete timers[trackId];
      store.setState({ timers });
      const before = buildSnapshot(store);
      store.addHours(toDateStr(), trackId, hours);
      return afterProgress(before);
    }
    store.setState({ timers });
    return changed();
  });
  handle('german:check', (trackId, key, value) => {
    const before = buildSnapshot(store);
    store.updateLog(toDateStr(), trackId, { [key]: value ? 1 : 0 });
    if (value) store.markStarted(toDateStr());
    return value ? afterProgress(before) : changed();
  });
  handle('german:notes', (trackId, notes) => { store.updateLog(toDateStr(), trackId, { notes }); return changed(); });
  handle('german:exam', (trackId, phase, score) => {
    const snap = buildSnapshot(store);
    const t = snap.tracks.find((x) => x.id === trackId);
    const ph = t && t.german && t.german.phases.find((p) => p.n === phase);
    if (!ph || ph.exam.status !== 'available') throw new Error('This mock exam is not available yet');
    const value = Math.max(0, Math.min(100, Math.round(Number(score))));
    const passed = store.recordExam(trackId, phase, value, snap.today, PASS_SCORE);
    if (passed) {
      const celebrate = { kind: 'exam', track: t.name, value: `${ph.examName} passed · ${value}/100` };
      showAlert('celebrate', celebrate);
      broadcast('celebrate', celebrate);
    }
    changed();
    return { passed, score: value };
  });
  handle('track:update', (id, patch) => { store.updateTrack(id, patch, toDateStr()); return changed(); });
  handle('track:delete', (id) => { store.deleteTrack(id); return changed(); });
  handle('app:add', (data) => {
    const before = buildSnapshot(store);
    store.addApplication({ ...data, source: 'manual' });
    return afterProgress(before);
  });
  handle('app:remove', (id) => { store.removeApplication(id); return changed(); });

  handle('settings:set', (patch) => {
    const s = store.setSettings(patch);
    if (win.widget && !win.widget.isDestroyed()) win.widget.setAlwaysOnTop(s.widgetOnTop, 'floating');
    if (patch.openAtLogin !== undefined) applyLoginItem(patch.openAtLogin);
    return changed();
  });

  handle('import:pickPdf', async () => {
    const res = await dialog.showOpenDialog(win.main, { properties: ['openFile'], filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (res.canceled || !res.filePaths[0]) return null;
    const file = res.filePaths[0];
    const pdf = require('pdf-parse/lib/pdf-parse.js');
    const { text } = await pdf(fs.readFileSync(file));
    return { fileName: path.basename(file, '.pdf'), text, sections: parseTopics(text) };
  });
  handle('import:parseText', (text) => parseTopics(text));
  handle('import:commit', (data) => { const id = store.importTrack(data, toDateStr()); changed(); return id; });

  handle('recovery:preview', () => recoveryBacklog(buildSnapshot(store)));
  handle('recovery:commit', (days) => {
    const snap = buildSnapshot(store);
    const backlog = recoveryBacklog(snap);
    const extra = Object.fromEntries(Object.entries(backlog).map(([id, n]) => [id, recoverySchedule(n, days)]));
    store.setState({ recovery: { start: snap.today, days, extra }, recoveryRequired: false, alarmPending: false });
    store.replanFrom(snap.today);
    return changed();
  });
  handle('alarm:ack', () => { store.setState({ alarmPending: false }); return true; });
  handle('wallpaper:restore', () => restoreWallpaper());
  handle('wallpaper:preview', () => applyShameWallpaper());

  handle('telegram:test', async () => {
    const tg = store.getSettings().telegram;
    await notify.sendTelegram(tg, '🦉 StudyForce is connected. I will be watching you.');
    return true;
  });
  handle('telegram:findChat', (token) => notify.findTelegramChatId(token));
  handle('public:test', async () => notify.postPublic(store.getSettings(), notify.progressText(buildSnapshot(store))));

  handle('gmail:connect', async () => {
    const { gmail: cfg } = store.getSettings();
    const { refreshToken, email } = await gmail.authorize(cfg, (url) => shell.openExternal(url));
    store.setSettings({ gmail: { refreshToken, email, enabled: true } });
    runtime.lastGmailPoll = 0;
    changed();
    return email;
  });
  handle('gmail:disconnect', () => { store.setSettings({ gmail: { refreshToken: '', email: '', enabled: false } }); return changed(); });
  handle('gmail:poll', () => pollGmail());

  handle('pomodoro:log', ({ minutes, topicId }) => { store.logPomodoro({ minutes, topicId }); return changed(); });
  handle('study:start', () => { const url = store.getSettings().lofiUrl; if (url) shell.openExternal(url); return true; });
  handle('external:open', (url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); });

  handle('window:showMain', (tab) => showMain(tab));
  handle('window:toggleWidget', () => toggleWidget());
  ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());
  handle('alert:test', (mode) => showAlert(mode || 'nudge'));
}

// Topics owed: sum of shortfalls over the current run of missed days.
function recoveryBacklog(snap) {
  const past = snap.history.filter((d) => !d.isToday);
  const out = Object.fromEntries(snap.tracks.map((t) => [t.id, 0]));
  for (let i = past.length - 1; i >= 0 && !past[i].complete; i--) {
    for (const [id, r] of Object.entries(past[i].tracks)) {
      if (id in out) out[id] += Math.max(0, r.base - r.done);
    }
  }
  for (const t of snap.tracks) {
    if (t.kind === 'phased') out[t.id] = 0; // hours can't be caught up as extra topics
    else if (t.kind === 'topics') out[t.id] = Math.min(out[t.id], Math.max(0, t.remaining - t.base));
  }
  return out;
}

// --- lifecycle ---------------------------------------------------------------
app.whenReady().then(async () => {
  if (process.platform === 'win32') app.setAppUserModelId('app.studyforce');
  store = await Store.open(path.join(app.getPath('userData'), 'studyforce.sqlite'), { seed: curriculum });
  registerIpc();
  applyLoginItem(store.getSettings().openAtLogin);
  createMain(!startedHidden);
  createTray();
  createWidget();
  setTimeout(tick, 3000);
  setInterval(tick, 30 * 1000);
});

app.on('second-instance', () => showMain());
app.on('activate', () => showMain());
app.on('before-quit', () => { runtime.quitting = true; if (store) store.flush(); });
app.on('window-all-closed', () => { /* keep running in the tray */ });
