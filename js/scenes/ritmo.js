// Minijuego de ritmo (al estilo de Rhythm Heaven): desmontar los andamios del castillo con los Gemelos bipolares.
// Cada ronda: cuenta de cuatro → el gato marca un ritmo con el martillo → otra cuenta de cuatro → Colgadín lo repite,
// igual, con el botón de acción → compás de respiro en el que se ve el resultado. Si lo clava, cae un tablón y el gato se pone del lado feliz; si no, se da la vuelta
// enfurruñado y hay que repetir ese mismo ritmo (no se pierde ningún tablón). Hay que tirar los 8 tablones.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';
import { GENERATED } from '../songs-data.js';

// Suena la canción de los Andamios (js/songs-data.js, generada por tools/make_music.py) cuadrada con el reloj del
// minijuego: el tempo sale de la propia canción y empieza justo en el primer compás de la cuenta.
// Hay dos versiones para elegir: 'andamios' (la primera) y 'andamios2' (estribillo de Andamios2).
const SONG = 'andamios2';
const BPM = GENERATED[SONG].bpm, BEAT = 60000 / BPM, EIGHTH = BEAT / 2, BAR = BEAT * 4;
const WIN = Math.min(135, EIGHTH * 0.48); // margen para acertar un golpe (ms), sin llegar a pisar la corchea de al lado
const CYCLE = ['count', 'call', 'count2', 'resp', 'rest'];

// Tonos en armonía con la música: los martillazos del gato, los de Colgadín y los clics de la cuenta suenan en
// la nota del acorde que lleva la canción en ese momento, sacada de su bajo. HARMONIC = false vuelve a los tonos fijos.
const HARMONIC = true;
const STEP_MS = 60000 / BPM / (GENERATED[SONG].div || 2);
const ROOTS = (() => { // nota del bajo (0–11) en cada paso de la canción; en los silencios sigue la última
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }, out = [];
  let last = 4; // mi
  for (const tok of GENERATED[SONG].tracks[1].notes.trim().split(/\s+/)) {
    const [n, d] = tok.split(':'), m = /^([A-G])(#?)/.exec(n);
    if (m) last = (SEMI[m[1]] + (m[2] ? 1 : 0)) % 12;
    for (let k = 0; k < (+d || 1); k++) out.push(last);
  }
  return out;
})();
const hz = (pc, octave, interval = 0) => 440 * 2 ** ((12 * (octave + 1) + pc + interval - 69) / 12); // nota pc(+intervalo) en esa octava
const GOAL = 8;
// Posiciones de los golpes dentro del compás, en corcheas (0–7): una por tablón, de menos a más difícil.
// Empieza en negras; enseguida entran contratiempos y síncopas, y acaba en parejas sincopadas de seis golpes.
const PATTERNS = [[0, 2, 4, 6], [0, 2, 3, 4, 6], [0, 3, 4, 6], [0, 3, 5, 6], [1, 3, 5, 6], [1, 2, 4, 5, 7], [0, 2, 3, 5, 6, 7], [0, 1, 3, 4, 6, 7]];

export class RitmoScene extends Phaser.Scene {
  constructor() { super('ritmo'); }

  create() {
    this.cameras.main.setBackgroundColor('#f3dfae').fadeIn(250);
    UI.hud(false);
    Sound.music(null);
    const g = this.add.graphics();
    g.fillStyle(0xe9c98f).fillRect(-80, 0, 480, 120);
    for (let y = 0; y < 120; y += 12) for (let x = -80 + ((y / 12) % 2) * 12; x < 400; x += 24) g.fillStyle(0xdcb87a).fillRect(x, y, 22, 1);
    g.fillStyle(0xcfa76a).fillRect(-80, 120, 480, 60);
    g.fillStyle(0x6e4520).fillRect(130, 20, 60, 100).fillStyle(0x3b2a20).fillRect(136, 26, 48, 94); // la puerta principal
    this.scaf = this.add.graphics();
    this.cat = this.add.image(70, 132, 'gato_down_0').setOrigin(0.5, 1).setScale(2);
    this.cat2 = this.add.image(36, 132, 'gatot_down_0').setOrigin(0.5, 1).setScale(1.5).setAlpha(0.9);
    this.col = this.add.image(250, 132, 'colgadin_side_0').setOrigin(0.5, 1).setScale(2).setFlipX(true);
    this.fx = this.add.graphics().setDepth(10);
    // Las indicaciones («Escucha… 1», «¡Ahora tú!») van en un cuadrito HTML como el de los diálogos (UI.cue), nítido
    this.removed = 0; this.pat = 0; this.fails = 0; this.happy = true;
    this.lock = true; this.done = false; this.t0 = 0; this.bar = -1; this.presses = []; this.sched = new Set();
    this.catHit = 0; this.colHit = 0; this.planksShake = 0;
    this.bar_();
    Input.clear();
    this.intro();
  }

