import { useMemo, useState } from 'react';
import { Bar as RBar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { fmtDate, weekday, fmtHours } from '../lib/format';
import { addDaysLocal } from '../lib/dates';

export default function Reports({ snap }) {
  const [range, setRange] = useState(7);
  const days = snap.history.slice(-range);
  const data = useMemo(() => days.map((d) => ({
    label: range <= 7 ? weekday(d.date) : fmtDate(d.date),
    date: d.date,
    quota: d.totalQuota,
    ...Object.fromEntries(snap.tracks.map((t) => [t.id, (d.tracks[t.id] || {}).done || 0]))
  })), [days, range, snap.tracks]);

  const done = days.map((d) => d.totalDone);
  const scored = days.filter((d) => !d.isToday);
  const best = days.reduce((a, d) => (!a || d.totalDone > a.totalDone ? d : a), null);
  const worst = scored.reduce((a, d) => (!a || d.totalDone < a.totalDone ? d : a), null);
  const avg = days.length ? done.reduce((a, b) => a + b, 0) / days.length : 0;
  const rate = scored.length ? Math.round((scored.filter((d) => d.complete).length / scored.length) * 100) : 0;
  const cutoff = addDaysLocal(snap.today, 1 - range);
  const notes = (snap.notes || []).filter((n) => n.date >= cutoff);
  const focus = snap.pomodoro.filter((p) => days.some((d) => d.date === p.date)).reduce((a, p) => a + p.minutes, 0);

  const tick = { fill: 'var(--muted)', fontSize: 11 };
  const tooltip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }, labelStyle: { color: 'var(--text)' } };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="topbar">
        <h1 className="grow">Weekly review</h1>
        <div className="seg">
          {[7, 14, 30].map((n) => <button key={n} className={range === n ? 'on' : ''} onClick={() => setRange(n)}>{n} days</button>)}
        </div>
      </div>

      {days.length === 0 ? (
        <div className="card muted">No history yet. Your first day starts when you check off your first topic.</div>
      ) : (
        <>
          <div className="grid cols-4">
            <div className="card tight stat"><span className="v">{best ? best.totalDone : 0}</span><span className="l">Best day · {best ? fmtDate(best.date) : '—'}</span></div>
            <div className="card tight stat"><span className="v">{worst ? worst.totalDone : '—'}</span><span className="l">Worst day · {worst ? fmtDate(worst.date) : '—'}</span></div>
            <div className="card tight stat"><span className="v">{avg.toFixed(1)}</span><span className="l">Average / day</span></div>
            <div className="card tight stat"><span className="v">{rate}%</span><span className="l">Days fully completed</span></div>
          </div>

          <div className="card">
            <div className="row between" style={{ marginBottom: 12 }}><h3>Completed per day</h3><span className="small muted">dashed line = quota</span></div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltip} cursor={{ fill: 'var(--surface-2)' }} />
                {snap.tracks.map((t, i) => (
                  <RBar key={t.id} dataKey={t.id} name={t.name} stackId="a" fill={t.color} radius={i === snap.tracks.length - 1 ? [4, 4, 0, 0] : 0} />
                ))}
                {data.length > 0 && <ReferenceLine y={data[data.length - 1].quota} stroke="var(--muted)" strokeDasharray="4 4" />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="grid cols-2">
        <div className="card stack">
          <h3>Projected finish</h3>
          <table>
            <thead><tr><th>Track</th><th>Remaining</th><th>Pace</th><th>Finish</th></tr></thead>
            <tbody>
              {snap.tracks.filter((t) => t.kind !== 'count').map((t) => (
                <tr key={t.id}>
                  <td><span className="dot" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: t.color, marginRight: 8 }} />{t.name}</td>
                  <td className="mono">{t.kind === 'phased' ? `${Math.round(t.german.totalTarget - t.german.totalHours)} h` : t.remaining}</td>
                  <td>{t.paceInfo.label} <span className="faint small">{t.kind === 'phased' ? `${t.paceInfo.hours} h/day` : t.paceInfo.range}</span></td>
                  <td className="mono">{t.projectedFinish ? fmtDate(t.projectedFinish, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Done'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card stack">
          <div className="row between"><h3>Streak calendar</h3><span className="small muted">🔥 {snap.streak} · focus {fmtHours(focus)}</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
            {snap.history.slice(-30).map((d) => {
              const bg = d.isToday ? 'var(--surface-2)' : d.complete ? 'var(--ok)' : d.totalDone > 0 ? 'var(--warn)' : 'var(--danger)';
              return <div key={d.date} title={`${d.date}: ${d.totalDone}/${d.totalQuota}`} style={{ aspectRatio: '1', borderRadius: 6, background: bg, opacity: d.isToday ? 1 : 0.85, border: d.isToday ? '1px dashed var(--faint)' : 'none' }} />;
            })}
          </div>
          <div className="row small muted" style={{ gap: 14 }}>
            <span><span style={{ color: 'var(--ok)' }}>■</span> complete</span>
            <span><span style={{ color: 'var(--warn)' }}>■</span> partial</span>
            <span><span style={{ color: 'var(--danger)' }}>■</span> missed</span>
          </div>
          {days.length > 1 && (
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={data} margin={{ left: -20, right: 8 }}>
                <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltip} />
                <Line type="monotone" dataKey={(d) => snap.tracks.reduce((a, t) => a + (d[t.id] || 0), 0)} name="Done" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card stack">
        <div className="row between"><h3>Session notes</h3><span className="small muted">last {range} days</span></div>
        {notes.length === 0 && <div className="small muted">No notes yet. Add them in the German card on the dashboard.</div>}
        {notes.map((n) => (
          <div key={`${n.date}-${n.track_id}`} className="stack" style={{ gap: 4, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <div className="small muted"><span className="mono">{fmtDate(n.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span> · {n.name} · {Math.round(n.hours_studied * 10) / 10} h</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{n.notes}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
