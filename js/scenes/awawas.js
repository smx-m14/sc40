// Minijuego: los awawas de Kapadokya (tipo «whack-a-mole», pero con cosquillas).
// Los awawas asoman de sus madrigueras. Algunos llevan un calcetín robado en la boca: a esos hay que hacerles
// cosquillas (tres veces por calcetín) para que lo suelten. Si se las haces a uno que no lleva nada, protesta
// («¡AWAWA!») y pierdes una de las cosquillas que llevabas. Con cada calcetín asoman menos tiempo y hay más despistes.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

const HX = [100, 160, 220], HY = [78, 112, 146];
const NEED = 3; // cosquillas por calcetín
const LEVELS = [
  { up: 1.5, every: 0.85, sock: 0.5 },
  { up: 1.1, every: 0.65, sock: 0.4 },
  { up: 0.8, every: 0.5, sock: 0.33 },
];
export const STOLEN = ['s11', 's12', 's13'];
const SOCK_TEX = ['sock_5', 'sock_6', 'sock_7'];

export class AwawasScene extends Phaser.Scene {
  constructor() { super('awawas'); }

  create() {
    this.cameras.main.setBackgroundColor('#ecd9b0').fadeIn(250);
    UI.hud(false);
    Sound.music('isla');
    const g = this.add.graphics();
    g.fillStyle(0xbfe3f7).fillRect(-80, 0, 480, 46);
    g.fillStyle(0xf7c8b0).fillRect(-80, 40, 480, 8);
    g.fillStyle(0xecd9b0).fillRect(-80, 46, 480, 140);
    g.fillStyle(0xe2c896); for (let i = 0; i < 26; i++) g.fillRect(-60 + (i * 53) % 440, 54 + (i * 29) % 120, 14, 2);
    for (const [x, y, s] of [[20, 60, 1.6], [58, 52, 1.2], [276, 56, 1.5], [308, 62, 1.1], [-30, 70, 1.4], [350, 70, 1.4]]) this.add.image(x, y, 'chimney').setOrigin(0.5, 1).setScale(s);
    for (const [x, y] of [[130, 22], [214, 14], [40, 16]]) this.add.image(x, y, 'balloon').setScale(0.9);
    this.holes = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const x = HX[c], y = HY[r];
      this.add.image(x, y, 'burrow').setScale(2).setDepth(r * 10 + 1);
      const spr = this.add.image(x, y, 'awawa_down_0').setOrigin(0.5, 1).setScale(2).setDepth(r * 10 + 2).setVisible(false);
      const sock = this.add.image(x + 12, y - 12, 'sock_5').setDepth(r * 10 + 3).setVisible(false);
      this.add.image(x, y + 5, 'burrow_front').setScale(2).setDepth(r * 10 + 4);
      this.holes.push({ x, y, spr, sock, st: 'down', t: 0, has: false });
    }
    this.cursor = this.add.graphics().setDepth(100);
    this.cur = { c: 1, r: 1 };
    this.level = 0; this.hits = 0; this.spawnT = 1; this.lock = true; this.nextMove = 0;
    this.bar();
    Input.clear();
    UI.say('Siri', [
      'Mis sobrinos asoman de las madrigueras. Los que llevan un calcetín en la boca son los que te interesan.',
      'Muévete con las flechas y hazles cosquillas con el botón de acción. Con tres cosquillas sueltan el calcetín.',
      'Pero si se las haces a uno que no lleva nada, se enfada y pierdes una de las que llevabas. Y cada calcetín es más difícil que el anterior.',
    ]).then(() => { this.lock = false; });
  }

  bar() { UI.minibar(`Kapadokya · Calcetín ${Math.min(this.level + 1, 3)} de 3 · Cosquillas ${this.hits}/${NEED}`, { exit: () => this.exit() }); }
  exit() {
    if (this.lock || UI.busy) return;
    this.lock = true; UI.minibar(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.lock) { this.level = LEVELS.length; this.win(); } }

  tickle() {
    const h = this.holes[this.cur.r * 3 + this.cur.c];
    if (h.st !== 'up') return Sound.sfx('bump');
    h.st = 'hit'; h.t = 0.35;
    if (!h.has) {
      this.hits = Math.max(0, this.hits - 1);
      Sound.sfx('bad');
      this.cameras.main.shake(160, 0.005);
      UI.toast('¡AWAWA! Ese no llevaba nada. Pierdes una cosquilla.');
      return this.bar();
    }
    this.hits++;
    Sound.sfx('rep');
    if (this.hits < NEED) return this.bar();
    // Calcetín recuperado
    Sound.sfx('get');
    UI.toast(`{${SOCK_TEX[this.level]}} ¡Ha soltado el calcetín! (${this.level + 1} de 3)`);
    this.level++; this.hits = 0;
    for (const o of this.holes) if (o.st === 'up') { o.st = 'hit'; o.t = 0.3; }
    this.spawnT = 1.2;
    if (this.level >= LEVELS.length) return this.win();
    this.bar();
  }

  async win() {
    this.lock = true;
    UI.minibar(null);
    await new Promise((r) => this.time.delayedCall(700, r));
    await SCRIPTS.awawasDone();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000, L = LEVELS[Math.min(this.level, LEVELS.length - 1)];
    if (!this.lock && !UI.busy) {
      if ((this.spawnT -= dt) <= 0) {
        this.spawnT = L.every * (0.7 + Math.random() * 0.6);
        const free = this.holes.filter((h) => h.st === 'down');
        if (free.length > 3) {
          const h = free[Math.floor(Math.random() * free.length)];
          // siempre hay como mucho un calcetín a la vista, para que no se pueda acertar al tuntún
          h.has = !this.holes.some((o) => o.st === 'up' && o.has) && Math.random() < L.sock + 0.25;
          h.st = 'up'; h.t = L.up * (0.85 + Math.random() * 0.3); h.rise = 0;
          h.sock.setTexture(SOCK_TEX[this.level]);
        }
      }
      if (Input.take('a')) this.tickle();
      if (Input.take('b')) return this.exit();
      const d = Input.dir();
      if (!d.x && !d.y) this.nextMove = 0;
      else if (time >= this.nextMove) {
        this.nextMove = time + 130;
        this.cur.c = Phaser.Math.Clamp(this.cur.c + d.x, 0, 2);
        this.cur.r = Phaser.Math.Clamp(this.cur.r + (d.x ? 0 : d.y), 0, 2);
      }
    } else Input.clear();

    for (const h of this.holes) {
      if (h.st === 'up') { h.rise = Math.min(1, (h.rise || 0) + dt * 7); if (!this.lock && (h.t -= dt) <= 0) h.st = 'hide'; }
      else if (h.st === 'hit') { if ((h.t -= dt) <= 0) h.st = 'hide'; }
      else if (h.st === 'hide') { h.rise = Math.max(0, (h.rise || 0) - dt * 8); if (h.rise <= 0) h.st = 'down'; }
      const vis = h.st !== 'down', rise = h.rise || 0;
      h.spr.setVisible(vis).setY(h.y + 6 - rise * 6).setCrop(0, 0, 18, 6 + rise * 12)
        .setTexture(`awawa_down_${h.st === 'hit' ? 1 : Math.floor(time / 200) % 2}`).setAngle(h.st === 'hit' ? Math.sin(time / 30) * 8 : 0);
      h.sock.setVisible(vis && h.has && h.st !== 'hide' && rise > 0.6).setPosition(h.x + 13, h.y - 14 - rise * 4);
    }
    const c = this.cursor.clear(), x = HX[this.cur.c], y = HY[this.cur.r];
    c.lineStyle(2, 0xe2574c, 0.7 + 0.3 * Math.sin(time / 120)).strokeRect(x - 22, y - 30, 44, 42);
    c.fillStyle(0xe2574c).fillTriangle(x - 5, y - 36, x + 5, y - 36, x, y - 30);
  }
}
