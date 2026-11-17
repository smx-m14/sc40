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
  release(btn) { this.held[btn] = false; },
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
      const down = (e) => { e.preventDefault(); el.classList.add('on'); this.press(btn); };
      const up = (e) => { e.preventDefault(); el.classList.remove('on'); this.release(btn); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    touch.querySelectorAll('[data-dir]').forEach((el) => bind(el, el.dataset.dir));
    bind(document.getElementById('tb-a'), 'a');
    bind(document.getElementById('tb-b'), 'b');
  },
};
