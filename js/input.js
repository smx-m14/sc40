// Entrada unificada: teclado + mandos táctiles.
// Botones: up/down/left/right, a (acción), b (menú/atrás), undo, reset.
const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'a', Enter: 'a', KeyE: 'a',
  Escape: 'b', KeyX: 'b', KeyM: 'b',
  KeyZ: 'undo', KeyR: 'reset',
};

export const Input = {
  held: {},
  t: {},             // momento (performance.now) de la última pulsación de cada botón
  just: {},
  combo: null,       // (code) => atajos de debug
  interceptor: null, // (btn) => true si el interfaz consume la pulsación

  press(btn) {
    // No se ignora una pulsación porque la tecla figure como «mantenida»: si el navegador se come un keyup
    // (cambio de foco, pantalla completa…) el botón dejaba de responder para siempre.
    this.held[btn] = true;
    this.t[btn] = performance.now();
    if (this.interceptor && this.interceptor(btn)) return;
    this.just[btn] = true;
  },
  release(btn) {
    // Un toque corto en la cruceta táctil = avanzar exactamente una baldosa (lo hace WorldScene con `nudge`):
    // si no, Colgadín avanzaba un trozo distinto cada vez, según lo que durara el toque
    if (this.held[btn] && this.touchDir && ['up', 'down', 'left', 'right'].includes(btn) && performance.now() - (this.t[btn] || 0) < 220) this.nudge = btn;
    this.held[btn] = false;
  },
  nudge: null,      // dirección de un toque corto pendiente de convertir en un paso
  touchDir: false,  // la última pulsación de dirección vino de la cruceta táctil
  touchA: false,    // el botón de acción se está pulsando en la pantalla táctil (los juegos de ritmo dan más margen)
  take(btn) { const v = !!this.just[btn]; this.just[btn] = false; return v; },
  clear() { this.just = {}; },
  dir() {
    const h = this.held;
    return { x: (h.right ? 1 : 0) - (h.left ? 1 : 0), y: (h.down ? 1 : 0) - (h.up ? 1 : 0) };
  },

  init() {
    const typing = (e) => /^(TEXTAREA|INPUT)$/.test(e.target.tagName);
    window.addEventListener('keydown', (e) => {
      if (typing(e)) return;
      // Atajos de debug: Mayús+D activa el modo, Mayús+W gana el minijuego en curso
      if (e.shiftKey && (e.code === 'KeyD' || e.code === 'KeyW') && this.combo) { e.preventDefault(); if (!e.repeat) this.combo(e.code); return; }
      const b = KEYS[e.code];
      if (!b) return;
      e.preventDefault();
      if (!e.repeat) this.press(b);
    });
    window.addEventListener('keyup', (e) => { const b = KEYS[e.code]; if (b) this.release(b); });
    window.addEventListener('blur', () => { this.held = {}; });

    // Táctil
    const touch = document.getElementById('touch');
    const show = () => touch.classList.remove('hidden');
    if (matchMedia('(pointer: coarse)').matches) show();
    window.addEventListener('touchstart', show, { once: true, passive: true });

    const bind = (el, btn) => {
      // En móvil el primer toque a veces llegaba tarde o se perdía: se atiende ya en touchstart y el pointerdown que
      // viene detrás del mismo toque se ignora (si no, contaría doble)
      let touchT = -1e9;
      const press = () => { el.classList.add('on'); this.press(btn); };
      const isDir = ['up', 'down', 'left', 'right'].includes(btn);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); touchT = performance.now(); if (isDir) this.touchDir = true; else this.touchA = true; press(); }, { passive: false });
      const lift = (e) => { e.preventDefault(); el.classList.remove('on'); this.release(btn); };
      el.addEventListener('touchend', lift, { passive: false });
      el.addEventListener('touchcancel', lift, { passive: false }); // gesto del sistema: que no se quede «pulsado»
      const down = (e) => { e.preventDefault(); if (e.pointerType === 'touch' || performance.now() - touchT < 600) return; press(); };
      const up = (e) => { e.preventDefault(); el.classList.remove('on'); this.release(btn); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    touch.querySelectorAll('[data-dir]').forEach((el) => bind(el, el.dataset.dir));
    // Red de seguridad: si se levantan todos los dedos, no queda ninguna dirección pulsada (antes, si se perdía el
    // «soltar», Colgadín seguía andando un buen trecho)
    window.addEventListener('touchend', (e) => { if (!e.touches.length) for (const b of ['up', 'down', 'left', 'right']) if (this.held[b]) this.release(b); }, { passive: true });
    window.addEventListener('keydown', () => { this.touchDir = false; this.touchA = false; }, { capture: true });
    bind(document.getElementById('tb-a'), 'a');
    // (En táctil no hay botón B: el menú, cerrar y «Salir» ya tienen su botón en pantalla. En teclado: Esc o X.)
  },
};
