// Minijuego: ensayo en el Teatro Real (Simon). Los Owitos cantan una secuencia y hay que repetirla
// con las flechas. La secuencia crece nota a nota hasta completar la melodía que llama a Narwal.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

// La melodía es fija: es la que luego se toca con el Otamatone en el muelle
export const MELODY = ['up', 'right', 'down', 'left', 'up', 'up', 'right', 'down', 'left', 'left', 'up', 'right', 'down', 'up', 'left', 'right'];
const PADS = {
  up: { x: 160, y: 78, tex: 'owito_g', note: 'A5', ang: 0 },
  left: { x: 104, y: 106, tex: 'owito_k', note: 'C5', ang: -90 },
  right: { x: 216, y: 106, tex: 'owito_w', note: 'E5', ang: 90 },
  down: { x: 160, y: 136, tex: 'owito_v', note: 'G5', ang: 180 },
};
const FIRST = 5;   // se empieza repitiendo cinco notas y se llega a las dieciséis

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

    this.pads = {};
    for (const [dir, p] of Object.entries(PADS)) {
      const spr = this.add.image(p.x, p.y, p.tex + '_down_0').setOrigin(0.5, 1).setScale(2);
      this.add.image(p.x, p.y + 7, 'arrow').setAngle(p.ang);
      this.pads[dir] = spr;
    }

    this.n = FIRST; this.pos = 0; this.lock = true;
    this.bar();
    Input.clear();
    UI.say('Owito director', [
      '¡Silencio en la sala! Ensayo general de «MALOWITA: la historia jamás contada de los Owitos de Oz».',
      'Tigrito pone la música. Tú, repite lo que canten mis Owitos con las flechas. Empezamos con cinco notas y la partitura tiene dieciséis. Si fallas, retrocedemos una. ¡Y desafiando a la gravedad!',
    ]).then(() => this.show());
  }

  bar() { UI.minibar(`Teatro Real · Ensayo: ${Math.min(this.n, MELODY.length)} de ${MELODY.length} notas`, { exit: () => this.exit() }); }
  exit() {
    if (UI.busy || this.leaving) return;
    this.leaving = true; UI.minibar(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.leaving && !this.won) this.win(); }

  flash(dir, ok = true) {
    const spr = this.pads[dir], p = PADS[dir];
    if (ok) Sound.seq([p.note], 0.28, 'triangle', 0.22);
    spr.setTexture(p.tex + '_down_1');
    this.tweens.add({ targets: spr, scale: 2.6, duration: 110, yoyo: true, onComplete: () => spr.setTexture(p.tex + '_down_0').setScale(2) });
  }

  async show() {
    this.lock = true;
    await new Promise((r) => this.time.delayedCall(500, r));
    for (let i = 0; i < this.n; i++) {
      if (this.leaving) return;
      this.flash(MELODY[i]);
      await new Promise((r) => this.time.delayedCall(Math.max(250, 430 - (this.n - FIRST) * 16), r)); // cada vez más deprisa
    }
    this.pos = 0; this.lock = false;
    Input.clear();
  }

  async input_(dir) {
    if (this.lock || UI.busy || this.leaving) return;
    if (dir !== MELODY[this.pos]) {
      this.lock = true;
      Sound.sfx('bad'); this.flash(dir, false);
      this.cameras.main.shake(150, 0.004);
      this.n = Math.max(FIRST, this.n - 1);   // un fallo hace retroceder una nota
      this.bar();
      UI.toast('Owito director: ¡NO, NO, NO! ¡Una nota menos y desde arriba!');
      await new Promise((r) => this.time.delayedCall(900, r));
      return this.show();
    }
    this.flash(dir);
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

  update() {
    if (this.lock || UI.busy) { Input.clear(); return; }
    for (const d of ['up', 'down', 'left', 'right']) if (Input.take(d)) return this.input_(d);
    if (Input.take('b')) this.exit();
  }
}
