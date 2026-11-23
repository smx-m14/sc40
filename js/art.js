// Todo el pixel art del juego se genera por código: no hay ficheros de imagen.
// PX es un lienzo de píxeles con primitivas sin suavizado.

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class PX {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
  set(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; return this; }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.d[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
  ell(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.set(x, y, c);
    return this;
  }
  line(x0, y0, x1, y1, c) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
    return this;
  }
  blit(o, dx, dy) {
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const c = o.d[y * o.w + x]; if (c) this.set(x + dx, y + dy, c); }
    return this;
  }
  px(c, ...pts) { for (const [x, y] of pts) this.set(x, y, c); return this; }
  speck(r, n, ...cols) {
    for (let i = 0; i < n; i++) {
      const x = (r() * this.w) | 0, y = (r() * this.h) | 0;
      if (this.get(x, y)) this.set(x, y, cols[(r() * cols.length) | 0]);
    }
    return this;
  }
  outline(c = '#2b2320') {
    const o = this.d.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.d[y * this.w + x]) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) o[y * this.w + x] = c;
    }
    this.d = o;
    return this;
  }
  canvas() {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const g = cv.getContext('2d');
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.d[y * this.w + x];
      if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
    }
    return cv;
  }
}

const INK = '#2b2320';
const BLACK = '#1a1412';

// ---------------------------------------------------------------- Personajes
// Cada personaje es una función (p, dir, o) que dibuja en un PX de 18x18.
// dir: 'down' | 'up' | 'side' (mirando a la derecha). o: desplazamiento vertical del saltito.

const CHARS = {
  colgadin(p, dir, o) {
    const B = '#d8bb82', L = '#e8d3a2', D = '#b8975c';
    if (dir === 'side') {
      p.px(BLACK, [3, 12 + o], [2, 13 + o]).px('#6b3fa0', [1, 14 + o], [1, 15 + o], [2, 15 + o]);
      p.ell(9, 11 + o, 6, 5.5, B).ell(8, 8 + o, 3, 1.3, L);
      p.ell(6.5, 11 + o, 2, 3.4, D);
      p.px(BLACK, [12, 10 + o], [12, 11 + o], [15, 11 + o], [14, 12 + o], [13, 13 + o]);
    } else {
      p.ell(2.6, 11 + o, 1.8, 3.4, D).ell(15.4, 11 + o, 1.8, 3.4, D);
      p.ell(9, 11 + o, 6, 5.5, B).ell(8, 8 + o, 3, 1.3, L);
      if (dir === 'down') {
        p.px(BLACK, [6, 10 + o], [6, 11 + o], [11, 10 + o], [11, 11 + o], [8, 12 + o], [9, 12 + o]);
        p.px('#5a4636', [7, 14 + o], [8, 13 + o], [9, 13 + o], [10, 14 + o]);
      } else {
        p.px(BLACK, [9, 13 + o], [10, 14 + o], [10, 15 + o]).px('#6b3fa0', [11, 16 + o], [10, 16 + o]);
      }
    }
  },

  lolete(p, dir, o, f) { dog(p, dir, o, f, { fur: '#7a4a2a', ear: '#55301a', tan: '#d9a760', ribbon: '#d23a2e' }); },
  // Scooby: terrier despeinado gris-marrón, orejas de punta y jersey rojo
  scooby(p, dir, o) {
    const F = '#8d7a66', L = '#bfae98', D = '#6b5a4a', R = '#c8202c';
    p.ell(9, 14, 3.8, 2.7, R).px('#fff', [7, 14], [11, 15]).rect(6, 15, 2, 2, F).rect(10, 15, 2, 2, F);
    for (let i = 0; i < 4; i++) { const w = Math.min(i + 1, 3); p.rect(4, 3 + i + o, w, 1, D); p.rect(14 - w, 3 + i + o, w, 1, D); }
    p.ell(9, 9 + o, 4.4, 3.8, F).ell(9, 11.2 + o, 2.3, 1.6, L);
    p.px(L, [6, 6 + o], [11, 6 + o], [8, 5 + o], [5, 9 + o], [12, 10 + o], [8, 13 + o], [10, 13 + o]);
    p.px(BLACK, [7, 8 + o], [11, 8 + o], [8, 10 + o], [9, 10 + o]);
  },
  // Cuca: jack russell blanca y regordeta con manchas marrones y arnés
  cuca(p, dir, o) {
    const W = '#fbf7ee', B = '#c07a3c', H = '#2b2b33';
    p.ell(9, 14, 4.8, 3, W).rect(5, 15, 2, 2, W).rect(11, 15, 2, 2, W).rect(6, 13, 6, 1, H).px(B, [12, 15], [13, 14]);
    p.ell(4, 9.5 + o, 1.6, 3, B).ell(14, 9.5 + o, 1.6, 3, B);
    p.ell(9, 9 + o, 4.6, 4, W).rect(5, 6 + o, 3, 4, B).rect(10, 6 + o, 3, 4, B);
    p.px(BLACK, [7, 8 + o], [10, 8 + o], [8, 10 + o], [9, 10 + o]).px('#e58a8a', [9, 12 + o]);
  },
  // Perrunfli: cojín shiba enorme (26x22)
  perrunfli(p, dir, o) {
    const T = '#e8b96a', D = '#cf9c4c', W = '#f7f1e3';
    p.px(D, [23, 7 + o], [24, 8 + o], [24, 9 + o], [23, 10 + o]);
    p.px(T, [6, 4 + o], [7, 3 + o], [7, 4 + o], [8, 4 + o], [18, 4 + o], [19, 3 + o], [19, 4 + o], [20, 4 + o]);
    p.ell(13, 12 + o, 11, 8, T).ell(13, 15.5 + o, 7, 4, W).rect(6, 19, 4, 2, D).rect(16, 19, 4, 2, D);
    p.rect(9, 12 + o, 2, 2, BLACK).rect(15, 12 + o, 2, 2, BLACK).px(BLACK, [12, 15 + o], [13, 15 + o]);
    p.px('#5a4636', [11, 17 + o], [12, 18 + o], [13, 18 + o], [14, 17 + o]);
  },
  // Bart: monitora tipo furby con cinta de deporte
  bart(p, dir, o) {
    const T = '#3fb8b0', K = '#f06aa8', C = '#fbeed0';
    for (let i = 0; i < 3; i++) { p.rect(3, 4 + i + o, i + 1, 1, K); p.rect(15 - i - 1, 4 + i + o, i + 1, 1, K); }
    p.ell(9, 11 + o, 5.6, 6, T).ell(9, 13.5 + o, 3.4, 3.4, C);
    p.px(K, [8, 3 + o], [9, 2 + o], [10, 3 + o], [9, 4 + o]).rect(5, 6 + o, 8, 1, '#e2574c');
    p.rect(5, 8 + o, 3, 3, '#fff').rect(10, 8 + o, 3, 3, '#fff').px(BLACK, [6, 9 + o], [11, 9 + o], [5, 7 + o], [7, 7 + o], [10, 7 + o], [12, 7 + o]);
    p.px('#f6c56b', [8, 11 + o], [9, 11 + o], [8, 12 + o], [9, 12 + o]).rect(6, 17, 2, 1, '#f6c56b').rect(10, 17, 2, 1, '#f6c56b');
  },

  // Tigrito: tigre redondo amarillo con rayas negras
  tigrito(p, dir, o) {
    const Y = '#f6d53a', YD = '#d9b520', W = '#fbf7ee', K = '#2b2320';
    if (dir === 'side') {
      p.px(Y, [2, 11 + o], [1, 10 + o]).px(K, [2, 10 + o], [1, 9 + o], [0, 9 + o]);
      p.ell(9, 11 + o, 6, 5.5, Y).ell(10, 15 + o, 3, 1.4, W);
      p.px(K, [11, 5 + o], [12, 5 + o]).px(Y, [11, 6 + o], [12, 6 + o], [10, 6 + o]);
      p.px(K, [5, 8 + o], [5, 9 + o], [7, 7 + o], [7, 8 + o], [5, 12 + o], [5, 13 + o], [13, 10 + o], [13, 11 + o]).px('#f08aa0', [12, 13 + o]);
    } else {
      for (const x of [4, 12]) p.rect(x, 5 + o, 3, 3, Y).px(K, [x + 1, 4 + o], [x, 5 + o], [x + 2, 5 + o]).px('#cfcabb', [x + 1, 6 + o]);
      p.ell(9, 11 + o, 6, 5.5, Y).rect(6, 16, 2, 1, YD).rect(11, 16, 2, 1, YD);
      if (dir === 'down') {
        p.ell(9, 15 + o, 3, 1.6, W);
        p.px(K, [9, 6 + o], [9, 7 + o], [7, 7 + o], [8, 7 + o], [10, 7 + o], [11, 7 + o], [3, 10 + o], [4, 10 + o], [3, 12 + o], [4, 12 + o], [14, 10 + o], [15, 10 + o], [14, 12 + o], [15, 12 + o]);
        p.px(K, [7, 10 + o], [11, 10 + o], [8, 13 + o], [10, 13 + o], [9, 12 + o]).px('#f08aa0', [5, 12 + o], [13, 12 + o]);
      } else {
        for (const y of [8, 10, 12]) p.rect(6, y + o, 6, 1, K);
        p.px(Y, [9, 16], [9, 17]).px(K, [9, 15]);
      }
    }
  },
  // Mono de brazos larguísimos. f=1: brazos arriba
  mono(p, dir, o, f) {
    const B = '#a8612c', BD = '#7d451c', P = '#f3b9a8';
    p.ell(9, 12, 2.6, 3.4, B).line(8, 15, 7, 17, B).line(10, 15, 11, 17, B).px(P, [6, 17], [7, 17], [11, 17], [12, 17]);
    if (f) { p.line(6, 10, 3, 3, B).line(12, 10, 15, 3, B).px(P, [3, 2], [2, 3], [15, 2], [16, 3]); }
    else { p.line(6, 10, 3, 16, B).line(12, 10, 15, 16, B).px(P, [2, 16], [3, 17], [15, 17], [16, 16]); }
    p.px(P, [5, 6], [13, 6]).ell(9, 6, 3.6, 3.3, B).ell(9, 7, 2.4, 2, P).px(BD, [8, 3], [9, 3], [10, 3]);
    p.px(BLACK, [8, 6], [10, 6], [9, 8]);
  },
  // Ratitas de peluche: rata gris, ratoncita blanca y hámster pardo
  ratita_p(p, dir, o) { mouse(p, o, '#8a8a92', '#a9a9b2'); },
  ratita_o(p, dir, o) { mouse(p, o, '#f1eee8', '#ffffff'); },
  ratita_b(p, dir, o) { mouse(p, o, '#c9a67a', '#e2c8a0'); },
  // Cuy: cobaya despeinada marrón con la cara blanca
  cuy(p, dir, o) { // pequeñito: abulta poco más que una ratita
    const B = '#a0522d', BL = '#c06a3a', W = '#fbf7ee';
    p.ell(9, 12.5 + o, 4.8, 4, B).px(BL, [6, 10 + o], [9, 9 + o], [12, 11 + o], [5, 13 + o]).rect(7, 16, 1, 1, '#e8b0a0').rect(10, 16, 1, 1, '#e8b0a0');
    if (dir === 'down') p.ell(9, 13.4 + o, 2.6, 2.5, W).px(BLACK, [8, 12 + o], [10, 12 + o]).px('#5a4636', [9, 14 + o]).px('#e8b0a0', [5, 10 + o], [13, 10 + o]);
    else if (dir === 'side') p.ell(12.2, 13 + o, 2.3, 2.5, W).px(BLACK, [12, 12 + o], [14, 13 + o]).px('#e8b0a0', [9, 10 + o]);
  },
  // Kai: gato negro (despierto)
  kai(p, dir, o, f) {
    const K = '#22222a', KL = '#3a3a46';
    p.px(K, [14, 15], [15, 14], [15 + (f ? 1 : 0), 13], [15, 12 - (f ? 1 : 0)]);
    p.ell(9, 13.5, 4.2, 3.6, K).rect(6, 16, 2, 1, KL).rect(10, 16, 2, 1, KL);
    p.px(K, [5, 4 + o], [6, 4 + o], [5, 5 + o], [6, 5 + o], [7, 5 + o], [12, 4 + o], [13, 4 + o], [11, 5 + o], [12, 5 + o], [13, 5 + o]);
    p.ell(9, 8.5 + o, 4.4, 3.6, K).px('#c8e03a', [7, 8 + o], [11, 8 + o]).px('#e58a8a', [9, 10 + o]).px(KL, [6, 10 + o], [12, 10 + o]);
  },
  // Rey Peludito: gato peludo beige con corona
  peludito(p, dir, o) {
    const F = '#d9c3a0', L = '#eadbc0', PK = '#f0a8b0', Y = '#e8b820';
    p.px(F, [3, 6 + o], [4, 5 + o], [4, 6 + o], [5, 6 + o], [13, 6 + o], [14, 5 + o], [14, 6 + o], [15, 6 + o]).px(PK, [4, 6 + o], [14, 6 + o]);
    p.ell(9, 11.5 + o, 6.8, 5.6, F).px(L, [4, 9 + o], [6, 7 + o], [11, 7 + o], [14, 10 + o], [3, 12 + o], [15, 13 + o], [8, 16], [10, 16]);
    p.px(BLACK, [6, 10 + o], [12, 10 + o]).px('#5a4636', [8, 13 + o], [10, 13 + o], [9, 12 + o]).px(PK, [4, 12 + o], [14, 12 + o], [5, 16], [13, 16]);
    p.rect(6, 3 + o, 7, 2, Y).px(Y, [6, 2 + o], [9, 1 + o], [9, 2 + o], [12, 2 + o]).px('#e2574c', [9, 3 + o]);
  },
  mantecas(p, dir, o) { manteca(p, o); p.rect(6, 1 + o, 6, 4, '#fff').rect(5, 1 + o, 8, 2, '#fff').rect(6, 5 + o, 6, 1, '#d0d0c8'); },
  manteca2(p, dir, o) { // en plena fase drag: peluca rosa cardada con tiara, sombra de ojos, pestañas, colorete, labios rojos y pendientes
    manteca(p, o);
    p.ell(9, 5.6 + o, 5.6, 3, '#f06aa8').ell(6.5, 7 + o, 2, 1.6, '#f06aa8').ell(11.5, 7 + o, 2, 1.6, '#f06aa8').ell(8, 4.6 + o, 2.4, 1.1, '#ff9ccf');
    p.px('#ffd23f', [7, 2 + o], [9, 1 + o], [11, 2 + o], [8, 2 + o], [10, 2 + o]).px('#6fd0e8', [9, 2 + o]);         // tiara
    p.px('#8a4ad8', [6, 9 + o], [7, 9 + o], [11, 9 + o], [12, 9 + o]).px('#c48af0', [6, 8 + o], [12, 8 + o]);      // sombra de ojos
    p.px(BLACK, [6, 10 + o], [7, 10 + o], [11, 10 + o], [12, 10 + o], [5, 9 + o], [13, 9 + o]).px('#ffffff', [7, 10 + o], [12, 10 + o]); // ojos con pestañas
    p.px('#ff8fb0', [5, 12 + o], [13, 12 + o], [4, 12 + o], [14, 12 + o]);                                          // colorete
    p.px('#e2264a', [8, 14 + o], [9, 14 + o], [10, 14 + o], [9, 15 + o]).px('#ff6b8a', [9, 14 + o]);              // labios
    p.px(BLACK, [12, 13 + o]);                                                                                      // lunar
    p.px('#ffd23f', [2, 12 + o], [16, 12 + o], [2, 13 + o], [16, 13 + o]);                                          // pendientes
  },
  // Patito: peluche amarillo SIN brazos. Una bola peluda con dos orejas de interior naranja, ojitos muy separados,
  // sonrisa ondulada bordada y un rabito en forma de tubo abajo (down: de frente · up: de espaldas)
  patito(p, dir, o) {
    const Y = '#ffd93b', L = '#ffee96', D = '#d9a818', O = '#f5a04a';
    // orejas puntiagudas y redondeadas, separadas de la cabeza por un pliegue
    p.ell(3.4, 4.6 + o, 2.4, 2.8, Y).ell(14.6, 4.6 + o, 2.4, 2.8, Y).px(Y, [2, 2 + o], [16, 2 + o]);
    p.ell(9, 10.8 + o, 6.6, 5.9, Y).px(L, [7, 6 + o], [8, 6 + o], [11, 6 + o], [5, 9 + o], [4, 10 + o]);
    p.px(D, [5, 6 + o], [4, 7 + o], [13, 6 + o], [14, 7 + o]);
    // rabito en forma de tubo, abajo a la izquierda, con su agujero
    p.ell(4, 15.4, 2.8, 1.8, Y).px(D, [2, 16], [6, 16], [4, 17]).px('#8a6a10', [4, 15], [5, 15]);
    if (dir === 'up') p.px(D, [9, 8 + o], [8, 11 + o], [11, 13 + o], [7, 14 + o]);
    else {
      p.px(O, [2, 3 + o], [3, 3 + o], [3, 4 + o], [2, 4 + o], [3, 5 + o], [15, 3 + o], [16, 3 + o], [15, 4 + o], [16, 4 + o], [15, 5 + o]);
      p.px(BLACK, [6, 9 + o], [12, 9 + o]).px(INK, [6, 12 + o], [7, 13 + o], [8, 12 + o], [9, 12 + o], [10, 13 + o], [11, 12 + o]);
    }
  },
  capybara(p, dir, o) {
    const B = '#a8794a', D = '#7a5230';
    p.ell(9, 12.5, 6, 4.6, B).rect(5, 16, 2, 1, D).rect(11, 16, 2, 1, D);
    p.px(D, [5, 5 + o], [13, 5 + o]).ell(9, 8 + o, 4.6, 3.8, B).ell(9, 10 + o, 2.6, 1.8, D);
    p.px(BLACK, [6, 8 + o], [12, 8 + o], [8, 10 + o], [10, 10 + o]);
    p.px('#f7a8c0', [11, 3 + o], [12, 2 + o], [13, 3 + o], [12, 4 + o]).px('#ffe066', [12, 3 + o]);
  },
  // Owitos del Teatro
  owito_w(p, dir, o) { owito(p, o, '#f4f4f0', '#4a90c8'); p.px('#e8b820', [9, 15 + o], [8, 16], [9, 16], [10, 16]); },
  owito_k(p, dir, o) { owito(p, o, '#f7a8c0', '#ffffff'); },
  owito_v(p, dir, o) { owito(p, o, '#b8a0d8', '#7a5fa8'); },
  owito_g(p, dir, o) { owito(p, o, '#8fd070', '#3f9f4f'); },
  owito_m(p, dir, o) { owito(p, o, '#ffc49a', '#e5869f'); }, // melocotón: la vendedora de mochis
  owito_c(p, dir, o) { owito(p, o, '#f3e6c0', '#b08a50'); p.px('#e2574c', [3, 12 + o], [4, 13 + o]); },
  owito_t(p, dir, o) { owito(p, o, '#b07a44', '#f3e6c0'); p.rect(3, 4 + o, 12, 2, '#d9b040').rect(6, 2 + o, 6, 2, '#e8c860').px('#8a6a20', [5, 5 + o], [9, 5 + o], [13, 5 + o]); },
  // Heladoncio: gato helado napolitano (gris arriba, blanco en medio, rosa abajo)
  heladoncioh(p, dir, o) { this.heladoncio(p, dir, o); strawHat(p, 9, 4.6 + o); }, // ya con su sombrero de paja
  heladoncio(p, dir, o) { // gato de peluche muy redondo: capucha gris con orejas, cara blanca, franja rosa abajo
    const G = '#a9a9b3', GD = '#8e8e99', W = '#fbf7f2', K = '#f7b8c0', KD = '#e8899a', B = '#5a3a3a';
    p.px(G, [3, 3 + o], [3, 4 + o], [4, 4 + o], [3, 5 + o], [5, 5 + o], [15, 3 + o], [15, 4 + o], [14, 4 + o], [15, 5 + o], [13, 5 + o]).px(K, [4, 5 + o], [14, 5 + o]); // orejas
    p.ell(9, 10.8 + o, 8.2, 6, W);
    const R = p.raw || p, k = p.k || 1; // gris por arriba y por los lados, rosa abajo (sobre los píxeles reales)
    for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) if (R.get(x, y) === W) R.set(x, y, y < (13.4 + o) * k ? G : K);
    if (dir === 'up') { p.px(GD, [9, 6 + o], [9, 8 + o], [9, 10 + o]); }         // de espaldas: la costura de la capucha
    else if (dir === 'side') {
      p.ell(11.5, 11 + o, 4.4, 2.5, W).px(B, [11, 10 + o], [12, 9 + o], [13, 10 + o]).px(KD, [16, 11 + o]).px(K, [12, 12 + o]);
    } else {
      p.ell(9, 11 + o, 5.4, 2.6, W);                                              // cara blanca
      p.px(B, [5, 10 + o], [6, 9 + o], [7, 10 + o], [11, 10 + o], [12, 9 + o], [13, 10 + o]); // ojos cerrados, sonrientes
      p.px(K, [4, 12 + o], [14, 12 + o]).px(KD, [9, 11 + o]);                     // mofletes y nariz
    }
    p.px(W, [2, 14 + o], [15.5, 14 + o]);                                         // patitas
    p.rect(6, 16, 2, 1, '#e8e0d8').rect(10, 16, 2, 1, '#e8e0d8');
  },
  owinken(p, dir, o) { pig(p, o, BLACK, '#edccc6', '#dbaeab'); }, // rosa a medio camino entre el de antes (#e8d5c8) y el de los clones (#f2c4c4)
  clon(p, dir, o) { pig(p, o, '#e2264a', '#f2c4c4', '#e0a0a8'); },
  // Owitos de la Inquisición (cameo en el Castillo): Owitos disfrazados de Dragon Age Inquisition
  owi_jos(p, dir, o) { // Owephine (Josephine): moño oscuro, vestido morado con mangas amarillas, tablilla y pluma
    owito(p, o, '#f3d9b8', '#c9a06a');
    p.px('#3a2418', [7, 5 + o], [8, 5 + o], [9, 5 + o], [10, 5 + o], [11, 5 + o], [8, 4 + o], [9, 4 + o], [10, 4 + o], [9, 3 + o]);
    p.rect(4, 14 + o, 10, 3, '#7a4fb0').rect(5, 14 + o, 8, 1, '#f2c230').px('#f2c230', [2, 10 + o], [3, 10 + o], [2, 11 + o], [3, 11 + o], [15, 10 + o], [15, 11 + o]);
    p.rect(14, 12 + o, 3, 4, '#8a5a2a').rect(14, 12 + o, 2, 3, '#ffffff').px('#e2574c', [16, 10 + o], [17, 9 + o]);
  },
  owi_lel(p, dir, o) { // Lowiana (Leliana): capucha morada, mechones pelirrojos, broche plateado
    owito(p, o, '#f4f4f0', '#d6c8ec');
    p.ell(9, 6.6 + o, 7, 3.2, '#6e3f96').px('#6e3f96', [2, 9 + o], [2, 10 + o], [3, 11 + o], [16, 9 + o], [16, 10 + o], [15, 11 + o]).px('#8a5fb8', [7, 4 + o], [8, 4 + o]);
    p.px('#e2662a', [4, 9 + o], [5, 9 + o], [13, 9 + o], [14, 9 + o]);
    p.rect(5, 15 + o, 9, 2, '#7a4a2a').px('#c9ced8', [8, 14 + o], [9, 14 + o], [10, 14 + o]).px('#1a1412', [9, 14 + o]);
  },
  owi_cas(p, dir, o) { // Cassandrowa (Cassandra): pelo negro corto, hombreras de plata, pechera granate con el ojo
    owito(p, o, '#e8d8c8', '#8a7a6a');
    p.ell(9, 6.4 + o, 5.4, 1.9, '#1a1412').px('#1a1412', [5, 7 + o], [4, 8 + o], [13, 7 + o], [14, 8 + o]);
    p.rect(2, 9 + o, 3, 3, '#c9ced8').rect(14, 9 + o, 3, 3, '#c9ced8').px('#eef1f5', [2, 9 + o], [14, 9 + o]);
    p.rect(5, 14 + o, 9, 3, '#7a1f2a').px('#e8b820', [8, 15 + o], [9, 15 + o], [10, 15 + o], [9, 14 + o]);
  },
  owi_dor(p, dir, o) { // Dowian (Dorian): pelo engominado, bigote, traje claro con correas y bastón con calavera
    owito(p, o, '#d8b890', '#8a6a4a');
    p.rect(5, 5 + o, 9, 2, '#1a1412').px('#1a1412', [11, 4 + o], [12, 4 + o], [13, 5 + o]);
    p.px('#1a1412', [7, 12 + o], [8, 12 + o], [10, 12 + o], [11, 12 + o]);
    p.rect(4, 14 + o, 10, 3, '#f0ead8').px('#7a4a2a', [5, 14 + o], [6, 15 + o], [7, 16 + o], [13, 14 + o], [12, 15 + o], [11, 16 + o]);
    p.rect(16, 5 + o, 1, 12, '#8a5a2a').px('#f4f4ee', [15, 3 + o], [16, 3 + o], [17, 3 + o], [16, 4 + o]).px('#1a1412', [16, 3 + o]);
  },
  owi_mor(p, dir, o) { // Mowigan (Morrigan): melena negra con flequillo, vestido granate y gran collar dorado
    owito(p, o, '#ece0ec', '#a890a8');
    p.ell(9, 6.8 + o, 6.6, 2.6, '#1a1412').px('#1a1412', [2, 9 + o], [2, 10 + o], [3, 11 + o], [16, 9 + o], [16, 10 + o], [15, 11 + o]);
    p.px('#8a2a5a', [5, 9 + o], [13, 9 + o]);
    p.rect(3, 15 + o, 12, 2, '#5a1a2a').px('#e8b820', [6, 13 + o], [7, 14 + o], [8, 14 + o], [10, 14 + o], [11, 14 + o], [12, 13 + o]).px('#3f9f4f', [9, 15 + o]);
  },
  owi_col(p, dir, o) { // Coleowe (Cole): sombrero de ala enorme, pelo claro despeinado, pañuelo rojo
    owito(p, o, '#f0eee8', '#c8c0b0');
    p.rect(1, 6 + o, 16, 2, '#6e4520').ell(9, 4.6 + o, 4, 2.2, '#8a5a3a').px('#c9ced8', [8, 3 + o], [9, 3 + o], [10, 3 + o]);
    p.px('#e8e0c8', [5, 8 + o], [6, 8 + o], [12, 8 + o], [13, 8 + o], [11, 9 + o]);
    p.rect(5, 13 + o, 9, 1, '#a83a2a').rect(4, 14 + o, 10, 2, '#6e4520');
  },
  owi_cul(p, dir, o) { // el cosplay de Cait: el comandante Cullen (pelo rubio, capa de piel granate, armadura plateada)
    owito(p, o, '#f3e6c0', '#d9b878');
    p.ell(9, 6.3 + o, 5.2, 1.8, '#e8c860').px('#f4dc80', [7, 5 + o], [10, 5 + o]).px('#c9a040', [12, 6 + o]);
    p.rect(1, 11 + o, 3, 3, '#7a2a2a').rect(14, 11 + o, 3, 3, '#7a2a2a').rect(2, 14 + o, 14, 1, '#7a2a2a').px('#a04545', [1, 11 + o], [3, 12 + o], [15, 11 + o], [16, 13 + o]);
    p.rect(5, 15 + o, 8, 2, '#c9ced8').px('#e8b820', [9, 15 + o]).px('#8a1f2a', [5, 16 + o], [12, 16 + o]);
  },
  // Owitos de Navidad
  owito_n(p, dir, o) { owito(p, o, '#f7b8c8', '#ffffff'); p.rect(7, 1 + o, 5, 4, '#3f9f4f').px('#fff', [7, 2 + o], [8, 3 + o], [11, 2 + o], [10, 3 + o]).rect(9, 1 + o, 1, 4, '#e2574c'); },
  // El de verde con gorro de árbol de Navidad (estrella, bolitas) y un bastón de caramelo: el vendedor de taiyakis
  owito_x(p, dir, o) {
    owito(p, o, '#8fd070', '#3f9f4f');
    const T = '#2f7f3f';
    p.px(T, [9, 2 + o]).rect(8, 3 + o, 3, 1, T).rect(7, 4 + o, 5, 1, T).rect(6, 5 + o, 7, 1, T);
    p.px('#ffe066', [9, 1 + o]).px('#e2574c', [8, 4 + o], [11, 5 + o]).px('#5ab0e8', [10, 3 + o], [7, 5 + o]);
    p.px('#e2574c', [11, 13 + o], [12, 14 + o], [12, 16 + o]).px('#ffffff', [12, 13 + o], [12, 15 + o]);
  },
  owito_r(p, dir, o) { owito(p, o, '#c98f4e', '#8a5a2a'); p.rect(6, 3 + o, 7, 2, '#e2574c').rect(5, 5 + o, 9, 1, '#fff').px('#fff', [13, 2 + o]).px('#e2574c', [9, 12 + o]); },
  // Ovejoncia (id «ovejoncio»): oveja enorme y redonda de lana blanca, con la cara beige
  ovejoncio(p, dir, o) { // Ovejoncia: oveja enorme de lana blanca, cara crema, orejas caídas y pestañas
    const W = '#f3ecdc', L = '#fbf7ee', F = '#efe2c8', D = '#d6c8ac', K = '#f2a7b8';
    p.ell(1.4, 7.6 + o, 1.6, 1.2, F).ell(16.6, 7.6 + o, 1.6, 1.2, F).px('#f0c0c0', [0.7, 7.3 + o], [16.6, 7.3 + o]); // orejas caídas, a los lados
    p.ell(9, 10.5 + o, 7.6, 6.6, W);                                                                      // lana
    p.px(L, [4, 7 + o], [7, 5 + o], [11, 5 + o], [14, 7 + o], [3, 12 + o], [15, 12 + o], [6, 15 + o], [12, 15 + o]).px(D, [5, 6 + o], [13, 6 + o], [2, 11 + o], [16, 11 + o], [9, 4 + o]);
    if (dir !== 'up') {
      p.ell(9, 11.8 + o, 3.4, 3, F);                                                                       // cara
      p.px(BLACK, [7, 11 + o], [11, 11 + o]).px('#5a3a3a', [6, 10.4 + o], [12, 10.4 + o]).px(K, [6, 13 + o], [12, 13 + o]).px('#c98080', [9, 13 + o]); // ojos, pestañas hacia fuera, mofletes, boca
    }
    p.rect(5, 17, 2, 1, F).rect(11, 17, 2, 1, F);
  },
  // Gemelos bipolares (siameses de peluche): lado feliz y lado enfurruñado
  gato(p, dir, o) { siamese(p, o, true); },
  gatot(p, dir, o) { siamese(p, o, false); },
  // Awawas (damanes): redondos, marrones y con sus dos dientecitos. Siri lleva un pañuelo rosa
  awawa(p, dir, o) { hyrax(p, o, false); },
  siri(p, dir, o) { hyrax(p, o, true); },
  fuxia(p, dir, o) {
    const W = '#fbeef0', S = '#eecdd6';
    p.ell(5.5, 4.5 + o, 1.8, 3.8, W).ell(12.5, 4.5 + o, 1.8, 3.8, W);
    p.px(S, [5, 4 + o], [5, 5 + o], [12, 4 + o], [12, 5 + o]);
    p.ell(9, 12 + o, 5.5, 4.8, W).ell(9, 15 + o, 4, 1.5, S);
    p.px('#2a4fd0', [6, 11 + o], [11, 11 + o]);
    p.px(INK, [8, 12 + o], [9, 12 + o], [7, 13 + o], [10, 13 + o]);
    p.rect(11, 7 + o, 4, 2, '#c8202c').px('#8f1520', [12, 7 + o], [13, 8 + o]);
  },
};

