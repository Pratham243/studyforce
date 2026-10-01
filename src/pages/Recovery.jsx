import { useEffect, useRef, useState } from 'react';
import { invoke } from '../lib/api';
import { addDaysLocal } from '../lib/dates';
import { fmtDate } from '../lib/format';
import { playAlarm } from '../lib/sound';
import Owl from '../components/Owl';

function split(n, days) {
  return Array.from({ length: days }, (_, i) => Math.floor(n / days) + (i < n % days ? 1 : 0));
}

// Level 4: blocks the dashboard until a catch-up schedule is committed.
export default function Recovery({ snap }) {
  const [backlog, setBacklog] = useState(null);
  const [days, setDays] = useState(3);
  const [commit, setCommit] = useState(false);
  const stop = useRef(null);
  const alarm = snap.state.alarmPending;

  useEffect(() => { invoke('recovery:preview').then(setBacklog); }, []);
  useEffect(() => {
    if (!alarm) return;
    stop.current = playAlarm(8);
    return () => stop.current && stop.current();
  }, [alarm]);

  const silence = () => { if (stop.current) stop.current(); invoke('alarm:ack'); };

  if (!snap.state.recoveryRequired) {
    // Alarm only (shouldn't normally happen without a recovery requirement).
    return (
      <div className="modal-back"><div className="card modal stack" style={{ alignItems: 'center' }}>
        <Owl mood="disappointed" size={100} /><h2>Wake up.</h2><button className="primary" onClick={silence}>Stop alarm</button>
      </div></div>
    );
  }

  const tracks = snap.tracks.filter((t) => backlog && backlog[t.id] > 0);
  return (
    <div className="modal-back">
      <div className="card modal stack pop-in" style={{ gap: 16 }}>
        <div className="row" style={{ gap: 18 }}>
          <Owl mood="disappointed" size={90} />
          <div className="grow">
            <span className="badge level-4">Level 4 · Nuclear</span>
            <h2 style={{ marginTop: 8 }}>{snap.punishment.consecutiveMissed || 2} days missed. Make a recovery plan.</h2>
            <div className="muted small">The dashboard stays locked until you commit to a catch-up schedule. The extra topics are added on top of your normal pace.</div>
          </div>
        </div>
        {alarm && <button className="danger" onClick={silence}>🔕 Stop alarm</button>}

        {!backlog ? <div className="muted">Calculating backlog…</div> : (
          <>
            <label className="field"><span>Catch up over <b className="mono" style={{ color: 'var(--text)' }}>{days}</b> day{days > 1 ? 's' : ''}</span>
              <input type="range" min="1" max="7" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ padding: 0 }} />
            </label>
            <table>
              <thead><tr><th>Day</th>{tracks.map((t) => <th key={t.id}>{t.name}</th>)}</tr></thead>
              <tbody>
                {Array.from({ length: days }, (_, i) => (
                  <tr key={i}>
                    <td className="mono small">{fmtDate(addDaysLocal(snap.today, i), { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    {tracks.map((t) => <td key={t.id} className="mono">{t.base} <span style={{ color: 'var(--danger)' }}>+{split(backlog[t.id], days)[i]}</span></td>)}
                  </tr>
                ))}
                {tracks.length === 0 && <tr><td className="muted">No backlog — just commit to getting back on pace.</td></tr>}
              </tbody>
            </table>
            <label className="row" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={commit} onChange={(e) => setCommit(e.target.checked)} />
              <span>I commit to this schedule. No excuses.</span>
            </label>
            <button className="primary" disabled={!commit} onClick={() => { silence(); invoke('recovery:commit', days); }}>Start recovery plan</button>
          </>
        )}
      </div>
    </div>
  );
}
