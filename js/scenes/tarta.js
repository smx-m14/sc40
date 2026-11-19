// Minijuego: ¡Que no te quiten la tarta! (escolta)
// Colgadín lleva una tarta de cuatro pisos desde Sweet Famosa hasta Narwal, en el muelle. Si un clon lo toca, se
// lleva el piso de ARRIBA (el que haya en ese momento) y se queda quieto relamiéndose: hay que ponerse a su lado y
// pulsar acción tres veces antes de que se acabe su tiempo para recuperarlo. Si se escapa con él, hay que volver al
// principio (Sweet Famosa) a por pisos nuevos: Narwal solo se lleva la tarta entera. Tres tramos, cada uno más
// difícil: Sweet Famosa (pocos clones), el patio helado (resbala, pocos clones) y el muelle (muchos, por los dos lados).
// Al ganar, Colgadín aparece en el muelle junto a Narwal; si se sale a medias, vuelve a la puerta de Sweet Famosa.
import { State } from '../state.js';
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

const SEG = 416, LEN = SEG * 3, Y0 = 100, Y1 = 152, GOAL = LEN - 70; // tramos un 20 % más cortos que antes (520)
const LAYER = [0xf7a8c0, 0xfff3dc, 0x9fc86a, 0x4a2c1e]; // de abajo arriba: fresa, chocolate blanco, pistacho, chocolate negro
const LAYER_NAME = ['fresa', 'chocolate blanco', 'pistacho', 'chocolate negro'];
const NAMES = ['Sweet Famosa', 'Patio helado', 'Muelle'];
const REFILL_X = 70;          // al volver aquí (Sweet Famosa) Heladoncio repone los pisos que falten
const STEAL_T = 9.6, HITS = 3; // segundos para recuperar un piso y pulsaciones que hacen falta
// Por tramo: cada cuánto sale una tanda, velocidad de los clones, cuántos por la derecha y por la izquierda
const WAVES = [ // clones por segundo (aprox.): 0,7 · 0,8 · 1,6 — el muelle sigue siendo lo más difícil
  { every: 2.0, v: 42, right: 1, left: 0, extra: 0.35 },
  { every: 1.8, v: 48, right: 1, left: 0, extra: 0.5 },
  { every: 1.6, v: 56, right: 2, left: 0, extra: 0.6 },  // el muelle: el extra sale por la izquierda o la derecha
];
const tile = (tx, ty, dir) => ({ map: 'helada', x: tx * 16 + 8, y: ty * 16 + 12, dir });

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
    this.helTex = State.flag('hat') ? 'heladoncioh' : 'heladoncio'; // con su sombrero si ya se lo devolvieron
    this.hel = this.add.image(10, 130, this.helTex + '_side_0').setOrigin(0.5, 1).setDepth(9);
    this.warn = this.add.image(0, 0, 'bubble').setOrigin(0.5, 1).setDepth(40).setVisible(false);
    this.pSpr = this.add.image(0, 0, 'colgadin_side_0').setOrigin(0.5, 1).setDepth(10);
    this.cake = this.add.graphics().setDepth(11);
    this.p = { x: 40, y: 128, vx: 0, vy: 0, anim: 0, face: 1 };
    this.stack = [0, 1, 2, 3]; // pisos que lleva, de abajo arriba (índices de LAYER)
    this.clones = []; this.spawnT = 2; this.lock = true; this.seg = -1; this.safeT = 0; this.goalMsg = 0;
    this.leaving = false; this.done = false; this.helFace = 1;
    Input.clear();
    UI.say('Heladoncio', [
      'Aquí la tienes: cuatro pisos. Fresa, chocolate blanco, pistacho y chocolate negro. Hay que llevarla hasta Narwal, al muelle.',
      'Quedan clones despistados por el camino. Si uno te toca, se lleva el piso de arriba y se queda un momento relamiéndose.',
      'Ponte a su lado y pulsa el botón de acción tres veces para recuperarlo. Si tardas demasiado se escapa con él… y tocará volver aquí, a Sweet Famosa, a por otro piso.',
      'Narwal solo se lleva la tarta entera. Yo voy detrás y te aviso de los que vengan por la espalda.',
    ]).then(() => { this.lock = false; });
  }

  background() {
    const g = this.add.graphics();
    // Tramo 1: Sweet Famosa por dentro, con sus cascadas y panettones desbordados
    g.fillStyle(0x24242c).fillRect(0, 0, SEG, 96).fillStyle(0x3a2a30).fillRect(0, 96, SEG, 84);
    for (let x = 0; x < SEG; x += 16) g.fillStyle(x % 32 ? 0x45323a : 0x3a2a30).fillRect(x, 96, 16, 84);
    [[0x4a2c1e, 0x6b4030], [0xfff3dc, 0xffffff], [0xc98a4e, 0xe0a868], [0x9fc86a, 0xc0e090]].forEach(([c, l], i) => {
      for (const x of [60 + i * 40, 240 + i * 40]) {
        g.fillStyle(0x6a6f7a).fillRect(x - 3, 8, 26, 6).fillStyle(c).fillRect(x, 14, 20, 82).fillStyle(l).fillRect(x + 4, 14, 3, 82).fillRect(x + 13, 30, 2, 40).fillStyle(c).fillEllipse(x + 10, 97, 34, 8);
      }
    });
    for (const x of [20, 205, 385]) {
      g.fillStyle(0xd9a35a).fillRect(x, 70, 22, 26).fillStyle(0xb8742e).fillEllipse(x + 11, 70, 26, 14).fillStyle(0xfff3dc).fillEllipse(x + 11, 66, 22, 10).fillRect(x - 2, 68, 4, 14).fillRect(x + 20, 68, 3, 20).fillRect(x + 9, 70, 3, 9);
    }
    // Mesa de los pisos de repuesto, al principio
    g.fillStyle(0x6e4520).fillRect(4, 108, 40, 4).fillRect(8, 112, 3, 14).fillRect(37, 112, 3, 14);
    LAYER.forEach((c, i) => g.fillStyle(0x2b2320).fillRect(7 + i * 9, 101, 8, 7).fillStyle(c).fillRect(8 + i * 9, 102, 6, 5));
    g.fillStyle(0x5af08a); for (let x = 160; x < 210; x += 6) g.fillRect(x, 3, 4, 2);
    // Tramo 2: patio helado
    g.fillStyle(0x9fd0ee).fillRect(SEG, 0, SEG, 96).fillStyle(0xf4f8fb).fillRect(SEG, 82, SEG, 14).fillStyle(0xbfe3f7).fillRect(SEG, 96, SEG, 84);
    g.fillStyle(0xe8f6fd); for (let i = 0; i < 32; i++) g.fillRect(SEG + (i * 53) % SEG, 100 + (i * 29) % 76, 10, 1);
    for (let x = SEG + 30; x < SEG * 2; x += 90) this.add.image(x, 96, 'pine_snow').setOrigin(0.5, 1);
    this.add.image(SEG + 200, 96, 'snowman').setOrigin(0.5, 1);
    // Tramo 3: muelle
    g.fillStyle(0x9fd0ee).fillRect(SEG * 2, 0, SEG, 60).fillStyle(0x3f8fd8).fillRect(SEG * 2, 60, SEG, 120).fillStyle(0xa8743c).fillRect(SEG * 2, 96, SEG - 50, 66);
    g.fillStyle(0x8a5a2a); for (let x = SEG * 2; x < LEN - 50; x += 16) g.fillRect(x, 96, 1, 66);
    g.fillStyle(0x6fb4ee); for (let i = 0; i < 24; i++) g.fillRect(SEG * 2 + (i * 47) % SEG, 64 + (i * 13) % 30, 12, 1);
  }

  bar() { UI.minibar(`¡Que no te quiten la tarta! · Pisos: ${this.stack.length}/4`, { exit: () => this.exit() }); }
  exit() {
    if (this.lock || UI.busy || this.leaving) return;
    this.lock = true; this.leaving = true; UI.minibar(null);
    State.d.pos = tile(22, 9, 'up'); // a medias: de vuelta a la puerta de Sweet Famosa
    this.scene.start('world');
  }
  debugWin() { if (!this.lock) { this.stack = [0, 1, 2, 3]; this.win(); } }

  spawn(seg) {
    const cam = this.cameras.main, p = this.p, w = WAVES[seg];
    if (p.x > GOAL - 90) return;
    const mk = (fromLeft) => this.clones.push({
      x: fromLeft ? cam.scrollX - 14 : cam.scrollX + cam.width + 14, y: Y0 + Math.random() * (Y1 - Y0), dir: fromLeft ? 1 : -1,
      v: w.v, st: 'walk', t: 0, hits: 0, spr: this.add.image(0, 0, 'clon_down_0').setOrigin(0.5, 1).setDepth(8),
    });
    for (let i = 0; i < w.right; i++) mk(false);
    for (let i = 0; i < w.left; i++) mk(true);
    if (Math.random() < w.extra) mk(seg === 2 ? Math.random() < 0.5 : false);
  }

  // Devuelve un piso a la tarta en su sitio (de abajo arriba), para que siga siendo la misma tarta
  putBack(layer) { this.stack.push(layer); this.stack.sort((a, b) => a - b); }

  async win() {
    this.lock = true; this.done = true;
    UI.minibar(null);
    await SCRIPTS.tartaDone(this.stack.length);
    State.d.pos = tile(20, 23, 'right'); // al terminar, Colgadín se queda en el muelle, junto a Narwal
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000, p = this.p, cam = this.cameras.main;
    const seg = Math.min(2, Math.floor(p.x / SEG)), ice = seg === 1;
    if (seg !== this.seg) { this.seg = seg; UI.zone(NAMES[seg]); }
    if (!this.lock && !UI.busy) {
      const d = Input.dir();
      if (ice) { // el hielo resbala
        p.vx += d.x * 170 * dt; p.vy += d.y * 170 * dt;
        const fr = Math.exp(-1.1 * dt); p.vx *= fr; p.vy *= fr;
        const s = Math.hypot(p.vx, p.vy); if (s > 85) { p.vx *= 85 / s; p.vy *= 85 / s; }
      } else { const n = Math.hypot(d.x, d.y) || 1; p.vx = (d.x / n) * 62; p.vy = (d.y / n) * 62; }
      p.x = Phaser.Math.Clamp(p.x + p.vx * dt, 14, LEN - 40); p.y = Phaser.Math.Clamp(p.y + p.vy * dt, Y0, Y1);
      if (Math.abs(p.vx) > 4) { p.face = Math.sign(p.vx); p.anim += dt; }
      this.safeT = Math.max(0, this.safeT - dt);

      // De vuelta en Sweet Famosa: Heladoncio repone los pisos perdidos (los que se llevó un clon que escapó; los que
      // aún tiene un clon quieto se pueden recuperar, así que esos no)
      if (p.x < REFILL_X) {
        const held = new Set(this.clones.filter((c) => c.st === 'thief').map((c) => c.layer));
        const lost = [0, 1, 2, 3].filter((l) => !this.stack.includes(l) && !held.has(l));
        if (lost.length) { lost.forEach((l) => this.putBack(l)); Sound.sfx('get'); UI.toast('{cake} Heladoncio te repone los pisos que faltaban. ¡Otra vez al muelle!'); }
      }

      if ((this.spawnT -= dt) <= 0) { this.spawnT = WAVES[seg].every; this.spawn(seg); }
      const press = Input.take('a');
      let pressUsed = false;
      for (const c of this.clones) {
        const dist = Math.hypot(c.x - p.x, c.y - p.y);
        if (c.st === 'walk') {
          c.x += c.dir * c.v * dt; c.y += Math.sign(p.y - c.y) * 16 * dt;
          if (dist < 12 && this.safeT <= 0) {
            if (!this.stack.length) { c.st = 'flee'; c.dir = -c.dir; Sound.sfx('bump'); }
            else { // se lleva el piso de arriba, el que hay ahora mismo
              c.layer = this.stack.pop(); c.col = LAYER[c.layer]; c.st = 'thief'; c.t = STEAL_T; c.hits = 0; c.x += c.dir * 26;
              this.safeT = 0.8; Sound.sfx('bad');
              UI.toast(`¡Te han quitado el piso de ${LAYER_NAME[c.layer]}! Ponte a su lado y pulsa acción tres veces.`);
            }
          }
        } else if (c.st === 'thief') {
          if (press && !pressUsed && dist < 18) { // tres pulsaciones a su lado para quitárselo
            pressUsed = true; c.hits++; Sound.sfx('rep');
            if (c.hits >= HITS) { this.putBack(c.layer); c.st = 'flee'; c.dir = c.x < p.x ? -1 : 1; Sound.sfx('get'); UI.toast(`¡Piso de ${LAYER_NAME[c.layer]} recuperado!`); }
          }
          if (c.st === 'thief' && (c.t -= dt) <= 0) {
            c.st = 'flee'; c.dir = c.x < p.x ? -1 : 1; c.carry = true; Sound.sfx('bad');
            UI.toast(`Se ha escapado con el piso de ${LAYER_NAME[c.layer]}. Vuelve a Sweet Famosa a por otro.`);
          }
        } else if (c.st === 'flee') { c.x += c.dir * 110 * dt; }
        if (c.x < cam.scrollX - 60 || c.x > cam.scrollX + cam.width + 60) c.st = 'gone';
      }
      this.clones = this.clones.filter((c) => (c.st !== 'gone' ? true : (c.spr.destroy(), false)));
      if (Input.take('b')) return this.exit();
      // En el muelle: Narwal solo se lleva la tarta entera
      if (p.x >= GOAL) {
        if (this.stack.length >= 4) this.win();
        else {
          p.x = GOAL - 1; p.vx = Math.min(p.vx, 0);
          if (time > this.goalMsg) { this.goalMsg = time + 3000; Sound.sfx('bump'); UI.toast(`Narwal solo se lleva la tarta entera (${this.stack.length}/4). Vuelve a Sweet Famosa a por los pisos que faltan.`); }
        }
      }
      this.bar();
    }
    Input.just = {};

    // Dibujo
    cam.scrollX = Phaser.Math.Clamp(p.x - 120, 0, LEN - cam.width);
    this.pSpr.setPosition(Math.round(p.x), Math.round(p.y)).setFlipX(p.face < 0).setTexture(`colgadin_side_${Math.floor(p.anim / 0.15) % 2}`).setDepth(p.y);
    const g = this.cake.clear().setDepth(p.y + 1);
    const cx = Math.round(p.x + p.face * 3), top = Math.round(p.y) - 17;
    g.fillStyle(0xf4f4ee).fillRect(cx - 10, top, 20, 2);
    this.stack.forEach((layer, i) => { const w = 16 - i * 3; g.fillStyle(0x2b2320).fillRect(cx - w / 2 - 1, top - 6 - i * 5, w + 2, 6).fillStyle(LAYER[layer]).fillRect(cx - w / 2, top - 5 - i * 5, w, 5).fillStyle(0xffffff, 0.5).fillRect(cx - w / 2, top - 5 - i * 5, w, 1); });
    let behind = false;
    for (const c of this.clones) {
      c.spr.setPosition(Math.round(c.x), Math.round(c.y)).setDepth(c.y).setTexture(`clon_down_${c.st === 'thief' ? 0 : Math.floor(time / 170) % 2}`);
      if (c.st === 'thief' || c.carry) g.fillStyle(0x2b2320).fillRect(c.x - 7, c.y - 26, 14, 6).fillStyle(c.col).fillRect(c.x - 6, c.y - 25, 12, 4);
      if (c.st === 'thief') {
        g.fillStyle(0xe2574c).fillRect(c.x - 8, c.y - 31, 16 * c.t / STEAL_T, 2);                // tiempo que queda
        for (let k = 0; k < HITS; k++) g.fillStyle(k < c.hits ? 0xffe066 : 0x565a66).fillRect(c.x - 7 + k * 5, c.y - 36, 4, 3); // pulsaciones
      }
      if (c.st === 'walk' && c.dir > 0 && c.x < p.x) behind = true;
    }
    const hx = Phaser.Math.Clamp(p.x - 30, cam.scrollX + 12, LEN);
    const nx = this.hel.x + (hx - this.hel.x) * 0.08;
    if (Math.abs(nx - this.hel.x) > 0.3) this.helFace = Math.sign(nx - this.hel.x); // mira hacia donde camina (también hacia atrás)
    this.hel.setPosition(Math.round(nx), 132).setTexture(`${this.helTex}_side_${Math.floor(time / 220) % 2}`).setFlipX(this.helFace < 0);
    this.warn.setVisible(behind).setPosition(this.hel.x, 112);
  }
}
