// Exploración: mapa de baldosas, Colgadín, acompañantes, entidades e interacción.
import { State } from '../state.js';
import { Input } from '../input.js';
import { UI } from '../ui.js';
import { Sound } from '../audio.js';
import { buildMap, TILE } from '../maps.js';
import { makeTiles } from '../art.js';
import { SCRIPTS } from '../story.js';
import { traceBeam, beamColor } from '../beam.js';

const SPEED = 74;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
let TILES = null;

export class WorldScene extends Phaser.Scene {
  constructor() { super('world'); }

  create() {
    const pos = State.d.pos;
    this.beamG = null; this.darkR = null; this.nudgeTo = null; this.pressFrom = null; this.gone = false; // la escena se reutiliza: nada de referencias de la visita anterior
    const m = this.map = buildMap(pos.map);
    this.cameras.main.setBackgroundColor(m.id === 'isla' ? '#3f8fd8' : '#1a1412');
    this.drawGround();

    m.objects.forEach((o, i) => this.add.image(o.x, o.y, o.tex).setOrigin(0.5, 1).setDepth(o.flat ? (o.top ? 1.5 : 1) : o.y + i * 1e-4));

    // Entidades
    this.ents = m.ents.map((e) => {
      const cx = e.tx * TILE + 8, by = e.ty * TILE + 15;
      const tex = e.npc ? `${e.npc}_down_0` : e.texFn ? e.texFn() : e.tex;
      const spr = tex ? this.add.image(cx + (e.ox || 0), by + (e.oy || 0), tex).setOrigin(0.5, 1).setDepth(by + (e.oy ? 2 : 0)) : null;
      if (spr && e.spirit) spr.setAlpha(0.88);
      return { e, spr, cx, cy: e.ty * TILE + 8, by: by + (e.oy || 0), on: true };
    });

    // Jugador y acompañantes
    this.p = { x: pos.x, y: pos.y, dir: pos.dir || 'down', moving: false, anim: 0 };
    this.shadow = this.add.image(0, 0, 'shadow').setAlpha(0.25);
    this.pSpr = this.add.image(0, 0, 'colgadin_down_0').setOrigin(0.5, 1);
    this.trail = Array.from({ length: 80 }, () => ({ x: pos.x, y: pos.y, dir: this.p.dir }));
    this.followers = [];
    // Origen en un píxel entero (4 de 9) y posición redondeada: con 0,5 la columna del «!» caía entre dos píxeles y a veces no se pintaba
    this.bubble = this.add.image(0, 0, 'bubble').setOrigin(4 / 9, 1).setDepth(1e6).setVisible(false);
    this.lastTile = this.tileOf();

    // Cámara
    const cam = this.cameras.main, mw = m.w * TILE, mh = m.h * TILE;
    cam.roundPixels = true;
    if (mw > cam.width && mh > cam.height) { cam.setBounds(0, 0, mw, mh); cam.startFollow(this.pSpr, true, 1, 1, 0, 8); }
    else cam.setScroll(-(cam.width - mw) / 2, -(cam.height - mh) / 2);
    cam.fadeIn(250);

    this.sync();
    this.place();
    this.region = undefined;
    this.running = false;
    this.saveT = 0;
    UI.minibar(null);
    UI.hud(true);
    // Música de la zona donde aparece Colgadín (no la general del mapa): si nada más llegar salta un diálogo, la zona
    // no se comprueba hasta que acaba, y sonaba la del mapa (p. ej., la de la Isla Helada al volver al gimnasio)
    const t0 = this.tileOf(), reg0 = m.regions.find((r) => t0.x >= r.x0 && t0.x <= r.x1 && t0.y >= r.y0 && t0.y <= r.y1);
    Sound.music((reg0 && reg0.music) || m.music);
    if (m.id !== 'isla') UI.zone(m.name);
    Input.clear();

    if (m.id === 'cait' && !State.flag('intro')) this.run('intro');
    else if (m.id === 'cait' && !State.flag('fin')) this.run('fiestaCheck');
    else if (m.id === 'helada' && !State.flag('heladaFrio')) this.run('heladaFrio'); // la primera vez que llega
    if (State.after) { const s = State.after; State.after = null; this.run(s); } // guion pendiente al volver de una escena
  }

