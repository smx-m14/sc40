// Los «vídeos» de TikTok del móvil de Cait (js/scenes/movil.js): recreaciones en pixel art, dibujadas por código,
// de los vídeos de «Material Insipiración/Móvil». Cada uno es una lista de planos que se pinta en 90×160.
// user/text/tags/likes: lo que sale encima en TikTok (editable). dur: segundos.

const W = 90, H = 160;

// Pincel: dibuja en una rejilla propia (x, y en «píxeles de dibujo») con origen (ox, oy) y escala k, redondeando a
// píxeles de pantalla para que se vea nítido aunque la escala no sea entera.
function pen(c, ox = 0, oy = 0, k = 1) {
  const R = (x, y, w, h, col) => {
    const x0 = Math.round(ox + x * k), y0 = Math.round(oy + y * k), x1 = Math.round(ox + (x + w) * k), y1 = Math.round(oy + (y + h) * k);
    if (x1 > x0 && y1 > y0) { c.fillStyle = col; c.fillRect(x0, y0, x1 - x0, y1 - y0); }
  };
  return {
    r: R,
    // elipse rellena (centro, radios), fila a fila
    e(cx, cy, rx, ry, col) {
      for (let y = -ry; y <= ry; y += 1 / Math.max(1, k)) {
        const w = rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2));
        R(cx - w, cy + y, w * 2, 1 / Math.max(1, k) + 0.01, col);
      }
    },
  };
}
// Ruido fijo (siempre el mismo para la misma posición): moteado del granito, punto de la manta…
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
// Plano activo: shots = [[duración, fn(c, t, tLocal)]]
function cut(shots, c, t) {
  let t0 = 0;
  for (const [d, fn] of shots) { if (t < t0 + d) return fn(c, t, t - t0, d); t0 += d; }
  const [d, fn] = shots[shots.length - 1]; return fn(c, t, d, d);
}
const wob = (t, a = 1) => Math.round(Math.sin(t * 2.3) * a); // cámara en mano

