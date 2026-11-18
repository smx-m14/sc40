// Prueba de oído de Fucsia: suena un fragmento y hay que escribir el título de la canción.
//   · A la primera, sin pistas ............ 10 puntos
//   · Con la pista del artista ............  5 puntos (hay que escribir el título igualmente)
//   · Con la segunda pista (4 opciones) ...  2 puntos (0 si se elige mal)
// Se necesitan 100 puntos. Las canciones salen al azar y no se repiten hasta agotar la colección.
import { State } from './state.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import { FUXIA_SONGS } from './fuxia-songs.js';

export const GOAL = 100;
const POINTS = [10, 5, 2];
const $ = (id) => document.getElementById(id);
const show = (el, on = true) => el.classList.toggle('hidden', !on);
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((v) => v[1]);

// Sin mayúsculas, acentos ni signos: «El Último Vals» → «elultimovals»
export const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
function distance(a, b) { // Levenshtein
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// Acierto aunque falte una tilde, sobre un artículo o haya alguna errata (más margen cuanto más largo es el título)
export function matches(answer, title) {
  const a = norm(answer), t = norm(title);
  if (!a) return false;
  if (a === t) return true;
  const strip = (s) => s.replace(/^(the|el|la|los|las)/, '');
  if (strip(a) === strip(t)) return true;
  const slack = t.length <= 4 ? 0 : t.length <= 8 ? 1 : Math.floor(t.length / 5);
  return distance(a, t) <= slack;
}

let clip = null;
function play(song) {
  if (clip) clip.pause();
  clip = new Audio(`assets/fuxia/${song.id}.mp3`);
  clip.volume = 0.9; clip.muted = State.settings.mute;
  clip.play().catch(() => {});
}

// Devuelve true si se llega a los 100 puntos, false si se sale antes (los puntos se conservan)
export function fuxiaQuiz() {
  return new Promise((resolve) => {
    const prevMusic = Sound.curId;
    Sound.music(null);
    UI.open = 'quiz';
    let score = State.d.flags.fuxiaPts || 0, n = 0, pool = [], song = null, stage = 0, busy = false;
    const inp = $('quiz-input');

    const finish = (won) => {
      if (clip) clip.pause();
      show($('quiz'), false);
      UI.open = null;
      Input.clear();
      inp.onkeydown = null;
      State.d.flags.fuxiaPts = won ? 0 : score; State.save();
      Sound.music(prevMusic, true);
      resolve(won);
    };
    const header = () => { $('quiz-score').textContent = `${score} / ${GOAL} puntos`; $('quiz-n').textContent = `Canción ${n}`; $('quiz-bar').style.width = Math.min(100, score) + '%'; };
    const say = (text, cls = '') => { const m = $('quiz-msg'); m.textContent = text; m.className = cls; };

    const next = () => {
      if (score >= GOAL) return finish(true);
      if (!pool.length) pool = shuffle(FUXIA_SONGS.filter((s) => s !== song));
      song = pool.pop(); stage = 0; n++; busy = false;
      inp.value = ''; inp.disabled = false;
      show($('quiz-typing')); show($('quiz-options'), false);
      $('quiz-hint').textContent = 'Pista: el artista';
      show($('quiz-hint'));
      $('quiz-worth').textContent = `Vale ${POINTS[0]} puntos`;
      say('¿Qué canción es? Escribe el título.');
      header();
      play(song);
      if (!matchMedia('(pointer: coarse)').matches) inp.focus();
    };
    const award = (pts, text) => {
      busy = true;
      score += pts; State.d.flags.fuxiaPts = score; State.save();
      Sound.sfx(pts ? 'get' : 'bad');
      say(text, pts ? 'ok' : 'bad');
      inp.disabled = true;
      header();
      setTimeout(next, 1700);
    };
    const answer = () => {
      if (busy || stage > 1) return;
      const v = inp.value.trim();
      if (!v) return;
      if (matches(v, song.title)) return award(POINTS[stage], `¡Correcto! «${song.title}», de ${song.artist}. +${POINTS[stage]} puntos.`);
      Sound.sfx('bad');
      say(matches(v, song.artist) ? 'Ese es el artista. Lo que quiero es el título de la canción.' : `«${v}»… no es esa. Prueba otra vez o pide una pista.`, 'bad');
      inp.select();
    };
    const hint = () => {
      if (busy || stage >= 2) return;
      stage++;
      Sound.sfx('step');
      if (stage === 1) {
        say(`Pista: la canta ${song.artist}. Escribe el título.`);
        $('quiz-hint').textContent = 'Pista: 4 opciones';
        $('quiz-worth').textContent = `Vale ${POINTS[1]} puntos`;
        if (!matchMedia('(pointer: coarse)').matches) inp.focus();
        return;
      }
      say(`Es de ${song.artist}. ¿Cuál de estas cuatro?`);
      show($('quiz-hint'), false);
      $('quiz-worth').textContent = `Vale ${POINTS[2]} puntos`;
      show($('quiz-typing'), false);
      const box = $('quiz-options');
      box.innerHTML = '';
      for (const o of shuffle([song, ...shuffle(FUXIA_SONGS.filter((s) => s !== song)).slice(0, 3)])) {
        const b = document.createElement('button');
        b.className = 'btn'; b.textContent = o.title;
        b.onclick = () => { if (busy) return; if (o === song) award(POINTS[2], `¡Esa es! «${song.title}». +${POINTS[2]} puntos.`); else award(0, `No: era «${song.title}», de ${song.artist}. Cero puntos.`); };
        box.appendChild(b);
      }
      show(box);
    };

    $('quiz-ok').onclick = answer;
    $('quiz-hint').onclick = hint;
    $('quiz-replay').onclick = () => { if (song) play(song); };
    $('quiz-exit').onclick = () => finish(false);
    $('quiz-win').onclick = () => { score = GOAL; finish(true); };
    show($('quiz-win'), !!State.settings.debug);
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); answer(); } };
    show($('quiz'));
    next();
  });
}