function dog(p, dir, o, f, c) {
  if (dir === 'side') {
    p.px(c.fur, [1, 9 + o], [2, 10 + o], [2, 11 + o]);
    p.ell(8, 12 + o, 6, 2.6, c.fur).rect(4, 13 + o, 8, 1, c.tan);
    const a = f ? 1 : 0;
    p.rect(3 + a, 15, 2, 2, c.tan).rect(11 - a, 15, 2, 2, c.tan);
    p.ell(13.5, 9 + o, 3, 3, c.fur).ell(12, 10 + o, 1.3, 2.6, c.ear);
    p.px(c.tan, [16, 10 + o], [16, 11 + o], [15, 11 + o]).px(BLACK, [17, 10 + o], [14, 8 + o]);
    p.px(c.ribbon, [11, 11 + o], [11, 12 + o]);
  } else {
    p.ell(9, 14, 3.6, 2.6, c.fur);
    p.rect(6, 15, 2, 2, c.tan).rect(10, 15, 2, 2, c.tan);
    p.ell(4.2, 10 + o, 1.6, 3.2, c.ear).ell(13.8, 10 + o, 1.6, 3.2, c.ear);
    p.ell(9, 9 + o, 4.6, 4, c.fur);
    if (dir === 'down') {
      p.ell(9, 11.3 + o, 2.4, 1.8, c.tan);
      p.px(BLACK, [7, 8 + o], [11, 8 + o], [8, 10 + o], [9, 10 + o]);
      p.px(c.tan, [6, 6 + o], [11, 6 + o]);
      p.rect(7, 13 + o, 4, 1, c.ribbon);
    } else {
      p.px(c.fur, [9, 17]).px(c.ribbon, [8, 13 + o], [9, 13 + o]);
    }
  }
}

const SIZE = { perrunfli: [26, 22] };
// Personajes un 50 % más grandes que Colgadín: se dibujan con las mismas coordenadas de 18x18 sobre un lienzo mayor
const SCALE = { peludito: 1.5, heladoncio: 1.5, heladoncioh: 1.5, ovejoncio: 1.5 };
function scaled(p, k) {
  const r = (v) => Math.round(v * k), sz = Math.max(1, Math.round(k));
  const q = {
    raw: p, k,
    ell(cx, cy, rx, ry, c) { p.ell(cx * k, cy * k, rx * k, ry * k, c); return q; },
    rect(x, y, w, h, c) { p.rect(r(x), r(y), Math.max(1, r(x + w) - r(x)), Math.max(1, r(y + h) - r(y)), c); return q; },
    px(c, ...pts) { for (const [x, y] of pts) p.rect(r(x), r(y), sz, sz, c); return q; },
    line(x0, y0, x1, y1, c) { p.line(r(x0), r(y0), r(x1), r(y1), c); return q; },
    get: (x, y) => p.get(r(x), r(y)),
    set(x, y, c) { p.rect(r(x), r(y), sz, sz, c); return q; },
  };
  return q;
}
const HALO = ['scooby', 'cuca']; // aureola, como los difuntos de Dragon Ball

function siamese(p, o, happy) {
  const T = '#ebb96a', M = '#a0704a', D = '#4a2c1e';
  p.px(D, [4, 3 + o], [4, 4 + o], [5, 4 + o], [4, 5 + o], [5, 5 + o], [6, 5 + o], [14, 3 + o], [14, 4 + o], [13, 4 + o], [14, 5 + o], [13, 5 + o], [12, 5 + o]);
  p.ell(9, 11 + o, 7, 5.6, T).ell(9, 12 + o, 4.4, 3.4, M);
  p.rect(3, 16, 3, 1, D).rect(12, 16, 3, 1, D).px(D, [16, 13 + o], [17, 12 + o], [17, 11 + o]);
  if (happy) p.px(BLACK, [6, 10 + o], [7, 9 + o], [8, 10 + o], [10, 10 + o], [11, 9 + o], [12, 10 + o], [8, 13 + o], [9, 14 + o], [10, 13 + o]);
  else p.px(BLACK, [6, 9 + o], [7, 10 + o], [12, 9 + o], [11, 10 + o], [7, 11 + o], [11, 11 + o], [8, 14 + o], [9, 13 + o], [10, 14 + o]).px('#fff', [6, 11 + o], [12, 11 + o]);
  p.px(BLACK, [4, 12 + o], [3, 13 + o], [14, 12 + o], [15, 13 + o]);
}
function hyrax(p, o, scarf) {
  const B = '#8a5a2e', L = '#cfa468', D = '#5e3a1c';
  p.ell(4.5, 6 + o, 1.9, 1.9, D).ell(13.5, 6 + o, 1.9, 1.9, D);
  p.ell(9, 13.5, 5.6, 3.8, B).rect(5, 16, 2, 1, D).rect(11, 16, 2, 1, D);
  p.ell(9, 9 + o, 5.5, 4.7, B).ell(9, 11.2 + o, 3.5, 2.5, L).px('#a06e3a', [6, 5 + o], [11, 5 + o], [9, 6 + o]);
  p.px(BLACK, [6, 8 + o], [12, 8 + o]).px('#fff', [6, 7 + o], [12, 7 + o]);
  p.px(D, [8, 10 + o], [9, 10 + o], [10, 10 + o], [9, 11 + o]).rect(7, 12 + o, 5, 1, D);
  p.px('#ffffff', [8, 13 + o], [10, 13 + o], [8, 14 + o], [10, 14 + o]);                    // los dientecitos
  if (scarf) p.rect(4, 14 + o, 10, 2, '#E0B0D5').px('#E0B0D5', [13, 16 + o], [14, 16 + o], [14, 17]).px('#c690b9', [5, 15 + o], [9, 15 + o], [12, 15 + o]);
}
function manteca(p, o) {
  const T = '#d9b07a', L = '#e8c898';
  p.ell(9, 11.5 + o, 7, 5.4, T).ell(8, 8 + o, 3.4, 1.2, L).rect(5, 16, 2, 1, '#b08a50').rect(11, 16, 2, 1, '#b08a50');
  p.ell(2.8, 9.5 + o, 2, 3, BLACK).ell(15.2, 9.5 + o, 2, 3, BLACK);
  p.px('#5a4636', [6, 10 + o], [7, 10 + o], [11, 10 + o], [12, 10 + o]).px(BLACK, [8, 12 + o], [9, 12 + o], [10, 12 + o], [9, 13 + o]).px('#e2574c', [9, 14 + o], [9, 15 + o]);
}
function owito(p, o, body, acc) {
  p.px(body, [3, 6 + o], [4, 5 + o], [4, 6 + o], [5, 6 + o], [13, 6 + o], [14, 5 + o], [14, 6 + o], [15, 6 + o]).px('#f7a8c0', [4, 6 + o], [14, 6 + o]);
  p.ell(9, 11.5 + o, 6.6, 5.5, body).ell(9, 15 + o, 3.4, 1.6, '#ffffff');
  p.px(acc, [8, 6 + o], [9, 6 + o], [10, 6 + o], [9, 7 + o], [3, 10 + o], [4, 10 + o], [14, 10 + o], [15, 10 + o]);
  p.px(BLACK, [6, 10 + o], [12, 10 + o]).px('#5a4636', [8, 13 + o], [10, 13 + o], [9, 12 + o]).px('#f08aa0', [5, 12 + o], [13, 12 + o]);
}

function pig(p, o, eye, body, ear) {
  p.ell(9, 11.5 + o, 6.6, 5.4, body).ell(4, 7 + o, 2.2, 2, ear).ell(14, 7 + o, 2.2, 2, ear).ell(9, 8 + o, 3, 1.2, '#f6ece6');
  p.ell(9, 12.6 + o, 2.7, 1.9, '#f6e6de').px('#b08a80', [8, 12 + o], [10, 12 + o]).px(eye, [6, 10 + o], [12, 10 + o]);
  p.rect(5, 16, 2, 1, ear).rect(11, 16, 2, 1, ear);
}

function mouse(p, o, c, cl) {
  const PK = '#f0a8a0';
  p.px(PK, [14, 15], [15, 15], [16, 14], [17, 13], [17, 12]);                       // cola
  p.ell(5, 7 + o, 2.5, 2.5, c).ell(13, 7 + o, 2.5, 2.5, c).ell(5, 7.3 + o, 1.3, 1.3, PK).ell(13, 7.3 + o, 1.3, 1.3, PK);
  p.ell(9, 12.5 + o, 5.2, 4.4, c).ell(9, 10.5 + o, 3.6, 3, c).ell(8, 9 + o, 2.2, 1, cl).ell(9, 15 + o, 3, 1.4, cl);
  p.px(BLACK, [7, 11 + o], [11, 11 + o]).px(PK, [9, 13 + o], [6, 17], [7, 17], [11, 17], [12, 17]);
  p.px('#5a5560', [5, 13 + o], [4, 12 + o], [13, 13 + o], [14, 12 + o]);            // bigotes
}

function charFrame(name, dir, f) {
  const k = SCALE[name] || 1;
  const [w, h] = SIZE[name] || [Math.round(18 * k), Math.round(18 * k)];
  let p = new PX(w, h);
  CHARS[name](k === 1 ? p : scaled(p, k), dir, f ? -1 : 0, f);
  p.outline(INK);
  if (HALO.includes(name)) {
    p = new PX(w, h + 4).blit(p, 0, 4);
    p.rect(6, 0, 6, 1, '#fff2a0').rect(6, 2, 6, 1, '#e8b820').px('#ffe066', [5, 1], [12, 1]);
  }
  return p.canvas();
}

// ---------------------------------------------------------------- Baldosas
export function makeTiles() {
  const T = {};
  const mk = (name, seed, base, fn) => {
    const p = new PX(16, 16).rect(0, 0, 16, 16, base);
    fn && fn(p, rng(seed));
    T[name] = p.canvas();
  };
  mk('g', 1, '#6fbf5a', (p, r) => p.speck(r, 14, '#63b04f', '#82cc6a'));
  mk('G', 2, '#6fbf5a', (p, r) => p.speck(r, 22, '#63b04f', '#82cc6a', '#5aa648'));
  mk('f', 3, '#6fbf5a', (p, r) => {
    p.speck(r, 12, '#63b04f', '#82cc6a');
    p.px('#fff6dc', [3, 4], [5, 4], [4, 3], [4, 5]).px('#f6c56b', [4, 4]);
    p.px('#f7a8c0', [10, 10], [12, 10], [11, 9], [11, 11]).px('#f6c56b', [11, 10]);
  });
  mk('s', 4, '#f0dc9c', (p, r) => p.speck(r, 12, '#e3cb86', '#f7e8b8'));
  mk('p', 5, '#d9b77c', (p, r) => p.speck(r, 14, '#c9a468', '#e4c690'));
  for (const [n, s] of [['w0', 0], ['w1', 4]]) {
    mk(n, 6, '#3f8fd8', (p) => {
      for (const [x, y, w] of [[1, 3, 4], [9, 7, 5], [3, 12, 4], [12, 14, 3]]) for (let i = 0; i < w; i++) p.set((x + i + s) % 16, y, '#6fb4ee');
    });
  }
  mk('b', 7, '#a8743c', (p) => {
    for (let y = 3; y < 16; y += 4) p.rect(0, y, 16, 1, '#8a5a2a');
    p.rect(0, 0, 1, 16, '#6e4520').rect(15, 0, 1, 16, '#6e4520');
  });
  mk('t', 8, '#b9b9b0', (p, r) => {
    p.rect(0, 15, 16, 1, '#9c9c92').rect(15, 0, 1, 16, '#9c9c92').rect(0, 7, 16, 1, '#9c9c92').rect(7, 0, 1, 7, '#9c9c92');
    p.speck(r, 6, '#c8c8c0');
  });
  mk('a', 9, '#5a5d66', (p, r) => { p.speck(r, 14, '#50535c', '#666a74'); p.rect(4, 7, 8, 2, '#e8e8e0'); });
  mk('C', 10, '#f3dfae', (p, r) => { p.speck(r, 10, '#ead29a'); p.rect(0, 15, 16, 1, '#e2c88c').rect(15, 0, 1, 16, '#e2c88c'); });
  mk('c', 11, '#e9c98f', (p) => {
    for (let y = 3; y < 16; y += 4) p.rect(0, y, 16, 1, '#cfa76a');
    for (let y = 0; y < 16; y += 8) { p.rect(7, y, 1, 3, '#cfa76a'); p.rect(15, y + 4, 1, 3, '#cfa76a'); }
  });
  mk('i', 12, '#f7a8c0', (p) => { // glaseado rosa: remate superior del muro
    p.rect(0, 9, 16, 7, '#e9c98f');
    for (let x = 0; x < 16; x += 4) p.rect(x, 9, 2, 2, '#f7a8c0');
    p.rect(0, 0, 16, 1, '#fbd0de');
  });
  mk('o', 13, '#c8935a', (p) => {
    for (let y = 7; y < 16; y += 8) p.rect(0, y, 16, 1, '#a8743c');
    p.rect(5, 0, 1, 7, '#a8743c').rect(12, 8, 1, 7, '#a8743c');
  });
  mk('W', 14, '#e8d5b0', (p) => { p.rect(0, 12, 16, 4, '#8a5a2a').rect(0, 11, 16, 1, '#6e4520'); for (let x = 3; x < 16; x += 6) p.rect(x, 2, 1, 7, '#decaa0'); });
  mk('V', 26, '#e8d5b0', (p) => { for (let x = 3; x < 16; x += 6) p.rect(x, 5, 1, 9, '#decaa0'); p.rect(0, 0, 16, 2, '#d6c098'); }); // pared alta (sin zócalo)
  mk('x', 15, '#1a1412');
  // Casa de Cait (según las fotos del piso real): tarima de roble claro y paredes blancas con zócalo blanco
  mk('O', 31, '#dcc29a', (p) => {
    for (let y = 3; y < 16; y += 4) p.rect(0, y, 16, 1, '#c9ab80');
    p.rect(4, 0, 1, 3, '#c9ab80').rect(11, 4, 1, 3, '#c9ab80').rect(7, 8, 1, 3, '#c9ab80').rect(14, 12, 1, 3, '#c9ab80');
    p.px('#e6d0ad', [1, 1], [9, 5], [3, 9], [12, 13]);
  });
  mk('Y', 32, '#f2ede2', (p) => { p.rect(0, 0, 16, 2, '#e4ddcd'); });                                   // pared alta
  mk('Z', 33, '#f2ede2', (p) => { p.rect(0, 12, 16, 4, '#ffffff').rect(0, 11, 16, 1, '#d8d0bf').rect(0, 15, 16, 1, '#d8d0bf'); }); // zócalo blanco
  mk('k', 16, '#cdb38a', (p, r) => { p.speck(r, 8, '#c2a77c'); p.rect(0, 15, 16, 1, '#bfa377').rect(15, 0, 1, 16, '#bfa377'); });
  mk('K', 17, '#7d6a5c', (p) => {
    p.rect(0, 0, 16, 2, '#96826f');
    for (let y = 5; y < 16; y += 5) p.rect(0, y, 16, 1, '#5e4e43');
    p.rect(5, 0, 1, 5, '#5e4e43').rect(11, 6, 1, 4, '#5e4e43').rect(3, 11, 1, 5, '#5e4e43');
  });
  mk('h', 18, '#b9b9b0', (p) => { for (let y = 0; y < 16; y += 4) p.rect(0, y, 16, 1, '#dcdcd4').rect(0, y + 3, 16, 1, '#8a8a80'); });
  mk('q', 19, '#b83b33', (p) => { // muro del templo con tejadillo
    p.rect(0, 0, 16, 6, '#3d5a52').rect(0, 6, 16, 1, '#263a35').rect(0, 7, 16, 1, '#e8b820').rect(0, 14, 16, 2, '#8f2a25');
    for (let x = 1; x < 16; x += 4) p.rect(x, 1, 2, 4, '#58796f');
  });
  mk('n', 20, '#8a5f3a', (p, r) => { // campo de nabos
    p.speck(r, 10, '#7a5230', '#96693f');
    for (const y of [7, 15]) p.rect(0, y, 16, 1, '#6e4a2c');
    for (const [x, y] of [[3, 3], [11, 3], [7, 11], [14, 11]]) p.px('#3f9f4f', [x, y - 2], [x - 1, y - 1], [x + 1, y - 1], [x, y - 1]).px('#f6f2ff', [x, y], [x - 1, y + 1], [x, y + 1], [x + 1, y + 1]).px('#c9a0e0', [x, y + 2]);
  });
  mk('L', 24, '#c8935a', (p) => { // pilar de piedra del pasillo de las ratitas (corta el rayo de luz)
    p.rect(0, 7, 16, 1, '#a8743c').ell(8, 13, 6.5, 2.5, '#8a8f9a').rect(3, 1, 10, 12, '#b9b9b0').rect(3, 1, 3, 12, '#d6d6cf').rect(11, 1, 2, 12, '#9c9c92').rect(2, 0, 12, 2, '#9c9c92').rect(2, 12, 12, 2, '#9c9c92');
  });
  mk('d', 25, '#ecd9b0', (p, r) => { p.speck(r, 14, '#e2c896', '#f3e4c4', '#f0d0b8'); p.rect(2, 11, 5, 1, '#e2c896').rect(9, 4, 4, 1, '#f0d0b8'); }); // toba de Kapadokya
  mk('S', 21, '#f4f8fb', (p, r) => p.speck(r, 12, '#e4eef4', '#ffffff', '#dbe8f0'));
  mk('I', 22, '#bfe3f7', (p, r) => { p.speck(r, 6, '#d7eefb'); p.line(3, 4, 7, 2, '#e8f6fd').line(10, 12, 13, 10, '#e8f6fd').px('#a9d6ee', [5, 10], [12, 5]); });
  mk('P', 23, '#dbe4ea', (p, r) => p.speck(r, 14, '#ccd8e0', '#e6eef2'));
  return T;
}

