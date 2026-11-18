// Minijuego: llamar a Narwal tocando con el Otamatone la melodía de 16 notas de los Owitos del Teatro.
// El dedo se desliza por el mástil con arriba/abajo y se «imanta» a cuatro marcas (las de los Owitos);
// el botón de acción toca la nota donde esté el dedo. Si está entre dos marcas, desafina.
// La partitura se ve arriba; «Recordar» vuelve a tararear la frase actual. Cada frase de cuatro notas
// agita más el mar; un fallo devuelve al principio de la frase.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';
import { MELODY } from './simon.js';

// Marcas del mástil, de arriba (grave) a abajo (agudo, junto a la cabeza), con el color de cada Owito
const FRETS = [
  { dir: 'left', note: 'C5', f: 523.25, y: 40, col: 0xf7a8c0 },
  { dir: 'right', note: 'E5', f: 659.25, y: 70, col: 0xf4f4f0 },
  { dir: 'down', note: 'G5', f: 783.99, y: 100, col: 0xb8a0d8 },
  { dir: 'up', note: 'A5', f: 880.0, y: 130, col: 0x8fd070 },
];
const SX = 262, TOP = 26, BOT = 144, TOL = 5, SPEED = 120;
const fretOf = (dir) => FRETS.findIndex((f) => f.dir === dir);

export class OtamaScene extends Phaser.Scene {
  constructor() { super('otama'); }

  create() {
    this.cameras.main.setBackgroundColor('#2a3a6a').fadeIn(300);
    UI.hud(false);
    Sound.music(null);
    // Cielo de atardecer, mar y muelle
    const g = this.add.graphics();
    g.fillStyle(0x3a3a7a).fillRect(-80, 0, 480, 40).fillStyle(0x7a4a8a).fillRect(-80, 40, 480, 30).fillStyle(0xe2776c).fillRect(-80, 70, 480, 14);
    g.fillStyle(0xffd27a).fillCircle(60, 84, 14);
    this.sea = this.add.graphics();
    g.fillStyle(0xa8743c).fillRect(-80, 140, 250, 40).fillStyle(0x8a5a2a); for (let x = -80; x < 170; x += 16) g.fillRect(x, 140, 1, 40);
    this.add.image(120, 142, 'colgadin_side_0').setOrigin(0.5, 1).setScale(2);
    this.narwal = this.add.image(80, 150, 'narwal').setOrigin(0.5, 1).setScale(1.6).setVisible(false);
    this.stem = this.add.graphics();
    this.score = this.add.graphics();
    this.pos = 0; this.phrase = 0; this.fy = FRETS[0].y; this.vy = 0; this.mouth = 0; this.wave = 0;
    this.lock = true; this.done = false;
    UI.minibar('Muelle · Llama a Narwal con el Otamatone', { reset: () => this.remind(), exit: () => this.exit(), labels: { reset: '♪ Recordar' } });
    Input.clear();
    this.intro();
  }

  async intro() {
    await UI.say('Owito director', [
      '¡Colgadín! Hemos venido corriendo desde el teatro. Para llamar a Narwal hay que tocar entera la melodía de «Owicked»: dieciséis notas.',
      'Desliza el dedo por el Otamatone con arriba y abajo: se queda pegado en las marcas de colores, que son las de mis Owitos. Toca con el botón de acción.',
      'Arriba tienes la partitura. Si se te olvida, pulsa «Recordar» y te tarareamos la frase. Primero, entera, para que la oigas.',
    ]);
    await this.hum(0, MELODY.length);
    this.lock = false;
  }

  // Los Owitos tararean un trozo de la melodía iluminando las marcas
  async hum(from, to) {
    this.lock = true;
    for (let i = from; i < to; i++) {
      const fr = FRETS[fretOf(MELODY[i])];
      this.flash = { i: fretOf(MELODY[i]), t: 0.28 };
      Sound.seq([fr.note], 0.3, 'triangle', 0.2);
      await new Promise((r) => this.time.delayedCall(360, r));
      if (this.done) return;
    }
    this.flash = null;
    this.lock = false;
    Input.clear();
  }
  remind() { if (!this.lock && !UI.busy && !this.done) this.hum(this.phrase * 4, Math.min(MELODY.length, this.phrase * 4 + 4)); }
  exit() {
    if (UI.busy || this.leaving) return;
    this.leaving = true; this.done = true; UI.minibar(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.done) { this.pos = MELODY.length; this.win(); } }

