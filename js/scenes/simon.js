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
export const MELODY = ['C4', 'A3', 'C4', 'C4', 'C4', 'G4', 'E4', 'F4', 'F4', 'A4', 'C4']
  .map((note) => ({ note, who: OWITOS.findIndex((o) => o.note === note) }));
export const PHRASES = [0, 4, 8]; // dónde empieza cada frase (el Otamatone avanza y reintenta por frases)
const FIRST = 3;   // se empieza repitiendo tres notas y se llega a las once
const X0 = 70, DX = 36, FEET = 128; // fila: posición del primero, separación y altura de los pies

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
    this.owitos = OWITOS.map((o, i) => this.add.image(X0 + i * DX, FEET, o.tex + '_down_0').setOrigin(0.5, 1).setScale(2).setDepth(2));
    this.marker = this.add.image(0, FEET - 42, 'arrow').setAngle(180).setDepth(3);
    this.cur = 3;

    this.n = FIRST; this.pos = 0; this.lock = true; this.leaving = false; this.won = false;
    this.bar();
    Input.clear();
    UI.say('Owito director', [
      '¡Silencio en la sala! Ensayo general de «MALOWITA: la historia jamás contada de los Owitos de Oz».',
      'Hoy ensayamos el número estrella. Mis seis Owitos cantan cada uno una nota, y los he puesto en fila a mi manera: nada de grave a agudo.',
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

  flash(i, sing = true) { // el Owito i canta su nota (sing = false: fallo, no suena)
    const spr = this.owitos[i], o = OWITOS[i];
    if (sing) Sound.seq([o.note], 0.28, 'triangle', 0.22);
    spr.setTexture(o.tex + '_down_1');
    this.tweens.add({ targets: spr, scale: 2.6, duration: 110, yoyo: true, onComplete: () => spr.setTexture(o.tex + '_down_0').setScale(2) });
  }

  async show() {
    this.lock = true;
    await new Promise((r) => this.time.delayedCall(500, r));
    for (let i = 0; i < this.n; i++) {
      if (this.leaving) return;
      this.flash(MELODY[i].who);
      await new Promise((r) => this.time.delayedCall(Math.max(300, 520 - (this.n - FIRST) * 22), r)); // cada vez más deprisa
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
      UI.toast('Owito director: ¡NO, NO, NO! ¡Una nota menos y desde arriba!');
      await new Promise((r) => this.time.delayedCall(900, r));
      return this.show();
    }
    this.flash(this.cur);
    if (++this.pos < this.n) return;
    this.lock = true;
    await new Promise((r) => this.time.delayedCall(600, r));
    if (this.n >= MELODY.length) return this.win();
    this.n++;
    this.bar();
    this.show();
  }

  async win() {
    this.won = true; this.lock = true;
    UI.minibar(null);
    await SCRIPTS.simonDone();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time) {
    // El foco solo se ve cuando le toca al jugador
    const on = !this.lock && !UI.busy && !this.leaving, x = X0 + this.cur * DX;
    this.spot.clear();
    if (on) this.spot.fillStyle(0xffe066, 0.3).fillEllipse(x, FEET - 1, 40, 10);
    this.marker.setVisible(on).setPosition(x, FEET - 42 + Math.round(Math.sin(time / 160) * 1.5));
    if (!on) { Input.clear(); return; }
    if (Input.take('left')) this.cur = Math.max(0, this.cur - 1);
    if (Input.take('right')) this.cur = Math.min(OWITOS.length - 1, this.cur + 1);
    if (Input.take('a')) return this.sing();
    if (Input.take('b')) this.exit();
  }
}