  bar_() { UI.minibar(`Andamios del castillo · Tablones ${this.removed}/${GOAL}`, { exit: () => this.exit() }); }
  exit() {
    if (UI.busy || this.leaving) return;
    this.leaving = true; this.done = true; UI.minibar(null); UI.cue(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.done) { this.removed = GOAL; this.win(); } }

  async intro(again) {
    this.lock = true;
    Sound.music(null); // calla mientras se explica; al empezar vuelve a arrancar, cuadrada con la cuenta
    await UI.say('Gemelo bipolar', again
      ? ['Así no. ¡Escucha primero mi compás y luego repítelo en el siguiente, igualito!', 'Volvemos a empezar con la cuenta: un, dos, tres, cuatro…']
      : [
        'Los andamios se desmontan a martillazos, pero AL COMPÁS. Yo toco un ritmo en un compás y tú lo repites en el siguiente, igualito, con el botón de acción.',
        'Antes de mi ritmo cuento cuatro, y antes de tu turno vuelvo a contar cuatro: el primer golpe va justo después del «4».',
        'Cada ritmo que clavas tira un tablón; si fallas, lo repetimos hasta que salga. Son ocho tablones.',
      ]);
    Input.clear();
    this.fails = 0;
    this.t0 = performance.now() + 600; this.bar = -1; this.sched.clear(); this.presses = []; this.judged = new Set(); this.result = '';
    if (Sound.ctx) Sound.music(SONG, true, Sound.ctx.currentTime + (this.t0 - performance.now()) / 1000);
    this.lock = false;
  }

  // Reloj: se repite cuenta → llamada del gato → cuenta → respuesta de Colgadín → respiro
  phase(now) {
    const b = Math.max(0, Math.floor((now - this.t0) / BAR));
    return { kind: CYCLE[b % CYCLE.length], b, start: this.t0 + b * BAR };
  }
  // Retraso de la salida de audio: el jugador pulsa con lo que OYE, que suena un poco después de lo programado
  latency() { const c = Sound.ctx; return c ? Math.min(90, ((c.baseLatency || 0) + (c.outputLatency || 0)) * 1000) : 0; } // tope: en móvil a veces informa de cientos de ms

  // Fundamental (0–11) del acorde que suena en la canción en el instante ms (la canción arranca en t0 y se repite)
  rootAt(ms) {
    const i = Math.floor((ms - this.t0) / STEP_MS + 1e-6);
    return ROOTS[((i % ROOTS.length) + ROOTS.length) % ROOTS.length];
  }

  // Sonidos programados con el reloj de audio (sin retrasos de fotograma)
  at(ms, f, dur, wave, vol) {
    if (!Sound.ctx) return;
    Sound.note(f, Sound.ctx.currentTime + Math.max(0, (ms - performance.now()) / 1000), dur, wave, vol);
  }
  schedule(now) {
    for (let b = Math.max(0, Math.floor((now - this.t0) / BAR)); b <= Math.floor((now + 250 - this.t0) / BAR); b++) {
      const start = this.t0 + b * BAR;
      // Clics de la cuenta (un, dos, tres, cuatro); el resto del tiempo el pulso lo lleva la música
      const kind = CYCLE[b % CYCLE.length];
      if (kind === 'count' || kind === 'count2') for (let q = 0; q < 4; q++) {
        const t = start + q * BEAT, key = 'm' + b + q;
        if (t > now - 10 && t < now + 250 && !this.sched.has(key)) {
          this.sched.add(key);
          const f = HARMONIC ? hz(this.rootAt(t), 6, kind === 'count' ? 0 : 7) : kind === 'count' ? 1200 : 1500; // fundamental / quinta
          this.at(t, f, 0.05, 'square', 0.1);
        }
      }
      if (CYCLE[b % CYCLE.length] === 'call') for (const e of PATTERNS[this.pat % PATTERNS.length]) {
        const t = start + e * EIGHTH, key = 'c' + b + e;
        if (t > now - 10 && t < now + 250 && !this.sched.has(key)) {
          this.sched.add(key);
          // martillazo del gato: la fundamental del acorde que suena (si no, mi4 y si5 fijos)
          const r = this.rootAt(t);
          this.at(t, HARMONIC ? hz(r, 4) : 330, 0.09, 'triangle', 0.3); this.at(t, HARMONIC ? hz(r, 5, 7) : 990, 0.03, 'square', 0.05);
        }
      }
    }
  }

