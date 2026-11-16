// Minijuego: la mudanza de Lolete (Sokoban).
import { State } from '../state.js';
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { LEVELS } from '../sokoban-levels.js';
import { SCRIPTS } from '../story.js';

const T = 16;
const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export class SokobanScene extends Phaser.Scene {
  constructor() { super('sokoban'); }

  create() {
    this.cameras.main.setBackgroundColor('#2b2320').fadeIn(250);
    UI.hud(false);
    Sound.music('lolete');
    this.idx = Math.min(State.d.sokoLevel, LEVELS.length - 1);
    this.loadLevel(true);
  }

  loadLevel(intro) {
    this.children.removeAll(true);
    this.tweens.killAll();
    const lv = LEVELS[this.idx], rows = lv.rows;
    const H = rows.length, W = Math.max(...rows.map((r) => r.length));
    this.wall = new Set(); this.goals = new Set(); this.boxes = []; this.hist = [];
    this.lock = false; this.nextMove = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = rows[y][x] || ' ';
      if (c === ' ' && !this.inside(rows, x, y)) continue;
      const k = x + ',' + y;
      this.add.image(x * T, y * T, c === '#' ? 'tile_K' : 'tile_k').setOrigin(0);
      if (c === '#' || c === 'L') this.wall.add(k);
      if (c === '.' || c === '*' || c === '+') { this.goals.add(k); this.add.image(x * T, y * T, 'target').setOrigin(0).setDepth(1); }
      if (c === '$' || c === '*') this.boxes.push({ x, y, spr: this.add.image(x * T, y * T, 'crate').setOrigin(0).setDepth(10 + y) });
      if (c === 'L') this.lolete = this.add.image(x * T + 8, y * T + 16, 'lolete_down_0').setOrigin(0.5, 1).setDepth(10 + y);
      if (c === '@' || c === '+') this.pl = { x, y, dir: 'down' };
    }
    this.pSpr = this.add.image(0, 0, 'colgadin_down_0').setOrigin(0.5, 1);
    this.cameras.main.setZoom(W * T <= 150 && H * T <= 84 ? 2 : 1).centerOn((W * T) / 2, (H * T) / 2 - 6);
    this.paint(true);
    UI.minibar(`Mudanza de Lolete · caja ${this.idx + 1} de ${LEVELS.length}`, {
      undo: () => this.undo(), reset: () => this.reset(), exit: () => this.exit(),
    });
    Input.clear();
    if (intro !== false) { this.lock = true; UI.say('Lolete', lv.hint).then(() => { this.lock = false; }); }
  }

  // Una celda vacía cuenta como suelo si está encerrada entre paredes en su fila
  inside(rows, x, y) {
    const r = rows[y];
    return r.slice(0, x).includes('#') && r.slice(x + 1).includes('#');
  }

  paint(snap) {
    const p = this.pl, side = p.dir === 'left' || p.dir === 'right';
    this.pSpr.setTexture(`colgadin_${side ? 'side' : p.dir}_0`).setFlipX(p.dir === 'left').setDepth(10 + p.y + 0.5);
    const to = (spr, x, y) => (snap ? spr.setPosition(x, y) : this.tweens.add({ targets: spr, x, y, duration: 90 }));
    to(this.pSpr, p.x * T + 8, p.y * T + 15);
    for (const b of this.boxes) {
      b.spr.setTexture(this.goals.has(b.x + ',' + b.y) ? 'crate_ok' : 'crate').setDepth(10 + b.y);
      to(b.spr, b.x * T, b.y * T);
    }
  }

  move(dir) {
    const [dx, dy] = VEC[dir], p = this.pl;
    p.dir = dir;
    const nx = p.x + dx, ny = p.y + dy;
    const box = this.boxes.find((b) => b.x === nx && b.y === ny);
    if (this.wall.has(nx + ',' + ny)) { this.paint(); return Sound.sfx('bump'); }
    if (box) {
      const bx = nx + dx, by = ny + dy;
      if (this.wall.has(bx + ',' + by) || this.boxes.some((b) => b.x === bx && b.y === by)) { this.paint(); return Sound.sfx('bump'); }
      box.x = bx; box.y = by;
      Sound.sfx('push');
    } else Sound.sfx('step');
    this.hist.push({ dx, dy, box });
    p.x = nx; p.y = ny;
    this.paint();
    if (this.boxes.every((b) => this.goals.has(b.x + ',' + b.y))) this.win();
  }

  debugWin() { if (!this.lock) { this.idx = LEVELS.length - 1; this.win(); } }

  undo() {
    if (this.lock || UI.busy) return;
    const h = this.hist.pop();
    if (!h) return;
    if (h.box) { h.box.x -= h.dx; h.box.y -= h.dy; }
    this.pl.x -= h.dx; this.pl.y -= h.dy;
    Sound.sfx('undo');
    this.paint();
  }
  reset() { if (!this.lock && !UI.busy) { Sound.sfx('undo'); this.loadLevel(false); } }
  exit() {
    if (this.lock || UI.busy) return;
    this.lock = true;
    UI.minibar(null);
    this.scene.start('world');
  }

  async win() {
    this.lock = true;
    Sound.sfx('get');
    await new Promise((r) => this.time.delayedCall(450, r));
    this.idx++;
    State.d.sokoLevel = this.idx; State.save();
    if (this.idx < LEVELS.length) {
      await UI.say('Lolete', ['¡Bien! ¡Ya veo un poco más de luz!', '¡Guau! ¡Sigue, sigue!'][this.idx - 1] || '¡Sigue!');
      this.loadLevel(true);
      return;
    }
    UI.minibar(null);
    await SCRIPTS.loleteRescued();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time) {
    if (this.lolete) this.lolete.setTexture(`lolete_down_${Math.floor(time / 300) % 2}`);
    if (this.lock || UI.busy) { Input.clear(); return; }
    if (Input.take('undo')) return this.undo();
    if (Input.take('reset')) return this.reset();
    if (Input.take('b')) return this.exit();
    const d = Input.dir();
    const dir = d.x < 0 ? 'left' : d.x > 0 ? 'right' : d.y < 0 ? 'up' : d.y > 0 ? 'down' : null;
    if (!dir) { this.nextMove = 0; return; }
    if (time < this.nextMove) return;
    this.nextMove = time + (this.nextMove ? 130 : 220);
    this.move(dir);
  }
}
