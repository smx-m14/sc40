// Minijuego: llamar a Narwal tocando con el Otamatone la melodía de los Owitos del Teatro (11 notas).
// El dedo se desliza por el mástil con arriba/abajo y se «imanta» a seis marcas, una por Owito (de su color); el
// botón de acción toca la nota donde esté el dedo. Si está entre dos marcas, desafina. No hay partitura: se toca de
// memoria (es la del ensayo en el teatro) y, si el jugador se pierde, el director le da una pista.
// Arriba se va escribiendo en un pentagrama lo que se ha tocado bien. Cada frase (4, 4 y 3 notas) agita más el mar;
// un fallo borra la partitura y se vuelve a empezar desde la primera nota.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';
import { MELODY, OWITOS, PHRASES } from './simon.js';

// El mástil de un Otamatone funciona como una cuerda: lo grave queda arriba, lejos de la cara, y según el dedo baja
// hacia la boca la nota sube y las notas se van juntando (como los trastes de una guitarra). La nota depende de lo
// lejos que esté el dedo del «puente» (BRIDGE): a la mitad de distancia, una octava más aguda. La nota más grave de
// la melodía (la3) va arriba del todo (LOW_Y); por debajo de la más aguda (la4) queda mástil libre, como en el real.
const BRIDGE = 200, LOW_Y = 26, LOW_F = 220;
const freqAt = (y) => LOW_F * (BRIDGE - LOW_Y) / (BRIDGE - y);
const yOf = (f) => BRIDGE - LOW_F * (BRIDGE - LOW_Y) / f;
// Marcas: una por Owito, en la posición de su nota y con su color
const midi = (n) => { const m = /^([A-G])(#?)(\d)$/.exec(n); return 12 * (+m[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0); };
const FRETS = OWITOS.map((o) => ({ note: o.note, col: o.col, f: 440 * 2 ** ((midi(o.note) - 69) / 12) }))
  .sort((a, b) => a.f - b.f).map((fr) => ({ ...fr, y: Math.round(yOf(fr.f)) }));
const SX = 262, TOP = 20, BOT = 146, TOL = 3, SPEED = 110; // TOL: menos de medio semitono entre mi y fa (las más juntas)
const fretOf = (step) => FRETS.findIndex((f) => f.note === step.note);
const phraseEnd = (p) => PHRASES[p + 1] ?? MELODY.length;
// Pentagrama: posición de cada nota en escalones de línea/espacio contados desde do4 (do4 = 0, re4 = 1, mi4 = 2…)
const staffStep = (n) => { const m = /^([A-G])#?(\d)$/.exec(n); return (+m[2] - 4) * 7 + 'CDEFGAB'.indexOf(m[1]); };
const STAFF_E4 = 44; // altura de la primera línea (mi4); cada escalón son 3 px

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
    this.misses = 0; this.idle = 0; this.hinted = false; // para notar si el jugador está perdido
    this.lock = true; this.done = false;
    UI.minibar('Muelle · Llama a Narwal con el Otamatone', { exit: () => this.exit() });
    Input.clear();
    this.intro();
  }

  async intro() {
    // Pocas indicaciones: el jugador prueba el Otamatone y descubre por sí mismo dónde está cada nota.
    // No se tararea la melodía: ya la conoce del ensayo en el teatro.
    await UI.say('Owito director', [
      '¡Colgadín! Para llamar a Narwal hay que tocar con el Otamatone la melodía que ensayamos en el teatro.',
      'Arriba y abajo para mover el dedo, botón de acción para tocar. ¡Prueba!',
    ]);
    this.lock = false;
    Input.clear();
  }

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
    this.sing(freqAt(this.fy)); // nota continua según dónde esté el dedo: fuera de las marcas suena desafinado
    this.mouth = 1;
    const near = FRETS.findIndex((f) => Math.abs(f.y - this.fy) <= TOL);
    const want = fretOf(MELODY[this.pos]);
    if (near === want) {
      this.pos++; this.idle = 0;
      this.wave = Math.min(1, this.wave + 0.06);
      if (this.pos === phraseEnd(this.phrase)) { // frase completa
        this.phrase++;
        this.cameras.main.shake(300, 0.005 * this.phrase);
        Sound.sfx('get');
        UI.toast(['El mar empieza a burbujear…', '¡Algo enorme se mueve bajo el agua!', '¡¡AHÍ VIENE!!'][this.phrase - 1]);
      }
      if (this.pos >= MELODY.length) this.win();
      return;
    }
    // Fallo: desafina o nota equivocada → se borra la partitura y vuelta a empezar desde la primera nota
    Sound.sfx('bad');
    this.pos = 0; this.phrase = 0;
    this.wave = 0;
    this.misses++;
    UI.toast(near < 0 ? '¡Desafinado! El dedo estaba entre dos marcas. El mar se calma… ¡Desde el principio!' : 'Esa no era. El mar se calma… ¡Desde el principio!');
  }

  // Si el jugador parece perdido (tres fallos o un buen rato sin acertar), el director le da una pista, una sola vez
  async hint() {
    this.hinted = true; this.lock = true;
    await UI.say('Owito director', ['¿Perdido? Te doy una pista: es una melodía muy, muy… POPULAR.', 'Seguro que la has tarareado alguna vez.']);
    this.lock = false;
    Input.clear();
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
        this.fy += (n.y - this.fy) * Math.min(1, dt * 14);
      }
      if (Input.take('a')) this.play();
      if (Input.take('b')) return this.exit();
      this.idle += dt;
      if (!this.hinted && (this.misses >= 3 || this.idle > 25)) this.hint();
    } else Input.clear();
    this.mouth = Math.max(0, this.mouth - dt * 3);

    // Mar: cuanto más se avanza, más se agita
    const s = this.sea.clear(), amp = 1 + this.wave * 7;
    s.fillStyle(0x2f6fb8).fillRect(-80, 84, 480, 96);
    s.fillStyle(0x6fb4ee);
    for (let x = -80; x < 400; x += 6) s.fillRect(x, 86 + Math.sin(x / 18 + time / (420 - this.wave * 200)) * amp, 4, 2);
    if (this.wave > 0.5) for (let i = 0; i < 8; i++) s.fillStyle(0xbfe3f7).fillCircle(40 + i * 18 + Math.sin(time / 300 + i) * 4, 120 - ((time / 12 + i * 23) % 40), 2);

    // Otamatone: mástil con marcas, dedo y cabeza con boca
    const g = this.stem.clear();
    g.fillStyle(0x1a1412).fillRect(SX - 4, TOP - 6, 8, BOT - TOP + 12).fillStyle(0xf4f4ee).fillRect(SX - 3, TOP - 5, 6, BOT - TOP + 10);
    for (const f of FRETS) g.fillStyle(0x1a1412).fillRect(SX - 12, f.y - 2, 24, 4).fillStyle(f.col).fillRect(SX - 11, f.y - 1, 22, 2);
    g.fillStyle(0x1a1412).fillCircle(SX, 166, 15).fillStyle(0xf4f4ee).fillCircle(SX, 166, 13);
    g.fillStyle(0x1a1412).fillRect(SX - 7, 160, 2, 3).fillRect(SX + 5, 160, 2, 3);
    g.fillStyle(0xe2574c).fillEllipse(SX, 170, 10, 2 + this.mouth * 8);
    g.fillStyle(0xd8bb82).fillCircle(SX + 7, this.fy, 5).fillStyle(0x1a1412).fillRect(SX + 2, this.fy - 1, 3, 2);

    // Partitura: pentagrama (clave de sol) en el que se van escribiendo las notas bien tocadas, del color de su Owito
    const sc = this.score.clear();
    sc.fillStyle(0xfff6dc, 0.92).fillRect(8, 14, 214, 48);
    sc.fillStyle(0x6b5a4a); for (let k = 0; k < 5; k++) sc.fillRect(14, STAFF_E4 - k * 6, 202, 1); // mi4 sol4 si4 re5 fa5
    for (let i = 0; i < this.pos; i++) {
      const st = staffStep(MELODY[i].note), x = 30 + i * 17, y = STAFF_E4 - (st - 2) * 3; // st 2 = mi4 (primera línea)
      sc.fillStyle(0x6b5a4a); for (let l = 0; l >= st; l -= 2) sc.fillRect(x - 6, STAFF_E4 - (l - 2) * 3, 12, 1); // líneas adicionales (do4, la3)
      sc.fillStyle(0x1a1412).fillRect(x + 3, y - 15, 1, 15);                                                       // plica
      sc.fillStyle(0x1a1412).fillEllipse(x, y, 9, 7).fillStyle(FRETS[fretOf(MELODY[i])].col).fillEllipse(x, y, 7, 5);
    }

  }
}
