// Minijuego: hackear la puerta de TEDI desde dentro del conducto (lo plantea Ovejoncia).
// En el conducto está el robot de mantenimiento de la máquina clonadora (con morro de cerdito, como los clones).
// Colgadín lo reprograma con bloques para llevarlo hasta los interruptores de la puerta y pulsarlos todos:
// avanzar, girar a la izquierda o a la derecha, pulsar, «repetir» (×2, ×3, ×4: repite el bloque que va justo
// detrás) y F1, una función propia que se llama desde el programa principal.
// Los huecos son pocos, así que hay que usar repeticiones y la función. Si el robot choca con una pared, pulsa
// donde no hay interruptor (salta la alarma) o el programa acaba sin pulsarlos todos, vuelve al principio.
// Controles: ← → eligen bloque o botón de la paleta; acción lo añade al programa marcado; ↑ ↓ (o la tecla R, o
// tocar el programa) cambian entre el principal y F1; el botón ▶ ejecuta (y, mientras corre, es
// ■ para parar) y el de la papelera vacía el programa marcado; tocar un bloque del programa lo quita. Al llenar el
// programa principal, el cursor salta solo al ▶. Debajo, un cuadrito (UI.cue) explica lo que hace el botón
// señalado. Cuatro cerraduras; el progreso se guarda (flags.hackLevel).
// OJO: no llamar «load», «add», «time»… a los métodos: Phaser ya usa esos nombres en la escena.
// Los textos se dibujan con una fuente de píxeles propia (GLYPHS) para que se lean nítidos al escalar.
import { State } from '../state.js';
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

// Mapas del conducto: # pared · . suelo · P interruptor · R robot (sobre suelo) · r robot sobre un interruptor.
// dir: hacia dónde mira el robot al empezar (0 este, 1 sur, 2 oeste, 3 norte). main/f1: huecos de cada programa.
// blocks (opcional): los bloques que funcionan en esa cerradura; los demás salen apagados («estropeados»).
export const LEVELS = [
  { dir: 0, main: 5, f1: 0, map: ['#########', '#R.....P#', '#########'],
    tip: 'Primera cerradura: seis pasos hasta el interruptor y pulsar… pero solo hay cinco huecos. Los bloques ×2, ×3 y ×4 repiten el bloque que pongas justo detrás.' },
  { dir: 0, main: 4, f1: 4, map: ['#######', '#R.####', '##..###', '###..##', '####.P#', '#######'],
    tip: 'Segunda: una escalera. Todos los escalones son iguales: guárdalo en la función y, en el programa principal, pon el bloque Fn tantas veces como haga falta. Un ×3 delante de Fn también vale.' },
  { dir: 0, main: 3, f1: 4, map: ['######', '#r..P#', '#.##.#', '#.##.#', '#P..P#', '######'],
    tip: 'Tercera: cuatro interruptores, uno en cada esquina, y el robot empieza encima de uno. Ojo: si pulsa donde no hay interruptor, salta la alarma.' },
  // La más difícil: dos pasillos de seis (no hay ×6: hay que encadenar ×2 ×3), SIN girar a la izquierda (izquierda =
  // ×3 derecha) y con el robot empezando de espaldas. El truco es que la función EMPIECE por el giro, para que sirva en
  // los dos pasillos. Única solución (salvo ×2 ×3 ↔ ×3 ×2 y «avanzar avanzar» ↔ «×2 avanzar»), comprobada a fuerza
  // bruta: función = ×3 der ×2 ×3 avanzar pulsar · principal = Fn ×3 der ×2 avanzar Fn
  { dir: 1, main: 6, f1: 6, blocks: ['F', 'R', 'P', 'x2', 'x3', 'x4', 'F1'], map: ['#########', '#P......#', '#######.#', '#R.....P#', '#########'],
    tip: 'La última, la más retorcida: el bloque de girar a la izquierda se ha estropeado y el robot empieza mirando a la pared. Otra vez dos pasillos de seis… y esta vez la función tiene sitio para seis bloques.' },
];
const BLOCKS = ['F', 'L', 'R', 'P', 'x2', 'x3', 'x4', 'F1'];
const COL = { F: 0x4a90d8, L: 0x3f8f6b, R: 0x3f8f6b, P: 0xe2574c, x2: 0xe8a820, x3: 0xe8a820, x4: 0xe8a820, F1: 0x8a5fc0 };
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
const T = 16, SLOT = 16, PAL_Y = 140, MAIN_Y = 40, F1_Y = 82, PX0 = 172; // medidas de la pantalla
const RUN = BLOCKS.length, CLR = RUN + 1; // posiciones del cursor: los bloques y, después, ▶ y la cruz
const BIG = 24, RUN_X = 254, CLR_X = 284, BIG_Y = PAL_Y - 4; // ▶ y papelera: más grandes, en la fila de los bloques, a la derecha
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
  n: ['...', '##.', '#.#', '#.#', '#.#'],
  'Ó': ['..#', '.#.', '#.#', '#.#', '#.#', '.#.'], // 6 filas: la tilde va una fila por encima
};
const textW = (s, k) => [...s].reduce((w, c) => w + (GLYPHS[c][0].length + 1) * k, -k);
// Escribe s con la fuente de píxeles; (x, y) = esquina superior izquierda, o el centro si center
function pixText(g, s, x, y, k, color, center = false) {
  if (center) { x -= textW(s, k) / 2; y -= 5 * k / 2; }
  x = Math.round(x); y = Math.round(y);
  g.fillStyle(color);
  for (const c of s) {
    const gl = GLYPHS[c];
    const top = y - (gl.length - 5) * k; // las letras con tilde suben la tilde por encima de la línea
    gl.forEach((row, j) => [...row].forEach((on, i) => { if (on === '#') g.fillRect(x + i * k, top + j * k, k, k); }));
    x += (gl[0].length + 1) * k;
  }
}

