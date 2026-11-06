// All sound is synthesized with the Web Audio API — no audio files to load.
// Browsers only allow audio after a user gesture, so `enable()` must be called from a click.
import { scrollState } from './store';

let ctx = null;
let master = null;
let ambient = null;
let enabled = false;
const listeners = new Set();
let lastHover = 0;

export const sound = {
  get enabled() {
    return enabled;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

function emit() {
  listeners.forEach((fn) => fn(enabled));
}

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.8;
  // gentle glue so layers never clip
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  return ctx;
}

function noiseBuffer(seconds = 2) {
  const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function env(gainNode, t, a, peak, d) {
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.exponentialRampToValueAtTime(peak, t + a);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

/* ---------- one-shots ---------- */

// Cinematic opening: reverse-cymbal riser → sub impact + bright chord stab → cascading
// stereo arpeggio → shimmering tail. Particles pulse on the impact.
export function playIntro() {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime + 0.03;
  const HIT = 1.6; // seconds until the impact
  const verb = makeReverb(4);
  const verbGain = ctx.createGain();
  verbGain.gain.value = 0.5;
  verb.connect(verbGain).connect(master);

  // 1. reverse cymbal: bright noise swelling in
  const rc = ctx.createBufferSource();
  rc.buffer = noiseBuffer(HIT + 0.1);
  const rcHp = ctx.createBiquadFilter();
  rcHp.type = 'highpass';
  rcHp.frequency.setValueAtTime(2500, t);
  rcHp.frequency.exponentialRampToValueAtTime(7000, t + HIT);
  const rcG = ctx.createGain();
  rcG.gain.setValueAtTime(0.0001, t);
  rcG.gain.exponentialRampToValueAtTime(0.35, t + HIT - 0.02);
  rcG.gain.exponentialRampToValueAtTime(0.0001, t + HIT + 0.05);
  rc.connect(rcHp).connect(rcG).connect(master);
  rc.start(t);

  // 2. pitch riser: two detuned tones sliding up an octave and a half
  [0, 7].forEach((det) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(146.83, t);
    o.frequency.exponentialRampToValueAtTime(587.33, t + HIT);
    o.detune.value = det;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + HIT - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + HIT + 0.02);
    o.connect(g).connect(master);
    o.connect(g).connect(verb);
    o.start(t);
    o.stop(t + HIT + 0.1);
  });

  // 3. heartbeat ticks speeding up into the hit
  [0.2, 0.62, 0.95, 1.2, 1.38, 1.5].forEach((dt, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, t + dt);
    o.frequency.exponentialRampToValueAtTime(45, t + dt + 0.1);
    const g = ctx.createGain();
    env(g, t + dt, 0.004, 0.25 + i * 0.07, 0.12);
    o.connect(g).connect(master);
    o.start(t + dt);
    o.stop(t + dt + 0.2);
  });

  const h = t + HIT;

  // 4. impact: sub boom + noise burst
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(120, h);
  sub.frequency.exponentialRampToValueAtTime(32, h + 1.4);
  const sg = ctx.createGain();
  env(sg, h, 0.005, 1.0, 1.8);
  sub.connect(sg).connect(master);
  sub.start(h);
  sub.stop(h + 2);
  const burst = ctx.createBufferSource();
  burst.buffer = noiseBuffer(1.2);
  const bLp = ctx.createBiquadFilter();
  bLp.type = 'lowpass';
  bLp.frequency.setValueAtTime(5000, h);
  bLp.frequency.exponentialRampToValueAtTime(200, h + 0.9);
  const bg = ctx.createGain();
  env(bg, h, 0.003, 0.4, 0.9);
  burst.connect(bLp).connect(bg).connect(master);
  bg.connect(verb);
  burst.start(h);

  // 5. bright chord stab (D major add9), sine + triangle, into reverb
  [146.83, 220.0, 293.66, 369.99, 440.0, 659.25].forEach((f, i) => {
    ['sine', 'triangle'].forEach((type, k) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = k ? 5 : -5;
      const g = ctx.createGain();
      env(g, h, 0.01, (k ? 0.05 : 0.08) / (1 + i * 0.15), 3.2);
      o.connect(g);
      g.connect(master);
      g.connect(verb);
      o.start(h);
      o.stop(h + 3.5);
    });
  });

  // 6. cascading arpeggio, ping-ponging left ↔ right
  const arp = [587.33, 739.99, 880.0, 987.77, 1174.66, 1479.98, 1760.0, 2349.32];
  arp.forEach((f, i) => {
    const st = h + 0.12 + i * 0.075;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    env(g, st, 0.004, 0.09, 0.9);
    let node = o.connect(g);
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = i % 2 ? 0.7 : -0.7;
      node = g.connect(pan);
    }
    node.connect(master);
    node.connect(verb);
    o.start(st);
    o.stop(st + 1.2);
  });

  // 7. shimmer tail: high detuned sines slowly fading
  [1174.66, 1760.0].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const trem = ctx.createOscillator();
    trem.frequency.value = 5 + i * 1.3;
    const tg = ctx.createGain();
    tg.gain.value = 0.015;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, h + 0.4);
    g.gain.exponentialRampToValueAtTime(0.03, h + 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, h + 4.5);
    trem.connect(tg).connect(g.gain);
    o.connect(g).connect(verb);
    o.start(h + 0.4);
    trem.start(h + 0.4);
    o.stop(h + 4.6);
    trem.stop(h + 4.6);
  });

  // visual sync: blast the particle cloud on the hit
  setTimeout(() => {
    scrollState.pulse = 1.6;
  }, HIT * 1000);
  setTimeout(() => {
    scrollState.pulse = 0.8;
  }, HIT * 1000 + 260);
}

