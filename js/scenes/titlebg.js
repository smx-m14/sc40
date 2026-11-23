// Fondo de la pantalla de título: la Isla de Cait de verdad, quieta, con la casa de Cait en el centro y Colgadín
// delante de la puerta. La pantalla de título la tapa con un degradado casi opaco y la difumina (css/style.css, #title).
// Sin spoilers: el mapa se construye con una partida recién empezada (aunque la guardada vaya avanzada) y solo se
// pinta el suelo y los decorados: ni personajes, ni calcetines, ni nada que se gane jugando.
import { State, fresh } from '../state.js';
import { buildMap, TILE } from '../maps.js';
import { WorldScene } from './world.js';

const HOME = { x: 22, y: 11 };                    // baldosa delante de la puerta de la casa de Cait
const HOUSE = { x: 22.5 * TILE, y: 10 * TILE };   // centro de la casa (m.obj('house_cait', 21, 9, 3, 2) en maps.js)

export class TitleBgScene extends Phaser.Scene {
  constructor() { super('titlebg'); }

  create() {
    const keep = State.d;
    State.d = fresh();
    try { this.map = buildMap('isla'); } finally { State.d = keep; }
    const m = this.map;
    WorldScene.prototype.drawGround.call(this);
    m.objects.forEach((o, i) => this.add.image(o.x, o.y, o.tex).setOrigin(0.5, 1).setDepth(o.flat ? (o.top ? 1.5 : 1) : o.y + i * 1e-4));

    // Colgadín, quieto delante de la puerta
    const x = HOME.x * TILE + 8, y = HOME.y * TILE + 12;
    this.add.image(x, y + 2, 'shadow').setAlpha(0.25).setDepth(y - 0.5);
    this.add.image(x, y + 3, 'colgadin_down_0').setOrigin(0.5, 1).setDepth(y);

    // Cámara fija, con la casa de Cait en el centro
    const cam = this.cameras.main;
    cam.setBounds(0, 0, m.w * TILE, m.h * TILE).setBackgroundColor('#3f8fd8');
    cam.roundPixels = true;
    cam.centerOn(HOUSE.x, HOUSE.y);
  }

  update(time) {
    const wf = Math.floor(time / 1400) % 2; // el agua, muy despacio
    this.grounds[0].setVisible(wf === 0); this.grounds[1].setVisible(wf === 1);
  }
}
