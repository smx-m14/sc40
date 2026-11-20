// Guía de Super Cait's 40: dibuja los sprites y las «capturas» con el mismo código que el juego (js/art.js y
// js/maps.js), así la guía siempre se parece al juego aunque cambie el pixel art.
//   <img data-spr="colgadin_down_0" data-x="4">           sprite del juego, a 4 aumentos
//   <img data-icon="coin" data-x="3">                     icono del interfaz (o cualquier objeto de art.js)
//   <img data-map="castillo" data-rect="12,8,22,13">      trozo de mapa: x, y, ancho y alto en baldosas
//        data-col="18,14,down"                           (opcional) Colgadín en esa baldosa
//        data-flags="intro,invites"                      (opcional) progreso con el que se dibuja el mapa
// No toca la partida guardada: el estado se monta solo en memoria.
import { makeTextures, makeTiles, icon } from '../js/art.js';
import { buildMap, TILE } from '../js/maps.js';
import { State } from '../js/state.js';

const TEX = {};
makeTextures({ textures: { exists: () => false, remove() {}, addCanvas: (k, cv) => { TEX[k] = cv; } } });
const TILES = makeTiles();

// ---------------------------------------------------------------- sprites e iconos
for (const img of document.querySelectorAll('img[data-spr], img[data-icon]')) {
  const x = +(img.dataset.x || 4);
  let cv = null;
  if (img.dataset.spr) cv = TEX[img.dataset.spr];
  if (cv) img.src = cv.toDataURL();
  else if (img.dataset.icon) {
    img.src = icon(img.dataset.icon);
    cv = { width: 0, height: 0 };
    img.addEventListener('load', () => { img.style.width = img.naturalWidth * x * 0.25 + 'mm'; }, { once: true });
  }
  if (cv && cv.width) img.style.width = cv.width * x * 0.25 + 'mm'; // 1 píxel del juego = x × 0,25 mm en papel
  if (!cv) console.warn('Guía: no existe el sprite', img.dataset.spr || img.dataset.icon);
}

// ---------------------------------------------------------------- capturas de mapa
function snapshot(id, [x0, y0, w, h], col, flags) {
  const keep = State.d;
  State.d = JSON.parse(JSON.stringify(keep));
  for (const f of flags) if (f) State.d.flags[f] = true;
  const m = buildMap(id);
  const cv = document.createElement('canvas');
  cv.width = w * TILE; cv.height = h * TILE;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.translate(-x0 * TILE, -y0 * TILE);
  g.fillStyle = id === 'isla' || id === 'helada' ? '#3f8fd8' : '#1a1412';
  g.fillRect(x0 * TILE, y0 * TILE, w * TILE, h * TILE);
  // Suelo (igual que WorldScene.drawGround)
  const water = (x, y) => '~r'.includes(m.get(x, y));
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
    const c = m.tiles[y][x], px = x * TILE, py = y * TILE;
    if (water(x, y)) {
      g.drawImage(TILES['w' + ((x + y) % 2)], px, py);
      g.fillStyle = '#bfe3f7';
      if (y > 0 && !water(x, y - 1)) g.fillRect(px, py, 16, 2);
      if (y < m.h - 1 && !water(x, y + 1)) g.fillRect(px, py + 15, 16, 1);
      if (x > 0 && !water(x - 1, y)) g.fillRect(px, py, 1, 16);
      if (x < m.w - 1 && !water(x + 1, y)) g.fillRect(px + 15, py, 1, 16);
    } else g.drawImage(TILES[c] || TILES.g, px, py);
  }
  // Objetos y entidades, ordenados por profundidad como en el juego
  const items = m.objects.map((o, i) => ({ tex: o.tex, x: o.x, y: o.y, d: o.flat ? (o.top ? 1.5 : 1) : o.y + i * 1e-4 }));
  for (const e of m.ents) {
    if (e.when && !e.when()) continue;
    const tex = e.npc ? `${e.npc}_down_0` : e.texFn ? e.texFn() : e.tex;
    if (!tex) continue;
    const by = e.ty * TILE + 15;
    items.push({ tex, x: e.tx * TILE + 8 + (e.ox || 0), y: by + (e.oy || 0), d: by + (e.oy ? 2 : 0) });
  }
  if (col) items.push({ tex: `colgadin_${col[2] || 'down'}_0`, x: +col[0] * TILE + 8, y: +col[1] * TILE + 12, d: +col[1] * TILE + 12 });
  items.sort((a, b) => a.d - b.d);
  for (const it of items) {
    const t = TEX[it.tex];
    if (t) g.drawImage(t, Math.round(it.x - t.width / 2), Math.round(it.y - t.height));
  }
  State.d = keep;
  return cv;
}
for (const img of document.querySelectorAll('img[data-map]')) {
  try {
    const rect = img.dataset.rect.split(',').map(Number);
    const col = img.dataset.col ? img.dataset.col.split(',') : null;
    img.src = snapshot(img.dataset.map, rect, col, (img.dataset.flags || '').split(',')).toDataURL();
  } catch (e) { console.warn('Guía: no se pudo dibujar el mapa', img.dataset.map, e); }
}

// ---------------------------------------------------------------- tiras laterales y números de página
const STRIP = ['invites', 'sock_0', 'coin', 'cake', 'gift', 'sock_5', 'music', 'balloon'];
document.querySelectorAll('.page').forEach((pg, i) => {
  const n = i + 1;
  pg.dataset.n = n;
  if (pg.classList.contains('bare')) return;
  pg.classList.add(n % 2 ? 'odd' : 'even');
  const strip = document.createElement('div');
  strip.className = 'strip';
  for (let k = 0; k < 5; k++) {
    const im = document.createElement('img');
    im.src = icon(STRIP[(n + k * 3) % STRIP.length]);
    strip.appendChild(im);
  }
  pg.appendChild(strip);
  const foot = document.createElement('div');
  foot.className = 'num';
  foot.textContent = n;
  pg.appendChild(foot);
});
// Índice: números de página automáticos (<span data-ref="id-de-la-pagina">)
document.querySelectorAll('[data-ref]').forEach((s) => {
  const p = document.getElementById(s.dataset.ref);
  s.textContent = p ? p.dataset.n : '?';
});

// ?p=5-8 en la dirección: muestra solo esas páginas (para revisar o imprimir un trozo)
const range = new URLSearchParams(location.search).get('p');
if (range) {
  const [a, b = a] = range.split('-').map(Number);
  document.body.classList.add('solo');
  document.querySelectorAll('.page').forEach((pg) => { if (pg.dataset.n < a || pg.dataset.n > b) pg.style.display = 'none'; });
}