// ---------------------------------------------------------------- Objetos
function cheese(w, h) {
  const p = new PX(w + 2, h + 2);
  for (let y = 0; y < h; y++) { const x0 = Math.round((h - 1 - y) * (w * 0.5) / h); p.rect(1 + x0, 1 + y, w - x0, 1, y < h * 0.35 ? '#ffe680' : '#ffd23f'); }
  p.rect(1, h - 1, w, 2, '#e0a82e').px('#e0a82e', [w - 2, 3 + (h >> 2)], [(w >> 1) + 1, h >> 1], [w - 3, h - 3]);
  return p.outline(INK);
}
// inv: calcetín de color con el dibujo en blanco (diseños 5 a 9)
function sockArt(col, kind, inv) {
  const p = new PX(10, 13), W = inv ? col : '#f4f4ee', c = inv ? '#f4f4ee' : col;
  p.rect(3, 1, 4, 8, W).rect(3, 8, 6, 4, W).rect(3, 1, 4, 2, c);
  if (kind === 0) p.rect(3, 4, 4, 1, c).rect(3, 6, 4, 1, c).rect(4, 9, 5, 1, c);
  if (kind === 1) p.px(c, [4, 4], [6, 6], [4, 8], [7, 10], [5, 10]);
  if (kind === 2) p.px(c, [3, 5], [4, 4], [5, 5], [6, 4], [3, 8], [4, 7], [5, 8], [6, 7], [7, 9], [8, 10]);
  if (kind === 3) p.rect(3, 4, 4, 2, c).px('#fff', [4, 4], [6, 5]).rect(7, 10, 2, 2, c);
  if (kind === 4) p.rect(5, 3, 1, 9, c).rect(3, 9, 6, 1, c);
  return p.outline(INK);
}
function gemArt(c, l) {
  const p = new PX(14, 20);
  p.rect(4, 14, 6, 4, '#8a5a2a').rect(3, 17, 8, 2, '#6e4520');
  for (let i = 0; i < 6; i++) { p.rect(7 - i * 0.7, 2 + i, 1 + i * 1.4, 1, i < 2 ? l : c); p.rect(7 - (5 - i) * 0.7, 8 + i, 1 + (5 - i) * 1.4, 1, c); }
  p.px(l, [6, 5], [5, 7], [6, 9]);
  return p.outline(INK);
}
function lampArt(c, on) {
  const p = new PX(14, 24);
  p.rect(6, 9, 2, 12, '#8a8f9a').ell(7, 21.5, 4, 1.5, '#6a6f7a');
  for (let i = 0; i < 7; i++) p.rect(5 - i * 0.5, 2 + i, 4 + i, 1, on ? c : '#77777f');
  if (on) p.rect(4, 9, 6, 2, '#fff6b0').px('#fff', [5, 4], [5, 5]); else p.px(c, [6, 21], [7, 21]).rect(5, 2, 4, 1, c);
  return p.outline(INK);
}
// Estatua de piedra del Rey Peludito sobre un pedestal (1 sentado · 2 con espada · 3 con cetro y capa)
function statue(kind) {
  const q = new PX(18, 18), p = new PX(20, 32);
  CHARS.peludito(q, 'down', 0);
  for (let i = 0; i < q.d.length; i++) {
    const c = q.d[i];
    if (!c) continue;
    const n = parseInt(c.slice(1), 16), l = ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.6 + (n & 255) * 0.1) | 0, g = l < 110 ? 58 : Math.min(215, 70 + l * 0.6) | 0; // ojos y nariz bien oscuros para que se lea la cara
    q.d[i] = '#' + ((g << 16) | (g << 8) | (g + 8)).toString(16).padStart(6, '0');
  }
  p.rect(2, 24, 16, 7, '#9c9c92').rect(1, 22, 18, 3, '#b9b9b0').rect(1, 30, 18, 2, '#8a8a80').rect(6, 26, 8, 2, '#e8b820');
  // Coronación: la capa (una manta) va por detrás del cuerpo y asoma por los lados con su ribete; la cara queda despejada
  if (kind === 3) p.rect(1, 12, 18, 10, '#8a8f9a').rect(0, 15, 1, 7, '#8a8f9a').rect(19, 15, 1, 7, '#8a8f9a').px('#d0d0c8', [1, 21], [3, 21], [16, 21], [18, 21], [0, 18], [19, 18]);
  p.blit(q, 1, 5);
  if (kind === 2) p.line(17, 14, 17, 2, '#c9ced8').rect(15, 13, 5, 1, '#8a8a80');
  if (kind === 3) p.rect(2, 6, 1, 16, '#b0aa98').ell(2.5, 4.5, 1.6, 1.6, '#e8b820');
  // 4: descubriendo nuevos ingredientes para el mazapán (lupa en una pata, matraz en la otra), todo de piedra
  if (kind === 4) {
    p.ell(17, 15, 2.6, 2.6, '#6e6e66').ell(17, 15, 1.6, 1.6, '#d8dce4').px('#ffffff', [16, 14]).line(15, 17, 14, 19, '#6e6e66');
    p.ell(2.5, 19.5, 2.4, 2.2, '#c9ced8').rect(2, 14, 2, 4, '#c9ced8').rect(1, 13, 4, 1, '#8a8a80').px('#eef0f4', [2, 19], [3, 18]);
  }
  // 5: la siesta real (ojos cerrados)
  if (kind === 5) p.px('#9a9a92', [7, 15], [13, 15]).px('#3a3a36', [6, 15], [7, 16], [8, 15], [12, 15], [13, 16], [14, 15]);
  p.outline(INK);
  // …y una zeta tallada encima, sin contorno para que se lea
  if (kind === 5) for (const [x, y] of [[14, 0], [15, 0], [16, 0], [17, 0], [16, 1], [15, 2], [14, 3], [15, 3], [16, 3], [17, 3]]) p.set(x, y, '#4a4a44');
  return p;
}
function sofa(back, seat, arm) {
  const p = new PX(32, 20);
  p.rect(1, 1, 30, 10, back).rect(1, 9, 30, 8, seat).rect(1, 6, 4, 11, arm).rect(27, 6, 4, 11, arm).rect(15, 9, 1, 8, arm).rect(3, 17, 3, 2, '#6e4520').rect(26, 17, 3, 2, '#6e4520');
  return p.outline(INK);
}
// Cuadros de Cait (16x22 con marco): 1 Bulbasaur bajo el cerezo · 2 Squirtle flotando entre juncos · 3 Charmander en el cerezo
function cuadro(n) {
  const p = new PX(16, 22), PA = '#f7f0ea', PK = '#f4b3c6', PD = '#e5869f', PL = '#fbdbe5', TR = '#4a3c3e', TX = '#2b2320';
  p.rect(0, 0, 16, 22, '#6e4520').rect(1, 1, 14, 20, PA);
  if (n === 1) {
    p.rect(12, 9, 3, 6, '#e3e2de').px('#d2d4d4', [13, 8], [14, 9]);
    p.ell(9, 4, 7, 3.6, PK).ell(5, 3, 4, 2.4, PD).ell(12, 2.5, 2.5, 1.5, PL).px(PL, [7, 2], [10, 5], [4, 5]);
    p.rect(1, 6, 3, 15, TR).rect(3, 6, 2, 2, TR).line(4, 6, 9, 5, TR).px('#6a5658', [2, 9], [2, 13], [1, 16]);
    p.rect(1, 18, 14, 3, '#efd9de').px(PD, [5, 17], [13, 19], [7, 20], [11, 8], [14, 13], [9, 11]);
    p.px(TX, [6, 8], [7, 8], [7, 9], [6, 10], [7, 10], [7, 11], [6, 12], [7, 13]);
    const B = '#78c4b0', BD = '#4f9a88', G = '#5fae5a', GD = '#3f8a44';
    p.ell(10.5, 17.5, 3.2, 2, B).ell(8.5, 14.5, 2.2, 2, G).px(GD, [8, 13], [9, 15], [7, 15]).ell(11.5, 15, 2.4, 1.8, B);
    p.px(BD, [9, 18], [12, 17], [13, 14], [10, 14]).px('#c0392b', [11, 15], [13, 15]).px('#fff', [11, 14]).px(B, [13, 13], [10, 13]);
  } else if (n === 2) {
    p.rect(1, 1, 14, 20, '#f2ead6').ell(6, 5, 6, 2, '#d9dccb').ell(11, 6, 4, 1.5, '#cfd4c0');
    for (const [x, y0] of [[2, 8], [3, 6], [4, 10], [14, 11]]) p.rect(x, y0, 1, 19 - y0, '#5c8a5a');
    p.px('#7aa86a', [1, 10], [5, 12], [13, 13]).px('#8a6cc0', [14, 10], [13, 11]).px('#a88a50', [3, 5]);
    p.px(TX, [13, 2], [14, 3], [13, 4], [13, 5], [14, 6], [13, 7], [14, 8]);
    p.rect(8, 7, 1, 5, '#cfe6f2').px('#ffffff', [8, 6], [7, 5], [9, 5], [8, 4], [6, 7], [10, 7]);
    p.rect(1, 18, 14, 3, '#bfd8c8').ell(3.5, 19.5, 2.2, 1, '#5c8a5a').ell(12, 20, 2.4, 1, '#5c8a5a').px('#f0a0b8', [3, 18], [4, 18]);
    const SQ = '#7ab8d8', SD = '#4a8ab0';
    p.ell(9.5, 16, 3.8, 2.2, '#8a5a2a').ell(9.5, 15.6, 3.4, 1.6, '#b07a40').ell(9.5, 14, 2.8, 1.5, '#efe0a8').px('#d9c48a', [8, 14], [10, 14]);
    p.ell(5, 14, 2.2, 1.8, SQ).px(SD, [4, 13]).px(TX, [5, 13]).px(SQ, [8, 12], [11, 12], [13, 15], [14, 16]).ell(13, 17, 1.4, 1, SQ).px(SD, [13, 17]);
  } else {
    p.ell(8, 4, 7, 3.8, PK).ell(4, 5, 3, 2, PD).ell(12, 3, 3, 2, PD).px(PL, [6, 2], [9, 5], [13, 6], [2, 3]);
    p.rect(6, 8, 3, 11, TR).line(7, 8, 3, 5, TR).line(8, 8, 12, 5, TR).rect(4, 18, 7, 1, TR).px('#6a5658', [7, 12], [6, 15]);
    p.rect(1, 19, 14, 2, '#efd9de').px(PD, [2, 12], [13, 10], [12, 17], [3, 16], [10, 20]);
    p.px(TX, [12, 11], [13, 11], [12, 12], [13, 13], [12, 14], [12, 15], [13, 15]);
    const O = '#f5a43a', OD = '#d9822a';
    p.ell(9, 8.5, 1.8, 1.4, O).px(TX, [9, 8]).rect(9, 10, 2, 3, O).px(OD, [10, 12]).px(O, [8, 11], [11, 10]);
    p.line(10, 13, 9, 15, O).ell(9, 16.5, 1.6, 1.6, '#e2574c').px('#ffd23f', [9, 17], [9, 16]).px('#f08a24', [8, 15], [10, 15]);
  }
  // el marco, por encima de todo para que nada se salga
  const FR = '#6e4520';
  p.rect(0, 0, 16, 1, FR).rect(0, 21, 16, 1, FR).rect(0, 0, 1, 22, FR).rect(15, 0, 1, 22, FR).rect(1, 1, 14, 1, '#8a5a2a');
  return p.outline(INK);
}
function pot(flower, center) {
  const p = new PX(12, 16);
  p.rect(3, 10, 6, 5, '#c96a10').rect(2, 9, 8, 2, '#e07a2a').rect(3, 14, 6, 1, '#a8540c');
  p.rect(5, 5, 1, 4, '#3f9f4f').rect(7, 6, 1, 3, '#3f9f4f').px('#5fbf5a', [4, 7], [8, 7]);
  p.px(flower, [4, 3], [6, 3], [5, 2], [5, 4], [7, 4], [8, 5], [6, 5]).px(center, [5, 3], [7, 5]);
  return p.outline(INK);
}
// Plátano en forma de media luna, con el rabito marrón (ox, oy: desplazamiento)
function banana(p, ox, oy, c) {
  p.px('#6e4520', [ox + 2, oy + 2]).rect(ox + 2, oy + 3, 2, 2, c).rect(ox + 2, oy + 5, 3, 1, c).px(c, [ox + 8, oy + 5]).rect(ox + 3, oy + 6, 6, 1, c).rect(ox + 4, oy + 7, 4, 1, c);
}
function shape(k, c) { // o naranja · f fresa · p pera · b plátano
  const p = new PX(10, 10);
  if (k === 'o') p.ell(5, 6, 3.4, 3.2, c);
  if (k === 'f') { for (let i = 0; i < 6; i++) p.rect(2 + (i >> 1), 3 + i, 6 - 2 * (i >> 1), 1, c); }
  if (k === 'p') p.ell(5, 7, 3, 2.6, c).ell(5, 4, 1.8, 2, c);
  if (k === 'b') { banana(p, 0, 0, c); p.px('#ffffff', [3, 4]); return p.outline(INK); }
  p.px('#ffffff', [4, 5]).px('#3f9f4f', [5, 1], [6, 1], [5, 2]);
  return p.outline(INK);
}
// Globo de fiesta (de los normales, no aerostático): cuerpo ovalado con brillo y nudito; (x, y) = centro
function flowerpot(c) {
  const p = new PX(11, 13);
  p.rect(2, 8, 7, 4, '#c96a10').rect(1, 7, 9, 2, '#f08a24').rect(3, 12, 5, 1, '#a8560c');        // tiesto
  p.ell(5.5, 6, 4.2, 2.2, '#3f9f4f').px('#5ec46a', [2, 6], [8, 6]);                               // hojas
  for (const [x, y] of [[3, 3], [8, 3], [5.5, 5]]) {                                               // tres flores
    const X = Math.round(x);
    p.px(c, [X - 1, y], [X + 1, y], [X, y - 1], [X, y + 1]).px('#ffe066', [X, y]);
  }
  return p.outline(INK);
}
function banner(c, dark, flip) {
  const p = new PX(15, 24);
  p.rect(2, 2, 2, 22, '#6e4520').rect(3, 2, 1, 22, '#8a5a2a').rect(1, 0, 4, 2, '#ffd23f');           // mástil y remate
  p.rect(4, 3, 10, 11, c).rect(4, 12, 10, 2, dark);                                                   // bandera
  for (const [x, y] of [[13, 7], [13, 8], [13, 9], [12, 8]]) p.set(x, y, null);                      // cola de golondrina
  p.px('#ffd23f', [7, 7], [9, 6], [11, 7], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8]);                  // corona
  p.outline(INK);
  if (!flip) return p;
  const q = new PX(15, 24);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 15; x++) q.set(14 - x, y, p.get(x, y));
  return q;
}
function partyBalloon(p, x, y, c) {
  const X = Math.round(x), Y = Math.round(y);
  return p.ell(x, y, 4.3, 5.5, c).px('#ffffff', [X - 3, Y - 2], [X - 3, Y - 1], [X - 2, Y - 3]).px(c, [X - 1, Y + 5], [X, Y + 5], [X, Y + 6]);
}
const STRING = '#6b5a4a';
function balloonSingle(c) { // un globo suelto con su cordel ondulado
  const p = new PX(12, 26);
  partyBalloon(p, 6, 6.5, c).outline(INK);
  return p.line(6, 14, 5, 18, STRING).line(5, 18, 7, 22, STRING).line(7, 22, 6, 25, STRING);
}

// Clon reparador de TEDI: el clon de Owinken con casco de obra amarillo y una llave inglesa en la mano
function clonFix(o) {
  const q = new PX(18, 18), p = new PX(24, 22);
  pig(q, o, '#e2264a', '#f2c4c4', '#e0a0a8');
  p.blit(q, 3, 4);
  const Y = '#ffd23f', YD = '#d9a400', YL = '#fff0a0', top = 6 + o;
  for (let y = top; y < top + 4; y++) for (let x = 0; x < 24; x++) if (((x + 0.5 - 12) / 6) ** 2 + ((y + 0.5 - top - 4) / 4) ** 2 <= 1) p.set(x, y, Y); // cúpula del casco (mitad de arriba)
  p.rect(4, top + 4, 16, 2, YD).rect(6, top + 4, 12, 1, Y);                         // ala del casco
  p.rect(11, top + 1, 2, 3, YD).px(YL, [8, top + 2], [9, top + 1]);                  // nervio central y brillo
  // Llave inglesa en la pezuña derecha: boca abierta arriba y mango en diagonal
  const G = '#9aa0aa', GL = '#d8dde4';
  p.px(G, [21, 9 + o], [23, 9 + o], [22, 11 + o], [21, 12 + o], [20, 13 + o]).px(GL, [21, 10 + o], [22, 10 + o], [23, 10 + o]);
  p.px('#f2c4c4', [18, 14 + o], [19, 14 + o], [18, 15 + o]);                        // la pezuña que la sujeta
  return p.outline(INK);
}

// Sombrero de paja de ganchillo de Heladoncio (ala ancha, cordón marrón con lacito): misión opcional de la Isla Helada
function strawHat(p, cx, cy, s = 1) { // (cx, cy): centro de la base de la copa; s: tamaño
  const S = '#c9955c', SL = '#ddb07a', SD = '#a8743e', B = '#7a4a2a';
  p.ell(cx, cy + 0.6 * s, 8.6 * s, 1.9 * s, S);                                   // ala
  p.ell(cx, cy - 0.4 * s, 4.4 * s, 2.8 * s, SL).rect(cx - 4.4 * s, cy - 0.4 * s, 8.8 * s, 1, SL); // copa
  p.rect(cx - 4.2 * s, cy - 0.6 * s, 8.4 * s, Math.max(1, 0.7 * s), B);           // cordón
  p.px(B, [cx + 4.4 * s, cy + 0.3 * s], [cx + 5.2 * s, cy + 1.1 * s]);            // lacito
  for (let i = 0; i < 6; i++) p.px(SD, [cx - 7 * s + i * 2.6 * s, cy + 0.9 * s]); // calados del ganchillo
  p.px(SD, [cx - 2 * s, cy - 2 * s], [cx + 1 * s, cy - 2.6 * s], [cx + 2.4 * s, cy - 1.6 * s]);
}

