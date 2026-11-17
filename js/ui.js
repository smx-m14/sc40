// Interfaz en HTML/CSS sobre el lienzo: diálogos, HUD, menú, título y avisos.
import { State, CHARACTERS, GACHA, GIFTS, ALBUM, TOTAL_SOCKS, SOCK_DESIGNS, SOCK_DESIGN } from './state.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { STEPS, PLACES, skipTo, teleport, reloadWorld } from './debug.js';
import { completion } from './progress.js';
import { gachaIcon, icon } from './art.js';

const $ = (id) => document.getElementById(id);
const show = (el, on = true) => el.classList.toggle('hidden', !on);
// Iconos pixel: los símbolos y emojis del interfaz se sustituyen al pintar por dibujos del propio juego.
// También vale escribir {nombre} en un texto (p. ej. '{sock} ¡Un calcetín!').
const EMO = {
  '🧦': 'sock', '🪙': 'coin', '💌': 'invites', '🔊': 'sound_on', '🔇': 'sound_off', '☰': 'menu', '⏭': 'skip', '↩': 'undo', '⟲': 'reset', '✕': 'close',
  '▲': 'arrow', '▶': 'arrow r90', '▼': 'arrow r180', '◀': 'arrow r270', '👉': 'arrow r90', '🛠': 'wrench', '📖': 'book', '✓': 'check', '✅': 'check', '⬜': 'box',
  '🐾': 'paw', '❔': 'question', '🎫': 'ticket', '🪞': 'mirror', '🔒': 'lock', '📝': 'note', '🧲': 'magnet', '➕': 'plus', '💿': 'disc', '🎹': 'music',
};
const EMO_RE = new RegExp(Object.keys(EMO).join('|'), 'gu');
const ic = (n) => { const [name, rot] = n.split(' '); return `<img class="ico ${rot || ''}" src="${icon(name)}" alt="">`; };
const pix = (html) => html.replace(/\uFE0F/g, '').replace(EMO_RE, (m) => ic(EMO[m])).replace(/\{(\w+)\}/g, (m, n) => ic(n));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const UI = {
  dlg: null,       // diálogo activo
  open: null,      // 'menu' | 'prompt' | 'title' | null
  tab: 'prep',
  hintFn: () => '',

  get busy() { return !!(this.dlg || this.open); },

  init() {
    Input.interceptor = (b) => this.onButton(b);
    $('dialog').addEventListener('click', (e) => { if (!e.target.closest('#dialog-choices')) this.advance(); });
    $('btn-menu').addEventListener('click', () => this.toggleMenu());
    $('menu-close').addEventListener('click', () => this.toggleMenu(false));
    $('btn-mute').addEventListener('click', () => this.toggleMute());
    document.querySelectorAll('#menu .tab').forEach((t) => t.addEventListener('click', () => { this.tab = t.dataset.tab; this.renderMenu(); }));
    $('menu-body').addEventListener('click', (e) => this.onMenuClick(e));
    document.querySelectorAll('#hud .chip, #minibar button, #dialog-next, #menu .tabs button, .album-title, #album button, #touch .d').forEach((el) => { el.innerHTML = pix(el.innerHTML); });
    Input.combo = (code) => (code === 'KeyD' ? this.setDebug(!State.settings.debug) : this.debugWin());
    $('mb-win').onclick = () => this.debugWin();
    show($('tab-debug'), !!State.settings.debug);
    this.syncMute();
  },

  onButton(b) {
    if (this.dlg) {
      const d = this.dlg;
      if (d.choices && !d.typing && /left|right|up|down/.test(b)) {
        const n = d.choices.length;
        d.sel = (d.sel + (b === 'left' || b === 'up' ? n - 1 : 1)) % n;
        this.renderChoices();
      } else if (b === 'a') this.advance();
      return true;
    }
    if (this.open === 'menu') { if (b === 'b') this.toggleMenu(false); return true; }
    if (this.open === 'code') {
      const c = this.codeSt;
      if (b === 'left' || b === 'right') c.sel = (c.sel + (b === 'left' ? c.d.length - 1 : 1)) % c.d.length;
      else if (b === 'up' || b === 'down') c.d[c.sel] = (c.d[c.sel] + (b === 'up' ? 1 : 9)) % 10;
      else if (b === 'a') return c.done(c.d.join('')), true;
      else if (b === 'b') return c.done(null), true;
      Sound.sfx('step');
      this.renderCode();
      return true;
    }
    if (this.open === 'ending') { if (b === 'a') $('ending-ok').click(); return true; }
    if (this.open === 'album') {
      if (b === 'left') this.albumGo(-1); else if (b === 'right' || b === 'a') this.albumGo(1); else if (b === 'b') this.albumClose();
      return true;
    }
    if (this.open === 'title') { if (b === 'a') (State.has() ? $('t-continue') : $('t-new')).click(); return true; }
    return !!this.open;
  },

  // ------------------------------------------------------------ Diálogos
  // say('Nombre', ['línea 1', 'línea 2']) · devuelve una promesa que se cumple al cerrar.
  async say(name, lines, opts = {}) {
    for (const text of [].concat(lines)) await this.line(name, text, opts);
  },
  // choose('Nombre', '¿Pregunta?', ['Sí', 'No']) → índice elegido
  choose(name, text, choices) { return this.line(name, text, { choices }); },

  line(name, text, opts = {}) {
    return new Promise((resolve) => {
      if (this.dlg) { clearInterval(this.dlg.timer); this.dlg.resolve(); } // nunca dos diálogos a la vez
      const d = this.dlg = { text, shown: 0, typing: true, choices: opts.choices || null, sel: 0, resolve };
      $('dialog-name').textContent = name || '';
      $('dialog-text').textContent = '';
      $('dialog-text').classList.toggle('ruso', !!opts.ruso);
      $('dialog-choices').innerHTML = '';
      $('dialog-img').src = opts.img || ''; show($('dialog-img'), !!opts.img);
      show($('dialog-next'), false);
      show($('dialog'));
      d.timer = setInterval(() => {
        d.shown++;
        $('dialog-text').textContent = text.slice(0, d.shown);
        if (d.shown % 3 === 1 && text[d.shown - 1] !== ' ') Sound.sfx('talk');
        if (this.dlg !== d) return clearInterval(d.timer);
        if (d.shown >= text.length) this.finishTyping();
      }, 24);
    });
  },
  finishTyping() {
    const d = this.dlg;
    if (!d) return;
    clearInterval(d.timer);
    d.typing = false;
    $('dialog-text').textContent = d.text;
    if (d.choices) this.renderChoices(); else show($('dialog-next'));
  },
  renderChoices() {
    const d = this.dlg, box = $('dialog-choices');
    box.innerHTML = '';
    d.choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'btn' + (i === d.sel ? ' sel' : '');
      b.textContent = c;
      b.addEventListener('click', () => { d.sel = i; this.advance(); });
      box.appendChild(b);
    });
  },
  advance() {
    const d = this.dlg;
    if (!d) return;
    if (d.typing) return this.finishTyping();
    this.dlg = null;
    show($('dialog'), false);
    Sound.sfx('ok');
    Input.clear();
    d.resolve(d.choices ? d.sel : undefined);
  },

  // ------------------------------------------------------------ Avisos
  toast(text) {
    const t = $('toast');
    t.innerHTML = pix(esc(text)); show(t, false); void t.offsetWidth; show(t);
  },
  zone(text) {
    const z = $('zone');
    z.textContent = text; show(z, false); void z.offsetWidth; show(z);
  },
  hud(on = true) { show($('hud'), on); this.updateHud(); },
  updateHud() {
    const d = State.d;
    $('hud-socks').textContent = `${d.socks.length}/${TOTAL_SOCKS}`;
    $('hud-coins').textContent = d.coins;
    $('hud-inv').textContent = `${d.invited.length}/${CHARACTERS.length}`;
  },
  toggleMute() { Sound.init(); Sound.setMute(!State.settings.mute); this.syncMute(); },
  syncMute() { $('btn-mute').innerHTML = pix(State.settings.mute ? '🔇' : '🔊'); },

  minibar(text, on) {
    show($('minibar'), !!text);
    if (!text) return;
    $('minibar-text').textContent = text;
    for (const k of ['undo', 'reset', 'exit']) { $('mb-' + k).onclick = on[k] || null; show($('mb-' + k), !!on[k]); }
    show($('mb-win'), !!State.settings.debug);
  },

  // ------------------------------------------------------------ Entrada de texto
  prompt(title) {
    return new Promise((resolve) => {
      this.open = 'prompt';
      $('prompt-title').textContent = title;
      const inp = $('prompt-input');
      inp.value = '';
      show($('prompt'));
      inp.focus();
      const done = (v) => { show($('prompt'), false); this.open = null; Input.clear(); resolve(v); };
      $('prompt-ok').onclick = () => done(inp.value.trim());
      $('prompt-cancel').onclick = () => done(null);
    });
  },

  // ------------------------------------------------------------ Pantalla final
  ending(st) {
    return new Promise((resolve) => {
      this.open = 'ending';
      $('ending-stats').textContent = `Invitados: ${st.guests}/${st.total} · Tarta de ${st.layers} ${st.layers === 1 ? 'piso' : 'pisos'} · Regalos: ${st.gifts}`;
      show($('ending'));
      const t0 = Date.now();
      $('ending-ok').onclick = () => { if (Date.now() - t0 < 1500) return; show($('ending'), false); this.open = null; Input.clear(); resolve(); };
    });
  },

  // ------------------------------------------------------------ Pantalla completa
  // Los navegadores solo la permiten tras un toque del usuario: se pide al pulsar «Continuar» / «Nueva partida»
  // en móviles y tabletas, y desde Ajustes en cualquier dispositivo.
  fullscreen(on = !document.fullscreenElement) {
    try {
      const el = document.documentElement;
      if (on) {
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) Promise.resolve(req.call(el, { navigationUI: 'hide' })).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
      } else if (document.fullscreenElement) document.exitFullscreen();
    } catch {}
  },

  // ------------------------------------------------------------ Debug
  setDebug(on, quiet) {
    State.settings.debug = on; State.saveSettings();
    show($('tab-debug'), on);
    if (!on && this.tab === 'debug') this.tab = 'prep';
    if (!quiet) this.toast(on ? '🛠 Modo debug activado: pestaña 🛠 del menú · Mayús+W gana la prueba' : 'Modo debug desactivado');
    if (this.open === 'menu') this.renderMenu();
  },
  debugWin() {
    if (!State.settings.debug || this.busy) return;
    const sc = window.SC40.game.scene.getScenes(true).find((s) => s.debugWin);
    if (sc) sc.debugWin(); else this.toast('Mayús+W solo funciona dentro de una prueba. Usa la pestaña 🛠 del menú.');
  },

  // ------------------------------------------------------------ Candado de cifras
  // code('Título', 4) → cadena con las cifras, o null si se cancela
  code(title, n = 4) {
    return new Promise((resolve) => {
      this.open = 'code';
      const c = this.codeSt = { d: new Array(n).fill(0), sel: 0 };
      c.done = (v) => { show($('code'), false); this.open = null; Input.clear(); resolve(v); };
      $('code-title').textContent = title;
      $('code-ok').onclick = () => c.done(c.d.join(''));
      $('code-cancel').onclick = () => c.done(null);
      show($('code'));
      this.renderCode();
    });
  },
  renderCode() {
    const c = this.codeSt, box = $('code-digits');
    box.innerHTML = '';
    c.d.forEach((v, i) => {
      const col = document.createElement('div');
      col.className = 'dg' + (i === c.sel ? ' sel' : '');
      const mk = (txt, delta) => { const b = document.createElement('button'); b.className = 'btn'; b.innerHTML = pix(txt); b.onclick = () => { c.sel = i; c.d[i] = (c.d[i] + delta) % 10; Sound.sfx('step'); this.renderCode(); }; return b; };
      const num = document.createElement('b'); num.textContent = v;
      col.append(mk('▲', 1), num, mk('▼', 9));
      box.appendChild(col);
    });
  },

  // ------------------------------------------------------------ Libro de los Miausis
  album() {
    return new Promise((resolve) => {
      this.albumPrev = this.open;
      this.open = 'album';
      this.albumI = 0;
      this.albumDone = resolve;
      $('album-prev').onclick = () => this.albumGo(-1);
      $('album-next').onclick = () => this.albumGo(1);
      $('album-close').onclick = () => this.albumClose();
      show($('album'));
      this.albumGo(0);
    });
  },
  albumGo(d) {
    if (this.albumI + d >= ALBUM.length) return this.albumClose();
    this.albumI = Math.max(0, this.albumI + d);
    const p = ALBUM[this.albumI];
    if (d) Sound.sfx('step');
    $('album-img').src = `assets/album/${p.img}.png`;
    $('album-place').textContent = p.place;
    $('album-date').textContent = p.date;
    $('album-deco').innerHTML = p.deco.map(ic).join('');
    $('album-page').textContent = `${this.albumI + 1} / ${ALBUM.length}`;
    $('album-photo').style.transform = `rotate(${[-2, 1.5, -1, 2][this.albumI % 4]}deg)`;
    $('album-prev').style.visibility = this.albumI ? 'visible' : 'hidden';
    $('album-next').innerHTML = pix(this.albumI === ALBUM.length - 1 ? '✓' : '▶');
  },
  albumClose() {
    show($('album'), false);
    this.open = this.albumPrev === 'menu' ? 'menu' : null;
    Input.clear();
    this.albumDone && this.albumDone();
  },

  // ------------------------------------------------------------ Título
  title() {
    return new Promise((resolve) => {
      this.open = 'title';
      show($('title'));
      show($('t-continue'), State.has());
      const go = (mode) => {
        if (mode === 'new' && State.has() && !this._sure) {
          this._sure = true;
          $('t-new').textContent = '¿Borrar la partida guardada?';
          return;
        }
        Sound.init();
        if (matchMedia('(pointer: coarse)').matches) this.fullscreen(true);
        show($('title'), false);
        this.open = null;
        Input.clear();
        resolve(mode);
      };
      $('t-continue').onclick = () => go('continue');
      $('t-new').onclick = () => go('new');
    });
  },

  // ------------------------------------------------------------ Menú
  toggleMenu(on = this.open !== 'menu') {
    if (on && this.busy) return;
    this.open = on ? 'menu' : null;
    show($('menu'), on);
    Input.clear();
    if (on) this.renderMenu();
  },
  renderMenu() {
    const d = State.d;
    document.querySelectorAll('#menu .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === this.tab));
    const li = (done, a, b = '') => `<li class="${done ? '' : 'todo'}"><span>${done ? '✅' : '⬜'}</span><span class="grow">${a}</span><small>${b}</small></li>`;
    let h = '';
    if (this.tab === 'prep') {
      const cp = completion();
      h += `<h3>Juego completado: ${cp.pct} %</h3><div class="pct"><div style="width:${cp.pct}%"></div></div>`;
      h += `<h3>Ahora mismo</h3><ul><li><span>👉</span><span class="grow">${esc(this.hintFn())}</span></li></ul>`;
      h += '<h3>La fiesta sorpresa de Cait</h3><ul>';
      h += li(d.invited.length === CHARACTERS.length, 'Repartir las invitaciones', `${d.invited.length}/${CHARACTERS.length}`);
      h += li(State.flag('gramola'), 'Música: Fuxia y su colección de discos');
      h += li(State.flag('luces'), 'Luces: los Owitos de Navidad');
      h += li(State.flag('tarta'), 'Tarta: Sweet Famosa');
      h += li(d.gifts.length + d.gacha.length > 0, 'Regalos para Cait', `${d.gifts.length + d.gacha.length}`);
      h += '</ul><h3>Para llegar al 100 %</h3><ul>';
      for (const p of cp.parts) h += li(p.done >= p.total, esc(p.name), `${Math.min(p.done, p.total)}/${p.total}`);
      h += '</ul>';
    } else if (this.tab === 'amigos') {
      h += '<ul>';
      for (const c of CHARACTERS) {
        const inv = d.invited.includes(c.id), party = d.party.includes(c.id);
        h += inv || party
          ? `<li><span>${party ? '🐾' : '💌'}</span><span class="grow">${esc(c.name)}</span><small>${party ? 'Te acompaña' : 'Invitado'}</small></li>`
          : `<li class="todo"><span>❔</span><span class="grow">???</span><small>${esc(c.where)}</small></li>`;
      }
      h += '</ul>';
    } else if (this.tab === 'cosas') {
      h += '<ul>';
      if (State.flag('invites')) h += `<li><span>💌</span><span class="grow">Invitaciones <small>«Esta invitación NO ha sido generada con IA»</small></span><small>quedan ${CHARACTERS.length - d.invited.length}</small></li>`;
      h += `<li><span>🧦</span><span class="grow">Calcetines desparejados <small>Scooby da una moneda por cada pareja del mismo diseño</small></span><small>${d.socks.length}/${TOTAL_SOCKS}</small></li>`;
      SOCK_DESIGNS.forEach((name, i) => {
        const n = d.socks.filter((s) => SOCK_DESIGN[s] === i).length;
        if (n) h += `<li><span>${ic('sock_' + i)}${n === 2 ? ic('sock_' + i) : ''}</span><span class="grow">Calcetín ${name}</span><small>${d.traded.includes(i) ? 'pareja entregada a Scooby' : n === 2 ? '¡pareja completa!' : 'falta su pareja'}</small></li>`;
      });
      h += `<li><span>🪙</span><span class="grow">Monedas de gachapón</span><small>${d.coins}</small></li>`;
      if (d.vales) h += `<li><span>🎫</span><span class="grow">Vales de Aeroflot <small>(no sirven para nada)</small></span><small>${d.vales}</small></li>`;
      const f = d.flags, mir = ['r1', 'r2', 'r3'].filter((k) => f[k]).length;
      if (mir || f.imanes || f.nota) {
        h += '</ul><h3>Apartamento de las Ratitas</h3><ul>';
        if (mir) h += `<li><span>🪞</span><span class="grow">Espejos de mano</span><small>${mir}/3</small></li>`;
        h += `<li><span>🔒</span><span class="grow">Candado de la alcantarilla</span><small>${f.r1 ? 1 : '?'} ${f.r2 ? 9 : '?'} ${f.r3 ? 8 : '?'} ?</small></li>`;
        if (f.nota) h += '<li><span>📝</span><span class="grow">Nota de Cuca: <span class="ruso">Д Ш Д Ю Ж</span></span></li>';
        if (f.imanes) h += '<li><span>🧲</span><span class="grow">Imanes de la nevera: <span class="ruso">ЖБЛ</span> = SOL · <span class="ruso">ШЮЯ</span> = TÍA · <span class="ruso">ЛДЦ</span> = LEY</span></li>';
      }
      h += '</ul><h3>Regalos para Cait</h3><ul>';
      h += d.gifts.length ? d.gifts.map((id) => `<li><span>${ic(GIFTS[id].icon)}</span><span class="grow">${esc(GIFTS[id].name)} <small>${esc(GIFTS[id].desc)}</small></span>${GIFTS[id].album ? '<button class="btn" data-act="album">Abrir</button>' : ''}</li>`).join('') : '<li class="todo">Todavía ninguno</li>';
      h += `</ul><h3>Gachapón <small>${d.gacha.length}/${GACHA.length}</small></h3><div class="gacha">`;
      h += GACHA.map((g) => d.gacha.includes(g.id) ? `<figure><img src="${gachaIcon(g.id)}" alt=""><figcaption>${esc(g.name)}</figcaption></figure>` : '<figure class="todo"><div class="capsule">?</div><figcaption>???</figcaption></figure>').join('');
      h += '</div>';
    } else if (this.tab === 'debug') {
      h += '<h3>Saltar pruebas <small>(da por hecho ese paso y los anteriores)</small></h3><ul>';
      for (const s of STEPS) {
        const done = State.flag(s.flag);
        h += `<li class="${done ? 'todo' : ''}"><span>${done ? '✅' : s.side ? '➕' : '⬜'}</span><span class="grow">${esc(s.label)}${s.side ? ' <small>(opcional)</small>' : ''}</span>${done ? '' : `<button class="btn" data-skip="${s.id}">Saltar</button>`}</li>`;
      }
      h += '</ul><h3>Ir a…</h3><ul><li><span class="grow">' + PLACES.map((p, i) => `<button class="btn" data-tp="${i}">${esc(p[0])}</button>`).join(' ') + '</span></li>';
      h += '<li><span class="grow">Monedas de gachapón</span><button class="btn" data-act="coins">+5 🪙</button></li>';
      h += '<li><span class="grow"><small>Mayús+D activa o desactiva este modo. Dentro de una prueba, Mayús+W (o el botón «Ganar») la supera.</small></span></li></ul>';
    } else {
      const m = Math.floor(d.time / 60);
      h += `<ul><li><span class="grow">Música <small>${State.settings.music === 'mp3' ? 'grabaciones originales' : 'versión chiptune generada a partir de los mp3'}</small></span><button class="btn" data-act="music">${State.settings.music === 'mp3' ? '💿 Original' : '🎹 Chiptune'}</button></li>`;
      h += `<li><span class="grow">Pantalla completa</span><button class="btn" data-act="full">${document.fullscreenElement ? 'Salir' : 'Activar'}</button></li>`;
      h += `<li><span class="grow">Sonido</span><button class="btn" data-act="mute">${State.settings.mute ? '🔇 Apagado' : '🔊 Encendido'}</button></li>`;
      h += `<li><span class="grow">Tiempo de juego</span><small>${Math.floor(m / 60)} h ${m % 60} min</small></li>`;
      h += '<li><span class="grow">La partida se guarda sola en este navegador.</span></li>';
      h += `<li><span class="grow">Borrar la partida y empezar de cero</span><button class="btn danger" data-act="wipe">${this._wipe ? '¿Seguro? Pulsa otra vez' : 'Borrar partida'}</button></li></ul>`;
    }
    $('menu-body').innerHTML = pix(h);
  },
  onMenuClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'album') this.album();
    if (b.dataset.act === 'coins') { State.d.coins += 5; State.save(); this.updateHud(); this.renderMenu(); }
    if (b.dataset.skip) { skipTo(b.dataset.skip); this.toggleMenu(false); reloadWorld(); }
    if (b.dataset.tp) { teleport(+b.dataset.tp); this.toggleMenu(false); reloadWorld(); }
    if (b.dataset.act === 'full') { this.fullscreen(); setTimeout(() => this.open === 'menu' && this.renderMenu(), 400); }
    if (b.dataset.act === 'mute') { this.toggleMute(); this.renderMenu(); }
    if (b.dataset.act === 'music') { Sound.init(); Sound.setMode(State.settings.music === 'mp3' ? 'chip' : 'mp3'); this.renderMenu(); }
    if (b.dataset.act === 'wipe') {
      if (!this._wipe) { this._wipe = true; this.renderMenu(); return; }
      State.reset(); location.reload();
    }
  },
};
