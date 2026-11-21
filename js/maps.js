// Definición de mapas. Sin dependencias de Phaser para poder validarlos con Node.
// Baldosas: ~ mar · r río · g/G/f hierba · s arena · p camino · b puente/muelle · t piedra · a asfalto
//           h escaleras · q muro del templo · n campo de nabos
//           C/i/c castillo · o suelo de madera · W pared · x vacío
import { rng } from './art.js';
import { State, SOCK_DESIGN } from './state.js';

export const TILE = 16;
const SOLID_TILES = '~rCicWVxqLYZ';

function base(id, name, w, h, fill) {
  const m = {
    id, name, w, h, music: 'isla', regions: [], objects: [], ents: [],
    tiles: Array.from({ length: h }, () => new Array(w).fill(fill)),
    block: Array.from({ length: h }, () => new Array(w).fill(false)), // ocupado por objetos
    set(x, y, c) { if (x >= 0 && y >= 0 && x < w && y < h) this.tiles[y][x] = c; },
    get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? this.tiles[y][x] : 'x'; },
    fill(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c); },
    // Objeto decorativo: (tx,ty) esquina superior izquierda de su huella sólida de w×h baldosas.
    obj(tex, tx, ty, fw = 1, fh = 1, o = {}) {
      if (o.when && !o.when()) return; // objeto condicional: el mapa se reconstruye al entrar
      this.objects.push({ tex, x: (tx + fw / 2) * TILE, y: (ty + fh) * TILE, flat: !!o.flat });
      if (!o.flat) for (let y = ty; y < ty + fh; y++) for (let x = tx; x < tx + fw; x++) this.block[y][x] = true;
      for (const [x, y] of o.open || []) this.block[y][x] = false;
    },
    // Decoración que no bloquea el paso (juncos, banderines…)
    deco(tex, tx, ty) { this.objects.push({ tex, x: (tx + 0.5) * TILE, y: (ty + 1) * TILE }); },
    ent(e) { this.ents.push(e); return e; },
    wallAt(x, y) { return x < 0 || y < 0 || x >= w || y >= h || SOLID_TILES.includes(this.tiles[y][x]); },
    solidAt(x, y) { return x < 0 || y < 0 || x >= w || y >= h || SOLID_TILES.includes(this.tiles[y][x]) || this.block[y][x]; },
  };
  return m;
}

// Calcetín desparejado (se recoge al pisarlo)
// Escondido: en una casilla con un árbol o mueble justo delante, que lo tapa casi entero; ox lo deja asomar a un lado
function sock(m, id, tx, ty, ox = 0) {
  m.ent({ id, kind: 'step', tex: 'sock_' + SOCK_DESIGN[id], tx, ty, ox, script: 'sock', when: () => !State.d.socks.includes(id) });
}

