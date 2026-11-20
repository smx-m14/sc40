// Minijuego: ensayo en el Teatro Real (tipo Simon). Los seis Owitos del Teatro están en fila, desordenados (no van
// de grave a agudo), y cada uno canta una nota. Cantan una secuencia y hay que repetirla: con ← → se mueve el foco
// hasta el Owito y con el botón de acción canta. La secuencia crece nota a nota hasta completar la melodía que
// luego llama a Narwal con el Otamatone.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

// Los seis Owitos de las fotos de muestra («Fotos reales personajes/08 Owitos del Teatro»), de izquierda a derecha
// tal como salen al escenario. col = su color en las marcas del Otamatone.
export const OWITOS = [
  { tex: 'owito_k', note: 'F4', col: 0xf7a8c0 }, // rosa, con su banderín
  { tex: 'owito_t', note: 'A3', col: 0xb07a44 }, // el del sombrero de paja: la voz más grave
  { tex: 'owito_g', note: 'G4', col: 0x8fd070 }, // verde
  { tex: 'owito_w', note: 'C4', col: 0x4a90c8 }, // blanco con manchas azules y cascabel: la nota que más se repite
  { tex: 'owito_c', note: 'A4', col: 0xf3e6c0 }, // crema, con el abanico: la más aguda
  { tex: 'owito_v', note: 'E4', col: 0xb8a0d8 }, // lila
];
// La melodía es fija (luego se toca con el Otamatone en el muelle). who = qué Owito la canta.
// at: en qué tiempo (negras) entra cada nota, sacado del estribillo de «Popular» (compás 18 del MIDI): mismo ritmo, con
// sus tresillos («Pop-u-lar…» · silencio · «…you're gon-na be pop-u-lar»).
const AT = [0, 1, 1.67, 5, 5.67, 6.67, 7, 8, 9, 10, 11];
export const MELODY = ['C4', 'A3', 'C4', 'C4', 'C4', 'G4', 'E4', 'F4', 'F4', 'A4', 'C4']
  .map((note, i) => ({ note, at: AT[i], who: OWITOS.findIndex((o) => o.note === note) }));
export const PHRASES = [0, 4, 8]; // dónde empieza cada frase (el Otamatone avanza y reintenta por frases)
const FIRST = 3;   // se empieza repitiendo tres notas y se llega a las once
const X0 = 70, DX = 36, FEET = 128; // fila: posición del primero, separación y altura de los pies
// Por el escenario se mueven entre 7 huecos (siempre queda alguno libre); UP = cuánto más arriba quedan los pies del que
// se sube encima de otro.
const SLOTS = [58, 92, 126, 160, 194, 228, 262], UP = 26;

export class SimonScene extends Phaser.Scene {
  constructor() { super('simon'); }

  create() {
    this.cameras.main.setBackgroundColor('#14151a').fadeIn(250);
    UI.hud(false);
    Sound.music(null);

    // Escenario con guiños a Wicked: Ciudad Esmeralda al fondo, telones verde y rosa
    const g = this.add.graphics();
    g.fillStyle(0x0f3a2a).fillRect(0, 0, 320, 140);
    g.fillStyle(0x1f7a4c); for (const [x, w, h] of [[110, 14, 50], [126, 10, 70], [138, 18, 58], [158, 12, 84], [172, 16, 62], [190, 10, 46], [202, 14, 56]]) { g.fillRect(x, 120 - h, w, h); g.fillTriangle(x, 120 - h, x + w, 120 - h, x + w / 2, 110 - h); }
    g.fillStyle(0x7fe0a0); for (let i = 0; i < 16; i++) g.fillRect(114 + (i * 37) % 100, 60 + (i * 23) % 50, 1, 2);
    g.fillStyle(0x8a5a2a).fillRect(0, 120, 320, 60);
    g.fillStyle(0x6e4520); for (let y = 128; y < 180; y += 10) g.fillRect(0, y, 320, 1);
    g.fillStyle(0x2f8f5a).fillRect(0, 0, 44, 150); g.fillStyle(0x1f5a3a); for (let x = 6; x < 44; x += 10) g.fillRect(x, 0, 3, 150);
    g.fillStyle(0xf06aa8).fillRect(276, 0, 44, 150); g.fillStyle(0xc8407c); for (let x = 280; x < 320; x += 10) g.fillRect(x, 0, 3, 150);
    g.fillStyle(0xe8b820).fillRect(0, 0, 320, 6);
    g.fillStyle(0x1a1412).fillTriangle(58, 44, 74, 44, 66, 22).fillRect(54, 44, 24, 3);                // sombrero de bruja
    g.fillStyle(0xfbd0de, 0.85).fillCircle(254, 34, 9).fillStyle(0xffffff, 0.9).fillCircle(251, 31, 2);  // burbuja
    this.add.image(40, 172, 'tigrito_side_0').setOrigin(0.5, 1).setScale(2);

    // Foco del selector: un círculo de luz en el suelo y una flecha sobre la cabeza del Owito elegido
    this.spot = this.add.graphics();
    // Los Owitos no se están quietos (todos en el mismo plano, mismo tamaño): cada poco uno cambia de hueco, dos se
    // intercambian el sitio, uno se sube encima de otro o se baja de un salto. Despacio, pero hay que seguirles la pista.
    this.owitos = OWITOS.map((o, i) => this.add.image(SLOTS[i], FEET, o.tex + '_down_0').setOrigin(0.5, 1).setScale(2).setDepth(2));
    this.mov = OWITOS.map((o, i) => ({ slot: i, level: 0, x: SLOTS[i], y: FEET, trip: null, pop: 0 }));
    this.danceT = 0; this.dancing = false;
    this.marker = this.add.image(0, FEET - 42, 'arrow').setAngle(180).setDepth(3);
    this.cur = 3;

    this.n = FIRST; this.pos = 0; this.lock = true; this.leaving = false; this.won = false;
    this.bar();
    Input.clear();
    UI.say('Tigrito', [
      '¡Silencio en la sala! Ensayo general de «Owicked».',
      'Hoy ensayamos el número estrella. Cada Owito canta una nota. Y no se están quietos: es teatro moderno.',
      'Tú repite lo que canten: muévete con ← → hasta el Owito y pulsa el botón de acción para que cante. Empezamos con tres notas y la partitura tiene once. Si fallas, retrocedemos una.',
    ]).then(() => this.show());
  }

