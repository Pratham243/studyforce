import { useState } from 'react';
import { invoke } from '../lib/api';
import { fmtDate } from '../lib/format';
import { Bar } from '../components/ui';

export default function Applications({ snap }) {
  const track = snap.tracks.find((t) => t.kind === 'count');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [polling, setPolling] = useState(null);
  const gmail = snap.settings.gmail;
  if (!track) return null;

  const add = (e) => {
    e.preventDefault();
    if (!company.trim()) return;
    invoke('app:add', { company: company.trim(), role: role.trim() });
    setCompany(''); setRole('');
  };
  const poll = async () => {
    setPolling('Checking…');
    try {
      const r = await invoke('gmail:poll');
      setPolling(`Found ${r.found} matching sent emails, ${r.added} new.`);
    } catch (e) { setPolling(e.message); }
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="topbar"><h1 className="grow">{track.name}</h1></div>
      <div className="grid cols-3">
        <div className="card stack">
          <div className="row between"><h3>Today</h3><span className="mono">{track.doneToday}/{track.quota}</span></div>
          <Bar value={track.doneToday} max={track.quota} color={track.color} lg />
          <div className="row">
            <label className="field grow"><span>Daily target</span>
              <input type="number" min="0" max="50" value={track.dailyTarget}
                onChange={(e) => invoke('track:update', track.id, { dailyTarget: Number(e.target.value) })} />
            </label>
            <label className="field grow"><span>Deadline</span>
              <input type="time" value={track.deadline} onChange={(e) => invoke('track:update', track.id, { deadline: e.target.value })} />
            </label>
          </div>
        </div>
        <form className="card stack" onSubmit={add}>
          <h3>Log an application</h3>
          <input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
          <input placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />
          <button className="primary" type="submit">Add</button>
        </form>
        <div className="card stack">
          <h3>Gmail auto-detect</h3>
          {gmail.enabled ? (
            <>
              <div className="small muted">Connected as <b>{gmail.email}</b>. The sent folder is checked every 10 minutes; matching emails count as applications.</div>
              <div className="small faint">Gmail can only see that an email was sent, not whether the company received it.</div>
              <button onClick={poll}>Check now</button>
              {polling && <div className="small">{polling}</div>}
            </>
          ) : (
            <div className="small muted">Not connected. Add your Google OAuth client in Settings → Gmail, then click Connect.</div>
          )}
        </div>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Date</th><th>Company</th><th>Role / subject</th><th>Source</th><th /></tr></thead>
          <tbody>
            {snap.applications.length === 0 && <tr><td colSpan="5" className="muted">No applications logged yet.</td></tr>}
            {snap.applications.map((a) => (
              <tr key={a.id}>
                <td className="mono small">{fmtDate(a.date)}</td>
                <td><b>{a.company}</b></td>
                <td className="muted ellipsis" style={{ maxWidth: 360 }}>{a.role || a.subject}</td>
                <td><span className="badge">{a.source}</span></td>
                <td style={{ textAlign: 'right' }}><button className="ghost sm" onClick={() => invoke('app:remove', a.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
