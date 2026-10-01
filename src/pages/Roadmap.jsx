import { useState } from 'react';
import { invoke } from '../lib/api';
import { fmtDate } from '../lib/format';
import { Bar, Difficulty, PaceSwitch, TopicRow } from '../components/ui';
import Owl from '../components/Owl';

const PASS = 60;
const fmtH = (h) => (Math.round(h * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });

function examLabel(p) {
  const e = p.exam;
  if (e.status === 'passed') return `${p.level} exam: passed (${e.best}/100)`;
  if (e.attempts.length) return `${p.level} exam: failed (${e.attempts[e.attempts.length - 1].score}/100)`;
  return `${p.level} exam: not yet taken`;
}

function ExamBox({ phase, onOpen }) {
  const e = phase.exam;
  const needTopics = phase.topicsTotal - phase.topicsDone;
  const needHours = Math.max(0, phase.hours - phase.hoursDone);
  let detail;
  if (e.status === 'passed') detail = `Passed with ${e.best}/100. ${phase.n < 3 ? 'Next phase unlocked.' : 'C1 reached!'}`;
  else if (e.status === 'locked') detail = 'Pass the previous phase first.';
  else if (e.status === 'not-ready') {
    detail = `Unlocks when ${[needTopics && `${needTopics} more topic${needTopics > 1 ? 's' : ''}`, needHours && `${fmtH(needHours)} more hours`].filter(Boolean).join(' and ')} are done.`;
  } else if (e.status === 'cooldown') detail = `Keep practicing. Retry after ${e.retryInDays} more day${e.retryInDays > 1 ? 's' : ''} of study.`;
  else detail = `Ready. You need ${PASS}/100 to pass.`;
  return (
    <div className={`exam-box ${e.status}`}>
      <span style={{ fontSize: 22 }}>{e.status === 'passed' ? '🏅' : e.status === 'available' ? '📝' : '🔒'}</span>
      <div className="grow">
        <b>{phase.examName}</b>
        <div className="small muted">{detail}</div>
        {e.attempts.length > 0 && <div className="small faint mono">Attempts: {e.attempts.map((a) => `${a.score}${a.passed ? '✓' : '✗'} (${fmtDate(a.date)})`).join(' · ')}</div>}
      </div>
      <button className={e.status === 'available' ? 'primary' : ''} disabled={e.status !== 'available'} onClick={onOpen}>
        {e.status === 'passed' ? 'Passed' : 'Goethe Mock Exam'}
      </button>
    </div>
  );
}