function mold(c, k) {
  const p = new PX(16, 16);
  p.rect(0, 2, 16, 12, '#8a8f9a').rect(1, 3, 14, 10, '#c9ced8').rect(0, 12, 16, 2, '#6a6f7a');
  if (k === 'o') p.ell(8, 8, 3.6, 3.4, c);
  if (k === 'f') { for (let i = 0; i < 6; i++) p.rect(5 + (i >> 1), 5 + i, 6 - 2 * (i >> 1), 1, c); }
  if (k === 'p') p.ell(8, 9, 3, 2.6, c).ell(8, 6, 1.8, 2, c);
  if (k === 'b') banana(p, 3, 2, c);
  return p.outline(INK);
}
function station(col, deco) {
  const p = new PX(16, 16);
  p.rect(2, 3, 12, 12, col).rect(3, 1, 10, 3, col).rect(2, 13, 12, 2, 'rgba(0,0,0,0.15)');
  deco(p);
  return p.outline(INK);
}
// Pedestal para espejo: 0 vacío, 1 «/», 2 «\»
// fixed: espejo atornillado sobre una base de piedra (no se puede mover)
function stand(kind, fixed) {
  const p = new PX(16, 22);
  if (fixed) p.rect(2, 14, 12, 6, '#8a8f9a').rect(1, 19, 14, 2, '#6a6f7a').rect(4, 12, 8, 3, '#b9b9b0').px('#e8b820', [3, 16], [12, 16]);
  else p.rect(3, 15, 10, 5, '#8a5a2a').rect(2, 19, 12, 2, '#6e4520').rect(5, 12, 6, 3, '#a8743c');
  if (kind) {
    for (let i = 0; i < 11; i++) { const x = kind === 1 ? 13 - i : 2 + i; p.rect(x, 1 + i, 2, 2, '#d7eefb'); }
    for (let i = 2; i < 9; i += 3) { const x = kind === 1 ? 13 - i : 2 + i; p.px('#fff', [x, 1 + i]); }
  }
  return p.outline(INK);
}
function house(roof, roofD, wall, wallD, extra) {
  const p = new PX(48, 46);
  for (let y = 1; y < 22; y++) {
    const inset = Math.max(0, Math.round(9 - y * 0.75));
    p.rect(inset, y, 48 - inset * 2, 1, y % 4 === 0 ? roofD : roof);
  }
  p.rect(0, 21, 48, 2, roofD);
  p.rect(3, 23, 42, 22, wall).rect(3, 23, 42, 2, wallD).rect(3, 43, 42, 2, wallD);
  p.rect(19, 30, 10, 15, '#6e4520').rect(20, 31, 8, 14, '#8a5a2a').px('#f6c56b', [26, 38]);
  for (const x of [7, 33]) p.rect(x, 28, 8, 8, '#6e4520').rect(x + 1, 29, 6, 6, '#bfe3f7').rect(x + 4, 29, 1, 6, '#6e4520');
  extra && extra(p);
  return p.outline(INK);
}

