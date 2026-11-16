// Minijuego: ¡Que no te quiten la tarta! (escolta)
// Colgadín lleva una tarta de cuatro pisos desde Sweet Famosa hasta Narwal. Mantener acción = abrazar la tarta:
// no se mueve, pero nadie puede quitársela. Si un clon lo toca sin abrazo se lleva un piso y se sienta cerca;
// hay cinco segundos para tocarlo y recuperarlo. El último piso nunca se pierde.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

const SEG = 520, LEN = SEG * 3, Y0 = 100, Y1 = 152, GOAL = LEN - 70;
const LAYER = [0xf7a8c0, 0xfff3dc, 0x9fc86a, 0x4a2c1e]; // de abajo arriba
const NAMES = ['Sweet Famosa', 'Patio helado', 'Muelle'];

export class TartaScene extends Phaser.Scene {
  constructor() { super('tarta'); }

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#1c1c22').fadeIn(250);
    cam.setBounds(0, 0, LEN, 180);
    UI.hud(false);
    Sound.music('sweetfamosa');
    this.background();
    this.narwal = this.add.image(LEN - 26, 150, 'narwal').setOrigin(0.5, 1).setDepth(5);
    this.hel = this.add.image(10, 130, 'heladoncio_side_0').setOrigin(0.5, 1).setDepth(9);
    this.warn = this.add.image(0, 0, 'bubble').setOrigin(0.5, 1).setDepth(40).setVisible(false);
    this.pSpr = this.add.image(0, 0, 'colgadin_side_0').setOrigin(0.5, 1).setDepth(10);
    this.cake = this.add.graphics().setDepth(11);
    this.p = { x: 40, y: 128, vx: 0, vy: 0, anim: 0, face: 1 };
    this.layers = 4; this.clones = []; this.spawnT = 2; this.lock = true; this.seg = -1; this.hug = false;
    Input.clear();
    UI.say('Heladoncio', [
      'Aquí la tienes: cuatro pisos. Fresa, chocolate blanco, pistacho y chocolate negro. Hay que llevarla hasta Narwal.',
      'Quedan clones despistados por ahí. Si se acerca uno, ABRAZA la tarta (mantén el botón de acción): no podrás andar, pero no te la quitan.',
      'Si te roban un piso, toca al ladrón antes de cinco segundos y lo recuperas. Yo voy detrás y te aviso de los que vengan por la espalda.',
    ]).then(() => { this.lock = false; });
  }

  background() {
    const g = this.add.graphics();
    // Tramo 1: Sweet Famosa por dentro, con sus cascadas y panettones desbordados
    g.fillStyle(0x24242c).fillRect(0, 0, SEG, 96).fillStyle(0x3a2a30).fillRect(0, 96, SEG, 84);
    for (let x = 0; x < SEG; x += 16) g.fillStyle(x % 32 ? 0x45323a : 0x3a2a30).fillRect(x, 96, 16, 84);
    [[0x4a2c1e, 0x6b4030], [0xfff3dc, 0xffffff], [0xc98a4e, 0xe0a868], [0x9fc86a, 0xc0e090]].forEach(([c, l], i) => {
      for (const x of [60 + i * 46, 300 + i * 46]) {
        g.fillStyle(0x6a6f7a).fillRect(x - 3, 8, 26, 6).fillStyle(c).fillRect(x, 14, 20, 82).fillStyle(l).fillRect(x + 4, 14, 3, 82).fillRect(x + 13, 30, 2, 40).fillStyle(c).fillEllipse(x + 10, 97, 34, 8);
      }
    });
    for (const x of [20, 250, 480]) {
      g.fillStyle(0xd9a35a).fillRect(x, 70, 22, 26).fillStyle(0xb8742e).fillEllipse(x + 11, 70, 26, 14).fillStyle(0xfff3dc).fillEllipse(x + 11, 66, 22, 10).fillRect(x - 2, 68, 4, 14).fillRect(x + 20, 68, 3, 20).fillRect(x + 9, 70, 3, 9);
    }
    g.fillStyle(0x5af08a); for (let x = 190; x < 250; x += 6) g.fillRect(x, 3, 4, 2);
    // Tramo 2: patio helado
    g.fillStyle(0x9fd0ee).fillRect(SEG, 0, SEG, 96).fillStyle(0xf4f8fb).fillRect(SEG, 82, SEG, 14).fillStyle(0xbfe3f7).fillRect(SEG, 96, SEG, 84);
    g.fillStyle(0xe8f6fd); for (let i = 0; i < 40; i++) g.fillRect(SEG + (i * 53) % SEG, 100 + (i * 29) % 76, 10, 1);
    for (let x = SEG + 30; x < SEG * 2; x += 90) this.add.image(x, 96, 'pine_snow').setOrigin(0.5, 1);
    this.add.image(SEG + 250, 96, 'snowman').setOrigin(0.5, 1);
    // Tramo 3: muelle
    g.fillStyle(0x9fd0ee).fillRect(SEG * 2, 0, SEG, 60).fillStyle(0x3f8fd8).fillRect(SEG * 2, 60, SEG, 120).fillStyle(0xa8743c).fillRect(SEG * 2, 96, SEG - 50, 66);
    g.fillStyle(0x8a5a2a); for (let x = SEG * 2; x < LEN - 50; x += 16) g.fillRect(x, 96, 1, 66);
    g.fillStyle(0x6fb4ee); for (let i = 0; i < 30; i++) g.fillRect(SEG * 2 + (i * 47) % SEG, 64 + (i * 13) % 30, 12, 1);
  }

  exit() {
    if (this.lock || UI.busy) return;
    this.lock = true; UI.minibar(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.lock) this.win(); }

  spawn(seg) {
    const cam = this.cameras.main, p = this.p;
    const mk = (fromLeft) => this.clones.push({
      x: fromLeft ? cam.scrollX - 14 : cam.scrollX + 334, y: Y0 + Math.random() * (Y1 - Y0), dir: fromLeft ? 1 : -1,
      v: [36, 44, 54][seg], st: 'walk', t: 0, spr: this.add.image(0, 0, 'clon_down_0').setOrigin(0.5, 1).setDepth(8),
    });
    if (p.x > GOAL - 150) return;
    mk(false);
    if (seg === 2) mk(true);
  }

  async win() {
    this.lock = true;
    UI.minibar(null);
    await SCRIPTS.tartaDone(this.layers);
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000, p = this.p, cam = this.cameras.main;
    const seg = Math.min(2, Math.floor(p.x / SEG)), ice = seg === 1;
    if (seg !== this.seg) { this.seg = seg; UI.zone(NAMES[seg]); }
    if (!this.lock && !UI.busy) {
      const d = Input.dir(), want = !!Input.held.a, speed = Math.hypot(p.vx, p.vy);
      this.hug = want && (!ice || speed < 14);
      if (ice) { // el hielo resbala: hay que frenar antes de poder abrazar
        if (!want) { p.vx += d.x * 170 * dt; p.vy += d.y * 170 * dt; }
        const fr = Math.exp(-(want ? 2.2 : 1.1) * dt); p.vx *= fr; p.vy *= fr;
        const s = Math.hypot(p.vx, p.vy); if (s > 85) { p.vx *= 85 / s; p.vy *= 85 / s; }
      } else if (this.hug) { p.vx = p.vy = 0; } else { const n = Math.hypot(d.x, d.y) || 1; p.vx = (d.x / n) * 62; p.vy = (d.y / n) * 62; }
      if (this.hug && !ice) { p.vx = p.vy = 0; }
      p.x = Phaser.Math.Clamp(p.x + p.vx * dt, 14, LEN - 40); p.y = Phaser.Math.Clamp(p.y + p.vy * dt, Y0, Y1);
      if (Math.abs(p.vx) > 4) { p.face = Math.sign(p.vx); p.anim += dt; }

      if ((this.spawnT -= dt) <= 0) { this.spawnT = [2.3, 2.0, 2.5][seg]; this.spawn(seg); }
      for (const c of this.clones) {
        const dist = Math.hypot(c.x - p.x, c.y - p.y);
        if (c.st === 'walk') {
          c.x += c.dir * c.v * dt; c.y += Math.sign(p.y - c.y) * 16 * dt;
          if (dist < 12) {
            if (this.hug || this.layers <= 1) { c.st = 'flee'; c.dir = -c.dir; Sound.sfx('bump'); if (this.hug) UI.toast('{cake} ¡Abrazo a tiempo! El clon se va con las pezuñas vacías.'); }
            else { this.layers--; c.st = 'thief'; c.t = 5; c.col = LAYER[this.layers]; c.x += c.dir * 26; Sound.sfx('bad'); UI.toast('¡Te han quitado un piso! Tócalo antes de 5 segundos.'); }
          }
        } else if (c.st === 'thief') {
          if (dist < 13) { this.layers++; c.st = 'gone'; Sound.sfx('get'); UI.toast('¡Piso recuperado!'); }
          else if ((c.t -= dt) <= 0) { c.st = 'flee'; c.dir = c.x < p.x ? -1 : 1; c.carry = true; }
        } else if (c.st === 'flee') { c.x += c.dir * 110 * dt; }
        if (c.x < cam.scrollX - 60 || c.x > cam.scrollX + 380) c.st = 'gone';
      }
      this.clones = this.clones.filter((c) => (c.st !== 'gone' ? true : (c.spr.destroy(), false)));
      if (Input.take('b')) this.exit();
      if (p.x >= GOAL) this.win();
      UI.minibar(`¡Que no te quiten la tarta! · Pisos: ${this.layers}/4`, { exit: () => this.exit() });
    }
    Input.just = {};

    // Dibujo
    cam.scrollX = Phaser.Math.Clamp(p.x - 120, 0, LEN - 320);
    this.pSpr.setPosition(Math.round(p.x), Math.round(p.y)).setFlipX(p.face < 0).setTexture(`colgadin_side_${this.hug ? 0 : Math.floor(p.anim / 0.15) % 2}`).setDepth(p.y);
    const g = this.cake.clear().setDepth(p.y + 1);
    const cx = Math.round(p.x + (this.hug ? 0 : p.face * 3)), top = Math.round(p.y) - (this.hug ? 12 : 17);
    g.fillStyle(0xf4f4ee).fillRect(cx - 10, top, 20, 2);
    for (let i = 0; i < this.layers; i++) { const w = 16 - i * 3; g.fillStyle(0x2b2320).fillRect(cx - w / 2 - 1, top - 6 - i * 5, w + 2, 6).fillStyle(LAYER[i]).fillRect(cx - w / 2, top - 5 - i * 5, w, 5).fillStyle(0xffffff, 0.5).fillRect(cx - w / 2, top - 5 - i * 5, w, 1); }
    if (this.hug) g.lineStyle(1, 0xffe066, 0.6 + 0.4 * Math.sin(time / 80)).strokeCircle(cx, p.y - 14, 15);
    let behind = false;
    for (const c of this.clones) {
      c.spr.setPosition(Math.round(c.x), Math.round(c.y)).setDepth(c.y).setTexture(`clon_down_${c.st === 'thief' ? 0 : Math.floor(time / 170) % 2}`);
      if (c.st === 'thief' || c.carry) g.fillStyle(0x2b2320).fillRect(c.x - 7, c.y - 26, 14, 6).fillStyle(c.col).fillRect(c.x - 6, c.y - 25, 12, 4);
      if (c.st === 'thief') g.fillStyle(0xe2574c).fillRect(c.x - 8, c.y - 31, 16 * c.t / 5, 2);
      if (c.st === 'walk' && c.dir > 0 && c.x < p.x) behind = true;
    }
    const hx = Phaser.Math.Clamp(p.x - 30, cam.scrollX + 12, LEN);
    this.hel.setPosition(Math.round(this.hel.x + (hx - this.hel.x) * 0.08), 132).setTexture(`heladoncio_side_${Math.floor(time / 220) % 2}`);
    this.warn.setVisible(behind).setPosition(this.hel.x, 112);
  }
}
