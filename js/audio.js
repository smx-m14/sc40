// Sonido. Toda la música es chiptune sintetizado con WebAudio (las canciones de zona salen de js/songs-data.js);
// solo los efectos grabados (monos, patito) y la prueba de Fuxia usan mp3. Pistas sintetizadas: "NOTA:pasos ..." (paso = corchea, "-" = silencio).
import { State } from './state.js';
import { GENERATED } from './songs-data.js';

const MUSIC_VOL = 0.45;

// Composiciones propias para lo que no tiene mp3 de referencia (y el Combini, cuyo mp3 está en silencio)
const COMPOSED = {
  fiesta: { // «Cumpleaños feliz» (dominio público)
    bpm: 132,
    tracks: [
      { wave: 'square', vol: 0.09, notes: 'G4:1 G4:1 A4:2 G4:2 C5:2 B4:4 G4:1 G4:1 A4:2 G4:2 D5:2 C5:4 G4:1 G4:1 G5:2 E5:2 C5:2 B4:2 A4:4 F5:1 F5:1 E5:2 C5:2 D5:2 C5:4 -:2' },
      { wave: 'triangle', vol: 0.17, notes: 'C3:8 G2:4 G2:8 C3:4 C3:8 F3:6 C3:4 G2:4 C3:6' },
    ],
  },
  casa: {
    bpm: 92,
    tracks: [
      { wave: 'triangle', vol: 0.16, notes: 'G4:2 C5:2 E5:4 D5:2 C5:2 A4:4 F4:2 A4:2 C5:4 B4:2 D5:2 G4:4' },
      { wave: 'sine', vol: 0.14, notes: 'C3:8 A2:8 F2:8 G2:8' },
    ],
  },
  puzle: {
    bpm: 118,
    tracks: [
      { wave: 'square', vol: 0.07, notes: 'A4:1 C5:1 E5:2 A4:1 C5:1 E5:2 G4:1 B4:1 D5:2 G4:1 B4:1 D5:2 F4:1 A4:1 C5:2 F4:1 A4:1 C5:2 E4:1 G#4:1 B4:2 E5:4' },
      { wave: 'triangle', vol: 0.16, notes: 'A2:4 E3:4 G2:4 D3:4 F2:4 C3:4 E2:4 E3:4' },
    ],
  },
};