// ------------------------------------------------------------ Perrito vampiro
const FUR = '#7a6450', FUR_D = '#5a4632', FUR_L = '#a8927a', CAPE = '#16141c', RED = '#b3202e', RED_D = '#7a1420';
// De frente, sentado. Rejilla 24×26. o: { blink, tilt, glint, wing (−1..1), mouth }
function dog(c, ox, oy, k, o = {}) {
  const p = pen(c, ox, oy, k), tl = o.tilt || 0, wg = Math.round((o.wing || 0) * 2);
  // alas de murciélago (detrás)
  p.r(0, 13 - wg, 4, 2, '#4a4a56'); p.r(1, 15 - wg, 3, 2, '#4a4a56'); p.r(0, 12 - wg, 1, 2, '#4a4a56');
  p.r(20, 13 - wg, 4, 2, '#4a4a56'); p.r(20, 15 - wg, 3, 2, '#4a4a56'); p.r(23, 12 - wg, 1, 2, '#4a4a56');
  // capa y chaleco
  p.e(12, 20, 9, 6, CAPE);
  p.r(4, 15, 2, 9, RED_D); p.r(18, 15, 2, 9, RED_D);
  p.e(12, 20, 5, 5.5, RED); p.r(11, 15, 2, 10, RED_D);
  p.r(11, 17, 2, 1, '#e8d080'); p.r(11, 20, 2, 1, '#e8d080');
  // cuello alto de la capa
  p.r(5, 13, 3, 3, CAPE); p.r(16, 13, 3, 3, CAPE); p.r(4, 12, 2, 2, RED); p.r(18, 12, 2, 2, RED);
  // patitas
  p.r(8, 24, 3, 2, FUR); p.r(13, 24, 3, 2, FUR); p.r(8, 25, 3, 1, FUR_D); p.r(13, 25, 3, 1, FUR_D);
  // cabeza (algo ladeada con tilt)
  const hx = tl;
  p.e(12 + hx, 8, 7, 6, FUR);
  for (let i = 0; i < 9; i++) p.r(5 + hx + i * 1.6, 12 + (i % 2), 1, 2, FUR_D); // flequillo de la barbilla
  p.e(12 + hx, 11, 3.6, 2.6, FUR_L);
  // capucha negra con las orejas por fuera
  p.r(5 + hx, 2, 14, 3, CAPE); p.r(4 + hx, 4, 16, 1, CAPE);
  p.r(5 + hx - (tl > 0 ? 1 : 0), -2, 3, 4, FUR_D); p.r(6 + hx, -3, 1, 1, FUR_D);
  p.r(16 + hx + (tl < 0 ? 1 : 0), -2, 3, 4, FUR_D); p.r(17 + hx, -3, 1, 1, FUR_D);
  p.r(6 + hx, -1, 1, 2, '#c08870'); p.r(17 + hx, -1, 1, 2, '#c08870');
  // ojos
  const ey = 7 + (tl ? 0 : 0);
  if (o.blink) { p.r(8 + hx, ey + 1, 3, 1, '#111'); p.r(14 + hx, ey + 1, 3, 1, '#111'); }
  else {
    p.r(8 + hx, ey, 3, 3, '#111'); p.r(14 + hx, ey, 3, 3, '#111');
    p.r(9 + hx, ey, 1, 1, o.glint ? '#ff3040' : '#fff'); p.r(15 + hx, ey, 1, 1, o.glint ? '#ff3040' : '#fff');
  }
  // nariz y boca (con colmillitos)
  p.r(11 + hx, 10, 3, 2, '#1a1414');
  if (o.mouth) { p.r(11 + hx, 12, 3, 1, '#5a1a1a'); p.r(11 + hx, 12, 1, 1, '#fff'); p.r(13 + hx, 12, 1, 1, '#fff'); }
  else { p.r(11 + hx, 12, 1, 1, '#fff'); p.r(13 + hx, 12, 1, 1, '#fff'); }
}
// De lado, andando (para los planos generales). Rejilla 20×14. f = fotograma 0/1
function dogSide(c, ox, oy, k, f, flip) {
  const p = pen(c, ox, oy, k), X = (x, w) => flip ? 20 - x - w : x;
  const R = (x, y, w, h, col) => p.r(X(x, w), y, w, h, col);
  R(2 + f, 11, 2, 3, FUR_D); R(14 - f, 11, 2, 3, FUR_D); R(5 - f, 11, 2, 3, FUR); R(11 + f, 11, 2, 3, FUR);
  R(2, 5, 13, 7, CAPE); R(3, 10, 11, 2, RED_D); R(0, 6 + f, 3, 2, CAPE); // la capa ondea
  R(13, 1, 6, 6, FUR); R(18, 4, 2, 2, FUR_L); R(19, 4, 1, 1, '#1a1414'); R(15, 3, 1, 1, '#111');
  R(13, 0, 6, 2, CAPE); R(13, -2, 2, 2, FUR_D); R(16, -2, 2, 2, FUR_D);
  R(4, 3 - f, 3, 2, '#4a4a56');
}

