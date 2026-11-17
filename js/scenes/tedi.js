// Minijuego (jefe): la máquina clonadora de TEDI.
// Escupe clones por tres carriles; si tocan a Colgadín lo empujan hasta la entrada (sin daño ni vidas).
// Cada poco se abre la tapa de un enchufe: hay que llegar y arrancarlo. Con cada enchufe la máquina se acelera.
// Los ganchos permiten balancearse por encima de un carril sin que los clones te toquen.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

const LANES = [96, 160, 224], LW = 30;       // centro y ancho de cada carril
const PLUGS = [128, 192, 276];               // enchufes: entre carriles y a la derecha del todo
const HOOKS = [80, 124];                     // alturas de los ganchos de cada carril
const ENTRY = { x: 30, y: 160 }, SPEED = 72, TOP = 50;
// Por nº de enchufes quitados: cada cuánto sale una tanda, cuántos carriles, velocidad, ráfaga y cuánto dura la tapa abierta
const PHASE = [
  { every: 1.5, lanes: 1, v: 48, burst: 1, open: 4.5 },
  { every: 1.15, lanes: 2, v: 72, burst: 1, open: 3.6 },
  { every: 1.7, lanes: 2, v: 86, burst: 3, open: 2.4 },
];

export class TediScene extends Phaser.Scene {
  constructor() { super('tedi'); }

  create() {
    this.cameras.main.setBackgroundColor('#2b2d34').fadeIn(250);
    UI.hud(false);
    Sound.music('puzle');
    const g = this.add.graphics();
    g.fillStyle(0x3a3d46).fillRect(0, 0, 320, 180);
    for (const x of LANES) { g.fillStyle(0x565a66).fillRect(x - LW / 2, 40, LW, 140); g.fillStyle(0xffe000).fillRect(x - LW / 2 - 2, 40, 2, 140).fillRect(x + LW / 2, 40, 2, 140); }
    // La máquina clonadora
    g.fillStyle(0x6a6f7a).fillRect(40, 0, 262, 38).fillStyle(0x8a8f9a).fillRect(40, 0, 262, 4).fillStyle(0x1a1412).fillRect(40, 38, 262, 3);
    g.fillStyle(0x1f6fd0).fillCircle(160, 18, 15).fillStyle(0xffe000).fillRect(144, 13, 32, 10);
    for (const x of LANES) g.fillStyle(0x14151a).fillRect(x - 12, 26, 24, 14);
    g.fillStyle(0x82cc6a).fillRect(4, 150, 3, 26); // entrada
    this.belt = this.add.graphics();
    this.fx = this.add.graphics().setDepth(20);
    for (const x of LANES) for (const y of HOOKS) this.add.image(x, y - 6, 'hook').setDepth(15);
    this.plugSpr = PLUGS.map((x) => this.add.image(x, 44, 'plug_c').setDepth(3));
    this.pSpr = this.add.image(ENTRY.x, ENTRY.y, 'colgadin_down_0').setOrigin(0.5, 1).setDepth(10);

    this.p = { ...ENTRY, dir: 'down', anim: 0 };
    this.removed = [false, false, false]; this.count = 0; this.done = false;
    this.lid = { i: -1, t: 2.5, open: false };
    this.clones = []; this.spawnT = 1; this.swing = null; this.lock = true; this.smoke = 0;
    this.bar();
    Input.clear();
    UI.say('Colgadín', [
      '¡La máquina clonadora! Cada cerdito que escupe es una copia de Owinken hecha con IA.',
      'Tiene tres enchufes. Cuando se abra la tapa de uno, llego hasta él y lo arranco con la cola (botón de acción).',
      'Junto a un gancho, el botón de acción me balancea por encima del carril. Y si un clon me toca… vuelta a la entrada.',
    ]).then(() => { this.lock = false; });
  }

  bar() { UI.minibar(`TEDI · Enchufes arrancados ${this.count}/3`, { exit: () => this.exit() }); }
  exit() {
    if (this.lock || UI.busy) return;
    this.lock = true; UI.minibar(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.lock) { this.removed = [true, true, true]; this.count = 3; this.win(); } }

  spawn() {
    const ph = PHASE[this.count], lanes = Phaser.Utils.Array.Shuffle([0, 1, 2]).slice(0, ph.lanes);
    for (const l of lanes) for (let b = 0; b < ph.burst; b++) {
      this.clones.push({ x: LANES[l] + (Math.random() * 8 - 4), y: 34 - b * 22, v: ph.v, spr: this.add.image(0, 0, 'clon_down_0').setOrigin(0.5, 1).setDepth(8) });
    }
  }