function ExamModal({ track, phase, onClose }) {
  const [score, setScore] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const n = Number(score);
  const valid = score !== '' && Number.isFinite(n) && n >= 0 && n <= 100;
  const submit = async () => {
    try { setResult(await invoke('german:exam', track.id, phase.n, n)); } catch (e) { setError(e.message); }
  };
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal stack pop-in" style={{ gap: 14, width: 'min(460px, 92vw)' }}>
        {result ? (
          <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
            <Owl mood={result.passed ? 'happy' : 'worried'} size={100} />
            <h2>{result.passed ? `Bestanden! ${result.score}/100` : `Not this time: ${result.score}/100`}</h2>
            <div className="muted">{result.passed
              ? (phase.n < 3 ? `Phase ${phase.n + 1} is unlocked.` : 'You have completed all three phases. C1 reached!')
              : 'Keep practicing. You can retry after 7 more days of study.'}</div>
            <button className="primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <h2>{phase.examName}</h2>
            <div className="small muted">Enter your mock exam score. {PASS} or more is a pass and unlocks the next phase.</div>
            <label className="field"><span>Score (0–100)</span>
              <input type="number" min="0" max="100" autoFocus value={score} onChange={(e) => setScore(e.target.value)} style={{ fontSize: 22, fontFamily: 'var(--font-mono)' }} />
            </label>
            {valid && <div className="row"><span className={`badge ${n >= PASS ? 'EASY' : 'HARD'}`}>{n >= PASS ? 'Pass' : 'Fail'}</span></div>}
            {error && <div className="small" style={{ color: 'var(--danger)' }}>{error}</div>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="ghost" onClick={onClose}>Cancel</button>
              <button className="primary" disabled={!valid} onClick={submit}>Save result</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Roadmap({ track }) {
  const g = track.german;
  const [open, setOpen] = useState(() => new Set([Math.min(g.currentPhase, 3)]));
  const [exam, setExam] = useState(null);
  const toggle = (n) => setOpen((o) => { const s = new Set(o); s.has(n) ? s.delete(n) : s.add(n); return s; });
  const ph = g.phase;

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="topbar">
        <span className="dot" style={{ width: 14, height: 14, borderRadius: 7, background: track.color }} />
        <div className="grow">
          <h1>{track.name} Roadmap</h1>
          <div className="muted">{g.target} · started {fmtDate(g.startDate, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <PaceSwitch track={track} />
      </div>

      <div className="card row wrap" style={{ gap: 24 }}>
        <div className="grow" style={{ minWidth: 260 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 16 }}>
            {g.finished ? 'All phases complete — C1 reached 🎓' : (
              <>Phase {ph.n}: <span className="mono">{ph.topicsDone}/{ph.topicsTotal}</span> topics · <span className="mono">{fmtH(ph.hoursDone)}/{ph.hours}</span> hours · {examLabel(ph)}</>
            )}
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>
            {g.avgHours ? 'At your current pace' : 'At your target pace'} (<span className="mono">{fmtH(g.avgHours || g.targetHours)}</span> hrs/day) → C1 by{' '}
            <b className="mono">{g.projected ? fmtDate(g.projected, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</b> · <span className="mono">{g.daysRemaining}</span> days to go
          </div>
        </div>
        <div className="stat"><span className="v">{fmtH(g.totalHours)}<span className="muted" style={{ fontSize: 16 }}>/{g.totalTarget}</span></span><span className="l">Total hours</span></div>
        <div className="stat"><span className="v">{g.phases.reduce((a, p) => a + p.topicsDone, 0)}<span className="muted" style={{ fontSize: 16 }}>/{g.phases.reduce((a, p) => a + p.topicsTotal, 0)}</span></span><span className="l">Grammar topics</span></div>
      </div>

      <div className="timeline">
        {g.phases.map((p) => {
          const sections = track.sections.filter((s) => s.phase === p.n);
          const isOpen = open.has(p.n);
          return (
            <div key={p.n} className={`tl-phase${p.current ? ' current' : ''}${p.passed ? ' passed' : ''}${p.locked ? ' locked' : ''}`}>
              <div className="tl-node">{p.passed ? '✓' : p.locked ? '🔒' : p.n}</div>
              <div className="card stack" style={{ gap: 12 }}>
                <div className="row" style={{ cursor: 'pointer' }} onClick={() => toggle(p.n)}>
                  <div className="grow">
                    <div className="row" style={{ gap: 8 }}>
                      <h2>{p.title}</h2>
                      {p.current && <span className="badge here-badge">Current</span>}
                      {p.locked && <span className="badge">Locked</span>}
                    </div>
                    <div className="small muted">{p.source} · needs {p.hours} hours + {p.examName}</div>
                  </div>
                  <span className="faint mono">{isOpen ? '▾' : '▸'}</span>
                </div>
                <div className="grid cols-2" style={{ gap: 14 }}>
                  <div>
                    <div className="row between small" style={{ marginBottom: 5 }}><span className="muted">Hours</span><span className="mono">{fmtH(p.hoursDone)}/{p.hours}</span></div>
                    <Bar value={p.hoursDone} max={p.hours} color={track.color} />
                  </div>
                  <div>
                    <div className="row between small" style={{ marginBottom: 5 }}><span className="muted">Topics</span><span className="mono">{p.topicsDone}/{p.topicsTotal}</span></div>
                    <Bar value={p.topicsDone} max={p.topicsTotal} color="var(--faint)" />
                  </div>
                </div>
                {isOpen && sections.map((s) => (
                  <div key={s.id}>
                    <div className="row" style={{ padding: '6px 10px' }}>
                      <h3 className="grow">{s.title}</h3>
                      <Difficulty value={s.difficulty} />
                      <span className="mono small muted" style={{ width: 40, textAlign: 'right' }}>{s.done}/{s.total}</span>
                    </div>
                    {s.topics.map((t) => <TopicRow key={t.id} topic={t} locked={s.locked} here={t.id === g.youAreHere} />)}
                  </div>
                ))}
                <ExamBox phase={p} onOpen={() => setExam(p)} />
              </div>
            </div>
          );
        })}
      </div>
      {exam && <ExamModal track={track} phase={exam} onClose={() => setExam(null)} />}
    </div>
  );
}
