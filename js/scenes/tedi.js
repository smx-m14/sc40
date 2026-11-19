// Minijuego (jefe): la máquina clonadora de TEDI.
// Escupe clones por tres cintas; si tocan a Colgadín lo empujan hasta la entrada (sin daño ni vidas). Las cintas de
// los lados bajan desde la máquina y la del medio sube desde el desagüe; si Colgadín se sube a una, lo arrastra.
// La sala tiene seis enchufes, tres arriba (en la máquina) y tres abajo (en el desagüe). Cada poco se abre la
// tapa de alguno: hay que llegar y arrancarlo con la cola. Cuantos más enchufes faltan, más rápida y furiosa va la
// máquina. Además salen clones con casco que van a REPARAR los enchufes arrancados: hay que espantarlos
// (botón de acción a su lado) antes de que lleguen. Siempre salen del lado contrario al de su enchufe (arriba si es
// de abajo, y al revés), para que haya margen de interceptarlos. Gana quien deje los seis arrancados a la vez.
// Sin avisos de texto durante la partida: tapaban los enchufes de arriba.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

const LANES = [96, 160, 224], LW = 30;
const PLUGS = [[128, 44], [192, 44], [276, 44], [52, 168], [128, 168], [192, 168]]; // [x, y]: arriba y abajo
const TOP_Y = 58, BOT_Y = 154;                                                     // zona por la que se mueve Colgadín
const LANE_DIR = [1, -1, 1], BELT_V = 40; // sentido de cada cinta (1 baja, -1 sube) y lo que arrastra (px/s)
const ENTRY = { x: 24, y: 106 }, SPEED = 74;
// Según los enchufes arrancados (0–5): cada cuánto sale una tanda, cuántos carriles como mucho, velocidad,
// clones por tanda, cuánto dura la tapa abierta y cada cuánto sale un reparador (0 = nunca)
const PHASE = [
  { every: 1.15, lanes: 1, v: 56, burst: 1, open: 4.0, repair: 0 },
  { every: 1.0, lanes: 2, v: 66, burst: 1, open: 3.6, repair: 10 },
  { every: 0.95, lanes: 2, v: 74, burst: 2, open: 3.2, repair: 8.5 },
  { every: 0.9, lanes: 2, v: 82, burst: 2, open: 2.9, repair: 7.5 },
  { every: 0.95, lanes: 3, v: 88, burst: 2, open: 2.6, repair: 6.5 },
  { every: 0.9, lanes: 3, v: 96, burst: 3, open: 2.3, repair: 5.5 },
];

export class TediScene extends Phaser.Scene {
  constructor() { super('tedi'); }

  create() {
    this.cameras.main.setBackgroundColor('#2b2d34').fadeIn(250);
    UI.hud(false);
    Sound.music('tedi');
    const g = this.add.graphics();
    g.fillStyle(0x3a3d46).fillRect(-80, 0, 480, 180);
    for (const x of LANES) { g.fillStyle(0x565a66).fillRect(x - LW / 2, 40, LW, 128); g.fillStyle(0xffe000).fillRect(x - LW / 2 - 2, 40, 2, 128).fillRect(x + LW / 2, 40, 2, 128); }
    // La máquina clonadora (arriba) y el desagüe de clones (abajo)
    g.fillStyle(0x6a6f7a).fillRect(10, 0, 300, 38).fillStyle(0x8a8f9a).fillRect(10, 0, 300, 4).fillStyle(0x1a1412).fillRect(10, 38, 300, 3);
    g.fillStyle(0x1f6fd0).fillCircle(160, 18, 15).fillStyle(0xffe000).fillRect(144, 13, 32, 10);
    for (const x of LANES) g.fillStyle(0x14151a).fillRect(x - 12, 26, 24, 14);
    g.fillStyle(0x6a6f7a).fillRect(10, 162, 300, 18).fillStyle(0x1a1412).fillRect(10, 161, 300, 2);
    for (const x of LANES) g.fillStyle(0x14151a).fillRect(x - 13, 163, 26, 10);
    g.fillStyle(0x82cc6a).fillRect(4, 94, 3, 26); // entrada
    this.belt = this.add.graphics();
    this.fx = this.add.graphics().setDepth(20);
    this.plugSpr = PLUGS.map(([x, y]) => this.add.image(x, y, 'plug_c').setDepth(3).setFlipY(y > 100));
    this.pSpr = this.add.image(ENTRY.x, ENTRY.y, 'colgadin_down_0').setOrigin(0.5, 1).setDepth(10);

    this.p = { ...ENTRY, dir: 'down', anim: 0 };
    this.plugs = PLUGS.map(() => ({ st: 'closed', t: 0 })); // closed · open · pulled
    this.lidT = 1.5;
    this.clones = []; this.fixers = []; this.spawnT = 1; this.fixT = 0;
    this.lock = true; this.done = false;
    this.bar();
    Input.clear();
    UI.say('Colgadín', [
      '¡La máquina clonadora! Cada cerdito que escupe es una copia de Owinken hecha con IA.',
      'Hay seis enchufes: tres arriba en la máquina y tres abajo en el desagüe. Cuando se abra la tapa de uno, llego y lo arranco con la cola (botón de acción).',
      'Las cintas de los lados bajan y la del medio sube desde el desagüe. Si me subo a una, me arrastra: mejor cruzarlas rápido. Y si un clon me toca, vuelta a la entrada.',
      'Y ojo con los clones del casco amarillo: van a volver a enchufar lo que arranque. A esos hay que espantarlos con el botón de acción antes de que lleguen.',
    ]).then(() => { this.lock = false; });
  }

