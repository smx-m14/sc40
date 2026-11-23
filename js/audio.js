// Sonido. Toda la música es chiptune sintetizado con WebAudio (las canciones de zona salen de js/songs-data.js);
// solo los efectos grabados (monos, Patito, awawas) y la prueba de Fucsia usan mp3. Pistas sintetizadas: "NOTA:pasos ..." (paso = corchea, "-" = silencio).
import { State } from './state.js';
import { GENERATED } from './songs-data.js';

// Composiciones propias (lo que no sale de un MIDI ni de un mp3 de referencia)
const COMPOSED = {
  fiesta: { // «Cumpleaños feliz» (dominio público)
    bpm: 132,
    tracks: [
      { wave: 'square', vol: 0.09, notes: 'G4:1 G4:1 A4:2 G4:2 C5:2 B4:4 G4:1 G4:1 A4:2 G4:2 D5:2 C5:4 G4:1 G4:1 G5:2 E5:2 C5:2 B4:2 A4:4 F5:1 F5:1 E5:2 C5:2 D5:2 C5:4 -:2' },
      { wave: 'triangle', vol: 0.17, notes: 'C3:8 G2:4 G2:8 C3:4 C3:8 F3:6 C3:4 G2:4 C3:6' },
    ],
  },
  // (la música de la casa de Cait, «casa», sale ahora de music/casa.mid: ver tools/make_music.py)
};

// Las canciones de zona salen de tools/make_music.py (de los MIDI de music/ o, si no hay, de los mp3 originales)
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
  els: {},      // <audio> de los efectos grabados

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
  el(file) {
    if (!this.els[file]) {
      const a = this.els[file] = new Audio(`assets/audio/${file}.mp3`);
      a.preload = 'auto'; a.muted = State.settings.mute;
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
  // Cambia la música de fondo (en bucle).
  // at (opcional): instante del reloj de audio en que empieza, para cuadrarla con un minijuego de ritmo.
  music(id, force, at) {
    this.wanted = id;
    if (!this.ctx || (!force && id === this.curId)) return;
    this.curId = id;
    this.cur = null;
    if (SONGS[id]) {
      this.cur = { ...compile(SONGS[id]), i: 0, next: at ?? this.ctx.currentTime + 0.08 };
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
  // Sintonía corta: suena UNA vez (no en bucle) y la música de fondo espera o baja mientras dura.
  // La usa el Combini al acercarse a la puerta, y la Música de Logro en versión chiptune.
  jingle(id, gain = 1.4) {
    if (!this.ctx || !SONGS[id]) return;
    const now = this.ctx.currentTime;
    if (this.jingleEnd && now < this.jingleEnd) return;   // ya está sonando una
    const c = compile(SONGS[id]), t0 = now + 0.03, dur = c.len * c.step;
    for (const t of c.tracks) t.steps.forEach((ev, i) => { if (ev) this.note(ev.f, t0 + i * c.step, ev.len * c.step * 0.95, t.wave, t.vol * gain); });
    this.jingleEnd = t0 + dur;
    if (this.cur) this.cur.next = Math.max(this.cur.next, t0) + dur;        // la música de fondo se detiene y sigue después
  },
  logro() {
    if (!this.ctx) return;
    this.jingle('logro');
  },
  // Efectos grabados (monos, Patito, awawas): assets/audio/sfx_<nombre>.mp3
  // Carga por adelantado efectos grabados, para que el primero no llegue tarde
  preload(...names) { for (const n of names) this.el('sfx_' + n).load(); },
  clip(name, vol = 0.8) {
    if (!this.ctx) return;
    const a = this.el('sfx_' + name);
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
