// Estado de la partida y persistencia en localStorage.
const KEY = 'sc40-save-v1';
const SETTINGS = 'sc40-settings-v1';

// Todos los invitados posibles. `where` se muestra en el menú hasta conocerlos.
export const CHARACTERS = [
  { id: 'lolete', name: 'Lolete', where: 'Casa de Lolete' },
  { id: 'scooby', name: 'Scooby', where: 'Templo de los Sabios' },
  { id: 'cuca', name: 'Cuca', where: 'Templo de los Sabios' },
  { id: 'fuxia', name: 'Fucsia', where: 'Casa Fucsia' },
  { id: 'perrunfli', name: 'Perrunfli', where: 'Campo de nabos' },
  { id: 'bart', name: 'Bart', where: 'Fitness Fattory' },
  { id: 'tigrito', name: 'Tigrito', where: 'Bosque' },
  { id: 'cuy', name: 'Cuy y las ratitas', where: 'Apartamento de las Ratitas' },
  { id: 'kai', name: 'Kai', where: 'Apartamento de las Ratitas' },
  { id: 'patito', name: 'Patito', where: 'Estanque de los Capybaras' },
  { id: 'capybaras', name: 'Los capybaras', where: 'Estanque de los Capybaras' },
  { id: 'owitos_teatro', name: 'Owitos del Teatro', where: 'Teatro Real' },
  { id: 'mantecas', name: 'Mantecas y Manteca2', where: 'Pastelería Real' },
  { id: 'peludito', name: 'Rey Peludito', where: 'Plaza Principal' },
  { id: 'narwal', name: 'Narwal', where: 'Muelle' },
  { id: 'owitos_navidad', name: 'Owitos de Navidad', where: 'Casa de la Navidad' },
  { id: 'owinken', name: 'Owinken', where: 'TEDI' },
  { id: 'heladoncio', name: 'Heladoncio', where: 'Sweet Famosa' },
  { id: 'gatos', name: 'Los Gemelos bipolares', where: 'Castillo' },
  { id: 'siri', name: 'Siri y los awawas', where: 'Kapadokya' },
  { id: 'ovejoncio', name: 'Ovejoncio', where: 'TEDI' },
];

// Regalos del gachapón (dibujados en art.js → GACHA_ART). Faltan por decidir hasta llegar a 10.
export const GACHA = [
  { id: 'pachirisu', name: 'Pachirisu' },
  { id: 'kirby', name: 'Kirby' },
  { id: 'yoshi', name: 'Yoshi' },
  { id: 'pulguita', name: 'Pulguita de Silksong' },
  { id: 'poyopoyo', name: 'Poyopoyo' },
  { id: 'princesa-bultos', name: 'Princesa Bultos' },
  { id: 'socrates', name: 'Sócrates' },
  { id: 'crash', name: 'Crash Bandicoot' },
  { id: 'larva', name: 'Larva' },
  { id: 'spyro', name: 'Spyro' },
];

// Regalos especiales que se consiguen superando pruebas
export const GIFTS = {
  mocadora: { name: 'Mocadorà', icon: 'candy', desc: 'Figuritas de mazapán con forma de frutas y hortalizas de la huerta valenciana.' },
  miausis: { name: 'Libro de los Miausis', icon: 'book', desc: 'Un álbum de fotos de Cait y Mindeos.', album: true },
  flores: { name: 'Centro de flores de loto', icon: 'flower', desc: 'Flores de loto del estanque del castillo, de parte de Patito y los capybaras.' },
};

// Libro de los Miausis, en orden cronológico
export const ALBUM = [
  { img: '01-ibiza', place: 'Ibiza', date: 'Agosto de 2020', deco: ['sun', 'wave'] },
  { img: '02-gran-canaria', place: 'Gran Canaria', date: 'Julio de 2021', deco: ['mountain', 'sun'] },
  { img: '03-seychelles', place: 'Seychelles', date: 'Agosto de 2021', deco: ['palm', 'wave'] },
  { img: '04-malaga', place: 'Málaga', date: 'Octubre de 2021', deco: ['icecream', 'sun'] },
  { img: '05-tailandia', place: 'Tailandia', date: 'Julio de 2022', deco: ['stupa', 'flower'] },
  { img: '06-turquia', place: 'Turquía', date: 'Diciembre de 2022', deco: ['column', 'sun'] },
  { img: '07-kuala-lumpur', place: 'Kuala Lumpur', date: 'Julio de 2023', deco: ['tower', 'leaf'] },
  { img: '08-bako', place: 'Bako National Park', date: 'Julio de 2023', deco: ['leaf', 'wave'] },
  { img: '09-perhentian', place: 'Islas Perhentian', date: 'Agosto de 2023', deco: ['fish', 'wave'] },
  { img: '10-bali', place: 'Bali', date: 'Agosto de 2023', deco: ['flower', 'stupa'] },
  { img: '11-egipto', place: 'Egipto', date: 'Enero de 2024', deco: ['pyramid', 'sun'] },
  { img: '12-china', place: 'China', date: 'Agosto de 2024', deco: ['lantern', 'pagoda'] },
  { img: '13-taiwan', place: 'Taiwán', date: 'Agosto de 2024', deco: ['cup', 'lantern'] },
  { img: '14-cordoba', place: 'Córdoba', date: 'Diciembre de 2024', deco: ['arch', 'sun'] },
  { img: '15-corea', place: 'Corea', date: 'Agosto de 2025', deco: ['pagoda', 'flower'] },
];

