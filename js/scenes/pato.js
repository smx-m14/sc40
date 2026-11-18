// Minijuego: acercarse a Patito sin que te vea. Colgadín se mueve libremente por la orilla, entre matas de juncos.
// Patito se gira de vez en cuando (semáforo: verde, amarillo = va a girarse, rojo = mirando). Mientras mira,
// Colgadín tiene que estar escondido: que entre él y Patito haya una mata de juncos… o un capybara, que se cruzan
// despacio por medio y además estorban el paso. Si Patito te ve, vuelves al último escondite seguro.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

const X0 = 14, X1 = 270, Y0 = 82, Y1 = 166, SPEED = 40;
const DUCK = { x: 292, y: 126 }, EYE = { x: 282, y: 108 };
const START = { x: 24, y: 152 };
// Matas de juncos: (cx, cy) es la base. Tapan la vista en un rectángulo de 18x13 y no se pueden atravesar.
// Repartidas para que haya huecos al descubierto entre una sombra y la siguiente.
const CLUMPS = [[60, 110], [104, 150], [128, 100], [176, 128], [214, 92], [222, 160], [252, 124]];
// Escondites seguros a los que se vuelve si Patito te ve (el más avanzado que ya hayas pasado)
const SAFE = [START, { x: 150, y: 130 }, { x: 238, y: 126 }];
// Capybaras que cruzan de arriba abajo
const CAPYS = [{ x: 146, y: 90, v: 13 }, { x: 200, y: 160, v: -11 }];

const segRect = (ax, ay, bx, by, x0, y0, x1, y1) => { // ¿corta el segmento AB al rectángulo?
  let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
};

export class PatoScene extends Phaser.Scene {
  constructor() { super('pato'); }

  create() {
    this.cameras.main.setBackgroundColor('#6fbf5a').fadeIn(250);
    UI.hud(false);
    Sound.music('capybaras');

    const g = this.add.graphics();
    g.fillStyle(0x3f8fd8).fillRect(0, 0, 320, 64);
    g.fillStyle(0x6fb4ee); for (let i = 0; i < 12; i++) g.fillRect(10 + i * 27, 12 + (i % 4) * 12, 12, 1);
    g.fillStyle(0xbfe3f7).fillRect(0, 64, 320, 2);
    g.fillStyle(0x63b04f).fillRect(0, 66, 320, 114);
    g.fillStyle(0x58a346); for (let i = 0; i < 40; i++) g.fillRect((i * 73) % 320, 70 + ((i * 37) % 104), 2, 1);
    for (const [x, y, t] of [[30, 30, 'lotus'], [84, 50, 'lotus_pad'], [120, 22, 'lotus'], [196, 44, 'lotus'], [236, 18, 'lotus_pad'], [270, 50, 'lotus'], [58, 12, 'lotus_pad'], [300, 26, 'lotus']]) this.add.image(x, y, t);
    for (let x = 6; x < 320; x += 13) this.add.image(x, 76 + (x % 3) * 2, 'reeds').setOrigin(0.5, 1).setDepth(1);
    for (const [cx, cy] of CLUMPS) for (const dx of [-8, 0, 8]) this.add.image(cx + dx, cy + (dx ? 2 : 0), 'reeds').setOrigin(0.5, 1).setDepth(cy + (dx ? 0.2 : 0.1));

    this.capys = CAPYS.map((c) => ({ ...c, spr: this.add.image(c.x, c.y, 'capybara_down_0').setOrigin(0.5, 1) }));
    this.lamp = this.add.graphics().setDepth(300);
    this.duck = this.add.image(DUCK.x, DUCK.y, 'patito_up_0').setOrigin(0.5, 1).setScale(2).setDepth(DUCK.y);
    this.bub = this.add.image(DUCK.x, DUCK.y - 36, 'bubble').setOrigin(0.5, 1).setDepth(301).setVisible(false);
    this.eye = this.add.graphics().setDepth(299);
    this.col = this.add.image(START.x, START.y, 'colgadin_side_0').setOrigin(0.5, 1);

    this.reset_();
    UI.minibar('Estanque de los Capybaras · Llega hasta Patito sin que te vea', { exit: () => this.exit() });
    Input.clear();
    this.lock = true;
    UI.say('Colgadín', [
      'El «pato» está al otro lado de la orilla, entre los juncos. Se le oye temblar.',
      'Puedo moverme cuando quiera, pero cuando se gire (luz roja) tengo que estar ESCONDIDO: con una mata de juncos entre él y yo.',
      'Los capybaras también tapan… mientras no se aparten. Y no se apartan: van a lo suyo.',
      'Si estoy bien escondido, me vuelvo medio transparente. ¡A por él!',
    ]).then(() => { this.lock = false; });
  }

  reset_() {
    this.p = { ...START }; this.safe = 0; this.dir = 'right'; this.anim = 0;
    this.phase = 'green'; this.t = 2.5;
  }
  exit() {
    if (this.lock || UI.busy) return;
    this.lock = true; UI.minibar(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.lock) this.win(); }

