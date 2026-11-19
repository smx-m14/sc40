// Escena final: la fiesta sorpresa en casa de Cait.
import { State, CHARACTERS, GACHA } from '../state.js';
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';

// Qué sprites trae cada invitado
const GUESTS = {
  lolete: ['lolete'], scooby: ['scooby'], cuca: ['cuca'], fuxia: ['fuxia'], perrunfli: ['perrunfli'], bart: ['bart'], tigrito: ['tigrito'],
  cuy: ['cuy', 'ratita_p', 'ratita_o', 'ratita_b'], kai: ['kai'], patito: ['patito'], capybaras: ['capybara', 'capybara'],
  owitos_teatro: ['owito_g', 'owito_k', 'owito_w', 'owito_v'], mantecas: ['mantecas', 'manteca2'], peludito: ['peludito'],
  owitos_navidad: ['owito_n', 'owito_r'], owinken: ['owinken'], heladoncio: ['heladoncio'],
  gatos: ['gato', 'gatot'], siri: ['siri', 'awawa', 'awawa'], ovejoncio: ['ovejoncio'],
};
const LAYER = [0xf7a8c0, 0xfff3dc, 0x9fc86a, 0x4a2c1e];
const BULBS = [0xffe066, 0xe2574c, 0x3f8fd8, 0x82cc6a, 0xf7a8c0];
const LINES = {
  lolete: 'He inflado todos los globos. Bueno, los que no me he comido.', fuxia: '¡Dale a la gramola! Hoy pincho yo.', peludito: 'Declaro este cumpleaños fiesta nacional del Castillo de Mazapán.',
  heladoncio: 'La tarta ha llegado entera. Y yo, que casi no llego a casa de Cait. ¡Menudo disgusto!', bart: 'Cuarenta años son solo cuarenta repeticiones. ¡Técnica estricta!', cuy: '¡Cui, cui! Cuca dice que felicidades. Bueno, lo dice en ruso.',
  owinken: 'Oink. Prometo que soy el original.', siri: '¡Awawa! Los globos los hemos inflado nosotros. Con los dientecitos no, tranquilos.', ovejoncio: 'He traído el portátil por si hay que hackear algo. Es costumbre.', tigrito: 'Y ahora, todos conmigo. Un, dos, tres…',
};

export class FiestaScene extends Phaser.Scene {
  constructor() { super('fiesta'); }

  create() {
    const d = State.d, cam = this.cameras.main;
    cam.setBackgroundColor('#1a1412').fadeIn(600);
    UI.hud(false); UI.minibar(null);
    Sound.music(null);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 20; x++) this.add.image(x * 16, y * 16, y === 0 ? 'tile_V' : y === 1 ? 'tile_W' : 'tile_o').setOrigin(0);
    this.add.image(160, 150, 'rug').setScale(2);
    this.add.image(40, 44, 'shelf').setOrigin(0.5, 1); this.add.image(290, 44, 'plant').setOrigin(0.5, 1); this.add.image(26, 66, 'bed2').setOrigin(0.5, 1);
    [120, 160, 200].forEach((x, i) => this.add.image(x, 26, 'cuadro' + (i + 1)).setOrigin(0.5, 1));
    this.add.image(250, 52, 'sofa_cait').setOrigin(0.5, 1);
    this.fx = this.add.graphics().setDepth(900);
    this.deco = this.add.graphics().setDepth(120);