  count() { return this.plugs.filter((q) => q.st === 'pulled').length; }
  bar() { UI.minibar(`TEDI · Enchufes arrancados ${this.count()}/${PLUGS.length}`, { exit: () => this.exit() }); }
  exit() {
    if (this.lock || UI.busy) return;
    this.lock = true; UI.minibar(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.lock) { this.plugs.forEach((q) => { q.st = 'pulled'; }); this.win(); } }

  spawn(ph) {
    const n = 1 + Math.floor(Math.random() * ph.lanes), lanes = Phaser.Utils.Array.Shuffle([0, 1, 2]).slice(0, n);
    for (const l of lanes) for (let b = 0; b < ph.burst; b++) {
      const up = LANE_DIR[l] < 0; // la cinta del medio sube: sus clones salen del desagüe
      this.clones.push({ x: LANES[l] + (Math.random() * 8 - 4), y: up ? 176 + b * 22 : 34 - b * 22, v: ph.v * LANE_DIR[l], spr: this.add.image(0, 0, 'clon_down_0').setOrigin(0.5, 1).setDepth(8) });
    }
  }

  spawnFixer() {
    const broken = this.plugs.map((q, i) => i).filter((i) => this.plugs[i].st === 'pulled');
    if (!broken.length) return;
    const i = broken[Math.floor(Math.random() * broken.length)], [px] = PLUGS[i];
    // Sale del lado contrario al enchufe (desagüe si el enchufe está arriba, máquina si está abajo), por una de las
    // cintas más cercanas a él, y cruza toda la sala: da tiempo a interceptarlo
    const best = Math.min(...LANES.map((l) => Math.abs(l - px)));
    const near = LANES.map((l, k) => k).filter((k) => Math.abs(LANES[k] - px) === best);
    const k = near[Math.floor(Math.random() * near.length)], from = PLUGS[i][1] < 100 ? -1 : 1; // 1 = baja desde arriba
    this.fixers.push({ i, from, x: LANES[k], y: from > 0 ? 40 : 164, spr: this.add.image(0, 0, 'clon_fix_0').setOrigin(0.5, 1).setDepth(9) });
    Sound.sfx('undo'); // aviso sonoro en vez de mensaje
  }

  action() {
    const p = this.p;
    // 1) espantar a un reparador cercano
    const f = this.fixers.find((c) => Math.abs(c.x - p.x) < 16 && Math.abs(c.y - p.y) < 16);
    if (f) { f.flee = true; Sound.sfx('rep'); return; }
    // 2) arrancar un enchufe con la tapa abierta
    const i = PLUGS.findIndex(([x, y], k) => this.plugs[k].st === 'open' && Math.abs(p.x - x) < 14 && (y < 100 ? p.y < TOP_Y + 8 : p.y > BOT_Y - 6));
    if (i >= 0) return this.pull(i);
    Sound.sfx('bump');
  }

  pull(i) {
    this.plugs[i] = { st: 'pulled', t: 0 };
    this.plugSpr[i].setTexture('plug_x');
    Sound.sfx('dig');
    this.cameras.main.shake(400, 0.008).flash(150, 255, 240, 120);
    this.bar();
    if (this.count() >= PLUGS.length) return this.win();
    if (this.count() === 1) this.fixT = 3;
  }

