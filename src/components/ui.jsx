import { useEffect, useState } from 'react';
import { invoke } from '../lib/api';

export function Bar({ value, max = 100, color, lg, striped }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  // Start at 0 so the fill animates in.
  const [w, setW] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(pct)); return () => cancelAnimationFrame(id); }, [pct]);
  return (
    <div className={`bar${lg ? ' lg' : ''}${striped ? ' striped' : ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${w}%`, '--fill': color }} />
    </div>
  );
}

export function Difficulty({ value }) {
  return <span className={`badge ${value}`}>{value}</span>;
}

export const PACE_OPTIONS = [
  ['normal', 'Normal', '4–5/day'],
  ['fast', 'Fast', '7–8/day'],
  ['intensive', 'Intensive', '10+/day']
];

const HOURS = { normal: 2, fast: 3.5, intensive: 5 };

export function PaceSwitch({ track }) {
  const phased = track.kind === 'phased';
  return (
    <div className="seg" title="Pace mode — completion date adjusts instantly">
      {PACE_OPTIONS.map(([id, label, hint]) => {
        const finish = phased && track.german.paceProjections[id];
        const tip = phased ? `${HOURS[id]} h/day${finish ? ` → C1 by ${finish}` : ''}` : hint;
        return (
          <button key={id} className={track.pace === id ? 'on' : ''} title={tip}
            onClick={() => invoke('track:update', track.id, { pace: id })}>
            {label}{phased && <span style={{ opacity: 0.75 }}> {HOURS[id]}h</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TopicRow({ topic, showSection, locked, here }) {
  const done = !!topic.doneDate;
  const toggle = () => !locked && invoke('topic:toggle', topic.id, !done).catch(() => {});
  return (
    <div className={`topic${done ? ' done' : ''}${locked ? ' locked' : ''}${here ? ' here' : ''}`} role="checkbox"
      aria-checked={done} aria-disabled={locked || undefined} tabIndex={locked ? -1 : 0}
      onClick={toggle}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), toggle())}>
      <span className="check">{locked && !done ? '🔒' : null}</span>
      <div className="grow">
        {here && <div className="here-tag">▶ You are here</div>}
        <div className="t ellipsis">{topic.title}</div>
        {showSection && topic.section && <div className="small faint ellipsis">{topic.section}</div>}
      </div>
      <Difficulty value={topic.difficulty} />
    </div>
  );
}

const COLORS = ['#E85D1F', '#FFB020', '#2FBF71', '#3BA7FF', '#B57CFF', '#FF5C8A'];
export function Confetti({ burst }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!burst) return;
    setPieces(Array.from({ length: 140 }, (_, i) => ({
      id: `${burst}-${i}`, left: Math.random() * 100, delay: Math.random() * 0.6,
      dur: 2.2 + Math.random() * 1.8, color: COLORS[i % COLORS.length], rot: Math.random() * 360
    })));
    const t = setTimeout(() => setPieces([]), 4500);
    return () => clearTimeout(t);
  }, [burst]);
  if (!pieces.length) return null;
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p) => (
        <i key={p.id} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)` }} />
      ))}
    </div>
  );
}

// Requires several deliberate clicks before running `onConfirm`.
export function MultiClickButton({ clicks = 3, labels, onConfirm, className = 'danger' }) {
  const [n, setN] = useState(0);
  useEffect(() => { if (!n) return; const t = setTimeout(() => setN(0), 6000); return () => clearTimeout(t); }, [n]);
  return (
    <button className={className} onClick={() => {
      if (n + 1 >= clicks) { setN(0); onConfirm(); } else setN(n + 1);
    }}>{labels[n] || labels[labels.length - 1]}</button>
  );
}
