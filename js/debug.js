// Modo debug: permite dar por superadas las pruebas ya probadas y teletransportarse.
// Se activa con Mayús+D (o añadiendo ?dev a la dirección). Dentro de un minijuego, Mayús+W lo gana al instante.
import { State, CHARACTERS } from './state.js';

const S = State;
const f = (...k) => k.forEach((x) => { S.d.flags[x] = true; });
const inv = (...ids) => ids.forEach((id) => { if (!S.d.invited.includes(id)) S.d.invited.push(id); });
const gift = (id) => { if (!S.d.gifts.includes(id)) S.d.gifts.push(id); };
const out = (id) => { S.d.party = S.d.party.filter((p) => p !== id); };
const home = (id) => { out(id); if (!S.d.home.includes(id)) S.d.home.push(id); };
const join = (id) => { if (!S.d.party.includes(id)) S.d.party.push(id); };

// Pasos de la historia, en orden. `flag` indica cuándo está hecho; `apply` deja el estado como si se hubiera jugado.
export const STEPS = [
  { id: 'invites', label: 'Recoger las invitaciones', flag: 'invites', apply() { f('intro', 'invites'); } },
  { id: 'lolete', label: 'Sokoban de Lolete', flag: 'lolete', apply() { f('lolete'); S.d.sokoLevel = 3; inv('lolete'); if (!S.flag('caveOpen')) join('lolete'); } },
  { id: 'tigrito', label: 'Bosque de los monos', flag: 'tigrito', apply() { f('metMonos', 'tigrito'); inv('tigrito'); if (!S.flag('simon')) join('tigrito'); } },
  { id: 'cueva', label: 'Cavar la cueva', flag: 'caveOpen', apply() { f('caveOpen'); home('lolete'); } },
  { id: 'ratitas', label: 'Los tres cuartos de las ratitas', flag: 'r3', apply() { f('r1', 'r2', 'r3', 'metRatitaO'); S.d.flags.lamps = [1, 1, 1, 1, 1]; } },
  { id: 'kai', label: 'Espejos y Kai', flag: 'kai', apply() { Object.assign(S.d.flags, { m1: 2, m2: 2, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 2, m11: 0 }); f('kai', 'grateOpen'); inv('kai'); } },
  { id: 'cuy', label: 'Cuy se une', flag: 'cuy', apply() { f('metCuy', 'cuy', 'nota', 'imanes'); inv('cuy'); if (!S.flag('cuyTemple')) join('cuy'); } },
  { id: 'candado', label: 'Candado de la alcantarilla', flag: 'hatchOpen', apply() { f('hatchOpen'); } },
  { id: 'cuca', label: 'Cuy traduce a Cuca', flag: 'cuyTemple', apply() { f('metScooby', 'cuyTemple'); out('cuy'); inv('scooby', 'cuca'); } },
  { id: 'pato', label: 'Patito y los capybaras', flag: 'pato', apply() { f('metCapys', 'pato'); inv('patito', 'capybaras'); } },
  { id: 'simon', label: 'Teatro Real', flag: 'simon', apply() { f('simon'); inv('owitos_teatro'); home('tigrito'); } },
  { id: 'horno', label: 'Pastelería Real', flag: 'horno', apply() { f('metMantecas', 'horno'); inv('mantecas'); } },
  { id: 'gate', label: 'Andamios (Gemelos bipolares)', flag: 'gateOpen', apply() { f('metPeludito', 'andamios', 'gateOpen'); inv('peludito', 'gatos'); } },
  { id: 'narwal', label: 'Llamar a Narwal (Otamatone)', flag: 'narwal', apply() { f('narwal'); inv('narwal'); } },
  { id: 'cali', label: 'Fitness Bartory', flag: 'cali', apply() { f('metBart', 'cali'); gift('miausis'); inv('bart'); } },
  { id: 'hack', label: 'Hackear la puerta de TEDI', flag: 'tediHack', apply() { f('metOvejoncio', 'ovejaFit', 'tediHack'); inv('ovejoncio'); } },
  { id: 'tedi', label: 'TEDI: liberar a Owinken', flag: 'tedi', apply() { f('metHel', 'tedi'); inv('owinken'); } },
  { id: 'tarta', label: 'Escolta de la tarta', flag: 'tarta', apply() { S.d.flags.tarta = 4; inv('heladoncio'); } },
  { id: 'luces', label: 'Luces de la Casa de la Navidad', flag: 'luces', apply() { f('luces'); inv('owitos_navidad'); } },
  { id: 'globos', label: 'Globos (awawas de Kapadokya)', flag: 'globos', apply() { f('metSiri', 'globos'); inv('siri'); } },
  { id: 'gramola', label: 'Prueba de oído de Fucsia', flag: 'gramola', apply() { f('metFuxia', 'gramola'); inv('fuxia'); } },
  { id: 'paella', side: true, label: 'Paella de Perrunfli', flag: 'paella', apply() { f('metPerrunfli', 'paella'); gift('mocadora'); inv('perrunfli'); } },
  { id: 'owiquis', side: true, label: 'Mesa de guerra: Owitos de la Inquisición', flag: 'owiquis', apply() { f('owiquis'); inv('inquisicion'); gift('sushigo'); } },
  { id: 'hat', side: true, label: 'Curiosidad: sombrero de Heladoncio', flag: 'hat', apply() { f('metHel', 'hatAsk', 'hatGot', 'hat'); } },
];