// ---------------------------------------------------------------- Isla de Cait
function isla() {
  const W = 64, H = 44, m = base('isla', 'Isla de Cait', W, H, '~');
  const r = rng(40);

  // Tierra con borde irregular y playa
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = Math.min(x - 5, 58 - x, y - 4, 39 - y) + Math.sin(x * 0.31 + 1) * 1.2 + Math.cos(y * 0.43) * 1.2 + Math.sin((x + y) * 0.17) * 0.8;
    const corner = Math.hypot(Math.max(11 - x, 0, x - 52), Math.max(10 - y, 0, y - 33));
    if (edge < 0 || corner > 6.5) continue;
    m.set(x, y, edge < 1.8 ? 's' : r() < 0.05 ? 'f' : r() < 0.4 ? 'G' : 'g');
  }

  // Castillo de Mazapán
  m.fill(43, 16, 57, 23, 'C'); m.fill(43, 24, 57, 24, 'i'); m.fill(43, 25, 57, 27, 'c');
  m.fill(42, 28, 57, 31, 'g');
  // Aeropuerto
  m.fill(7, 34, 21, 36, 'a');
  // Templo de los Sabios: recinto amurallado sobre una plataforma con escalinata
  m.fill(27, 9, 35, 15, 'q'); m.fill(28, 10, 34, 14, 't'); m.fill(30, 15, 32, 15, 't');
  m.fill(30, 16, 32, 17, 'h');
  // Campo de nabos
  m.fill(19, 24, 23, 26, 'n');

  // Kapadokya: la tierra clara al sur del castillo, con sus chimeneas de hadas
  for (let y = 33; y <= 38; y++) for (let x = 42; x <= 57; x++) if (!'~r'.includes(m.get(x, y))) m.set(x, y, 'd');

  // Estanque y río
  for (let y = 11; y <= 15; y++) for (let x = 36; x <= 39; x++) if (Math.hypot(x - 37.5, y - 13) < 1.9) m.set(x, y, 'r');
  const pts = [[37, 14], [36, 19], [33, 24], [30, 29], [27, 34], [26, 42]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    for (let t = 0; t <= 1; t += 0.02) {
      const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
      for (const xx of [x, x + 1]) if (m.get(xx, y) !== '~') m.set(xx, y, 'r');
    }
  }

  // Caminos (sobre el agua se convierten en puente)
  const path = (x0, y0, x1, y1) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      m.set(x, y, '~r'.includes(m.get(x, y)) ? 'b' : 'p');
    }
  };
  path(22, 11, 22, 21); path(11, 21, 40, 21); path(11, 18, 11, 21);
  path(9, 12, 22, 12); path(9, 9, 9, 12); path(1, 9, 9, 9);
  path(17, 21, 17, 32); path(13, 32, 51, 32); path(13, 30, 13, 32); path(15, 32, 15, 33);
  path(31, 18, 31, 21); path(34, 31, 34, 32);
  path(40, 12, 40, 32); path(40, 12, 46, 12); path(46, 10, 46, 12);
  path(50, 28, 51, 32);
  path(15, 11, 15, 12); path(15, 18, 15, 21);           // casas de vecinos
  path(21, 30, 21, 32); path(25, 30, 25, 32);
  path(22, 17, 26, 17);                                 // restaurante
  path(17, 25, 18, 25);                                 // campo de nabos
  path(36, 26, 40, 26);                                 // embarcadero (donde antes estaba el gimnasio)

  // Edificios y decorado
  m.obj('house_cait', 21, 9, 3, 2, { open: [[22, 10]] });
  m.obj('house_lolete', 10, 16, 3, 2, { open: [[11, 17]] });
  // Tienda de cómics «Doki Doki Manga», enfrente del Biang Biang (al otro lado del camino), con su caminito
  m.obj('comics', 18, 15, 3, 2);
  path(18, 17, 21, 17); // delante de toda la fachada, como en el Biang Biang
  for (const tx of [18, 19, 20]) m.ent({ id: 'comics' + tx, tx, ty: 16, script: 'comics' });
  m.obj('house_fuxia', 12, 28, 3, 2, { open: [[13, 29]] });
  m.obj('house_a', 14, 9, 3, 2);
  m.obj('house_b', 14, 16, 3, 2);
  m.obj('house_law', 20, 28, 3, 2);
  m.obj('house_c', 24, 28, 3, 2);
  m.obj('hall', 29, 10, 5, 1);
  m.obj('censer', 31, 12);
  m.obj('lantern', 28, 14); m.obj('lantern', 34, 14);
  m.obj('paifang', 30, 15, 3, 1, { open: [[31, 15]] });
  m.obj('biang', 23, 15, 4, 2);
  for (const [x, y] of [[43, 34], [48, 35], [52, 34], [55, 35], [44, 36], [50, 37], [54, 37]]) m.obj('chimney', x, y);
  for (const [x, y] of [[47, 33], [53, 33], [45, 37]]) m.objects.push({ tex: 'balloon', x: x * TILE + 8, y: y * TILE - 26 });
  for (const [x, y] of [[49, 34], [51, 36], [46, 36], [53, 35]]) m.objects.push({ tex: 'burrow', x: x * TILE + 8, y: y * TILE + 14, flat: true, top: true });
  m.obj('paellera', 25, 26, 2, 1); m.obj('saco', 26, 24); m.obj('saco', 27, 24); m.obj('saco', 27, 25);   // la paella de Perrunfli
  m.obj('combini', 33, 29, 4, 2);
  m.obj('cone', 33, 31);
  m.obj('terminal', 8, 32, 4, 2);
  m.obj('plane', 16, 36, 3, 1);
  m.obj('mountain', 44, 7, 4, 3, { open: [[46, 9]] });
  m.obj('gate', 50, 27, 2, 1);
  const works = { when: () => !State.flag('gateOpen') }; // andamios hasta que Peludito abre la puerta
  m.obj('scaffold', 49, 27, 4, 1, works);
  m.obj('cone', 52, 28, 1, 1, works); m.obj('cone', 49, 29, 1, 1, works);

  // Entidades
  const S = State;
  m.ent({ id: 'door_cait', kind: 'step', tx: 22, ty: 10, script: 'enterCait' });
  m.ent({ id: 'door_lolete', kind: 'step', tx: 11, ty: 17, script: 'doorLolete' });
  m.ent({ id: 'door_fuxia', kind: 'step', tx: 13, ty: 29, script: 'doorFuxia' });
  m.ent({ id: 'fuxia', npc: 'fuxia', tx: 15, ty: 30, solid: true, script: 'fuxia' });
  m.ent({ id: 'scooby', npc: 'scooby', tx: 30, ty: 12, solid: true, script: 'scooby', spirit: true });
  m.ent({ id: 'cuca', npc: 'cuca', tx: 32, ty: 12, solid: true, script: 'cuca', spirit: true });
  m.ent({ id: 'cuy_templo', npc: 'cuy', tx: 33, ty: 12, solid: true, script: 'cuca', when: () => S.flag('cuyTemple') });
  m.ent({ id: 'biang', tx: 24, ty: 16, script: 'biang' });
  m.ent({ id: 'perrunfli', npc: 'perrunfli', tx: 24, ty: 25, solid: true, script: 'perrunfli' });
  m.ent({ id: 'door_a', tx: 15, ty: 10, script: 'houseA' });
  m.ent({ id: 'door_b', tx: 15, ty: 17, script: 'houseB' });
  m.ent({ id: 'door_law', tx: 21, ty: 29, script: 'houseLaw' });
  m.ent({ id: 'door_c', tx: 25, ty: 29, script: 'houseC' });
  m.ent({ id: 'sign_law', tex: 'sign', tx: 23, ty: 30, solid: true, script: 'signLaw' });
  m.ent({ id: 'combini_door', tx: 34, ty: 30, script: 'combini' });
  m.ent({ id: 'gatolleta_l', tx: 35, ty: 30, script: 'gatolleta' });
  m.ent({ id: 'gatolleta_r', tx: 36, ty: 30, script: 'gatolleta' });
  m.ent({ id: 'gachapon', tex: 'gachapon', tx: 37, ty: 30, solid: true, script: 'gachapon' });
  m.ent({ id: 'kiosk', tex: 'kiosk', tx: 12, ty: 33, solid: true, script: 'aeroflot' });
  m.ent({ id: 'plane', tx: 17, ty: 36, script: 'plane' });
  m.ent({ id: 'gate_l', tx: 50, ty: 27, script: 'gate' });
  m.ent({ id: 'gate_r', tx: 51, ty: 27, script: 'gate' });
  m.ent({ id: 'rubble', tex: 'rubble', tx: 46, ty: 10, solid: true, script: 'rubble', when: () => !S.flag('caveOpen') });
  m.ent({ id: 'cave', kind: 'step', tx: 46, ty: 9, script: 'cave' });
  // Los monos cortan el camino del bosque hasta que se rescata a Tigrito
  m.ent({ id: 'monos', npc: 'mono', tx: 42, ty: 12, solid: true, script: 'monos', when: () => !S.flag('tigrito') });
  m.ent({ id: 'monos2', npc: 'mono', tx: 43, ty: 12, solid: true, script: 'monos', when: () => !S.flag('tigrito') });
  m.ent({ id: 'sign_cross', tex: 'sign', tx: 23, ty: 20, solid: true, script: 'signCross' });
  m.ent({ id: 'narwal', tex: 'narwal', tx: 4, ty: 10, ox: -8, oy: 6, solid: true, script: 'narwal', bob: true, when: () => S.flag('narwal') });
  m.ent({ id: 'siri', npc: 'siri', tx: 46, ty: 34, solid: true, script: 'siri' });
  m.ent({ id: 'awawa1', npc: 'awawa', tx: 50, ty: 35, solid: true, script: 'awawa' });
  m.ent({ id: 'awawa2', npc: 'awawa', tx: 52, ty: 36, solid: true, script: 'awawa' });
  m.ent({ id: 'sign_dock', tex: 'sign', tx: 10, ty: 10, solid: true, script: 'signDock' });
  m.ent({ id: 'sign_castle', tex: 'sign', tx: 48, ty: 31, solid: true, script: 'signCastle' });
  m.ent({ id: 'sign_temple', tex: 'sign', tx: 33, ty: 18, solid: true, script: 'signTemple' });
  // Cada calcetín está justo detrás de un árbol, roca o chimenea (que lo tapa casi entero). Los árboles se reparten
  // al azar según lo construido: si se cambia el mapa, comprobar que siguen teniendo algo delante.
  sock(m, 's1', 9, 25, 6); sock(m, 's2', 40, 5, -6); sock(m, 's3', 55, 14, 6); sock(m, 's4', 39, 35, -6);
  sock(m, 's11', 7, 12, 6); sock(m, 's18', 54, 36, -7); /* la pareja del calcetín de los awawas (s12, que dan ellos) */ sock(m, 's20', 57, 30, -6);

  // Árboles: bosque denso al noreste y sueltos por el resto, sin tapar caminos ni entidades
  const keep = new Set();
  const k = (x, y) => keep.add(x + ',' + y);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if ('pbtahnq'.includes(m.tiles[y][x]) || m.block[y][x]) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) k(x + i, y + j);
  }
  // los calcetines no apartan árboles: así el reparto de árboles no depende de dónde se escondan
  for (const e of m.ents) if (!/^s\d+$/.test(e.id)) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) k(e.tx + i, e.ty + j);
  for (let y = 22; y <= 29; y++) for (let x = 42; x <= 57; x++) k(x, y);
  // Pasillo cerrado de árboles: a la cueva solo se llega por el camino del bosque
  for (let x = 41; x <= 45; x++) m.obj('tree', x, 11);
  for (let x = 41; x <= 47; x++) m.obj(x < 45 ? 'rock' : 'tree', x, 13); // rocas bajas: no tapan a quien va por el camino
  for (const y of [10, 11, 12]) m.obj('tree', 47, y);
  m.obj('tree', 45, 10);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const c = m.tiles[y][x];
    if (!'gGf'.includes(c) || m.block[y][x] || keep.has(x + ',' + y)) continue;
    const forest = x >= 38 && y <= 15;
    if (r() < (forest ? 0.5 : 0.07)) m.obj('tree', x, y);
    else if (!forest && r() < 0.012) m.obj('rock', x, y);
  }

  // Decorado añadido después del reparto de árboles (así no cambia dónde caen y los calcetines siguen tapados)
  const clear = (x, y) => {
    m.objects = m.objects.filter((o) => !((o.tex === 'tree' || o.tex === 'rock') && Math.floor(o.x / TILE) === x && Math.floor(o.y / TILE) - 1 === y));
    m.block[y][x] = false;
  };
  const extra = (tex, x, y) => { clear(x, y); m.obj(tex, x, y); };
  // Entrada de casa de Cait: macetitas y el cartel con su nombre
  extra('pot_r', 20, 10); extra('pot_y', 24, 10); extra('pot_p', 21, 11); extra('pot_v', 23, 11);
  clear(20, 11); m.ent({ id: 'sign_cait', tex: 'sign_cait', tx: 20, ty: 11, solid: true, script: 'signCait' });
  // Embarcadero al final del camino que hay detrás del Combini (las barcas solo son decorado)
  for (const x of [34, 35]) { clear(x, 26); m.set(x, 26, 'p'); }
  m.set(33, 26, 'b');
  m.objects.push({ tex: 'boat', x: 33 * TILE + 6, y: 25 * TILE + 13 }, { tex: 'boat2', x: 32 * TILE + 6, y: 27 * TILE + 15 });
  m.objects.push({ tex: 'post', x: 33 * TILE + 2, y: 26 * TILE + 4 }, { tex: 'post', x: 33 * TILE + 2, y: 27 * TILE + 2 });
  m.ent({ id: 'dock_boats', tx: 33, ty: 26, script: 'boats' });

  m.regions = [
    { name: 'Casa de Cait', x0: 18, y0: 7, x1: 26, y1: 13 },
    { name: 'Embarcadero', x0: 31, y0: 24, x1: 36, y1: 27 },
    { name: 'Casa de Lolete', x0: 8, y0: 14, x1: 13, y1: 19, music: 'lolete' },
    { name: 'Casa Fucsia', x0: 10, y0: 26, x1: 16, y1: 31, music: 'fuxia' },
    { name: 'Aeropuerto', x0: 6, y0: 33, x1: 22, y1: 38, music: 'aeroflot' },
    { name: 'Templo de los Sabios', x0: 27, y0: 9, x1: 35, y1: 18, music: 'templo' },
    { name: 'Biang Biang Mian', x0: 23, y0: 14, x1: 26, y1: 18 },
    { name: 'Campo de nabos', x0: 18, y0: 23, x1: 25, y1: 27 },
    { name: 'Combini', x0: 32, y0: 28, x1: 38, y1: 31, jingle: 'combini' },
    { name: 'Castillo de Mazapán', x0: 43, y0: 16, x1: 58, y1: 31 },
    { name: 'Kapadokya', x0: 42, y0: 33, x1: 58, y1: 39, music: 'kapadokya' },
    { name: 'La cueva', x0: 45, y0: 6, x1: 49, y1: 11, music: 'bosque' },
    { name: 'Bosque de los monos', x0: 39, y0: 9, x1: 47, y1: 14, music: 'bosque' },
    { name: 'Muelle', x0: 0, y0: 7, x1: 10, y1: 11 },
  ];
  return m;
}

