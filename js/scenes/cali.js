// Minijuego: las pruebas de Bart en Fitness Bartory, al estilo de unos juegos olímpicos.
// Tres pruebas distintas:
//   1. Dominadas    — precisión: pulsar acción cuando el marcador pasa por la zona verde.
//   2. Flexiones    — sprint: machacar el botón de acción para llenar la barra antes de que se acabe el tiempo.
//   3. Plancha      — equilibrio: mantener el marcador centrado con izquierda/derecha mientras tiembla.
import { State } from '../state.js';
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

const X0 = 60, X1 = 260, MY = 160, MID = (X0 + X1) / 2;
const EVENTS = [
  { k: 'pull', name: 'Dominadas', reps: 5, zone: 38, speed: 190,
    intro: 'Primera prueba: DOMINADAS. Pulsa cuando el marcador pase por la zona verde. Cinco repeticiones limpias. La zona se va haciendo pequeña, como mi paciencia.' },
  { k: 'mash', name: 'Sprint de flexiones', time: 9, gain: 4.4, decay: 15,
    intro: 'Segunda prueba: SPRINT DE FLEXIONES. Pecho al suelo y arriba, todo lo rápido que puedas: machaca el botón de acción y llena la barra antes de que se acabe el tiempo. Si paras, se vacía.' },
  { k: 'hold', name: 'Plancha', time: 12, miss: 2.5,
    intro: 'Última prueba: LA PLANCHA. Doce segundos. El cuerpo tiembla: corrige con izquierda y derecha para que el marcador no se salga de la zona verde. Si se sale demasiado tiempo, vuelta a empezar.' },
];
const QUIPS = ['¡Eso ha sido KIPPING!', '¡Escápulas ACTIVAS!', '¡Sin balanceo, Colgadín!', '¡Hollow body! ¡HOLLOW BODY!', '¡Rango completo o no cuenta!'];

export class CaliScene extends Phaser.Scene {
  constructor() { super('cali'); }

  create() {
    this.cameras.main.setBackgroundColor('#2b2d34').fadeIn(250);
    UI.hud(false);
    Sound.music('gym');
    const g = this.add.graphics();
    g.fillStyle(0x3a3d46).fillRect(0, 0, 320, 132);
    g.fillStyle(0xf08a24).fillRect(0, 26, 320, 5);
    g.fillStyle(0x565a66).fillRect(0, 132, 320, 48);
    g.fillStyle(0x2b2d34).fillRect(0, 132, 320, 2);
    this.barImg = this.add.image(160, 134, 'bar').setOrigin(0.5, 1);
    this.cord = this.add.graphics();
    this.col = this.add.image(160, 0, 'colgadin_down_0').setOrigin(0.5, 0).setScale(2);
    this.bart = this.add.image(262, 134, 'bart_down_0').setOrigin(0.5, 1).setScale(2);
    this.meter = this.add.graphics();
    this.ev = 0; this.lock = true;
    this.holdFails = 0; // reintentos de la plancha: cada uno la hace un poco más fácil
    Input.clear();
    this.begin();
  }

  // Prepara la prueba actual y la presenta
  async begin() {
    const e = EVENTS[this.ev];
    this.lock = true;
    this.reps = 0; this.lift = 0; this.pos = 0; this.dirn = 1;         // dominadas
    this.fill = 0; this.left = e.time || 0;                            // sprint
    this.bal = 0; this.vel = 0; this.wind = 0; this.windT = 0; this.out = 0; // plancha
    this.barImg.setVisible(e.k === 'pull');
    this.newZone();
    this.bar();
    await UI.say('Bart', e.intro);
    Input.clear();
    this.lock = false;
  }
  newZone() {
    const e = EVENTS[this.ev];
    if (e.k !== 'pull') return;
    this.zw = Math.max(20, e.zone - this.reps * 4);
    this.zx = X0 + 10 + Math.random() * (X1 - X0 - this.zw - 20);
  }
  bar() {
    const e = EVENTS[this.ev];
    const detail = e.k === 'pull' ? `${this.reps}/${e.reps}` : e.k === 'mash' ? `${Math.round(this.fill)} % · ${Math.ceil(this.left)} s` : `${Math.ceil(this.left)} s`;
    UI.minibar(`Fitness Bartory · Prueba ${this.ev + 1}/${EVENTS.length}: ${e.name} ${detail}`, { exit: () => this.exit() });
  }
  exit() {
    if (this.lock || UI.busy) return;
    this.lock = true; UI.minibar(null);
    this.scene.start('world');
  }
  debugWin() { if (!this.lock) { this.ev = EVENTS.length - 1; this.passed(); } }

  async retry(msg) {
    this.lock = true;
    Sound.sfx('bad');
    await UI.say('Bart', msg);
    this.begin();
  }

