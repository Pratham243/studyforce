import { useState } from 'react';
import { invoke } from '../lib/api';
import { PACE_OPTIONS } from '../components/ui';

const DIFFS = ['EASY', 'MEDIUM', 'HARD'];

export default function ImportPage({ snap, onDone }) {
  const [text, setText] = useState('');
  const [sections, setSections] = useState(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('new');
  const [pace, setPace] = useState('normal');
  const [deadline, setDeadline] = useState('18:00');
  const [error, setError] = useState('');
  const topicTracks = snap.tracks.filter((t) => t.kind !== 'count');

  const pickPdf = async () => {
    setError('');
    try {
      const res = await invoke('import:pickPdf');
      if (!res) return;
      setText(res.text);
      setSections(res.sections);
      setName(res.fileName);
      if (!res.sections.length) setError('No sections or topics were recognised. Edit the text below and re-parse.');
    } catch (e) { setError(e.message); }
  };
  const parse = async () => setSections(await invoke('import:parseText', text));
  const update = (i, patch) => setSections((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const total = sections ? sections.reduce((a, s) => a + s.topics.length, 0) : 0;

  const commit = async () => {
    const id = await invoke('import:commit', {
      trackId: target === 'new' ? null : target,
      name: name || 'Imported course', pace, deadline, color: '#B57CFF',
      sections
    });
    onDone(id);
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="topbar"><h1 className="grow">Import a course</h1></div>
      <div className="grid cols-2">
        <div className="card stack">
          <h3>1 · Source</h3>
          <div className="small muted">Pick a course PDF (curriculum, syllabus, table of contents) or paste an outline. Lines like
            “Section 12: …”, “Module 3 – …” start sections; numbered or bulleted lines become topics. Add “HARD”, “MEDIUM” or “EASY” to a header to set difficulty.</div>
          <div className="row"><button className="primary" onClick={pickPdf}>Choose PDF…</button><span className="muted small">or paste below</span></div>
          <textarea rows={14} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'Section 1: Introduction — EASY\n1. Welcome\n2. Setup\nSection 2: Core ideas — HARD\n- Topic A\n- Topic B'} />
          <button onClick={parse} disabled={!text.trim()}>Parse text</button>
          {error && <div className="small" style={{ color: 'var(--danger)' }}>{error}</div>}
        </div>

        <div className="card stack">
          <h3>2 · Review {sections && <span className="muted small">— {sections.length} sections, {total} topics</span>}</h3>
          {!sections && <div className="muted small">Parsed sections will appear here.</div>}
          <div className="stack" style={{ gap: 6, maxHeight: 360, overflowY: 'auto' }}>
            {sections && sections.map((s, i) => (
              <div key={i} className="row" style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '6px 10px' }}>
                <input value={s.title} onChange={(e) => update(i, { title: e.target.value })} style={{ background: 'transparent', border: 'none', padding: 4 }} />
                <span className="mono small muted">{s.topics.length}</span>
                <select value={s.difficulty} onChange={(e) => update(i, { difficulty: e.target.value })} style={{ width: 110 }}>
                  {DIFFS.map((d) => <option key={d}>{d}</option>)}
                </select>
                <button className="ghost sm" onClick={() => setSections(sections.filter((_, j) => j !== i))} aria-label="Remove section">✕</button>
              </div>
            ))}
          </div>
          {sections && sections.length > 0 && (
            <>
              <h3>3 · Settings</h3>
              <label className="field"><span>Add to</span>
                <select value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="new">New track</option>
                  {topicTracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              {target === 'new' && (
                <div className="row">
                  <label className="field grow"><span>Track name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
                  <label className="field" style={{ width: 130 }}><span>Deadline</span><input type="time" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
                </div>
              )}
              {target === 'new' && (
                <label className="field"><span>Pace mode</span>
                  <div className="seg">{PACE_OPTIONS.map(([id, label, hint]) => <button key={id} className={pace === id ? 'on' : ''} onClick={() => setPace(id)}>{label} · {hint}</button>)}</div>
                </label>
              )}
              <button className="primary" onClick={commit}>Import {total} topics</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