  // Nota del Otamatone en la posición actual del dedo (con un vibrato que le da su «uaaa»)
  sing(f) {
    if (!Sound.ctx) return;
    const ctx = Sound.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(f * 0.92, t); o.frequency.linearRampToValueAtTime(f, t + 0.06);
    lfo.frequency.value = 6; lg.gain.value = f * 0.012; lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.03); g.gain.setValueAtTime(0.09, t + 0.25); g.gain.linearRampToValueAtTime(0, t + 0.36);
    o.connect(g).connect(Sound.master);
    o.start(t); lfo.start(t); o.stop(t + 0.4); lfo.stop(t + 0.4);
  }

  play() {
    // Frecuencia continua entre marcas (en semitonos), para que fuera de ellas suene desafinado
    let k = 0;
    while (k < FRETS.length - 2 && this.fy > FRETS[k + 1].y) k++;
    const a = FRETS[k], b = FRETS[k + 1], u = Phaser.Math.Clamp((this.fy - a.y) / (b.y - a.y), -0.6, 1.6);
    this.sing(a.f * Math.pow(b.f / a.f, u));
    this.mouth = 1;
    const near = FRETS.findIndex((f) => Math.abs(f.y - this.fy) <= TOL);
    const want = fretOf(MELODY[this.pos]);
    if (near === want) {
      this.pos++;
      this.wave = Math.min(1, this.wave + 0.06);
      if (this.pos % 4 === 0) { // frase completa
        this.phrase = this.pos / 4;
        this.cameras.main.shake(300, 0.004 * this.phrase);
        Sound.sfx('get');
        UI.toast(['El mar empieza a burbujear…', 'Las olas crecen junto al muelle…', '¡Algo enorme se mueve bajo el agua!', '¡¡AHÍ VIENE!!'][this.phrase - 1]);
      }
      if (this.pos >= MELODY.length) this.win();
      return;
    }
    // Fallo: desafina o nota equivocada → vuelta al principio de la frase
    Sound.sfx('bad');
    this.pos = this.phrase * 4;
    this.wave = Math.max(0, this.wave - 0.1);
    UI.toast(near < 0 ? '¡Desafinado! El dedo estaba entre dos marcas. Desde el principio de la frase.' : 'Esa no era. El mar se calma… Desde el principio de la frase.');
  }

  async win() {
    this.done = true; this.lock = true;
    UI.minibar(null);
    this.narwal.setVisible(true).setY(200);
    this.cameras.main.shake(900, 0.01);
    this.tweens.add({ targets: this.narwal, y: 150, duration: 1400, ease: 'Back.out' });
    await new Promise((r) => this.time.delayedCall(1700, r));
    await SCRIPTS.narwalCalled();
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (!this.lock && !UI.busy && !this.done) {
      const d = Input.dir().y;
      if (d) this.fy = Phaser.Math.Clamp(this.fy + d * SPEED * dt, TOP, BOT);
      else { // imán suave hacia la marca más cercana
        const n = FRETS.reduce((a, f) => (Math.abs(f.y - this.fy) < Math.abs(a.y - this.fy) ? f : a));
        this.fy += (n.y - this.fy) * Math.min(1, dt * 7);
      }
      if (Input.take('a')) this.play();
      if (Input.take('reset')) this.remind();
      if (Input.take('b')) return this.exit();
    } else Input.clear();
    this.mouth = Math.max(0, this.mouth - dt * 3);
    if (this.flash && (this.flash.t -= dt) <= 0) this.flash.t = 0;

    // Mar: cuanto más se avanza, más se agita
    const s = this.sea.clear(), amp = 1 + this.wave * 7;
    s.fillStyle(0x2f6fb8).fillRect(-80, 84, 480, 96);
    s.fillStyle(0x6fb4ee);
    for (let x = -80; x < 400; x += 6) s.fillRect(x, 86 + Math.sin(x / 18 + time / (420 - this.wave * 200)) * amp, 4, 2);
    if (this.wave > 0.5) for (let i = 0; i < 8; i++) s.fillStyle(0xbfe3f7).fillCircle(40 + i * 18 + Math.sin(time / 300 + i) * 4, 120 - ((time / 12 + i * 23) % 40), 2);

    // Otamatone: mástil con marcas, dedo y cabeza con boca
    const g = this.stem.clear();
    g.fillStyle(0x1a1412).fillRect(SX - 4, TOP - 6, 8, BOT - TOP + 12).fillStyle(0xf4f4ee).fillRect(SX - 3, TOP - 5, 6, BOT - TOP + 10);
    FRETS.forEach((f, i) => {
      const lit = this.flash && this.flash.i === i && this.flash.t > 0;
      g.fillStyle(0x1a1412).fillRect(SX - 12, f.y - 3, 24, 6).fillStyle(f.col).fillRect(SX - 11, f.y - 2, 22, 4);
      if (lit) g.lineStyle(2, 0xffe066, 1).strokeRect(SX - 14, f.y - 5, 28, 10);
    });
    g.fillStyle(0x1a1412).fillCircle(SX, 166, 15).fillStyle(0xf4f4ee).fillCircle(SX, 166, 13);
    g.fillStyle(0x1a1412).fillRect(SX - 7, 160, 2, 3).fillRect(SX + 5, 160, 2, 3);
    g.fillStyle(0xe2574c).fillEllipse(SX, 170, 10, 2 + this.mouth * 8);
    g.fillStyle(0xd8bb82).fillCircle(SX + 7, this.fy, 5).fillStyle(0x1a1412).fillRect(SX + 2, this.fy - 1, 3, 2);

    // Partitura: 16 notas en 4 frases, con la siguiente resaltada
    const sc = this.score.clear();
    sc.fillStyle(0xfff6dc, 0.92).fillRect(8, 16, 212, 22);
    MELODY.forEach((dir, i) => {
      const f = FRETS[fretOf(dir)], x = 18 + i * 12 + Math.floor(i / 4) * 6, y = 20 + fretOf(dir) * 4;
      sc.fillStyle(0x1a1412).fillCircle(x, y + 2, 4).fillStyle(i < this.pos ? 0x555555 : f.col).fillCircle(x, y + 2, 3);
      if (i === this.pos && !this.done) sc.lineStyle(1, 0xe2574c, 0.6 + 0.4 * Math.sin(time / 120)).strokeCircle(x, y + 2, 6);
    });
  }
}