// Convierte un programa en la lista de acciones simples. «×N» multiplica al bloque siguiente (se pueden encadenar)
// y F1 ejecuta la función. Dentro de la propia función, F1 no se puede poner (ni haría nada).
export function expand(list, f1, out = [], depth = 0) {
  for (let i = 0; i < list.length && out.length <= MAX_OPS; i++) {
    let b = list[i], n = 1;
    while (b && /^x\d$/.test(b)) { n *= +b[1]; b = list[++i]; }
    if (!b) break; // un «repetir» al final, sin nada detrás, no hace nada
    for (let k = 0; k < n && out.length <= MAX_OPS; k++) {
      if (b === 'F1') { if (depth === 0) expand(f1, f1, out, 1); } else out.push(b); // la función no se llama a sí misma
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
    this.input.on('pointermove', (p) => this.hover(p.worldX, p.worldY));
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
      'Abajo tienes los bloques: avanzar, girar a la izquierda, girar a la derecha, pulsar, repetir y Fn (la función). Con ← → eliges uno y con el botón de acción lo añades al programa marcado.',
      'Cuando haya función, con ↑ y ↓ (o tocándolos) cambias entre el programa principal y la función. El botón de la papelera vacía el programa marcado, y si tocas un bloque del programa, se quita.',
      'Cuando lo tengas, dale al play. Si se equivoca, vuelve a su sitio y lo arreglas.',
      L.tip,
    ] : [L.tip];
    await UI.say('Ovejoncia', say);
    Input.clear();
    this.lock = false;
  }
  bar() {
    UI.minibar(`TEDI · Conducto · Cerradura ${this.lv + 1} de ${LEVELS.length}`, { exit: () => this.exit() });
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
    if (this.edit !== k) { this.edit = k; Sound.seq(['C5'], 0.04, 'square', 0.05); }
  }
  toggle() { if (this.canEdit()) this.setEdit(this.edit === 'main' ? 'f1' : 'main'); }
  addBlock(b) {
    const k = this.edit, max = LEVELS[this.lv][k];
    if (b === 'F1' && !LEVELS[this.lv].f1) return UI.toast('En esta cerradura no hay función: arréglatelas con el programa principal.');
    if (!this.avail(b)) { Sound.sfx('bad'); return UI.toast('Ese bloque está estropeado en esta cerradura: tendrás que apañártelas sin él.'); }
    if (b === 'F1' && k === 'f1') { Sound.sfx('bad'); return UI.toast('La función no puede llamarse a sí misma.'); }
    if (this.prog[k].length >= max) { Sound.sfx('bad'); return UI.toast(`No caben más bloques en ${k === 'main' ? 'el programa principal' : 'la función'} (${max} huecos).`); }
    this.prog[k].push(b); Sound.sfx('step');
    if (k === 'main' && this.prog.main.length >= max) this.cur = RUN; // programa principal lleno: cursor al ▶
  }
  remove(k, i) { if (this.prog[k][i] !== undefined) { this.prog[k].splice(i, 1); Sound.sfx('undo'); } }
  press() { // botón de acción sobre la paleta
    if (this.cur < RUN) return this.addBlock(BLOCKS[this.cur]);
    return this.cur === RUN ? this.run() : this.clear();
  }
  clear() { this.prog[this.edit] = []; Sound.sfx('undo'); }
  click(x, y) {
    if (this.lock || UI.busy || this.leaving) return;
    const inBox = (bx, by, w, h) => x >= bx && x < bx + w && y >= by && y < by + h;
    if (this.running) { // mientras se ejecuta, el botón sirve para parar
      if (inBox(RUN_X, BIG_Y, BIG, BIG)) this.stop();
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
    if (inBox(RUN_X, BIG_Y, BIG, BIG)) { this.cur = RUN; return this.run(); }
    if (inBox(CLR_X, BIG_Y, BIG, BIG)) { this.cur = CLR; return this.clear(); }
  }

  hover(x, y) { // con ratón: pasar por encima de un bloque o botón lo señala (y se ve su explicación)
    if (!this.canEdit()) return;
    for (let i = 0; i <= CLR; i++) {
      const big = i >= RUN, bx = this.palX(i), by = big ? BIG_Y : PAL_Y, w = big ? BIG : SLOT;
      if (x >= bx && x < bx + w && y >= by && y < by + w) { this.cur = i; return; }
    }
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
    await UI.say('Ovejoncia', '¡Beee! ¡CLIC! Una cerradura menos. Siguiente tramo del conducto.');
    this.loadLevel(false);
  }
  async win() {
    this.done = true; this.lock = true;
    State.d.flags.hackLevel = 0; State.save();
    UI.minibar(null); UI.cue(null);
    await SCRIPTS.tediHackDone();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }
  exit() {
    if (UI.busy || this.leaving || this.done) return;
    this.leaving = true; this.lock = true; UI.minibar(null); UI.cue(null);
    State.d.flags.hackLevel = this.lv; State.save(); // al volver se sigue en esta cerradura
    this.scene.start('world');
  }
  debugWin() { if (!this.done && !this.leaving) { this.lv = LEVELS.length; this.win(); } }

  // ---------- Dibujo
  palX(i) { return i === RUN ? RUN_X : i === CLR ? CLR_X : 12 + i * 24; } // bloques, ▶ y papelera
  avail(b) { const L = LEVELS[this.lv] || LEVELS[LEVELS.length - 1]; return (!L.blocks || L.blocks.includes(b)) && (b !== 'F1' || !!L.f1); }
  // Qué hace lo que señala el cursor (se muestra debajo de la fila de bloques)
  help() {
    if (this.running) return 'Ejecutando… (acción o ■ para parar)';
    const c = this.cur, L = LEVELS[this.lv], prog = this.edit === 'main' ? 'el programa principal' : 'la función';
    if (c === RUN) return 'Ejecutar: el robot hace el programa principal';
    if (c === CLR) return `Papelera: vacía ${prog}`;
    const b = BLOCKS[c], n = { x2: 'dos', x3: 'tres', x4: 'cuatro' }[b];
    if (b !== 'F1' && !this.avail(b)) return 'Este bloque está estropeado en esta cerradura';
    if (n) return `Repetir ×${b[1]}: hace ${n} veces el bloque de detrás`;
    return {
      F: 'Avanzar: un paso hacia donde mira el robot',
      L: 'Girar a la izquierda, sin moverse de sitio',
      R: 'Girar a la derecha, sin moverse de sitio',
      P: 'Pulsar el interruptor que tiene debajo',
      F1: L.f1 ? 'Fn: hace todos los bloques de la función' : 'Fn: en esta cerradura no hay función',
    }[b];
  }
  slotX(i) { return PX0 + i * 22; }
  block(g, b, x, y, dim = false) {
    g.fillStyle(INK).fillRect(x - 1, y - 1, SLOT + 2, SLOT + 2).fillStyle(COL[b], dim ? 0.4 : 1).fillRect(x, y, SLOT, SLOT);
    if (b === 'F') g.fillStyle(PAPER).fillTriangle(x + 8, y + 2, x + 3, y + 8, x + 13, y + 8).fillRect(x + 7, y + 8, 2, 6);
    else if (b === 'L') g.fillStyle(PAPER).fillRect(x + 10, y + 7, 2, 7).fillRect(x + 6, y + 6, 6, 2).fillTriangle(x + 2, y + 7, x + 6, y + 3, x + 6, y + 11);
    else if (b === 'R') g.fillStyle(PAPER).fillRect(x + 4, y + 7, 2, 7).fillRect(x + 4, y + 6, 6, 2).fillTriangle(x + 14, y + 7, x + 10, y + 3, x + 10, y + 11);
    else if (b === 'P') g.fillStyle(0x8a2a22).fillCircle(x + 8, y + 8, 5).fillStyle(PAPER).fillCircle(x + 8, y + 8, 3);
    else pixText(g, b === 'F1' ? 'Fn' : '×' + b[1], x + SLOT / 2, y + SLOT / 2, 2, PAPER, true);
    if (dim) g.fillStyle(INK, 0.55).fillRect(x, y, SLOT, SLOT).fillStyle(0xc8402c).fillRect(x + 3, y + 2, 2, 2).fillRect(x + 5, y + 4, 2, 3).fillRect(x + 7, y + 7, 2, 2).fillRect(x + 9, y + 9, 2, 3).fillRect(x + 11, y + 12, 2, 2); // estropeado: grieta
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
        if (Input.take('right')) this.cur = Math.min(CLR, this.cur + 1);
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
    for (const [k, sy, name] of [['main', MAIN_Y, 'PRINCIPAL'], ['f1', F1_Y, 'FUNCIÓN']]) {
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
    BLOCKS.forEach((blk, i) => this.block(g, blk, this.palX(i), PAL_Y, !this.avail(blk)));
    // ▶ ejecutar (■ parar mientras corre) y la papelera roja para vaciar el programa marcado, más grandes que los bloques
    g.fillStyle(INK).fillRect(RUN_X - 1, BIG_Y - 1, BIG + 2, BIG + 2).fillStyle(0x3f8f6b).fillRect(RUN_X, BIG_Y, BIG, BIG);
    if (this.running) g.fillStyle(PAPER).fillRect(RUN_X + 7, BIG_Y + 7, 10, 10);
    else g.fillStyle(PAPER).fillTriangle(RUN_X + 7, BIG_Y + 5, RUN_X + 7, BIG_Y + 19, RUN_X + 19, BIG_Y + 12);
    g.fillStyle(INK).fillRect(CLR_X - 1, BIG_Y - 1, BIG + 2, BIG + 2).fillStyle(0xc8402c).fillRect(CLR_X, BIG_Y, BIG, BIG).fillStyle(PAPER);
    g.fillRect(CLR_X + 10, BIG_Y + 4, 4, 2).fillRect(CLR_X + 5, BIG_Y + 6, 14, 2);                  // asa y tapa
    g.fillRect(CLR_X + 7, BIG_Y + 9, 10, 11).fillStyle(0xc8402c);                                    // cubo
    for (const x of [9, 12, 15]) g.fillRect(CLR_X + x - 1, BIG_Y + 11, 1, 7);                         // rayas
    // Explicación del botón señalado, en un cuadrito debajo (solo cuando se puede tocar)
    UI.cue(!this.lock && !UI.busy && !this.leaving && !this.done ? this.help() : null, false, true);
    // Cursor de la paleta
    const f = this.fx.clear();
    if (!this.running && !this.lock) {
      const blink = 0.6 + 0.4 * Math.sin(time / 140), c = this.cur;
      if (c < RUN) f.lineStyle(2, GOLD, blink).strokeRect(this.palX(c) - 3, PAL_Y - 3, SLOT + 6, SLOT + 6);
      else f.lineStyle(2, GOLD, blink).strokeRect(this.palX(c) - 3, BIG_Y - 3, BIG + 6, BIG + 6);
    }
    // Bloque que se está ejecutando, resaltado un instante en la paleta
    if (this.flash && time - this.flash.t < STEP_MS) {
      const i = BLOCKS.indexOf(this.flash.op);
      if (i >= 0) f.lineStyle(2, 0xffffff, 1).strokeRect(this.palX(i) - 2, PAL_Y - 2, SLOT + 4, SLOT + 4);
    }
  }
}
