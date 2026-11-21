// Escena de broma: la primera vez que Colgadín habla con Bart, él la desafía sin venir a cuento a un «combate» al estilo de los
// RPG de bolsillo de toda la vida (barras de vida, niveles, menú de acciones). Pero aquí no se pelea nadie: Bart corta
// el combate en seco y le afea los modales a Colgadín. Luego se vuelve al gimnasio y Bart sigue con su charla.
import { State } from '../state.js';
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';

// Fuente de píxeles propia (como en robot.js): el texto normal del lienzo, a 320×180, sale borroso
const GLYPHS = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], G: ['.##', '#..', '#.#', '#.#', '.##'], I: ['###', '.#.', '.#.', '.#.', '###'],
  L: ['#..', '#..', '#..', '#..', '###'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'], R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  'Í': ['..#', '###', '.#.', '.#.', '.#.', '###'], // 6 filas: la tilde va por encima
  0: ['.#.', '#.#', '#.#', '#.#', '.#.'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'],
  4: ['#.#', '#.#', '###', '..#', '..#'], '/': ['..#', '..#', '.#.', '#..', '#..'], ' ': ['..', '..', '..', '..', '..'],
};
function pixText(g, s, x, y, k, color) {
  g.fillStyle(color);
  for (const c of s) {
    const gl = GLYPHS[c], top = y - (gl.length - 5) * k;
    gl.forEach((row, j) => [...row].forEach((v, i) => { if (v === '#') g.fillRect(x + i * k, top + j * k, k, k); }));
    x += (gl[0].length + 1) * k;
  }
}

export class CombateScene extends Phaser.Scene {
  constructor() { super('combate'); }

  create() {
    UI.hud(false); UI.minibar(null);
    Sound.music('gym'); // la música de Fitness Bartory: el combate es en el gimnasio
    this.cameras.main.setBackgroundColor('#f4f0e0');
    const g = this.add.graphics();
    // Fondo: suelo del gimnasio y dos plataformas
    g.fillStyle(0xe8e0c8).fillRect(-60, 0, 440, 180).fillStyle(0xd8ccb0).fillRect(-60, 96, 440, 84);
    g.fillStyle(0xc9b890).fillEllipse(232, 92, 104, 22).fillStyle(0xb8a67a).fillEllipse(232, 94, 92, 14);
    g.fillStyle(0xc9b890).fillEllipse(86, 156, 120, 26).fillStyle(0xb8a67a).fillEllipse(86, 158, 106, 16);
    // Recuadros de vida: Bart arriba a la izquierda, Colgadín abajo a la derecha
    const box = (x, y, w, name, lv, ps) => {
      g.fillStyle(0x2b2320).fillRoundedRect(x - 2, y - 2, w + 4, 34, 6).fillStyle(0xfff9e8).fillRoundedRect(x, y, w, 30, 5);
      g.fillStyle(0x2b2320).fillRect(x + 22, y + 15, w - 30, 5).fillStyle(0x5ac85a).fillRect(x + 23, y + 16, w - 32, 3);
      pixText(g, name, x + 6, y + 4, 2, 0x2b2320);
      pixText(g, lv, x + w - 26, y + 6, 1, 0x2b2320);
      pixText(g, 'PS', x + 10, y + 15, 1, 0xe2574c);
      if (ps) pixText(g, ps, x + w - 32, y + 22, 1, 0x2b2320);
    };
    box(14, 14, 120, 'BART', 'NV40');
    box(178, 108, 128, 'COLGADÍN', 'NV12', '40/40');
    this.bart = this.add.image(440, 88, 'bart_down_0').setOrigin(0.5, 1).setScale(3);
    this.col = this.add.image(-120, 154, 'colgadin_up_0').setOrigin(0.5, 1).setScale(3.4);
    // Entrada: barras negras que se cierran y se abren, como al empezar un combate
    this.bars = this.add.graphics().setDepth(10);
    Input.clear();
    this.run();
  }

  wait(ms) { return new Promise((r) => this.time.delayedCall(ms, r)); }

  async run() {
    // Fanfarria de combate (inventada) y transición de rayas
    Sound.seq(['B4', 'A#4', 'B4', 'A#4', 'B4', 'F#5', null, 'E5', 'D#5', 'E5', 'G5', 'F#5'], 0.07, 'square', 0.09);
    for (let i = 0; i <= 12; i++) {
      const b = this.bars.clear().fillStyle(0x1a1412);
      for (let k = 0; k < 9; k++) b.fillRect(k % 2 ? 380 - (i / 12) * 440 : -60, k * 20, (i / 12) * 440, 20);
      await this.wait(25);
    }
    this.cameras.main.flash(250, 255, 255, 255);
    this.bars.clear();
    this.tweens.add({ targets: this.bart, x: 232, duration: 600, ease: 'Quad.out' });
    this.tweens.add({ targets: this.col, x: 86, duration: 600, ease: 'Quad.out' });
    await this.wait(650);
    await UI.say('', '¡COLGADÍN desafía a la entrenadora BART!');
    const pick = await UI.choose('', '¿Qué hará COLGADÍN?', ['Luchar', 'Mochila', 'Huir']);
    Sound.sfx('bad');
    this.cameras.main.shake(200, 0.006);
    this.bart.setTexture('bart_down_1');
    await UI.say('Bart', [
      pick === 2 ? '¿Huir? ¡¿De qué?! ¡Pero si aquí no ha empezado nada!' : '¡Eh, eh, eh! ¡Quieto ahí!',
      '¿Qué modales son esos? ¿Entras en MI gimnasio y lo primero que haces es montar una pelea?',
      'Aquí se viene a hablar, a hacerse fotos en el espejo o a hacer calistenia. Pero nada de peleítas. ¡Ni de barritas de vida!',
    ]);
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => { State.after = 'bart'; this.scene.start('world'); });
  }

  update() { if (!UI.busy) Input.clear(); }
}
