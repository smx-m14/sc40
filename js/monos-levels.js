// Niveles del bosque de los monos (intercepción por turnos).
// Rejilla de ramas de COLS×ROWS. `monos`: rama [col, fila] de cada mono.
// `seq`: orden fijo en que se pasan a Tigrito (índices de mono), en bucle. `start`: rama inicial de Colgadín.
export const COLS = 6, ROWS = 4;
export const LEVELS = [
  { monos: [[1, 0], [4, 0], [4, 3], [1, 3]], seq: [0, 1, 2, 3, 1], start: [0, 2] },
  { monos: [[0, 0], [3, 0], [5, 1], [4, 3], [1, 3]], seq: [0, 1, 2, 3, 1, 4, 2], start: [2, 2] },
  { monos: [[0, 0], [2, 0], [5, 0], [5, 3], [3, 2], [0, 3]], seq: [0, 1, 2, 4, 3, 5, 4, 1, 3], start: [2, 3] },
];
