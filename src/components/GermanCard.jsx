import { useEffect, useState } from 'react';
import { invoke } from '../lib/api';
import { fmtCountdown, fmtDate } from '../lib/format';
import { Bar, PaceSwitch, TopicRow } from './ui';

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const fmtH = (h) => (Math.round(h * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });

function useTicker(running) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
}

function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
}

// Saves on blur so typing doesn't write on every keystroke.
function Notes({ track }) {
  const [v, setV] = useState(track.german.notes);
  useEffect(() => setV(track.german.notes), [track.german.notes]);
  return (
    <label className="field"><span>Session notes — what was assigned or taught today</span>
      <textarea rows={3} value={v} placeholder="Paste today's lesson, exercises or feedback…" style={{ fontFamily: 'var(--font-body)', fontSize: 13, minHeight: 70 }}
        onChange={(e) => setV(e.target.value)} onBlur={() => v !== track.german.notes && invoke('german:notes', track.id, v)} />
    </label>
  );
}

export default function GermanCard({ track, go }) {
  const g = track.german;
  const ph = g.phase;
  const [manual, setManual] = useState('');
  useTicker(g.timerRunning);
  const running = g.timerRunning ? Math.max(0, Date.now() - g.timerStart) : 0;
  const liveToday = g.todayHours + running / 3600000;

  const addManual = (e) => {
    e.preventDefault();
    const h = parseFloat(manual.replace(',', '.'));
    if (!Number.isFinite(h) || h === 0) return;
    invoke('german:addHours', track.id, h);
    setManual('');
  };
  const rate = g.avgHours || g.targetHours;

  return (
    <div className="card stack">
      <div className="row between">
        <div className="row grow" style={{ cursor: 'pointer', minWidth: 0 }} onClick={() => go(`track:${track.id}`)}>
          <span className="dot" style={{ width: 10, height: 10, borderRadius: 5, background: track.color }} />
          <h2 className="ellipsis">{track.name}</h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: track.left === 0 && g.started ? 'var(--ok)' : track.minutesToDeadline < 0 ? 'var(--danger)' : 'var(--muted)' }}>
            {!g.started ? '—' : track.left === 0 ? 'DONE' : fmtCountdown(track.minutesToDeadline)}
          </div>
          <div className="small faint">due {track.deadline}</div>
        </div>
      </div>

      <div className="row wrap" style={{ gap: 8 }}>
        <span className="badge" style={{ color: 'var(--text)', borderColor: track.color }}>
          {g.finished ? '🎓 C1 reached' : <><b className="mono" style={{ color: track.color }}>{ph.n}</b>&nbsp;{ph.title}</>}
        </span>
        <span className="small muted">🔥 <span className="mono">{g.streak}</span> day German streak</span>
      </div>

      {!g.started && <div className="small" style={{ color: 'var(--warn)' }}>Track starts {fmtDate(g.startDate, { weekday: 'short', month: 'short', day: 'numeric' })}. Hours logged before then still count.</div>}

      <div>
        <div className="row between small" style={{ marginBottom: 6 }}>
          <span className="muted">Today's score</span>
          <span className="mono">{Math.round(track.score * 100)}%</span>
        </div>
        <Bar value={track.score * 100} max={100} color={track.color} />
      </div>

      {!g.finished && (
        <>
          <div>
            <div className="row between small" style={{ marginBottom: 6 }}>
              <span className="muted">Hours</span>
              <span className="mono">{fmtH(ph.hoursDone)}/{ph.hours} hours ({pct(ph.hoursDone, ph.hours)}%)</span>
            </div>
            <Bar value={ph.hoursDone} max={ph.hours} color={track.color} />
          </div>
          <div>
            <div className="row between small" style={{ marginBottom: 6 }}>
              <span className="muted">Grammar</span>
              <span className="mono">{ph.topicsDone}/{ph.topicsTotal} topics done ({pct(ph.topicsDone, ph.topicsTotal)}%)</span>
            </div>
            <Bar value={ph.topicsDone} max={ph.topicsTotal} color="var(--faint)" />
          </div>
        </>
      )}

      <div className="card tight stack" style={{ background: 'var(--surface-2)', gap: 10 }}>
        <div className="row between">
          <div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{g.timerRunning ? clock(running) : `${fmtH(liveToday)} h`}</div>
            <div className="small muted">{g.timerRunning ? `${fmtH(liveToday)} h today` : 'studied today'} · target {g.targetHours} h</div>
          </div>
          <button className={g.timerRunning ? 'danger' : 'primary'} onClick={() => invoke('german:timer', track.id, g.timerRunning ? 'stop' : 'start')}>
            {g.timerRunning ? '■ Stop' : '▶ Start'}
          </button>
        </div>
        <Bar value={liveToday} max={g.targetHours} color={track.color} />
        <form className="row" onSubmit={addManual}>
          <input inputMode="decimal" placeholder="Add hours manually, e.g. 1.5 (−0.5 to correct)" value={manual} onChange={(e) => setManual(e.target.value)} />
          <button type="submit">Add</button>
        </form>
      </div>

      <div className="stack" style={{ gap: 4 }}>
        <div className="small muted">Daily practice</div>
        {g.practice.map((p) => (
          <label key={p.key} className={`topic${p.done ? ' done' : ''}`} style={{ padding: '6px 10px' }}>
            <input type="checkbox" checked={p.done} onChange={(e) => invoke('german:check', track.id, p.key, e.target.checked)} style={{ display: 'none' }} />
            <span className="check" />
            <span className="t grow">{p.label}</span>
          </label>
        ))}
      </div>

      {!g.finished && (
        <div className="stack" style={{ gap: 2 }}>
          <div className="small muted">Grammar today · target <span className="mono">{fmtH(g.grammarTarget)}</span>/day for {g.daysToPhaseEnd} days</div>
          <div style={{ margin: '0 -10px' }}>
            {track.today.map((t) => <TopicRow key={t.id} topic={t} showSection here={t.id === g.youAreHere} />)}
            {track.today.length === 0 && <div className="small faint" style={{ padding: '6px 10px' }}>Grammar target met for today.</div>}
          </div>
        </div>
      )}

      <div className="small" style={{ lineHeight: 1.6 }}>
        {g.finished ? 'All three mock exams passed. Viel Erfolg beim echten Goethe-Zertifikat!' : (
          <>
            {g.avgHours ? 'At your current pace' : 'At your target pace'} (<span className="mono">{fmtH(rate)}</span> hrs/day) → C1 by{' '}
            <b className="mono">{fmtDate(g.projected, { month: 'long', day: 'numeric', year: 'numeric' })}</b>
            <br /><span className="mono">{g.daysRemaining}</span> <span className="muted">days to C1 · {fmtH(g.totalHours)}/{g.totalTarget} hours total</span>
          </>
        )}
      </div>

      <div className="row between wrap" style={{ gap: 8 }}>
        <PaceSwitch track={track} />
        <button onClick={() => go(`track:${track.id}`)}>🗺 Roadmap</button>
      </div>

      <Notes track={track} />
    </div>
  );
}