// ---------------------------------------------------------------- Casa de Cait (interior)
function cait() {
  const m = base('cait', 'Casa de Cait', 12, 10, 'O'); // tarima de roble claro y paredes blancas, como el piso real
  m.music = 'casa';
  m.fill(0, 0, 11, 0, 'Y'); m.fill(0, 1, 11, 1, 'Z'); m.fill(0, 9, 11, 9, 'x'); m.set(6, 9, 'O');
  // Los tres cuadros de Cait colgados en la pared, en su orden
  [46, 70, 94].forEach((x, i) => m.objects.push({ tex: 'cuadro' + (i + 1), x, y: 26, flat: true, top: true }));
  m.ent({ id: 'cuadros', tx: 4, ty: 1, script: 'cuadros' });
  m.obj('bed2', 1, 2, 2, 2);
  // Rincón de la tele, según las fotos: ventanal a la terraza, mueble blanco con la tele, estantería de cubos con
  // peluches y lámpara de pie
  m.objects.push({ tex: 'window_cait', x: 11 * TILE, y: 2 * TILE - 2, flat: true, top: true });
  m.obj('kallax_cait', 7, 2);
  m.obj('tvunit_cait', 8, 2, 2, 1);
  // La lámpara de pie se puede apagar y encender (al apagarla, la casa se oscurece)
  m.ent({ id: 'lampCait', tx: 11, ty: 2, solid: true, texFn: () => (State.flag('lampOff') ? 'floorlamp_cait_off' : 'floorlamp_cait'), script: 'lampCait' });
  m.obj('plant', 0, 8);
  m.obj('table', 4, 3, 2, 1);
  m.obj('sofa_cait2', 8, 8, 3, 1);
  m.obj('coffee_cait', 8, 6, 2, 1);
  m.ent({ id: 'invites', tex: 'invites', tx: 5, ty: 3, oy: -7, script: 'invites', when: () => !State.flag('invites') });
  m.ent({ id: 'bed', tx: 1, ty: 3, script: 'bed' });
  m.ent({ id: 'sofa', tx: 9, ty: 8, script: 'sofa' }); m.ent({ id: 'sofa2', tx: 8, ty: 8, script: 'sofa' }); m.ent({ id: 'sofa3', tx: 10, ty: 8, script: 'sofa' });
  m.ent({ id: 'coffee', tx: 8, ty: 6, script: 'coffeeCait' }); m.ent({ id: 'coffee2', tx: 9, ty: 6, script: 'coffeeCait' });
  m.ent({ id: 'tvCait', tx: 8, ty: 2, script: 'tvCait' }); m.ent({ id: 'tvCait2', tx: 9, ty: 2, script: 'tvCait' });
  m.ent({ id: 'shelf', tx: 7, ty: 2, script: 'shelf' });
  for (const tx of [10, 11]) m.ent({ id: 'ventana' + tx, tx, ty: 1, script: 'ventanaCait' });
  m.ent({ id: 'exit', kind: 'step', tx: 6, ty: 9, script: 'exitCait' });
  m.ent({ id: 'party', tx: 4, ty: 3, script: 'fiestaTable', when: () => !State.flag('fin') });
  // Después del final: los restos de la fiesta. Acercarse a cualquiera deja repetirla, sin más indicaciones.
  const fin = () => State.flag('fin');
  for (const [x, y] of [[3, 5], [7, 4], [4, 7], [7, 6], [6, 8], [2, 4], [10, 5], [5, 6]]) m.obj('confetti_floor', x, y, 1, 1, { flat: true, when: fin });
  m.ent({ id: 'rest_cake', tex: 'cake_rest', tx: 4, ty: 3, ox: 8, oy: -8, script: 'fiestaRest', when: fin });
  m.ent({ id: 'rest_cake2', tx: 5, ty: 3, script: 'fiestaRest', when: fin });
  m.ent({ id: 'rest_balloons', tex: 'balloons_rest', tx: 10, ty: 3, solid: true, script: 'fiestaRest', when: fin });
  m.ent({ id: 'rest_wrap', tex: 'wrap_rest', tx: 8, ty: 7, solid: true, script: 'fiestaRest', when: fin });
  sock(m, 's10', 3, 3, -8); // asoma por debajo de la cama
  // Invitados que ya han cumplido y están preparando la fiesta
  const SPOTS = [[2, 6], [9, 5], [3, 7], [9, 7], [1, 5], [10, 6], [7, 4], [2, 8]];
  ['lolete', 'tigrito'].forEach((id, i) => {
    m.ent({ id: 'home_' + id, npc: id, who: id, tx: SPOTS[i][0], ty: SPOTS[i][1], solid: true, script: 'homeGuest', when: () => State.d.home.includes(id) });
  });
  return m;
}