  bar() { UI.minibar(`Teatro Real · Ensayo: ${Math.min(this.n, MELODY.length)} de ${MELODY.length} notas`, { exit: () => this.exit() }); }
  exit() {
    if (UI.busy || this.leaving) return;
    this.leaving = true; UI.minibar(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.leaving && !this.won) this.win(); }

  flash(i, sing = true, len = 0.28) { // el Owito i canta su nota durante len segundos (sing = false: fallo, no suena)
    const spr = this.owitos[i], o = OWITOS[i];
    if (sing) Sound.seq([o.note], len, 'triangle', 0.22);
    spr.setTexture(o.tex + '_down_1');
    this.mov[i].pop = 1; // un saltito al cantar (lo suma update() a su altura, sin cambiar el tamaño)
    this.time.delayedCall(220, () => spr.setTexture(o.tex + '_down_0'));
  }

  // ---------------------------------------------------------- Coreografía
  goTo(i, slot, level) { // el Owito i va (andando o de un salto) al hueco slot, en el suelo (0) o encima de otro (1)
    const m = this.mov[i], toX = SLOTS[slot], toY = FEET - level * UP;
    const jump = level !== m.level;
    m.slot = slot; m.level = level;
    m.trip = { fx: m.x, fy: m.y, tx: toX, ty: toY, p: 0, dur: Math.max(jump ? 0.9 : 0.7, Math.abs(toX - m.x) / 38), arc: jump ? 18 : 0 };
  }
  dance() {
    const M = this.mov, onTop = (i) => M.some((q) => q.level === 1 && q.slot === M[i].slot); // lleva a alguien encima
    const free = (i) => !M[i].trip && !onTop(i);
    const empty = SLOTS.map((_, k) => k).filter((k) => !M.some((q) => q.slot === k));
    const ground = M.map((_, i) => i).filter((i) => M[i].level === 0 && free(i));
    const top = M.findIndex((q) => q.level === 1 && !q.trip);
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const acts = [];
    if (ground.length >= 2) acts.push('swap', 'swap');
    if (ground.length && empty.length) acts.push('walk');
    if (top >= 0 && empty.length) acts.push('down', 'down');
    if (top < 0 && ground.length >= 2) acts.push('climb');
    const act = pick(acts);
    if (act === 'swap') { // dos se intercambian el sitio, cruzándose
      const a = pick(ground), b = pick(ground.filter((i) => i !== a)), sa = M[a].slot;
      this.goTo(a, M[b].slot, 0); this.goTo(b, sa, 0);
    } else if (act === 'walk') this.goTo(pick(ground), pick(empty), 0);
    else if (act === 'down') this.goTo(top, pick(empty), 0);
    else if (act === 'climb') { const a = pick(ground), b = pick(ground.filter((i) => i !== a)); this.goTo(a, M[b].slot, 1); }
  }

