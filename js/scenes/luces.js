// Minijuego: las luces de la Casa de la Navidad (tipo «train tracks»).
// Hay que tender un único cable del enchufe a la estrella. Los números indican cuántas casillas de cada
// fila y columna llevan cable.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

// `path`: una solución (de enchufe a estrella); de ella salen los números. `fixed`: casillas ya puestas.
export const PUZZLES = [
  { n: 5, path: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]], fixed: [[2, 1], [1, 4]] },
  { n: 6, path: [[0, 5], [0, 4], [1, 4], [2, 4], [2, 3], [2, 2], [1, 2], [0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [4, 2], [5, 2], [5, 3], [5, 4], [5, 5]], fixed: [[2, 3], [3, 0], [5, 3]] },
];
const C = 20, COLORS = [0xffe066, 0xe2574c, 0x3f8fd8, 0x82cc6a, 0xf7a8c0];
const key = (x, y) => x + ',' + y;

// ¿Las casillas marcadas forman un único cable válido? (también lo usa la prueba automática)
export function solved(pz, on) {
  const n = pz.n, A = pz.path[0], B = pz.path[pz.path.length - 1];
  for (let i = 0; i < n; i++) {
    let r = 0, c = 0;
    for (let j = 0; j < n; j++) { if (on.has(key(j, i))) r++; if (on.has(key(i, j))) c++; }
    if (r !== pz.path.filter((p) => p[1] === i).length || c !== pz.path.filter((p) => p[0] === i).length) return false;
  }
  const deg = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => on.has(key(x + dx, y + dy))).length;
  for (const k of on) {
    const [x, y] = k.split(',').map(Number), end = (x === A[0] && y === A[1]) || (x === B[0] && y === B[1]);
    if (deg(x, y) !== (end ? 1 : 2)) return false;
  }
  const seen = new Set([key(...A)]), q = [A];
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = key(x + dx, y + dy); if (on.has(k) && !seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } } }
  return seen.size === on.size;
}

export class LucesScene extends Phaser.Scene {
  constructor() { super('luces'); }

  create() {
    this.cameras.main.setBackgroundColor('#1f3a2e').fadeIn(250);
    UI.hud(false);
    Sound.music('navidad');
    this.idx = 0; this.lit = false;
    this.g = this.add.graphics();
    this.texts = [];
    this.loadPuzzle();
    this.lock = true;
    UI.say('Owito de Navidad', [
      'Las luces van del enchufe (el cuadrado blanco) a la estrella en un solo cable, sin ramas ni cruces.',
      'Los números dicen cuántas casillas de cada fila y de cada columna llevan cable. Muévete con las flechas y pon o quita cable con el botón de acción.',
    ]).then(() => { this.lock = false; });
  }

  loadPuzzle() {
    const pz = this.pz = PUZZLES[this.idx], n = pz.n;
    this.ox = Math.round((320 - n * C) / 2) + 6; this.oy = Math.round((180 - n * C) / 2) + 12;
    this.A = pz.path[0]; this.B = pz.path[pz.path.length - 1];
    this.fixed = new Set([key(...this.A), key(...this.B), ...pz.fixed.map((p) => key(...p))]);
    this.on = new Set(this.fixed);
    this.cur = { x: this.A[0], y: this.A[1] };
    this.rows = Array.from({ length: n }, (_, i) => pz.path.filter((p) => p[1] === i).length);
    this.cols = Array.from({ length: n }, (_, i) => pz.path.filter((p) => p[0] === i).length);
    this.texts.forEach((t) => t.destroy());
    const st = { fontFamily: 'Pixelify', fontSize: '16px', color: '#ffffff' };
    this.tRow = this.rows.map((v, i) => this.add.text(this.ox - 10, this.oy + i * C + C / 2, v, st).setOrigin(0.5));
    this.tCol = this.cols.map((v, i) => this.add.text(this.ox + i * C + C / 2, this.oy - 9, v, st).setOrigin(0.5));
    this.texts = [...this.tRow, ...this.tCol];
    this.nextMove = 0;
    UI.minibar(`Casa de la Navidad · Luces ${this.idx + 1}/${PUZZLES.length}`, { reset: () => { if (!this.lock && !UI.busy) { Sound.sfx('undo'); this.loadPuzzle(); } }, exit: () => this.exit() });
  }
  exit() {
    if (this.lock || UI.busy) return;
    this.lock = true; UI.minibar(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.lock) { this.idx = PUZZLES.length - 1; this.on = new Set(this.pz.path.map((p) => key(...p))); this.pz = PUZZLES[this.idx]; this.win(); } }

