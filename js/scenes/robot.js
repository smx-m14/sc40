// Minijuego: hackear la puerta de TEDI desde dentro del conducto (lo plantea Ovejoncio).
// En el conducto está el robot de mantenimiento de la máquina clonadora (con morro de cerdito, como los clones).
// Colgadín lo reprograma con bloques para llevarlo hasta los interruptores de la puerta y pulsarlos todos:
// avanzar, girar a la izquierda o a la derecha, pulsar, «repetir» (×2, ×3, ×4: repite el bloque que va justo
// detrás) y F1, una función propia que se llama desde el programa principal.
// Los huecos son pocos, así que hay que usar repeticiones y la función. Si el robot choca con una pared, pulsa
// donde no hay interruptor (salta la alarma) o el programa acaba sin pulsarlos todos, vuelve al principio.
// Controles: ← → eligen bloque o botón de la paleta; acción lo añade al programa marcado; ↑ ↓ (o «Editar F1» en la
// barra de arriba, o tocar el programa) cambian entre el principal y F1; BORRAR vacía el programa marcado y tocar
// un bloque del programa lo quita. Cuatro cerraduras; el progreso se guarda (flags.hackLevel).
// OJO: no llamar «load», «add», «time»… a los métodos: Phaser ya usa esos nombres en la escena.
// Los textos se dibujan con una fuente de píxeles propia (GLYPHS) para que se lean nítidos al escalar.
import { State } from '../state.js';
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

// Mapas del conducto: # pared · . suelo · P interruptor · R robot (sobre suelo) · r robot sobre un interruptor.
// dir: hacia dónde mira el robot al empezar (0 este, 1 sur, 2 oeste, 3 norte). main/f1: huecos de cada programa.
export const LEVELS = [
  { dir: 0, main: 5, f1: 0, map: ['#########', '#R.....P#', '#########'],
    tip: 'Primera cerradura: seis pasos hasta el interruptor y pulsar… pero solo hay cinco huecos. Los bloques ×2, ×3 y ×4 repiten el bloque que pongas justo detrás.' },
  { dir: 0, main: 4, f1: 4, map: ['#######', '#R.####', '##..###', '###..##', '####.P#', '#######'],
    tip: 'Segunda: una escalera. Todos los escalones son iguales: guarda uno en F1 y, en el programa principal, pon F1 tantas veces como haga falta. Un ×3 delante de F1 también vale.' },
  { dir: 0, main: 3, f1: 4, map: ['######', '#r..P#', '#.##.#', '#.##.#', '#P..P#', '######'],
    tip: 'Tercera: cuatro interruptores, uno en cada esquina, y el robot empieza encima de uno. Ojo: si pulsa donde no hay interruptor, salta la alarma.' },
  // Dos pasillos de seis con un interruptor al final de cada uno. No hay ×6… pero los repetir se encadenan
  // (×2 ×3 = seis veces), y hace falta para que quepa. Solución: F1 = ×2 ×3 avanzar pulsar · principal = F1 der ×2 avanzar der F1
  { dir: 0, main: 6, f1: 4, map: ['#########', '#R.....P#', '#######.#', '#P......#', '#########'],
    tip: 'La última, la más retorcida: dos pasillos de seis pasos, un interruptor al final de cada uno… y no existe el ×6. Piensa qué pasa si pones un repetir justo detrás de otro.' },
];
const BLOCKS = ['F', 'L', 'R', 'P', 'x2', 'x3', 'x4', 'F1'];
const COL = { F: 0x4a90d8, L: 0x3f8f6b, R: 0x3f8f6b, P: 0xe2574c, x2: 0xe8a820, x3: 0xe8a820, x4: 0xe8a820, F1: 0x8a5fc0 };
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
const T = 16, SLOT = 16, PAL_Y = 140, MAIN_Y = 40, F1_Y = 82, PX0 = 172; // medidas de la pantalla
const BTN_X = 224, RUN_Y = PAL_Y - 2, CLR_Y = PAL_Y + 19, BTN_W = 76, BTN_H = 18;
const STEP_MS = 230, MAX_OPS = 400;
const INK = 0x1a1412, PAPER = 0xfff6dc, GOLD = 0xffe066;

