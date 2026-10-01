import { useState } from 'react';
import { invoke } from '../lib/api';
import { fmtCountdown, fmtDate, fmtHours, LEVEL_NAMES } from '../lib/format';
import { Bar, PaceSwitch, TopicRow, MultiClickButton } from '../components/ui';
import Owl from '../components/Owl';
import GermanCard from '../components/GermanCard';

export default function Dashboard({ snap, go }) {
  const p = snap.punishment;
  const { totals } = snap;
  const pct = totals.percent;
  const hard = snap.tracks.flatMap((t) => (t.today || []).filter((x) => !x.doneDate && x.difficulty === 'HARD'))[0];

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="topbar">
        <div className="grow">
          <h1>{greeting()}</h1>
          <div className="muted">
            {fmtDate(snap.today, { weekday: 'long', month: 'long', day: 'numeric' })}
            {snap.dayNumber > 0 && <> · Day <span className="mono">{snap.dayNumber}</span></>}
          </div>
        </div>
        <button onClick={() => invoke('window:toggleWidget')}>Desktop widget</button>
      </div>

      <PunishmentBanner snap={snap} />

      <div className="card hero">
        <Owl mood={p.mood} size={110} />
        <div className="stack" style={{ gap: 14 }}>
          <div className="bubble" style={{ maxWidth: 560 }}>{snap.message}</div>
          <div className="grid cols-4" style={{ maxWidth: 620 }}>
            <Stat v={totals.left} l="Tasks left" />
            <Stat v={fmtHours(totals.estimatedMinutes)} l="Est. time" />
            <Stat v={`🔥${snap.streak}`} l="Streak" />
            <Stat v={nextDeadline(snap)} l="Next deadline" />
          </div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 180 }}>
          <div className="big-pct">{pct}<small>%</small></div>
          <div className="small muted" style={{ margin: '6px 0 10px' }} title="Weighted: each track's share of today's score">
            {snap.tracks.filter((t) => t.active !== false).map((t) => `${t.name.split(' ')[0]} ${Math.round(t.weight * 100)}%`).join(' · ')}
          </div>
          <Bar value={pct} max={100} lg striped={pct < 100} color={pct >= 100 ? 'var(--ok)' : undefined} />
        </div>
      </div>

      {hard && (
        <div className="card tight row">
          <span style={{ fontSize: 20 }}>🧠</span>
          <div className="grow"><b>Hard topic up next:</b> {hard.title}. A 25-minute focus block keeps it manageable.</div>
          <button className="primary" onClick={() => go('focus')}>Start Pomodoro</button>
        </div>
      )}

      <div className="grid cols-3">
        {snap.tracks.map((t) => (t.kind === 'count'
          ? <AppsCard key={t.id} track={t} snap={snap} go={go} />
          : t.kind === 'phased'
            ? <GermanCard key={t.id} track={t} go={go} />
            : <TrackCard key={t.id} track={t} go={go} />))}
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function nextDeadline(snap) {
  const pending = snap.tracks.filter((t) => t.left > 0);
  if (!pending.length) return '✓';
  const t = pending.reduce((a, b) => (b.minutesToDeadline < a.minutesToDeadline ? b : a));
  return fmtCountdown(t.minutesToDeadline);
}

function Stat({ v, l }) {
  return <div className="stat"><span className="v" style={{ fontSize: 22 }}>{v}</span><span className="l">{l}</span></div>;
}

function Deadline({ track }) {
  const done = track.left === 0;
  const m = track.minutesToDeadline;
  const color = done ? 'var(--ok)' : m < 0 ? 'var(--danger)' : m < 120 ? 'var(--warn)' : 'var(--muted)';
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="mono" style={{ color, fontSize: 18, fontWeight: 700 }}>{done ? 'DONE' : fmtCountdown(m)}</div>
      <div className="small faint">due {track.deadline}</div>
    </div>
  );
}