export function playClick() {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.setValueAtTime(1600, t);
  o.frequency.exponentialRampToValueAtTime(420, t + 0.06);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 3000;
  const g = ctx.createGain();
  env(g, t, 0.002, 0.18, 0.08);
  o.connect(f).connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.12);
  // tiny noise transient for a tactile "tick"
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(0.05);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3000;
  const ng = ctx.createGain();
  env(ng, t, 0.001, 0.15, 0.03);
  n.connect(hp).connect(ng).connect(master);
  n.start(t);
}

export function playHover() {
  if (!enabled || !ensure()) return;
  const now = performance.now();
  if (now - lastHover < 70) return;
  lastHover = now;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(2400 + Math.random() * 400, t);
  const g = ctx.createGain();
  env(g, t, 0.003, 0.035, 0.05);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.08);
}

export function playKey() {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime;
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(0.04);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800 + Math.random() * 1400;
  bp.Q.value = 3;
  const g = ctx.createGain();
  env(g, t, 0.001, 0.22, 0.035);
  n.connect(bp).connect(g).connect(master);
  n.start(t);
}

export function playEnter() {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime;
  [523.25, 783.99].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const g = ctx.createGain();
    env(g, t + i * 0.06, 0.004, 0.12, 0.18);
    o.connect(g).connect(master);
    o.start(t + i * 0.06);
    o.stop(t + i * 0.06 + 0.3);
  });
}

/* ---------- ambient: soft chords + wind chimes ---------- */
// Warm major-key pad (sine/triangle only — no buzzy waves) that drifts through
// Cmaj9 → Am9 → Fmaj9 → G6, with occasional pentatonic chime notes through a soft reverb.

const AMBIENT_LEVEL = 0.07;
const CHORDS = [
  [130.81, 196.0, 246.94, 329.63, 293.66], // Cmaj9
  [110.0, 164.81, 196.0, 261.63, 246.94], // Am9
  [87.31, 130.81, 164.81, 220.0, 196.0], // Fmaj9
  [98.0, 146.83, 196.0, 246.94, 329.63], // G6
];
const CHIMES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

function makeReverb(seconds = 3.5) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