    // Invitados, repartidos en filas a los lados; el centro queda para la tarta y Colgadín
    const sprites = [];
    for (const c of CHARACTERS) if (d.invited.includes(c.id)) for (const s of GUESTS[c.id] || []) sprites.push(s === 'heladoncio' && State.flag('hat') ? 'heladoncioh' : s);
    const spots = [];
    for (const y of [74, 98, 122, 146, 170]) for (const x of [22, 50, 78, 106, 214, 242, 270, 298]) spots.push([x + (y % 48 ? 0 : 8), y]);
    this.guests = sprites.slice(0, spots.length).map((s, i) => {
      const [x, y] = spots[i];
      return { spr: this.add.image(x, y, s + '_down_0').setOrigin(0.5, 1).setDepth(y), tex: s, y, ph: i * 0.7 };
    });
    if (d.invited.includes('narwal')) this.add.image(160, 50, 'narwal').setOrigin(0.5, 1).setDepth(50);
    // Globos de fiesta de los awawas (normales, de colores)
    if (State.flag('globos')) [[24, 46], [296, 46], [70, 40], [250, 40], [120, 36], [200, 36]].forEach(([x, y], i) => this.add.image(x, y, 'pballoon_' + 'rybpgr'[i]).setDepth(55));
    if (State.flag('gramola')) this.add.image(116, 56, 'gramola').setOrigin(0.5, 1).setDepth(50);
    this.add.image(160, 108, 'table').setOrigin(0.5, 1).setScale(1.5).setDepth(100);
    this.col = this.add.image(160, 150, 'colgadin_up_0').setOrigin(0.5, 1).setDepth(150).setScale(2);
    this.layers = Math.max(1, +d.flags.tarta || 1);
    this.gifts = d.gacha.length + d.gifts.length;
    this.confetti = Array.from({ length: 70 }, (_, i) => ({ x: (i * 53) % 320, y: -((i * 37) % 180), v: 20 + (i % 5) * 9, c: BULBS[i % 5], w: i }));
    this.party = false;
    Input.clear();
    this.sequence();
  }

  async sequence() {
    const d = State.d, n = d.invited.length;
    await new Promise((r) => this.time.delayedCall(900, r));
    await UI.say('Colgadín', ['Luces… tarta… música… y todos escondidos. Ya está todo.', 'Chsss… ¡que viene, que viene!']);
    this.party = true;
    Sound.logro();
    this.cameras.main.flash(500, 255, 255, 255);
    await UI.say('TODOS', '¡¡¡SORPRESA!!!');
    Sound.music('fiesta', true);
    const who = CHARACTERS.filter((c) => d.invited.includes(c.id) && LINES[c.id]);
    for (const c of who) await UI.say(c.name, LINES[c.id]);
    await UI.say('', [
      `Han venido ${n} de ${CHARACTERS.length} invitados, la tarta tiene ${this.layers} ${this.layers === 1 ? 'piso' : 'pisos'} y hay ${this.gifts} ${this.gifts === 1 ? 'regalo' : 'regalos'} esperando.`,
      '«Cumpleaños feliz, cumpleaños feliz, te deseamos todos…»',
    ]);
    State.set('fin');
    await UI.ending({ guests: n, total: CHARACTERS.length, layers: this.layers, gifts: this.gifts, gachaTotal: GACHA.length });
    State.d.pos = { map: 'cait', x: 6 * 16 + 8, y: 7 * 16 + 12, dir: 'down' };
    State.save();
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000, on = this.party;
    for (const g of this.guests) {
      const hop = on ? Math.abs(Math.sin(time / 180 + g.ph)) * 5 : 0;
      g.spr.setY(g.y - hop).setTexture(`${g.tex}_down_${on ? Math.floor(time / 200 + g.ph) % 2 : 0}`);
    }
    this.col.setTexture(on ? `colgadin_down_${Math.floor(time / 200) % 2}` : 'colgadin_up_0');
    const g = this.deco.clear();
    // Tarta sobre la mesa
    for (let i = 0; i < this.layers; i++) { const w = 30 - i * 6; g.fillStyle(0x2b2320).fillRect(160 - w / 2 - 1, 84 - i * 8, w + 2, 9).fillStyle(LAYER[i]).fillRect(160 - w / 2, 85 - i * 8, w, 8).fillStyle(0xffffff, 0.5).fillRect(160 - w / 2, 85 - i * 8, w, 2); }
    const ty = 84 - (this.layers - 1) * 8;
    g.fillStyle(0xf4f4ee).fillRect(159, ty - 6, 2, 6);
    if (on) g.fillStyle(0xffe066).fillCircle(160, ty - 8 + Math.sin(time / 60), 2);
    // Regalos junto a la mesa
    for (let i = 0; i < Math.min(this.gifts, 9); i++) { const x = 190 + (i % 3) * 9 - Math.floor(i / 3) * 3, y = 100 - Math.floor(i / 3) * 7; g.fillStyle(0x2b2320).fillRect(x - 1, y - 1, 9, 9).fillStyle(BULBS[(i + 1) % 5]).fillRect(x, y, 7, 7).fillStyle(0xffffff).fillRect(x + 3, y, 1, 7); }
    // Guirnalda de luces de los Owitos de Navidad
    if (State.flag('luces')) {
      g.lineStyle(1, 0x1a1412, 1);
      for (let x = 0; x < 320; x += 16) {
        const y = 26 + Math.sin(x / 50) * 5;
        g.lineBetween(x, y, x + 16, 26 + Math.sin((x + 16) / 50) * 5);
        const lit = !on || (Math.floor(time / 250) + x / 16) % 2 === 0;
        g.fillStyle(lit ? BULBS[(x / 16) % 5] : 0x555555).fillCircle(x + 8, y + 3, 3);
      }
    }
    const f = this.fx.clear();
    if (on) for (const c of this.confetti) { c.y += c.v * dt; if (c.y > 184) c.y = -6; f.fillStyle(c.c).fillRect(c.x + Math.sin(time / 300 + c.w) * 6, c.y, 3, 2); }
    if (!UI.busy) Input.clear();
  }
}