  hidden() {
    const ax = this.p.x, ay = this.p.y - 6;
    if (CLUMPS.some(([cx, cy]) => segRect(ax, ay, EYE.x, EYE.y, cx - 9, cy - 13, cx + 9, cy))) return true;
    return this.capys.some((c) => segRect(ax, ay, EYE.x, EYE.y, c.x - 9, c.y - 13, c.x + 9, c.y));
  }
  blocked(x, y) {
    if (x < X0 || x > X1 || y < Y0 || y > Y1) return true;
    if (CLUMPS.some(([cx, cy]) => Math.abs(x - cx) < 14 && y > cy - 6 && y < cy + 4)) return true;
    return this.capys.some((c) => Math.abs(x - c.x) < 13 && Math.abs(y - c.y) < 6);
  }

  async scare() {
    this.lock = true;
    Sound.clip('patito', 0.6);
    UI.toast('¡¡CUAC!! ¡Un ratón gigante!');
    this.cameras.main.shake(250, 0.006);
    this.tweens.add({ targets: this.duck, y: DUCK.y - 14, duration: 120, yoyo: true, repeat: 1 });
    await new Promise((r) => this.time.delayedCall(900, r));
    this.p = { ...SAFE[this.safe] };
    this.phase = 'green'; this.t = 2.2;
    this.lock = false;
  }

  async win() {
    this.lock = true;
    UI.minibar(null);
    this.duck.setTexture('patito_down_0');
    await SCRIPTS.patoDone();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    // Capybaras: cruzan de arriba abajo y vuelta, sin prisa
    for (const c of this.capys) {
      c.y += c.v * dt;
      if (c.y < Y0 + 2 || c.y > Y1) { c.v = -c.v; c.y = Phaser.Math.Clamp(c.y, Y0 + 2, Y1); }
      if (!this.lock && Math.abs(this.p.x - c.x) < 13 && Math.abs(this.p.y - c.y) < 6) { // te empuja si te pilla en medio
        const ny = this.p.y + Math.sign(c.v) * 1.5;
        if (!this.blocked(this.p.x, ny) || ny < Y0 || ny > Y1) this.p.y = Phaser.Math.Clamp(ny, Y0, Y1);
      }
      c.spr.setPosition(c.x, c.y).setDepth(c.y).setTexture(`capybara_down_${Math.floor(time / 400) % 2}`);
    }
    if (!this.lock && !UI.busy) {
      this.t -= dt;
      if (this.t <= 0) {
        // Avisa poco antes de girarse; a veces amaga y no se gira, y a veces se gira dos veces seguidas
        if (this.phase === 'green') { this.phase = 'warn'; this.t = 0.5 + Math.random() * 0.15; this.fake = Math.random() < 0.2; }
        else if (this.phase === 'warn' && this.fake) { this.phase = 'green'; this.t = 0.8 + Math.random() * 1.2; }
        else if (this.phase === 'warn') { this.phase = 'red'; this.t = 1.2 + Math.random() * 1.6; Sound.sfx('bump'); }
        else if (Math.random() < 0.25) { this.phase = 'warn'; this.t = 0.45; this.fake = false; }
        else { this.phase = 'green'; this.t = 1.4 + Math.random() * 1.8; }
      }
      const d = Input.dir();
      if (d.x || d.y) {
        const nx = this.p.x + d.x * SPEED * dt, ny = this.p.y + d.y * SPEED * dt;
        if (!this.blocked(nx, this.p.y)) this.p.x = nx;
        if (!this.blocked(this.p.x, ny)) this.p.y = ny;
        if (d.x) this.dir = d.x < 0 ? 'left' : 'right';
        this.anim += dt;
      }
      const hid = this.hidden();
      if (this.phase === 'red' && !hid) this.scare();
      // Último escondite seguro superado
      for (let i = SAFE.length - 1; i > this.safe; i--) if (this.p.x > SAFE[i].x + 20 && hid) { this.safe = i; break; }
      if (Input.take('b')) this.exit();
      if (!this.lock && Math.hypot(this.p.x - DUCK.x, this.p.y - DUCK.y) < 30) this.win();
    }
    Input.just = {};

    const looking = this.phase === 'red', hid = this.hidden();
    if (!this.lock || this.phase !== 'green') this.duck.setTexture(looking ? 'patito_down_0' : 'patito_up_0');
    this.duck.x = DUCK.x + (this.phase === 'warn' ? Math.sin(time / 25) * 1.5 : 0);
    this.bub.setVisible(this.phase === 'warn');
    this.col.setPosition(Math.round(this.p.x), Math.round(this.p.y)).setDepth(this.p.y + 0.05).setFlipX(this.dir === 'left')
      .setTexture(`colgadin_side_${Math.floor(this.anim / 0.15) % 2}`).setAlpha(hid ? 0.6 : 1);
    // Mirada de Patito cuando está girado: un cono tenue hacia la orilla
    this.eye.clear();
    if (looking) this.eye.fillStyle(0xffe066, 0.12).fillTriangle(EYE.x, EYE.y, 0, Y0 - 20, 0, Y1 + 20);
    const col = { green: 0x5aa648, warn: 0xffd23f, red: 0xe2574c }[this.phase];
    this.lamp.clear().fillStyle(0x1a1412).fillRect(146, 18, 28, 28).fillStyle(col).fillCircle(160, 32, 10).fillStyle(0xffffff, 0.5).fillCircle(157, 29, 3);
  }
}
