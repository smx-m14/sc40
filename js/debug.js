// Modo debug: permite dar por superadas las pruebas ya probadas y teletransportarse.
// Se activa con Mayús+D (o añadiendo ?dev a la dirección). Dentro de un minijuego, Mayús+W lo gana al instante.
import { State } from './state.js';

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
  { id: 'kai', label: 'Espejos y Kai', flag: 'kai', apply() { Object.assign(S.d.flags, { m1: 0, m2: 0, m3: 2, m4: 1, m5: 0, m6: 0, m7: 2, m8: 0, m9: 0 }); f('kai'); inv('kai'); } },
  { id: 'cuy', label: 'Cuy se une', flag: 'cuy', apply() { f('metCuy', 'cuy', 'nota', 'imanes'); inv('cuy'); if (!S.flag('cuyTemple')) join('cuy'); } },
  { id: 'candado', label: 'Candado de la alcantarilla', flag: 'hatchOpen', apply() { f('hatchOpen'); } },
  { id: 'cuca', label: 'Cuy traduce a Cuca', flag: 'cuyTemple', apply() { f('metScooby', 'cuyTemple'); out('cuy'); inv('scooby', 'cuca'); } },
  { id: 'pato', label: 'Patito y los capybaras', flag: 'pato', apply() { f('metCapys', 'pato'); inv('patito', 'capybaras'); } },
  { id: 'simon', label: 'Teatro Real', flag: 'simon', apply() { f('simon'); inv('owitos_teatro'); home('tigrito'); } },
  { id: 'horno', label: 'Pastelería Real', flag: 'horno', apply() { f('metMantecas', 'horno'); inv('mantecas'); } },
  { id: 'gate', label: 'Peludito abre la puerta', flag: 'gateOpen', apply() { f('metPeludito', 'gateOpen'); inv('peludito'); } },
  { id: 'narwal', label: 'Llamar a Narwal', flag: 'narwal', apply() { f('narwal'); inv('narwal'); } },
  { id: 'tedi', label: 'Jefe de TEDI (Owinken)', flag: 'tedi', apply() { f('metHel', 'tedi'); inv('owinken'); } },
  { id: 'tarta', label: 'Escolta de la tarta', flag: 'tarta', apply() { S.d.flags.tarta = 4; inv('heladoncio'); } },
  { id: 'luces', label: 'Luces de la Casa de la Navidad', flag: 'luces', apply() { f('luces'); inv('owitos_navidad'); } },
  { id: 'gramola', label: 'Prueba de oído de Fuxia', flag: 'gramola', apply() { f('metFuxia', 'gramola'); inv('fuxia'); } },
  { id: 'awawas', side: true, label: 'Awawas de Kapadokya', flag: 'awawas', apply() { f('metSiri', 'awawas'); for (const k of ['s11', 's12', 's13']) if (!S.d.socks.includes(k)) S.d.socks.push(k); } },
  { id: 'paella', side: true, label: 'Paella de Perrunfli', flag: 'paella', apply() { f('metPerrunfli', 'paella'); gift('mocadora'); inv('perrunfli'); } },
  { id: 'cali', side: true, label: 'Calistenia de Bart', flag: 'cali', apply() { f('metBart', 'cali'); gift('miausis'); inv('bart'); } },
];

// Da por hecho el paso indicado y, si es de la historia principal, todos los anteriores
export function skipTo(id) {
  const i = STEPS.findIndex((s) => s.id === id);
  const todo = STEPS[i].side ? [STEPS[i]] : STEPS.slice(0, i + 1).filter((s) => !s.side);
  for (const s of todo) if (!S.flag(s.flag)) s.apply();
  S.save();
}

export const PLACES = [
  ['Casa de Cait', 'cait', 6, 6], ['Templo', 'isla', 31, 18], ['Gimnasio', 'isla', 38, 26], ['Bosque', 'isla', 40, 12],
  ['Muelle', 'isla', 9, 10], ['Kapadokya', 'isla', 46, 33], ['Apartamento', 'ratitas', 2, 11], ['Castillo', 'castillo', 5, 20], ['Isla Helada', 'helada', 19, 21],
];
export function teleport(i) {
  const [, map, tx, ty] = PLACES[i];
  S.d.pos = { map, x: tx * 16 + 8, y: ty * 16 + 12, dir: 'down' };
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
