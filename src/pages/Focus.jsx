import { invoke } from '../lib/api';
import { Difficulty } from '../components/ui';

const PHASES = { work: 'Focus', short: 'Short break', long: 'Long break' };

export default function Focus({ snap, pomodoro: p }) {
  const upcoming = snap.tracks.flatMap((t) => (t.today || []).filter((x) => !x.doneDate).map((x) => ({ ...x, track: t.name })));
  const current = upcoming.find((x) => x.id === p.topicId) || upcoming.find((x) => x.difficulty === 'HARD') || upcoming[0];
  const progress = 1 - p.left / p.length;
  const R = 120;
  const C = 2 * Math.PI * R;

  const studyMode = () => {
    invoke('study:start');
    if (current) p.setTopicId(current.id);
    p.start('work');
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="topbar"><h1 className="grow">Focus</h1></div>
      <div className="grid cols-2">
        <div className="card stack" style={{ alignItems: 'center', padding: 28 }}>
          <div className="seg">
            {Object.entries(PHASES).map(([id, label]) => (
              <button key={id} className={p.phase === id ? 'on' : ''} onClick={() => p.select(id)}>{label}</button>
            ))}
          </div>
          <svg width="280" height="280" viewBox="0 0 280 280" aria-label={`${p.display} remaining`}>
            <circle cx="140" cy="140" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
            <circle cx="140" cy="140" r={R} fill="none" stroke={p.phase === 'work' ? 'var(--accent)' : 'var(--ok)'} strokeWidth="14"
              strokeDasharray={C} strokeDashoffset={C * (1 - progress)} strokeLinecap="round" transform="rotate(-90 140 140)"
              style={{ transition: 'stroke-dashoffset 0.5s linear' }} />
            <text x="140" y="138" textAnchor="middle" fill="var(--text)" style={{ font: '700 54px var(--font-mono)' }}>{p.display}</text>
            <text x="140" y="172" textAnchor="middle" fill="var(--muted)" style={{ font: '500 14px var(--font-body)' }}>{PHASES[p.phase]} · round {p.rounds + 1}</text>
          </svg>
          <div className="row">
            {!p.running && !p.paused && <button className="primary" onClick={() => p.start()}>Start</button>}
            {p.running && <button onClick={p.pause}>Pause</button>}
            {p.paused && <button className="primary" onClick={p.resume}>Resume</button>}
            <button className="ghost" onClick={p.reset}>Reset</button>
          </div>
          <button onClick={studyMode} style={{ marginTop: 6 }}>🎧 Study mode — lo-fi + Pomodoro</button>
        </div>

        <div className="card stack">
          <h3>Working on</h3>
          {current ? (
            <div className="card tight" style={{ background: 'var(--surface-2)' }}>
              <div className="row between"><b>{current.title}</b><Difficulty value={current.difficulty} /></div>
              <div className="small muted">{current.track} · {current.section}</div>
              {current.difficulty === 'HARD' && <div className="small" style={{ marginTop: 8 }}>Hard topic: plan on two or three 25-minute blocks.</div>}
            </div>
          ) : <div className="muted">Nothing left today.</div>}
          <h3 style={{ marginTop: 8 }}>Today's queue</h3>
          <div className="stack" style={{ gap: 4 }}>
            {upcoming.map((t) => (
              <button key={t.id} className={`nav-item${current && current.id === t.id ? ' active' : ''}`} onClick={() => p.setTopicId(t.id)}>
                <span className="grow ellipsis">{t.title}</span>
                <Difficulty value={t.difficulty} />
              </button>
            ))}
          </div>
          {current && <button onClick={() => invoke('topic:toggle', current.id, true)}>✓ Mark "{current.title}" done</button>}
        </div>
      </div>
    </div>
  );
}
