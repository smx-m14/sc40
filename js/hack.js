// Hackeo de la puerta de TEDI con JavaScript (lo plantea Ovejoncio, que no cabe por el conducto).
// Cada nivel muestra un trocito de código con un hueco: hay que escribir una expresión JavaScript que,
// usando los datos del código, devuelva la clave. Se ejecuta de verdad en el navegador.
import { State } from './state.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';

const $ = (id) => document.getElementById(id);
const show = (el, on = true) => el.classList.toggle('hidden', !on);

export const LEVELS = [
  {
    vars: { clones: ['oink', 'oink', 'oink', 'oink', 'oink'] },
    code: "const clones = ['oink', 'oink', 'oink', 'oink', 'oink'];\n// Cerradura 1: la clave es cuántos clones hay en la lista\nabrir( ____ );",
    expect: 5,
    hints: ['Los arrays tienen una propiedad que dice cuántos elementos tienen.', 'Prueba con: clones.length'],
  },
  {
    vars: { nombre: 'owinken' },
    code: "const nombre = 'owinken';\n// Cerradura 2: la clave es el nombre en MAYÚSCULAS y al revés\nabrir( ____ );",
    expect: 'NEKNIWO',
    hints: ["toUpperCase() lo pasa a mayúsculas. Para darle la vuelta: split('') → reverse() → join('').", "Prueba con: nombre.toUpperCase().split('').reverse().join('')"],
  },
  {
    vars: { tartas: [3, 7, 2, 9, 4] },
    code: "const tartas = [3, 7, 2, 9, 4];\n// Cerradura 3: la clave es la SUMA de las tartas mayores que 3\nabrir( ____ );",
    expect: 20,
    hints: ['filter() para quedarte con las mayores que 3 y reduce() para sumarlas.', 'Prueba con: tartas.filter(t => t > 3).reduce((a, b) => a + b, 0)'],
  },
];

const show_ = (v) => (typeof v === 'string' ? `'${v}'` : Array.isArray(v) ? `[${v.map(show_).join(', ')}]` : String(v));

// Evalúa la respuesta: tiene que usar los datos (no vale escribir la clave a mano) y devolver lo esperado
export function check(lv, expr) {
  const names = Object.keys(lv.vars);
  if (!names.some((n) => new RegExp(`\\b${n}\\b`).test(expr))) return { ok: false, out: `Error de seguridad: la cerradura solo acepta código que use ${names.join(', ')}.` };
  try {
    const vals = names.map((n) => JSON.parse(JSON.stringify(lv.vars[n])));
    const res = new Function(...names, `"use strict"; return (${expr});`)(...vals);
    const ok = JSON.stringify(res) === JSON.stringify(lv.expect);
    return { ok, out: `→ ${show_(res)}${ok ? '   [OK] ACCESO CONCEDIDO' : '   [ERROR] clave incorrecta'}` };
  } catch (e) {
    return { ok: false, out: `${e.name}: ${e.message}` };
  }
}

// Devuelve true si se abren las tres cerraduras
export function hack() {
  return new Promise((resolve) => {
    UI.open = 'hack';
    let i = State.d.flags.hackLevel || 0, hint = 0;
    const inp = $('hack-input');
    const load = () => {
      const lv = LEVELS[i];
      hint = 0;
      $('hack-level').textContent = `Cerradura ${i + 1} de ${LEVELS.length}`;
      $('hack-code').textContent = lv.code;
      $('hack-out').textContent = '> Escribe la expresión que va en el hueco ____ y pulsa Ejecutar.';
      $('hack-out').className = '';
      $('hack-hint').textContent = 'Pista';
      inp.value = '';
      if (!matchMedia('(pointer: coarse)').matches) inp.focus();
    };
    const finish = (won) => {
      show($('hack'), false); UI.open = null; Input.clear(); inp.onkeydown = null;
      State.d.flags.hackLevel = won ? 0 : i; State.save();
      resolve(won);
    };
    const run = () => {
      const expr = inp.value.trim();
      if (!expr) return;
      const r = check(LEVELS[i], expr);
      $('hack-out').textContent = r.out;
      $('hack-out').className = r.ok ? 'ok' : 'bad';
      if (!r.ok) return Sound.sfx('bad');
      Sound.sfx('get');
      if (++i >= LEVELS.length) return setTimeout(() => finish(true), 900);
      State.d.flags.hackLevel = i; State.save();
      setTimeout(load, 1100);
    };
    $('hack-run').onclick = run;
    $('hack-hint').onclick = () => {
      const h = LEVELS[i].hints;
      $('hack-out').textContent = 'Ovejoncio: ' + h[Math.min(hint, h.length - 1)];
      $('hack-out').className = '';
      hint++;
      $('hack-hint').textContent = hint < h.length ? 'Otra pista' : 'Pista';
    };
    $('hack-exit').onclick = () => finish(false);
    $('hack-win').onclick = () => { i = LEVELS.length; finish(true); };
    show($('hack-win'), !!State.settings.debug);
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } };
    show($('hack'));
    load();
  });
}
