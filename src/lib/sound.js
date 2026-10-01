// Synthesised sounds — no audio files needed.
let ctx;
function audio() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

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

// Soft clipping makes the siren sound harsher and louder at the same volume.
function distortion(ac, amount = 30) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  const ws = ac.createWaveShaper();
  ws.curve = curve;
  return ws;
}

// Emergency-style siren. style 'wail' sweeps slowly up and down; 'yelp' is
// the fast, more urgent version. volume is 0–100. Returns a stop function.
export function playSiren({ seconds = 5, volume = 100, style = 'wail' } = {}) {
  const ac = audio();
  const t0 = ac.currentTime + 0.02;
  const end = t0 + seconds;
  const low = 650;
  const high = 1650;
  const half = style === 'yelp' ? 0.16 : 0.55;

  const master = ac.createGain();
  master.gain.setValueAtTime(0, t0);
  master.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume / 100)), t0 + 0.05);
  master.gain.setValueAtTime(Math.max(0, Math.min(1, volume / 100)), end - 0.08);
  master.gain.linearRampToValueAtTime(0, end);

  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 12;
  comp.attack.value = 0.002;
  comp.release.value = 0.1;
  const shaper = distortion(ac);
  shaper.connect(comp).connect(master).connect(ac.destination);

  // Two slightly detuned voices so it cuts through other audio.
  const oscs = [['sawtooth', 0, 0.55], ['square', 7, 0.35]].map(([type, detune, level]) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.detune.value = detune * 100;
    g.gain.value = level;
    osc.frequency.setValueAtTime(low, t0);
    for (let t = t0, up = true; t < end; t += half, up = !up) {
      osc.frequency.linearRampToValueAtTime(up ? high : low, Math.min(end, t + half));
    }
    osc.connect(g).connect(shaper);
    osc.start(t0);
    osc.stop(end + 0.05);
    return osc;
  });

  return () => {
    const now = ac.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.05);
    oscs.forEach((o) => { try { o.stop(now + 0.06); } catch { /* already stopped */ } });
  };
}

// Plays the reminder sound chosen in Settings. Returns a stop function.
export function playAlertSound(settings, level = 1) {
  const s = settings || {};
  const sound = s.alertSound || 'siren';
  if (sound === 'off') return () => {};
  if (sound === 'soft') { playHoot(); return () => {}; }
  return playSiren({
    seconds: s.sirenSeconds || 5,
    volume: s.alertVolume ?? 100,
    style: level >= 2 ? 'yelp' : 'wail'
  });
}

// Level 4 alarm: long, fast siren.
export function playAlarm(seconds = 10, volume = 100) {
  return playSiren({ seconds, volume, style: 'yelp' });
}

export function playChime() {
  [523, 659, 784, 1047].forEach((f, i) => beep({ freq: f, start: i * 0.09, dur: 0.3, type: 'sine', gain: 0.1 }));
}

export function playHoot() {
  beep({ freq: 420, start: 0, dur: 0.18, type: 'sine', gain: 0.12 });
  beep({ freq: 360, start: 0.22, dur: 0.3, type: 'sine', gain: 0.12 });
}
