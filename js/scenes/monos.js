// Minijuego: el bosque de los monos (intercepción por turnos).
// Los monos se pasan a Tigrito siguiendo un patrón fijo. Cada vez que Colgadín se balancea a otra rama hay un pase.
// Hay que deducir el patrón y llegar a la rama del mono que recibe justo cuando le llega Tigrito.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { LEVELS, COLS, ROWS } from '../monos-levels.js';
import { SCRIPTS } from '../story.js';

const X0 = 60, Y0 = 44, DX = 40, DY = 34;
const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const PUSH = ['¡Uh uh! ¡Aquí no hay nada! ¡A la salida!', '¡Fuera de mi rama!', '¡Ah ah ah! ¡Frío, frío!', '¡Esta rama está ocupada! ¡Vuelta a empezar!'];
const AFTER = [
  ['¡LO TENGO! …¡Eh! ¡Otro mono me lo ha quitado de las manos!', 'Los monos se lo llevan más adentro del bosque, donde hay más ramas… y más monos.'],
  ['¡Tigrito! ¡Agárrate a mí! …¡Noooo, otra vez!', 'Han llamado a toda la familia. Ahora sí que va en serio.'],
];
const nx = (c) => X0 + c * DX, ny = (r) => Y0 + r * DY;

export class MonosScene extends Phaser.Scene {
  constructor() { super('monos'); }

  create() {
    this.cameras.main.setBackgroundColor('#1f4a2e').fadeIn(250);
    UI.hud(false);
    Sound.music('bosque');
    Sound.clip('monos', 0.35);
    this.idx = 0;
    this.loadLevel(true);
  }

  loadLevel(intro) {
    this.children.removeAll(true);
    this.tweens.killAll();
    const lv = this.lv = LEVELS[this.idx];
    this.t = 0; this.passes = []; this.lock = false; this.nextMove = 0;

    // Fondo: troncos, copas y lianas entre ramas
    const g = this.add.graphics();
    g.fillStyle(0x173a23).fillRect(0, 0, 320, 180);
    g.fillStyle(0x2a5f3a); for (let i = 0; i < 9; i++) g.fillEllipse(20 + i * 38, 8 + (i % 3) * 5, 64, 34);
    g.fillStyle(0x4a321c); for (const x of [16, 300]) g.fillRect(x - 6, 0, 12, 180);
    g.fillStyle(0x0f2a18).fillRect(0, 170, 320, 10);
    g.lineStyle(1, 0x3f7f4f, 1);
    for (let r = 0; r < ROWS; r++) g.lineBetween(nx(0), ny(r), nx(COLS - 1), ny(r));
    for (let c = 0; c < COLS; c++) g.lineBetween(nx(c), ny(0), nx(c), ny(ROWS - 1));
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.add.image(nx(c), ny(r), 'knot');

    // Monos (encima de su rama) con su letra
    this.monos = lv.monos.map(([c, r], i) => {
      const spr = this.add.image(nx(c), ny(r) + 1, 'mono_down_0').setOrigin(0.5, 1).setDepth(5);
      return { c, r, spr };
    });
    const h = this.monos[lv.seq[0]];
    this.tig = this.add.image(h.spr.x, h.spr.y - 15, 'tigrito_down_0').setOrigin(0.5, 1).setDepth(7);

    // Colgadín cuelga por debajo de la rama
    this.pl = { c: lv.start[0], r: lv.start[1] };
    this.cord = this.add.graphics().setDepth(3);
    this.col = this.add.image(nx(this.pl.c), ny(this.pl.r) + 5, 'colgadin_down_0').setOrigin(0.5, 0).setDepth(4);

    this.bar();
    Input.clear();
    if (intro && this.idx === 0) {
      this.lock = true;
      UI.say('Colgadín', [
        '¡Ahí está Tigrito! Los monos se lo van pasando de rama en rama.',
        'Cada vez que me balanceo a otra rama, ellos hacen un pase. Siempre en el mismo orden.',
        'Si llego a la rama de un mono justo cuando le llega Tigrito… ¡lo atrapo!',
        'Pero si me cuelo en la rama de un mono con las manos vacías, me manda de un empujón al principio.',
      ]).then(() => { this.lock = false; });
    }
  }