const OBJ = {
  tree() {
    const p = new PX(20, 28);
    p.rect(8, 19, 4, 8, '#7a4f2a').rect(8, 19, 1, 8, '#5e3a1c');
    p.ell(10, 12, 9.5, 10, '#267a3f').ell(10, 10.5, 8.5, 8.5, '#2f8f4a').ell(7.5, 7.5, 4, 3, '#45a85c');
    p.px('#267a3f', [13, 12], [14, 13], [6, 14], [11, 16], [9, 4]);
    return p.outline('#1d4d2b');
  },
  rock() { return new PX(16, 14).ell(8, 8, 7, 5.5, '#8d8f98').ell(6, 6, 3.5, 2, '#a9abb3').outline(INK); },
  rubble() {
    const p = new PX(18, 18);
    p.ell(5, 12, 4, 4, '#7c7e87').ell(12, 12, 5, 4.5, '#8d8f98').ell(9, 7, 4.5, 4, '#9a9ca5').ell(8, 6, 2, 1.2, '#b4b6bd');
    return p.outline(INK);
  },
  mountain() {
    const p = new PX(64, 50);
    p.ell(32, 34, 31, 31, '#7c7e87').ell(30, 30, 27, 25, '#8d8f98').ell(24, 18, 13, 8, '#a3a5ad');
    for (let x = 0; x < 64; x++) p.rect(x, 48, 1, 2, null);
    p.ell(40, 42, 7.5, 9, '#3b3d45').ell(40, 43, 6, 8, '#14151a').rect(32, 48, 16, 2, null);
    p.px('#6a6c75', [12, 30], [13, 31], [50, 22], [51, 23], [20, 40], [54, 36]);
    return p.outline(INK);
  },
  house_cait: () => house('#e2574c', '#b83b33', '#fff1cf', '#e8d5a6', (p) => {
    p.rect(34, 2, 6, 9, '#b83b33').rect(34, 2, 6, 2, '#8f2a25');
    p.rect(21, 24, 6, 4, '#ffe066').px('#e2574c', [22, 25], [24, 25], [23, 26]);
  }),
  house_lolete: () => house('#8a5a2a', '#6e4520', '#f3e3b6', '#dcc890', (p) => {
    p.rect(36, 38, 9, 7, '#c98f4e').rect(36, 41, 9, 1, '#e8d09a').rect(38, 32, 7, 6, '#c98f4e').rect(38, 34, 7, 1, '#e8d09a');
  }),
  house_fuxia: () => house('#d6409f', '#a82a7a', '#fde8f3', '#f0c4dc', (p) => {
    p.px(INK, [39, 6], [39, 5], [39, 4], [40, 4], [41, 5]).ell(38, 7.5, 1.6, 1.4, INK);
  }),
  hall() { // pabellón principal del templo, dos tejados
    const p = new PX(80, 64), G = '#2f6b5a', GL = '#4a8f7a', R = '#b83b33', RD = '#8f2a25', Y = '#e8b820';
    p.rect(24, 3, 32, 5, G).rect(22, 7, 36, 2, GL).rect(30, 1, 20, 2, Y).px(G, [20, 6], [21, 6], [58, 6], [59, 6], [19, 5], [60, 5]);
    p.rect(26, 9, 28, 8, R).rect(30, 11, 6, 4, Y).rect(44, 11, 6, 4, Y).rect(37, 10, 6, 6, '#2a4fa0').px(Y, [39, 12], [40, 13], [39, 14]);
    p.rect(4, 17, 72, 6, G).rect(2, 22, 76, 2, GL).rect(2, 24, 76, 1, Y).px(G, [1, 20], [2, 20], [3, 19], [0, 19], [78, 20], [77, 20], [76, 19], [79, 19], [0, 18], [79, 18]);
    for (let x = 6; x < 76; x += 4) p.rect(x, 18, 2, 4, GL);
    p.rect(8, 25, 64, 35, R).rect(8, 25, 64, 2, RD);
    for (const x of [8, 24, 53, 69]) p.rect(x, 25, 3, 35, RD);
    p.rect(33, 34, 14, 26, '#3b2a20').rect(39, 34, 2, 26, '#231a14').px(Y, [36, 46], [43, 46], [36, 40], [43, 40], [36, 52], [43, 52]);
    p.rect(34, 28, 12, 5, '#2a4fa0').px(Y, [36, 30], [38, 29], [40, 31], [42, 30], [43, 29]);
    for (const x of [14, 59]) p.rect(x, 30, 7, 9, '#f3e3b6').rect(x + 3, 30, 1, 9, RD).rect(x, 34, 7, 1, RD);
    for (const x of [18, 61]) p.px(INK, [x, 25], [x, 26]).ell(x + 0.5, 29, 2, 2.4, '#e2574c').px(Y, [x, 32]);
    p.rect(4, 60, 72, 3, '#b9b9b0').rect(4, 62, 72, 1, '#8a8a80');
    return p.outline(INK);
  },
  paifang() { // puerta ceremonial china
    const p = new PX(48, 44), G = '#2f6b5a', GL = '#4a8f7a', R = '#c8402c', Y = '#e8b820';
    p.rect(6, 12, 4, 29, R).rect(38, 12, 4, 29, R).rect(5, 39, 6, 4, '#8a8a80').rect(37, 39, 6, 4, '#8a8a80');
    p.rect(14, 1, 20, 4, G).rect(12, 4, 24, 1, GL).rect(18, 5, 12, 2, R);
    p.rect(1, 7, 46, 4, G).rect(0, 10, 48, 1, GL).rect(0, 11, 48, 1, Y).px(G, [0, 6], [47, 6], [0, 5], [47, 5], [1, 6], [46, 6]);
    for (let x = 3; x < 46; x += 4) p.rect(x, 8, 2, 2, GL);
    p.rect(4, 12, 40, 3, R).rect(17, 15, 14, 6, '#2a4fa0').px(Y, [20, 17], [22, 18], [24, 17], [26, 18], [28, 17]);
    return p.outline(INK);
  },
  censer() { // incensario de bronce
    const p = new PX(14, 20);
    p.rect(4, 9, 6, 2, '#8a6a2c').ell(7, 13, 5.5, 3.6, '#b08a3c').rect(3, 12, 8, 1, '#d0aa58').rect(3, 16, 2, 3, '#8a6a2c').rect(9, 16, 2, 3, '#8a6a2c');
    p.outline(INK);
    return p.px('#e4e4e4', [7, 1], [6, 3], [8, 5], [7, 7]);
  },
  biang() { // restaurante de fideos Biang Biang
    const p = new PX(64, 50), G = '#3d4a52', GL = '#566671', R = '#c8402c', Y = '#e8b820';
    p.rect(2, 4, 60, 9, G).rect(0, 12, 64, 2, GL).rect(0, 14, 64, 1, R).px(G, [0, 10], [1, 10], [62, 10], [63, 10], [0, 9], [63, 9]);
    for (let x = 4; x < 60; x += 4) p.rect(x, 5, 2, 6, GL);
    p.rect(3, 15, 58, 34, '#f3e3b6').rect(3, 47, 58, 2, '#dcc890').rect(3, 15, 3, 34, R).rect(58, 15, 3, 34, R);
    p.rect(17, 16, 30, 9, '#231a14').rect(18, 17, 28, 7, '#3b2a20');
    for (const x of [21, 27, 34, 40]) p.px(Y, [x, 18], [x + 1, 18], [x + 2, 18], [x + 1, 19], [x, 20], [x + 2, 20], [x + 1, 21], [x, 22], [x + 2, 22], [x + 3, 20]);
    p.rect(18, 28, 12, 21, '#6e4520').rect(19, 29, 10, 20, '#3b2a20').rect(18, 28, 12, 6, R).px('#fff', [20, 30], [23, 31], [26, 30]).rect(23, 28, 1, 6, '#8f2a25');
    p.rect(36, 29, 20, 13, '#6e4520').rect(37, 30, 18, 11, '#ffe9b8').ell(46, 37, 6, 3, '#fff').rect(40, 35, 12, 2, '#fff').rect(41, 34, 10, 2, '#f0c060').px('#d94a3a', [43, 34], [47, 35], [49, 34]).px('#b8b8b8', [44, 31], [45, 32], [48, 31]);
    for (const x of [9, 54]) p.px(INK, [x, 15], [x, 16]).ell(x + 0.5, 20, 2.6, 3, '#e2574c').rect(x - 1, 23, 3, 1, Y).px(Y, [x, 24], [x, 25]);
    return p.outline(INK);
  },
  gym() { // Fitness Bartory
    const p = new PX(64, 48), O = '#f08a24';
    p.rect(1, 2, 62, 45, '#3a3d46').rect(1, 2, 62, 3, '#565a66').rect(1, 44, 62, 3, '#2b2d34');
    p.rect(1, 8, 62, 11, O).rect(1, 8, 62, 1, '#ffb45a').rect(1, 18, 62, 1, '#c96a10');
    p.rect(26, 13, 12, 2, INK).rect(23, 10, 3, 8, INK).rect(38, 10, 3, 8, INK).rect(21, 12, 2, 4, INK).rect(41, 12, 2, 4, INK);
    // Logo «FB» (Fitness Bartory) a cada lado de la mancuerna
    for (const x of [6, 50]) p.px('#fff', [x, 11], [x + 1, 11], [x + 2, 11], [x, 12], [x, 13], [x + 1, 13], [x, 14], [x, 15]); // F
    for (const x of [11, 55]) p.px('#fff', [x, 11], [x + 1, 11], [x, 12], [x + 2, 12], [x, 13], [x + 1, 13], [x, 14], [x + 2, 14], [x, 15], [x + 1, 15]); // B
    p.rect(17, 25, 14, 22, '#6a7a86').rect(18, 26, 6, 21, '#a9d6ee').rect(25, 26, 5, 21, '#a9d6ee');
    p.rect(36, 25, 22, 13, '#6a7a86').rect(37, 26, 20, 11, '#a9d6ee').rect(39, 28, 16, 1, INK).px(INK, [42, 29], [42, 30], [51, 29], [51, 30]).ell(42.5, 32.5, 2, 2.4, '#d8bb82').ell(51.5, 32.5, 2, 2.4, '#f7a8c0');
    p.rect(4, 25, 9, 13, '#ffe066').rect(6, 27, 5, 1, INK).rect(6, 30, 5, 1, INK).rect(6, 33, 3, 1, '#e2574c');
    return p.outline(INK);
  },
  house_a: () => house('#3f6fd0', '#2a4fa0', '#f4f4ee', '#d9d9d0'),
  house_b: () => house('#3f8f6b', '#2a6b4e', '#fff1cf', '#e8d5a6'),
  house_c: () => house('#e0a82e', '#b8861c', '#fde8d0', '#ecc9a6'),
  house_law: () => house('#8a5fc0', '#6b3fa0', '#f0e8fb', '#d6c8ec', (p) => { // la abogada: placa dorada junto a la puerta
    p.rect(30, 34, 3, 4, '#e8b820').px('#3b2a20', [31, 35], [31, 36]);
  }),
  // ---- Calcetines: cinco diseños, dos calcetines de cada uno
  sock_0: () => sockArt('#3f8f6b', 0), sock_1: () => sockArt('#e2574c', 1), sock_2: () => sockArt('#3f6fd0', 2), sock_3: () => sockArt('#e8a820', 3), sock_4: () => sockArt('#b06ad8', 4),
  sock_5: () => sockArt('#f08a24', 0, true), sock_6: () => sockArt('#f06aa8', 1, true), sock_7: () => sockArt('#2fb8b0', 2, true), sock_8: () => sockArt('#8a8f9a', 3, true), sock_9: () => sockArt('#2b2b33', 4, true),
  sock_10: () => sockArt('#b88ad8', 1, true), sock_11: () => sockArt('#8f2a3a', 0, true),
  // ---- Apartamento de las Ratitas
  gem_r: () => gemArt('#e2574c', '#f7a8a0'), gem_b: () => gemArt('#3f6fd0', '#9fc0f7'), gem_y: () => gemArt('#e8b820', '#fff0a0'), gem_g: () => gemArt('#3f9f4f', '#a8e8a0'),
  cup() { return new PX(8, 8).rect(1, 2, 5, 5, '#f4f4ee').rect(1, 2, 5, 1, '#6e4520').px('#f4f4ee', [6, 3], [7, 4], [6, 5]).px('#3f8fd8', [2, 4], [4, 5]).outline(INK); },
  cushion() { return new PX(11, 9).ell(5.5, 4.5, 4.6, 3.4, '#f06aa8').px('#f7a8c0', [3, 3], [4, 2]).px('#c8407c', [5, 4], [6, 5]).outline(INK); },
  // Cuadros de Ratencio the Rat en la pared del salón de las ratitas (en grande: assets/cuadros/ratencio*.png)
  ratencio_1() { // sentado, mirando un limón, sobre fondo lila
    const p = new PX(16, 20).rect(0, 0, 16, 20, '#8a5a2a').rect(1, 1, 14, 18, '#7a78d0').rect(1, 1, 14, 1, '#e8b820');
    p.ell(7, 13, 4.2, 3.6, '#8a6a46').ell(7, 14.4, 3, 2.1, '#b08f62');                          // cuerpo y barriga
    p.ell(8.5, 8, 2.6, 2.2, '#7a5a3a').ell(6.3, 6.8, 1.1, 1.1, '#4a3626').px('#7a5a3a', [9, 5], [10, 5]); // cabeza, oreja y tupé
    p.px('#ffffff', [8, 7], [9, 7]).px('#1a1412', [9, 7]).ell(11.2, 8.7, 1, 0.9, '#1a1412');      // ojo y nariz
    p.px('#f0a8b0', [6, 12], [5, 17], [9, 17], [4, 17], [3, 18], [5, 18], [6, 18], [7, 18], [8, 18]); // mano, patas y cola
    p.ell(13, 16.2, 1.3, 0.9, '#ffe066').px('#5aa648', [14, 15]);                              // el limón
    return p.outline(INK);
  },
  ratencio_2() { // de chef, con su espátula, sobre fondo naranja
    const p = new PX(16, 20).rect(0, 0, 16, 20, '#8a5a2a').rect(1, 1, 14, 18, '#f59a4a').rect(1, 1, 14, 1, '#e8b820');
    p.ell(7, 13.6, 4.2, 3.4, '#fbf6ea').px('#9a9a92', [8, 12], [8, 14]).px('#6e4a30', [5, 17], [9, 17]); // chaqueta y patas
    p.ell(8, 8.4, 2.4, 2, '#6e4a30').px('#ffffff', [7, 8], [8, 8]).px('#1a1412', [8, 8]).ell(10.4, 9.2, 0.9, 0.8, '#1a1412');
    p.ell(7.5, 3.6, 2.8, 1.6, '#ffffff').rect(5, 4, 5, 2, '#ffffff').rect(6, 6, 4, 1, '#e8e2d6'); // gorro de chef
    p.line(12, 9, 12, 14, '#9aa0aa').rect(11, 7, 3, 2, '#c9ced8').px('#f0a8b0', [12, 13], [3, 18], [4, 18], [5, 18]); // espátula y cola
    return p.outline(INK);
  },
  frame() { return new PX(12, 11).rect(1, 1, 10, 9, '#8a5a2a').rect(2, 2, 8, 7, '#bfe3f7').rect(2, 6, 8, 3, '#82cc6a').px('#ffe066', [8, 3]).outline(INK); },
  ...Object.fromEntries(['#e2574c', '#3f9f4f', '#3f6fd0', '#e8b820', '#f06aa8'].flatMap((c, i) => [[`lamp_${i}_on`, () => lampArt(c, true)], [`lamp_${i}_off`, () => lampArt(c, false)]])),
  kai_sleep() {
    const p = new PX(20, 13);
    p.ell(10, 8, 8, 4.4, '#22222a').px('#22222a', [4, 3], [5, 3], [4, 4], [7, 3], [8, 3], [8, 4]).px('#6a6a78', [5, 7], [6, 7], [8, 7], [9, 7]).px('#3a3a46', [14, 6], [15, 7], [16, 8]);
    p.outline('#55556a');
    return p.px('#fff', [15, 0], [16, 0], [16, 1], [15, 2], [16, 2]);
  },
  cheese_1: () => cheese(8, 6),
  cheese_2: () => cheese(10, 8),
  cheese_3: () => cheese(12, 9),
  cheese_4: () => cheese(14, 11),
  cheese_5: () => cheese(17, 13),
  butter() { return new PX(8, 7).rect(1, 2, 6, 4, '#fff6c0').rect(1, 2, 6, 1, '#ffffff').rect(3, 2, 2, 4, '#9fd0ee').outline(INK); },
  quesito() { return new PX(7, 6).rect(1, 2, 5, 3, '#ffd23f').px('#ffd23f', [2, 1], [3, 1]).px('#e0a82e', [2, 3], [4, 2]).outline(INK); },
  tv() {
    const p = new PX(32, 28);
    p.line(12, 0, 15, 4, INK).line(20, 0, 17, 4, INK).rect(3, 5, 26, 17, '#3a3d46').rect(5, 7, 18, 13, '#14151a').rect(6, 8, 16, 11, '#2a3a5a').px('#6fb4ee', [8, 10], [9, 11], [10, 10]);
    p.px('#e2574c', [26, 9]).px('#ffe066', [26, 12]).rect(25, 15, 3, 1, '#8a8f9a').rect(6, 22, 3, 5, '#6e4520').rect(23, 22, 3, 5, '#6e4520');
    return p.outline(INK);
  },
  fridge() {
    const p = new PX(16, 32);
    p.rect(1, 1, 14, 30, '#f4f4ee').rect(1, 11, 14, 1, '#b0b0a8').rect(12, 4, 1, 5, '#8a8f9a').rect(12, 14, 1, 8, '#8a8f9a').rect(1, 29, 14, 2, '#c9c9c0');
    p.px('#e2574c', [3, 15], [4, 15]).px('#3f8fd8', [6, 17], [7, 17]).px('#3f8f6b', [3, 20], [4, 20]).px('#f08a24', [8, 14], [9, 14]).px('#8a5fc0', [6, 22], [7, 22]).px('#ffd23f', [9, 19], [9, 20]);
    return p.outline(INK);
  },
  sofa: () => sofa('#c8402c', '#e2574c', '#b83b33'),
  sofa_cait: () => sofa('#7d8ca6', '#93a3bc', '#6f7e98'), // sofá azul de Cait (#93A3BC): la fiesta
  // Casa de Cait, según las fotos: sofá largo gris azulado con cojines de rombos y una manta beige por encima
  sofa_cait2() {
    const p = new PX(48, 22), BK = '#6f8590', ST = '#86a0ab', AR = '#62767f';
    p.rect(1, 1, 46, 11, BK).rect(1, 9, 46, 9, ST).rect(1, 6, 4, 12, AR).rect(43, 6, 4, 12, AR).rect(23, 9, 1, 9, AR);
    p.rect(1, 9, 46, 1, '#9db5bf').rect(3, 18, 2, 3, '#4a3626').rect(43, 18, 2, 3, '#4a3626');
    for (const x of [9, 16]) { // cojines de gatolleta (los de rombos negro y beige del sofá real)
      p.rect(x, 4, 6, 6, '#2b2826');
      for (let k = 0; k < 6; k++) p.px('#d8c8a8', [x + k, 4 + k], [x + 5 - k, 4 + k]);
    }
    p.rect(33, 5, 7, 5, '#7a919c').px('#9db5bf', [34, 5], [35, 5]);                       // cojín liso
    p.rect(36, 8, 9, 10, '#c9a77c').rect(36, 8, 9, 1, '#dcc09a').rect(38, 18, 6, 2, '#c9a77c').px('#b08e66', [38, 11], [41, 13], [39, 15]); // manta
    return p.outline(INK);
  },
  coffee_cait() { // mesa de centro oscura (wengué) con los mandos encima
    const p = new PX(30, 16);
    p.rect(1, 3, 28, 4, '#3a2c26').rect(1, 3, 28, 1, '#4e3d35').rect(2, 7, 3, 8, '#2c211c').rect(25, 7, 3, 8, '#2c211c').rect(5, 11, 20, 2, '#2c211c');
    p.rect(8, 4, 5, 1, '#14151a').rect(15, 4, 4, 1, '#14151a').px('#e2574c', [20, 4]);
    return p.outline(INK);
  },
  tvunit_cait() { // mueble blanco bajo de cubos con la tele plana negra encima
    const p = new PX(34, 34);
    p.rect(1, 22, 32, 11, '#f4f2ec').rect(1, 22, 32, 1, '#ffffff');
    for (const x of [3, 11, 19, 27]) p.rect(x, 24, 6, 8, '#d9d4c8');
    p.rect(4, 28, 4, 4, '#2b2826').rect(12, 27, 4, 5, '#f7a8c0').rect(13, 26, 2, 1, '#f7a8c0').rect(20, 27, 5, 5, '#ffd23f').rect(28, 29, 4, 3, '#3f8fd8'); // consola, peluches y juegos
    p.rect(3, 2, 28, 16, '#14151a').rect(4, 3, 26, 14, '#20232c').px('#3a4050', [6, 5], [7, 5], [6, 6]).rect(15, 18, 4, 2, '#14151a').rect(12, 20, 10, 1, '#14151a');
    return p.outline(INK);
  },
  kallax_cait() { // estantería alta blanca de cubos llena de peluches, con el mono colgado arriba
    const p = new PX(20, 44);
    p.rect(1, 6, 18, 37, '#f4f2ec');
    for (let r = 0; r < 4; r++) for (const x of [2, 10]) p.rect(x, 8 + r * 9, 7, 7, '#d9d4c8');
    const P = ['#f7a8c0', '#ffd23f', '#e8c08a', '#c8a2e0', '#f0a070', '#8fd070', '#ffffff', '#e2574c'];
    for (let r = 0; r < 4; r++) for (const [i, x] of [[0, 3], [1, 11]]) { const c = P[(r * 2 + i) % P.length]; p.ell(x + 2.5, 12 + r * 9, 2.6, 2.2, c).px('#1a1412', [x + 1, 11 + r * 9], [x + 3, 11 + r * 9]); }
    p.ell(6, 3, 2.2, 2, '#8a5a2a').ell(6, 3.4, 1.2, 1, '#e8c08a').line(4, 5, 3, 9, '#8a5a2a').line(8, 5, 10, 8, '#8a5a2a'); // el mono
    p.rect(13, 1, 3, 5, '#14151a').rect(14, 0, 1, 1, '#c9a77c');                                  // botella negra (como en las fotos)
    return p.outline(INK);
  },
  window_cait() { // ventanal a la terraza: toldo de rayas, árboles y plantas
    const p = new PX(36, 30);
    p.rect(0, 0, 36, 30, '#d8d0bf').rect(2, 2, 32, 26, '#bfe3f7');
    p.ell(9, 13, 7, 6, '#7fb069').ell(26, 11, 8, 7, '#8fc070').rect(2, 18, 32, 10, '#c9b8a0').rect(2, 18, 32, 2, '#5a7d8a');
    for (const x of [5, 12, 21, 28]) p.ell(x, 20, 2.4, 2.2, '#3f9f4f').rect(x - 2, 22, 4, 3, '#b06030');
    p.px('#f06aa8', [12, 19], [28, 19]).px('#ffd23f', [5, 19]);
    for (const x of [8, 31]) p.px('#ffffff', [x, 15], [x - 1, 16], [x + 1, 16], [x, 17]).px('#e8f4ff', [x, 16]).line(x, 18, x, 19, '#9aa0aa'); // molinillos que reflejan
    for (let x = 2; x < 34; x += 4) p.rect(x, 2, 2, 3, '#3a4a5a').rect(x + 2, 2, 2, 3, '#f2ede2');   // toldo
    p.rect(17, 2, 2, 26, '#d8d0bf');                                                               // marco central
    return p.outline(INK);
  },
  floorlamp_cait() { // lámpara de pie negra con la luz encendida
    const p = new PX(12, 34);
    p.ell(6, 4, 4.5, 3, '#fff3c0').ell(6, 4, 3, 2, '#ffffff').rect(5, 6, 2, 26, '#2b2826').rect(2, 31, 8, 2, '#2b2826');
    return p.outline(INK);
  },
  floorlamp_cait_off() { // la misma, apagada
    const p = new PX(12, 34);
    p.ell(6, 4, 4.5, 3, '#c9c2a8').ell(6, 4, 3, 2, '#d8d2bc').rect(5, 6, 2, 26, '#2b2826').rect(2, 31, 8, 2, '#2b2826');
    return p.outline(INK);
  },
  // Cuadros de la pared de Cait, en el mismo orden que los originales
  cuadro1: () => cuadro(1), cuadro2: () => cuadro(2), cuadro3: () => cuadro(3),
  stand: () => stand(0),
  mirror_a: () => stand(1),
  mirror_b: () => stand(2),
  hatch() {
    const p = new PX(16, 16);
    p.ell(8, 8, 7, 6.5, '#8a8f9a').ell(8, 8, 5.5, 5, '#6a6f7a').rect(3, 7, 10, 1, '#8a8f9a').rect(7, 3, 1, 10, '#8a8f9a').rect(6, 6, 4, 4, '#e8b820').px(INK, [7, 8], [8, 8], [7, 7]);
    return p.outline(INK);
  },
  hatch_open() { return new PX(16, 16).ell(8, 8, 7, 6.5, '#8a8f9a').ell(8, 8, 5.5, 5, '#0c0c10').px('#8a5a2a', [6, 5], [6, 7], [6, 9], [9, 5], [9, 7], [9, 9], [7, 6], [8, 6], [7, 8], [8, 8]).outline(INK); },
  grate_shut() { // la rejilla del techo, con la trampilla cerrada: no entra luz
    const p = new PX(12, 10);
    p.rect(0, 0, 12, 10, '#3a3d46').rect(1, 1, 10, 8, '#5a5e6a');
    for (let x = 3; x < 11; x += 3) p.rect(x, 1, 1, 8, '#3a3d46');
    return p.px('#8a8f9a', [10, 5]);
  },
  grate() {
    const p = new PX(12, 10);
    p.rect(0, 0, 12, 10, '#3a3d46').rect(1, 1, 10, 8, '#fff6b0');
    for (let x = 3; x < 11; x += 3) p.rect(x, 1, 1, 8, '#3a3d46');
    return p;
  },
  note() { return new PX(10, 11).rect(1, 1, 8, 9, '#fff6dc').rect(2, 3, 6, 1, '#6e4520').rect(2, 5, 5, 1, '#6e4520').rect(2, 7, 6, 1, '#6e4520').px('#e2574c', [5, 1]).outline(INK); },
  // ---- Kapadokya
  chimney() { // chimenea de hadas: cono de roca clara con su sombrero más oscuro y una casita excavada
    const p = new PX(24, 40), R = '#ecd9b0', RD = '#d8bf90', C = '#b08a60';
    for (let y = 12; y < 39; y++) { const w = 5 + (y - 12) * 0.36; p.rect(12 - w, y, 2 * w, 1, y % 7 === 0 ? RD : R); }
    for (let y = 0; y < 13; y++) { const w = 1 + y * 0.75; p.rect(12 - w, y, 2 * w, 1, y > 10 ? '#8f6c46' : C); }
    p.rect(10, 28, 4, 7, '#5e3a1c').rect(11, 27, 2, 1, '#5e3a1c').rect(7, 20, 2, 3, '#5e3a1c').rect(15, 22, 2, 3, '#5e3a1c').px('#f7c8b0', [5, 30], [18, 33], [8, 36]);
    return p.outline(INK);
  },
  balloon() { // globo aerostático de Kapadokya (paisaje)
    const p = new PX(18, 26);
    p.ell(9, 8, 8, 8, '#e2574c').rect(5, 1, 3, 15, '#ffe066').rect(11, 1, 3, 15, '#3f8fd8');
    for (let y = 0; y < 26; y++) for (let x = 0; x < 18; x++) if (y < 17 && ((x + 0.5 - 9) / 8) ** 2 + ((y + 0.5 - 8) / 8) ** 2 > 1) p.set(x, y, null);
    p.line(4, 15, 7, 21, INK).line(13, 15, 10, 21, INK).rect(6, 21, 6, 4, '#8a5a2a').rect(6, 21, 6, 1, '#c98f4e');
    return p.outline(INK);
  },
  // Globos de fiesta de los awawas (premio de Kapadokya y decoración de la fiesta)
  party_balloons() { // ramillete de tres globos atados con un lazo
    const p = new PX(20, 28);
    partyBalloon(p, 5, 6, '#e2574c'); partyBalloon(p, 15, 6, '#4a90d8'); partyBalloon(p, 10, 9, '#ffd23f');
    p.outline(INK);
    p.line(5, 13, 10, 23, STRING).line(15, 13, 10, 23, STRING).line(10, 16, 10, 26, STRING);
    return p.px('#f06aa8', [8, 22], [9, 23], [11, 23], [12, 22], [8, 24], [12, 24], [10, 23]); // lazo
  },
  war_table() { // mesa de guerra de los Owitos de la Inquisición: mapa, figuritas y velas
    const p = new PX(48, 32), W = '#8a5a2a', WD = '#6e4520';
    p.rect(3, 22, 3, 10, WD).rect(42, 22, 3, 10, WD).rect(1, 6, 46, 17, W).rect(1, 20, 46, 3, WD).rect(1, 6, 46, 1, '#a8743c');
    p.rect(5, 8, 38, 12, '#e8d5a0').ell(16, 13, 9, 4, '#9fc86a').ell(31, 12, 8, 4, '#c9a86a').ell(36, 16, 5, 2.4, '#9fc86a').rect(23, 9, 2, 10, '#6fb4ee');
    p.px('#3a2a20', [12, 11], [18, 15], [29, 10], [34, 14], [20, 10]).px('#e2574c', [12, 10], [29, 9]).px('#3f6fd0', [18, 14], [34, 13]).px('#e8b820', [20, 9]);
    for (const x of [2, 44]) p.rect(x, 2, 2, 5, '#fff3dc').px('#ffd23f', [x, 1], [x + 1, 0]);
    return p.outline(INK);
  },
  straw_hat() { const p = new PX(20, 12); strawHat(p, 10, 7); return p.outline(INK); },
  clon_fix_0: () => clonFix(0),
  clon_fix_1: () => clonFix(-1),
  pballoon_r: () => balloonSingle('#e2574c'),
  pballoon_y: () => balloonSingle('#ffd23f'),
  pballoon_b: () => balloonSingle('#4a90d8'),
  pballoon_p: () => balloonSingle('#f06aa8'),
  pballoon_g: () => balloonSingle('#5aa648'),
  burrow() { return new PX(22, 10).ell(11, 5, 10.5, 4.5, '#b08a60').ell(11, 5, 8.5, 3.2, '#2b1a10'); },
  burrow_front() { const p = new PX(22, 6); p.ell(11, 0, 10.5, 4.5, '#b08a60').ell(11, -1, 8.5, 3.2, null); return p; },
  // ---- Paella de Perrunfli
  paellera() {
    const p = new PX(36, 16);
    p.rect(0, 7, 4, 2, '#565a66').rect(32, 7, 4, 2, '#565a66').ell(18, 8, 15, 6.5, '#3a3d46').ell(18, 7.5, 13, 5, '#6a6f7a').ell(18, 7.5, 11.5, 4, '#8a8f9a').px('#c9ced8', [10, 6], [11, 5], [12, 5]);
    return p.outline(INK);
  },
  saco() {
    const p = new PX(13, 15);
    p.ell(6.5, 9, 5.5, 5.5, '#e8d5a6').rect(4, 2, 5, 3, '#e8d5a6').rect(4, 4, 5, 1, '#8a5a2a').px('#fff', [5, 8], [7, 9], [6, 11], [8, 7], [4, 10]).px('#cdb98a', [9, 12], [3, 12]);
    return p.outline(INK);
  },
  // ---- Castillo de Mazapán
  statue_1: () => statue(1), statue_2: () => statue(2), statue_3: () => statue(3), statue_4: () => statue(4), statue_5: () => statue(5),
  stall() {
    const p = new PX(34, 30);
    p.rect(2, 12, 2, 17, '#8a5a2a').rect(30, 12, 2, 17, '#8a5a2a').rect(1, 18, 32, 9, '#c98f4e').rect(1, 25, 32, 2, '#8a5a2a');
    for (let x = 0; x < 34; x += 6) p.rect(x, 3, 6, 8, (x / 6) % 2 ? '#f7a8c0' : '#fff').ell(x + 3, 11, 3, 1.6, (x / 6) % 2 ? '#f7a8c0' : '#fff');
    p.rect(0, 2, 34, 2, '#c8407c');
    for (const [x, c] of [[6, '#f08a24'], [12, '#e2574c'], [18, '#9fc86a'], [24, '#ffd23f'], [28, '#f08a24']]) p.ell(x, 16.5, 2.2, 2.2, c).px('#3f9f4f', [x, 14]);
    return p.outline(INK);
  },
  stall_taiyaki() { // puesto de taiyakis: toldo azul marino, cartel con un pez y taiyakis humeantes en el mostrador
    const p = new PX(34, 30);
    p.rect(2, 12, 2, 17, '#6e4520').rect(30, 12, 2, 17, '#6e4520').rect(1, 18, 32, 9, '#a8743c').rect(1, 25, 32, 2, '#6e4520');
    for (let x = 0; x < 34; x += 6) p.rect(x, 3, 6, 8, (x / 6) % 2 ? '#2a3f6e' : '#f4f4ee').ell(x + 3, 11, 3, 1.6, (x / 6) % 2 ? '#2a3f6e' : '#f4f4ee');
    p.rect(0, 2, 34, 2, '#1a2a4a').rect(12, 0, 10, 4, '#f4f4ee').ell(16, 2, 3, 1.4, '#d8963a').px('#d8963a', [20, 1], [20, 3], [19, 2]);
    for (const x of [7, 14, 21, 27]) p.ell(x, 16.5, 2.6, 1.8, '#d8963a').px('#b06a20', [x - 1, 16]).px('#d8963a', [x + 3, 15], [x + 3, 17]);
    p.px('#ffffff', [8, 13], [9, 12], [22, 13], [21, 12]);
    return p.outline(INK);
  },
  stall_mochi() { // puesto de mochis: toldo rosa y blanco, bandejas de mochis de colores
    const p = new PX(34, 30);
    p.rect(2, 12, 2, 17, '#8a5a2a').rect(30, 12, 2, 17, '#8a5a2a').rect(1, 18, 32, 9, '#f4e6d0').rect(1, 25, 32, 2, '#c9a77c');
    for (let x = 0; x < 34; x += 6) p.rect(x, 3, 6, 8, (x / 6) % 2 ? '#f7a8c0' : '#ffffff').ell(x + 3, 11, 3, 1.6, (x / 6) % 2 ? '#f7a8c0' : '#ffffff');
    p.rect(0, 2, 34, 2, '#e5869f');
    const M = ['#f7a8c0', '#9fc86a', '#fff6ea', '#c8a2e0', '#f7a8c0', '#9fc86a'];
    M.forEach((c, i) => p.ell(5 + i * 5, 16.5, 2.2, 2, c).px('#ffffff', [4 + i * 5, 15]));
    return p.outline(INK);
  },
  comics() { // tienda de mangas «Doki Doki Manga»: tejadillo, cartel con bocadillo y corazón, escaparate lleno y puerta
    const p = new PX(48, 42);
    p.rect(1, 12, 46, 29, '#6f8fbf').rect(1, 38, 46, 3, '#4a6a9a').rect(0, 8, 48, 5, '#2a3f6e').rect(0, 12, 48, 1, '#1a2a4a');
    for (let x = 1; x < 47; x += 4) p.rect(x, 13, 2, 2, '#f06aa8');                                      // flecos del toldo
    p.ell(24, 4.5, 15, 4.2, '#ffffff').rect(10, 1, 28, 7, '#ffffff').px('#ffffff', [14, 9], [15, 10]);   // bocadillo
    p.rect(13, 3, 13, 1, '#e2574c').rect(13, 5, 9, 1, '#2b2320').ell(32, 4.4, 2.4, 2, '#f06aa8').px('#f06aa8', [31, 7], [32, 7], [33, 7], [32, 8]); // texto y corazón
    p.rect(4, 18, 26, 16, '#bfe3f7').rect(4, 18, 26, 1, '#e8f4ff').rect(16, 18, 1, 16, '#9ab8d0');     // escaparate
    const C = ['#e2574c', '#ffd23f', '#3f8fd8', '#82cc6a', '#f06aa8', '#c8a2e0', '#f08a24', '#3f8fd8'];
    C.forEach((c, i) => p.rect(5 + i * 3 + (i > 3 ? 2 : 0), 22 + (i % 2) * 2, 2, 8 - (i % 2) * 2, c));
    p.rect(19, 30, 10, 3, '#8a5a2a').px('#ffd23f', [21, 29], [24, 29], [27, 29]);                     // figuritas en una balda
    p.rect(34, 18, 10, 23, '#8a5a2a').rect(35, 19, 8, 21, '#a8743c').px('#ffd23f', [41, 29]).rect(36, 21, 6, 6, '#bfe3f7'); // puerta con ventanuco
    return p.outline(INK);
  },
  bench() { return new PX(22, 12).rect(1, 2, 20, 3, '#a8743c').rect(1, 6, 20, 2, '#c98f4e').rect(3, 8, 2, 3, '#6e4520').rect(17, 8, 2, 3, '#6e4520').rect(1, 1, 20, 1, '#c98f4e').outline(INK); },
  easel() {
    const p = new PX(16, 24);
    p.line(3, 23, 7, 4, '#8a5a2a').line(13, 23, 9, 4, '#8a5a2a').rect(2, 4, 12, 12, '#fff6dc').rect(3, 5, 10, 10, '#bfe3f7').ell(8, 11, 3.5, 3, '#d9c3a0').rect(6, 6, 5, 2, '#e8b820').px(BLACK, [7, 10], [9, 10]).rect(2, 16, 12, 1, '#8a5a2a');
    return p.outline(INK);
  },
  throne() { // trono del Rey Peludito: respaldo de terciopelo rojo con marco dorado y remate de corona
    const p = new PX(34, 44), G = '#e8b820', GD = '#c98f1e', GL = '#ffe27a', R = '#c8202c', RD = '#8f1520', RL = '#e2574c';
    p.rect(6, 6, 22, 28, G).rect(8, 8, 18, 25, R).rect(10, 10, 14, 21, RD).rect(8, 8, 18, 1, RL);
    p.px(GL, [12, 14], [21, 14], [17, 19], [12, 25], [21, 25]).px(G, [12, 13], [21, 13], [17, 18], [12, 24], [21, 24]);
    // remate en forma de corona
    p.rect(6, 4, 22, 2, G).px(G, [6, 3], [6, 2], [11, 3], [17, 3], [17, 2], [17, 1], [16, 2], [18, 2], [23, 3], [27, 3], [27, 2]).px(R, [17, 2]).px(GL, [6, 2], [27, 2], [17, 0]);
    // reposabrazos, asiento y base
    p.rect(1, 25, 7, 4, G).rect(26, 25, 7, 4, G).rect(1, 25, 7, 1, GL).rect(26, 25, 7, 1, GL).rect(2, 29, 3, 8, GD).rect(29, 29, 3, 8, GD);
    p.rect(5, 31, 24, 5, R).rect(5, 31, 24, 1, RL).rect(5, 35, 24, 1, RD);
    p.rect(3, 36, 28, 5, G).rect(3, 36, 28, 1, GL).rect(3, 40, 28, 2, GD).px(R, [10, 38], [17, 38], [24, 38]);
    return p.outline(INK);
  },
  carpet() { // alfombra real desde el trono
    const p = new PX(16, 32);
    p.rect(1, 0, 14, 32, '#c8202c').rect(1, 0, 1, 32, '#e8b820').rect(14, 0, 1, 32, '#e8b820').px('#e2574c', [7, 6], [8, 6], [7, 18], [8, 18]).rect(1, 31, 14, 1, '#e8b820');
    return p;
  },
  mosaic() { // mosaico de la plaza: la corona real
    const p = new PX(48, 32);
    p.ell(24, 16, 23, 15, '#cfa76a').ell(24, 16, 21, 13, '#f3dfae').ell(24, 16, 17, 10, '#f7a8c0').ell(24, 16, 15, 8.5, '#fbd0de');
    p.rect(16, 15, 16, 6, '#e8b820').rect(16, 20, 16, 1, '#c98f1e');
    for (const x of [16, 23, 30]) for (let i = 0; i < 4; i++) p.rect(x + (i >> 1) * 0 + (x === 23 ? 0 : 0), 14 - i, 2, 1, '#e8b820');
    p.px('#e2574c', [24, 17], [19, 17], [29, 17]).px('#fff', [17, 12], [24, 10], [31, 12]);
    return p;
  },
  flowerbed() {
    const p = new PX(16, 9);
    p.rect(0, 3, 16, 6, '#8a5f3a').rect(0, 3, 16, 1, '#6e4a2c');
    for (const [x, c] of [[2, '#f06aa8'], [6, '#ffd23f'], [10, '#fff'], [13, '#e2574c']]) p.px(c, [x, 2], [x - 1, 3], [x + 1, 3], [x, 4]).px('#ffe066', [x, 3]).px('#3f9f4f', [x, 5], [x, 6]);
    return p;
  },
  capy_swim() { // capybara en remojo: solo asoma la cabeza
    const p = new PX(18, 14), B = '#a8794a', D = '#7a5230';
    p.px(D, [5, 2], [13, 2]).ell(9, 6, 4.8, 4, B).ell(9, 8, 2.7, 1.9, D).px(BLACK, [6, 5], [12, 5], [8, 8], [10, 8]).px('#f7a8c0', [11, 1], [12, 0], [13, 1], [12, 2]).px('#ffe066', [12, 1]);
    p.outline(INK);
    return p.rect(1, 10, 16, 1, '#bfe3f7').rect(3, 12, 12, 1, '#bfe3f7').rect(0, 11, 18, 1, '#6fb4ee');
  },
  capy_hide() { // capybara "escondido": se tapa la cara con su flor de loto cuando Patito mira (mismo tamaño que capybara_down)
    const p = new PX(18, 18), B = '#a8794a', D = '#7a5230', K = '#f7a8c0', L = '#fcd6e2', M = '#e07a9e';
    p.ell(9, 12.5, 6, 4.6, B).rect(5, 16, 2, 1, D).rect(11, 16, 2, 1, D);
    p.px(D, [5, 5], [13, 5]).ell(9, 8, 4.6, 3.8, B);
    p.ell(9, 8, 4.2, 3.6, K).px(M, [5, 8], [13, 8], [9, 4], [9, 12], [6, 5], [12, 5], [6, 11], [12, 11]).px(L, [7, 5], [6, 7], [11, 5], [12, 7]);
    p.rect(8, 7, 3, 3, '#ffe066').px('#e8b820', [10, 9], [9, 9]);
    p.px(D, [6, 12], [7, 12], [11, 12], [12, 12]); // las patitas que sujetan la flor
    return p.outline(INK);
  },
  mirror_fa: () => stand(1, true),
  mirror_fb: () => stand(2, true),
  // Pastelería Real: moldes y mazapanes con forma
  st_mold_o: () => mold('#f08a24', 'o'), st_mold_f: () => mold('#e2574c', 'f'), st_mold_p: () => mold('#9fc86a', 'p'), st_mold_b: () => mold('#ffd23f', 'b'),
  it_raw_o: () => shape('o', '#f3e3b6'), it_raw_f: () => shape('f', '#f3e3b6'), it_raw_p: () => shape('p', '#f3e3b6'), it_raw_b: () => shape('b', '#f3e3b6'),
  it_maz_o: () => shape('o', '#f08a24'), it_maz_f: () => shape('f', '#e2574c'), it_maz_p: () => shape('p', '#9fc86a'), it_maz_b: () => shape('b', '#ffd23f'),
  teatro() {
    const p = new PX(96, 76), G = '#2f8f5a', GD = '#1f5a3a', K = '#f06aa8', Y = '#e8b820', W = '#f6ecf4';
    for (let y = 2; y < 22; y++) { const i = Math.round((21 - y) * 2.1); p.rect(4 + i, y, 88 - 2 * i, 1, y % 5 === 0 ? GD : G); }
    p.rect(2, 21, 92, 3, K).rect(46, 0, 4, 4, Y);
    for (let x = 6; x < 92; x += 6) p.px('#ffe066', [x, 22]);
    p.rect(5, 24, 86, 50, W).rect(5, 72, 86, 3, '#d8c8d4');
    for (const x of [8, 28, 64, 84]) p.rect(x, 24, 4, 50, K).rect(x, 24, 1, 50, '#f7a8c0');
    p.rect(22, 27, 52, 10, GD).rect(23, 28, 50, 8, G);
    for (let x = 27; x < 70; x += 5) p.px(Y, [x, 30], [x + 1, 30], [x, 31], [x, 32], [x + 1, 33], [x + 2, 32]);
    p.rect(38, 44, 20, 30, GD).rect(40, 46, 7, 28, '#2a7a4c').rect(49, 46, 7, 28, '#2a7a4c').px(Y, [46, 60], [49, 60]);
    p.rect(36, 42, 24, 2, Y);
    p.px(BLACK, [16, 40], [15, 41], [16, 41], [17, 41], [14, 43], [15, 42], [16, 42], [17, 42], [18, 43], [13, 44], [19, 44]).rect(13, 44, 7, 1, BLACK); // sombrero de bruja
    p.ell(76, 43, 4, 4, '#fbd0de').px('#fff', [75, 41], [74, 42]).rect(76, 47, 1, 5, Y);                                                                 // burbuja y varita
    for (const x of [14, 70]) p.rect(x, 52, 10, 14, GD).rect(x + 1, 53, 8, 12, '#bfe3f7').rect(x + 5, 53, 1, 12, GD);
    return p.outline(INK);
  },
  pasteleria() {
    const p = new PX(80, 64), C = '#fff1cf', K = '#f7a8c0';
    p.rect(62, 2, 8, 12, '#b83b33').px('#e4e4e4', [66, 0], [68, 1]);
    p.rect(4, 6, 72, 10, '#8a5a2a').rect(2, 14, 76, 2, '#6e4520');
    for (let x = 2; x < 78; x += 8) p.rect(x, 16, 8, 8, (x / 8) % 2 < 1 ? K : '#fff');
    for (let x = 2; x < 78; x += 8) p.ell(x + 4, 24, 4, 2, (x / 8) % 2 < 1 ? K : '#fff');
    p.rect(3, 24, 74, 38, C).rect(3, 60, 74, 3, '#e8d5a6');
    p.rect(33, 38, 14, 25, '#6e4520').rect(35, 40, 10, 23, '#8a5a2a').px('#ffe066', [43, 52]);
    for (const x of [8, 54]) {
      p.rect(x, 34, 18, 16, '#6e4520').rect(x + 1, 35, 16, 14, '#bfe3f7').rect(x + 1, 45, 16, 4, '#c98f4e');
      p.ell(x + 5, 43, 2.5, 2.5, '#f08a24').px('#3f9f4f', [x + 5, 40]).ell(x + 12, 43, 2.5, 2.5, '#e2574c').px('#3f9f4f', [x + 12, 40]);
    }
    p.ell(40, 30, 6, 3.5, '#f0c060').px('#b8861c', [36, 30], [39, 29], [42, 30], [44, 31]);
    return p.outline(INK);
  },
  fountain() {
    const p = new PX(32, 32);
    p.ell(16, 22, 15, 8.5, '#9c9c92').ell(16, 21, 13.5, 7, '#b9b9b0').ell(16, 21, 11.5, 5.5, '#6fb4ee').rect(14, 8, 4, 14, '#b9b9b0').ell(16, 8, 5, 2.5, '#9c9c92').ell(16, 7.5, 3.5, 1.5, '#6fb4ee');
    p.px('#bfe3f7', [16, 3], [15, 4], [17, 4], [13, 6], [19, 6], [10, 19], [22, 20], [12, 23]);
    return p.outline(INK);
  },
  reeds() {
    const p = new PX(16, 24);
    for (const [x, h] of [[2, 16], [5, 21], [8, 18], [11, 22], [14, 15]]) { p.rect(x, 24 - h, 1, h, '#3f9f4f'); p.px('#2a6b3a', [x + 1, 24 - h + 4], [x - 1, 24 - h + 8]); }
    p.rect(5, 2, 1, 5, '#7a4f2a').rect(11, 1, 1, 5, '#7a4f2a').rect(4, 3, 3, 3, '#7a4f2a').rect(10, 2, 3, 3, '#7a4f2a');
    return p;
  },
  bite() { // mordisco en la muralla
    const p = new PX(18, 16);
    p.ell(9, 5, 7, 8, '#4a3626').ell(4, 9, 3, 3.5, '#4a3626').ell(14, 9, 3, 3.5, '#4a3626').px('#e9c98f', [2, 14], [15, 15], [9, 14]);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 18; x++) if (y < 1) p.set(x, y, null);
    return p;
  },
  // Banderines de las esquinas de la plaza: mástil con remate dorado y bandera de cola de golondrina con una corona.
  // Los de la derecha (_r) van al revés, para que todas las banderas apunten hacia dentro de la plaza.
  banner_k: () => banner('#f06aa8', '#c2457f'), banner_g: () => banner('#2f8f5a', '#1f6a40'),
  banner_k_r: () => banner('#f06aa8', '#c2457f', true), banner_g_r: () => banner('#2f8f5a', '#1f6a40', true),
  narwal() { // peluche de dinosaurio menta con corona… que todo el mundo toma por un narval (sin cuerno)
    const p = new PX(46, 32), W = '#bfeee0', B = '#e8faf4', T = '#7fd6c4', Y = '#ffd84a';
    p.ell(6, 17, 4, 4.6, T);
    p.ell(23, 18, 17, 10.5, W).ell(25, 24, 13, 4.5, B);
    p.px(T, [10, 10], [11, 9], [11, 10], [12, 10], [14, 8], [15, 7], [15, 8], [16, 8], [18, 7], [19, 6], [19, 7], [20, 7]);
    p.rect(24, 6, 8, 2, Y).px(Y, [24, 5], [24, 4], [27, 5], [27, 4], [27, 3], [31, 5], [31, 4]).px('#f08a24', [25, 7], [29, 7]);
    p.rect(27, 15, 2, 2, BLACK).rect(35, 15, 2, 2, BLACK).px('#fff', [27, 15], [35, 15]);
    p.rect(24, 19, 3, 2, '#f7a0b4').rect(37, 19, 3, 2, '#f7a0b4');
    p.px('#5a4636', [30, 19], [31, 20], [32, 19], [33, 20], [34, 19]);
    p.ell(17, 27, 4, 2, T).ell(32, 28, 4, 2, T);
    p.outline(INK);
    return p.rect(2, 30, 42, 2, '#bfe3f7').px('#bfe3f7', [0, 31], [45, 31]);
  },
  // Pastelería Real: estaciones (16x16) e ingredientes (10x10)
  st_alm: () => station('#d9b07a', (p) => p.ell(8, 9, 3, 2, '#8a5a2a').px('#c98f4e', [7, 8])),
  st_azu: () => station('#f4f4ee', (p) => p.rect(6, 7, 4, 4, '#bfe3f7').px('#fff', [6, 7])),
  st_mesa() { return new PX(16, 16).rect(0, 2, 16, 12, '#c98f4e').rect(0, 12, 16, 2, '#8a5a2a').rect(2, 4, 12, 7, '#e8d09a').outline(INK); },
  st_horno() { return new PX(16, 16).rect(0, 0, 16, 16, '#6a6f7a').rect(0, 0, 16, 3, '#8a8f9a').rect(3, 5, 10, 8, '#14151a').px('#e2574c', [3, 1]).px('#ffe066', [6, 1]).outline(INK); },
  st_basura() { return new PX(16, 16).rect(3, 4, 10, 11, '#565a66').rect(2, 2, 12, 2, '#8a8f9a').rect(6, 0, 4, 2, '#8a8f9a').rect(5, 6, 1, 7, '#3a3d46').rect(8, 6, 1, 7, '#3a3d46').rect(11, 6, 1, 7, '#3a3d46').outline(INK); },
  st_entrega() { return new PX(16, 16).rect(0, 0, 16, 16, '#fff1cf').rect(2, 2, 12, 9, '#bfe3f7').rect(0, 11, 16, 3, '#c98f4e').ell(8, 9, 2.5, 2, '#e8b820').px('#e8b820', [8, 6]).outline(INK); },
  it_alm: () => new PX(10, 10).ell(5, 5, 3.5, 2.6, '#8a5a2a').px('#c98f4e', [4, 4]).outline(INK),
  it_azu: () => new PX(10, 10).rect(2, 2, 6, 6, '#ffffff').px('#bfe3f7', [3, 3], [6, 5]).outline(INK),
  it_masa: () => new PX(10, 10).ell(5, 5.5, 3.6, 3, '#f3e3b6').px('#fff', [4, 4]).outline(INK),
  it_maz: () => new PX(10, 10).ell(5, 6, 3.4, 3, '#f08a24').px('#ffb45a', [4, 5]).px('#3f9f4f', [5, 2], [6, 1], [4, 2]).outline(INK),
  it_burnt: () => new PX(10, 10).ell(5, 6, 3.4, 3, '#2b2320').px('#555', [4, 5]).px('#d9d9d9', [6, 1], [5, 0]).outline(INK),
  arrow() { const p = new PX(9, 9); for (let i = 0; i < 4; i++) p.rect(4 - i, 1 + i, 1 + 2 * i, 1, '#ffffff'); return p.rect(3, 5, 3, 3, '#ffffff').outline(INK); },
  // ---- Isla Helada
  casa_navidad() {
    const p = new PX(64, 58), R = '#c8402c', W = '#f4f8fb', G = '#2f8f5a';
    for (let y = 2; y < 24; y++) { const i = Math.round((23 - y) * 1.2); p.rect(2 + i, y, 60 - 2 * i, 1, y < 8 || y % 6 === 0 ? W : '#dfe8ee'); }
    p.rect(0, 23, 64, 3, W).rect(46, 0, 7, 12, R).rect(45, 0, 9, 3, W);
    p.rect(4, 26, 56, 30, R).rect(4, 54, 56, 3, '#8f2a25');
    p.rect(26, 36, 12, 21, G).rect(28, 38, 8, 19, '#1f5a3a').px('#ffe066', [34, 48]).ell(32, 33, 4, 4, G).ell(32, 33, 2, 2, R).px('#e2574c', [32, 37]);
    for (const x of [8, 44]) p.rect(x, 34, 12, 12, '#6e4520').rect(x + 1, 35, 10, 10, '#ffe9b8').rect(x + 6, 35, 1, 10, '#6e4520').rect(x + 1, 40, 10, 1, '#6e4520');
    const cols = ['#ffe066', '#e2574c', '#3f8fd8', '#82cc6a'];
    for (let x = 6, i = 0; x < 60; x += 5, i++) p.px(cols[i % 4], [x, 27 + (i % 2)], [x, 28 + (i % 2)]);
    return p.outline(INK);
  },
  tedi() {
    const p = new PX(80, 66);
    p.rect(60, 0, 9, 24, '#6a6f7a').rect(59, 0, 11, 3, '#3a3d46').px('#b8b8b8', [64, -1]);
    for (let i = 0; i < 4; i++) { p.rect(2 + i * 14, 12, 14, 1, '#565a66'); for (let y = 0; y < 8; y++) p.rect(2 + i * 14, 12 + y, 14 - Math.round(y * 1.6), 1, '#8a8f9a'); }
    p.rect(2, 20, 76, 44, '#8a8f9a').rect(2, 20, 76, 3, '#a8adb8').rect(2, 61, 76, 3, '#565a66');
    p.ell(40, 37, 13, 13, '#111418').ell(40, 37, 11.5, 11.5, '#1f6fd0').rect(30, 33, 21, 8, '#ffe000');
    // Rótulo «TEDi» en azul sobre la franja amarilla (letras de 3×4 y la i minúscula con su punto), centrado
    const LOGO = ['###.###.##..#', '.#..#...#.#..', '.#..##..#.#.#', '.#..###.##..#'];
    LOGO.forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') p.set(34 + i, 35 + j, '#1f6fd0'); }));
    p.rect(32, 50, 16, 14, '#14151a'); for (let i = 0; i < 16; i += 4) p.rect(32 + i, 48, 2, 2, '#ffe000').rect(34 + i, 48, 2, 2, '#14151a');
    for (const x of [8, 62]) p.rect(x, 30, 10, 8, '#14151a').rect(x + 1, 31, 8, 6, '#e2574c');
    return p.outline(INK);
  },
  sweetfamosa() {
    const p = new PX(96, 76), D = '#1c1c22', N = '#5af08a';
    p.rect(3, 14, 90, 60, D).rect(3, 14, 90, 3, '#34343e').rect(3, 71, 90, 3, '#0c0c10');
    p.ell(48, 9, 9, 7, '#f7a8c0').ell(48, 9, 3.5, 2.5, D).px('#fff', [43, 6], [52, 5], [54, 10]).px('#ffe066', [45, 4], [50, 12]);   // dónut del tejado
    p.rect(14, 19, 68, 11, '#0c0c10').rect(15, 20, 66, 9, D);
    for (let x = 18; x < 78; x += 5) p.px(N, [x, 22], [x + 1, 22], [x + 2, 23], [x, 24], [x + 1, 25], [x + 2, 26], [x, 26]);                 // rótulo de neón
    // Cascadas: chocolate negro, chocolate blanco, Lotus y pistacho
    [['#4a2c1e', '#6b4030'], ['#fff3dc', '#ffffff'], ['#c98a4e', '#e0a868'], ['#9fc86a', '#c0e090']].forEach(([c, l], i) => {
      const x = 8 + i * 13;
      p.rect(x, 32, 9, 3, '#6a6f7a').rect(x + 1, 35, 7, 32, c).rect(x + 2, 35, 1, 32, l).ell(x + 4.5, 68, 6, 2.5, c);
      p.px(l, [x + 5, 40 + i * 3], [x + 5, 52 - i * 2], [x + 3, 60]);
    });
    p.rect(64, 44, 14, 30, '#3b2a20').rect(66, 46, 10, 28, '#6e4520').px('#ffe066', [74, 60]);
    p.ell(86, 62, 6, 8, '#d9a35a').ell(86, 55, 6.5, 4, '#b8742e').ell(86, 53, 5, 3, '#fff3dc').px('#fff3dc', [81, 57], [81, 58], [91, 56], [90, 59], [84, 60]).px('#4a2c1e', [84, 64], [88, 66], [86, 61]); // panettone desbordado
    return p.outline(INK);
  },
  pine_snow() {
    const p = new PX(20, 30);
    p.rect(8, 23, 4, 6, '#7a4f2a');
    for (let k = 0; k < 3; k++) for (let y = 0; y < 10; y++) p.rect(10 - Math.round(y * (0.6 + k * 0.14)) - 1, 1 + k * 7 + y, 2 * Math.round(y * (0.6 + k * 0.14)) + 2, 1, y < 3 ? '#f4f8fb' : '#2f8f5a');
    p.px('#f4f8fb', [5, 15], [14, 14], [3, 22], [16, 22], [9, 20]);
    return p.outline('#1d4d2b');
  },
  snowman() {
    const p = new PX(16, 24);
    p.ell(8, 18, 6, 5, '#f4f8fb').ell(8, 9, 4.5, 4.2, '#f4f8fb').rect(5, 2, 6, 3, BLACK).rect(4, 5, 8, 1, BLACK).rect(5, 12, 6, 1, '#e2574c').px('#e2574c', [10, 13], [10, 14]);
    p.px(BLACK, [6, 8], [10, 8], [8, 16], [8, 19]).px('#f08a24', [8, 10], [9, 10]);
    return p.outline(INK);
  },
  gramola() {
    const p = new PX(16, 26);
    p.ell(8, 8, 7, 7, '#c8402c').rect(1, 8, 14, 16, '#c8402c').rect(1, 22, 14, 3, '#8f2a25').ell(8, 8, 4.5, 4.5, '#ffe066').ell(8, 8, 2.5, 2.5, '#14151a').px('#fff', [8, 8]);
    p.rect(3, 14, 10, 6, '#3b2a20'); for (let x = 4; x < 12; x += 2) p.rect(x, 15, 1, 4, ['#3f8fd8', '#82cc6a', '#f7a8c0', '#ffe066'][(x / 2) % 4]);
    return p.outline(INK);
  },
  hook() { return new PX(10, 14).rect(4, 0, 2, 7, '#8a8f9a').px('#c9ced8', [4, 7], [3, 8], [2, 9], [2, 10], [3, 11], [4, 12], [5, 12], [6, 11], [7, 10]).outline(INK); },
  plug_c() { return new PX(16, 14).rect(1, 2, 14, 11, '#6a6f7a').rect(2, 3, 12, 9, '#8a8f9a').rect(2, 7, 12, 1, '#565a66').px('#3a3d46', [13, 5]).outline(INK); },
  plug_o() { return new PX(16, 14).rect(1, 2, 14, 11, '#ffe066').rect(3, 4, 10, 7, '#14151a').rect(5, 5, 6, 5, '#f4f4ee').px(BLACK, [6, 7], [9, 7]).rect(7, 9, 2, 3, '#f4f4ee').outline(INK); },
  plug_x() { return new PX(16, 14).rect(1, 2, 14, 11, '#3a3d46').rect(3, 4, 10, 7, '#14151a').px('#ffe066', [4, 5], [11, 9], [7, 7]).px('#e2574c', [9, 5], [5, 9]).outline(INK); },
  knot() { // nudo de rama con hojas (bosque de los monos)
    const p = new PX(16, 12);
    p.ell(8, 6, 4, 3, '#7a4f2a').px('#5e3a1c', [7, 6], [9, 5]).px('#45a85c', [2, 4], [3, 3], [3, 5], [13, 4], [12, 3], [12, 5], [8, 1]);
    return p.outline('#1d2b1a');
  },
  bar() { // barra de dominadas del minijuego de calistenia
    const p = new PX(96, 70);
    p.rect(6, 4, 4, 66, '#8a8f9a').rect(86, 4, 4, 66, '#8a8f9a').rect(4, 6, 88, 3, '#c9ced8').rect(4, 9, 88, 1, '#6a6f7a').rect(2, 66, 12, 4, '#565a66').rect(82, 66, 12, 4, '#565a66');
    return p.outline(INK);
  },
  lantern() {
    const p = new PX(12, 20);
    p.rect(4, 12, 4, 6, '#9c9c92').rect(2, 17, 8, 2, '#8a8a80').rect(2, 6, 8, 6, '#b9b9b0').rect(4, 8, 4, 3, '#ffe066').rect(1, 4, 10, 2, '#8a8a80').rect(4, 2, 4, 2, '#8a8a80');
    return p.outline(INK);
  },
  combini() {
    const p = new PX(64, 46);
    p.rect(1, 2, 62, 43, '#f4f4ee').rect(1, 2, 62, 3, '#c9c9c0');
    p.rect(1, 8, 62, 3, '#f08a24').rect(1, 11, 62, 3, '#3f8f6b').rect(1, 14, 62, 3, '#e2574c');
    p.rect(21, 6, 22, 13, '#ffffff').rect(22, 7, 20, 11, '#3f8f6b'); // rótulo «7/11»
    p.px('#fff', [24, 10], [25, 10], [26, 10], [26, 11], [25, 12], [25, 13], [25, 14]);                 // 7
    p.px('#fff', [30, 10], [30, 11], [29, 12], [28, 13], [28, 14]);                                     // /
    for (const x of [33, 37]) p.px('#fff', [x, 10], [x - 1, 11], [x, 11], [x, 12], [x, 13], [x - 1, 14], [x, 14], [x + 1, 14]); // 1 1
    p.rect(18, 24, 14, 21, '#6a7a86').rect(19, 25, 6, 20, '#a9d6ee').rect(26, 25, 5, 20, '#a9d6ee');
    for (let i = 0; i < 14; i++) { p.set(18 + i, 31 + (i >> 1) % 2, i % 4 < 2 ? '#ffe066' : INK); p.set(18 + i, 36 + (i >> 1) % 2, i % 4 < 2 ? '#ffe066' : INK); }
    p.rect(4, 24, 10, 12, '#6a7a86').rect(5, 25, 8, 10, '#a9d6ee');
    p.rect(38, 23, 20, 14, '#fff').rect(39, 24, 18, 12, '#f7a8c0').rect(39, 33, 18, 3, '#ffe066'); // póster de Gatolleta
    p.px('#4a2c1e', [44, 26], [45, 25], [45, 26], [51, 25], [51, 26], [52, 26]).ell(48.5, 29.5, 4.6, 3.4, '#4a2c1e');
    p.px('#fff', [46, 29], [47, 29], [50, 29], [51, 29]).px('#f7a8c0', [48, 31], [49, 31]);
    p.rect(1, 43, 62, 2, '#c9c9c0');
    return p.outline(INK);
  },
  cone() { return new PX(10, 12).rect(4, 1, 2, 3, '#f08a24').rect(3, 4, 4, 3, '#fff').rect(2, 7, 6, 3, '#f08a24').rect(1, 10, 8, 1, '#c96a10').outline(INK); },
  gachapon() {
    const p = new PX(14, 24);
    p.rect(1, 10, 12, 12, '#e2574c').rect(1, 20, 12, 2, '#b83b33').rect(4, 14, 6, 4, '#3b2a20').rect(8, 12, 3, 2, '#ffe066');
    p.ell(7, 6, 6, 5.5, '#d7eefb');
    p.px('#f7a8c0', [4, 7], [5, 7], [4, 8], [5, 8]).px('#ffe066', [7, 5], [8, 5], [7, 6], [8, 6]).px('#6fb4ee', [9, 8], [10, 8], [9, 9]).px('#82cc6a', [6, 9], [7, 9]).px('#fff', [4, 3], [5, 2]);
    return p.outline(INK);
  },
  terminal() {
    const p = new PX(64, 58);
    p.rect(48, 6, 12, 30, '#c9c9c0').rect(45, 1, 18, 8, '#6a7a86').rect(46, 3, 16, 4, '#a9d6ee').px('#e2574c', [54, 0]);
    p.rect(1, 22, 62, 35, '#dcdcd4').rect(1, 22, 62, 3, '#b0b0a8').rect(1, 28, 62, 4, '#2a4fa0');
    p.px('#fff', [6, 29], [7, 29], [6, 30], [8, 30], [11, 29], [12, 29], [11, 30], [15, 29], [15, 30], [16, 30], [19, 29], [20, 30], [19, 30], [23, 29], [24, 29], [23, 30]);
    p.rect(24, 38, 16, 19, '#6a7a86').rect(25, 39, 6, 18, '#a9d6ee').rect(33, 39, 6, 18, '#a9d6ee');
    for (const x of [5, 14, 44, 53]) p.rect(x, 38, 7, 8, '#6a7a86').rect(x + 1, 39, 5, 6, '#a9d6ee');
    return p.outline(INK);
  },
  plane() {
    const p = new PX(50, 26);
    p.ell(26, 14, 22, 5, '#f4f4ee').rect(6, 14, 38, 1, '#2a4fa0');
    for (let i = 0; i < 9; i++) p.rect(2 + i, 3 + i, 5, 1, i < 3 ? '#e2574c' : '#f4f4ee');
    p.rect(18, 17, 14, 3, '#c9c9c0').rect(16, 20, 12, 2, '#b0b0a8');
    for (let x = 14; x < 40; x += 4) p.set(x, 12, '#6fb4ee');
    p.px('#6fb4ee', [43, 12], [44, 12], [44, 13]).px(INK, [14, 23], [15, 23], [36, 23], [37, 23]);
    return p.outline(INK);
  },
  gate() {
    const p = new PX(32, 34);
    p.ell(16, 16, 15, 15, '#cfa76a').rect(1, 16, 30, 18, '#cfa76a');
    p.ell(16, 17, 11, 12, '#6e4520').rect(5, 17, 22, 17, '#6e4520').rect(15, 6, 2, 28, '#3b2a20');
    for (let y = 12; y < 34; y += 6) p.rect(5, y, 22, 1, '#55301a');
    p.px('#ffe066', [13, 22], [18, 22]).px('#f7a8c0', [15, 2], [16, 2], [14, 3], [17, 3]);
    return p.outline(INK);
  },
  scaffold() {
    const p = new PX(56, 44);
    for (const x of [1, 18, 36, 53]) p.rect(x, 0, 2, 44, '#8a5a2a');
    for (const y of [6, 22]) p.rect(0, y, 56, 3, '#c98f4e').rect(0, y + 3, 56, 1, '#8a5a2a');
    p.line(3, 9, 17, 21, '#8a5a2a').line(38, 9, 52, 21, '#8a5a2a').line(20, 25, 35, 43, '#8a5a2a').line(35, 25, 20, 43, '#8a5a2a');
    return p.outline(INK);
  },
  // Cartel de madera con «CAIT» en letras de píxel
  sign_cait() {
    const p = new PX(22, 18), L = '#fff6dc';
    p.rect(5, 11, 2, 6, '#6e4520').rect(15, 11, 2, 6, '#6e4520').rect(1, 1, 20, 11, '#c98f4e').rect(1, 1, 20, 1, '#dba865').rect(1, 11, 20, 1, '#a8743c');
    p.rect(3, 4, 1, 5, L).rect(4, 4, 2, 1, L).rect(4, 8, 2, 1, L);                       // C
    p.rect(7, 5, 1, 4, L).rect(9, 5, 1, 4, L).px(L, [8, 4]).px(L, [8, 6]);               // A
    p.rect(12, 4, 1, 5, L).px(L, [11, 4], [13, 4], [11, 8], [13, 8]);                    // I
    p.rect(15, 4, 3, 1, L).rect(16, 5, 1, 4, L);                                         // T
    p.px('#e2574c', [19, 3]).px('#f7a8c0', [19, 9], [2, 10]);
    return p.outline(INK);
  },
  // Macetitas con flores para la entrada de casa de Cait
  pot_r: () => pot('#e2574c', '#ffd23f'), pot_y: () => pot('#ffd23f', '#f08a24'), pot_p: () => pot('#f7a8c0', '#ffffff'), pot_v: () => pot('#b8a0d8', '#ffe066'),
  // Embarcadero: barca de remos amarrada y poste de amarre
  boat() {
    const p = new PX(26, 14), H = '#8a5a2a', HL = '#c98f4e', IN = '#a8743c';
    p.ell(13, 7, 12, 5.5, H).ell(13, 6.6, 10, 4, IN).rect(6, 5, 1, 4, HL).rect(13, 3, 1, 8, HL).rect(19, 5, 1, 4, HL).rect(2, 6, 22, 1, '#6e4520');
    p.line(8, 9, 14, 12, '#dba865').px('#dba865', [15, 12], [16, 12]);
    return p.outline(INK);
  },
  boat2() {
    const p = new PX(26, 14), H = '#3f8fd8', HL = '#ffffff', IN = '#bfe3f7';
    p.ell(13, 7, 12, 5.5, H).ell(13, 6.6, 10, 4, IN).rect(13, 3, 1, 8, HL).rect(2, 6, 22, 1, '#2a6bb0').px('#e2574c', [21, 4], [21, 5]);
    return p.outline(INK);
  },
  lotus() {
    const p = new PX(14, 10);
    p.ell(7, 7, 6, 2.5, '#3f9f4f').px('#2a6b3a', [7, 6], [8, 7]).rect(6, 7, 1, 2, '#63b04f');
    p.ell(7, 5, 2.4, 2, '#f7a8c0').px('#f06aa8', [7, 3], [5, 5], [9, 5]).px('#ffe066', [7, 5]);
    return p.outline(INK);
  },
  lotus_pad() { return new PX(12, 6).ell(6, 3, 5, 2.2, '#3f9f4f').px('#2a6b3a', [6, 2], [7, 3], [8, 3]).outline(INK); },
  post() { return new PX(6, 14).rect(1, 2, 4, 11, '#6e4520').rect(1, 2, 4, 1, '#a8743c').rect(0, 6, 6, 1, '#dba865').outline(INK); },
  sign() { return new PX(14, 16).rect(6, 9, 2, 6, '#6e4520').rect(1, 2, 12, 8, '#c98f4e').rect(3, 4, 8, 1, '#6e4520').rect(3, 6, 6, 1, '#6e4520').outline(INK); },
  kiosk() {
    const p = new PX(14, 22);
    p.rect(2, 8, 10, 13, '#2a4fa0').rect(2, 19, 10, 2, '#1c3670').rect(1, 1, 12, 8, '#dcdcd4').rect(2, 2, 10, 6, '#14151a');
    p.px('#e2574c', [3, 3], [4, 4], [5, 5], [5, 3], [3, 5]).px('#82cc6a', [8, 4], [9, 4], [10, 4]).rect(4, 12, 6, 1, '#fff').rect(4, 14, 6, 1, '#fff');
    return p.outline(INK);
  },
  sock() {
    const p = new PX(10, 13);
    p.rect(3, 1, 4, 8, '#f4f4ee').rect(3, 8, 6, 4, '#f4f4ee').rect(3, 1, 4, 2, '#3f8f6b').rect(3, 4, 4, 1, '#3f8f6b').px('#3f8f6b', [8, 10], [8, 11], [7, 11]);
    return p.outline(INK);
  },
  bubble() { return new PX(9, 12).rect(1, 1, 7, 8, '#fff').px('#fff', [4, 9]).rect(4, 2, 1, 4, '#e2574c').px('#e2574c', [4, 7]).outline(INK); },
  shadow() { return new PX(14, 5).ell(7, 2.5, 6.5, 2.2, '#000'); },
  bed2() { // cama de matrimonio de Cait: dos almohadas y edredón
    const p = new PX(32, 32), Q = '#5a78b0', QL = '#7d98c8';
    p.rect(1, 1, 30, 30, '#8a5a2a').rect(1, 1, 30, 3, '#a8743c').rect(2, 4, 28, 26, '#fff');
    p.rect(4, 5, 11, 6, '#e6edf6').rect(17, 5, 11, 6, '#e6edf6').rect(4, 10, 11, 1, '#c9d3e2').rect(17, 10, 11, 1, '#c9d3e2');
    p.rect(2, 13, 28, 17, Q).rect(2, 13, 28, 2, QL);
    for (let y = 18; y < 30; y += 4) p.rect(2, y, 28, 1, QL);
    return p.outline(INK);
  },
  bed() {
    const p = new PX(18, 32);
    p.rect(1, 1, 16, 30, '#8a5a2a').rect(2, 3, 14, 27, '#fff').rect(4, 4, 10, 6, '#bfe3f7').rect(2, 12, 14, 18, '#3f8f6b');
    for (let y = 14; y < 30; y += 4) p.rect(2, y, 14, 1, '#57a985');
    return p.outline(INK);
  },
  table() {
    const p = new PX(32, 22);
    p.rect(1, 4, 30, 12, '#c98f4e').rect(1, 14, 30, 2, '#8a5a2a').rect(3, 16, 3, 5, '#8a5a2a').rect(26, 16, 3, 5, '#8a5a2a');
    return p.outline(INK);
  },
  invites() {
    const p = new PX(14, 10);
    p.rect(1, 3, 9, 6, '#fff6dc').rect(4, 1, 9, 6, '#fff').line(4, 1, 8, 4, '#c9b88a').line(12, 1, 8, 4, '#c9b88a').px('#e2574c', [8, 5]);
    return p.outline(INK);
  },
  // ---- Restos de la fiesta en casa de Cait (después del final)
  cake_rest() { // en un plato: lo que queda de la tarta (una porción con sus pisos de colores), la vela y migas
    const p = new PX(20, 13);
    p.ell(10, 10, 9, 2.6, '#e8e4dc').ell(10, 9.6, 7, 1.8, '#fbfaf6');
    p.rect(5, 4, 9, 2, '#f7a8c0').rect(5, 6, 9, 1, '#fff3dc').rect(5, 7, 9, 1, '#9fc86a').rect(5, 8, 9, 1, '#4a2c1e'); // porción
    p.rect(5, 4, 1, 5, '#e3c9a8').px('#ffffff', [6, 4], [7, 4]);                                                     // el corte
    p.rect(11, 1, 1, 3, '#f4f4ee').px('#4a3a30', [11, 0]);                                                       // vela apagada
    p.px('#4a2c1e', [15, 9], [16, 10], [4, 10]).px('#f7a8c0', [14, 10], [3, 9]);                                    // migas
    return p.outline(INK);
  },
  balloons_rest() { // tres globos medio desinflados, ya sin fuerza, atados a un peso
    const p = new PX(20, 24), cols = ['#e2574c', '#ffd23f', '#4a90d8'];
    p.ell(5, 7, 4.4, 3.4, cols[0]).ell(15, 9, 4.2, 3.2, cols[2]).ell(10, 11, 3.8, 3, cols[1]);
    p.px('#ffffff', [3, 6], [13, 8], [8, 10]);
    p.rect(8, 20, 5, 3, '#8a8f9a').rect(8, 20, 5, 1, '#b8bcc6').outline(INK);
    return p.line(5, 11, 10, 19, STRING).line(15, 13, 10, 19, STRING).line(10, 15, 10, 19, STRING); // cordeles, sin contorno
  },
  wrap_rest() { // papel de regalo arrugado, un lazo suelto y un gorrito de fiesta caído
    const p = new PX(22, 14), r = rng(77);
    p.ell(6, 9, 5, 3.6, '#f06aa8').ell(13, 10, 5, 3.2, '#4a90d8').ell(18, 9, 3.4, 3, '#ffd23f');
    p.speck(r, 18, '#ffffff', '#c8402c', '#82cc6a');
    p.px('#e2574c', [9, 5], [10, 6], [11, 5], [10, 7], [10, 8]);                         // lazo
    for (let y = 0; y < 8; y++) p.rect(14 - Math.floor(y / 2), 1 + y, 1 + Math.floor(y / 1.3), 1, y % 3 ? '#82cc6a' : '#ffd23f'); // gorrito
    p.px('#ffffff', [14, 0]);
    return p.outline(INK);
  },
  confetti_floor() { // confeti por el suelo (plano, se pisa)
    const p = new PX(16, 16), r = rng(91), C = ['#ffe066', '#e2574c', '#3f8fd8', '#82cc6a', '#f7a8c0'];
    for (let i = 0; i < 9; i++) { const x = 1 + ((r() * 13) | 0), y = 2 + ((r() * 12) | 0), c = C[i % 5]; p.set(x, y, c); if (i % 2) p.set(x + 1, y, c); else p.set(x, y + 1, c); }
    return p;
  },
  rug() {
    const p = new PX(48, 30);
    p.ell(24, 15, 23, 14, '#e2574c').ell(24, 15, 19, 10.5, '#f6c56b').ell(24, 15, 14, 7, '#e2574c');
    return p;
  },
  // Tiestos con flores (más pequeños que las plantas): salón de la ratita blanca. Tres colores de flor.
  flowerpot_r: () => flowerpot('#e2574c'), flowerpot_y: () => flowerpot('#ffd23f'), flowerpot_p: () => flowerpot('#f06aa8'),
  plant() { return new PX(12, 20).rect(3, 13, 6, 6, '#c96a10').rect(2, 12, 8, 2, '#f08a24').ell(6, 7, 5, 5.5, '#2f8f4a').ell(4.5, 5, 2, 2, '#45a85c').outline(INK); },
  shelf() {
    const p = new PX(32, 26);
    p.rect(1, 1, 30, 24, '#8a5a2a').rect(3, 3, 26, 9, '#3b2a20').rect(3, 14, 26, 9, '#3b2a20');
    const cols = ['#e2574c', '#3f8fd8', '#ffe066', '#82cc6a', '#f7a8c0', '#f08a24'];
    for (let i = 0; i < 11; i++) { p.rect(4 + i * 2 + (i > 6 ? 2 : 0), 5, 2, 7, cols[i % 6]); p.rect(4 + i * 2, 16 + (i % 3 === 0 ? 2 : 0), 2, 7 - (i % 3 === 0 ? 2 : 0), cols[(i + 3) % 6]); }
    return p.outline(INK);
  },
  crate() {
    const p = new PX(16, 16);
    p.rect(1, 1, 14, 14, '#c98f4e').rect(1, 1, 14, 2, '#dba865').rect(1, 13, 14, 2, '#a8743c').rect(7, 1, 2, 14, '#e8d09a').rect(1, 6, 14, 1, '#a8743c');
    return p.outline(INK);
  },
  crate_ok() {
    const p = new PX(16, 16);
    p.rect(1, 1, 14, 14, '#7fbf6a').rect(1, 1, 14, 2, '#9ad486').rect(1, 13, 14, 2, '#5aa648').rect(7, 1, 2, 14, '#e8f5c8').rect(1, 6, 14, 1, '#5aa648');
    return p.outline(INK);
  },
  target() {
    const p = new PX(16, 16);
    p.line(4, 4, 11, 11, '#e2574c').line(11, 4, 4, 11, '#e2574c').line(5, 4, 11, 10, '#e2574c').line(10, 4, 4, 10, '#e2574c');
    return p;
  },
};

