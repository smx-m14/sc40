// Super Cait's 40 — arranque.
import { State } from './state.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import { makeTextures, makeTiles } from './art.js';
import { WorldScene } from './scenes/world.js';
import { SokobanScene } from './scenes/sokoban.js';
import { CaliScene } from './scenes/cali.js';
import { MonosScene } from './scenes/monos.js';
import { PatoScene } from './scenes/pato.js';
import { SimonScene } from './scenes/simon.js';
import { HornoScene } from './scenes/horno.js';
import { LucesScene } from './scenes/luces.js';
import { TediScene } from './scenes/tedi.js';
import { TartaScene } from './scenes/tarta.js';
import { FiestaScene } from './scenes/fiesta.js';
import './story.js';

class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  async create() {
    makeTextures(this);
    const tiles = makeTiles();
    for (const k of Object.keys(tiles)) this.textures.addCanvas('tile_' + k, tiles[k]);

    State.load();
    Input.init();
    UI.init();
    try { await document.fonts.ready; } catch {}

    Sound.wanted = 'isla';

    // Atajos de prueba: ?debug&flags=intro,invites&at=isla,22,12&scene=sokoban&level=2
    const q = new URLSearchParams(location.search);
    if (q.has('dev')) UI.setDebug(true, true);
    if (q.has('debug')) {
      State.reset();
      for (const f of (q.get('flags') || '').split(',').filter(Boolean)) State.d.flags[f] = true;
      for (const id of (q.get('party') || '').split(',').filter(Boolean)) State.d.party.push(id);
      for (const id of (q.get('home') || '').split(',').filter(Boolean)) State.d.home.push(id);
      if (q.get('at')) { const [map, tx, ty] = q.get('at').split(','); State.d.pos = { map, x: tx * 16 + 8, y: ty * 16 + 12, dir: 'down' }; }
      State.d.sokoLevel = +q.get('level') || 0;
      this.scene.start(q.get('scene') || 'world');
      setTimeout(() => {
        if (q.get('run')) this.scene.get('world').run(q.get('run'));
        if (q.has('album')) UI.album();
        if (q.has('menu')) { UI.tab = q.get('menu') || 'prep'; UI.toggleMenu(true); }
      }, 700);
      return;
    }

    const mode = await UI.title();
    if (mode === 'new') { State.reset(); State.save(); }
    this.scene.start('world');
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 320,
  height: 180,
  backgroundColor: '#1b2a3a',
  pixelArt: true,
  roundPixels: true,
  audio: { noAudio: true },
  input: { keyboard: false },
  scale: { mode: Phaser.Scale.NONE },
  scene: [BootScene, WorldScene, SokobanScene, CaliScene, MonosScene, PatoScene, SimonScene, HornoScene, LucesScene, TediScene, TartaScene, FiestaScene],
});

// Guardar al salir o al pasar a segundo plano
const flush = () => { if (State.flag('intro')) State.save(); };
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

window.SC40 = { game, State, UI, Sound, Input }; // para depurar desde la consola
