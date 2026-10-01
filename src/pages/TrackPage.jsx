import { useState } from 'react';
import { invoke } from '../lib/api';
import { fmtDate } from '../lib/format';
import { Bar, Difficulty, PaceSwitch, TopicRow } from '../components/ui';

export default function TrackPage({ snap, track, onDeleted }) {
  const firstOpen = track.sections.findIndex((s) => s.done < s.total);
  const [open, setOpen] = useState(() => new Set(firstOpen >= 0 ? [track.sections[firstOpen].id] : []));
  const toggle = (id) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const seeded = ['ai', 'german'].includes(track.id);

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="topbar">
        <span className="dot" style={{ width: 14, height: 14, borderRadius: 7, background: track.color }} />
        <h1 className="grow">{track.name}</h1>
        <PaceSwitch track={track} />
      </div>

      <div className="grid cols-4">
        <div className="card tight stat"><span className="v">{track.percent}%</span><span className="l">Complete</span></div>
        <div className="card tight stat"><span className="v">{track.done}<span className="muted" style={{ fontSize: 16 }}>/{track.total}</span></span><span className="l">Topics</span></div>
        <div className="card tight stat"><span className="v">{track.doneToday}<span className="muted" style={{ fontSize: 16 }}>/{track.quota}</span></span><span className="l">Today</span></div>
        <div className="card tight stat">
          <span className="v" style={{ fontSize: 20 }}>{track.projectedFinish ? fmtDate(track.projectedFinish, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Done'}</span>
          <span className="l">Projected finish · {track.paceInfo.label}</span>
        </div>
      </div>

      <div className="card">
        <Bar value={track.done} max={track.total} color={track.color} lg />
        <div className="row wrap" style={{ marginTop: 14, gap: 16 }}>
          <label className="field" style={{ width: 160 }}><span>Daily deadline</span>
            <input type="time" value={track.deadline} onChange={(e) => invoke('track:update', track.id, { deadline: e.target.value })} />
          </label>
          <label className="field" style={{ width: 160 }}><span>Accent color</span>
            <input type="color" value={track.color} style={{ height: 38, padding: 4 }} onChange={(e) => invoke('track:update', track.id, { color: e.target.value })} />
          </label>
          <div className="grow" />
          {!seeded && (
            <button className="danger" onClick={() => {
              if (confirm(`Delete ${track.name} and all of its progress?`)) invoke('track:delete', track.id).then(onDeleted);
            }}>Delete track</button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 8 }}>
        {track.sections.map((s) => (
          <div key={s.id}>
            <div className="section-head" onClick={() => toggle(s.id)}>
              <span className="faint mono" style={{ width: 14 }}>{open.has(s.id) ? '▾' : '▸'}</span>
              <h3 className="grow ellipsis">{s.title}</h3>
              <Difficulty value={s.difficulty} />
              <span className="mono small muted" style={{ width: 54, textAlign: 'right' }}>{s.done}/{s.total}</span>
              <div style={{ width: 120 }}><Bar value={s.done} max={s.total} color={s.done === s.total ? 'var(--ok)' : track.color} /></div>
            </div>
            {open.has(s.id) && (
              <div style={{ padding: '0 0 8px 24px' }}>
                {s.topics.map((t) => <TopicRow key={t.id} topic={t} />)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