  action() {
    const p = this.p, l = this.lid;
    if (l.open && Math.abs(p.x - PLUGS[l.i]) < 14 && p.y < TOP + 16) return this.pull(l.i);
    for (const lx of LANES) for (const hy of HOOKS) {
      const dx = p.x - lx;
      if (Math.abs(p.y - hy) < 14 && Math.abs(dx) > 10 && Math.abs(dx) < 36) {
        this.swing = { t: 0, x0: p.x, x1: lx - Math.sign(dx) * 26, y: p.y };
        return Sound.sfx('rep');
      }
    }
    Sound.sfx('bump');
  }

  pull(i) {
    this.removed[i] = true; this.count++;
    this.lid = { i: -1, t: 2.2, open: false };
    Sound.sfx('dig');
    this.cameras.main.shake(400, 0.008).flash(150, 255, 240, 120);
    this.plugSpr[i].setTexture('plug_x');
    this.bar();
    if (this.count >= 3) return this.win();
    UI.toast(['¡Uno fuera! La máquina se acelera…', '¡Dos! Echa humo y escupe clones a ráfagas.'][this.count - 1]);
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
    const dt = Math.min(delta, 50) / 1000, p = this.p;
    if (!this.lock && !UI.busy) {
      // Tapas de los enchufes
      const l = this.lid;
      if ((l.t -= dt) <= 0) {
        if (l.open) { this.plugSpr[l.i].setTexture('plug_c'); this.lid = { i: -1, t: 2.0, open: false }; }
        else {
          const left = [0, 1, 2].filter((i) => !this.removed[i]);
          const i = left[Math.floor(Math.random() * left.length)];
          this.lid = { i, t: PHASE[this.count].open, open: true };
          this.plugSpr[i].setTexture('plug_o');
          Sound.sfx('ok');
        }
      }
      if ((this.spawnT -= dt) <= 0) { this.spawnT = PHASE[this.count].every; this.spawn(); }

      // Colgadín
      if (this.swing) {
        const s = this.swing;
        s.t += dt / 0.42;
        p.x = s.x0 + (s.x1 - s.x0) * Math.min(1, s.t);
        if (s.t >= 1) this.swing = null;
      } else {
        const d = Input.dir();
        if (d.x || d.y) {
          const n = Math.hypot(d.x, d.y);
          p.x = Phaser.Math.Clamp(p.x + (d.x / n) * SPEED * dt, 12, 308);
          p.y = Phaser.Math.Clamp(p.y + (d.y / n) * SPEED * dt, TOP + 6, 174);
          p.dir = d.y < 0 ? 'up' : d.y > 0 ? 'down' : d.x < 0 ? 'left' : 'right';
          p.anim += dt;
        }
        if (Input.take('a')) this.action();
      }
      if (Input.take('b')) this.exit();

      // Clones
      for (const c of this.clones) {
        c.y += c.v * dt;
        if (!this.swing && c.y > 40 && Math.abs(c.x - p.x) < 11 && Math.abs(c.y - p.y) < 10) {
          Sound.sfx('bad');
          UI.toast('¡Oink! Un clon te empuja hasta la entrada.');
          p.x = ENTRY.x; p.y = ENTRY.y;
          this.cameras.main.shake(150, 0.005);
        }
      }
      this.clones = this.clones.filter((c) => (c.y < 190 ? true : (c.spr.destroy(), false)));
    } else Input.clear();

    // Dibujo
    const side = p.dir === 'left' || p.dir === 'right';
    const lift = this.swing ? Math.sin(Math.min(1, this.swing.t) * Math.PI) * 16 : 0;
    this.pSpr.setTexture(`colgadin_${side ? 'side' : p.dir}_${Math.floor(p.anim / 0.15) % 2}`).setFlipX(p.dir === 'left').setPosition(Math.round(p.x), Math.round(p.y - lift)).setDepth(this.swing ? 30 : 10);
    for (const c of this.clones) c.spr.setPosition(Math.round(c.x), Math.round(c.y)).setTexture(`clon_down_${this.done ? 0 : Math.floor(time / 160) % 2}`).setVisible(c.y > 38);
    const b = this.belt.clear().fillStyle(0x6a6f7a);
    const off = this.done ? 0 : (time / 20) % 16;
    for (const x of LANES) for (let y = 40 + off; y < 180; y += 16) b.fillRect(x - LW / 2 + 3, y, LW - 6, 2);
    const f = this.fx.clear();
    if (this.lid.open) { const x = PLUGS[this.lid.i]; f.lineStyle(2, 0xffe066, 0.5 + 0.5 * Math.sin(time / 80)).strokeRect(x - 11, 34, 22, 20); }
    if (this.count >= 2 || this.done) for (let i = 0; i < 6; i++) f.fillStyle(0x999999, 0.5).fillCircle(60 + i * 44 + Math.sin(time / 300 + i) * 6, 30 - ((time / 40 + i * 9) % 30), 4);
  }
}
