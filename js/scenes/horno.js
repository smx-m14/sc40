// Minijuego: la Pastelería Real (tipo Overcooked). Llegan pedidos de mazapanes con forma (naranja, fresa, pera o plátano)
// y hay que servirlos antes de que caduquen. Cada mazapán sigue siempre los mismos cinco pasos:
//   1. almendra y azúcar a la MESA   2. amasar (3 pulsaciones)   3. darle forma en el MOLDE que pide el pedido
//   4. HORNO: 4 s de cocción y sacarlo antes de que se queme   5. entregarlo en la VENTANILLA
// En la barra de arriba se indica en todo momento qué hace el botón de acción en la estación que se tiene delante.
// Las estaciones están repartidas por tres paredes (arriba, abajo y derecha) y por la cocina deambulan Manteca2 y dos owitos.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

const T = 16, COLS = 13, ROWS = 6, OX = (320 - COLS * T) / 2, OY = 66;
const GOAL = 10, TIME = 290, BAKE = 4, BURN = 6, KNEAD = 3, ORDER_TIME = 55, MAX_ORDERS = 3;
const SHAPES = { o: 'naranja', f: 'fresa', p: 'pera', b: 'plátano' };
// Suelo transitable: columnas 0-11, filas 1-4. Encimeras: fila 0 (arriba), fila 5 (abajo) y columna 12 (derecha)
const WX = COLS - 2;
const STATIONS = [
  { k: 'alm', x: 0, y: 0, tex: 'st_alm', name: 'ALMENDRA' }, { k: 'azu', x: 1, y: 0, tex: 'st_azu', name: 'AZÚCAR' },
  { k: 'mesa', x: 5, y: 0, tex: 'st_mesa', name: 'MESA' },
  { k: 'basura', x: 9, y: 0, tex: 'st_basura', name: 'BASURA' },
  { k: 'molde', s: 'o', x: 1, y: 5, tex: 'st_mold_o', name: 'MOLDE NARANJA' }, { k: 'molde', s: 'f', x: 2, y: 5, tex: 'st_mold_f', name: 'MOLDE FRESA' },
  { k: 'molde', s: 'p', x: 3, y: 5, tex: 'st_mold_p', name: 'MOLDE PERA' }, { k: 'molde', s: 'b', x: 4, y: 5, tex: 'st_mold_b', name: 'MOLDE PLÁTANO' },
  { k: 'horno', i: 0, x: 12, y: 1, tex: 'st_horno', name: 'HORNO' }, { k: 'horno', i: 1, x: 12, y: 2, tex: 'st_horno', name: 'HORNO' },
  { k: 'entrega', x: 12, y: 4, tex: 'st_entrega', name: 'VENTANILLA' },
];
const MESA = STATIONS.find((s) => s.k === 'mesa'), OVENS = STATIONS.filter((s) => s.k === 'horno');
const ZONE = { alm: 0xffd23f, azu: 0xffd23f, mesa: 0xc98f4e, molde: 0x6fb4ee, horno: 0xe2574c, basura: 0x8a8f9a, entrega: 0x5aa648 };
const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const px = (x) => OX + x * T, py = (y) => OY + y * T;
const itemTex = (c) => (c === 'alm' || c === 'azu' || c === 'masa' || c === 'burnt' ? 'it_' + c : c.startsWith('raw') ? 'it_raw_' + c[4] : 'it_maz_' + c[4]);
const itemName = (c) => ({ alm: 'almendra', azu: 'azúcar', masa: 'masa', burnt: 'un mazapán quemado' }[c] || (c.startsWith('raw') ? `figura de ${SHAPES[c[4]]} cruda` : `mazapán de ${SHAPES[c[4]]}`));

export class HornoScene extends Phaser.Scene {
  constructor() { super('horno'); }

