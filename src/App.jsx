import { useEffect, useState } from 'react';
import { on } from './lib/api';
import { useSnapshot, useTheme } from './lib/useSnapshot';
import { usePomodoro } from './lib/usePomodoro';
import { LEVEL_NAMES } from './lib/format';
import { Confetti } from './components/ui';
import Owl from './components/Owl';
import Dashboard from './pages/Dashboard';
import TrackPage from './pages/TrackPage';
import Roadmap from './pages/Roadmap';
import Applications from './pages/Applications';
import Focus from './pages/Focus';
import Reports from './pages/Reports';
import ImportPage from './pages/ImportPage';
import Settings from './pages/Settings';
import Recovery from './pages/Recovery';

export default function App() {
  const [snap] = useSnapshot();
  const [tab, setTab] = useState('dashboard');
  const [burst, setBurst] = useState(0);
  const pomodoro = usePomodoro(snap);
  useTheme(snap);

  useEffect(() => on('navigate', (t) => setTab(t)), []);
  useEffect(() => on('celebrate', () => setBurst(Date.now())), []);

  if (!snap) return <div className="row" style={{ height: '100%', justifyContent: 'center' }}><Owl size={90} /></div>;

  const p = snap.punishment;
  const topicTracks = snap.tracks.filter((t) => t.kind !== 'count');
  const appsTrack = snap.tracks.find((t) => t.kind === 'count');
  const nav = [
    ['dashboard', 'Dashboard', '◉'],
    ...topicTracks.map((t) => [`track:${t.id}`, t.name, t, t.kind === 'phased' ? `${Math.round(t.score * 100)}%` : `${t.doneToday}/${t.quota}`]),
    ...(appsTrack ? [['applications', appsTrack.name, appsTrack, `${appsTrack.doneToday}/${appsTrack.quota}`]] : []),
    ['focus', pomodoro.running ? `Focus · ${pomodoro.display}` : 'Focus', '◷'],
    ['reports', 'Weekly review', '▤'],
    ['import', 'Import PDF', '⤓'],
    ['settings', 'Settings', '⚙']
  ];

  let page;
  if (tab.startsWith('track:')) {
    const track = snap.tracks.find((t) => t.id === tab.slice(6));
    page = !track ? null : track.kind === 'phased'
      ? <Roadmap track={track} />
      : <TrackPage snap={snap} track={track} onDeleted={() => setTab('dashboard')} />;
  }
  page = page || {
    dashboard: <Dashboard snap={snap} go={setTab} />,
    applications: <Applications snap={snap} />,
    focus: <Focus snap={snap} pomodoro={pomodoro} />,
    reports: <Reports snap={snap} />,
    import: <ImportPage snap={snap} onDone={(id) => setTab(`track:${id}`)} />,
    settings: <Settings snap={snap} />
  }[tab] || <Dashboard snap={snap} go={setTab} />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><Owl mood={p.mood} size={34} /><b>Study<span>Force</span></b></div>
        {nav.slice(0, 1).map(renderNav)}
        <div className="nav-label">Tracks</div>
        {nav.slice(1, nav.length - 4).map(renderNav)}
        <div className="nav-label">Tools</div>
        {nav.slice(nav.length - 4).map(renderNav)}
        <div style={{ marginTop: 'auto', padding: '14px 10px 0' }} className="stack">
          <span className={`badge level-${p.level}`}>L{p.level} · {LEVEL_NAMES[p.level]}</span>
          <span className="small muted">🔥 <span className="mono">{snap.streak}</span> day streak</span>
        </div>
      </aside>
      <main className="main">{page}</main>
      <Confetti burst={burst} />
      {(snap.state.recoveryRequired || snap.state.alarmPending) && <Recovery snap={snap} />}
    </div>
  );

  function renderNav([id, label, icon, count]) {
    return (
      <button key={id} className={`nav-item${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
        {typeof icon === 'string' ? <span style={{ width: 8, textAlign: 'center' }}>{icon}</span> : <span className="dot" style={{ background: icon.color }} />}
        <span className="ellipsis">{label}</span>
        {count && <span className="count">{count}</span>}
      </button>
    );
  }
}
