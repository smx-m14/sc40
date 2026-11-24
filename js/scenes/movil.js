// Después de la fiesta: todos se han ido a dormir y Cait se ha dejado el móvil encima de la mesa.
// Fondo de pantalla: Mootoo. Se abre TikTok y salen los vídeos de «Material Insipiración/Móvil» por orden, pixelados
// recreados en pixel art en js/movil-clips.js. De fondo, la música de créditos.
// Al acabarse la batería empiezan los créditos (js/creditos.js), el reparto y el aviso; luego, la pantalla final.
import { State, CHARACTERS, GACHA } from '../state.js';
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { MOVIL_CLIPS } from '../movil-clips.js';
import { CREDITS, STARRING, DISCLAIMER } from '../creditos.js';

const SW = 90, SH = 160;           // pantalla del móvil, en píxeles del juego
const PX = 160, PY = 90;           // centro del móvil en primer plano
const BULBS = ['#ffe066', '#e2574c', '#3f8fd8', '#82cc6a', '#f7a8c0'];

// ------------------------------------------------------------ Fuente de 3×5 (la pantalla del móvil es diminuta)
const F = {
  A: '.#. #.# ### #.# #.#', B: '##. #.# ##. #.# ##.', C: '.## #.. #.. #.. .##', D: '##. #.# #.# #.# ##.', E: '### #.. ##. #.. ###',
  F: '### #.. ##. #.. #..', G: '.## #.. #.# #.# .##', H: '#.# #.# ### #.# #.#', I: '### .#. .#. .#. ###', J: '..# ..# ..# #.# .#.',
  K: '#.# #.# ##. #.# #.#', L: '#.. #.. #.. #.. ###', M: '#.# ### #.# #.# #.#', N: '##. #.# #.# #.# #.#', O: '.#. #.# #.# #.# .#.',
  P: '##. #.# ##. #.. #..', Q: '.#. #.# #.# ##. .##', R: '##. #.# ##. #.# #.#', S: '.## #.. .#. ..# ##.', T: '### .#. .#. .#. .#.',
  U: '#.# #.# #.# #.# ###', V: '#.# #.# #.# .#. .#.', W: '#.# #.# ### ### #.#', X: '#.# #.# .#. #.# #.#', Y: '#.# #.# .#. .#. .#.',
  Z: '### ..# .#. #.. ###', 0: '### #.# #.# #.# ###', 1: '.#. ##. .#. .#. ###', 2: '##. ..# .#. #.. ###', 3: '##. ..# .#. ..# ##.',
  4: '#.# #.# ### ..# ..#', 5: '### #.. ##. ..# ##.', 6: '.## #.. ### #.# ###', 7: '### ..# .#. .#. .#.', 8: '### #.# ### #.# ###',
  9: '### #.# ### ..# ##.', '?': '##. ..# .#. ... .#.', '¿': '.#. ... .#. #.. .##', '#': '#.# ### #.# ### #.#', '@': '.#. #.# ### #.. .##',
  _: '... ... ... ... ###', '-': '... ... ### ... ...', '/': '..# ..# .#. #.. #..', '%': '#.# ..# .#. #.. #.#', '+': '... .#. ### .#. ...',
  '"': '#.# #.# ... ... ...',
  ':': '. # . # .', '.': '. . . . #', ',': '. . . # #', '!': '# # # . #', '¡': '# . # # #', "'": '# # . . .', ' ': '. . . . .', '·': '. . # . .',
  '(': '.# #. #. #. .#', ')': '#. .# .# .# #.',
};
function glyph(c) { const rows = (F[c] || F['?']).split(' '); return { w: rows[0].length, rows }; }
const plain = (s) => String(s).normalize('NFD').replace(/[̀-̂̄-ͯ]/g, '').replace(/ñ/gi, 'N').toUpperCase();
function textW(s, k = 1) { return [...plain(s)].reduce((w, c) => w + (glyph(c).w + 1) * k, -k); }
// Escribe con la fuente de 3×5 usando un rect(x, y, w, h)
function drawText(rect, s, x, y, k = 1) {
  x = Math.round(x); y = Math.round(y);
  for (const c of plain(s)) {
    const g = glyph(c);
    g.rows.forEach((row, j) => [...row].forEach((v, i) => { if (v === '#') rect(x + i * k, y + j * k, k, k); }));
    x += (g.w + 1) * k;
  }
}
function wrap(s, maxW) {
  const out = []; let cur = '';
  for (const w of String(s).split(/\s+/)) {
    const t = cur ? cur + ' ' + w : w;
    if (textW(t) > maxW && cur) { out.push(cur); cur = w; } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}

// ------------------------------------------------------------ Iconos en píxeles
const COL = { w: '#ffffff', k: '#111114', r: '#fe2c55', c: '#25f4ee', g: '#9a9aa6', y: '#ffe066', p: '#f7a8c0', o: '#e8873a', b: '#3f8fd8', n: '#2b2320', G: '#3f8f6b', s: '#cfd3dc' };
const ICON = {
  heart: ['.ww.ww.', 'wwwwwww', 'wwwwwww', '.wwwww.', '..www..', '...w...'],
  comment: ['.wwwww.', 'wwwwwww', 'wkwkwkw', 'wwwwwww', '.wwwww.', '..ww...'],
  share: ['....w..', '....ww.', 'wwwwwww', 'w...ww.', 'w...w..', 'w......'],
  note: ['..www', '..w.w', '..w..', 'www..', 'ww...'],
  home: ['...w...', '..www..', '.wwwww.', 'wwwwwww', '.ww.ww.', '.ww.ww.'],
  find: ['.www..', 'w...w.', 'w...w.', '.www..', '....w.', '.....w'],
  plus: ['ccwwwrr', 'cwwkwwr', 'cwkkkwr', 'cwwkwwr', 'ccwwwrr'],
  inbox: ['wwwwwww', 'ww...ww', 'w.w.w.w', 'w..w..w', 'wwwwwww'],
  user: ['..ww..', '.wwww.', '.wwww.', '..ww..', 'wwwwww', 'wwwwww'],
  tok: ['....w...', '....ww..', '....w.w.', '....w...', '....w...', '....w...', '.www....', 'w...w...', 'w...w...', '.www....'],
  hand: ['..kk....', '.kwwk...', '.kwwk...', '.kwwkkk.', 'kkwwwwwk', 'kwwwwwwk', 'kwwwwwwk', '.kwwwwk.', '..kkkk..'],
  bubble: ['.wwwww.', 'wwwwwww', 'wwwwwww', '.wwwww.', '.w.....'],
  phone: ['ww.....', 'www....', '.ww....', '..ww...', '...www.', '....ww.'],
  cam: ['..ww...', 'wwwwwww', 'ww.k.ww', 'w.kkk.w', 'ww.k.ww', 'wwwwwww'],
  photo: ['wwwwwww', 'w....yw', 'w.....w', 'w..G..w', 'w.GGG.w', 'wwwwwww'],
  pin: ['.www.', 'ww.ww', 'wwwww', '.www.', '..w..'],
  gear: ['.w.w.', 'wwwww', 'ww.ww', 'wwwww', '.w.w.'],
  paw: ['.w.w.', '.....', 'w.w.w', '.www.', '.www.'],
  clock: ['.www.', 'w.w.w', 'w.ww.', 'w...w', '.www.'],
};
function drawIcon(ctx, name, x, y, sub = {}) {
  ICON[name].forEach((row, j) => [...row].forEach((v, i) => {
    if (v === '.') return;
    ctx.fillStyle = COL[sub[v] || v]; ctx.fillRect(x + i, y + j, 1, 1);
  }));
}
const iconW = (n) => Math.max(...ICON[n].map((r) => r.length));


export class MovilScene extends Phaser.Scene {
  constructor() { super('movil'); }

  preload() { if (!this.textures.exists('movil_fondo')) this.load.image('movil_fondo', 'assets/movil/fondo.png'); }

  init(data) { this.stats = data && data.guests != null ? data : null; }

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#0d0a14').fadeIn(800);
    UI.hud(false); UI.minibar(null);
    Sound.music(null);
    this.phase = 'room'; this.skipping = false; this.onA = null; this.onNext = null; this.vid = null; this.credits = null;
    this.liked = {}; this.pop = 0; this.battery = 5; this.hand = null; this.slide = 0; this.bootT = 0;

    // --- La habitación de la fiesta, a oscuras
    const room = this.room = this.add.container(0, 0);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 20; x++) room.add(this.add.image(x * 16, y * 16, y === 0 ? 'tile_Y' : y === 1 ? 'tile_Z' : 'tile_O').setOrigin(0));
    room.add(this.add.image(160, 150, 'rug').setScale(2));
    room.add(this.add.image(40, 48, 'kallax_cait').setOrigin(0.5, 1)); room.add(this.add.image(290, 46, 'floorlamp_cait').setOrigin(0.5, 1)); room.add(this.add.image(26, 66, 'bed2').setOrigin(0.5, 1));
    [120, 160, 200].forEach((x, i) => room.add(this.add.image(x, 26, 'cuadro' + (i + 1)).setOrigin(0.5, 1)));
    room.add(this.add.image(250, 54, 'sofa_cait2').setOrigin(0.5, 1));
    const floor = this.add.graphics();
    for (let i = 0; i < 90; i++) floor.fillStyle(Phaser.Display.Color.HexStringToColor(BULBS[i % 5]).color).fillRect((i * 53 + 7) % 316, 70 + ((i * 37) % 104), 2 + (i % 2), 1);
    room.add(floor);
    if (State.flag('globos')) [[60, 170, 'r'], [250, 168, 'y'], [292, 120, 'b']].forEach(([x, y, c]) => room.add(this.add.image(x, y, 'pballoon_' + c).setOrigin(0.5, 1).setAngle(x > 200 ? 70 : -70)));
    room.add(this.add.image(160, 108, 'table').setOrigin(0.5, 1).setScale(1.5));
    const t = this.add.graphics(); // plato con las migas de la tarta y el móvil
    t.fillStyle(0xf4f4ee).fillEllipse(176, 88, 18, 7).fillStyle(0xf7a8c0).fillRect(172, 86, 3, 2).fillStyle(0x4a2c1e).fillRect(178, 87, 2, 1).fillRect(169, 88, 1, 1);
    room.add(t);
    this.col = this.add.image(214, 152, 'colgadin_down_0').setAngle(-90).setScale(1.5);
    room.add(this.col);
    this.dark = this.add.rectangle(-80, 0, 480, 180, 0x0a0a24, 0.55).setOrigin(0);
    room.add(this.dark);
    this.rg = this.add.graphics(); // móvil sobre la mesa, Zzz y brillo (encima de la penumbra)
    room.add(this.rg);

    // --- Primer plano del móvil
    const close = this.close = this.add.container(0, 0).setVisible(false);
    const wood = this.add.graphics();
    wood.fillStyle(0x6b4a2e).fillRect(-80, 0, 480, 180);
    for (let y = 0; y < 180; y += 22) wood.fillStyle(0x5a3c24).fillRect(-80, y, 480, 1);
    for (let i = 0; i < 40; i++) wood.fillStyle(0x7c5636).fillRect(-80 + ((i * 97) % 480), (i * 41) % 180, 10 + (i % 4) * 6, 1);
    for (let i = 0; i < 26; i++) wood.fillStyle(Phaser.Display.Color.HexStringToColor(BULBS[i % 5]).color).fillRect(((i * 71) % 400) - 40, (i * 53) % 176, 3, 2);
    wood.fillStyle(0xf4f4ee).fillEllipse(262, 40, 70, 28).fillStyle(0xe6e0d6).fillEllipse(262, 40, 54, 18).fillStyle(0xf7a8c0).fillRect(254, 36, 5, 3).fillStyle(0x4a2c1e).fillRect(268, 42, 3, 2);
    const body = this.add.graphics();
    body.fillStyle(0x000000, 0.35).fillRoundedRect(PX - 50 + 4, PY - 87 + 4, 100, 174, 10);
    body.fillStyle(0xe0b0d5).fillRoundedRect(PX - 51, PY - 88, 102, 176, 11);     // funda rosa
    body.fillStyle(0x1a1a22).fillRoundedRect(PX - 48, PY - 85, 96, 170, 9);
    body.fillStyle(0x3a3a48).fillRect(PX - 44, PY - 85, 88, 1);
    close.add([wood, body]);
    if (this.textures.exists('movil_scr')) this.textures.remove('movil_scr');
    this.scr = this.textures.createCanvas('movil_scr', SW, SH);
    this.ctx = this.scr.getContext();
    this.ctx.imageSmoothingEnabled = false;
    close.add(this.add.image(PX, PY, 'movil_scr'));
    this.buf = document.createElement('canvas'); this.buf.width = SW; this.buf.height = SH;
    this.bctx = this.buf.getContext('2d', { willReadFrequently: true });
    this.prev = document.createElement('canvas'); this.prev.width = SW; this.prev.height = SH;
    this.fondo = this.textures.get('movil_fondo').getSourceImage();
    const bc = this.bctx;
    this.pixFont = { w: (s) => textW(s), draw: (s, x, y, col) => { bc.fillStyle = col; drawText((a, b, w, h) => bc.fillRect(a, b, w, h), s, x, y); } };

    UI.minibar('El móvil de Cait', { exit: () => this.skip(), labels: { exit: 'Saltar' } });
    Input.clear();
    this.sequence();
  }

  wait(ms) { return new Promise((r) => { if (this.skipping) return r(); const ev = this.time.delayedCall(ms, r); this.waits = (this.waits || []).concat({ ev, r }); }); }
  // Espera a que se pulse acción (o a que pase el tiempo, si se da)
  waitA(ms) {
    return new Promise((r) => {
      if (this.skipping) return r();
      const done = () => { this.onA = null; if (ev) ev.remove(); r(); };
      const ev = ms ? this.time.delayedCall(ms, done) : null;
      this.onA = done; this.waits = (this.waits || []).concat({ ev, r: done });
    });
  }
  // «Saltar»: en el móvil, directo a los créditos; en los créditos, a la pantalla final
  skip() {
    if (this.phase === 'credits') { if (this.credits) this.credits.finish(); return; }
    if (this.skipping) return;
    this.skipping = true;
    for (const w of this.waits || []) { if (w.ev) w.ev.remove(); w.r(); }
    this.waits = [];
    if (this.onNext) this.onNext();
  }
  debugWin() { this.skip(); }

  async sequence() {
    // 1. La habitación
    await this.wait(1600);
    if (!this.skipping) await UI.say('', ['(La fiesta se ha acabado. Los invitados se han ido a casa y Colgadín se ha quedado frito en la alfombra.)', '(Y encima de la mesa… Cait se ha dejado el móvil.)'], { pos: 'top' });
    this.buzz = this.time.now;
    Sound.seq(['E6', null, 'E6'], 0.07, 'square', 0.05);
    await this.wait(1200);
    if (!this.skipping) await UI.say('', '(¡Bzzz! Se ha encendido la pantalla. ¿Echamos un vistazo? Solo un poquito…)', { pos: 'top' });
    if (!this.skipping) {
      const cam = this.cameras.main;
      cam.pan(150, 90, 900, 'Sine.easeInOut'); cam.zoomTo(5, 900, 'Sine.easeInOut');
      await this.wait(700);
      cam.fadeOut(250, 13, 10, 20);
      await this.wait(300);
    }
    this.toCloseUp();

    // 2. Pantalla de bloqueo
    this.phase = 'lock'; this.bootT = this.time.now;
    UI.minibar('Acción: desbloquear', { exit: () => this.skip(), labels: { exit: 'Saltar' } });
    await this.waitA(7000);
    this.phase = 'unlock'; this.anim = this.time.now; Sound.sfx('ok');
    await this.wait(450);

    // 3. Inicio: el dedo va a TikTok
    this.phase = 'home'; this.anim = this.time.now;
    UI.minibar('El móvil de Cait', { exit: () => this.skip(), labels: { exit: 'Saltar' } });
    this.hand = { x: 70, y: 170, tx: 52, ty: 141 };
    await this.wait(1300);
    this.tap = this.time.now; Sound.sfx('step');
    await this.wait(250);
    this.phase = 'open'; this.anim = this.time.now;
    await this.wait(400);
    this.phase = 'splash'; this.anim = this.time.now; this.hand = null;
    Sound.music('creditos', true);
    await this.wait(1300);

    // 4. TikTok: los vídeos por orden
    UI.minibar('Acción: me gusta\nAbajo: siguiente vídeo', { exit: () => this.skip(), labels: { exit: 'Saltar' } });
    for (let i = 0; i < MOVIL_CLIPS.length && !this.skipping; i++) await this.playVideo(i);
    // 5. Sin batería
    if (!this.skipping) {
      this.stopVideo(true);
      this.phase = 'battery'; this.anim = this.time.now; this.battery = 1;
      Sound.seq(['A5', 'E5', 'C5'], 0.12, 'triangle', 0.15);
      await this.wait(2600);
      this.phase = 'off'; this.anim = this.time.now;
      Sound.seq(['C4', 'G3'], 0.1, 'square', 0.06);
      await this.wait(1200);
    }
    this.stopVideo(true);
    this.skipping = false;
    if (!this.close.visible) this.toCloseUp();
    if (!Sound.cur || Sound.curId !== 'creditos') Sound.music('creditos', true);
    this.phase = 'credits';
    this.close.setVisible(false); // detrás de los créditos y de la pantalla final ya no hace falta el móvil
    UI.minibar(null);
    await this.rollCredits();
    UI.minibar(null);
    await this.finish();
  }

  toCloseUp() {
    const cam = this.cameras.main;
    cam.resetFX(); cam.panEffect.reset(); cam.zoomEffect.reset();
    cam.setZoom(1); cam.setScroll(-(this.scale.width - 320) / 2, 0);
    this.room.setVisible(false); this.close.setVisible(true);
    cam.fadeIn(300, 13, 10, 20);
  }

  // Reproduce el vídeo i (un clip en pixel art de js/movil-clips.js) y se resuelve al acabar o al pasar al siguiente
  playVideo(i) {
    return new Promise((resolve) => {
      // El último fotograma del anterior se queda para la transición (se desliza hacia arriba)
      this.prev.getContext('2d').drawImage(this.buf, 0, 0);
      this.slide = i > 0 ? this.time.now : 0;
      this.vi = i; this.phase = 'tiktok'; this.vid = { t0: this.time.now, dur: MOVIL_CLIPS[i].dur };
      let done = false;
      const end = () => { if (done) return; done = true; this.onNext = null; this.vidEnd = null; resolve(); };
      this.vidEnd = end;
      this.onNext = () => { Sound.sfx('step'); end(); };
    });
  }
  stopVideo() { this.vid = null; this.vidEnd = null; }

  // ------------------------------------------------------------ Créditos (en HTML, con la fuente del juego)
  rollCredits() {
    return new Promise((resolve) => {
      const ov = document.getElementById('overlay');
      const box = document.createElement('div'); box.id = 'credits';
      const roll = document.createElement('div'); roll.className = 'cr-roll';
      const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
      let html = '';
      for (const b of CREDITS) {
        html += '<section class="cr-block">';
        if (b.big) html += `<div class="cr-big">SUPER <span>CAIT'S</span> 40</div>`;
        if (b.title) html += `<div class="cr-title">${esc(b.title)}</div>`;
        for (const [role, who] of b.lines || []) html += `<div class="cr-line"><span class="cr-role">${esc(role)}</span><span class="cr-who">${esc(who)}</span></div>`;
        if (b.note) html += `<div class="cr-note">${esc(b.note)}</div>`;
        html += '</section>';
      }
      html += '<section class="cr-block"><div class="cr-title cr-star">Reparto</div></section>';
      STARRING.forEach((s, i) => {
        html += `<section class="cr-cast ${i % 2 ? 'flip' : ''}"><div class="cr-sprs" data-i="${i}"></div><div class="cr-cast-txt"><div class="cr-name">${esc(s.name)}</div><div class="cr-as">como ${esc(s.role)}</div></div></section>`;
      });
      html += '<section class="cr-block cr-end"><div class="cr-big small">¡Gracias por jugar!</div></section>';
      roll.innerHTML = html;
      box.appendChild(roll);
      const disc = document.createElement('div'); disc.className = 'cr-disc';
      disc.innerHTML = DISCLAIMER.map((l, i) => `<p class="${i === 0 ? 'cr-disc-h' : ''}">${esc(l)}</p>`).join('');
      box.appendChild(disc);
      ov.insertBefore(box, ov.firstChild);

      // Sprites del reparto: se copian de las texturas del juego; los que caminan alternan sus dos fotogramas
      const anims = [];
      roll.querySelectorAll('.cr-sprs').forEach((holder) => {
        const s = STARRING[+holder.dataset.i];
        if (s.img) { const c = this.copyTex(s.img); if (c) { c.classList.add('cr-photo'); holder.appendChild(c); } return; }
        if (!s.spr.length) { holder.innerHTML = '<div class="cr-spot"></div>'; return; }
        s.spr.forEach((name, k) => {
          if (name === 'heladoncio' && State.flag('hat')) name = 'heladoncioh';
          const f0 = this.copyTex(`${name}_down_0`) || this.copyTex(name), f1 = this.copyTex(`${name}_down_1`);
          if (!f0) return;
          const wrapEl = document.createElement('span'); wrapEl.className = 'cr-spr';
          wrapEl.appendChild(f0); if (f1) { f1.classList.add('hidden'); wrapEl.appendChild(f1); anims.push([f0, f1, k]); }
          holder.appendChild(wrapEl);
        });
      });
      let tick = 0;
      const walk = setInterval(() => { tick++; for (const [a, b, k] of anims) { const on = (tick + k) % 2; a.classList.toggle('hidden', !!on); b.classList.toggle('hidden', !on); } }, 260);

      let y = 0, last = performance.now(), raf = 0, state = 'roll', discT = 0;
      const H = () => box.clientHeight;
      const finish = () => {
        if (state === 'done') return;
        state = 'done'; cancelAnimationFrame(raf); clearInterval(walk);
        box.classList.add('out');
        setTimeout(() => { box.remove(); resolve(); }, 600);
      };
      const step = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        const fast = Input.held.a || Input.held.down;
        if (state === 'roll') {
          y += H() * (fast ? 0.6 : 0.12) * dt;
          roll.style.transform = `translateY(${-y}px)`;
          if (y > roll.offsetHeight + H()) { state = 'disc'; discT = now; disc.classList.add('on'); box.classList.add('disc'); Input.clear(); }
        } else if (state === 'disc' && now - discT > 1500 && (Input.take('a') || now - discT > 11000)) finish();
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      this.credits = { finish: () => { if (state === 'roll') { y = roll.offsetHeight + H(); } else finish(); } };
      UI.minibar('Mantén acción para ir más rápido', { exit: () => this.credits && this.credits.finish(), labels: { exit: 'Saltar' } });
    });
  }
  copyTex(key) {
    if (!this.textures.exists(key)) return null;
    const src = this.textures.get(key).getSourceImage(), c = document.createElement('canvas');
    c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0);
    c.style.setProperty('--w', src.width); c.style.setProperty('--h', src.height);
    return c;
  }

  async finish() {
    this.credits = null;
    const d = State.d;
    const st = this.stats || { guests: d.invited.length, total: CHARACTERS.length, layers: Math.max(1, +d.flags.tarta || 1), gifts: d.gacha.length + d.gifts.length, gachaTotal: GACHA.length };
    await UI.ending(st);
    State.d.pos = { map: 'cait', x: 6 * 16 + 8, y: 7 * 16 + 12, dir: 'down' };
    State.save();
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world'));
  }

  // ------------------------------------------------------------ Pantalla del móvil
  drawScreen(time) {
    const c = this.ctx, ph = this.phase;
    c.fillStyle = '#000'; c.fillRect(0, 0, SW, SH);
    const txt = (s, x, y, col, k = 1, shadow = true) => {
      if (shadow) { c.fillStyle = 'rgba(0,0,0,.55)'; drawText((a, b, w, h) => c.fillRect(a, b, w, h), s, x + k, y + k, k); }
      c.fillStyle = col; drawText((a, b, w, h) => c.fillRect(a, b, w, h), s, x, y, k);
    };
    const ctr = (s, y, col, k = 1) => txt(s, Math.round((SW - textW(s, k)) / 2), y, col, k);
    const status = (dark) => {
      txt('4:00', 4, 2, dark ? '#111' : '#fff', 1, !dark);
      const lvl = this.battery, low = lvl <= 2;
      c.fillStyle = dark ? '#111' : '#fff'; c.fillRect(SW - 14, 2, 9, 5); c.fillRect(SW - 5, 3, 1, 3);
      c.fillStyle = '#000'; c.fillRect(SW - 13, 3, 7, 3);
      c.fillStyle = low ? '#fe2c55' : '#82cc6a'; c.fillRect(SW - 13, 3, Math.max(1, Math.round(7 * lvl / 10)), 3);
      txt(lvl + '%', SW - 16 - textW(lvl + '%'), 2, low && Math.floor(time / 400) % 2 ? '#fe2c55' : dark ? '#111' : '#fff', 1, !dark);
      c.fillStyle = '#000'; c.fillRect(SW / 2 - 4, 2, 8, 4); // cámara frontal
    };
    if (ph === 'room' || ph === 'credits' || (ph === 'off' && time - this.anim > 400)) return this.scr.refresh();
    if (ph === 'off') { // se apaga como una tele vieja
      const k = 1 - (time - this.anim) / 400, h = Math.max(1, Math.round(SH * k * k));
      c.fillStyle = '#fff'; c.fillRect(0, (SH - h) / 2, SW, h);
      return this.scr.refresh();
    }

    if (ph === 'lock' || ph === 'unlock') {
      const up = ph === 'unlock' ? Math.min(1, (time - this.anim) / 400) : 0;
      c.drawImage(this.fondo, 0, 0);
      if (ph === 'unlock') this.drawHome(c, time, txt);
      c.save(); c.translate(0, -Math.round(up * SH));
      c.drawImage(this.fondo, 0, 0);
      c.fillStyle = 'rgba(10,10,30,.25)'; c.fillRect(0, 0, SW, SH);
      const on = Math.min(1, (time - this.bootT) / 300);
      c.globalAlpha = on;
      status();
      ctr('4:00', 16, '#fff', 4);
      ctr('HOY: TU CUMPLE', 40, '#ffe066');
      // Notificaciones
      const card = (y, icon, bg, title, line) => {
        c.fillStyle = 'rgba(255,246,220,.86)'; c.fillRect(5, y, SW - 10, 20); c.fillRect(6, y - 1, SW - 12, 22);
        c.fillStyle = bg; c.fillRect(8, y + 3, 11, 11);
        drawIcon(c, icon, 8 + Math.floor((11 - iconW(icon)) / 2), y + 3 + Math.floor((11 - ICON[icon].length) / 2));
        txt(title, 22, y + 3, '#2b2320', 1, false);
        txt(line, 22, y + 11, '#6b5a50', 1, false);
      };
      card(56, 'bubble', '#3f8f6b', 'MENSAJES · 40', 'FELICIDADES!!!');
      card(82, 'tok', '#111114', 'TIKTOK', MOVIL_CLIPS.length + ' VIDEOS NUEVOS');
      if (Math.floor(time / 500) % 2) ctr('DESLIZA PARA ABRIR', 146, '#fff');
      c.fillStyle = '#fff'; c.fillRect(SW / 2 - 12, 155, 24, 1);
      c.restore(); c.globalAlpha = 1;
      return this.scr.refresh();
    }

    if (ph === 'home' || ph === 'open') {
      c.drawImage(this.fondo, 0, 0);
      this.drawHome(c, time, txt);
      if (this.hand) { // el dedo (de Colgadín) va hasta TikTok
        const k = Math.min(1, (time - this.anim) / 1100), e = 1 - (1 - k) ** 3;
        const pressed = this.tap && time - this.tap < 200;
        const hx = this.hand.x + (this.hand.tx - this.hand.x) * e, hy = this.hand.y + (this.hand.ty - this.hand.y) * e + (pressed ? 1 : 0);
        drawIcon(c, 'hand', Math.round(hx) - 2, Math.round(hy));
      }
      if (ph === 'open') { // la aplicación se abre desde su icono
        const k = Math.min(1, (time - this.anim) / 350);
        const x0 = 47 + (0 - 47) * k, y0 = 135 + (0 - 135) * k, w = 13 + (SW - 13) * k, h = 13 + (SH - 13) * k;
        c.fillStyle = '#111114'; c.fillRect(Math.round(x0), Math.round(y0), Math.round(w), Math.round(h));
      }
      return this.scr.refresh();
    }

    if (ph === 'splash') {
      c.fillStyle = '#111114'; c.fillRect(0, 0, SW, SH);
      const x = SW / 2 - 4, y = 60;
      drawIcon(c, 'tok', x - 1, y - 1, { w: 'c' }); drawIcon(c, 'tok', x + 1, y + 1, { w: 'r' }); drawIcon(c, 'tok', x, y);
      if (time - this.anim > 300) ctr('TIKTOK', 78, '#fff');
      return this.scr.refresh();
    }

    // TikTok (y la batería agotándose encima del último fotograma)
    const el = this.vid;
    if (el) {
      const ct = (time - el.t0) / 1000;
      if (ct >= el.dur && this.vidEnd) this.vidEnd();
      this.bctx.save(); this.bctx.fillStyle = '#000'; this.bctx.fillRect(0, 0, SW, SH);
      MOVIL_CLIPS[this.vi].draw(this.bctx, Math.min(ct, el.dur - 0.001), this.pixFont);
      this.bctx.restore();
    }
    const sk = this.slide ? Math.min(1, (time - this.slide) / 320) : 1, off = Math.round((1 - (1 - sk) ** 2) * SH);
    if (sk < 1) { c.drawImage(this.prev, 0, -off); c.drawImage(this.buf, 0, SH - off); } else c.drawImage(this.buf, 0, 0);
    const v = MOVIL_CLIPS[this.vi] || MOVIL_CLIPS[MOVIL_CLIPS.length - 1] || { user: '', text: '', tags: '', likes: '' };
    // Arriba: pestañas
    status();
    txt('SIGUIENDO', 9, 12, '#b8b8c0'); txt('PARA TI', 50, 12, '#fff');
    c.fillStyle = '#fff'; c.fillRect(58, 19, 11, 1);
    // Columna derecha
    const cx = 81, liked = this.liked[this.vi];
    c.fillStyle = '#fff'; c.fillRect(cx - 4, 44, 9, 9); c.fillStyle = BULBS[this.vi % 5]; c.fillRect(cx - 3, 45, 7, 7);
    txt((v.user || '@').replace('@', '').slice(0, 1), cx - 1, 46, '#fff', 1, false);
    c.fillStyle = '#fe2c55'; c.fillRect(cx - 1, 52, 3, 3); c.fillStyle = '#fff'; c.fillRect(cx, 52, 1, 3); c.fillRect(cx - 1, 53, 3, 1);
    drawIcon(c, 'heart', cx - 3, 61, liked ? { w: 'r' } : {});
    txt(v.likes || '', cx - Math.round(textW(v.likes || '') / 2), 69, liked ? '#fe2c55' : '#fff');
    drawIcon(c, 'comment', cx - 3, 78); txt('404', cx - 5, 86, '#fff');
    drawIcon(c, 'share', cx - 3, 95); txt('40', cx - 3, 103, '#fff');
    // Disco que gira
    const a = time / 400;
    c.fillStyle = '#222'; c.fillRect(cx - 4, 131, 9, 9); c.fillStyle = '#555'; c.fillRect(cx - 3, 130, 7, 11); c.fillRect(cx - 5, 132, 11, 7);
    c.fillStyle = BULBS[this.vi % 5]; c.fillRect(cx - 1, 134, 3, 3);
    c.fillStyle = '#aaa'; c.fillRect(Math.round(cx + Math.cos(a) * 4), Math.round(135 + Math.sin(a) * 4), 1, 1);
    // Abajo: usuario, texto, etiquetas y sonido
    const lines = wrap(v.text, 68).slice(0, 2);
    let y = 139 - 7 * (lines.length + (v.tags ? 1 : 0)) - 9;
    c.save(); c.beginPath(); c.rect(0, 0, 72, SH); c.clip(); // que no pise la columna de la derecha
    txt(v.user || '@', 3, y, '#fff'); y += 9;
    for (const l of lines) { txt(l, 3, y, '#fff'); y += 7; }
    if (v.tags) { txt(wrap(v.tags, 68)[0], 3, y, '#ffe066'); y += 7; }
    c.restore();
    drawIcon(c, 'note', 3, 140);
    const song = 'SONIDO ORIGINAL · ' + (v.user || '').replace('@', '') + ' · ';
    c.save(); c.beginPath(); c.rect(10, 139, 58, 7); c.clip();
    const sw = textW(song), sx = 10 - ((time / 40) % sw);
    txt(song, sx, 140, '#fff'); txt(song, sx + sw, 140, '#fff');
    c.restore();
    // Progreso del vídeo
    if (el) { c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(0, 148, SW, 1); c.fillStyle = '#fff'; c.fillRect(0, 148, Math.min(SW, Math.round(SW * (time - el.t0) / 1000 / el.dur)), 1); }
    // Barra de navegación
    c.fillStyle = '#000'; c.fillRect(0, 149, SW, 11);
    drawIcon(c, 'home', 5, 151); drawIcon(c, 'find', 22, 151); drawIcon(c, 'plus', 41, 152); drawIcon(c, 'inbox', 59, 152); drawIcon(c, 'user', 78, 151);
    // Corazón grande al dar «me gusta»
    if (this.pop && time - this.pop < 700) {
      const k = (time - this.pop) / 700, s = 3 + Math.round(Math.sin(Math.min(1, k * 3) * Math.PI / 2) * 2);
      c.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
      ICON.heart.forEach((row, j) => [...row].forEach((q, i) => { if (q !== '.') { c.fillStyle = '#fe2c55'; c.fillRect(SW / 2 - 3.5 * s + i * s, 64 - 3 * s - k * 10 + j * s, s, s); } }));
      c.globalAlpha = 1;
    }
    if (ph === 'battery') { // aviso de batería
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 0, SW, SH);
      c.fillStyle = '#fff6dc'; c.fillRect(8, 58, SW - 16, 40); c.fillRect(9, 57, SW - 18, 42);
      c.fillStyle = '#2b2320'; c.fillRect(SW / 2 - 9, 63, 16, 8); c.fillRect(SW / 2 + 7, 65, 2, 4);
      c.fillStyle = '#fff6dc'; c.fillRect(SW / 2 - 8, 64, 14, 6);
      if (Math.floor(time / 300) % 2) { c.fillStyle = '#fe2c55'; c.fillRect(SW / 2 - 8, 64, 2, 6); }
      ctr('BATERIA: 1%', 76, '#e2574c'); ctr('BUENAS NOCHES,', 84, '#2b2320'); ctr('CAIT', 91, '#2b2320');
    }
    this.scr.refresh();
  }

  // Pantalla de inicio: iconos sobre el fondo de Mootoo (TikTok en el dock)
  drawHome(c, time, txt) {
    txt('4:00', 4, 2, '#fff');
    c.fillStyle = '#fff'; c.fillRect(SW - 14, 2, 9, 5); c.fillRect(SW - 5, 3, 1, 3); c.fillStyle = '#000'; c.fillRect(SW - 13, 3, 7, 3);
    c.fillStyle = '#82cc6a'; c.fillRect(SW - 13, 3, 3, 3);
    c.fillStyle = '#000'; c.fillRect(SW / 2 - 4, 2, 8, 4);
    const app = (x, y, bg, icon, sub) => {
      c.fillStyle = bg; c.fillRect(x + 1, y, 11, 13); c.fillRect(x, y + 1, 13, 11);
      drawIcon(c, icon, x + Math.floor((13 - iconW(icon)) / 2), y + Math.floor((13 - ICON[icon].length) / 2), sub);
    };
    const grid = [['#e8873a', 'photo'], ['#3f8fd8', 'pin'], ['#e2574c', 'note'], ['#82cc6a', 'paw'], ['#7a6ad8', 'clock'], ['#6b6b78', 'gear'], ['#f7a8c0', 'cam'], ['#ffd23f', 'bubble']];
    grid.forEach(([bg, ic], i) => app(9 + (i % 4) * 19, 70 + Math.floor(i / 4) * 21, bg, ic, ic === 'bubble' ? { w: 'n' } : ic === 'photo' ? { w: 'w' } : {}));
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(5, 131, SW - 10, 19);
    const pressed = this.tap && time - this.tap < 200 ? 1 : 0;
    app(9, 134, '#3f8f6b', 'phone'); app(28, 134, '#3f8fd8', 'bubble');
    // TikTok
    c.fillStyle = '#111114'; c.fillRect(47 + 1 + pressed, 134 + pressed, 11 - pressed * 2, 13 - pressed * 2); c.fillRect(47 + pressed, 135 + pressed, 13 - pressed * 2, 11 - pressed * 2);
    drawIcon(c, 'tok', 50, 135, { w: 'c' }); drawIcon(c, 'tok', 52, 137, { w: 'r' }); drawIcon(c, 'tok', 51, 136);
    app(66, 134, '#6b6b78', 'cam');
  }

  update(time) {
    // Habitación: el móvil sobre la mesa, que vibra y se enciende, y los Zzz de Colgadín
    if (this.room.visible) {
      const g = this.rg.clear(), bz = this.buzz && time - this.buzz < 900 ? Math.round(Math.sin(time / 25)) : 0;
      const lit = !!this.buzz;
      if (lit) g.fillStyle(0x9fd8ff, 0.12).fillCircle(150, 88, 16).fillStyle(0x9fd8ff, 0.12).fillCircle(150, 88, 9);
      g.fillStyle(0xe0b0d5).fillRect(146 + bz, 82, 9, 13).fillStyle(0x1a1a22).fillRect(147 + bz, 83, 7, 11);
      g.fillStyle(lit ? 0xbfe6ff : 0x2a3040).fillRect(148 + bz, 84, 5, 9);
      if (lit) g.fillStyle(0xe8873a).fillRect(149 + bz, 87, 3, 3);
      for (let i = 0; i < 3; i++) {
        const k = ((time / 1400) + i / 3) % 1, x = 218 + k * 14 + Math.sin(k * 6) * 2, y = 140 - k * 26;
        g.fillStyle(0xffffff, 1 - k);
        drawText((a, b, w, h) => g.fillRect(a, b, w, h), 'Z', x, y, k > 0.5 ? 2 : 1);
      }
    }
    if (this.close.visible) this.drawScreen(time);
    if (UI.busy) return;
    if (Input.take('a')) {
      if (this.onA) this.onA();
      else if (this.phase === 'tiktok') { this.liked[this.vi] = true; this.pop = time; Sound.sfx('coin'); }
    }
    if ((Input.take('down') || Input.take('right') || Input.take('up')) && this.phase === 'tiktok' && this.onNext) this.onNext();
    if (this.phase !== 'credits') Input.clear();
  }
}