// Fuente de píxeles (5 de alto, ancho variable): solo las letras que se usan
const GLYPHS = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'], I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'], L: ['#..', '#..', '#..', '#..', '###'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
  4: ['#.#', '#.#', '###', '..#', '..#'], '×': ['...', '#.#', '.#.', '#.#', '...'], ' ': ['..', '..', '..', '..', '..'],
};
const textW = (s, k) => [...s].reduce((w, c) => w + (GLYPHS[c][0].length + 1) * k, -k);
// Escribe s con la fuente de píxeles; (x, y) = esquina superior izquierda, o el centro si center
function pixText(g, s, x, y, k, color, center = false) {
  if (center) { x -= textW(s, k) / 2; y -= 5 * k / 2; }
  x = Math.round(x); y = Math.round(y);
  g.fillStyle(color);
  for (const c of s) {
    const gl = GLYPHS[c];
    gl.forEach((row, j) => [...row].forEach((on, i) => { if (on === '#') g.fillRect(x + i * k, y + j * k, k, k); }));
    x += (gl[0].length + 1) * k;
  }
}

// Convierte un programa en la lista de acciones simples. «×N» multiplica al bloque siguiente (se pueden encadenar)
// y F1 ejecuta la función; F1 dentro de F1 se permite, pero con un tope para que no sea infinito.
export function expand(list, f1, out = [], depth = 0) {
  for (let i = 0; i < list.length && out.length <= MAX_OPS; i++) {
    let b = list[i], n = 1;
    while (b && /^x\d$/.test(b)) { n *= +b[1]; b = list[++i]; }
    if (!b) break; // un «repetir» al final, sin nada detrás, no hace nada
    for (let k = 0; k < n && out.length <= MAX_OPS; k++) {
      if (b === 'F1') { if (depth < 6) expand(f1, f1, out, depth + 1); } else out.push(b);
    }
  }
  return out;
}

export class RobotScene extends Phaser.Scene {
  constructor() { super('robot'); }

  create() {
    this.cameras.main.setBackgroundColor('#1c2230').fadeIn(250);
    UI.hud(false);
    Sound.music('tedi');
    this.lv = Math.min(State.d.flags.hackLevel || 0, LEVELS.length - 1);
    this.g = this.add.graphics();
    this.fx = this.add.graphics().setDepth(5);
    this.input.on('pointerdown', (p) => this.click(p.worldX, p.worldY));
    this.leaving = false; this.done = false;
    this.loadLevel(true);
  }