  toggle() {
    const k = key(this.cur.x, this.cur.y);
    if (this.fixed.has(k)) return Sound.sfx('bump');
    if (this.on.has(k)) this.on.delete(k); else this.on.add(k);
    Sound.sfx('step');
    if (solved(this.pz, this.on)) this.win();
  }

  async win() {
    this.lock = true; this.lit = true;
    Sound.sfx('get');
    await new Promise((r) => this.time.delayedCall(1300, r));
    this.lit = false;
    if (++this.idx < PUZZLES.length) {
      await UI.say('Owito de Navidad', '¡Se han encendido! Ahora la guirnalda grande, la del árbol.');
      this.loadPuzzle();
      this.lock = false;
      return;
    }
    UI.minibar(null);
    await SCRIPTS.lucesDone();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time) {
    if (!this.lock && !UI.busy) {
      if (Input.take('a')) this.toggle();
      if (Input.take('reset')) { Sound.sfx('undo'); this.loadPuzzle(); }
      if (Input.take('b')) this.exit();
      const d = Input.dir(), n = this.pz.n;
      if (!d.x && !d.y) this.nextMove = 0;
      else if (time >= this.nextMove) {
        this.nextMove = time + 150;
        this.cur.x = Phaser.Math.Clamp(this.cur.x + d.x, 0, n - 1);
        this.cur.y = Phaser.Math.Clamp(this.cur.y + (d.x ? 0 : d.y), 0, n - 1);
      }
    } else Input.clear();

    // Dibujo
    const g = this.g.clear(), { ox, oy } = this, n = this.pz.n, on = this.on;
    const cx = (x) => ox + x * C + C / 2, cy = (y) => oy + y * C + C / 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle(this.fixed.has(key(x, y)) ? 0x2a5a44 : 0x26483a).fillRect(ox + x * C + 1, oy + y * C + 1, C - 2, C - 2);
    }
    g.lineStyle(2, 0x1a1412, 1);
    for (const k of on) {
      const [x, y] = k.split(',').map(Number);
      if (on.has(key(x + 1, y))) g.lineBetween(cx(x), cy(y), cx(x + 1), cy(y));
      if (on.has(key(x, y + 1))) g.lineBetween(cx(x), cy(y), cx(x), cy(y + 1));
    }
    let i = 0;
    for (const k of on) {
      const [x, y] = k.split(',').map(Number);
      const blink = this.lit ? (Math.floor(time / 120) + i) % 2 === 0 : true;
      g.fillStyle(blink ? COLORS[(i + (this.lit ? Math.floor(time / 240) : 0)) % COLORS.length] : 0x555555).fillCircle(cx(x), cy(y), 4);
      g.fillStyle(0xffffff, 0.7).fillRect(cx(x) - 2, cy(y) - 2, 1, 1);
      i++;
    }
    // Enchufe y estrella
    g.fillStyle(0xf4f4ee).fillRect(cx(this.A[0]) - 5, cy(this.A[1]) - 5, 10, 10).fillStyle(0x1a1412).fillRect(cx(this.A[0]) - 3, cy(this.A[1]) - 2, 2, 3).fillRect(cx(this.A[0]) + 1, cy(this.A[1]) - 2, 2, 3);
    const sx = cx(this.B[0]), sy = cy(this.B[1]);
    g.fillStyle(0xffe066).fillTriangle(sx, sy - 7, sx - 6, sy + 5, sx + 6, sy + 5).fillTriangle(sx, sy + 8, sx - 6, sy - 3, sx + 6, sy - 3);
    g.lineStyle(2, 0xffffff, 0.6 + 0.4 * Math.sin(time / 150)).strokeRect(ox + this.cur.x * C, oy + this.cur.y * C, C, C);
    // Números: verde si cuadran, rojo si sobran
    const col = (have, want) => (have === want ? '#82cc6a' : have > want ? '#e2574c' : '#ffffff');
    this.tRow.forEach((t, r) => t.setColor(col([...on].filter((k) => +k.split(',')[1] === r).length, this.rows[r])));
    this.tCol.forEach((t, c) => t.setColor(col([...on].filter((k) => +k.split(',')[0] === c).length, this.cols[c])));
  }
}