// ---------------------------------------------------------------- Apartamento de las Ratitas
// Puzle del rayo de luz (pasillo, filas 8 a 11). st: 1 = «/», 2 = «\».
// Colocación buscada por ordenador: todos los pedestales sirven (con alguna colocación el rayo rebota en cada uno y
// llega a Kai), se le pueden mandar los 4 colores y todas las mezclas de dos salvo amarillo + verde, el lila sale con UNA
// sola colocación (m1, m2, m10) y el pasillo queda libre tanto con Kai dormido (24,8) como despierto (23,8).
const PEDS = [['m1', 5, 9], ['m2', 10, 9], ['m3', 14, 8], ['m4', 9, 11], ['m5', 22, 11], ['m6', 14, 9], ['m7', 7, 9], ['m8', 9, 8], ['m9', 14, 11], ['m10', 10, 11], ['m11', 7, 8]];
const FIXED = [[23, 11, 1], [22, 9, 2], [5, 11, 2]];
// Cristales en orden rojo, azul, amarillo y verde (amarillo y verde estropean el lila)
const GEMS = [[6, 9], [12, 11], [15, 9], [16, 8]];
const PILLARS = [];
export const BEAM_SOLUTION = { m1: 2, m2: 2, m10: 2 };
// Tres cuartos (uno por ratita) + el de Cuy (no se le nombra hasta conocerlo), sobre un pasillo con el rayo de luz, Kai y la alcantarilla.
function ratitas() {
  const m = base('ratitas', 'Apartamento de las Ratitas', 30, 13, 'x');
  const S = State;
  m.music = 'ratitas';
  m.fill(0, 0, 29, 0, 'W'); m.fill(0, 7, 29, 7, 'W');
  for (const [x0, x1] of [[1, 6], [8, 13], [15, 21], [23, 28]]) m.fill(x0, 1, x1, 6, 'o');
  for (const x of [3, 10, 18, 24]) m.set(x, 7, 'o'); // puertas
  m.fill(1, 8, 28, 11, 'o');
  m.set(2, 12, 'o');

  // Pasillo
  m.obj('plant', 28, 8); m.obj('plant', 1, 8); m.obj('rug', 8, 9, 3, 2, { flat: true });
  m.ent({ id: 'exit', kind: 'step', tx: 2, ty: 12, script: 'exitRatitas' });
  sock(m, 's5', 10, 3, -5); sock(m, 's14', 19, 1, 6); sock(m, 's15', 13, 5, 5);
  m.ent({ id: 'sign', tex: 'sign', tx: 4, ty: 11, solid: true, script: 'signRatitas' });
  // La rejilla del techo empieza cerrada: hasta que se abre no entra el rayo de sol
  m.ent({ id: 'grate', tx: 5, ty: 7, texFn: () => (S.flag('grateOpen') ? 'grate' : 'grate_shut'), script: 'grate' });
  const mirrorTex = (id) => () => ['stand', 'mirror_a', 'mirror_b'][S.d.flags[id] || 0];
  // Rayo de luz: tres espejos fijos atornillados al suelo, once pedestales para los tres espejos de mano
  // y cuatro cristales de color. Solo una colocación lleva hasta Kai un rayo lila (rojo + azul, sin amarillo ni verde);
  // hay muchas que le llegan de otro color. Comprobado por ordenador.
  for (const [x, y] of PILLARS) m.set(x, y, 'L');
  for (const [id, tx, ty] of PEDS) m.ent({ id, tx, ty, solid: true, texFn: mirrorTex(id), script: 'mirror' });
  FIXED.forEach(([tx, ty, st], i) => m.ent({ id: 'fx' + i, tex: st === 1 ? 'mirror_fa' : 'mirror_fb', tx, ty, solid: true, script: 'mirrorFixed' }));
  m.ent({ id: 'gem_r', tex: 'gem_r', tx: GEMS[0][0], ty: GEMS[0][1], solid: true, script: 'gem' });
  m.ent({ id: 'gem_b', tex: 'gem_b', tx: GEMS[1][0], ty: GEMS[1][1], solid: true, script: 'gem' });
  m.ent({ id: 'gem_y', tex: 'gem_y', tx: GEMS[2][0], ty: GEMS[2][1], solid: true, script: 'gem' });
  m.ent({ id: 'gem_g', tex: 'gem_g', tx: GEMS[3][0], ty: GEMS[3][1], solid: true, script: 'gem' });
  m.beam = { src: [5, 8], dir: [0, 1], mirrors: PEDS.map(([id, tx, ty]) => ({ id, tx, ty })), fixed: FIXED.map(([tx, ty, st]) => ({ tx, ty, st })), gems: GEMS, target: [23, 8], stop: [24, 8] };
  m.ent({ id: 'kai_sleep', tex: 'kai_sleep', tx: 24, ty: 8, solid: true, script: 'kaiSleep', when: () => !S.flag('kai') });
  m.ent({ id: 'kai', npc: 'kai', tx: 23, ty: 8, solid: true, script: 'kai', when: () => S.flag('kai') });
  m.ent({ id: 'hatch', tx: 27, ty: 10, solid: true, texFn: () => (S.flag('hatchOpen') ? 'hatch_open' : 'hatch'), script: 'hatch' });

  // Cuarto 1: cocina de la ratita gris (quesos de menor a mayor) y nevera con imanes
  m.obj('fridge', 1, 5, 1, 2); m.obj('table', 1, 1, 2, 1); // nevera en la esquina de abajo a la izquierda, bien a la vista
  m.ent({ id: 'fridge', tx: 1, ty: 6, script: 'fridge' });
  m.ent({ id: 'ratita_p', npc: 'ratita_p', tx: 2, ty: 3, solid: true, script: 'ratitaP' });
  for (const [size, tx, ty] of [[3, 4, 2], [1, 5, 4], [5, 6, 1], [2, 5, 6], [4, 3, 4]]) m.ent({ id: 'ch' + size, tex: 'cheese_' + size, size, tx, ty, solid: true, script: 'cheese' });

  // Cuarto 2: salón de la ratita blanca. Hay que contar cosas y operar: cojines × tazas + cuadros − plantas = 9
  m.obj('tv', 10, 1, 2, 1); m.obj('sofa', 10, 4, 2, 1); // (sin librería: ahí cuelga uno de los cuadros de Ratencio)
  m.obj('flowerpot_r', 13, 1); m.obj('flowerpot_y', 13, 6); m.obj('flowerpot_p', 8, 6); // tres tiestos con flores: cuentan como plantas en la cuenta de la ratita
  const small = (tex, x, y, dx = 0, dy = 0) => m.objects.push({ tex, x: x * TILE + 8 + dx, y: y * TILE + 12 + dy, flat: true, top: true });
  for (const [x, y] of [[8, 3], [12, 3], [13, 4], [9, 6], [12, 5]]) small('cup', x, y, (x * 3) % 5 - 2, (y * 5) % 4 - 2);
  for (const [x, y] of [[9, 2], [11, 6]]) small('cushion', x, y);
  // Los dos cuadros (cuentan para la cuenta de la ratita blanca) son de Ratencio the Rat; al mirarlos se ven en grande
  // uno a cada lado de la tele, más grandes y a la altura de la pantalla
  [9, 12].forEach((x, i) => { small('ratencio_' + (i + 1), x, 0, 0, 14); m.ent({ id: 'ratencio' + (i + 1), n: i + 1, tx: x, ty: 0, script: 'ratencio' }); });
  m.ent({ id: 'tv', tx: 10, ty: 1, script: 'tv' });
  m.ent({ id: 'ratita_o', npc: 'ratita_o', tx: 9, ty: 4, solid: true, script: 'ratitaO' });

  // Cuarto 3: dormitorio de la ratita parda. Cinco lámparas: cada interruptor cambia también otras
  m.obj('bed', 15, 1, 1, 2); m.obj('table', 19, 2, 2, 1); m.obj('plant', 21, 1); m.obj('rug', 17, 4, 3, 2, { flat: true });
  // Colocación de las lámparas (roja, verde, azul, amarilla, rosa) elegida por ordenador: recorrerlas en orden por la
  // habitación (de izquierda a derecha, en círculo o desde la puerta) y encender las apagadas no funciona
  [[15, 4], [21, 4], [20, 6], [19, 4], [16, 6]].forEach(([tx, ty], i) => m.ent({
    id: 'lamp' + i, n: i, tx, ty, solid: true, script: 'lamp',
    texFn: () => `lamp_${i}_${S.flag('r3') || (S.d.flags.lamps || [])[i] ? 'on' : 'off'}`,
  }));
  m.ent({ id: 'ratita_b', npc: 'ratita_b', tx: 17, ty: 3, solid: true, script: 'ratitaB' });

  // Cuarto de Cuy
  m.obj('bed', 28, 1, 1, 2); m.obj('rug', 24, 3, 3, 2, { flat: true }); m.obj('plant', 23, 1);
  m.ent({ id: 'note', tex: 'note', tx: 25, ty: 1, oy: -12, script: 'note' });
  m.ent({ id: 'cuy', npc: 'cuy', tx: 26, ty: 3, solid: true, script: 'cuy', when: () => !S.flag('cuy') });
  return m;
}