  // ---------- Nivel
  async loadLevel(first) {
    const L = LEVELS[this.lv];
    this.map = L.map.map((r) => r.split(''));
    this.rows = this.map.length; this.cols = this.map[0].length;
    this.gx = Math.round(84 - this.cols * T / 2); this.gy = Math.round(84 - this.rows * T / 2);
    this.prog = { main: [], f1: [] };
    this.edit = 'main'; this.cur = 0;
    this.reset();
    this.bar();
    this.lock = true;
    const say = first && this.lv === 0 ? [
      'Beee… ¿me oyes? Te veo por la cámara del conducto. Ese cacharro con morro de cerdito es el robot de mantenimiento de la máquina clonadora.',
      'Los clones lo programan para que recorra los conductos arreglando cables. Pues lo vamos a reprogramar nosotros: que vaya hasta los interruptores de la puerta y los pulse.',
      'Abajo tienes los bloques: avanzar, girar a la izquierda, girar a la derecha, pulsar, repetir y F1. Con ← → eliges uno y con el botón de acción lo añades al programa marcado.',
      'Cuando haya F1, con ↑ y ↓ (o con «Editar F1», arriba) cambias de programa. BORRAR vacía el programa marcado, y si tocas un bloque del programa, se quita.',
      'Cuando lo tengas, EJECUTAR. Si se equivoca, vuelve a su sitio y lo arreglas.',
      L.tip,
    ] : [L.tip];
    await UI.say('Ovejoncio', say);
    Input.clear();
    this.lock = false;
  }
  bar() {
    const L = LEVELS[this.lv], on = { exit: () => this.exit(), labels: {} };
    if (L.f1) { on.reset = () => this.toggle(); on.labels.reset = this.edit === 'main' ? 'Editar F1' : 'Editar principal'; }
    UI.minibar(`TEDI · Conducto · Cerradura ${this.lv + 1} de ${LEVELS.length}`, on);
  }
  reset() { // robot e interruptores como al principio
    this.panels = new Map();
    this.map.forEach((r, y) => r.forEach((c, x) => {
      if (c === 'R' || c === 'r') this.bot = { x, y, dir: LEVELS[this.lv].dir };
      if (c === 'P' || c === 'r') this.panels.set(`${x},${y}`, false);
    }));
    this.shown = { ...this.bot }; this.running = false; this.ops = null; this.flash = null;
  }
  wall(x, y) { return y < 0 || y >= this.rows || x < 0 || x >= this.cols || this.map[y][x] === '#'; }

  // ---------- Edición
  canEdit() { return !this.lock && !UI.busy && !this.leaving && !this.running; }
  setEdit(k) {
    if (k === 'f1' && !LEVELS[this.lv].f1) return;
    if (this.edit !== k) { this.edit = k; Sound.seq(['C5'], 0.04, 'square', 0.05); this.bar(); }
  }
  toggle() { if (this.canEdit()) this.setEdit(this.edit === 'main' ? 'f1' : 'main'); }
  addBlock(b) {
    const k = this.edit, max = LEVELS[this.lv][k];
    if (b === 'F1' && !LEVELS[this.lv].f1) return UI.toast('En esta cerradura no hay F1: arréglatelas con el programa principal.');
    if (this.prog[k].length >= max) { Sound.sfx('bad'); return UI.toast(`No caben más bloques en ${k === 'main' ? 'el programa principal' : 'F1'} (${max} huecos).`); }
    this.prog[k].push(b); Sound.sfx('step');
  }
  remove(k, i) { if (this.prog[k][i] !== undefined) { this.prog[k].splice(i, 1); Sound.sfx('undo'); } }
  press() { // botón de acción sobre la paleta
    if (this.cur < BLOCKS.length) return this.addBlock(BLOCKS[this.cur]);
    return this.cur === BLOCKS.length ? this.run() : this.clear();
  }
  clear() { this.prog[this.edit] = []; Sound.sfx('undo'); }
  click(x, y) {
    if (this.lock || UI.busy || this.leaving) return;
    const inBox = (bx, by, w, h) => x >= bx && x < bx + w && y >= by && y < by + h;
    if (this.running) { // mientras se ejecuta, el botón sirve para parar
      if (inBox(BTN_X, RUN_Y, BTN_W, BTN_H)) this.stop();
      return;
    }
    for (const [k, sy] of [['main', MAIN_Y], ['f1', F1_Y]]) {
      const n = LEVELS[this.lv][k];
      if (!n || !inBox(PX0 - 6, sy - 20, 146, SLOT + 26)) continue;
      this.setEdit(k); // tocar la zona de un programa lo marca; tocar un bloque suyo lo quita
      for (let i = 0; i < n; i++) if (inBox(this.slotX(i), sy, SLOT, SLOT)) this.remove(k, i);
      return;
    }
    for (let i = 0; i < BLOCKS.length; i++) if (inBox(this.palX(i), PAL_Y, SLOT, SLOT)) { this.cur = i; return this.addBlock(BLOCKS[i]); }
    if (inBox(BTN_X, RUN_Y, BTN_W, BTN_H)) { this.cur = BLOCKS.length; return this.run(); }
    if (inBox(BTN_X, CLR_Y, BTN_W, BTN_H)) { this.cur = BLOCKS.length + 1; return this.clear(); }
  }

