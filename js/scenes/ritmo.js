// Minijuego de ritmo (al estilo de Rhythm Heaven): desmontar los andamios del castillo con los gatos reversibles.
// El gato marca un ritmo con el martillo en un compás y Colgadín tiene que repetirlo, igual, en el compás siguiente
// pulsando el botón de acción; después hay un compás de respiro en el que se ve el resultado. Si lo clava, cae un tablón y el gato se pone del lado feliz; si no, se da la vuelta
// enfurruñado y el andamio recupera un tablón. Hay que tirar los 8 tablones.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

const BPM = 100, BEAT = 60000 / BPM, EIGHTH = BEAT / 2, BAR = BEAT * 4, WIN = 115;
const GOAL = 8;
// Posiciones de los golpes dentro del compás, en corcheas (0–7). De menos a más difícil.
const PATTERNS = [[0, 2, 4, 6], [0, 4, 6], [0, 2, 3, 4], [0, 3, 4], [0, 2, 5, 6], [1, 3, 5], [0, 1, 2, 4, 6], [0, 3, 5, 6], [1, 2, 4, 5, 7], [0, 2, 3, 5, 6, 7]];

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
    this.label = this.add.text(160, 150, '', { fontFamily: 'Pixelify', fontSize: '16px', color: '#3b2a20', stroke: '#fff6dc', strokeThickness: 4 }).setOrigin(0.5).setDepth(11);
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
    this.leaving = true; this.done = true; UI.minibar(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.done) { this.removed = GOAL; this.win(); } }

  async intro(again) {
    this.lock = true;
    await UI.say('Gato reversible', again
      ? ['Así no. ¡Escucha primero mi compás y luego repítelo en el siguiente, igualito!', 'Volvemos a empezar con la cuenta: un, dos, tres, cuatro…']
      : [
        '¡Miau! Somos los gatos reversibles: si algo sale bien, se nos ve contentos; si sale mal, nos damos la vuelta y ponemos esta cara.',
        'Los andamios se desmontan a martillazos, pero AL COMPÁS. Yo toco un ritmo en un compás y tú lo repites en el siguiente, igualito, con el botón de acción.',
        'Primero cuento cuatro. Cada ritmo que clavas tira un tablón; si fallas, el andamio se rehace un poco. Son ocho tablones.',
      ]);
    Input.clear();
    this.fails = 0;
    this.t0 = performance.now() + 600; this.bar = -1; this.sched.clear(); this.presses = []; this.judged = new Set(); this.result = '';
    this.lock = false;
  }

  // Reloj: compás 0 = cuenta; después se repite llamada del gato → respuesta de Colgadín → respiro
  phase(now) {
    const b = Math.floor((now - this.t0) / BAR);
    if (b < 1) return { kind: 'count', b, start: this.t0 };
    return { kind: ['call', 'resp', 'rest'][(b - 1) % 3], b, start: this.t0 + b * BAR };
  }

  // Sonidos programados con el reloj de audio (sin retrasos de fotograma)
  at(ms, f, dur, wave, vol) {
    if (!Sound.ctx) return;
    Sound.note(f, Sound.ctx.currentTime + Math.max(0, (ms - performance.now()) / 1000), dur, wave, vol);
  }
  schedule(now) {
    for (let b = Math.max(0, Math.floor((now - this.t0) / BAR)); b <= Math.floor((now + 250 - this.t0) / BAR); b++) {
      const start = this.t0 + b * BAR;
      for (let q = 0; q < 4; q++) { // metrónomo suave en cada pulso
        const t = start + q * BEAT, key = 'm' + b + q;
        if (t > now - 10 && t < now + 250 && !this.sched.has(key)) { this.sched.add(key); this.at(t, b === 0 ? 1200 : q === 0 ? 900 : 700, 0.04, 'square', b === 0 ? 0.08 : 0.03); }
      }
      if (b >= 1 && (b - 1) % 3 === 0) for (const e of PATTERNS[this.pat % PATTERNS.length]) {
        const t = start + e * EIGHTH, key = 'c' + b + e;
        if (t > now - 10 && t < now + 250 && !this.sched.has(key)) { this.sched.add(key); this.at(t, 330, 0.09, 'triangle', 0.3); this.at(t, 990, 0.03, 'square', 0.05); }
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
      this.removed = Math.max(0, this.removed - 1); this.fails++; this.happy = false;
      Sound.sfx('bad');
      this.bar_();
      if (this.fails >= 3) this.intro(true);
    }
  }

  async win() {
    this.done = true; this.lock = true;
    UI.minibar(null);
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
        const t = Input.t.a || now;
        if (ph.kind === 'resp' || (ph.kind === 'rest' && now - ph.start < WIN)) {
          const start = ph.kind === 'resp' ? ph.start : ph.start - BAR;
          this.presses.push(t);
          const hit = PATTERNS[this.pat % PATTERNS.length].some((e) => Math.abs(start + e * EIGHTH - t) <= WIN);
          this.at(now, hit ? 196 : 120, 0.1, hit ? 'square' : 'sawtooth', 0.14);
          this.colHit = 1;
        }
      }
      if (Input.take('b')) return this.exit();
      // golpes del gato durante su compás (animación)
      if (ph.kind === 'call') for (const e of PATTERNS[this.pat % PATTERNS.length]) if (Math.abs(now - (ph.start + e * EIGHTH)) < 30) this.catHit = 1;
      this.label.setText(ph.kind === 'count' ? ['1', '2', '3', '4'][Math.min(3, Math.floor((now - this.t0) / BEAT))] || '' : ph.kind === 'call' ? '¡Escucha!' : ph.kind === 'resp' ? '¡Ahora tú!' : this.result).setColor(ph.kind === 'resp' ? '#c8402c' : '#3b2a20');
    } else { Input.clear(); this.label.setText(''); }
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
    if (!this.lock && now > this.t0) f.fillStyle(0xe2574c, 1 - beat).fillCircle(160, 166, 4 + (1 - beat) * 3);
  }
}