  drawGround() {
    const m = this.map;
    TILES = TILES || makeTiles();
    const water = (x, y) => '~r'.includes(m.get(x, y));
    this.grounds = [0, 1].map((f) => {
      const key = 'ground' + f;
      if (this.textures.exists(key)) this.textures.remove(key);
      const tex = this.textures.createCanvas(key, m.w * TILE, m.h * TILE);
      const g = tex.getContext();
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        const c = m.tiles[y][x], px = x * TILE, py = y * TILE;
        if (water(x, y)) {
          g.drawImage(TILES['w' + ((x + y + f) % 2)], px, py);
          g.fillStyle = '#bfe3f7';
          if (y > 0 && !water(x, y - 1)) g.fillRect(px, py, 16, 2);
          if (y < m.h - 1 && !water(x, y + 1)) g.fillRect(px, py + 15, 16, 1);
          if (x > 0 && !water(x - 1, y)) g.fillRect(px, py, 1, 16);
          if (x < m.w - 1 && !water(x + 1, y)) g.fillRect(px + 15, py, 1, 16);
        } else g.drawImage(TILES[c] || TILES.g, px, py);
      }
      tex.refresh();
      return this.add.image(0, 0, key).setOrigin(0).setDepth(0).setVisible(f === 0);
    });
  }

  // Recalcula qué entidades existen según el estado de la partida
  sync() {
    this.solidEnts = new Set();
    for (const o of this.ents) {
      o.on = !o.e.when || o.e.when();
      if (o.spr) o.spr.setVisible(o.on);
      if (o.spr && o.e.texFn) o.spr.setTexture(o.e.texFn());
      if (o.on && o.e.solid) this.solidEnts.add(o.e.tx + ',' + o.e.ty);
    }
    // Casa de Cait con la lámpara apagada: la escena se oscurece
    const dark = this.map.id === 'cait' && State.flag('lampOff');
    if (dark && !this.darkR) this.darkR = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0a0c24, 0.45).setOrigin(0).setScrollFactor(0).setDepth(9e5);
    if (this.darkR) this.darkR.setVisible(dark);
    const party = State.d.party;
    if (this.followers.some((f, i) => f.name !== party[i])) { this.followers.forEach((f) => f.spr.destroy()); this.followers = []; }
    while (this.followers.length < party.length) {
      const name = party[this.followers.length];
      this.followers.push({ name, spr: this.add.image(this.p.x, this.p.y, `${name}_down_0`).setOrigin(0.5, 1) });
    }
    UI.updateHud();
    this.drawBeam();
    this.unstick();
  }

  // Si aparece algo sólido justo encima de Colgadín (p. ej., Cuy al quedarse en el templo, en la baldosa desde la
  // que se le hablaba a Cuca), se le aparta a la baldosa libre más cercana para que no se quede atrapado
  unstick() {
    const p = this.p;
    if (!p || !this.blocked(p.x, p.y)) return;
    const t = this.tileOf();
    const near = [];
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (dx || dy) near.push([dx, dy]);
    near.sort((a, b) => Math.hypot(...a) - Math.hypot(...b)); // primero las de al lado (arriba/abajo/lados), luego las diagonales
    for (const [dx, dy] of near) {
      const x = (t.x + dx) * TILE + 8, y = (t.y + dy) * TILE + 12;
      if (!this.blocked(x, y)) { p.x = x; p.y = y; this.lastTile = this.tileOf(); this.trail.push({ x, y, dir: p.dir }); this.place(); return; }
    }
  }

  // Rayo de luz que rebota en los espejos (Apartamento de las Ratitas)
  drawBeam() {
    if (!this.map.beam) return;
    const g = this.beamG = this.beamG || this.add.graphics().setDepth(2);
    if (this.map.id === 'ratitas' && !State.flag('grateOpen')) { g.clear(); return; } // rejilla cerrada: no hay rayo
    const { cells } = traceBeam(this.map, State.d.flags);
    const col = (mask) => beamColor(mask)[1]; // el rayo se tiñe con la mezcla de cristales atravesados
    g.clear();
    let prev = [this.map.beam.src[0] * TILE + 8, this.map.beam.src[1] * TILE - 4], n = 0;
    for (const [x, y, k] of cells) {
      const p = [x * TILE + 8, y * TILE + 8];
      g.lineStyle(5, col(n), 0.25).lineBetween(prev[0], prev[1], p[0], p[1]);
      g.lineStyle(2, col(n), 0.95).lineBetween(prev[0], prev[1], p[0], p[1]);
      prev = p; n = k;
    }
    g.fillStyle(col(n), 0.5).fillCircle(prev[0], prev[1], 5).fillStyle(0xffffff, 1).fillCircle(prev[0], prev[1], 2);
  }

    tileOf() { return { x: Math.floor(this.p.x / TILE), y: Math.floor((this.p.y - 2) / TILE) }; }
  blocked(x, y) {
    for (const [ox, oy] of [[-4, -5], [4, -5], [-4, 0], [4, 0]]) {
      const tx = Math.floor((x + ox) / TILE), ty = Math.floor((y + oy) / TILE);
      if (this.map.solidAt(tx, ty) || this.solidEnts.has(tx + ',' + ty)) return true;
    }
    return false;
  }

  async run(name, ent) {
    if (this.running || !SCRIPTS[name]) return;
    this.running = true;
    this.bubble.setVisible(false);
    let r;
    try { r = await SCRIPTS[name](this, ent ? ent.e : null); } catch (err) { console.error(err); }
    this.running = false;
    if (!this.gone) { this.sync(); this.savePos(); }
    Input.clear();
    return r;
  }

  savePos() {
    Object.assign(State.d.pos, { map: this.map.id, x: Math.round(this.p.x), y: Math.round(this.p.y), dir: this.p.dir });
    State.save();
  }

  warp(map, tx, ty, dir = 'down') {
    this.gone = true;
    State.d.pos = { map, x: tx * TILE + 8, y: ty * TILE + 12, dir };
    State.save();
    Sound.sfx('door');
    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.gone = false; this.scene.restart(); });
  }

  // Lanza un minijuego; al volver, Colgadín aparece en la baldosa (tx, ty)
  startScene(key, tx, ty) {
    this.gone = true;
    State.d.pos = { map: this.map.id, x: tx * TILE + 8, y: ty * TILE + 12, dir: 'down' };
    State.save();
    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.gone = false; this.scene.start(key); });
  }

  findTarget() {
    const [fx, fy] = DIRS[this.p.dir];
    const qx = this.p.x + fx * 12, qy = this.p.y - 3 + fy * 12;
    let best = null, bd = 13;
    for (const o of this.ents) {
      if (!o.on || !o.e.script || o.e.kind === 'step') continue;
      const d = Math.hypot(o.cx - qx, o.cy - qy);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000, p = this.p;
    const wf = Math.floor(time / 600) % 2;
    this.grounds[0].setVisible(wf === 0); this.grounds[1].setVisible(wf === 1);

    // Animación de entidades
    const nf = Math.floor(time / 480) % 2;
    for (const o of this.ents) {
      if (!o.spr || !o.on) continue;
      if (o.e.npc) o.spr.setTexture(`${o.e.npc}_down_${nf}`);
      if (o.e.spirit) o.spr.y = o.by - 2 + Math.sin(time / 500 + o.cx) * 1.5;
      if (o.e.bob) o.spr.y = o.by - 2 + Math.sin(time / 250) * 1.5;
    }

    const free = !UI.busy && !this.running && !this.gone;
    p.moving = false;
    if (!free) { Input.nudge = null; this.nudgeTo = null; } // un toque durante un diálogo no se convierte en paso luego
    if (free) {
      State.d.time += dt;
      let d = Input.dir();
      // Dónde estaba Colgadín al empezar a pulsar: el toque corto se mide desde ahí
      if ((d.x || d.y) && !this.pressFrom) this.pressFrom = { x: p.x, y: p.y };
      // Toque corto en la cruceta táctil: un paso de una baldosa justa, hasta el centro de la siguiente
      if (Input.nudge) {
        // Solo en el eje del toque (nada de diagonales): hasta el centro de la siguiente baldosa en esa dirección,
        // contada desde donde empezó el toque. Antes se contaba desde donde había llegado mientras se pulsaba, y un
        // toque podía acabar en dos baldosas: más de lo que se había pulsado (y costaba salir de los sitios estrechos).
        const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[Input.nudge], from = this.pressFrom || p;
        const ahead = (pos, off, dir) => { const c = Math.floor((pos - off) / TILE) * TILE + off; let t = dir > 0 ? (c > pos ? c : c + TILE) : (c < pos ? c : c - TILE); if (Math.abs(t - pos) < 4) t += dir * TILE; return t; };
        this.nudgeTo = v[0] ? { axis: 'x', to: ahead(from.x, 8, v[0]), v } : { axis: 'y', to: ahead(from.y, 12, v[1]), v };
        Input.nudge = null;
      }
      if (!d.x && !d.y) this.pressFrom = null;
      if (d.x || d.y) this.nudgeTo = null;
      else if (this.nudgeTo) {
        const g = this.nudgeTo, r = g.to - p[g.axis];
        // ya ha llegado (o se ha pasado mientras se pulsaba): se queda donde está
        if (Math.abs(r) < 1 || r * (g.v[0] || g.v[1]) < 0 || this.blocked(p.x + g.v[0] * 2, p.y + g.v[1] * 2)) this.nudgeTo = null;
        else if (Math.abs(r) <= SPEED * dt) { p[g.axis] = g.to; this.nudgeTo = null; p.moving = true; }
        else d = { x: g.v[0], y: g.v[1] };
      }
      if (d.x || d.y) {
        const n = Math.hypot(d.x, d.y), vx = (d.x / n) * SPEED * dt, vy = (d.y / n) * SPEED * dt;
        if (d.y) p.dir = d.y < 0 ? 'up' : 'down';
        if (d.x && (!d.y || this.blocked(p.x, p.y + vy))) p.dir = d.x < 0 ? 'left' : 'right';
        const ox = p.x, oy = p.y;
        if (vx && !this.blocked(p.x + vx, p.y)) p.x += vx;
        if (vy && !this.blocked(p.x, p.y + vy)) p.y += vy;
        // Esquinas: si choca andando en línea recta pero está casi alineado con un hueco (pasillo, puerta), se le
        // recoloca de lado hacia el centro de ese carril en vez de dejarlo atascado contra el canto
        if (ox === p.x && oy === p.y) {
          const slide = (axis, off, step) => {
            const c = Math.round((p[axis] - off) / TILE) * TILE + off, r = c - p[axis];
            if (!r || Math.abs(r) > 7) return;
            const ax = axis === 'y' ? p.x + step : c, ay = axis === 'y' ? c : p.y + step; // ¿está libre el carril, un paso más allá?
            const s = Math.sign(r) * Math.min(Math.abs(r), SPEED * dt);
            if (!this.blocked(ax, ay) && !this.blocked(axis === 'x' ? p.x + s : p.x, axis === 'y' ? p.y + s : p.y)) p[axis] += s;
          };
          if (vx && !vy) slide('y', 12, Math.sign(vx) * 2);
          else if (vy && !vx) slide('x', 8, Math.sign(vy) * 2);
        }
        p.moving = ox !== p.x || oy !== p.y;
        if (p.moving) { this.trail.push({ x: p.x, y: p.y, dir: p.dir }); if (this.trail.length > 240) this.trail.shift(); }
      }
      if (p.moving) p.anim += dt;

      // Baldosas con disparador (puertas, objetos que se recogen al pisarlos)
      const t = this.tileOf();
      if (t.x !== this.lastTile.x || t.y !== this.lastTile.y) {
        const prev = this.lastTile;
        this.lastTile = t;
        const st = this.ents.find((o) => o.on && o.e.kind === 'step' && o.e.tx === t.x && o.e.ty === t.y);
        if (st) {
          this.run(st.e.script, st).then((moved) => {
            if (moved === true || st.e.tex) return;
            p.x = prev.x * TILE + 8; p.y = prev.y * TILE + 12; this.lastTile = prev; // rebote en puertas cerradas
            this.trail.push({ x: p.x, y: p.y, dir: p.dir });
          });
        }
      }

      const target = this.findTarget();
      this.bubble.setVisible(!!target);
      if (target) {
        // Normalmente encima de lo que se puede usar; si ahí quedaría tapada por el borde de arriba o por el marcador
        // (cosas colgadas en la pared de arriba, como cuadros), sale a un lado, a media altura (derecha, o izquierda si no cabe)
        const bob = Math.sin(time / 200), top = (target.spr ? target.spr.y - target.spr.height : target.cy - 6) - 1;
        const view = this.cameras.main.worldView;
        if (top - 12 >= view.y + 16) this.bubble.setPosition(Math.round(target.cx), Math.round(top + bob));
        else {
          const half = target.spr ? target.spr.width / 2 : 8, midY = target.spr ? target.spr.y - target.spr.height / 2 : target.cy;
          const right = target.cx + half + 14 < view.right;
          this.bubble.setPosition(Math.round(target.cx + (right ? half + 6 : -half - 6)), Math.round(midY + 6 + bob));
        }
      }
      if (Input.take('a') && target && !this.running) { Sound.sfx('ok'); this.run(target.e.script, target); }
      if (Input.take('b')) UI.toggleMenu(true);

      // Zonas con nombre
      const reg = this.map.regions.find((r) => t.x >= r.x0 && t.x <= r.x1 && t.y >= r.y0 && t.y <= r.y1) || null;
      if (reg !== this.region) {
        if (reg) UI.zone(reg.name); else if (this.region === undefined) UI.zone(this.map.name);
        this.region = reg;
        Sound.music((reg && reg.music) || this.map.music);
        if (!this.running) this.run('remindInvite'); // ¿se ha quedado alguien sin invitación?
        if (reg && reg.jingle) Sound.jingle(reg.jingle); // sintonía que suena una sola vez al entrar en la zona
      }

      this.saveT += dt;
      if (this.saveT > 3) { this.saveT = 0; this.savePos(); }
    } else Input.take('a');

    this.place();
  }

  place() {
    const p = this.p, f = p.moving ? Math.floor(p.anim / 0.16) % 2 : 0;
    const side = p.dir === 'left' || p.dir === 'right';
    this.pSpr.setTexture(`colgadin_${side ? 'side' : p.dir}_${f}`).setFlipX(p.dir === 'left').setPosition(Math.round(p.x), Math.round(p.y) + 3).setDepth(p.y);
    this.shadow.setPosition(Math.round(p.x), Math.round(p.y) + 2).setDepth(p.y - 0.5);
    this.followers.forEach((fo, i) => {
      const t = this.trail[this.trail.length - 1 - 13 * (i + 1)] || this.trail[0];
      const s = t.dir === 'left' || t.dir === 'right';
      fo.spr.setTexture(`${fo.name}_${s ? 'side' : t.dir}_${f}`).setFlipX(t.dir === 'left').setPosition(Math.round(t.x), Math.round(t.y) + 3).setDepth(t.y - 0.1);
    });
  }
}