  // ---------- Ejecución
  run() {
    if (this.running) return;
    if (!this.prog.main.length) { Sound.sfx('bad'); return UI.toast('El programa principal está vacío: el robot no sabe qué hacer.'); }
    this.reset();
    this.ops = expand(this.prog.main, this.prog.f1);
    this.pc = 0; this.running = true; this.next = this.time.now + 300;
  }
  stop() { this.running = false; this.reset(); UI.toast('Ejecución detenida.'); }
  stepOp() {
    const op = this.ops[this.pc++], b = this.bot;
    this.flash = { op, t: this.time.now };
    if (op === 'F') {
      const nx = b.x + DX[b.dir], ny = b.y + DY[b.dir];
      if (this.wall(nx, ny)) return this.fail('¡BONK! El robot se ha dado contra la pared del conducto.');
      b.x = nx; b.y = ny; Sound.sfx('step');
    } else if (op === 'L') { b.dir = (b.dir + 3) % 4; Sound.seq(['E5'], 0.04, 'square', 0.05); }
    else if (op === 'R') { b.dir = (b.dir + 1) % 4; Sound.seq(['G5'], 0.04, 'square', 0.05); }
    else if (op === 'P') {
      const key = `${b.x},${b.y}`;
      if (!this.panels.has(key)) return this.fail('¡¡ALARMA!! El robot ha pulsado donde no había ningún interruptor.');
      this.panels.set(key, true); Sound.sfx('ok');
      if ([...this.panels.values()].every(Boolean)) return this.success();
    }
    if (this.pc >= this.ops.length) {
      if (this.ops.length > MAX_OPS) return this.fail('El robot se ha quedado dando vueltas sin parar. Algo se repite demasiado.');
      const left = [...this.panels.values()].filter((v) => !v).length;
      this.fail(`El programa se ha acabado y ${left === 1 ? 'falta un interruptor' : `faltan ${left} interruptores`} por pulsar.`);
    }
  }
  async fail(msg) {
    this.running = false; this.lock = true;
    Sound.sfx('bad');
    this.cameras.main.shake(140, 0.004);
    UI.toast(msg);
    await new Promise((r) => this.time.delayedCall(1100, r));
    if (this.leaving) return;
    this.reset();
    this.lock = false; Input.clear();
  }
  async success() {
    this.running = false; this.lock = true;
    Sound.sfx('get');
    await new Promise((r) => this.time.delayedCall(900, r));
    if (this.leaving) return;
    this.lv++;
    State.d.flags.hackLevel = this.lv; State.save();
    if (this.lv >= LEVELS.length) return this.win();
    await UI.say('Ovejoncio', '¡Beee! ¡CLIC! Una cerradura menos. Siguiente tramo del conducto.');
    this.loadLevel(false);
  }
  async win() {
    this.done = true; this.lock = true;
    State.d.flags.hackLevel = 0; State.save();
    UI.minibar(null);
    await SCRIPTS.tediHackDone();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }
  exit() {
    if (UI.busy || this.leaving || this.done) return;
    this.leaving = true; this.lock = true; UI.minibar(null);
    State.d.flags.hackLevel = this.lv; State.save(); // al volver se sigue en esta cerradura
    this.scene.start('world');
  }
  debugWin() { if (!this.done && !this.leaving) { this.lv = LEVELS.length; this.win(); } }