function startAmbient() {
  if (!ensure() || ambient) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(AMBIENT_LEVEL, t + 5);
  out.connect(master);

  const reverb = makeReverb();
  const wet = ctx.createGain();
  wet.gain.value = 0.55;
  reverb.connect(wet).connect(out);

  const padBus = ctx.createGain();
  padBus.gain.value = 0.5;
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 1400;
  padBus.connect(warm);
  warm.connect(out);
  warm.connect(reverb);

  const voices = [];
  let step = 0;
  const playChord = () => {
    const now = ctx.currentTime;
    const chord = CHORDS[step % CHORDS.length];
    step++;
    chord.forEach((f, i) => {
      ['sine', 'triangle'].forEach((type, k) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = (k ? 4 : -4) + (Math.random() - 0.5) * 3;
        const g = ctx.createGain();
        const peak = (k ? 0.05 : 0.09) / (1 + i * 0.25);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(peak, now + 3.2);
        g.gain.setValueAtTime(peak, now + 7);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 11.5);
        o.connect(g).connect(padBus);
        o.start(now);
        o.stop(now + 12);
        voices.push(o);
        o.onended = () => voices.splice(voices.indexOf(o), 1);
      });
    });
  };

  let chimeTimer;
  const chime = () => {
    const now = ctx.currentTime;
    const f = CHIMES[Math.floor(Math.random() * CHIMES.length)];
    // a bell-ish tone: fundamental + a quiet octave partial
    [1, 2.0].forEach((mult, k) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mult;
      const g = ctx.createGain();
      env(g, now, 0.01, k ? 0.012 : 0.045, k ? 1.2 : 3.2);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = Math.random() * 1.4 - 0.7;
        o.connect(g).connect(pan);
        pan.connect(reverb);
        pan.connect(out);
      } else {
        o.connect(g).connect(reverb);
      }
      o.start(now);
      o.stop(now + 3.5);
    });
    chimeTimer = setTimeout(chime, 1800 + Math.random() * 3200);
  };

  playChord();
  const chordTimer = setInterval(playChord, 8000);
  chimeTimer = setTimeout(chime, 2500);

  ambient = {
    out,
    level: AMBIENT_LEVEL,
    stopAll() {
      clearInterval(chordTimer);
      clearTimeout(chimeTimer);
      voices.slice().forEach((o) => {
        try {
          o.stop();
        } catch {}
      });
    },
  };
}

function stopAmbient() {
  if (!ambient || !ctx) return;
  const a = ambient;
  const t = ctx.currentTime;
  a.out.gain.cancelScheduledValues(t);
  a.out.gain.setValueAtTime(Math.max(a.out.gain.value, 0.0001), t);
  a.out.gain.exponentialRampToValueAtTime(0.0001, t + 1);
  setTimeout(() => a.stopAll(), 1100);
  ambient = null;
}

/* ---------- toggle ---------- */

export function enable() {
  if (!ensure()) return false;
  ctx.resume?.();
  enabled = true;
  startAmbient();
  emit();
  return true;
}

export function disable() {
  enabled = false;
  stopAmbient();
  emit();
}

export function toggle() {
  if (enabled) disable();
  else {
    enable();
    playEnter();
  }
}

// Global click / hover sounds for anything interactive.
export function installUiSounds() {
  const interactive = 'a, button, [data-hover], .legend, input';
  const onDown = (e) => {
    if (e.target.closest?.(interactive)) playClick();
  };
  let lastEl = null;
  const onOver = (e) => {
    const el = e.target.closest?.(interactive);
    if (el && el !== lastEl) playHover();
    lastEl = el;
  };
  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerover', onOver);
  return () => {
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerover', onOver);
  };
}

/* ---------- per-project hover soundscapes ---------- */
// Each returns a controller { set(x, y), stop() }. x/y are 0..1 pointer coords inside the card.

function droneSound() {
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.32, t + 0.6);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  lp.connect(out).connect(master);

  // four rotors, slightly detuned, each with blade-pass amplitude chop
  const rotors = [0, 1, 2, 3].map((i) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(60, t);
    const chop = ctx.createOscillator();
    chop.type = 'square';
    chop.frequency.setValueAtTime(20, t);
    const chopGain = ctx.createGain();
    chopGain.gain.value = 0.35;
    const amp = ctx.createGain();
    amp.gain.value = 0.55;
    chop.connect(chopGain).connect(amp.gain);
    const g = ctx.createGain();
    g.gain.value = 0.22;
    o.connect(amp).connect(g).connect(lp);
    o.start(t);
    chop.start(t);
    return { o, chop, detune: 1 + (i - 1.5) * 0.018 };
  });

  // rotor wash: band-passed noise
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(2);
  n.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900;
  bp.Q.value = 0.8;
  const ng = ctx.createGain();
  ng.gain.value = 0.25;
  n.connect(bp).connect(ng).connect(lp);
  n.start(t);

  const set = (x = 0.5, y = 0.5, ramp = 0.25) => {
    // pointer x = throttle, pointer y = noise reduction (lower = quieter, cleaner)
    const now = ctx.currentTime;
    const rpm = 150 + x * 170;
    rotors.forEach((r) => {
      r.o.frequency.setTargetAtTime(rpm * r.detune, now, ramp);
      r.chop.frequency.setTargetAtTime((rpm / 2.2) * r.detune, now, ramp);
    });
    bp.frequency.setTargetAtTime(600 + x * 1400, now, ramp);
    lp.frequency.setTargetAtTime(900 + (1 - y) * 3200, now, 0.15);
  };
  set(0.15, 0.5, 0.01);
  set(0.5, 0.5, 0.35); // spin up

  return {
    set,
    stop() {
      const now = ctx.currentTime;
      rotors.forEach((r) => {
        r.o.frequency.setTargetAtTime(40, now, 0.25);
        r.chop.frequency.setTargetAtTime(8, now, 0.25);
      });
      out.gain.setTargetAtTime(0.0001, now, 0.18);
      setTimeout(() => {
        rotors.forEach((r) => {
          r.o.stop();
          r.chop.stop();
        });
        n.stop();
      }, 1200);
    },
  };
}