// ---------------------------------------------------------------- Castillo de Mazapán (patio interior)
function castillo() {
  const W = 40, H = 28, m = base('castillo', 'Castillo de Mazapán', W, H, 'g');
  const S = State, r = rng(77);
  m.music = 'pasteleria';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) m.set(x, y, r() < 0.06 ? 'f' : r() < 0.4 ? 'G' : 'g');
  // Murallas
  m.fill(0, 0, 39, 0, 'C'); m.fill(0, 1, 39, 1, 'i'); m.fill(0, 2, 39, 2, 'c');
  m.fill(0, 0, 0, 27, 'C'); m.fill(39, 0, 39, 27, 'C'); m.fill(0, 26, 39, 27, 'C');
  m.fill(19, 26, 20, 27, 'p');
  // Plaza, estanque y caminos
  m.fill(13, 10, 26, 20, 't');
  for (let y = 3; y <= 10; y++) for (let x = 27; x <= 38; x++) if (((x - 32.5) / 4.7) ** 2 + ((y - 6.6) / 2.9) ** 2 < 1) m.set(x, y, 'r');
  const path = (x0, y0, x1, y1) => m.fill(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1), 'p');
  path(19, 21, 20, 25); path(5, 8, 5, 20); path(5, 15, 12, 15); path(6, 8, 6, 8);
  path(27, 19, 32, 19); path(32, 18, 32, 19); path(27, 12, 31, 12);

  // Mordiscos en la muralla hasta que la Pastelería Real termine la reconstrucción
  if (!S.flag('horno')) for (const x of [10, 24, 34]) m.objects.push({ tex: 'bite', x: x * TILE + 8, y: 3 * TILE, flat: true, top: true });

  // Puesto de mochis, en la esquina de abajo a la derecha, con su camino desde el de la Pastelería (regalo para Cait)
  path(32, 20, 32, 25); path(32, 25, 34, 25);
  m.obj('stall_mochi', 33, 24, 2, 1);
  for (const tx of [33, 34]) m.ent({ id: 'mochi' + tx, tx, ty: 24, script: 'mochis' });

  // Plaza Principal
  m.obj('fountain', 19, 14, 2, 2);
  m.deco('banner_k', 13, 10); m.deco('banner_g_r', 26, 10); m.deco('banner_g', 13, 20); m.deco('banner_k_r', 26, 20);
  m.obj('lantern', 16, 11); m.obj('lantern', 23, 11);
  // El Rey espera sentado en su trono (detrás de él, con alfombra roja hasta la fuente). Trono, alfombra, fuente y
  // mosaico van alineados en el centro de la plaza (x = 20 × TILE, entre las baldosas 19 y 20)
  m.objects.push({ tex: 'throne', x: 20 * TILE, y: 11 * TILE + 14 });
  m.block[11][19] = m.block[11][21] = true;
  m.objects.push({ tex: 'carpet', x: 20 * TILE, y: 14 * TILE, flat: true });
  m.ent({ id: 'peludito', npc: 'peludito', tx: 20, ty: 11, ox: -8, oy: -6, solid: true, script: 'peludito' });
  for (const tx of [19, 21]) m.ent({ id: 'trono' + tx, tx, ty: 11, script: 'trono' }); // los lados del Trono Real
  // Vida en la plaza: estatuas del Rey, mosaico, puestos, bancos, un pintor y vecinos
  m.objects.push({ tex: 'mosaic', x: 20 * TILE, y: 19 * TILE, flat: true });
  [[14, 12, 2], [25, 12, 3], [14, 18, 4], [25, 18, 5]].forEach(([tx, ty, n], i) => m.ent({ id: 'statue' + i, tex: 'statue_' + n, n, tx, ty, solid: true, script: 'statue' }));
  m.obj('stall', 15, 15, 2, 1); m.obj('stall', 23, 15, 2, 1);
  m.obj('bench', 17, 19); m.obj('bench', 22, 19); m.obj('easel', 22, 12);
  for (const x of [15, 17, 22, 24]) m.objects.push({ tex: 'flowerbed', x: x * TILE + 8, y: 10 * TILE + 10, flat: true, top: true });
  for (const x of [15, 24]) m.objects.push({ tex: 'flowerbed', x: x * TILE + 8, y: 20 * TILE + 14, flat: true, top: true });
  m.ent({ id: 'vend1', npc: 'owito_k', tx: 15, ty: 16, solid: true, script: 'plazaVend1' });
  m.ent({ id: 'vend2', npc: 'owito_v', tx: 24, ty: 16, solid: true, script: 'plazaVend2' });
  m.ent({ id: 'pintor', npc: 'owito_g', tx: 21, ty: 12, solid: true, script: 'plazaPintor' });
  m.ent({ id: 'guardia', npc: 'owito_w', tx: 18, ty: 23, solid: true, script: 'plazaGuardia' });
  m.ent({ id: 'gato1', npc: 'gato', tx: 17, ty: 24, solid: true, script: 'gatos' });
  m.ent({ id: 'gato2', npc: 'gatot', tx: 22, ty: 24, solid: true, script: 'gatos' });
  m.ent({ id: 'gate_in', tex: 'scaffold', tx: 19, ty: 26, ox: 8, solid: true, script: 'gateIn', when: () => !S.flag('gateOpen') });
  m.ent({ id: 'gate_in2', tx: 20, ty: 26, solid: true, script: 'gateIn', when: () => !S.flag('gateOpen') });
  m.ent({ id: 'exit_l', kind: 'step', tx: 19, ty: 27, script: 'exitCastle' });
  m.ent({ id: 'exit_r', kind: 'step', tx: 20, ty: 27, script: 'exitCastle' });
  m.ent({ id: 'sewer', kind: 'step', tex: 'hatch_open', tx: 4, ty: 15, script: 'sewerDown' }); // en el cruce de arriba: desde aquí no se ve la mesa de guerra
  // Cameo (curiosidad): los Owitos de la Inquisición planean en secreto la fiesta de su comandante alrededor de una mesa
  // de guerra. Hablar con cualquiera (o con la mesa) lanza la escena la primera vez; Coleowe no está: aparece en la escena.
  m.obj('war_table', 4, 22, 3, 2);
  m.ent({ id: 'owq_table', tx: 5, ty: 22, script: 'owiquis' });
  m.ent({ id: 'owq_jos', npc: 'owi_jos', tx: 3, ty: 22, solid: true, script: 'owiquis' });
  m.ent({ id: 'owq_lel', npc: 'owi_lel', tx: 4, ty: 24, solid: true, script: 'owiquis' });
  m.ent({ id: 'owq_cas', npc: 'owi_cas', tx: 7, ty: 22, solid: true, script: 'owiquis' });
  m.ent({ id: 'owq_dor', npc: 'owi_dor', tx: 6, ty: 24, solid: true, script: 'owiquis' });
  m.ent({ id: 'owq_mor', npc: 'owi_mor', tx: 1, ty: 25, solid: true, script: 'owiquis' }); // en su rincón, aparte
  sock(m, 's6', 36, 22, 6); sock(m, 's7', 16, 4, -6); sock(m, 's16', 2, 11, 6); sock(m, 's17', 38, 7, -5);

  // Teatro Real
  m.obj('teatro', 3, 5, 6, 3);
  m.ent({ id: 'teatro_l', tx: 5, ty: 7, script: 'teatro' });
  m.ent({ id: 'teatro_r', tx: 6, ty: 7, script: 'teatro' });
  m.ent({ id: 'owito_t', npc: 'owito_t', tx: 3, ty: 9, solid: true, script: 'owitoT' });
  m.ent({ id: 'owito_c', npc: 'owito_c', tx: 8, ty: 9, solid: true, script: 'owitoC' });

  // Estanque de los Capybaras
  for (const [x, y] of [[26, 5], [26, 7], [27, 9], [28, 10], [30, 10], [36, 10], [38, 8], [27, 3], [37, 3], [26, 6], [29, 11], [37, 10]]) m.deco('reeds', x, y);
  [[24, 8], [25, 10], [24, 11]].forEach(([tx, ty], i) => m.ent({ id: 'capy' + i, npc: 'capybara', tx, ty, solid: true, script: 'capybaras', when: () => !S.flag('pato') }));
  // Con Patito ya tranquilo, los capybaras se bañan en el estanque (solo asoma la cabeza)
  [[29, 6], [31, 4], [34, 4], [36, 6], [30, 8], [33, 7], [35, 9]].forEach(([tx, ty], i) => m.ent({ id: 'capyh' + i, tex: 'capy_swim', tx, ty, oy: -2, bob: true, script: 'capybarasHappy', when: () => S.flag('pato') }));
  // Flores de loto flotando en el estanque
  for (const [x, y, t] of [[28, 7, 'lotus'], [32, 5, 'lotus_pad'], [37, 7, 'lotus'], [33, 9, 'lotus'], [31, 6, 'lotus_pad'], [35, 5, 'lotus'], [30, 9, 'lotus_pad']]) m.objects.push({ tex: t, x: x * TILE + 8, y: y * TILE + 12, flat: true, top: true });
  m.ent({ id: 'patito', npc: 'patito', tx: 32, ty: 11, solid: true, script: 'patito', when: () => S.flag('pato') });

  // Pastelería Real
  m.obj('pasteleria', 30, 15, 5, 3);
  m.ent({ id: 'mantecas', npc: 'mantecas', tx: 31, ty: 18, solid: true, script: 'mantecas' });
  m.ent({ id: 'manteca2', npc: 'manteca2', tx: 33, ty: 18, solid: true, script: 'manteca2' });

  for (const [x, y] of [[2, 4], [10, 4], [12, 6], [16, 5], [22, 5], [2, 12], [9, 18], [2, 24], [8, 24], [14, 23], [25, 23], [30, 22], [36, 23], [37, 13], [28, 23], [11, 11], [36, 20], [16, 7], [23, 7]]) m.obj('tree', x, y);

  m.regions = [
    { name: 'Plaza Principal', x0: 13, y0: 10, x1: 26, y1: 20 },
    { name: 'Mesa de guerra', x0: 1, y0: 21, x1: 8, y1: 25, music: 'inquisicion' },
    { name: 'Estanque de los Capybaras', x0: 23, y0: 3, x1: 38, y1: 12, music: 'capybaras' },
    { name: 'Teatro Real', x0: 1, y0: 3, x1: 10, y1: 10, music: 'teatro' },
    { name: 'Pastelería Real', x0: 28, y0: 14, x1: 36, y1: 19, music: 'horno' },
  ];
  return m;
}

