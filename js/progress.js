// Porcentaje de juego completado. Cada cosa conseguida cuenta un punto; el 100 % exige hacerlo todo.
import { State, CHARACTERS, GACHA, GIFTS, TOTAL_SOCKS, SOCK_DESIGNS } from './state.js';

const STORY = ['invites', 'lolete', 'tigrito', 'caveOpen', 'r1', 'r2', 'r3', 'kai', 'cuy', 'hatchOpen', 'cuyTemple',
  'pato', 'simon', 'horno', 'andamios', 'gateOpen', 'narwal', 'cali', 'tediHack', 'tedi', 'tarta', 'luces', 'globos', 'gramola', 'fin'];
const SIDE = ['paella'];

export function completion() {
  const d = State.d, f = d.flags;
  const count = (list) => list.filter((k) => f[k]).length;
  // Curiosidades: un vale de Aeroflot, un cuenco de Biang Biang y devolverle el sombrero a Heladoncio. (La tarta entera ya
  // no cuenta aquí: desde que Narwal solo acepta la tarta completa, entregarla es parte de la historia.)
  const extras = [d.vales > 0, !!f.biang, !!f.hat]; // la mesa de guerra de los Owitos ya cuenta como invitación
  const parts = [
    { name: 'Historia', done: count(STORY), total: STORY.length },
    { name: 'Pruebas opcionales', done: count(SIDE), total: SIDE.length },
    { name: 'Invitaciones entregadas', done: d.invited.length, total: CHARACTERS.length },
    { name: 'Calcetines encontrados', done: d.socks.length, total: TOTAL_SOCKS },
    { name: 'Parejas entregadas a Scooby', done: d.traded.length, total: SOCK_DESIGNS.length },
    { name: 'Regalos del gachapón', done: d.gacha.length, total: GACHA.length },
    { name: 'Regalos especiales', done: d.gifts.length, total: Object.keys(GIFTS).length },
    { name: 'Curiosidades', done: extras.filter(Boolean).length, total: extras.length },
  ];
  const done = parts.reduce((n, p) => n + Math.min(p.done, p.total), 0), total = parts.reduce((n, p) => n + p.total, 0);
  // Solo marca 100 si de verdad está todo; nunca redondea hacia arriba
  return { pct: done >= total ? 100 : Math.min(99, Math.floor((done / total) * 100)), done, total, parts };
}