function cashRegister() {
  const t = ctx.currentTime;
  // drawer clunk
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(0.2);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  const ng = ctx.createGain();
  env(ng, t, 0.002, 0.5, 0.15);
  n.connect(lp).connect(ng).connect(master);
  n.start(t);
  // bell "ching": inharmonic partials
  [2093, 2637, 3136, 4186, 5274].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    env(g, t + 0.09, 0.002, 0.16 / (i + 1), 1.1 - i * 0.12);
    o.connect(g).connect(master);
    o.start(t + 0.09);
    o.stop(t + 1.4);
  });
}

function retailSound() {
  cashRegister();
  // data-processing bleeps on a pentatonic scale, density follows pointer x
  const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
  let density = 0.5;
  let alive = true;
  const tick = () => {
    if (!alive) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = Math.random() < 0.5 ? 'square' : 'triangle';
    o.frequency.value = scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.2 ? 2 : 1);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2600;
    const g = ctx.createGain();
    env(g, t, 0.003, 0.06, 0.09);
    o.connect(f).connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.14);
    setTimeout(tick, 90 + (1 - density) * 260 + Math.random() * 80);
  };
  setTimeout(tick, 700);
  return {
    set(x) {
      density = x;
    },
    stop() {
      alive = false;
    },
  };
}

function labSound() {
  const t = ctx.currentTime;
  // centrifuge hum
  const hum = ctx.createOscillator();
  hum.type = 'triangle';
  hum.frequency.setValueAtTime(40, t);
  hum.frequency.exponentialRampToValueAtTime(96, t + 1.2);
  const wob = ctx.createOscillator();
  wob.frequency.value = 5;
  const wobG = ctx.createGain();
  wobG.gain.value = 3;
  wob.connect(wobG).connect(hum.frequency);
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0.0001, t);
  hg.gain.exponentialRampToValueAtTime(0.12, t + 0.8);
  hum.connect(hg).connect(master);
  hum.start(t);
  wob.start(t);

  // bubbles: short sine chirps sweeping upward
  let rate = 0.5;
  let alive = true;
  const bubble = () => {
    if (!alive) return;
    const now = ctx.currentTime;
    const base = 300 + Math.random() * 700;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(base, now);
    o.frequency.exponentialRampToValueAtTime(base * (2.2 + Math.random()), now + 0.06);
    const g = ctx.createGain();
    env(g, now, 0.004, 0.11, 0.07);
    o.connect(g).connect(master);
    o.start(now);
    o.stop(now + 0.12);
    setTimeout(bubble, 50 + Math.random() * (380 - rate * 300));
  };
  setTimeout(bubble, 200);
  return {
    set(x) {
      rate = x;
      hum.frequency.setTargetAtTime(70 + x * 60, ctx.currentTime, 0.3);
    },
    stop() {
      alive = false;
      const now = ctx.currentTime;
      hum.frequency.setTargetAtTime(30, now, 0.3);
      hg.gain.setTargetAtTime(0.0001, now, 0.2);
      setTimeout(() => {
        hum.stop();
        wob.stop();
      }, 1200);
    },
  };
}

const PROJECT_SOUNDS = { wave: droneSound, clusters: retailSound, cells: labSound };

export function startProjectSound(kind) {
  if (!enabled || !ensure() || !PROJECT_SOUNDS[kind]) return null;
  // duck the ambient pad while a project plays
  if (ambient) ambient.out.gain.setTargetAtTime(ambient.level * 0.25, ctx.currentTime, 0.2);
  const ctrl = PROJECT_SOUNDS[kind]();
  return {
    set: ctrl.set,
    stop() {
      ctrl.stop();
      if (ambient) ambient.out.gain.setTargetAtTime(ambient.level, ctx.currentTime, 0.6);
    },
  };
}
