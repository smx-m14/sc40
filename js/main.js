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
import { AwawasScene } from './scenes/awawas.js';
import { OtamaScene } from './scenes/otama.js';
import { RitmoScene } from './scenes/ritmo.js';
import { RobotScene } from './scenes/robot.js';
import { CombateScene } from './scenes/combate.js';
import { TitleBgScene } from './scenes/titlebg.js';
import { MovilScene } from './scenes/movil.js';
import './story.js';

class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  async create() {
    makeTextures(this);
    const tiles = makeTiles();
    for (const k of Object.keys(tiles)) this.textures.addCanvas('tile_' + k, tiles[k]);

    State.load();
    Input.init();
    for (const ev of ['touchstart', 'pointerdown', 'keydown']) window.addEventListener(ev, () => Sound.init(), { capture: true, passive: true });
    UI.init();
    // Los textos dibujados dentro del lienzo necesitan la fuente ya cargada (si no, salen con una de sistema)
    try { await document.fonts.load('16px Pixelify'); await document.fonts.ready; } catch {}
    // Fuera la pantalla de carga de index.html (con un fundido corto)
    const ld = document.getElementById('loader');
    if (ld) { ld.classList.add('out'); setTimeout(() => ld.remove(), 350); }

    Sound.wanted = 'titulo'; // música propia de la pantalla de título (en bucle); en el juego, la de cada zona

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

    this.scene.launch('titlebg'); // de fondo, la isla con Colgadín paseando (js/scenes/titlebg.js)
    const mode = await UI.title();
    this.scene.stop('titlebg');
    if (mode === 'new') { State.reset(); State.save(); }
    this.scene.start('world');
  }
}

// El alto del juego son siempre 180 píxeles; el ancho se adapta a la pantalla (entre 16:9 y 22:9) para no dejar
// franjas negras en los móviles apaisados. La exploración enseña más mapa; las pruebas, que están pensadas para
// 320 de ancho, se centran.
const BASE_W = 320, MAX_W = 440;
function gameWidth() {
  const st = document.getElementById('stage'), r = st.clientWidth / Math.max(1, st.clientHeight);
  return Math.max(BASE_W, Math.min(MAX_W, Math.round((180 * r) / 2) * 2));
}
const FREE_CAMERA = ['boot', 'world', 'sokoban', 'tarta', 'titlebg']; // escenas que ya colocan su cámara según el ancho
function center(scene) { if (!FREE_CAMERA.includes(scene.scene.key)) scene.cameras.main.setScroll(-(scene.scale.width - BASE_W) / 2, 0); }

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: gameWidth(),
  height: 180,
  backgroundColor: '#1b2a3a',
  pixelArt: true,
  roundPixels: true,
  audio: { noAudio: true },
  input: { keyboard: false },
  scale: { mode: Phaser.Scale.NONE },
  scene: [BootScene, WorldScene, SokobanScene, CaliScene, MonosScene, PatoScene, SimonScene, HornoScene, LucesScene, TediScene, TartaScene, FiestaScene, AwawasScene, OtamaScene, RitmoScene, RobotScene, CombateScene, TitleBgScene, MovilScene],
});

game.events.once('ready', () => {
  for (const sc of game.scene.scenes) sc.events.on('create', () => center(sc));
});
let resizeT = null;
function fit() {
  const w = gameWidth();
  if (w === game.scale.width) return;
  game.scale.resize(w, 180);
  for (const sc of game.scene.getScenes(true)) {
    if (sc.scene.key === 'world') { sc.savePos(); sc.scene.restart(); } else center(sc);
  }
}
const refit = () => { clearTimeout(resizeT); resizeT = setTimeout(fit, 150); };
window.addEventListener('resize', refit);
window.addEventListener('orientationchange', refit);
document.addEventListener('fullscreenchange', refit);

// Guardar al salir o al pasar a segundo plano
const flush = () => { if (State.flag('intro')) State.save(); };
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

window.SC40 = { game, State, UI, Sound, Input }; // para depurar desde la consola
