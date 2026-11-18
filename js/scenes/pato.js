// Minijuego: acercarse a Patito sin que te vea. Colgadín se mueve libremente por la orilla, entre matas de juncos.
// Patito se gira de vez en cuando. No hay semáforo: el único aviso es que tiembla un instante antes de girarse
// (fase 'warn') … y que los capybaras, que lo notan, se tapan la cara con su flor. Mientras mira ('red'),
// Colgadín tiene que estar escondido: pegado a una mata de juncos o a un capybara que quede entre él y Patito.
// Los capybaras también le tienen miedo a Patito y se esconden tras los mismos juncos: van de uno a otro, se quedan
// un rato y a menudo eligen justo el de Colgadín, y lo echan de un empujón. Si Patito te ve, retrocedes al junco que
// quede justo a tu izquierda. Cuanto más cerca de Patito, más pesados se ponen los capybaras.
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { SCRIPTS } from '../story.js';

const X0 = 14, X1 = 270, Y0 = 82, Y1 = 166, SPEED = 40;
const DUCK = { x: 292, y: 126 }, EYE = { x: 282, y: 108 };
const START = { x: 24, y: 152 };
// Matas de juncos (un solo junco cada una): (cx, cy) es la base. Tapan la vista en un rectángulo de 12x12 y no se
// pueden atravesar. Solo escondes si estás PEGADO a la mata (a menos de HIDE_R). En zigzag, muy separadas en
// vertical: para pasar de una a otra hay que cruzar en diagonal un buen trozo al descubierto.
const CLUMPS = [[50, 98], [78, 152], [104, 100], [132, 156], [158, 96], [186, 150], [214, 104], [244, 126]];
const HIDE_R = 26;
// Capybaras: cada uno ocupa el escondite de un junco (justo detrás, a la izquierda), se queda CAPY_STAY segundos y
// se va a otro libre, sin prisa y en curva. Con probabilidad CAPY_STEAL elige el junco donde está Colgadín.
// En cuanto Patito empieza a temblar ('warn') y mientras mira ('red'), todos se quedan quietos donde estén y se
// tapan la cara con su flor (textura capy_hide); no cambian de junco ni empujan hasta que vuelve el verde.
// Usan todos los juncos. Si no van a por el de Colgadín, a veces (CAPY_NEAR) van a rondarle: se le arriman a un
// palmo, siguiéndole si se mueve, y se quedan un momento a su lado (spot = -1). Si no, eligen un junco libre lejos de
// los demás para repartirse por la orilla. Con 7 capybaras y 8 juncos casi siempre hay alguno rondando.
// CAPYS: junco inicial de cada uno (-1 = empieza paseando por el prado, en CAPY_START)
const CAPYS = [1, 3, 4, 5, 6, 7, -1], CAPY_START = { x: 110, y: 128 };
const CAPY_MAX_X = 256;
// Lo pesados que son va de [al principio, junto a Patito] según lo avanzado que esté Colgadín (ver heat())
const CAPY_WALK = [11, 16], CAPY_NEAR = [0.35, 0.7], CAPY_LINGER = [0.6, 1.5], CAPY_GIVE_UP = 5, CAPY_STAY = [[2.5, 5], [1.2, 3]], CAPY_STEAL = [0.7, 0.97], CAPY_STEAL_R = [130, 210], SHOVE = [115, 155];
const CAPY_TURN = 2.3 / 12; // giro proporcional a la velocidad: las curvas tienen siempre el mismo radio
const lerp = ([a, b], t) => a + (b - a) * t;
const spotOf = (i) => ({ x: CLUMPS[i][0] - 14, y: CLUMPS[i][1] });

