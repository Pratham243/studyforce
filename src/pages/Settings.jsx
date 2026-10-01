import { useEffect, useState } from 'react';
import { invoke } from '../lib/api';

// Text inputs save on blur so typing doesn't write the DB on every keystroke.
function Text({ label, value, onSave, type = 'text', placeholder }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => setV(value ?? ''), [value]);
  return (
    <label className="field"><span>{label}</span>
      <input type={type} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== (value ?? '') && onSave(type === 'number' ? Number(v) : v)} />
    </label>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="row" style={{ cursor: 'pointer', alignItems: 'flex-start' }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3 }} />
      <span><span>{label}</span>{hint && <span className="small muted" style={{ display: 'block' }}>{hint}</span>}</span>
    </label>
  );
}

export default function Settings({ snap }) {
  const s = snap.settings;
  const set = (patch) => invoke('settings:set', patch);
  const [msg, setMsg] = useState({});
  const run = (key, fn) => async () => {
    setMsg((m) => ({ ...m, [key]: '…' }));
    try { const r = await fn(); setMsg((m) => ({ ...m, [key]: r || 'Done' })); } catch (e) { setMsg((m) => ({ ...m, [key]: `⚠ ${e.message}` })); }
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="topbar"><h1 className="grow">Settings</h1></div>
      <div className="grid cols-2">
        <div className="card stack">
          <h3>General</h3>
          <div className="row">
            <span className="grow">Theme</span>
            <div className="seg">
              {['dark', 'light'].map((t) => <button key={t} className={s.theme === t ? 'on' : ''} onClick={() => set({ theme: t })}>{t}</button>)}
            </div>
          </div>
          <div className="grid cols-3" style={{ gap: 10 }}>
            <Text label="Wake / briefing" type="time" value={s.wakeTime} onSave={(v) => set({ wakeTime: v })} />
            <Text label="Alerts stop at" type="time" value={s.sleepTime} onSave={(v) => set({ sleepTime: v })} />
            <Text label="Daily report at" type="time" value={s.reportTime} onSave={(v) => set({ reportTime: v })} />
          </div>
          <Toggle label="Owl reminders" hint="Every 30 min; every 15 min after a deadline passes." checked={s.alertsEnabled} onChange={(v) => set({ alertsEnabled: v })} />
          <Toggle label="Keep desktop widget on top" checked={s.widgetOnTop} onChange={(v) => set({ widgetOnTop: v })} />
          <Toggle label="Shame wallpaper on missed days" hint="Windows and macOS; Linux depends on your desktop." checked={s.wallpaperPunish} onChange={(v) => set({ wallpaperPunish: v })} />
          <Toggle label="Start StudyForce when I log in" checked={s.openAtLogin} onChange={(v) => set({ openAtLogin: v })} />
          <div className="row wrap">
            <button className="sm" onClick={() => invoke('alert:test', 'nudge')}>Preview reminder</button>
            <button className="sm" onClick={() => invoke('alert:test', 'briefing')}>Preview briefing</button>
            <button className="sm" onClick={run('wp', () => invoke('wallpaper:preview').then(() => 'Shame wallpaper set — restore it from the dashboard'))}>Test shame wallpaper</button>
          </div>
          {msg.wp && <div className="small muted">{msg.wp}</div>}
        </div>

        <div className="card stack">
          <h3>Deadlines</h3>
          {snap.tracks.map((t) => (
            <div key={t.id} className="row">
              <span className="dot" style={{ width: 8, height: 8, borderRadius: 4, background: t.color }} />
              <span className="grow">{t.name}</span>
              <input type="time" style={{ width: 130 }} value={t.deadline} onChange={(e) => invoke('track:update', t.id, { deadline: e.target.value })} />
            </div>
          ))}
          <h3 style={{ marginTop: 8 }}>Focus</h3>
          <div className="grid cols-3" style={{ gap: 10 }}>
            <Text label="Focus (min)" type="number" value={s.pomodoro.work} onSave={(v) => set({ pomodoro: { work: v } })} />
            <Text label="Short break" type="number" value={s.pomodoro.short} onSave={(v) => set({ pomodoro: { short: v } })} />
            <Text label="Long break" type="number" value={s.pomodoro.long} onSave={(v) => set({ pomodoro: { long: v } })} />
          </div>
          <Text label="Study-mode music URL" value={s.lofiUrl} onSave={(v) => set({ lofiUrl: v })} />
        </div>

        <div className="card stack">
          <h3>Telegram</h3>
          <div className="small muted">Message @BotFather → /newbot → copy the token. Then send your bot any message and click “Find chat ID”.</div>
          <Text label="Bot token" value={s.telegram.token} placeholder="123456:ABC…" onSave={(v) => set({ telegram: { token: v.trim() } })} />
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div className="grow"><Text label="Your chat ID" value={s.telegram.chatId} onSave={(v) => set({ telegram: { chatId: v.trim() } })} /></div>
            <button onClick={run('tgfind', async () => {
              const chat = await invoke('telegram:findChat', s.telegram.token);
              await set({ telegram: { chatId: chat.id } });
              return `Found ${chat.name || 'chat'} (${chat.id})`;
            })} disabled={!s.telegram.token}>Find chat ID</button>
          </div>
          {msg.tgfind && <div className="small muted">{msg.tgfind}</div>}
          <Toggle label="Send reminders to my phone" checked={s.telegram.enabled} onChange={(v) => set({ telegram: { enabled: v } })} />
          <button onClick={run('tg', () => invoke('telegram:test').then(() => 'Sent — check Telegram'))} disabled={!s.telegram.token || !s.telegram.chatId}>Send test message</button>
          {msg.tg && <div className="small muted">{msg.tg}</div>}
        </div>

        <div className="card stack">
          <h3>Public accountability</h3>
          <div className="small muted">Posts your daily progress, and “❌ Missed day”, where others can see it.</div>
          <Text label="Telegram channel ID (bot must be an admin)" placeholder="@mychannel or -100…" value={s.telegram.channelId} onSave={(v) => set({ telegram: { channelId: v.trim() } })} />
          <Text label="Discord webhook URL" value={s.discordWebhook} onSave={(v) => set({ discordWebhook: v.trim() })} />
          <Toggle label="Post daily progress publicly" checked={s.publicPosting} onChange={(v) => set({ publicPosting: v })} />
          <button onClick={run('pub', async () => { const errs = await invoke('public:test'); return errs.length ? `⚠ ${errs.join('; ')}` : 'Posted'; })}>Post today's progress now</button>
          {msg.pub && <div className="small muted">{msg.pub}</div>}
        </div>

        <div className="card stack" style={{ gridColumn: '1 / -1' }}>
          <h3>Gmail — auto-detect job applications</h3>
          <div className="small muted">
            In Google Cloud Console: create a project → enable the Gmail API → OAuth consent screen (add yourself as a test user) →
            Credentials → OAuth client ID → type “Desktop app”. Paste the client ID and secret here, then Connect. Read-only access is requested.
          </div>
          <div className="grid cols-2" style={{ gap: 10 }}>
            <Text label="OAuth client ID" value={s.gmail.clientId} onSave={(v) => set({ gmail: { clientId: v.trim() } })} />
            <Text label="OAuth client secret" type="password" value={s.gmail.clientSecret} onSave={(v) => set({ gmail: { clientSecret: v.trim() } })} />
          </div>
          <Text label="Search query for application emails" value={s.gmail.query} onSave={(v) => set({ gmail: { query: v } })} />
          <div className="row">
            {s.gmail.refreshToken ? (
              <>
                <span className="grow">✅ Connected as <b>{s.gmail.email}</b></span>
                <Toggle label="Polling on" checked={s.gmail.enabled} onChange={(v) => set({ gmail: { enabled: v } })} />
                <button className="danger" onClick={() => invoke('gmail:disconnect')}>Disconnect</button>
              </>
            ) : (
              <button className="primary" disabled={!s.gmail.clientId || !s.gmail.clientSecret}
                onClick={run('gm', () => invoke('gmail:connect').then((e) => `Connected as ${e}`))}>Connect Gmail</button>
            )}
          </div>
          {msg.gm && <div className="small muted">{msg.gm}</div>}
        </div>
      </div>
    </div>
  );
}
