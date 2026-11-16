// Rayo de luz del Apartamento de las Ratitas. Sin dependencias: lo usan el dibujo y el guion.
// map.beam = { src: [x, y], dir: [dx, dy], mirrors: [{ id, tx, ty }], gems: [[x, y], …], target: [x, y], stop: [x, y] }
// flags[id]: 0/undefined = pedestal vacío · 1 = espejo «/» · 2 = espejo «\»
// Devuelve las casillas que recorre, cuántos cristales de color ha atravesado en cada una, si llega al objetivo
// (`hit`) y si además ha pasado por todos los cristales (`solved`).
export function traceBeam(map, flags) {
  const b = map.beam, gems = b.gems || [];
  let [x, y] = b.src, [dx, dy] = b.dir;
  const cells = [], seen = new Set();
  for (let i = 0; i < 300; i++) {
    if (map.wallAt(x, y)) break;
    const g = gems.findIndex((k) => k[0] === x && k[1] === y);
    if (g >= 0) seen.add(g);
    cells.push([x, y, seen.size]);
    if (x === b.stop[0] && y === b.stop[1]) break;
    const fix = (b.fixed || []).find((k) => k.tx === x && k.ty === y);   // espejos atornillados: orientación fija
    const mir = b.mirrors.find((k) => k.tx === x && k.ty === y);
    const st = fix ? fix.st : mir && flags[mir.id];
    if (st === 1) [dx, dy] = [-dy, -dx];
    else if (st === 2) [dx, dy] = [dy, dx];
    x += dx; y += dy;
  }
  const hit = cells.some((c) => c[0] === b.target[0] && c[1] === b.target[1]);
  return { cells, hit, gems: seen.size, solved: hit && seen.size === gems.length };
}