// Fondos
function hallway(c, t) {
  const p = pen(c, wob(t), 0);
  p.r(-2, 0, 94, 60, '#efe8dc');
  p.r(-2, 0, 30, 58, '#8a5a34'); p.r(0, 4, 12, 22, '#9c6a40'); p.r(14, 4, 12, 22, '#9c6a40'); p.r(0, 30, 26, 24, '#9c6a40');
  p.r(10, 14, 2, 4, '#e8d080'); p.r(15, 14, 2, 4, '#e8d080'); p.r(12, 40, 3, 2, '#e8d080');
  p.r(36, 0, 8, 62, '#f8f4ee'); p.r(62, 0, 26, 58, '#8a5a34'); p.r(64, 4, 22, 22, '#9c6a40'); p.r(64, 30, 22, 24, '#9c6a40');
  p.r(-2, 58, 94, 102, '#b07a48');
  for (let y = 62; y < 160; y += 9) p.r(-2, y, 94, 1, '#9a6a3c');
  // alfombra estampada
  p.r(-2, 96, 94, 64, '#7a2028');
  for (let y = 98; y < 160; y += 6) for (let x = (y / 6) % 2 ? 0 : 3; x < 92; x += 6) { p.r(x, y, 2, 2, '#e8d8b0'); p.r(x + 1, y + 2, 2, 1, '#2a3a6a'); }
  p.r(-2, 96, 94, 2, '#e8d8b0');
}
function bedroom(c, t) {
  const p = pen(c, wob(t), wob(t + 1));
  p.r(-2, -2, 94, 80, '#e8e0d4');
  p.r(2, -2, 22, 80, '#f6f2ea'); p.r(5, 4, 16, 24, '#ece6dc'); p.r(5, 34, 16, 30, '#ece6dc'); // puerta
  p.r(70, 6, 22, 40, '#bcd8ec'); p.r(70, 6, 22, 2, '#fff'); p.r(80, 6, 1, 40, '#fff');   // ventana
  // abrigo colgado con bufanda amarilla
  p.r(36, 0, 18, 38, '#1e2230'); p.r(34, 6, 4, 26, '#262a3a'); p.r(52, 6, 4, 26, '#262a3a');
  p.r(42, 4, 6, 24, '#e8b020'); p.r(43, 26, 4, 8, '#e8b020');
  p.r(20, 44, 22, 18, '#d8d4cc'); p.r(60, 40, 26, 22, '#3a4a3a'); // cojines
  // manta de punto
  p.r(-2, 58, 94, 104, '#c8c4bc');
  for (let y = 60; y < 162; y += 3) for (let x = (y % 2) * 2; x < 92; x += 4) p.r(x, y, 2, 1, '#b4b0a8');
}
function living(c, t) {
  const p = pen(c, wob(t), 0);
  p.r(-2, 0, 94, 92, '#ece4d4');
  p.r(28, 14, 18, 12, '#e8873a'); p.r(30, 18, 14, 2, '#7a4a20'); p.r(30, 20, 14, 2, '#82cc6a'); p.r(29, 14, 16, 4, '#f0a850'); // cartel de hamburguesa
  p.r(52, 12, 10, 14, '#2b2320'); p.r(53, 13, 8, 12, '#f4f0e8'); p.r(66, 16, 8, 10, '#2b2320'); p.r(67, 17, 6, 8, '#c8d8e8');
  p.r(-2, 50, 70, 26, '#b8b4ac'); p.r(-2, 44, 70, 10, '#c8c4bc'); p.r(60, 46, 10, 30, '#a8a49c'); // sofá
  p.r(70, 10, 22, 52, '#d8e4ec');
  p.r(-2, 76, 94, 84, '#b8804c');
  for (let x = -2; x < 92; x += 11) p.r(x, 76, 1, 84, '#a06c3c');
  p.r(6, 90, 60, 18, '#c8b8a0'); p.r(8, 92, 56, 14, '#8a5a50');
}