  create() {
    this.cameras.main.setBackgroundColor('#3b2a20').fadeIn(250);
    UI.hud(false);
    Sound.music('horno');
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) this.add.image(px(x), py(y), y === 0 || y === ROWS - 1 || x > WX ? 'tile_K' : 'tile_k').setOrigin(0);
    // Zonas marcadas en el suelo delante de cada estación, del color de su grupo
    const zone = this.add.graphics().setDepth(1);
    for (const s of STATIONS) {
      zone.fillStyle(ZONE[s.k], s.k === 'entrega' ? 0.5 : 0.38);
      if (s.y === 0) zone.fillRect(px(s.x) + 1, py(1) + 1, T - 2, 3);
      else if (s.y === ROWS - 1) zone.fillRect(px(s.x) + 1, py(ROWS - 1) - 4, T - 2, 3);
      else zone.fillRect(px(WX + 1) - 4, py(s.y) + 1, 3, T - 2);
    }
    for (const s of STATIONS) this.add.image(px(s.x), py(s.y), s.tex).setOrigin(0).setDepth(2);
    // Mantecas espera fuera, al otro lado de la ventanilla (sin taparla)
    this.add.image(px(COLS) + 13, py(5) + 1, 'mantecas_down_0').setOrigin(0.5, 1).setScale(1.5).setDepth(3);
    const small = { fontFamily: 'Pixelify', fontSize: '16px', color: '#ffe066', stroke: '#1a1412', strokeThickness: 3 };
    // Números de paso bien visibles junto a cada grupo de estaciones (el nombre y la acción salen en la barra de arriba)
    [['1', px(1), py(0) - 9], ['2', px(5) + 8, py(0) - 9], ['3', px(3), py(ROWS) + 6], ['4', px(COLS) + 8, py(2)], ['5', px(12) + 8, py(ROWS) + 6]]
      .forEach(([t, x, y]) => this.add.text(x, y, t, small).setOrigin(0.5).setDepth(5));
    this.fx = this.add.graphics().setDepth(6);
    this.tickets = this.add.graphics().setDepth(20);
    this.ticketImg = [0, 1, 2].map((i) => this.add.image(0, 0, 'it_maz_o').setDepth(21).setScale(2).setVisible(false));
    this.onMesa = [this.add.image(px(MESA.x) + 5, py(0) + 8, 'it_alm').setDepth(4), this.add.image(px(MESA.x) + 11, py(0) + 8, 'it_azu').setDepth(4), this.add.image(px(MESA.x) + 8, py(0) + 8, 'it_masa').setDepth(4)];
    this.inOven = OVENS.map((o) => this.add.image(px(o.x) + 8, py(o.y) + 9, 'it_masa').setDepth(4));
    // Los que estorban: Manteca2 y dos owitos pinches que se pasean por la cocina
    this.helpers = ['manteca2', 'owito_w', 'owito_k'].map((tex, i) => ({ tex, x: 0, y: 0, t: i * 0.25, spr: this.add.image(0, 0, tex + '_down_0').setOrigin(0.5, 1).setDepth(8) }));
    this.mark = this.add.graphics().setDepth(7);
    this.pSpr = this.add.image(0, 0, 'colgadin_down_0').setOrigin(0.5, 1).setDepth(9);
    this.cSpr = this.add.image(0, 0, 'it_alm').setDepth(10).setVisible(false);
    this.reset_();
    Input.clear();
    this.lock = true;
    (async () => {
      await UI.say('Manteca2', '¡Que gane la mejor drag queen!');
      await UI.say('Mantecas', [
        '…¿Y esto qué tiene que ver con los mazapanes?',
        '¡A los fogones! Arriba irán llegando PEDIDOS: cada uno pide un mazapán con forma de fruta, y caduca si tardas.',
        'Siempre son cinco pasos, de izquierda a derecha: 1) lleva almendra y azúcar a la mesa; 2) amasa pulsando tres veces; 3) coge la masa y dale forma en el molde que toque…',
        '…los moldes están en la encimera de ABAJO. 4) Mete la figura en un horno de la DERECHA, pero cuidado, ¡si la dejas de más se quema!; 5) tráemela a la ventanilla, donde estoy yo.',
        `La barra de arriba te dice siempre qué hace el botón de acción en lo que tienes delante. Necesito ${GOAL} pedidos bien servidos.`,
        '¡Y cuidado con Manteca2 y los owitos pinches, que se pasean por en medio y no se apartan!',
        'Buena suerte, y no la caguéis. …Ay, no. Se me está pegando.',
      ]);
      this.lock = false;
    })();
  }

  reset_() {
    this.pl = { x: 3, y: 2, dir: 'up' };
    [[6, 3], [9, 1], [2, 4]].forEach(([x, y], i) => Object.assign(this.helpers[i], { x, y }));
    this.carry = null; this.done = 0; this.failed = 0; this.left = TIME; this.nextMove = 0;
    this.mesa = { alm: false, azu: false, knead: 0, masa: false };
    this.ovens = [{ st: 'empty', t: 0, s: null }, { st: 'empty', t: 0, s: null }];
    this.orders = []; this.orderT = 1.5;
    this.paint(true);
  }
  exit() {
    if (this.lock || UI.busy) return;
    this.lock = true; UI.minibar(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.lock) { this.done = GOAL; this.win(); } }

  facing() { const p = this.pl, [dx, dy] = VEC[p.dir]; return STATIONS.find((q) => q.x === p.x + dx && q.y === p.y + dy); }

  // Qué haría el botón de acción ahora mismo (texto para la barra) — misma lógica que act()
  hint() {
    const s = this.facing(), c = this.carry, m = this.mesa;
    if (!s) return c ? `Llevas ${itemName(c)}. Ponte de cara a una estación.` : 'Ponte de cara a una estación y pulsa acción.';
    if (s.k === 'alm' || s.k === 'azu') return c ? `${s.name}: tienes las manos ocupadas` : `${s.name}: coger`;
    if (s.k === 'basura') return c ? `BASURA: tirar ${itemName(c)}` : 'BASURA: no llevas nada';
    if (s.k === 'mesa') {
      if ((c === 'alm' || c === 'azu') && !m[c] && !m.masa) return `MESA: dejar ${itemName(c)}`;
      if (!c && m.alm && m.azu) return `MESA: amasar (${m.knead}/${KNEAD})`;
      if (!c && m.masa) return 'MESA: coger la masa';
      if (m.masa) return 'MESA: hay masa lista, suelta lo que llevas';
      return `MESA: falta ${!m.alm ? 'almendra' : ''}${!m.alm && !m.azu ? ' y ' : ''}${!m.azu ? 'azúcar' : ''}`;
    }
    if (s.k === 'molde') return c === 'masa' ? `${s.name}: dar forma de ${SHAPES[s.s]}` : `${s.name}: trae masa de la mesa`;
    if (s.k === 'horno') {
      const o = this.ovens[s.i];
      if (c && c.startsWith('raw') && o.st === 'empty') return `HORNO: meter la ${itemName(c)}`;
      if (!c && o.st === 'done') return 'HORNO: ¡sacar el mazapán!';
      if (!c && o.st === 'burnt') return 'HORNO: sacar lo quemado (a la basura)';
      if (o.st === 'baking') return `HORNO: cociendo… ${Math.ceil(BAKE - o.t)} s`;
      return o.st === 'empty' ? 'HORNO: vacío. Trae una figura con forma' : 'HORNO: ocupado, suelta lo que llevas';
    }
    if (c && c.startsWith('maz')) return this.orders.some((o) => o.s === c[4]) ? `VENTANILLA: entregar ${itemName(c)}` : `VENTANILLA: nadie ha pedido ${SHAPES[c[4]]}`;
    return 'VENTANILLA: trae un mazapán horneado';
  }

  paint(snap) {
    const p = this.pl, side = p.dir === 'left' || p.dir === 'right';
    this.pSpr.setTexture(`colgadin_${side ? 'side' : p.dir}_0`).setFlipX(p.dir === 'left');
    const tx = px(p.x) + 8, ty = py(p.y) + 15;
    if (snap) this.pSpr.setPosition(tx, ty); else this.tweens.add({ targets: this.pSpr, x: tx, y: ty, duration: 90 });
  }

  move(dir) {
    const [dx, dy] = VEC[dir], p = this.pl;
    if (p.dir !== dir) { p.dir = dir; this.paint(); }
    const nx = p.x + dx, ny = p.y + dy;
    if (nx < 0 || nx > WX || ny < 1 || ny > ROWS - 2 || this.helpers.some((h) => h.x === nx && h.y === ny)) return;
    p.x = nx; p.y = ny;
    this.paint();
  }

  act() {
    const s = this.facing();
    if (!s) return;
    const c = this.carry, m = this.mesa;
    const ok = () => Sound.sfx('step'), no = () => Sound.sfx('bump');
    if (s.k === 'alm' || s.k === 'azu') { if (!c) { this.carry = s.k; ok(); } else no(); }
    else if (s.k === 'basura') { if (c) { this.carry = null; Sound.sfx('undo'); } }
    else if (s.k === 'mesa') {
      if ((c === 'alm' || c === 'azu') && !m[c] && !m.masa) { m[c] = true; this.carry = null; ok(); }
      else if (!c && m.alm && m.azu) { Sound.sfx('push'); if (++m.knead >= KNEAD) this.mesa = { alm: false, azu: false, knead: 0, masa: true }; }
      else if (!c && m.masa) { this.carry = 'masa'; m.masa = false; ok(); }
      else no();
    } else if (s.k === 'molde') {
      if (c === 'masa') { this.carry = 'raw_' + s.s; Sound.sfx('rep'); } else no();
    } else if (s.k === 'horno') {
      const o = this.ovens[s.i];
      if (c && c.startsWith('raw') && o.st === 'empty') { o.st = 'baking'; o.t = 0; o.s = c[4]; this.carry = null; ok(); }
      else if (!c && o.st === 'done') { this.carry = 'maz_' + o.s; o.st = 'empty'; Sound.sfx('get'); }
      else if (!c && o.st === 'burnt') { this.carry = 'burnt'; o.st = 'empty'; ok(); }
      else no();
    } else if (s.k === 'entrega') {
      const i = c && c.startsWith('maz') ? this.orders.findIndex((o) => o.s === c[4]) : -1;
      if (i >= 0) {
        this.orders.splice(i, 1); this.carry = null; this.done++;
        Sound.sfx('coin');
        if (this.done >= GOAL) this.win();
      } else { no(); if (c === 'burnt') UI.toast('Mantecas: ¡Eso es carbón! ¡A la basura!'); else if (c && c.startsWith('maz')) UI.toast(`Mantecas: ¡Nadie ha pedido ${SHAPES[c[4]]}! Mira los pedidos.`); }
    }
  }

  async win() {
    this.lock = true;
    UI.minibar(null);
    await SCRIPTS.hornoDone();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }
  async timeout() {
    this.lock = true;
    Sound.sfx('bad');
    await UI.say('Manteca2', 'Sashay, te vas…');
    await UI.say('Mantecas', `¡Se acabó el turno! ${this.done} de ${GOAL} pedidos. La muralla sigue con agujeros. Nadie se va a ningún sitio: otra hornada desde el principio.`);
    this.reset_();
    this.lock = false;
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (!this.lock && !UI.busy) {
      this.left -= dt;
      // Pedidos: entra uno nuevo cada cierto tiempo (más deprisa según avanza) y caducan
      if ((this.orderT -= dt) <= 0 && this.orders.length < MAX_ORDERS) {
        this.orders.push({ s: 'ofpb'[Math.floor(Math.random() * 4)], t: ORDER_TIME });
        this.orderT = Math.max(8, 19 - this.done * 1.3);
        Sound.sfx('ok');
      }
      for (const o of this.orders) o.t -= dt;
      const gone = this.orders.filter((o) => o.t <= 0).length;
      if (gone) { this.orders = this.orders.filter((o) => o.t > 0); this.failed += gone; this.left -= 8 * gone; Sound.sfx('bad'); UI.toast('¡Un pedido ha caducado! Pierdes 8 segundos.'); }
      for (const o of this.ovens) {
        if (o.st === 'baking' && (o.t += dt) >= BAKE) { o.st = 'done'; o.t = 0; Sound.sfx('ok'); }
        else if (o.st === 'done' && (o.t += dt) >= BURN) { o.st = 'burnt'; Sound.sfx('bad'); UI.toast('¡Se ha quemado un mazapán!'); }
      }
      for (const h of this.helpers) if ((h.t -= dt) <= 0) { // Manteca2 y los owitos se pasean al azar
        h.t = 0.55 + Math.random() * 0.4;
        const [dx, dy] = Object.values(VEC)[Math.floor(Math.random() * 4)], nx = h.x + dx, ny = h.y + dy;
        if (nx >= 0 && nx <= WX && ny >= 1 && ny <= ROWS - 2 && !(nx === this.pl.x && ny === this.pl.y) && !this.helpers.some((o) => o.x === nx && o.y === ny)) { h.x = nx; h.y = ny; }
      }
      if (Input.take('a')) this.act();
      if (Input.take('b')) this.exit();
      const d = Input.dir();
      const dir = d.x < 0 ? 'left' : d.x > 0 ? 'right' : d.y < 0 ? 'up' : d.y > 0 ? 'down' : null;
      if (!dir) this.nextMove = 0;
      else if (time >= this.nextMove) { this.nextMove = time + 115; this.move(dir); }
      if (this.left <= 0 && !this.lock) this.timeout();
      if (!this.lock) UI.minibar(`Pedidos ${this.done}/${GOAL} · ${Math.max(0, Math.ceil(this.left))} s · ${this.hint()}`, { exit: () => this.exit() });
    } else Input.clear();

    // ---- Dibujo
    this.helpers.forEach((h, i) => h.spr.setPosition(px(h.x) + 8, py(h.y) + 15).setDepth(8 + h.y * 0.01).setTexture(`${h.tex}_down_${Math.floor(time / 350 + i) % 2}`));
    this.pSpr.setDepth(8 + this.pl.y * 0.01 + 0.005);
    const m = this.mesa;
    this.onMesa[0].setVisible(m.alm); this.onMesa[1].setVisible(m.azu); this.onMesa[2].setVisible(m.masa);
    this.cSpr.setVisible(!!this.carry).setPosition(this.pSpr.x, this.pSpr.y - 22);
    if (this.carry) this.cSpr.setTexture(itemTex(this.carry));
    // estación que se tiene delante, resaltada
    const f = this.facing(), mk = this.mark.clear();
    if (f) mk.lineStyle(1, 0xffffff, 0.6 + 0.4 * Math.sin(time / 120)).strokeRect(px(f.x) + 0.5, py(f.y) + 0.5, T - 1, T - 1);
    const g = this.fx.clear();
    const bar = (x, y, k, col) => g.fillStyle(0x1a1412).fillRect(x + 1, y - 5, 14, 4).fillStyle(col).fillRect(x + 2, y - 4, 12 * Math.max(0, Math.min(1, k)), 2);
    if (m.alm && m.azu) bar(px(MESA.x), py(0), m.knead / KNEAD, 0xffd23f);
    this.ovens.forEach((o, i) => {
      const x = px(OVENS[i].x), y = py(OVENS[i].y);
      this.inOven[i].setVisible(o.st !== 'empty');
      if (o.st !== 'empty') this.inOven[i].setTexture(o.st === 'burnt' ? 'it_burnt' : o.st === 'done' ? 'it_maz_' + o.s : 'it_raw_' + o.s);
      if (o.st === 'baking') bar(x, y, o.t / BAKE, 0x5aa648);
      if (o.st === 'done') { bar(x, y, 1 - o.t / BURN, 0xe2574c); if (Math.floor(time / 200) % 2) g.lineStyle(1, 0xffe066, 1).strokeRect(x, y, T, T); }
      if (o.st === 'burnt') g.fillStyle(0x555555, 0.8).fillCircle(x + 8, y - 4 - (time / 60) % 8, 3);
    });
    // Pedidos, arriba: figura pedida y tiempo que le queda
    const t = this.tickets.clear();
    this.ticketImg.forEach((im, i) => {
      const o = this.orders[i], x = 96 + i * 46, y = 20;
      im.setVisible(!!o);
      if (!o) { t.lineStyle(1, 0x6e4520, 0.6).strokeRect(x, y, 40, 30); return; }
      const k = o.t / ORDER_TIME;
      t.fillStyle(0x2b2320).fillRect(x - 1, y - 1, 42, 32).fillStyle(0xfff6dc).fillRect(x, y, 40, 30);
      t.fillStyle(0x1a1412).fillRect(x + 3, y + 24, 34, 4).fillStyle(k > 0.5 ? 0x5aa648 : k > 0.25 ? 0xffd23f : 0xe2574c).fillRect(x + 4, y + 25, 32 * k, 2);
      im.setTexture('it_maz_' + o.s).setPosition(x + 20, y + 12);
    });
  }
}
