import { invoke } from '../lib/api';
import { useSnapshot, useTheme } from '../lib/useSnapshot';
import { fmtCountdown } from '../lib/format';
import { Bar } from '../components/ui';
import Owl from '../components/Owl';

// Small always-on-top desktop widget.
export default function Widget() {
  const [snap] = useSnapshot();
  useTheme(snap);
  if (!snap) return null;
  const { totals } = snap;
  const pct = totals.quota ? Math.round((totals.doneToday / totals.quota) * 100) : 0;
  return (
    <div className="float-card drag" style={{ padding: 14, height: 'calc(100vh - 20px)' }} onDoubleClick={() => invoke('window:showMain')}>
      <div className="row" style={{ marginBottom: 10 }}>
        <Owl mood={snap.punishment.mood} size={46} />
        <div className="grow">
          <div className="mono" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{pct}<span className="muted" style={{ fontSize: 16 }}>%</span></div>
          <div className="small muted">{totals.left} left · 🔥{snap.streak}</div>
        </div>
        <button className="ghost sm no-drag" onClick={() => window.sf && window.sf.closeWindow()} aria-label="Close widget">✕</button>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {snap.tracks.map((t) => (
          <div key={t.id}>
            <div className="row between small" style={{ marginBottom: 4 }}>
              <span className="ellipsis">{t.name}</span>
              <span className="mono" style={{ color: t.left === 0 ? 'var(--ok)' : t.minutesToDeadline < 0 ? 'var(--danger)' : 'var(--muted)' }}>
                {t.doneToday}/{t.quota} · {t.left === 0 ? '✓' : fmtCountdown(t.minutesToDeadline)}
              </span>
            </div>
            <Bar value={t.doneToday} max={t.quota} color={t.color} />
          </div>
        ))}
      </div>
      <button className="sm no-drag" style={{ width: '100%', marginTop: 12 }} onClick={() => invoke('window:showMain')}>Open dashboard</button>
    </div>
  );
}