// ---------------------------------------------------------------- Regalos del gachapón (24x24)
const GACHA_ART = {
  grizzly(p) { // el oso pardo grande: de pie, hocico claro y nariz negra
    const B = '#9a6a40', BD = '#7a4f2a', M = '#c8a070';
    p.ell(7.5, 3.6, 1.8, 1.8, B).ell(16.5, 3.6, 1.8, 1.8, B).ell(12, 15, 6.6, 7.6, B).ell(12, 7.5, 5.4, 4.6, B);
    p.ell(13, 9, 2.8, 1.8, M).px(BLACK, [13, 8], [14, 8], [10, 6], [15, 6]).px(BD, [12, 10], [13, 10], [14, 10]);
    p.line(7, 13, 8, 18, BD).line(17, 13, 16, 18, BD).ell(9, 22, 2.4, 1.2, BD).ell(15, 22, 2.4, 1.2, BD);
  },
  morsez(p) { // la morsa con peto: cabeza blanca, gran hocico azul, cuerpo oscuro y pies azules
    const W = '#ecebf4', WB = '#c9c6dc', K = '#2b2b33', A = '#3f5fd0';
    p.ell(12, 16, 7.4, 6, K).ell(7, 21, 3, 1.7, A).ell(17, 21, 3, 1.7, A);
    p.ell(11.5, 8.5, 7, 5.6, W).ell(11.5, 12, 6, 2, WB).ell(11.5, 10.5, 4.4, 2.4, A).ell(10.5, 9.8, 1.4, 0.8, '#7f9cf4');
    p.px(BLACK, [11, 9], [12, 9], [9, 6], [14, 6]).px('#e58a8a', [11, 12]).ell(18.5, 13.5, 2.4, 1.8, W);
  },
  'owinken-mandarino'(p) { // Owinken hecho mandarina: cerdito naranja con hojitas en la cabeza y una rodaja de mandarina por hocico
    const O = '#f59a2e', OL = '#ffb85a', G = '#4f8a3a';
    p.px(O, [6, 6], [7, 5], [7, 6], [8, 6], [16, 6], [17, 5], [17, 6], [18, 6]).px('#ffe0b0', [7, 6], [17, 6]);
    p.ell(12, 13.5, 9.4, 6.6, O).ell(10, 10.5, 5, 2.2, OL);
    p.px(G, [11, 6], [12, 5], [13, 6], [12, 6], [10, 7], [14, 7]);
    p.ell(19, 14, 3, 3, '#fff6e0').ell(19, 14, 2.3, 2.3, '#ffa94a').px('#fff6e0', [19, 12], [19, 16], [17, 14], [21, 14]);
    p.px('#c06a10', [18, 14], [20, 14]);                                                         // la rodaja es el hocico
    p.px('#5a3418', [12, 11], [13, 11], [16, 10], [17, 10]);                                     // los dos ojos (marrones), delante, junto al hocico
    p.ell(5, 19, 1.8, 1.2, G).ell(10, 20, 1.8, 1.2, G).ell(15, 20, 1.8, 1.2, G);
  },
  kirby(p) {
    const P = '#f7a8c0', PD = '#e87a9c', R = '#d8263a';
    p.ell(3.5, 13, 2.6, 2.6, P).ell(20.5, 11, 2.6, 2.6, P).ell(7, 21, 4, 2.2, R).ell(17, 21, 4, 2.2, R);
    p.ell(12, 12, 8.5, 8.5, P).ell(9, 6, 3, 1.4, '#fcc8d8');
    for (const x of [9, 13]) p.rect(x, 7, 2, 5, BLACK).rect(x, 7, 2, 1, '#fff').rect(x, 11, 2, 1, '#3f6fd0');
    p.rect(5, 13, 2, 1, PD).rect(17, 13, 2, 1, PD).px(R, [11, 14], [12, 14], [11, 15], [12, 15]);
  },
  pachirisu(p) {
    const W = '#f7f7f2', B = '#4ab8d8', Y = '#ffd84a';
    p.ell(18, 10, 4.6, 8, W).rect(17, 3, 2, 12, B).px(B, [16, 4], [19, 4]);
    p.px(B, [4, 2], [4, 3], [5, 3], [5, 4], [6, 4], [13, 2], [13, 3], [12, 3], [12, 4], [11, 4]);
    p.ell(9, 17, 4.6, 5, W).ell(9, 9, 5.6, 4.8, W).rect(7, 4, 5, 2, B).rect(8, 6, 3, 1, B);
    p.rect(4, 10, 2, 2, Y).rect(13, 10, 2, 2, Y).rect(7, 8, 1, 2, BLACK).rect(11, 8, 1, 2, BLACK).px(BLACK, [9, 11]).px('#e58a8a', [9, 12]);
    p.rect(6, 22, 3, 1, W).rect(10, 22, 3, 1, W);
  },
  yoshi(p) {
    const G = '#5ac83a', GD = '#3f9f2a', W = '#f7f7f2', R = '#e2574c', O = '#f08a24';
    p.ell(6, 15, 3, 3.2, R).ell(6, 15, 1.6, 1.8, '#fff').ell(10, 16, 4.6, 5, G).ell(11.5, 17, 2.6, 3.6, W);
    p.ell(8, 22, 2.8, 1.5, O).ell(14, 22, 2.8, 1.5, O);
    p.ell(11, 9, 4.6, 4, G).ell(17, 10, 4.8, 4.2, G).ell(12, 12, 3, 1.4, W);
    p.ell(10, 5, 2, 3.2, W).ell(13.5, 5, 2, 3.2, W).rect(10, 4, 1, 3, BLACK).rect(13, 4, 1, 3, BLACK);
    p.px(GD, [19, 8], [20, 8], [6, 7], [7, 6], [6, 9]).px(R, [5, 8], [5, 10]);
  },
  marill(p) { // ratoncito azul redondo, orejas redondas y cola en zigzag acabada en una bola azul
    const B = '#4f8fe8', BL = '#7fb2f4', BD = '#2f63b8', W = '#eaf4ff';
    p.ell(6.5, 5.5, 3.4, 3.4, B).ell(17.5, 5.5, 3.4, 3.4, B).ell(6.5, 5.8, 2, 2, '#c0584a').ell(17.5, 5.8, 2, 2, '#c0584a');            // orejas
    p.ell(12, 14, 8, 7.6, B).ell(12, 17.6, 5.4, 3.6, W).ell(9, 9.5, 2.6, 1.3, BL);                                     // cuerpo y barriga
    p.ell(7, 21, 2.4, 1.4, BD).ell(17, 21, 2.4, 1.4, BD).ell(5, 16, 1.6, 1.4, B).ell(19, 16, 1.6, 1.4, B);             // patas
    for (const x of [9, 14]) p.rect(x, 11, 2, 3, BLACK).px('#ffffff', [x, 11]);                                        // ojos
    p.px(BLACK, [11, 14], [12, 14]).px('#e58a8a', [11, 15], [12, 15]);                                                 // hocico
    p.line(20, 19, 22, 18, BLACK).line(22, 18, 21, 16, BLACK).ell(21.6, 13.4, 2.6, 2.6, BLACK).ell(21.6, 13.4, 1.8, 1.8, B).px(BL, [21, 13]); // cola en zigzag y su bola
  },
  poyopoyo(p) {
    const Y = '#ffd84a', O = '#f0a020', BR = '#7a4f2a';
    p.px(Y, [4, 7], [5, 6], [5, 7], [6, 6], [6, 7], [7, 7], [16, 7], [17, 6], [17, 7], [18, 6], [18, 7], [19, 7]).px('#f7a8c0', [5, 7], [18, 7]);
    p.ell(12, 14.5, 10, 7.6, Y).ell(12, 19, 7, 2.6, '#ffe890');
    p.rect(11, 8, 2, 2, O).rect(8, 8, 1, 2, O).rect(15, 8, 1, 2, O);
    p.px(BR, [8, 13], [16, 13], [11, 15], [13, 15], [12, 14]).px('#e58a8a', [12, 16]);
    p.px(BR, [1, 13], [2, 14], [1, 16], [22, 13], [21, 14], [22, 16]);
  },
  'princesa-bultos'(p) {
    const U = '#b06ad8', UL = '#c890e8', D = '#3a1a4a';
    p.line(4, 15, 2, 20, U).line(20, 15, 22, 20, U);
    for (const [x, y, r] of [[12, 13, 8], [6, 9, 3.6], [12, 6, 4.2], [18, 9, 3.6], [5, 15, 3.2], [19, 15, 3.2], [9, 20, 3.2], [15, 20, 3.2]]) p.ell(x, y, r, r * 0.9, U);
    p.ell(9, 5, 2, 1, UL).ell(5, 8, 1.5, 0.8, UL);
    p.px('#ffe066', [12, 5], [11, 6], [12, 6], [13, 6], [12, 7], [11, 8], [13, 8]);
    p.px(D, [9, 11], [15, 11]).ell(12, 15.5, 2, 2.6, D).px('#e2574c', [12, 17]);
  },
  gatolleta(p) { // galleta helada con forma de gato
    const B = '#4a2c1e', K = '#f7a8c0', W = '#fff3dc';
    p.px(B, [5, 4], [6, 3], [6, 4], [7, 4], [16, 4], [17, 3], [17, 4], [18, 4], [5, 5], [18, 5]);
    p.ell(12, 12, 8.5, 7.5, B).rect(4, 10, 16, 5, K).rect(4, 12, 16, 1, W).ell(12, 12, 8.5, 7.5, null);
    p.ell(12, 12, 8.5, 7.5, B).rect(4, 10, 8, 5, W).rect(12, 10, 8, 5, K);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if (((x + 0.5 - 12) / 8.5) ** 2 + ((y + 0.5 - 12) / 7.5) ** 2 > 1 && y >= 6) p.set(x, y, null);
    p.ell(12, 7.5, 7, 3, B).ell(12, 17, 7, 2.8, B).px(BLACK, [8, 12], [15, 12]).px('#fff', [8, 11], [15, 11]).px(B, [11, 13], [12, 14], [13, 13]);
    p.px(B, [5, 4], [6, 3], [6, 4], [7, 4], [16, 4], [17, 3], [17, 4], [18, 4], [5, 5], [6, 5], [17, 5], [18, 5]);
  },
  nabo(p) {
    const W = '#f6f2ff', G = '#3f9f4f', V = '#c9a0e0';
    p.line(12, 8, 8, 2, G).line(12, 8, 12, 1, G).line(12, 8, 16, 2, G).px(G, [9, 3], [7, 3], [11, 2], [13, 2], [15, 3], [17, 3], [8, 4], [16, 4]);
    p.ell(12, 14, 7.5, 6.5, W).ell(12, 9.5, 5, 2, V).px(W, [12, 21], [12, 22]).px('#e0d8f0', [17, 16], [16, 18]);
    p.px(BLACK, [9, 14], [15, 14]).px('#5a4636', [11, 16], [13, 16], [12, 17]).px('#f7a8c0', [7, 16], [17, 15]);
  },
  'mini-colgadin'(p) {
    const B = '#d8bb82', L = '#e8d3a2', D = '#b8975c';
    p.ell(4, 13, 2.6, 4.6, D).ell(20, 13, 2.6, 4.6, D).ell(12, 13, 8, 7, B).ell(10, 9, 4, 1.6, L);
    p.rect(8, 11, 2, 3, BLACK).rect(14, 11, 2, 3, BLACK).px('#fff', [8, 11], [14, 11]).rect(11, 14, 2, 2, BLACK).px('#5a4636', [9, 17], [10, 18], [11, 17], [12, 17], [13, 18], [14, 17]);
    p.px(BLACK, [12, 2], [12, 3], [12, 4], [12, 5]).ell(12, 1.5, 2, 1.5, '#6b3fa0');
  },
  crash(p) {
    const O = '#f08a24', S = '#f3d0a0', J = '#3f6fd0';
    p.ell(5, 6, 2.4, 1.5, O).ell(19, 6, 2.4, 1.5, O).ell(12, 8, 6, 5.5, O);
    p.px('#a8401c', [10, 1], [11, 2], [12, 1], [13, 2], [14, 1], [12, 2], [11, 3], [13, 3]);
    p.ell(12, 11, 4.8, 2.6, S).rect(11, 8, 3, 2, '#2b2320');
    p.rect(8, 5, 3, 2, '#fff').rect(14, 5, 3, 2, '#fff').px('#3f9f4f', [9, 6], [15, 6]);
    p.rect(9, 11, 7, 2, '#fff').rect(9, 13, 7, 1, '#c8402c');
    p.rect(9, 14, 6, 4, O).rect(6, 14, 3, 2, O).rect(15, 14, 3, 2, O).px(S, [5, 14], [18, 14]);
    p.rect(8, 18, 8, 3, J).rect(7, 21, 4, 2, '#e2574c').rect(13, 21, 4, 2, '#e2574c');
  },
  larva(p) {
    const G = '#9ec4a8', GL = '#c4e0c8', GD = '#6f9a80';
    p.ell(19, 20, 3.4, 2.6, G).ell(14, 19, 5, 3.6, G).ell(9, 16, 5, 4.6, G).ell(10, 9, 6.2, 6.2, G);
    p.ell(7, 8, 2.6, 4, GL).ell(13.5, 8, 2.2, 2.7, '#1a1412').px('#fff', [12, 7], [13, 6]);
    p.px(GD, [5, 13], [6, 14], [7, 15], [13, 17], [14, 18], [18, 19], [19, 20]);
  },
  spyro(p) {
    const V = '#8a4fc8', VD = '#5e2f96', Y = '#ffcc33', O = '#f0a020';
    p.ell(4, 11, 3.5, 5, O).ell(20, 11, 3.5, 5, O).px('#c87a10', [4, 9], [3, 12], [20, 9], [21, 12]);
    p.ell(12, 16, 5, 5, V).ell(12, 17, 2.8, 3.4, Y);
    p.ell(12, 9, 5.6, 4.6, V);
    p.line(9, 6, 6, 1, Y).line(10, 5, 7, 1, Y).line(15, 6, 18, 1, Y).line(14, 5, 17, 1, Y);
    p.rect(9, 8, 2, 2, '#fff').rect(14, 8, 2, 2, '#fff').px('#3f9f4f', [10, 9], [14, 9]).px(VD, [9, 7], [10, 7], [14, 7], [15, 7]);
    p.ell(12, 12, 3, 1.6, '#a26ae0').px(VD, [11, 12], [13, 12], [11, 14], [12, 14], [13, 13]);
    p.rect(8, 20, 3, 2, V).rect(13, 20, 3, 2, V).px(Y, [8, 21], [15, 21]);
  },
  socrates(p) {
    const B = '#6b4a2a', BD = '#4f3519', T = '#e8c890', W = '#fff';
    p.px(B, [5, 1], [6, 2], [6, 3], [7, 3], [18, 1], [17, 2], [17, 3], [16, 3]);
    p.ell(4.5, 17, 2.4, 4.6, BD).ell(19.5, 17, 2.4, 4.6, BD).ell(12, 17, 6.6, 6, B).ell(12, 18, 4.2, 4.6, T);
    for (let y = 15; y < 22; y += 2) for (let x = 9 + (y % 4 === 1 ? 1 : 0); x < 16; x += 2) p.px('#b08a50', [x, y]);
    p.ell(12, 8, 7.4, 6, B).ell(9, 8, 3, 3, W).ell(15, 8, 3, 3, W).rect(9, 7, 2, 2, BLACK).rect(14, 7, 2, 2, BLACK);
    p.px('#ffd23f', [11, 10], [12, 10], [13, 10], [12, 11]).px('#e2574c', [5, 11], [19, 11]);
    p.px('#3f8f6b', [9, 13], [10, 13], [10, 14], [14, 13], [15, 13], [14, 14], [11, 13], [13, 13]).px('#2a6b4e', [12, 13]);
    p.px('#ffd23f', [9, 23], [10, 23], [14, 23], [15, 23]);
  },
};
// ---------------------------------------------------------------- Iconos del interfaz (12x12) y sellos del álbum (16x16)
const D = '#3b3540';
function tri(p, x, y, c) { for (let i = 0; i < 4; i++) { p.rect(x, y + i, i + 1, 1, c); p.rect(x, y + 7 - i, i + 1, 1, c); } }
const ICONS = {
  coin: (p) => p.ell(6, 6, 4.6, 4.6, '#e8a820').ell(6, 6, 3.2, 3.2, '#ffe066').rect(6, 4, 1, 5, '#c98f1e'),
  sound_on: (p) => p.rect(1, 4, 2, 4, D).rect(3, 3, 1, 6, D).rect(4, 2, 1, 8, D).rect(5, 1, 1, 10, D).px('#3f8fd8', [7, 4], [8, 5], [8, 6], [7, 7], [9, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [10, 8], [9, 9]),
  sound_off: (p) => p.rect(1, 4, 2, 4, D).rect(3, 3, 1, 6, D).rect(4, 2, 1, 8, D).rect(5, 1, 1, 10, D).px('#e2574c', [7, 4], [8, 5], [9, 6], [10, 7], [10, 4], [9, 5], [8, 6], [7, 7]),
  menu: (p) => p.rect(1, 2, 10, 2, D).rect(1, 5, 10, 2, D).rect(1, 8, 10, 2, D),
  close: (p) => p.line(2, 2, 9, 9, D).line(3, 2, 9, 8, D).line(9, 2, 2, 9, D).line(8, 2, 2, 8, D),
  skip: (p) => { tri(p, 1, 2, D); tri(p, 5, 2, D); p.rect(9, 2, 2, 8, D); },
  undo: (p) => p.rect(3, 3, 6, 2, D).rect(8, 4, 2, 5, D).rect(4, 8, 5, 2, D).px(D, [3, 1], [2, 2], [1, 3], [1, 4], [2, 5], [3, 6], [3, 2], [2, 3], [2, 4], [3, 5]),
  reset: (p) => p.ell(6, 6.5, 4.6, 4.6, D).ell(6, 6.5, 2.6, 2.6, null).rect(6, 0, 4, 5, null).px(D, [6, 1], [6, 2], [6, 3], [6, 4], [7, 2], [7, 3], [8, 3]),
  arrow: (p) => { for (let i = 0; i < 5; i++) p.rect(5 - i, 1 + i, 2 + 2 * i, 1, D); p.rect(4, 6, 4, 5, D); },
  check: (p) => p.line(2, 6, 4, 9, '#3f9f4f').line(2, 7, 4, 10, '#3f9f4f').line(4, 9, 10, 2, '#3f9f4f').line(4, 10, 10, 3, '#3f9f4f'),
  box: (p) => p.rect(2, 2, 8, 8, '#fff6dc').rect(3, 3, 6, 6, '#f3e3b6'),
  paw: (p) => p.ell(6, 8, 3, 2.4, '#8a5a2a').ell(2.5, 5, 1.2, 1.4, '#8a5a2a').ell(5, 3, 1.2, 1.4, '#8a5a2a').ell(8, 3, 1.2, 1.4, '#8a5a2a').ell(10, 5.5, 1.1, 1.3, '#8a5a2a'),
  question: (p) => p.ell(6, 6, 5, 5, '#c9b88a').px(D, [4, 3], [5, 2], [6, 2], [7, 3], [7, 4], [6, 5], [6, 6], [6, 8]),
  ticket: (p) => p.rect(1, 3, 10, 6, '#f4f4ee').rect(1, 3, 3, 6, '#2a4fa0').px('#b0b0a8', [6, 5], [7, 5], [8, 5], [6, 7], [7, 7]).px(null, [4, 3], [4, 8]),
  mirror: (p) => p.rect(5, 7, 2, 5, '#c98f4e').ell(6, 4.5, 3.6, 3.6, '#d7eefb').px('#fff', [4, 3], [5, 2]),
  lock: (p) => p.rect(3, 2, 1, 4, '#8a8f9a').rect(8, 2, 1, 4, '#8a8f9a').rect(4, 1, 4, 1, '#8a8f9a').rect(2, 5, 8, 6, '#e8b820').px(D, [5, 7], [6, 7], [6, 8]),
  magnet: (p) => p.rect(2, 2, 3, 8, '#e2574c').rect(7, 2, 3, 8, '#e2574c').rect(2, 8, 8, 2, '#e2574c').rect(2, 2, 3, 2, '#f4f4ee').rect(7, 2, 3, 2, '#f4f4ee'),
  plus: (p) => p.rect(5, 2, 2, 8, '#3f9f4f').rect(2, 5, 8, 2, '#3f9f4f'),
  disc: (p) => p.ell(6, 6, 5, 5, '#2b2b33').ell(6, 6, 2, 2, '#e2574c').px('#fff', [6, 6]).px('#565a66', [3, 4], [4, 3]),
  music: (p) => p.rect(7, 1, 1, 8, D).px(D, [8, 1], [9, 2], [9, 3], [8, 2]).ell(5.5, 9, 2.2, 1.7, D),
  gift: (p) => p.rect(2, 5, 8, 6, '#e2574c').rect(1, 3, 10, 2, '#f06a5c').rect(5, 3, 2, 8, '#ffe066').px('#ffe066', [4, 2], [3, 1], [7, 2], [8, 1]),
  cake: (p) => p.rect(2, 6, 8, 5, '#f7a8c0').rect(2, 6, 8, 2, '#fff3dc').rect(6, 3, 1, 3, '#f4f4ee').px('#ffd23f', [6, 1], [6, 2]),
  taiyaki: (p) => p.ell(5, 6, 4, 3, '#d8963a').px('#d8963a', [9, 6], [10, 4], [10, 5], [10, 7], [10, 8]).px('#b06a20', [3, 5], [5, 7], [7, 5]).px('#2b2320', [3, 5]).px('#ffd27a', [4, 4], [6, 4]), // pez de masa
  mochi: (p) => p.rect(0, 7, 12, 4, '#c98f4e').ell(3, 6, 2.4, 2.2, '#f7a8c0').ell(8.5, 6, 2.4, 2.2, '#9fc86a').ell(6, 4, 2.4, 2.2, '#fff6ea').px('#ffffff', [2, 5], [7, 5], [5, 3]), // cajita con tres mochis
  sushi: (p) => p.rect(2, 6, 8, 4, '#f4f4ee').rect(1, 3, 10, 4, '#f08a5a').rect(2, 4, 8, 1, '#ffb48a').rect(5, 3, 2, 7, '#1f2a20'), // un nigiri (Sushi Go!)
  candy: (p) => p.ell(6, 6, 3, 3, '#f08a24').px('#ffb45a', [5, 5]).px('#3f9f4f', [1, 4], [1, 6], [2, 5], [2, 6], [2, 4], [10, 4], [10, 6], [9, 5], [9, 4], [9, 6]),
  book: (p) => p.rect(2, 1, 8, 10, '#2a4fa0').rect(3, 3, 5, 1, '#ffe066').rect(3, 5, 4, 1, '#ffe066').rect(9, 2, 1, 9, '#f4f4ee'),
  wrench: (p) => p.line(3, 9, 8, 4, '#8a8f9a').line(4, 9, 8, 5, '#8a8f9a').line(3, 8, 7, 4, '#8a8f9a').rect(7, 1, 3, 2, '#8a8f9a').rect(9, 3, 2, 3, '#8a8f9a').px(null, [9, 2]),
  note: (p) => p.rect(2, 1, 8, 10, '#fff6dc').rect(3, 3, 6, 1, '#6e4520').rect(3, 5, 5, 1, '#6e4520').rect(3, 7, 6, 1, '#6e4520'),
  // Sellos de los lugares del Libro de los Miausis
  sun: (p) => { p.ell(8, 8, 4, 4, '#ffd23f'); for (const [x, y] of [[8, 1], [8, 14], [1, 8], [14, 8], [3, 3], [12, 3], [3, 12], [12, 12]]) p.rect(x, y, 1, 1, '#f08a24').px('#f08a24', [x + (x < 8 ? 1 : x > 8 ? -1 : 0), y + (y < 8 ? 1 : y > 8 ? -1 : 0)]); },
  wave: (p) => { for (let x = 1; x < 15; x++) { const y = 8 + Math.round(Math.sin(x * 0.9) * 2); p.rect(x, y, 1, 14 - y, '#3f8fd8').px('#bfe3f7', [x, y]); } },
  mountain: (p) => { for (let i = 0; i < 10; i++) p.rect(8 - i * 0.7, 3 + i, 1 + i * 1.4, 1, i < 3 ? '#f4f8fb' : '#8a6a4a'); p.px('#e2574c', [8, 2], [7, 1], [9, 1]); },
  palm: (p) => p.rect(7, 6, 2, 8, '#8a5a2a').line(8, 5, 2, 3, '#3f9f4f').line(8, 5, 13, 3, '#3f9f4f').line(8, 5, 3, 8, '#3f9f4f').line(8, 5, 13, 8, '#3f9f4f').line(8, 4, 8, 1, '#3f9f4f').rect(3, 14, 10, 1, '#f0dc9c'),
  icecream: (p) => { p.ell(8, 5, 4, 4, '#f7a8c0').px('#fff', [6, 3]); for (let i = 0; i < 6; i++) p.rect(5 + i * 0.5, 8 + i, 6 - i, 1, '#d9a35a'); },
  stupa: (p) => { p.rect(7, 1, 2, 4, '#e8b820'); for (let i = 0; i < 6; i++) p.rect(7 - i, 5 + i, 2 + 2 * i, 1, '#e8b820'); p.rect(1, 11, 14, 3, '#c98f1e'); },
  flower: (p) => p.ell(8, 4, 2.5, 2.5, '#f06aa8').ell(4, 8, 2.5, 2.5, '#f06aa8').ell(12, 8, 2.5, 2.5, '#f06aa8').ell(8, 12, 2.5, 2.5, '#f06aa8').ell(8, 8, 2.2, 2.2, '#ffd23f'),
  column: (p) => p.rect(2, 1, 12, 2, '#d6d6cf').rect(2, 12, 12, 2, '#d6d6cf').rect(4, 3, 2, 9, '#b9b9b0').rect(7, 3, 2, 9, '#b9b9b0').rect(10, 3, 2, 9, '#b9b9b0'),
  tower: (p) => p.rect(4, 5, 3, 10, '#8a8f9a').rect(9, 5, 3, 10, '#8a8f9a').rect(5, 1, 1, 4, '#8a8f9a').rect(10, 1, 1, 4, '#8a8f9a').rect(7, 8, 2, 1, '#8a8f9a').px('#ffe066', [5, 7], [5, 10], [10, 8], [10, 11], [5, 13], [10, 13]),
  leaf: (p) => p.ell(8, 8, 5.5, 3.5, '#3f9f4f').line(2, 12, 13, 5, '#2a6b3a').px('#2a6b3a', [6, 7], [9, 9], [10, 6]),
  fish: (p) => p.ell(7, 8, 5, 3.2, '#f08a24').px('#f08a24', [12, 6], [13, 5], [13, 6], [12, 10], [13, 10], [13, 11], [12, 8]).rect(5, 5, 1, 6, '#fff').rect(8, 5, 1, 6, '#fff').px(BLACK, [4, 7]),
  pyramid: (p) => { for (let i = 0; i < 10; i++) p.rect(8 - i * 0.7, 3 + i, 1 + i * 1.4, 1, i % 3 === 2 ? '#cfa76a' : '#e9c98f'); p.rect(1, 13, 14, 1, '#f0dc9c'); },
  lantern: (p) => p.rect(7, 0, 2, 2, '#3b2a20').ell(8, 7, 4.5, 4.5, '#e2574c').rect(5, 2, 6, 1, '#e8b820').rect(5, 11, 6, 1, '#e8b820').rect(7, 3, 1, 8, '#b83b33').rect(7, 12, 2, 3, '#e8b820'),
  pagoda: (p) => { for (const [y, w] of [[2, 6], [6, 9], [10, 12]]) p.rect(8 - w / 2, y, w, 2, '#2f6b5a').rect(8 - w / 2 + 1.5, y + 2, w - 3, 2, '#c8402c'); p.rect(7, 0, 2, 2, '#e8b820').rect(2, 14, 12, 1, '#b9b9b0'); },
  cup: (p) => p.rect(4, 4, 8, 10, '#e8c898').rect(4, 4, 8, 2, '#fff').rect(3, 3, 10, 1, '#d7eefb').rect(9, 0, 1, 6, '#e2574c').px('#3b2a20', [5, 11], [7, 12], [9, 11], [6, 9], [10, 12]),
  arch: (p) => { p.rect(2, 2, 12, 12, '#e9c98f').ell(8, 9, 3.5, 4.5, '#3b2a20').rect(5, 9, 6, 5, '#3b2a20'); for (let x = 2; x < 14; x += 2) p.rect(x, 2, 1, 3, '#c8402c'); },
};
// Huella del botón de acción táctil: dibujada a mano, sin contorno y con un píxel de aire entre los deditos y la
// almohadilla (con el contorno y el filtro a blanco del botón, la huella de 12x12 quedaba hecha un borrón)
const PAW_BTN = [
  '....##....##....',
  '...####..####...',
  '...####..####...',
  '...####..####...',
  '....##....##....',
  '.##..........##.',
  '####........####',
  '####..####..####',
  '.##..######..##.',
  '....########....',
  '...##########...',
  '...##########...',
  '...##########...',
  '....###..###....',
];
function pawBtn() {
  const p = new PX(16, 14);
  PAW_BTN.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') p.px('#fff', [x, y]); }));
  return p;
}
const iconCache = {};
// Icono pixel (data URL) para el interfaz HTML: iconos propios o, si no, un objeto del juego (calcetín, sobre…)
export function icon(name) {
  if (!iconCache['i_' + name]) {
    const big = ['sun', 'wave', 'mountain', 'palm', 'icecream', 'stupa', 'flower', 'column', 'tower', 'leaf', 'fish', 'pyramid', 'lantern', 'pagoda', 'cup', 'arch'].includes(name);
    let p;
    if (name === 'pawbtn') p = pawBtn();
    else if (ICONS[name]) { p = new PX(big ? 16 : 12, big ? 16 : 12); ICONS[name](p); p.outline(INK); } else p = OBJ[name]();
    iconCache['i_' + name] = p.canvas().toDataURL();
  }
  return iconCache['i_' + name];
}
// Devuelve la imagen (data URL) de un regalo del gachapón, para usarla en el interfaz HTML
export function gachaIcon(id) {
  if (!iconCache[id]) { const p = new PX(24, 24); GACHA_ART[id](p); iconCache[id] = p.outline(INK).canvas().toDataURL(); }
  return iconCache[id];
}

export const WALKERS = ['colgadin', 'lolete', 'tigrito', 'cuy', 'patito', 'heladoncio', 'heladoncioh'];
export const NPCS = ['owito_m', 'owi_jos', 'owi_lel', 'owi_cas', 'owi_dor', 'owi_mor', 'owi_col', 'owi_cul', 'heladoncioh', 'fuxia', 'scooby', 'cuca', 'lolete', 'perrunfli', 'bart', 'mono', 'tigrito', 'ratita_p', 'ratita_o', 'ratita_b', 'kai', 'cuy',
  'peludito', 'mantecas', 'manteca2', 'patito', 'capybara', 'owito_w', 'owito_k', 'owito_v', 'owito_g', 'owito_c', 'owito_t', 'heladoncio', 'owinken', 'clon', 'owito_n', 'owito_r', 'owito_x', 'awawa', 'siri', 'ovejoncio', 'gato', 'gatot'];

export function makeTextures(scene) {
  const add = (key, cv) => { if (scene.textures.exists(key)) scene.textures.remove(key); scene.textures.addCanvas(key, cv); };
  for (const name of new Set([...WALKERS, ...NPCS])) {
    const dirs = WALKERS.includes(name) ? ['down', 'up', 'side'] : ['down'];
    for (const d of dirs) for (const f of [0, 1]) add(`${name}_${d}_${f}`, charFrame(name, d, f));
  }
  for (const k of Object.keys(OBJ)) add(k, OBJ[k]().canvas());
}