// Deshacer una prueba ya superada para volver a jugarla: se borra lo que la marca como hecha (el resto de la
// partida se queda igual) y se lleva a Colgadín junto a quien la propone. Las invitaciones y regalos se conservan.
const no = (...k) => k.forEach((x) => { delete S.d.flags[x]; });
const free = (id) => { out(id); S.d.home = S.d.home.filter((p) => p !== id); };
const MIRRORS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11'];
export const UNDO = {
  lolete: { at: ['isla', 11, 18], undo() { no('lolete'); S.d.sokoLevel = 0; free('lolete'); } },
  tigrito: { at: ['isla', 41, 12], undo() { no('tigrito'); free('tigrito'); } },
  cueva: { at: ['isla', 46, 11], undo() { no('caveOpen'); } },
  ratitas: { at: ['ratitas', 2, 11], undo() { no('r1', 'r2', 'r3', 'metRatitaB'); S.d.flags.lamps = [0, 0, 0, 0, 0]; if (!S.flag('kai')) MIRRORS.forEach((m) => { S.d.flags[m] = 0; }); } },
  kai: { at: ['ratitas', 2, 11], undo() { no('kai', 'kaiCols', 'grateOpen'); MIRRORS.forEach((m) => { S.d.flags[m] = 0; }); } },
  // Cuy vuelve a su cuarto, como si no se le hubiera conocido (y, si ya estaba en el templo, sale de allí)
  cuy: { at: ['ratitas', 25, 6], undo() { no('metCuy', 'cuy', 'cuyTemple'); out('cuy'); } },
  candado: { at: ['ratitas', 27, 11], undo() { no('hatchOpen'); } },
  // Cuy vuelve a acompañar a Colgadín, antes de hablar con Cuca
  cuca: { at: ['isla', 31, 18], undo() { no('cuyTemple'); join('cuy'); } },
  pato: { at: ['castillo', 26, 12], undo() { no('pato'); } },
  simon: { at: ['castillo', 5, 8], undo() { no('simon'); free('tigrito'); join('tigrito'); } },
  horno: { at: ['castillo', 32, 19], undo() { no('horno', 'metMantecas'); } }, // también la presentación de Mantecas
  gate: { at: ['castillo', 19, 24], undo() { no('andamios', 'gateOpen', 'metPeludito'); } }, // también la presentación del Rey
  narwal: { at: ['isla', 9, 11], undo() { no('narwal'); } },
  hack: { at: ['helada', 27, 12], undo() { no('tediHack'); S.d.flags.hackLevel = 0; } },
  tedi: { at: ['helada', 30, 11], undo() { no('tedi'); } },
  cali: { at: ['helada', 26, 18], undo() { no('cali'); } },
  tarta: { at: ['helada', 22, 9], undo() { no('tarta'); } },
  luces: { at: ['helada', 8, 12], undo() { no('luces'); } },
  globos: { at: ['isla', 46, 35], undo() { no('globos'); } },
  gramola: { at: ['isla', 15, 31], undo() { no('gramola'); S.d.flags.fuxiaPts = 0; } },
  paella: { at: ['isla', 24, 26], undo() { no('paella', 'metPerrunfli', 'perrunfliVa'); } }, // también la presentación y lo del valenciano
  owiquis: { at: ['castillo', 5, 20], undo() { no('owiquis'); S.d.gifts = S.d.gifts.filter((g) => g !== 'sushigo'); } }, // también el regalo de Coleowe
  hat: { at: ['helada', 5, 9], undo() { no('hat', 'hatGot'); } },
};
export function undoStep(id) {
  const u = UNDO[id];
  u.undo();
  const [map, tx, ty] = u.at;
  S.d.pos = { map, x: tx * 16 + 8, y: ty * 16 + 12, dir: 'up' };
  S.save();
}

// Da por hecho el paso indicado y, si es de la historia principal, todos los anteriores
export function skipTo(id) {
  const i = STEPS.findIndex((s) => s.id === id);
  const todo = STEPS[i].side ? [STEPS[i]] : STEPS.slice(0, i + 1).filter((s) => !s.side);
  for (const s of todo) if (!S.flag(s.flag)) s.apply();
  S.save();
}

export const PLACES = [
  ['Casa de Cait', 'cait', 6, 7], ['Templo', 'isla', 31, 18], ['Gimnasio', 'helada', 24, 19], ['Bosque', 'isla', 40, 12],
  ['Muelle', 'isla', 9, 10], ['Kapadokya', 'isla', 46, 33], ['Apartamento', 'ratitas', 2, 11], ['Castillo', 'castillo', 5, 15], ['Isla Helada', 'helada', 19, 21],
];
export function teleport(i) {
  const [, map, tx, ty] = PLACES[i];
  S.d.pos = { map, x: tx * 16 + 8, y: ty * 16 + 12, dir: 'down' };
  S.save();
}

// Lanza la fiesta final con lo que haya en la partida (al acabar se vuelve a casa de Cait, como en el juego)
export function startParty() {
  const sm = window.SC40.game.scene;
  S.d.pos = { map: 'cait', x: 6 * 16 + 8, y: 7 * 16 + 12, dir: 'down' };
  S.save();
  for (const s of sm.getScenes(true)) s.scene.stop();
  sm.start('fiesta');
}
// Entrega todas las invitaciones (para ver la fiesta llena)
export function inviteAll() {
  for (const c of CHARACTERS) if (!S.d.invited.includes(c.id)) S.d.invited.push(c.id);
  S.save();
}

// Vuelve a la exploración recargando el mapa (desde cualquier escena)
export function reloadWorld() {
  const sm = window.SC40.game.scene, act = sm.getScenes(true);
  const world = act.find((s) => s.scene.key === 'world');
  if (world) world.scene.restart();                 // ya estamos explorando: se recarga el mapa
  else if (act.length) act[0].scene.start('world'); // desde un minijuego: se cierra y se vuelve al mapa
  else sm.start('world');
}
