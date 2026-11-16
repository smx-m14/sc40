// Minijuego: acercarse a Patito sin asustarlo (luz verde, luz roja).
// Mientras Patito mira hacia otro lado se puede avanzar; cuando se gira hay que quedarse quieto.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

const START = 34, GOAL = 258, Y = 128, SPEED = 24;
const CHECK = [START, 150];      // una sola mata a medio camino: si asusta a Patito vuelve a la última

export class PatoScene extends Phaser.Scene {
  constructor() { super('pato'); }

  create() {
    this.cameras.main.setBackgroundColor('#6fbf5a').fadeIn(250);
    UI.hud(false);
    Sound.music('capybaras');

    const g = this.add.graphics();
    g.fillStyle(0x3f8fd8).fillRect(0, 0, 320, 70);
    g.fillStyle(0x6fb4ee); for (let i = 0; i < 12; i++) g.fillRect(10 + i * 27, 14 + (i % 4) * 13, 12, 1);
    g.fillStyle(0xbfe3f7).fillRect(0, 70, 320, 2);
    g.fillStyle(0x63b04f).fillRect(0, 72, 320, 108);
    g.fillStyle(0xd9b77c).fillRect(0, Y - 4, 320, 12);
    for (let x = 6; x < 320; x += 14) this.add.image(x, 84 + (x % 3) * 3, 'reeds').setOrigin(0.5, 1).setDepth(1);
    for (let x = 0; x < 320; x += 11) this.add.image(x, Y + 30 + (x % 4) * 4, 'reeds').setOrigin(0.5, 1).setDepth(20);
    CHECK.slice(1).forEach((x) => this.add.image(x, Y + 4, 'reeds').setOrigin(0.5, 1).setDepth(12).setScale(1.4));
    [[12, 0], [22, 8], [6, 14]].forEach(([x, dy], i) => { this['capy' + i] = this.add.image(x, Y - 22 + dy, 'capybara_down_0').setOrigin(0.5, 1).setDepth(5); });

    this.lamp = this.add.graphics().setDepth(30);
    this.duck = this.add.image(GOAL + 22, Y + 4, 'patito_up_0').setOrigin(0.5, 1).setScale(2).setDepth(10);
    this.bub = this.add.image(GOAL + 22, Y - 34, 'bubble').setOrigin(0.5, 1).setDepth(11).setVisible(false);
    this.col = this.add.image(START, Y + 4, 'colgadin_side_0').setOrigin(0.5, 1).setDepth(10);

    this.x = START; this.phase = 'green'; this.t = 2; this.lock = true; this.anim = 0;
    UI.minibar('Estanque de los Capybaras · Acércate a Patito sin asustarlo', { exit: () => this.exit() });
    Input.clear();
    UI.say('Colgadín', [
      'El «pato» está al otro lado de los juncos. Se le oye temblar.',
      'Avanzo solo cuando mire hacia otro lado (mantén derecha o el botón A). Si se gira… ¡quieto como un peluche!',
      'Ojo, que está muy nervioso: casi no avisa, a veces amaga, y a veces se gira dos veces seguidas.',
    ]).then(() => { this.lock = false; });
  }

  exit() {
    if (this.lock || UI.busy) return;
    this.lock = true; UI.minibar(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.lock) { this.x = GOAL; } }

  async scare() {
    this.lock = true;
    Sound.clip('patito', 0.6);
    UI.toast('¡¡CUAC!! ¡Un ratón gigante!');
    this.cameras.main.shake(250, 0.006);
    this.tweens.add({ targets: this.duck, y: this.duck.y - 14, duration: 120, yoyo: true, repeat: 1 });
    await new Promise((r) => this.time.delayedCall(900, r));
    this.x = [...CHECK].reverse().find((c) => c <= this.x) ?? START;
    this.phase = 'green'; this.t = 2;
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
    [0, 1, 2].forEach((i) => this['capy' + i].setTexture(`capybara_down_${(Math.floor(time / 400) + i) % 2}`));
    if (!this.lock && !UI.busy) {
      this.t -= dt;
      if (this.t <= 0) {
        // Avisa muy poco antes de girarse; a veces amaga y no se gira, y a veces se gira dos veces seguidas
        if (this.phase === 'green') { this.phase = 'warn'; this.t = 0.24 + Math.random() * 0.1; this.fake = Math.random() < 0.25; }
        else if (this.phase === 'warn' && this.fake) { this.phase = 'green'; this.t = 0.5 + Math.random() * 0.8; }
        else if (this.phase === 'warn') { this.phase = 'red'; this.t = 0.8 + Math.random() * 1.7; Sound.sfx('bump'); }
        else if (Math.random() < 0.3) { this.phase = 'warn'; this.t = 0.3; this.fake = false; }
        else { this.phase = 'green'; this.t = 0.6 + Math.random() * 1.4; }
      }
      const moving = Input.dir().x > 0 || Input.held.a;
      if (moving) {
        if (this.phase === 'red') this.scare();
        else { this.x += SPEED * dt; this.anim += dt; }
      }
      if (Input.take('b')) this.exit();
      if (this.x >= GOAL && !this.lock) this.win();
    }
    Input.just = {};

    const looking = this.phase === 'red';
    if (!this.lock || this.phase !== 'green') this.duck.setTexture(looking ? 'patito_down_0' : 'patito_up_0');
    this.duck.x = GOAL + 22 + (this.phase === 'warn' ? Math.sin(time / 25) * 1.5 : 0);
    this.bub.setVisible(this.phase === 'warn');
    this.col.setPosition(Math.round(this.x), Y + 4).setTexture(`colgadin_side_${Math.floor(this.anim / 0.15) % 2}`);
    const col = { green: 0x5aa648, warn: 0xffd23f, red: 0xe2574c }[this.phase];
    this.lamp.clear().fillStyle(0x1a1412).fillRect(146, 20, 28, 28).fillStyle(col).fillCircle(160, 34, 10).fillStyle(0xffffff, 0.5).fillCircle(157, 31, 3);
  }
}
