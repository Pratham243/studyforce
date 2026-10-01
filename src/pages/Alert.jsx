import { useEffect, useRef } from 'react';
import { api, invoke } from '../lib/api';
import { useSnapshot, useTheme } from '../lib/useSnapshot';
import { fmtCountdown, fmtHours, LEVEL_NAMES } from '../lib/format';
import { playAlertSound, playChime } from '../lib/sound';
import { Confetti, Difficulty } from '../components/ui';
import Owl from '../components/Owl';

const close = () => api.closeWindow();

// Popup window: mode = nudge | briefing | celebrate
export default function Alert({ params }) {
  const mode = params.get('mode') || 'nudge';
  const [snap] = useSnapshot();
  useTheme(snap);

  const stopSound = useRef(null);
  const played = useRef(false);

  // Sound waits for the snapshot so it can use the chosen sound and volume.
  useEffect(() => {
    if (!snap || played.current) return;
    played.current = true;
    if (mode === 'celebrate') playChime();
    else stopSound.current = playAlertSound(snap.settings, snap.punishment.level);
  }, [snap, mode]);
  useEffect(() => () => stopSound.current && stopSound.current(), []);

  useEffect(() => {
    if (mode === 'briefing') return undefined;
    const t = setTimeout(close, mode === 'celebrate' ? 9000 : 25000);
    return () => clearTimeout(t);
  }, [mode]);

  if (!snap) return null;
  const p = snap.punishment;

  if (mode === 'celebrate') {
    const kind = params.get('kind');
    const value = params.get('value');
    const title = kind === 'milestone' ? `${value}% of ${params.get('track')}!`
      : kind === 'section' ? 'Section complete!' : kind === 'exam' ? 'Mock exam passed!' : 'All done for today!';
    const sub = kind === 'section' || kind === 'exam' ? value : kind === 'day' ? `Streak: ${snap.streak} 🔥` : 'Keep that pace.';
    return (
      <div className="float-card pop-in row" style={{ padding: 18, gap: 16, height: 'calc(100vh - 20px)' }} onClick={close}>
        <Confetti burst={1} />
        <Owl mood="happy" size={110} />
        <div className="grow">
          <h2 style={{ fontSize: 22 }}>{title}</h2>
          <div className="muted" style={{ marginTop: 6 }}>{sub}</div>
        </div>
      </div>
    );
  }

  const pending = snap.tracks.filter((t) => t.left > 0);
  if (mode === 'briefing') {
    return (
      <div className="float-card pop-in stack" style={{ padding: 18, height: 'calc(100vh - 20px)', gap: 12 }}>
        <div className="row drag">
          <Owl mood={p.mood} size={64} />
          <div className="grow">
            <h2>Morning briefing</h2>
            <div className="small muted"><span className="mono">{snap.totals.left}</span> tasks · ≈ {fmtHours(snap.totals.estimatedMinutes)} · 🔥{snap.streak}</div>
          </div>
          <button className="ghost sm no-drag" onClick={close}>✕</button>
        </div>
        {p.level >= 2 && <div className="banner" style={{ margin: 0, padding: 10 }}><span className={`badge level-${p.level}`}>L{p.level} {LEVEL_NAMES[p.level]}</span><span className="small">{p.reason}</span></div>}
        <div className="stack" style={{ overflowY: 'auto', gap: 14 }}>
          {snap.tracks.map((t) => (
            <div key={t.id}>
              <div className="row between" style={{ marginBottom: 4 }}>
                <b style={{ color: t.color }}>{t.name}</b>
                <span className="small muted mono">{t.kind === 'phased' ? `${t.german.targetHours} h + 4 practice` : `${t.quota}${t.kind === 'count' ? ' to send' : ''}`} · due {t.deadline} · {fmtHours(t.estimatedMinutes)}</span>
              </div>
              {(t.today || []).filter((x) => !x.doneDate).map((x) => (
                <div key={x.id} className="row small" style={{ padding: '3px 0' }}>
                  <span className="faint">○</span><span className="grow ellipsis">{x.title}</span><Difficulty value={x.difficulty} />
                </div>
              ))}
              {t.carry > 0 && <div className="small" style={{ color: 'var(--danger)' }}>Includes +{t.carry} carried from yesterday</div>}
            </div>
          ))}
        </div>
        <button className="primary" onClick={() => { invoke('window:showMain'); close(); }}>Let's go</button>
      </div>
    );
  }

  return (
    <div className="float-card pop-in" style={{ padding: 16, height: 'calc(100vh - 20px)', borderColor: p.level >= 2 ? 'var(--danger)' : 'var(--border)' }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
        <Owl mood={p.mood} size={96} />
        <div className="grow stack" style={{ gap: 10 }}>
          <div className="bubble">{snap.message}</div>
          <div className="stack" style={{ gap: 4 }}>
            {pending.map((t) => (
              <div key={t.id} className="row between small">
                <span><span style={{ color: t.color }}>●</span> {t.name}</span>
                <span className="mono" style={{ color: t.minutesToDeadline < 0 ? 'var(--danger)' : 'var(--muted)' }}>{t.left} left · {fmtCountdown(t.minutesToDeadline)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
        <button className="ghost sm" onClick={close}>Later</button>
        <button className="primary sm" onClick={() => { invoke('window:showMain'); close(); }}>Open StudyForce</button>
      </div>
    </div>
  );
}