  // ---------- Dibujo
  palX(i) { return 12 + i * 24; }
  slotX(i) { return PX0 + i * 22; }
  block(g, b, x, y, dim = false) {
    g.fillStyle(INK).fillRect(x - 1, y - 1, SLOT + 2, SLOT + 2).fillStyle(COL[b], dim ? 0.4 : 1).fillRect(x, y, SLOT, SLOT);
    if (b === 'F') g.fillStyle(PAPER).fillTriangle(x + 8, y + 2, x + 3, y + 8, x + 13, y + 8).fillRect(x + 7, y + 8, 2, 6);
    else if (b === 'L') g.fillStyle(PAPER).fillRect(x + 10, y + 7, 2, 7).fillRect(x + 6, y + 6, 6, 2).fillTriangle(x + 2, y + 7, x + 6, y + 3, x + 6, y + 11);
    else if (b === 'R') g.fillStyle(PAPER).fillRect(x + 4, y + 7, 2, 7).fillRect(x + 4, y + 6, 6, 2).fillTriangle(x + 14, y + 7, x + 10, y + 3, x + 10, y + 11);
    else if (b === 'P') g.fillStyle(0x8a2a22).fillCircle(x + 8, y + 8, 5).fillStyle(PAPER).fillCircle(x + 8, y + 8, 3);
    else pixText(g, b === 'F1' ? 'F1' : '×' + b[1], x + SLOT / 2, y + SLOT / 2, 2, PAPER, true);
  }
  // Robot de mantenimiento de la clonadora: cuerpo rosa con orejas de cerdito y el morro hacia donde mira
  robot(g, rx, ry, dir) {
    g.fillStyle(INK).fillRect(rx - 6, ry - 6, 12, 12).fillStyle(0xf7a8c0).fillRect(rx - 5, ry - 5, 10, 10);
    g.fillStyle(0xd8708f).fillRect(rx - 5, ry - 5, 3, 2).fillRect(rx + 2, ry - 5, 3, 2);         // orejas
    g.fillStyle(0x8a8f9a).fillRect(rx - 5, ry + 4, 10, 1);                                          // ruedas
    const sx = rx + DX[dir] * 4, sy = ry + DY[dir] * 4;
    g.fillStyle(INK).fillRect(sx - 3, sy - 3, 6, 6).fillStyle(0xe07a9e).fillRect(sx - 2, sy - 2, 4, 4); // morro
    g.fillStyle(INK).fillRect(sx - 1 - (DY[dir] ? 1 : 0), sy - 1 - (DX[dir] ? 1 : 0), 1, 1).fillRect(sx + (DY[dir] ? 1 : 0), sy + (DX[dir] ? 1 : 0), 1, 1);
  }
  update(time) {
    // Teclado / mando
    if (!this.lock && !UI.busy && !this.leaving) {
      if (this.running) {
        if (Input.take('a') || Input.take('b')) this.stop();
        else if (time >= this.next) { this.stepOp(); this.next = time + STEP_MS; }
      } else {
        if (Input.take('left')) this.cur = Math.max(0, this.cur - 1);
        if (Input.take('right')) this.cur = Math.min(BLOCKS.length + 1, this.cur + 1);
        if (Input.take('up')) this.setEdit('main');
        if (Input.take('down')) this.setEdit('f1');
        if (Input.take('reset')) this.toggle();
        if (Input.take('a')) this.press();
        if (Input.take('b')) return this.exit();
      }
    } else if (!this.running) Input.clear();
    // El robot se desliza hasta su casilla
    const s = this.shown, b = this.bot;
    s.x += (b.x - s.x) * 0.35; s.y += (b.y - s.y) * 0.35; s.dir = b.dir;

    const g = this.g.clear(), L = LEVELS[this.lv] || LEVELS[LEVELS.length - 1];
    // Conducto
    g.fillStyle(0x10141c).fillRect(this.gx - 4, this.gy - 4, this.cols * T + 8, this.rows * T + 8);
    this.map.forEach((r, y) => r.forEach((c, x) => {
      const px = this.gx + x * T, py = this.gy + y * T;
      if (c === '#') { g.fillStyle(0x3a3d46).fillRect(px, py, T, T).fillStyle(0x565a66).fillRect(px, py, T, 2).fillStyle(0x2b2d34).fillRect(px + 2, py + 6, 1, 1).fillRect(px + 12, py + 11, 1, 1); return; }
      g.fillStyle(0x8a8f9a).fillRect(px, py, T, T).fillStyle(0x7a7f8a).fillRect(px, py + T - 1, T, 1).fillRect(px + T - 1, py, 1, T);
      const pressed = this.panels.get(`${x},${y}`);
      if (pressed !== undefined) g.fillStyle(INK).fillRect(px + 3, py + 3, 10, 10).fillStyle(pressed ? 0x5aa648 : 0xffd23f).fillRect(px + 4, py + 4, 8, 8).fillStyle(INK).fillRect(px + 7, py + 5, 2, 6);
    }));
    this.robot(g, Math.round(this.gx + s.x * T + 8), Math.round(this.gy + s.y * T + 8), s.dir);
    // Programas: el marcado, con fondo y nombre en amarillo
    for (const [k, sy, name] of [['main', MAIN_Y, 'PRINCIPAL'], ['f1', F1_Y, 'F1']]) {
      const n = L[k];
      if (!n) continue;
      const on = this.edit === k;
      if (on) g.fillStyle(0x2f3a52).fillRect(PX0 - 6, sy - 20, Math.max(n * 22 + 8, 84), SLOT + 26);
      pixText(g, name, PX0, sy - 15, 2, on ? GOLD : 0x8a93a8);
      for (let i = 0; i < n; i++) {
        const blk = this.prog[k][i], x = this.slotX(i);
        if (blk) this.block(g, blk, x, sy);
        else g.fillStyle(0x3a4458).fillRect(x, sy, SLOT, SLOT).fillStyle(0x1c2230).fillRect(x + 1, sy + 1, SLOT - 2, SLOT - 2);
      }
    }
    // Paleta y botones
    BLOCKS.forEach((blk, i) => this.block(g, blk, this.palX(i), PAL_Y, blk === 'F1' && !L.f1));
    g.fillStyle(INK).fillRect(BTN_X - 1, RUN_Y - 1, BTN_W + 2, BTN_H + 2).fillStyle(this.running ? 0xc8402c : 0x3f8f6b).fillRect(BTN_X, RUN_Y, BTN_W, BTN_H);
    g.fillStyle(INK).fillRect(BTN_X - 1, CLR_Y - 1, BTN_W + 2, BTN_H + 2).fillStyle(0x6a6f7a).fillRect(BTN_X, CLR_Y, BTN_W, BTN_H);
    pixText(g, this.running ? 'PARAR' : 'EJECUTAR', BTN_X + BTN_W / 2, RUN_Y + BTN_H / 2, 2, PAPER, true);
    pixText(g, 'BORRAR', BTN_X + BTN_W / 2, CLR_Y + BTN_H / 2, 2, PAPER, true);
    // Cursor de la paleta
    const f = this.fx.clear();
    if (!this.running && !this.lock) {
      const blink = 0.6 + 0.4 * Math.sin(time / 140), c = this.cur;
      if (c < BLOCKS.length) f.lineStyle(2, GOLD, blink).strokeRect(this.palX(c) - 3, PAL_Y - 3, SLOT + 6, SLOT + 6);
      else f.lineStyle(2, GOLD, blink).strokeRect(BTN_X - 3, (c === BLOCKS.length ? RUN_Y : CLR_Y) - 3, BTN_W + 6, BTN_H + 6);
    }
    // Bloque que se está ejecutando, resaltado un instante en la paleta
    if (this.flash && time - this.flash.t < STEP_MS) {
      const i = BLOCKS.indexOf(this.flash.op);
      if (i >= 0) f.lineStyle(2, 0xffffff, 1).strokeRect(this.palX(i) - 2, PAL_Y - 2, SLOT + 4, SLOT + 4);
    }
  }
}