  async show() {
    this.lock = true;
    this.dancing = true; // desde la primera ronda ya no se están quietos
    await new Promise((r) => this.time.delayedCall(500, r));
    // Cantan con el ritmo de la canción (no a golpes iguales); el pulso se acelera un poco a medida que la frase crece.
    // El silencio largo del medio se acorta para que el ensayo no se haga pesado.
    const beat = Math.max(360, 500 - (this.n - FIRST) * 14);
    for (let i = 0; i < this.n; i++) {
      if (this.leaving) return;
      const gap = i + 1 < MELODY.length ? Math.min(MELODY[i + 1].at - MELODY[i].at, 2) : 1;
      this.flash(MELODY[i].who, true, Math.min(gap, 1) * beat / 1000 * 0.85);
      await new Promise((r) => this.time.delayedCall(gap * beat, r));
    }
    this.pos = 0; this.lock = false;
    Input.clear();
  }

  async sing() {
    if (this.lock || UI.busy || this.leaving) return;
    if (this.cur !== MELODY[this.pos].who) {
      this.lock = true;
      Sound.sfx('bad'); this.flash(this.cur, false);
      this.cameras.main.shake(150, 0.004);
      this.n = Math.max(FIRST, this.n - 1);   // un fallo hace retroceder una nota
      this.bar();
      UI.toast('Tigrito: ¡NO, NO, NO! ¡Una nota menos y desde arriba!');
      await new Promise((r) => this.time.delayedCall(900, r));
      return this.show();
    }
    this.flash(this.cur);
    if (++this.pos < this.n) return;
    this.lock = true;
    await new Promise((r) => this.time.delayedCall(600, r));
    if (this.n >= MELODY.length) { await this.finale(); return this.win(); }
    this.n++;
    this.bar();
    this.show();
  }

  // Melodía completa: la cantan una última vez seguida, con el ritmo exacto de «Popular» (también el silencio largo)
  async finale() {
    this.dancing = false;
    await new Promise((r) => this.time.delayedCall(700, r));
    const beat = 60000 / 104; // el tempo del original
    for (let i = 0; i < MELODY.length; i++) {
      if (this.leaving) return;
      const gap = i + 1 < MELODY.length ? MELODY[i + 1].at - MELODY[i].at : 1.5;
      this.flash(MELODY[i].who, true, Math.min(gap, 1.2) * beat / 1000 * 0.9);
      await new Promise((r) => this.time.delayedCall(gap * beat, r));
    }
  }

  async win() {
    this.won = true; this.lock = true;
    UI.minibar(null);
    await SCRIPTS.simonDone();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time, delta) {
    const dt = Math.min(delta || 16, 50) / 1000;
    // Coreografía: un movimiento cada pocos segundos, algo más a menudo cuanto más larga es la frase
    if (this.dancing && !this.leaving && (this.danceT -= dt) <= 0) { this.danceT = Math.max(4.8, 9 - (this.n - FIRST) * 0.3) * (0.75 + Math.random() * 0.5); this.dance(); } // la mitad de movimientos que al principio
    this.mov.forEach((m, i) => {
      const t = m.trip;
      if (t) { // andando (con un leve bote) o saltando (en arco) hasta su destino
        t.p = Math.min(1, t.p + dt / t.dur);
        m.x = t.fx + (t.tx - t.fx) * t.p;
        m.y = t.fy + (t.ty - t.fy) * t.p - Math.sin(Math.PI * t.p) * t.arc - (t.arc ? 0 : Math.abs(Math.sin(t.p * Math.PI * 4)) * 3);
        if (t.p >= 1) m.trip = null;
      }
      m.pop = Math.max(0, m.pop - dt * 6);
      this.owitos[i].setPosition(Math.round(m.x), Math.round(m.y - Math.sin(m.pop * Math.PI) * 5)).setDepth(2 + m.level + (t && t.arc ? 1 : 0));
    });
    // El foco solo se ve cuando le toca al jugador, y sigue al Owito elegido
    const on = !this.lock && !UI.busy && !this.leaving, sel = this.owitos[this.cur];
    this.spot.clear();
    if (on) this.spot.fillStyle(0xffe066, 0.3).fillEllipse(sel.x, FEET - 1, 40, 10);
    this.marker.setVisible(on).setPosition(sel.x, sel.y - 36 + Math.round(Math.sin(time / 160) * 1.5)).setDepth(10);
    if (!on) { Input.clear(); return; }
    // ← →: al Owito de al lado según dónde estén ahora (pueden haberse cambiado de sitio)
    const order = this.mov.map((m, i) => i).sort((a, b) => this.mov[a].x - this.mov[b].x || this.mov[a].level - this.mov[b].level), k = order.indexOf(this.cur);
    if (Input.take('left')) this.cur = order[Math.max(0, k - 1)];
    if (Input.take('right')) this.cur = order[Math.min(OWITOS.length - 1, k + 1)];
    if (Input.take('a')) return this.sing();
    if (Input.take('b')) this.exit();
  }
}