function TrackCard({ track, go }) {
  return (
    <div className="card stack">
      <div className="row between">
        <div className="row grow" style={{ cursor: 'pointer' }} onClick={() => go(`track:${track.id}`)}>
          <span className="dot" style={{ width: 10, height: 10, borderRadius: 5, background: track.color }} />
          <h2 className="ellipsis">{track.name}</h2>
        </div>
        <Deadline track={track} />
      </div>

      <div>
        <div className="row between small" style={{ marginBottom: 6 }}>
          <span className="muted">Today</span>
          <span className="mono">{track.doneToday}/{track.quota}
            {track.carry > 0 && <span style={{ color: 'var(--danger)' }}> (+{track.carry} carried)</span>}</span>
        </div>
        <Bar value={track.doneToday} max={track.quota} color={track.color} />
      </div>

      <div>
        <div className="row between small" style={{ marginBottom: 6 }}>
          <span className="muted">Overall <span className="mono">{track.done}/{track.total}</span></span>
          <span className="mono">{track.percent}%</span>
        </div>
        <Bar value={track.done} max={track.total} color="var(--faint)" />
        <div className="small faint" style={{ marginTop: 6 }}>
          Finish: <span className="mono" style={{ color: 'var(--text)' }}>{track.projectedFinish ? fmtDate(track.projectedFinish, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Complete 🎉'}</span>
        </div>
      </div>

      <PaceSwitch track={track} />

      <div className="stack" style={{ gap: 2, margin: '0 -10px' }}>
        {track.today.length === 0 && <div className="muted small" style={{ padding: 10 }}>Nothing left in this track. 🎉</div>}
        {track.today.map((t) => <TopicRow key={t.id} topic={t} showSection />)}
      </div>
      {track.today.length > 0 && <div className="small faint">≈ {fmtHours(track.estimatedMinutes)} remaining</div>}
    </div>
  );
}

function AppsCard({ track, snap, go }) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const todays = snap.applications.filter((a) => a.date === snap.today);
  const add = (e) => {
    e.preventDefault();
    if (!company.trim()) return;
    invoke('app:add', { company: company.trim(), role: role.trim() });
    setCompany(''); setRole('');
  };
  return (
    <div className="card stack">
      <div className="row between">
        <div className="row grow" style={{ cursor: 'pointer' }} onClick={() => go('applications')}>
          <span className="dot" style={{ width: 10, height: 10, borderRadius: 5, background: track.color }} />
          <h2>{track.name}</h2>
        </div>
        <Deadline track={track} />
      </div>
      <div>
        <div className="row between small" style={{ marginBottom: 6 }}>
          <span className="muted">Sent today</span>
          <span className="mono">{track.doneToday}/{track.quota}
            {track.carry > 0 && <span style={{ color: 'var(--danger)' }}> (+{track.carry} carried)</span>}</span>
        </div>
        <Bar value={track.doneToday} max={track.quota} color={track.color} />
      </div>
      <div className="small muted">
        {snap.settings.gmail.enabled
          ? <>📧 Watching Gmail sent folder ({snap.settings.gmail.email})</>
          : <>📧 Gmail not connected — <a href="#" onClick={(e) => { e.preventDefault(); go('settings'); }} style={{ color: 'var(--accent)' }}>connect</a> to auto-log applications</>}
      </div>
      <form className="stack" style={{ gap: 8 }} onSubmit={add}>
        <input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
        <div className="row">
          <input placeholder="Role (optional)" value={role} onChange={(e) => setRole(e.target.value)} />
          <button className="primary" type="submit">Log</button>
        </div>
      </form>
      <div className="stack" style={{ gap: 6 }}>
        {todays.map((a) => (
          <div key={a.id} className="row small">
            <span style={{ color: 'var(--ok)' }}>✓</span>
            <span className="grow ellipsis"><b>{a.company}</b>{a.role && <span className="muted"> · {a.role}</span>}</span>
            <span className="badge">{a.source}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PunishmentBanner({ snap }) {
  const p = snap.punishment;
  const locked = snap.state.wallpaperLocked;
  if (p.level < 2 && !p.red && !locked && !p.disappointed) return null;
  const warn = p.level === 2 && !p.red;
  return (
    <div className={`banner${warn ? ' warn' : ''}`}>
      <span className={`badge level-${p.level}`}>Level {p.level} · {LEVEL_NAMES[p.level]}</span>
      <div className="grow">
        <b>{p.reason}.</b>{' '}
        {p.level === 2 && 'Reminders every 15 minutes and the overlay stays until you check something off.'}
        {p.level === 3 && 'Dashboard is red for 24 hours, streak reset, +1 penalty topic added to today.'}
        {p.level >= 4 && 'Complete your recovery plan to bring the dashboard back.'}
        {p.level < 3 && p.red && 'Shame mode stays on for 24 hours after a missed day.'}
        {p.disappointed && p.level < 4 && ' The owl is still disappointed in you.'}
      </div>
      {locked && (
        <MultiClickButton labels={['Restore wallpaper', 'Are you sure?', 'Really? Click once more']}
          onConfirm={() => invoke('wallpaper:restore')} />
      )}
    </div>
  );
}