const DOG = {
  user: '@cine_con_colmillos', text: 'Version del director', tags: '#vampiro', likes: '40,4K', dur: 30,
  draw(c, t) {
    cut([
      [4, (c, T, s) => { hallway(c, T); const x = lerp(-24, 96, s / 4); dogSide(c, x, 66, 2, Math.floor(T * 8) % 2, false); }],
      [7, (c, T, s) => { bedroom(c, T); dog(c, 9, 52, 3, { blink: s % 3 > 2.8, tilt: s > 3 && s < 5 ? 1 : 0, wing: Math.sin(T * 6) * 0.5 }); }],
      [3, (c, T, s) => { living(c, T); dog(c, 38, 70, 0.8, { wing: Math.sin(T * 8) }); }],
      [7, (c, T, s) => {
        bedroom(c, T);
        const k = lerp(3, 3.6, s / 7), x = 45 - 12 * k;
        dog(c, x, 52 - (k - 3) * 22, k, { glint: s > 4.5 && s < 6.2, mouth: s > 5, blink: s > 1.6 && s < 1.8, tilt: s > 2.5 && s < 4 ? -1 : 0, wing: Math.sin(T * 5) * 0.6 });
        if (s > 4.5 && s < 6.2 && Math.floor(T * 10) % 2) { c.fillStyle = 'rgba(160,0,20,.18)'; c.fillRect(0, 0, W, H); }
      }],
      [5, (c, T, s) => { living(c, T); const k = lerp(0.8, 2.8, s / 5); dog(c, 45 - 12 * k, lerp(70, 64, s / 5), k, { wing: Math.sin(T * 12), mouth: true }); }],
      [4, (c, T, s) => { // la capa tapa la cámara
        living(c, T); dog(c, 45 - 12 * 2.8, 64, 2.8, { mouth: true, wing: 1 });
        const h = Math.round(lerp(0, H + 10, (s - 0.8) / 1.2)); c.fillStyle = CAPE; c.fillRect(0, 0, W, h); c.fillStyle = RED_D; c.fillRect(0, h - 3, W, 3);
        if (s > 2.4) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
      }],
    ], c, t);
  },
};

// ------------------------------------------------------------ Chinchillas country
const GREY = ['#8a8a94', '#6e6e78', '#b4b4bc'], WHITE = ['#ecebe6', '#cfcdc6', '#ffffff'];
// Chinchilla de frente. Rejilla 30×28. o: { pal, hat, glasses, blink, ear }
function chin(c, ox, oy, k, o = {}) {
  const p = pen(c, ox, oy, k), [b, d, l] = o.pal || GREY, ea = o.ear || 0;
  // orejas grandes
  p.e(7, 5 + ea, 5, 6, d); p.e(7, 5 + ea, 3.4, 4.4, '#e8b0b4');
  p.e(23, 5 - ea, 5, 6, d); p.e(23, 5 - ea, 3.4, 4.4, '#e8b0b4');
  // cuerpo y cara (bola de pelo)
  p.e(15, 19, 13, 10, b); p.e(15, 13, 10, 8, b); p.e(15, 22, 8, 6, l);
  // ojos
  if (o.glasses) { p.r(6, 10, 8, 4, '#111'); p.r(16, 10, 8, 4, '#111'); p.r(14, 11, 2, 1, '#111'); p.r(7, 10, 2, 1, '#666'); p.r(17, 10, 2, 1, '#666'); }
  else if (o.blink) { p.r(8, 12, 4, 1, '#111'); p.r(18, 12, 4, 1, '#111'); }
  else { p.e(10, 12, 2, 2.4, '#111'); p.e(20, 12, 2, 2.4, '#111'); p.r(9, 11, 1, 1, '#fff'); p.r(19, 11, 1, 1, '#fff'); }
  // nariz, bigotes
  p.r(14, 16, 2, 1, '#d88890'); p.r(14, 17, 1, 1, d); p.r(15, 17, 1, 1, d);
  for (const y of [15, 17]) { p.r(2, y, 9, 1, l); p.r(19, y, 9, 1, l); }
  // patitas
  p.r(9, 27, 4, 2, l); p.r(17, 27, 4, 2, l);
  if (o.hat) hat(c, ox + 3 * k, oy - 6 * k, k);
}
// Sombrero vaquero rojo. Rejilla 24×10
function hat(c, ox, oy, k) {
  const p = pen(c, ox, oy, k);
  p.e(12, 8, 12, 2.2, '#b01822'); p.e(12, 7.5, 11, 1.6, '#e0202c');
  p.r(5, 1, 14, 7, '#e0202c'); p.r(6, 0, 12, 2, '#e0202c'); p.r(11, 0, 2, 3, '#b01822'); p.r(5, 5, 14, 2, '#8a1018');
  p.r(6, 1, 2, 4, '#f05058');
}
function counter(c, t, y0 = 96, wall = '#f2ede4') {
  const p = pen(c, wob(t), 0);
  p.r(-2, 0, 94, y0, wall);
  p.r(-2, y0, 94, H - y0, '#d8d4cc');
  for (let y = y0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const h = hash(x, y); if (h > 0.62) p.r(x, y, 1 + (h > 0.9), 1, h > 0.85 ? '#3a3836' : h > 0.75 ? '#8a8680' : '#f8f6f2'); }
}
function card(c, x, y, horiz) {
  const w = horiz ? 10 : 7, h = horiz ? 7 : 10;
  c.fillStyle = '#fff'; c.fillRect(x, y, w, h); c.fillStyle = '#c0202a'; c.fillRect(x + 1, y + 1, w - 2, h - 2);
  c.fillStyle = '#e86068'; for (let i = 0; i < w - 2; i += 2) c.fillRect(x + 1 + i, y + 1 + (i % 4 ? 1 : 0), 1, 1);
}
function caption(c, lines, y, text) {
  const wd = Math.max(...lines.map((l) => text.w(l))) + 6;
  c.fillStyle = '#fff'; c.fillRect(Math.round((W - wd) / 2), y, wd, lines.length * 7 + 3);
  lines.forEach((l, i) => text.draw(l, Math.round((W - text.w(l)) / 2), y + 2 + i * 7, '#111'));
}