  bar() {
    UI.minibar(`Bosque de los monos · ${this.idx + 1}/${LEVELS.length} · Pases: ${this.passes.length}`, {
      reset: () => { if (!this.lock && !UI.busy) { Sound.sfx('undo'); this.loadLevel(false); } },
      exit: () => this.exit(),
    });
  }
  exit() {
    if (this.lock || UI.busy) return;
    this.lock = true;
    UI.minibar(null);
    this.scene.start('world');
  }

  debugWin() { if (!this.lock) { this.idx = LEVELS.length - 1; this.lock = true; this.caught(); } }

  monoAt(c, r) { return this.monos.findIndex((m) => m.c === c && m.r === r); }

  async move(dir) {
    const [dc, dr] = VEC[dir], lv = this.lv, p = this.pl;
    const c = p.c + dc, r = p.r + dr;
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return Sound.sfx('bump');
    this.lock = true;

    // Pase de Tigrito al siguiente mono del patrón
    this.t++;
    const to = lv.seq[this.t % lv.seq.length], m = this.monos[to];
    this.passes.push(to);
    this.bar();
    Sound.sfx('step');
    const sx = this.tig.x, sy = this.tig.y, ex = m.spr.x, ey = m.spr.y - 15;
    this.tweens.addCounter({
      from: 0, to: 1, duration: 260,
      onUpdate: (tw) => { const k = tw.getValue(); this.tig.setPosition(sx + (ex - sx) * k, sy + (ey - sy) * k - Math.sin(k * Math.PI) * 22).setAngle(k * 360); },
    });
    // Balanceo de Colgadín
    const swing = (tc, tr) => new Promise((res) => this.tweens.add({ targets: this.col, x: nx(tc), y: ny(tr) + 5, duration: 240, ease: 'Sine.inOut', onComplete: res }));
    await swing(c, r);
    this.tig.setAngle(0);

    const hit = this.monoAt(c, r);
    if (hit === to) return this.caught();
    if (hit >= 0) { // rama ocupada por un mono sin Tigrito: empujón hasta la rama de salida
      Sound.sfx('bad');
      UI.toast(PUSH[Math.floor(Math.random() * PUSH.length)]);
      this.monos[hit].spr.setTexture('mono_down_1');
      p.c = lv.start[0]; p.r = lv.start[1];
      await swing(p.c, p.r);
      this.monos[hit].spr.setTexture('mono_down_0');
    } else { p.c = c; p.r = r; }
    this.lock = false;
  }

  async caught() {
    Sound.sfx('get');
    this.tweens.add({ targets: this.tig, y: this.col.y + 10, duration: 200 });
    this.cameras.main.flash(200, 255, 240, 160);
    await new Promise((r) => this.time.delayedCall(600, r));
    this.idx++;
    if (this.idx < LEVELS.length) {
      Sound.clip('monos', 0.35);
      await UI.say('Colgadín', AFTER[this.idx - 1]);
      this.loadLevel(false);
      return;
    }
    UI.minibar(null);
    await SCRIPTS.tigritoRescued();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time) {
    const f = Math.floor(time / 300) % 2;
    this.monos.forEach((m, i) => { if (!this.lock) m.spr.setTexture(`mono_down_${(f + i) % 2}`); });
    this.cord.clear().fillStyle(0x231a14).fillRect(Math.round(this.col.x) - 1, this.col.y - 5, 2, 6);
    if (this.lock || UI.busy) { Input.clear(); return; }
    if (Input.take('reset')) { Sound.sfx('undo'); return this.loadLevel(false); }
    if (Input.take('b')) return this.exit();
    const d = Input.dir();
    const dir = d.x < 0 ? 'left' : d.x > 0 ? 'right' : d.y < 0 ? 'up' : d.y > 0 ? 'down' : null;
    if (!dir) { this.nextMove = 0; return; }
    if (time < this.nextMove) return;
    this.nextMove = time + 330;
    this.move(dir);
  }
}
