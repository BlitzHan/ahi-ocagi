'use strict';
/* Sentezlenmiş ses efektleri (dosya yok). İlk tıklamada açılır. */
const Sfx = (() => {
  let ac = null, master = null, noiseBuf = null;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.35;
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }
  const ok = () => ac && !S.muted;
  function tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, slide = 0, attack = 0.005 } = {}) {
    const t = ac.currentTime + at;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, { vol = 0.3, at = 0, freq = 1200, q = 1, type = 'bandpass' } = {}) {
    const t = ac.currentTime + at;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }
  return {
    init,
    clang() {
      if (!ok()) return;
      [523, 1397, 2213, 3301].forEach((f, i) => tone(f * rand(0.98, 1.02), 0.6 - i * 0.1, { type: 'sine', vol: 0.22 / (i + 1) }));
      noise(0.08, { vol: 0.5, freq: 4000, q: 0.7 });
      tone(120, 0.12, { type: 'triangle', vol: 0.35, slide: 0.5 });
    },
    swing() { if (ok()) noise(0.12, { vol: 0.12, freq: 900, q: 0.8, type: 'bandpass' }); },
    hit(crit) {
      if (!ok()) return;
      noise(0.1, { vol: crit ? 0.5 : 0.3, freq: crit ? 2500 : 1500, q: 0.9 });
      tone(crit ? 180 : 140, 0.12, { type: 'triangle', vol: 0.4, slide: 0.5 });
      if (crit) tone(1200, 0.2, { type: 'square', vol: 0.06, slide: 0.6 });
    },
    hurt() { if (ok()) { tone(220, 0.18, { type: 'sawtooth', vol: 0.12, slide: 0.5 }); noise(0.08, { vol: 0.2, freq: 600 }); } },
    dodge() { if (ok()) noise(0.15, { vol: 0.12, freq: 3000, q: 2, type: 'highpass' }); },
    coin() { if (ok()) { tone(1320, 0.08, { type: 'square', vol: 0.06 }); tone(1980, 0.18, { type: 'square', vol: 0.06, at: 0.06 }); } },
    pop() { if (ok()) tone(500, 0.12, { type: 'sine', vol: 0.2, slide: 2 }); },
    sell() { if (ok()) { tone(900, 0.08, { type: 'triangle', vol: 0.15 }); tone(1350, 0.15, { type: 'triangle', vol: 0.15, at: 0.07 }); } },
    equip() { if (ok()) { noise(0.06, { vol: 0.25, freq: 3000 }); tone(660, 0.1, { type: 'triangle', vol: 0.2 }); tone(990, 0.2, { type: 'triangle', vol: 0.18, at: 0.08 }); } },
    reveal(r) {
      if (!ok()) return;
      const base = [392, 440, 523, 587, 659, 784][r];
      const steps = [0, 4, 7, 12, 16].slice(0, 2 + Math.min(3, r));
      steps.forEach((s, i) => tone(base * Math.pow(2, s / 12), 0.5, { type: 'triangle', vol: 0.15, at: i * 0.07 }));
      if (r >= 3) { tone(base * 2, 1.2, { type: 'sine', vol: 0.12, at: 0.35 }); noise(0.8, { vol: 0.08, freq: 6000, q: 0.5, at: 0.3, type: 'highpass' }); }
    },
    enemyDie() { if (ok()) { tone(300, 0.3, { type: 'square', vol: 0.08, slide: 0.3 }); noise(0.25, { vol: 0.2, freq: 500 }); } },
    boss() { if (ok()) { tone(80, 1.2, { type: 'sawtooth', vol: 0.25, slide: 0.7 }); tone(120, 1.2, { type: 'square', vol: 0.08, slide: 0.7 }); noise(0.6, { vol: 0.3, freq: 200, type: 'lowpass' }); } },
    clear() { if (ok()) [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.15, at: i * 0.09 })); },
    lose() { if (ok()) [392, 330, 262].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.15, at: i * 0.15 })); },
    levelUp() { if (ok()) [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, { type: 'square', vol: 0.07, at: i * 0.07 })); },
  };
})();