  // Prueba superada: siguiente o final
  async passed() {
    this.lock = true;
    Sound.sfx('get');
    await new Promise((r) => this.time.delayedCall(500, r));
    if (++this.ev < EVENTS.length) return this.begin();
    UI.minibar(null);
    const first = !State.flag('cali');
    State.set('cali');
    if (first) await SCRIPTS.bartWin();
    else await UI.say('Bart', '¡Otra tanda limpia! Mañana, agujetas. Pasado mañana, front lever. Bueno, pasado mañana no. En catorce meses.');
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000, e = EVENTS[Math.min(this.ev, EVENTS.length - 1)];
    this.bart.setTexture(`bart_down_${Math.floor(time / 260) % 2}`);
    if (!this.lock && !UI.busy) {
      if (Input.take('b')) return this.exit();
      const press = Input.take('a');
      if (e.k === 'pull') {
        this.pos += this.dirn * e.speed * dt;
        if (this.pos > X1 - X0) { this.pos = X1 - X0; this.dirn = -1; }
        if (this.pos < 0) { this.pos = 0; this.dirn = 1; }
        if (press) {
          const x = X0 + this.pos;
          if (x < this.zx || x > this.zx + this.zw) { Sound.sfx('bad'); this.cameras.main.shake(120, 0.004); UI.toast(QUIPS[Math.floor(Math.random() * QUIPS.length)]); }
          else {
            Sound.sfx('rep'); this.reps++;
            this.tweens.add({ targets: this, lift: 1, duration: 170, yoyo: true, ease: 'Quad.out' });
            if (this.reps >= e.reps) this.passed(); else this.newZone();
          }
        }
      } else if (e.k === 'mash') {
        this.left -= dt;
        this.fill = Math.max(0, this.fill - e.decay * dt);
        if (press) { this.fill = Math.min(100, this.fill + e.gain); Sound.sfx('step'); this.lift = 1; }
        this.lift = Math.max(0, this.lift - dt * 7);
        if (this.fill >= 100) this.passed();
        else if (this.left <= 0) this.retry(`¡Tiempo! Te has quedado en el ${Math.round(this.fill)} %. Eso no es un sprint, es un paseo. ¡Otra vez, y más rápido!`);
      } else {
        this.left -= dt;
        const easy = Math.max(0.6, 1 - this.holdFails * 0.1); // −10 % de temblor por reintento (hasta −40 %)
        if ((this.windT -= dt) <= 0) { this.windT = 0.35 + Math.random() * 0.5; this.wind = (Math.random() * 2 - 1) * (2.2 + (e.time - this.left) * 0.16) * 0.9 * easy; } // ×0,9: un 10 % más suave
        const d = Input.dir().x;
        this.vel += (this.wind + d * 4.2) * dt;
        this.vel *= Math.exp(-1.2 * dt);
        this.bal += this.vel * dt;
        if (Math.abs(this.bal) > 1) { this.bal = Math.sign(this.bal); this.vel = 0; }
        if (Math.abs(this.bal) > 0.38) this.out += dt;
        if (this.out > e.miss + this.holdFails * 0.4) { this.holdFails++; this.retry('¡Se te ha caído la cadera! Glúteo apretado, abdomen apretado, carácter apretado. Desde el principio.'); } // y algo más de margen fuera de la zona
        else if (this.left <= 0) this.passed();
      }
      this.bar();
    } else Input.clear();

    // Colgadín: cuelga de la barra en las dominadas; en el suelo en las otras dos
    const m = this.meter.clear();
    this.cord.clear();
    if (e.k === 'pull') {
      const y = 92 - this.lift * 24;
      this.col.setPosition(160, y).setAngle(0).setTexture(`colgadin_down_${this.lift > 0.5 ? 1 : 0}`);
      this.cord.fillStyle(0x231a14).fillRect(159, 70, 2, Math.max(0, y - 66));
      m.fillStyle(0x1a1412).fillRect(X0 - 3, MY - 3, X1 - X0 + 6, 14).fillStyle(0x8a8f9a).fillRect(X0, MY, X1 - X0, 8);
      m.fillStyle(0x5aa648).fillRect(Math.round(this.zx), MY, this.zw, 8).fillStyle(0x9ad486).fillRect(Math.round(this.zx), MY, this.zw, 2);
      m.fillStyle(0xffffff).fillRect(Math.round(X0 + this.pos) - 1, MY - 5, 3, 18).fillStyle(0xe2574c).fillRect(Math.round(X0 + this.pos), MY - 5, 1, 18);
    } else if (e.k === 'mash') {
      this.col.setPosition(160, 98 - this.lift * 14).setAngle(0).setTexture(`colgadin_down_${this.lift > 0.3 ? 1 : 0}`);
      m.fillStyle(0x1a1412).fillRect(X0 - 3, MY - 3, X1 - X0 + 6, 14).fillStyle(0x8a8f9a).fillRect(X0, MY, X1 - X0, 8);
      m.fillStyle(this.fill > 75 ? 0x5aa648 : this.fill > 40 ? 0xffd23f : 0xe2574c).fillRect(X0, MY, (X1 - X0) * this.fill / 100, 8);
      m.fillStyle(0x1a1412).fillRect(X0 - 3, MY - 12, X1 - X0 + 6, 5).fillStyle(0x6fb4ee).fillRect(X0, MY - 11, (X1 - X0) * Math.max(0, this.left) / e.time, 3);
    } else {
      this.col.setPosition(160 + this.bal * 26, 100).setAngle(this.bal * 28).setTexture('colgadin_down_0');
      m.fillStyle(0x1a1412).fillRect(X0 - 3, MY - 3, X1 - X0 + 6, 14).fillStyle(0xe2574c).fillRect(X0, MY, X1 - X0, 8);
      const zw = (X1 - X0) * 0.38;
      m.fillStyle(0x5aa648).fillRect(MID - zw / 2, MY, zw, 8).fillStyle(0x9ad486).fillRect(MID - zw / 2, MY, zw, 2);
      m.fillStyle(0xffffff).fillRect(Math.round(MID + this.bal * (X1 - X0) / 2) - 1, MY - 5, 3, 18);
      m.fillStyle(0x1a1412).fillRect(X0 - 3, MY - 12, X1 - X0 + 6, 5).fillStyle(0x6fb4ee).fillRect(X0, MY - 11, (X1 - X0) * Math.max(0, this.left) / e.time, 3);
      m.fillStyle(0xe2574c).fillRect(X0, MY + 11, (X1 - X0) * Math.min(1, this.out / (e.miss + this.holdFails * 0.4)), 2);
    }
  }
}
