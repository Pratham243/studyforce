import { useEffect, useRef, useState } from 'react';
import { invoke } from './api';
import { playChime } from './sound';

// Pomodoro timer kept at app level so it survives page switches.
export function usePomodoro(snap) {
  const cfg = snap ? snap.settings.pomodoro : { work: 25, short: 5, long: 15 };
  const [phase, setPhase] = useState('work'); // work | short | long
  const [endsAt, setEndsAt] = useState(null);
  const [pausedLeft, setPausedLeft] = useState(null);
  const [rounds, setRounds] = useState(0);
  const [topicId, setTopicId] = useState(null);
  const [, force] = useState(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const length = cfg[phase] * 60;
  const left = endsAt ? Math.max(0, Math.round((endsAt - Date.now()) / 1000)) : pausedLeft ?? length;

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => {
      if (Date.now() >= endsAt) {
        clearInterval(id);
        playChime();
        if (phaseRef.current === 'work') {
          invoke('pomodoro:log', { minutes: cfg.work, topicId });
          const n = rounds + 1;
          setRounds(n);
          start(n % 4 === 0 ? 'long' : 'short');
        } else {
          setEndsAt(null);
          setPausedLeft(null);
          setPhase('work');
        }
        try { new Notification('StudyForce', { body: phaseRef.current === 'work' ? 'Focus block done — take a break.' : 'Break over. Back to work!' }); } catch { /* ignore */ }
      }
      force((x) => x + 1);
    }, 500);
    return () => clearInterval(id);
  }, [endsAt]); // eslint-disable-line react-hooks/exhaustive-deps

  function start(p = phase) {
    setPhase(p);
    setPausedLeft(null);
    setEndsAt(Date.now() + cfg[p] * 60 * 1000);
  }
  function pause() { setPausedLeft(left); setEndsAt(null); }
  function resume() { setEndsAt(Date.now() + left * 1000); setPausedLeft(null); }
  function reset() { setEndsAt(null); setPausedLeft(null); setPhase('work'); }
  function select(p) { setEndsAt(null); setPausedLeft(null); setPhase(p); }

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return {
    phase, left, length, rounds, topicId, setTopicId,
    running: !!endsAt, paused: pausedLeft != null,
    display: `${mm}:${ss}`,
    start, pause, resume, reset, select
  };
}