// ---------------------------------------------------------------- Isla Helada
function helada() {
  const W = 40, H = 26, m = base('helada', 'Isla Helada', W, H, '~');
  const S = State;
  m.music = 'helada'; // la Casa de la Navidad tiene la suya («navidad»), en su región
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = 1 - (((x - 19.5) / 17) ** 2 + ((y - 11.5) / 9) ** 2) + Math.sin(x * 0.5) * 0.05 + Math.cos(y * 0.7) * 0.05;
    if (e > 0) m.set(x, y, e < 0.12 ? 'I' : 'S');
  }
  for (const [cx, cy, rr] of [[12, 17, 2.3], [27, 16, 2.5], [33, 12, 1.6]]) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x - cx, y - cy) < rr && m.get(x, y) === 'S') m.set(x, y, 'I');
  const path = (x0, y0, x1, y1) => m.fill(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1), 'P');
  path(19, 7, 20, 19); path(7, 13, 30, 13); path(30, 11, 30, 13); path(21, 7, 21, 7);
  path(7, 11, 8, 13);   // a la Casa de la Navidad: dos baldosas de ancho, centrado bajo su puerta (que cae entre la 7 y la 8)
  path(21, 18, 23, 18); // al Fitness Bartory: rodea el edificio y llega a su puerta (baldosa 23), que está por abajo
  m.fill(19, 20, 20, 24, 'b'); // muelle

  m.obj('sweetfamosa', 17, 4, 6, 3);
  m.obj('casa_navidad', 6, 9, 4, 2);
  m.obj('tedi', 28, 8, 5, 3);
  for (const [x, y] of [[4, 8], [11, 6], [14, 9], [24, 4], [26, 7], [34, 9], [35, 14], [5, 15], [10, 18], [15, 17], [21, 16], [30, 17], [13, 4], [3, 12]]) m.obj('pine_snow', x, y);
  m.obj('snowman', 11, 11);
  m.obj('gym', 22, 16, 4, 2);
  // Puesto de taiyakis (regalo para Cait)
  m.obj('stall_taiyaki', 15, 10, 2, 1);
  path(15, 11, 18, 11); // caminito desde el camino central hasta el mostrador
  for (const tx of [15, 16]) m.ent({ id: 'taiyaki' + tx, tx, ty: 10, script: 'taiyaki' });
  m.ent({ id: 'gym_door', tx: 23, ty: 17, script: 'gymDoor' });
  m.ent({ id: 'bart', npc: 'bart', tx: 26, ty: 17, solid: true, script: 'bart' });
  m.ent({ id: 'ovejoncio', npc: 'ovejoncio', tx: 27, ty: 11, solid: true, script: 'ovejoncio' });

  m.ent({ id: 'narwal', tex: 'narwal', tx: 21, ty: 23, ox: 6, oy: 6, solid: true, script: 'narwalBack', bob: true });
  m.ent({ id: 'heladoncio', npc: 'heladoncio', tx: 22, ty: 8, solid: true, script: 'heladoncio', when: () => !S.flag('hat') });
  m.ent({ id: 'heladoncio_h', npc: 'heladoncioh', tx: 22, ty: 8, solid: true, script: 'heladoncio', when: () => S.flag('hat') }); // con su sombrero
  // Curiosidad: el sombrero de Heladoncio se voló y acabó pegado al lado izquierdo de la Casa de la Navidad, por detrás de
  // la pared: la casa lo tapa casi entero y solo asoma la punta del ala. Se coge desde la baldosa (5, 9), mirando a la casa
  m.ent({ id: 'straw_hat', tex: 'straw_hat', tx: 6, ty: 9, ox: -4, script: 'hatPick', when: () => !S.flag('hatGot') });
  m.ent({ id: 'sf_door', tx: 21, ty: 6, script: 'sfDoor' });
  m.ent({ id: 'tedi_door', tx: 30, ty: 10, script: 'tediDoor' });
  m.ent({ id: 'owinken', npc: 'owinken', tx: 31, ty: 11, solid: true, script: 'owinken', when: () => S.flag('tedi') });
  [[27, 13], [14, 15], [29, 12]].forEach(([tx, ty], i) => m.ent({ id: 'clon' + i, npc: 'clon', tx, ty, solid: true, script: 'clon', when: () => !S.flag('tedi') }));
  m.ent({ id: 'navidad_door', tx: 7, ty: 10, script: 'navidad' }); m.ent({ id: 'navidad_door2', tx: 8, ty: 10, script: 'navidad' });
  // Los Owitos de Navidad, uno a cada lado del camino, simétricos respecto a la puerta
  m.ent({ id: 'owito_n', npc: 'owito_n', tx: 6, ty: 11, solid: true, script: 'navidad' });
  m.ent({ id: 'owito_r', npc: 'owito_r', tx: 9, ty: 11, solid: true, script: 'navidad' });
  sock(m, 's8', 3, 11, 6); sock(m, 's9', 34, 8, -6); sock(m, 's13', 26, 6, 6); sock(m, 's19', 10, 17, -6);

  m.regions = [
    { name: 'Sweet Famosa', x0: 15, y0: 3, x1: 24, y1: 9, music: 'sweetfamosa' },
    { name: 'Casa de la Navidad', x0: 4, y0: 8, x1: 12, y1: 13, music: 'navidad' },
    { name: 'TEDI', x0: 26, y0: 7, x1: 34, y1: 12, music: 'tedi' },
    { name: 'Fitness Bartory', x0: 20, y0: 13, x1: 28, y1: 19, music: 'gym' },
    { name: 'Muelle helado', x0: 17, y0: 20, x1: 23, y1: 25 },
  ];
  return m;
}

const BUILDERS = { isla, cait, ratitas, castillo, helada };
export function buildMap(id) { return (BUILDERS[id] || isla)(); }
export const MAP_IDS = Object.keys(BUILDERS);
