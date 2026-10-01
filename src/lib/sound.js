// Synthesised sounds — no audio files needed.
let ctx;
const audio = () => (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)());

function beep({ freq, start, dur, type = 'square', gain = 0.12 }) {
  const ac = audio();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  g.gain.setValueAtTime(gain, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.05);
}

// Siren for Level 4. Returns a stop function.
export function playAlarm(seconds = 6) {
  let stopped = false;
  const loop = (t) => {
    if (stopped || t >= seconds) return;
    beep({ freq: 880, start: 0, dur: 0.25 });
    beep({ freq: 660, start: 0.3, dur: 0.25 });
    setTimeout(() => loop(t + 0.6), 600);
  };
  loop(0);
  return () => { stopped = true; };
}

export function playChime() {
  [523, 659, 784, 1047].forEach((f, i) => beep({ freq: f, start: i * 0.09, dur: 0.3, type: 'sine', gain: 0.1 }));
}

export function playHoot() {
  beep({ freq: 420, start: 0, dur: 0.18, type: 'sine', gain: 0.12 });
  beep({ freq: 360, start: 0.22, dur: 0.3, type: 'sine', gain: 0.12 });
}