const CHIN = {
  user: '@chinchilla_country', text: 'Etiqueta a otro fan', tags: '#chinchilla #country', likes: '1,9M', dur: 28,
  draw(c, t, text) {
    const cap = (c) => caption(c, ['MIS CHINCHILLAS TRAS', 'ESCUCHAR EL DISCO', 'COUNTRY UNA VEZ'], 66, text);
    cut([
      [3.5, (c, T, s) => { // tocando la guitarrita
        const p = pen(c, wob(T), 0); p.r(-2, 0, 94, 160, '#c8a070'); for (let y = 0; y < 160; y += 8) p.r(-2, y, 94, 1, '#a88050');
        chin(c, 8, 30, 2.4, {});
        const g = pen(c, 4 + wob(T), 70, 2); g.e(12, 10, 10, 7, '#c88040'); g.e(12, 10, 2.5, 2.5, '#3a2010'); g.r(20, 8, 18, 3, '#6a4020');
        for (let i = 0; i < 3; i++) g.r(10, 8 + i, 28, 0.5, '#f0e0c0');
        g.r(7 + Math.round(Math.sin(T * 18)), 3, 4, 3, GREY[2]); // la pata que rasguea
        cap(c);
      }],
      [3, (c, T, s) => { counter(c, T, 110, '#3a3a40'); const p = pen(c, 18 + wob(T), 50, 2.2); p.e(12, 16, 12, 12, GREY[1]); p.e(12, 14, 10, 10, GREY[0]); hat(c, 20 + wob(T), 34, 2.2); cap(c); }],
      [3.5, (c, T, s) => { // el bajo rojo
        const p = pen(c, wob(T), 0); p.r(-2, 0, 94, 160, '#c8a070');
        p.e(45, 40, 50, 40, GREY[1]); p.e(45, 46, 44, 30, GREY[0]);
        p.r(-2, 92, 94, 30, '#e02030'); p.r(-2, 92, 94, 3, '#ff5060'); p.r(-2, 118, 94, 4, '#a01020');
        for (let i = 0; i < 4; i++) p.r(-2, 98 + i * 5 + (Math.floor(T * 20) % 2 && i === 1 ? 1 : 0), 94, 1, '#e8e8e8');
        p.r(20 + Math.round(Math.sin(T * 9) * 3), 86, 8, 10, GREY[2]); p.r(56, 88, 8, 10, GREY[2]);
      }],
      [3.5, (c, T, s) => { counter(c, T, 104, '#e8e6e2'); chin(c, 12, 56, 2.2, { pal: WHITE, hat: true, ear: Math.round(Math.sin(T * 4)), blink: s > 2 && s < 2.15 }); }],
      [4, (c, T, s) => { // con las cartas: farol
        counter(c, T, 120, '#dad4c8');
        chin(c, 6, 40, 2.6, { hat: true, blink: s > 3 && s < 3.15 });
        for (let i = 0; i < 5; i++) { const x = 4 + i * 12, y = 128 - Math.abs(i - 2) * 3; c.fillStyle = '#fff'; c.fillRect(x, y, 14, 22); c.fillStyle = '#c0202a'; c.fillRect(x + 2, y + 2, 10, 18); c.fillStyle = '#fff'; c.fillRect(x + 6, y + 9, 2, 4); }
      }],
      [4.5, (c, T, s) => { // en el coche de juguete con gafas de sol
        const sc = (T * 30) % 120, p = pen(c, 0, 0);
        p.r(0, 0, W, 90, '#cfe0ec'); p.r(0, 60, W, 30, '#9aa4b0');
        for (let i = 0; i < 4; i++) p.r(((i * 40 - sc) % 160 + 160) % 160 - 40, 40, 22, 20, '#b8c4d0');
        counter(c, T, 104, 'rgba(0,0,0,0)');
        const by = Math.round(Math.abs(Math.sin(T * 9)) * 2);
        chin(c, 22, 44 - by, 1.6, { glasses: true });
        const q = pen(c, 8, 82 - by, 1); q.r(0, 0, 74, 26, '#e02030'); q.r(0, 0, 74, 3, '#ff5a64'); q.r(6, 14, 62, 9, '#f4f4f4');
        for (let i = 0; i < 12; i++) q.r(8 + i * 5, 15, 2, 7, '#2a2a2a');
        q.e(8, 8, 5, 5, '#fff'); q.e(8, 8, 3.5, 3.5, '#ffe066'); q.e(66, 8, 5, 5, '#fff'); q.e(66, 8, 3.5, 3.5, '#ffe066');
        q.r(4, 26, 10, 4, '#222'); q.r(60, 26, 10, 4, '#222');
      }],
      [6, (c, T, s) => { // la blanca revolcándose entre las cartas
        const p = pen(c, wob(T), 0); p.r(-2, 0, 94, 160, '#efeae2'); p.r(4, 20, 82, 130, '#1e1e24');
        for (let i = 0; i < 22; i++) card(c, 8 + Math.round(hash(i, 1) * 66), 26 + Math.round(hash(i, 2) * 112), hash(i, 3) > 0.5);
        const a = T * 3, x = 45 + Math.cos(a) * 10, y = 84 + Math.sin(a * 1.3) * 16;
        const q = pen(c, x - 16, y - 12, 1.1); q.e(15, 12, 15, 11, WHITE[1]); q.e(15, 11, 13, 9, WHITE[0]); q.e(5 + Math.sin(a) * 3, 6, 4, 5, WHITE[1]); q.e(5 + Math.sin(a) * 3, 6, 2.6, 3.4, '#e8b0b4');
        for (let i = 0; i < 4; i++) { const k = (T * 2 + i / 4) % 1; card(c, Math.round(x + Math.cos(i * 2) * 18 * k), Math.round(y - 30 * k + 30 * k * k), i % 2); } // cartas por los aires
        for (let i = 0; i < 8; i++) { c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(Math.round(x + (hash(i, Math.floor(T * 8)) - 0.5) * 40), Math.round(y + (hash(i + 9, Math.floor(T * 8)) - 0.5) * 30), 1, 1); } // polvo
      }],
    ], c, t);
  },
};

export const MOVIL_CLIPS = [DOG, CHIN];