const segRect = (ax, ay, bx, by, x0, y0, x1, y1) => { // ¿corta el segmento AB al rectángulo?
  let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const rand = ([a, b]) => a + Math.random() * (b - a);
// Por dónde pueden andar los capybaras: no se acercan a Patito ni se meten en las matas
const capyBlocked = (x, y) => x < 34 || x > CAPY_MAX_X || y < Y0 + 2 || y > Y1
  || CLUMPS.some(([cx, cy]) => Math.abs(x - cx) < 12 && y > cy - 7 && y < cy + 5);
// Rumbo que quiere llevar un capybara: hacia su destino, rodeando los juncos cercanos por el lado más corto
const capyWant = (c, s) => {
  let vx = s.x - c.x, vy = s.y - c.y; const n = Math.hypot(vx, vy); vx /= n; vy /= n;
  for (const [cx, cy] of CLUMPS) {
    const ox = c.x - cx, oy = (c.y - cy + 1) * 2, d = Math.hypot(ox, oy); // el junco "pesa" como una elipse ancha
    if (d > 30 || d < 0.01) continue;
    const w = (30 - d) / 30 * 2.2, ux = ox / d, uy = oy / d, side = ux * vy - uy * vx >= 0 ? 1 : -1;
    vx += (ux * 0.6 - uy * side) * w; vy += (uy * 0.6 + ux * side) * w;
  }
  return Math.atan2(vy, vx);
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
    for (const [cx, cy] of CLUMPS) this.add.image(cx, cy, 'reeds').setOrigin(0.5, 1).setDepth(cy + 0.1);

    this.capys = CAPYS.map((spot) => ({ ...(spot >= 0 ? spotOf(spot) : CAPY_START), spot, off: { x: -16, y: 0 }, state: 'stay', t: 1 + Math.random() * 4, a: 0, cd: 0, moving: false,
      spr: this.add.image(0, 0, 'capybara_down_0').setOrigin(0.5, 1) }));
    this.duck = this.add.image(DUCK.x, DUCK.y, 'patito_up_0').setOrigin(0.5, 1).setScale(2).setDepth(DUCK.y);
    this.eye = this.add.graphics().setDepth(299);
    this.col = this.add.image(START.x, START.y, 'colgadin_side_0').setOrigin(0.5, 1);

    this.reset_();
    // Colgadín aún no sabe quién es: en los textos es siempre «el pato gigante», nunca Patito
    UI.minibar('Estanque de los Capybaras · Acércate al pato gigante sin que te vea', { exit: () => this.exit() });
    Input.clear();
    this.lock = true;
    UI.say('Colgadín', [
      'El pato gigante está al otro lado de la orilla, entre los juncos. Se le oye temblar.',
      'Puedo moverme cuando quiera, pero cuando se gire tengo que estar ESCONDIDO: pegadito a un junco o a un capybara, que me tape.',
      'Justo antes de girarse se pone a temblar. Es poquito rato, así que hay que estar atento.',
      'Los capybaras lo notan antes que nadie: en cuanto sienten que se va a girar, se quedan quietos y se tapan la cara con su flor. Si veo flores… ¡a esconderse!',
      'Y ojo: los capybaras también se esconden en los mismos juncos. Si les gusta el mío, me echan de un empujón.',
      'Si el pato gigante me ve, tendré que retroceder hasta el junco anterior. Si estoy bien escondido, me vuelvo medio transparente. ¡A por él!',
    ]).then(() => { this.lock = false; });
  }

  reset_() {
    this.p = { ...START }; this.dir = 'right'; this.anim = 0;
    this.kick = { x: 0, y: 0 };
    this.phase = 'green'; this.t = 2.5;
  }
  exit() {
    if (this.lock || UI.busy) return;
    this.lock = true; UI.minibar(null);
    this.scene.start('world');
  }
  // 0 al salir, 1 junto a Patito: cuánto han de molestar los capybaras
  heat() { return Phaser.Math.Clamp((this.p.x - START.x) / (CLUMPS[CLUMPS.length - 1][0] - START.x), 0, 1); }
  // Adónde vuelve Colgadín si lo pillan en x: al escondite del junco que quede justo a su izquierda (o al inicio).
  // Si un capybara lo ocupa, se queda pegado detrás del capybara, que también le tapa.
  fallback(x) {
    let i = -1;
    CLUMPS.forEach(([cx], j) => { if (cx < x && (i < 0 || cx > CLUMPS[i][0])) i = j; });
    if (i < 0) return { ...START };
    const s = spotOf(i);
    return this.capys.some((c) => Math.hypot(c.x - s.x, c.y - s.y) < 14) ? { x: s.x - 16, y: s.y } : s;
  }
  debugWin() { if (!this.lock) this.win(); }

  // Índice del junco tras el que está escondido Colgadín (-1 si ninguno)
  clumpAt() {
    const ax = this.p.x, ay = this.p.y - 6;
    return CLUMPS.findIndex(([cx, cy]) => Math.hypot(this.p.x - cx, this.p.y - cy) < HIDE_R && segRect(ax, ay, EYE.x, EYE.y, cx - 6, cy - 12, cx + 6, cy));
  }
  // Escondido tras un junco… o tras un capybara (también pegado a él)
  hidden() {
    if (this.clumpAt() >= 0) return true;
    const ax = this.p.x, ay = this.p.y - 6;
    return this.capys.some((c) => Math.hypot(this.p.x - c.x, this.p.y - c.y) < HIDE_R && segRect(ax, ay, EYE.x, EYE.y, c.x - 9, c.y - 13, c.x + 9, c.y));
  }
  wall(x, y) { // bordes y matas (sin contar capybaras)
    if (x < X0 || x > X1 || y < Y0 || y > Y1) return true;
    return CLUMPS.some(([cx, cy]) => Math.abs(x - cx) < 7 && y > cy - 4 && y < cy + 3);
  }
  blocked(x, y) {
    return this.wall(x, y) || this.capys.some((c) => Math.abs(x - c.x) < 13 && Math.abs(y - c.y) < 6);
  }

  async scare() {
    this.lock = true;
    Sound.clip('patito', 0.6);
    UI.toast('¡¡CUAC!! ¡Un ratón gigante!');
    this.cameras.main.shake(250, 0.006);
    this.tweens.add({ targets: this.duck, y: DUCK.y - 14, duration: 120, yoyo: true, repeat: 1 });
    await new Promise((r) => this.time.delayedCall(900, r));
    this.p = this.fallback(this.p.x); this.kick = { x: 0, y: 0 };
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

  // Siguiente destino de un capybara (índice de junco, o -1 = ir a rondar a Colgadín): a menudo el junco de Colgadín
  // (si está cerca); si no, a veces rondarle; si no, un junco libre alejado de los demás capybaras (para que se repartan
  // por toda la orilla), sin irse tampoco a la otra punta
  pickSpot(c, mine) {
    const h = this.heat();
    const others = this.capys.filter((o) => o !== c && o.spot >= 0);
    const taken = new Set(others.map((o) => o.spot));
    const dist = (i) => Math.hypot(spotOf(i).x - c.x, spotOf(i).y - c.y);
    const free = CLUMPS.map((_, i) => i).filter((i) => i !== c.spot && !taken.has(i));
    if (mine >= 0 && free.includes(mine) && dist(mine) < lerp(CAPY_STEAL_R, h) && Math.random() < lerp(CAPY_STEAL, h)) return mine;
    if (!free.length || Math.random() < lerp(CAPY_NEAR, h)) {
      const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 14; // se arrima a un palmo (a veces, encima)
      c.off = { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.6 }; c.give = CAPY_GIVE_UP;
      return -1;
    }
    if (!others.length) return free[Math.floor(Math.random() * free.length)];
    const spread = (i) => Math.min(...others.map((o) => Math.hypot(spotOf(i).x - spotOf(o.spot).x, spotOf(i).y - spotOf(o.spot).y)));
    const score = (i) => spread(i) - 0.25 * dist(i) + Math.random() * 15;
    return free.reduce((a, b) => (score(b) > score(a) ? b : a));
  }

  // Adónde va un capybara: a su junco o, si está rondando, al lado de Colgadín (le sigue si se mueve)
  target(c) {
    if (c.spot >= 0) return spotOf(c.spot);
    const x = Phaser.Math.Clamp(this.p.x + c.off.x, 36, CAPY_MAX_X - 2), y = Phaser.Math.Clamp(this.p.y + c.off.y, Y0 + 4, Y1 - 1);
    return capyBlocked(x, y) ? { x: c.x, y: c.y } : { x, y };
  }

  updateCapys(dt) {
    const alarm = this.phase !== 'green';
    const mine = this.lock ? -1 : this.clumpAt();
    for (const c of this.capys) {
      c.cd -= dt;
      if (c.state === 'stay') {
        // Escondido en su junco; cuando se cansa (y Patito no está a punto de mirar), se va a otro
        c.moving = false;
        c.t -= dt;
        if (c.t <= 0 && !alarm) {
          c.spot = this.pickSpot(c, mine); c.state = 'go';
          const s = this.target(c);
          c.a = Math.atan2(s.y - c.y, s.x - c.x) + (Math.random() - 0.5) * 1.6; // sale torcido: el camino es una curva
        }
      } else if (alarm) {
        c.moving = false; // Patito se gira: se queda quieto a medio camino (tapándose la cara con la flor)
      } else {
        // Si lleva un rato persiguiendo a Colgadín sin alcanzarlo, se cansa y vuelve a decidir
        if (c.spot < 0 && (c.give -= dt) <= 0) { c.state = 'stay'; c.t = 0.3; continue; }
        const s = this.target(c), dx = s.x - c.x, dy = s.y - c.y, d = Math.hypot(dx, dy);
        const spd = lerp(CAPY_WALK, this.heat()), step = spd * dt;
        c.moving = true;
        if (d <= step) { c.x = s.x; c.y = s.y; c.state = 'stay';
          if (c.spot < 0) c.t = rand(CAPY_LINGER); // rondando: se queda un momento al lado y vuelve a decidir
          else { const t0 = rand(CAPY_STAY[0]); c.t = t0 + (rand(CAPY_STAY[1]) - t0) * this.heat(); }
        }
        else if (d < 6) { c.x += dx / d * step; c.y += dy / d * step; }
        else {
          c.a += Phaser.Math.Clamp(wrap(capyWant(c, s) - c.a), -CAPY_TURN * spd * dt, CAPY_TURN * spd * dt);
          // Si aun así choca con un junco, prueba a desviarse un poco a cada lado
          for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7]) {
            const a = c.a + k * 0.4, nx = c.x + Math.cos(a) * step, ny = c.y + Math.sin(a) * step;
            if (!capyBlocked(nx, ny)) { c.x = nx; c.y = ny; c.a = a; break; }
          }
        }
      }
      // Empujón: si Colgadín le estorba, lo aparta (sobre todo en vertical, fuera de la sombra del junco)
      if (!this.lock && !alarm && c.cd <= 0 && Math.abs(this.p.x - c.x) < 12 && Math.abs(this.p.y - c.y) < 7) {
        let kx = this.p.x - c.x, ky = this.p.y - c.y;
        const sy = Math.sign(ky) || (Math.random() < 0.5 ? -1 : 1);
        ky = sy * Math.max(Math.abs(ky), 6); kx = Phaser.Math.Clamp(kx, -6, 6);
        const n = Math.hypot(kx, ky);
        const f = lerp(SHOVE, this.heat());
        this.kick = { x: kx / n * f, y: ky / n * f };
        c.cd = 1;
        Sound.sfx('push');
        this.cameras.main.shake(120, 0.004);
      }
    }
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.updateCapys(dt);
    if (!this.lock && !UI.busy) {
      this.t -= dt;
      if (this.t <= 0) {
        // Avisa poco antes de girarse; a veces amaga y no se gira, y a veces se gira dos veces seguidas
        if (this.phase === 'green') { this.phase = 'warn'; this.t = 0.42 + Math.random() * 0.13; this.fake = Math.random() < 0.25; }
        else if (this.phase === 'warn' && this.fake) { this.phase = 'green'; this.t = 0.7 + Math.random() * 1.0; }
        else if (this.phase === 'warn') { this.phase = 'red'; this.t = 1.2 + Math.random() * 1.6; Sound.sfx('bump'); }
        else if (Math.random() < 0.3) { this.phase = 'warn'; this.t = 0.4; this.fake = false; }
        else { this.phase = 'green'; this.t = 1.2 + Math.random() * 1.4; }
      }
      const d = Input.dir();
      if (d.x || d.y) {
        const nx = this.p.x + d.x * SPEED * dt, ny = this.p.y + d.y * SPEED * dt;
        if (!this.blocked(nx, this.p.y)) this.p.x = nx;
        if (!this.blocked(this.p.x, ny)) this.p.y = ny;
        if (d.x) this.dir = d.x < 0 ? 'left' : 'right';
        this.anim += dt;
      }
      // Inercia del empujón (se frena enseguida)
      if (this.kick.x || this.kick.y) {
        const nx = this.p.x + this.kick.x * dt, ny = this.p.y + this.kick.y * dt;
        if (!this.wall(nx, this.p.y)) this.p.x = nx; else this.kick.x = 0;
        if (!this.wall(this.p.x, ny)) this.p.y = ny; else this.kick.y = 0;
        const f = Math.exp(-6 * dt); this.kick.x *= f; this.kick.y *= f;
        if (Math.hypot(this.kick.x, this.kick.y) < 4) this.kick = { x: 0, y: 0 };
      }
      if (this.phase === 'red' && !this.hidden()) this.scare();
      if (Input.take('b')) this.exit();
      if (!this.lock && Math.hypot(this.p.x - DUCK.x, this.p.y - DUCK.y) < 30) this.win();
    }
    Input.just = {};

    const frame = Math.floor(time / 400) % 2;
    const shy = this.phase !== 'green';
    for (const c of this.capys) c.spr.setPosition(Math.round(c.x), Math.round(c.y)).setDepth(c.y).setTexture(shy ? 'capy_hide' : `capybara_down_${c.moving ? frame : 0}`);
    const looking = this.phase === 'red', hid = this.hidden();
    if (!this.lock || this.phase !== 'green') this.duck.setTexture(looking ? 'patito_down_0' : 'patito_up_0');
    // Único aviso de que se va a girar: tiembla
    this.duck.x = DUCK.x + (this.phase === 'warn' ? Math.sin(time / 25) * 1.5 : 0);
    this.col.setPosition(Math.round(this.p.x), Math.round(this.p.y)).setDepth(this.p.y + 0.05).setFlipX(this.dir === 'left')
      .setTexture(`colgadin_side_${Math.floor(this.anim / 0.15) % 2}`).setAlpha(hid ? 0.6 : 1);
    // Mirada de Patito cuando está girado: un cono tenue hacia la orilla
    this.eye.clear();
    if (looking) this.eye.fillStyle(0xffe066, 0.12).fillTriangle(EYE.x, EYE.y, 0, Y0 - 20, 0, Y1 + 20);
  }
}