  async win() {
    this.lock = true; this.done = true;
    UI.minibar(null);
    await new Promise((r) => this.time.delayedCall(900, r));
    await SCRIPTS.tediDone();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000, p = this.p, ph = PHASE[Math.min(this.count(), PHASE.length - 1)];
    if (!this.lock && !UI.busy) {
      // Tapas: como mucho dos abiertas a la vez
      for (const q of this.plugs) if (q.st === 'open' && (q.t -= dt) <= 0) q.st = 'closed';
      if ((this.lidT -= dt) <= 0) {
        this.lidT = 1.6 + Math.random();
        const closed = this.plugs.map((q, i) => i).filter((i) => this.plugs[i].st === 'closed');
        if (closed.length && this.plugs.filter((q) => q.st === 'open').length < 2) {
          const i = closed[Math.floor(Math.random() * closed.length)];
          this.plugs[i] = { st: 'open', t: ph.open };
          Sound.sfx('ok');
        }
      }
      if ((this.spawnT -= dt) <= 0) { this.spawnT = ph.every; this.spawn(ph); }
      if (ph.repair && (this.fixT -= dt) <= 0) { this.fixT = ph.repair; this.spawnFixer(); }

      // Colgadín
      const d = Input.dir();
      if (d.x || d.y) {
        const n = Math.hypot(d.x, d.y);
        p.x = Phaser.Math.Clamp(p.x + (d.x / n) * SPEED * dt, 12, 308);
        p.y = Phaser.Math.Clamp(p.y + (d.y / n) * SPEED * dt, TOP_Y, BOT_Y);
        p.dir = d.y < 0 ? 'up' : d.y > 0 ? 'down' : d.x < 0 ? 'left' : 'right';
        p.anim += dt;
      }
      // Si está encima de una cinta, la cinta lo arrastra en su sentido
      const on = LANES.findIndex((x) => Math.abs(p.x - x) < LW / 2);
      if (on >= 0) p.y = Phaser.Math.Clamp(p.y + LANE_DIR[on] * BELT_V * dt, TOP_Y, BOT_Y);
      if (Input.take('a')) this.action();
      if (Input.take('b')) return this.exit();

      // Clones que bajan por los carriles
      for (const c of this.clones) {
        c.y += c.v * dt;
        if (c.y > 40 && c.y < 166 && Math.abs(c.x - p.x) < 11 && Math.abs(c.y - p.y) < 10) {
          Sound.sfx('bad');
          p.x = ENTRY.x; p.y = ENTRY.y; this.cameras.main.shake(150, 0.005);
        }
      }
      this.clones = this.clones.filter((c) => ((c.v > 0 ? c.y < 172 : c.y > 34) ? true : (c.spr.destroy(), false)));
      // Reparadores: van directos a su enchufe; si llegan, lo vuelven a enchufar
      for (const f of this.fixers) {
        const [tx, ty] = PLUGS[f.i];
        if (f.flee) { f.y -= 120 * dt * f.from; continue; } // huye por donde vino
        const dx = tx - f.x, dy = ty - f.y, dist = Math.hypot(dx, dy);
        if (dist < 6) {
          if (this.plugs[f.i].st === 'pulled') { this.plugs[f.i] = { st: 'closed', t: 0 }; this.plugSpr[f.i].setTexture('plug_c'); Sound.sfx('bad'); this.cameras.main.shake(200, 0.004); this.bar(); }
          f.gone = true;
        } else { f.x += (dx / dist) * 34 * dt; f.y += (dy / dist) * 34 * dt; }
      }
      this.fixers = this.fixers.filter((f) => (!f.gone && f.y > 0 && f.y < 190 ? true : (f.spr.destroy(), false)));
    } else Input.clear();

    // Dibujo
    const side = p.dir === 'left' || p.dir === 'right';
    this.pSpr.setTexture(`colgadin_${side ? 'side' : p.dir}_${Math.floor(p.anim / 0.15) % 2}`).setFlipX(p.dir === 'left').setPosition(Math.round(p.x), Math.round(p.y)).setDepth(10);
    for (const c of this.clones) c.spr.setPosition(Math.round(c.x), Math.round(c.y)).setTexture(`clon_down_${this.done ? 0 : Math.floor(time / 160) % 2}`).setVisible(c.y > 38 && c.y < 166);
    for (const f of this.fixers) f.spr.setPosition(Math.round(f.x), Math.round(f.y)).setTexture(`clon_fix_${Math.floor(time / 120) % 2}`); // casco de obra y llave inglesa
    this.plugs.forEach((q, i) => { if (q.st !== 'pulled') this.plugSpr[i].setTexture(q.st === 'open' ? 'plug_o' : 'plug_c'); });
    const b = this.belt.clear().fillStyle(0x6a6f7a), off = this.done ? 0 : (time / 1000 * BELT_V) % 16;
    LANES.forEach((x, k) => { for (let y = 40 + (LANE_DIR[k] > 0 ? off : 16 - off); y < 162; y += 16) b.fillRect(x - LW / 2 + 3, y, LW - 6, 2); });
    const fx = this.fx.clear();
    this.plugs.forEach((q, i) => {
      const [x, y] = PLUGS[i];
      if (q.st === 'open') fx.lineStyle(2, 0xffe066, 0.5 + 0.5 * Math.sin(time / 80)).strokeRect(x - 11, y - 10, 22, 20);
      if (q.st === 'pulled' && Math.floor(time / 90 + i) % 3 === 0) fx.fillStyle(0xffe066).fillRect(x - 4 + (i * 3) % 8, y - 3, 2, 2);
    });
    if (this.count() >= 3 || this.done) for (let i = 0; i < 6; i++) fx.fillStyle(0x999999, 0.5).fillCircle(30 + i * 52 + Math.sin(time / 300 + i) * 6, 30 - ((time / 40 + i * 9) % 30), 4);
  }
}
