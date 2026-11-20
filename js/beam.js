// Rayo de luz del Apartamento de las Ratitas. Sin dependencias: lo usan el dibujo y el guion.
// map.beam = { src: [x, y], dir: [dx, dy], mirrors: [{ id, tx, ty }], gems: [[x, y], …], target: [x, y], stop: [x, y] }
// gems va en este orden: rojo, azul, amarillo, verde. El rayo se tiñe con la mezcla de los cristales que atraviesa.
// flags[id]: 0/undefined = pedestal vacío · 1 = espejo «/» · 2 = espejo «\»
// Devuelve las casillas que recorre (con la mezcla de color que lleva en cada una), si llega al objetivo (`hit`),
// de qué color llega (`color`) y si llega lila, que es rojo + azul y nada más (`solved`).
const R = 1, B = 2, Y = 4, G = 8;
const MIX = {
  0: ['blanca', 0xfff9d0], [R]: ['roja', 0xff6a5a], [B]: ['azul', 0x5a8af0], [Y]: ['amarilla', 0xffe040], [G]: ['verde', 0x5ac85a],
  [R | B]: ['lila', 0xc07af0], [R | Y]: ['naranja', 0xffa040], [B | Y]: ['verde botella', 0x2f8f6a], [B | G]: ['turquesa', 0x40c0c0],
  [R | G]: ['ocre', 0xc08a30], [Y | G]: ['lima', 0xb8e040],
};
export const beamColor = (mask) => MIX[mask] || ['marrón', 0x9a6a40];
export const LILA = R | B;

export function traceBeam(map, flags) {
  const b = map.beam, gems = b.gems || [];
  let [x, y] = b.src, [dx, dy] = b.dir, mask = 0;
  const cells = [];
  for (let i = 0; i < 300; i++) {
    if (map.wallAt(x, y)) break;
    const g = gems.findIndex((k) => k[0] === x && k[1] === y);
    if (g >= 0) mask |= 1 << g;
    cells.push([x, y, mask]);
    if (x === b.stop[0] && y === b.stop[1]) break;
    const fix = (b.fixed || []).find((k) => k.tx === x && k.ty === y);   // espejos atornillados: orientación fija
    const mir = b.mirrors.find((k) => k.tx === x && k.ty === y);
    const st = fix ? fix.st : mir && flags[mir.id];
    if (st === 1) [dx, dy] = [-dy, -dx];
    else if (st === 2) [dx, dy] = [dy, dx];
    x += dx; y += dy;
  }
  const at = cells.find((c) => c[0] === b.target[0] && c[1] === b.target[1]);
  const end = at ? at[2] : mask;
  return { cells, hit: !!at, mask: end, color: beamColor(end)[0], gems: end ? 1 : 0, solved: !!at && end === LILA };
}