export const TOTAL_SOCKS = 20;
// Los calcetines van por parejas de diseño: 10 diseños × 2. Cada calcetín está en una zona distinta que su pareja.
export const SOCK_DESIGNS = [
  'de rayas verdes', 'de lunares rojos', 'de zigzag azul', 'de puntera amarilla', 'de cruz morada',
  'naranja de rayas', 'rosa de lunares', 'turquesa de zigzag', 'gris de puntera', 'negro de cruz',
];
export const SOCK_DESIGN = {
  s1: 0, s8: 0, s2: 1, s5: 1, s3: 2, s6: 2, s4: 3, s9: 3, s7: 4, s10: 4,
  s11: 5, s14: 5, s12: 6, s18: 6, s13: 7, s16: 7, s15: 8, s19: 8, s17: 9, s20: 9,
};
export const HATCH_CODE = '1987'; // el año en que nació Cait

function fresh() {
  return {
    v: 1,
    pos: { map: 'cait', x: 96, y: 104, dir: 'down' },
    flags: { cait2: true },
    socks: [],        // ids de calcetines recogidos
    pairsTraded: 0,
    traded: [],       // diseños de calcetín ya cambiados a Scooby por una moneda
    coins: 0,
    gacha: [],        // ids de regalos del gachapón conseguidos
    gifts: [],        // regalos especiales
    vales: 0,
    quejas: [],       // reclamaciones escritas en el aeropuerto
    party: [],        // personajes que acompañan a Colgadín
    home: [],         // ya han cumplido y esperan en casa de Cait preparando la fiesta
    invited: [],
    sokoLevel: 0,
    time: 0,
  };
}

export const State = {
  d: fresh(),
  settings: { mute: false, music: 'chip' }, // music: 'chip' (generada) | 'mp3' (grabaciones originales)

  has() { try { return !!localStorage.getItem(KEY); } catch { return false; } },
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        this.d = Object.assign(fresh(), JSON.parse(raw));
        const ids = GACHA.map((g) => g.id);
        this.d.gacha = this.d.gacha.filter((g) => ids.includes(g)); // partidas antiguas guardaban nombres
        delete this.d.lps;
        if (!this.d.flags.cait2) { if (this.d.pos.map === 'cait') this.d.pos.y += 16; this.d.flags.cait2 = true; } // la casa de Cait creció una fila (pared con cuadros)
        if (this.d.flags.awawas && !this.d.flags.globos) this.d.flags.globos = true; // antes Kapadokya daba calcetines
        if (this.d.pairsTraded && !this.d.traded.length) this.d.traded = this.sockPairs().slice(0, this.d.pairsTraded); // partidas antiguas
        if (this.d.flags.kai) Object.assign(this.d.flags, { m1: 0, m2: 2, m3: 0, m4: 0, m5: 0, m6: 0, m7: 2, m8: 2, m9: 0, m10: 0, m11: 0 }); // espejos en su sitio
        if (this.d.flags.caveOpen && this.d.party.includes('lolete')) { this.d.party = this.d.party.filter((p) => p !== 'lolete'); this.d.home.push('lolete'); }
      }
      const s = localStorage.getItem(SETTINGS);
      if (s) this.settings = Object.assign(this.settings, JSON.parse(s));
    } catch (e) { console.warn('No se pudo cargar la partida', e); }
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) { console.warn('No se pudo guardar', e); }
  },
  saveSettings() { try { localStorage.setItem(SETTINGS, JSON.stringify(this.settings)); } catch {} },
  reset() { this.d = fresh(); try { localStorage.removeItem(KEY); } catch {} },

  flag(k) { return !!this.d.flags[k]; },
  set(k, v = true) { this.d.flags[k] = v; this.save(); },
  invite(id) { if (!this.d.invited.includes(id)) { this.d.invited.push(id); this.save(); return true; } return false; },
  join(id) { if (!this.d.party.includes(id)) { this.d.party.push(id); this.save(); } },
  // El personaje deja de acompañar y se va a casa de Cait
  goHome(id) { this.d.party = this.d.party.filter((p) => p !== id); if (!this.d.home.includes(id)) this.d.home.push(id); this.save(); },
  gift(id) { if (!this.d.gifts.includes(id)) { this.d.gifts.push(id); this.save(); return true; } return false; },
  // Diseños de los que se tienen los dos calcetines
  sockPairs() { return SOCK_DESIGNS.map((_, d) => d).filter((d) => this.d.socks.filter((s) => SOCK_DESIGN[s] === d).length === 2); },
  // Parejas completas que aún no se han cambiado por moneda
  pairsAvailable() { return this.sockPairs().filter((d) => !this.d.traded.includes(d)); },
};