// Las canciones de zona se transcriben de los mp3 con tools/make_music.py
const SONGS = { ...GENERATED, ...COMPOSED };

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freq(n) {
  const m = /^([A-G])(#?)(\d)$/.exec(n);
  if (!m) return 0;
  const midi = 12 * (+m[3] + 1) + SEMI[m[1]] + (m[2] ? 1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}
function compile(song) {
  const tracks = song.tracks.map((t) => {
    const steps = [];
    for (const tok of t.notes.trim().split(/\s+/)) {
      const [n, d] = tok.split(':');
      const len = +d || 1;
      steps.push(n === '-' ? null : { f: freq(n), len });
      for (let i = 1; i < len; i++) steps.push(null);
    }
    return { wave: t.wave, vol: t.vol, steps };
  });
  return { step: 60 / song.bpm / (song.div || 2), len: Math.max(...tracks.map((t) => t.steps.length)), tracks };
}

export const Sound = {
  ctx: null, master: null, cur: null, curId: null, wanted: null, timer: null,
  els: {},      // <audio> por canción
  playing: null, // <audio> que suena ahora

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = State.settings.mute ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.timer = setInterval(() => this.tick(), 60);
    if (this.wanted) this.music(this.wanted, true);
  },
  setMute(m) {
    State.settings.mute = m; State.saveSettings();
    if (this.master) this.master.gain.value = m ? 0 : 1;
    for (const el of Object.values(this.els)) el.muted = m;
  },
  el(file, loop) {
    if (!this.els[file]) {
      const a = this.els[file] = new Audio(`assets/audio/${file}.mp3`);
      a.loop = loop; a.preload = 'auto'; a.muted = State.settings.mute;
    }
    return this.els[file];
  },
  note(f, t, dur, wave = 'square', vol = 0.1) {
    if (!this.ctx || !f) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = wave; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.04));
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  // Cambia la música de fondo. Los mp3 se reanudan donde se quedaron al volver a su zona.
  music(id, force) {
    this.wanted = id;
    if (!this.ctx || (!force && id === this.curId)) return;
    this.curId = id;
    if (this.playing) { this.playing.pause(); this.playing = null; }
    this.cur = null;
    if (SONGS[id]) {
      this.cur = { ...compile(SONGS[id]), i: 0, next: this.ctx.currentTime + 0.08 };
    }
  },
  tick() {
    const c = this.cur;
    if (!c || !this.ctx || this.ctx.state !== 'running') return;
    if (c.next < this.ctx.currentTime - 0.5) c.next = this.ctx.currentTime + 0.05; // pestaña en segundo plano
    while (c.next < this.ctx.currentTime + 0.25) {
      for (const t of c.tracks) {
        const ev = t.steps[c.i % c.len];
        if (ev) this.note(ev.f, c.next, ev.len * c.step * 0.95, t.wave, t.vol);
      }
      c.i = (c.i + 1) % c.len;
      c.next += c.step;
    }
  },
  // Música de logro: suena al conseguir cualquier cosa y baja la música de fondo mientras dura.
  // Adivinanza musical de Fuxia: toca el arranque de una canción deformado. Devuelve cuánto dura (s).
  // mode: 'fast' acelerada · 'rev' al revés · 'low' muy grave · 'short' solo un segundo
  riddle(id, mode) {
    if (!this.ctx || !SONGS[id]) return 0;
    const c = compile(SONGS[id]), N = 28;
    let evs = [];
    c.tracks[0].steps.forEach((ev, i) => { if (ev && i < N) evs.push({ i, f: ev.f, len: Math.min(ev.len, N - i) }); });
    let step = c.step;
    if (mode === 'fast') step *= 0.42;
    if (mode === 'rev') evs = evs.map((e) => ({ ...e, i: N - e.i - e.len }));
    if (mode === 'short') evs = evs.filter((e) => e.i * step < 1.1);
    const k = mode === 'low' ? 0.25 : 1, t0 = this.ctx.currentTime + 0.08;
    for (const e of evs) this.note(e.f * k, t0 + e.i * step, e.len * step * 0.95, mode === 'low' ? 'sawtooth' : 'square', 0.1);
    return (mode === 'short' ? 1.2 : N * step) + 0.2;
  },
  // Sintonía corta: suena UNA vez (no en bucle) y la música de fondo espera o baja mientras dura.
  // La usa el Combini al acercarse a la puerta, y la Música de Logro en versión chiptune.
  jingle(id, gain = 1.4) {
    if (!this.ctx || !SONGS[id]) return;
    const now = this.ctx.currentTime;
    if (this.jingleEnd && now < this.jingleEnd) return;   // ya está sonando una
    const c = compile(SONGS[id]), t0 = now + 0.03, dur = c.len * c.step;
    for (const t of c.tracks) t.steps.forEach((ev, i) => { if (ev) this.note(ev.f, t0 + i * c.step, ev.len * c.step * 0.95, t.wave, t.vol * gain); });
    this.jingleEnd = t0 + dur;
    if (this.cur) this.cur.next = Math.max(this.cur.next, t0) + dur;        // música sintetizada: se detiene y sigue después
    const bg = this.playing;                                                // música en mp3: baja el volumen
    if (bg) { bg.volume = 0.08; setTimeout(() => { bg.volume = MUSIC_VOL; }, dur * 1000); }
  },
  logro() {
    if (!this.ctx) return;
    this.jingle('logro');
  },
  // Efectos grabados (monos, patito…): assets/audio/sfx_<nombre>.mp3
  clip(name, vol = 0.8) {
    if (!this.ctx) return;
    const a = this.el('sfx_' + name, false);
    a.currentTime = 0; a.volume = vol;
    a.play().catch(() => {});
  },
  seq(notes, step = 0.08, wave = 'square', vol = 0.1) {
    if (!this.ctx) return;
    let t = this.ctx.currentTime + 0.01;
    for (const n of notes) { if (n) this.note(freq(n), t, step * 1.1, wave, vol); t += step; }
  },
  sfx(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'talk': this.note(520 + Math.random() * 180, t, 0.035, 'square', 0.035); break;
      case 'ok': this.seq(['E5', 'A5'], 0.06); break;
      case 'bad': this.seq(['E4', 'C4'], 0.12, 'sawtooth', 0.08); break;
      case 'bump': this.note(90, t, 0.08, 'square', 0.08); break;
      case 'push': this.note(140, t, 0.07, 'triangle', 0.2); break;
      case 'step': this.note(200, t, 0.03, 'triangle', 0.06); break;
      case 'get': this.seq(['C5', 'E5', 'G5', 'C6'], 0.07); break;
      case 'coin': this.seq(['B5', 'E6'], 0.07); break;
      case 'door': this.seq(['G4', 'C4'], 0.09, 'triangle', 0.2); break;
      case 'dig': this.seq(['C3', 'E3', 'C3', 'E3', 'C3', 'G3'], 0.09, 'sawtooth', 0.08); break;
      case 'gacha': this.seq(['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6', null, 'G6'], 0.06); break;
      case 'rep': this.seq(['G4', 'C5', 'E5'], 0.05, 'square', 0.1); break;
      case 'biang': this.seq(['C3', null, 'C3'], 0.12, 'sawtooth', 0.14); break;
      case 'undo': this.seq(['A4', 'E4'], 0.05, 'triangle', 0.15); break;
    }
  },
};
