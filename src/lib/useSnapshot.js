import { useCallback, useEffect, useState } from 'react';
import { invoke, on } from './api';

// Live view of the main-process snapshot. Refreshes on every change and on
// the scheduler tick so countdowns stay current.
export function useSnapshot() {
  const [snap, setSnap] = useState(null);
  const refresh = useCallback(() => invoke('state:get').then(setSnap), []);
  useEffect(() => {
    refresh();
    const offs = [on('state:changed', refresh), on('tick', refresh)];
    return () => offs.forEach((off) => off());
  }, [refresh]);
  return [snap, refresh, setSnap];
}

// Applies theme and shame-mode classes to <html>.
export function useTheme(snap) {
  useEffect(() => {
    if (!snap) return;
    const root = document.documentElement;
    root.dataset.theme = snap.settings.theme;
    root.classList.toggle('red-mode', !!snap.punishment.red);
  }, [snap]);
}