  judge(start) {
    const targets = PATTERNS[this.pat % PATTERNS.length].map((e) => start + e * EIGHTH);
    const used = new Set();
    let ok = true;
    for (const t of targets) {
      const i = this.presses.findIndex((p, j) => !used.has(j) && Math.abs(p - t) <= WIN);
      if (i < 0) ok = false; else used.add(i);
    }
    if (used.size !== this.presses.length) ok = false; // golpes de más
    this.presses = [];
    this.result = ok ? '¡Bien!' : '¡Uy!';
    if (ok) {
      this.removed++; this.pat++; this.fails = 0; this.happy = true;
      Sound.sfx('get'); this.planksShake = 1;
      this.bar_();
      if (this.removed >= GOAL) return this.win();
    } else {
      this.fails++; this.happy = false; // no se pierde tablón: se repite el mismo ritmo
      Sound.sfx('bad');
      this.bar_();
      if (this.fails >= 3) this.intro(true);
    }
  }

  async win() {
    this.done = true; this.lock = true;
    UI.minibar(null); UI.cue(null);
    this.happy = true;
    this.cameras.main.shake(500, 0.006);
    await new Promise((r) => this.time.delayedCall(900, r));
    await SCRIPTS.ritmoDone();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time) {
    const now = performance.now();
    if (!this.lock && !UI.busy && !this.done) {
      this.schedule(now);
      const ph = this.phase(now);
      this.bar = ph.b;
      // la respuesta se evalúa un poco después de acabar su compás, para admitir el último golpe algo tarde
      if (ph.kind === 'rest' && now - ph.start >= WIN && !this.judged.has(ph.b)) {
        this.judged.add(ph.b);
        this.judge(ph.start - BAR);
        if (this.lock || this.done) return;
      }
      if (ph.kind === 'call') this.result = '';
      if (Input.take('a')) {
        const t = (Input.t.a || now) - this.latency();
        // se admite el primer golpe un pelín adelantado (al final de la cuenta) y el último algo tarde
        const early = ph.kind === 'count2' && ph.start + BAR - t <= WIN + 60; // el primer golpe, con algo más de margen
        if (ph.kind === 'resp' || early || (ph.kind === 'rest' && now - ph.start < WIN)) {
          const start = ph.kind === 'resp' ? ph.start : early ? ph.start + BAR : ph.start - BAR;
          this.presses.push(t);
          const hit = PATTERNS[this.pat % PATTERNS.length].some((e) => Math.abs(start + e * EIGHTH - t) <= WIN);
          // acierto: la quinta del acorde que suena (contesta al gato en armonía); fallo: zumbido grave, a propósito
          this.at(now, hit ? (HARMONIC ? hz(this.rootAt(now), 3, 7) : 196) : 120, 0.1, hit ? 'square' : 'sawtooth', 0.14);
          this.colHit = 1;
        }
      }
      if (Input.take('b')) return this.exit();
      // golpes del gato durante su compás (animación)
      if (ph.kind === 'call') for (const e of PATTERNS[this.pat % PATTERNS.length]) if (Math.abs(now - (ph.start + e * EIGHTH)) < 30) this.catHit = 1;
      // (antes de que arranque la primera cuenta, now < t0: sin número, que si no sale «undefined»)
      const n = now < this.t0 ? '' : ['1', '2', '3', '4'][Math.min(3, Math.max(0, Math.floor((now - ph.start) / BEAT)))];
      UI.cue(ph.kind === 'count' ? `Escucha… ${n}` : ph.kind === 'count2' ? `Te toca… ${n}` : ph.kind === 'call' ? '¡Escucha!' : ph.kind === 'resp' ? '¡Ahora tú!' : this.result,
        ph.kind === 'resp' || ph.kind === 'count2');
    } else { Input.clear(); UI.cue(null); }
    this.catHit = Math.max(0, this.catHit - 0.12); this.colHit = Math.max(0, this.colHit - 0.12); this.planksShake = Math.max(0, this.planksShake - 0.05);

    this.cat.setTexture(`${this.happy ? 'gato' : 'gatot'}_down_${this.catHit > 0.4 ? 1 : 0}`).setAngle(-this.catHit * 12);
    this.cat2.setTexture(`${this.happy ? 'gatot' : 'gato'}_down_0`);
    this.col.setAngle(this.colHit * 14).setTexture(`colgadin_side_${this.colHit > 0.4 ? 1 : 0}`);
    // Andamio: los tablones que quedan, delante de la puerta
    const s = this.scaf.clear(), left = GOAL - this.removed, sh = Math.sin(time / 20) * 2 * this.planksShake;
    s.fillStyle(0x8a5a2a).fillRect(118, 14, 4, 106).fillRect(198, 14, 4, 106);
    for (let i = 0; i < left; i++) { const y = 108 - i * 12; s.fillStyle(0x6e4520).fillRect(112 + sh, y, 96, 6).fillStyle(0xc98f4e).fillRect(113 + sh, y + 1, 94, 4); }
    // indicador de pulso
    const f = this.fx.clear(), beat = ((now - this.t0) % BEAT) / BEAT;
    if (!this.lock && now > this.t0) f.fillStyle(0xe2574c, 1 - beat).fillCircle(160, 169, 4 + (1 - beat) * 3);
  }
}
