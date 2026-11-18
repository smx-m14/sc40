// Niveles del Sokoban de Lolete, de menor a mayor dificultad.
// # pared · . destino · $ caja · @ Colgadín · + Colgadín sobre un destino · * caja sobre destino
// L Lolete (atrapado, cuenta como pared)
// El segundo (el de los calcetines) es la posición más alejada de la solución que admite su habitación (99 pasos
// como mínimo), hallada explorando hacia atrás desde el nivel resuelto: tiene solución garantizada. Aun así resultó
// más sencillo que el de los juguetes, que va el último.
export const LEVELS = [
  {
    hint: '¡Guau! ¡Colgadín! Empuja las cajas hasta las marcas del suelo. ¡Cuidado con arrinconarlas!',
    rows: [
      '#########',
      '#   #  L#',
      '# $   $ #',
      '#.  @  .#',
      '##  $  ##',
      ' #  .  # ',
      ' ####### ',
    ],
  },
  {
    hint: 'Ahora las de los calcetines, que van todas al rincón. Aquí el orden lo es todo. Tómatelo con calma.',
    rows: [
      '##########',
      '#+.$ #   #',
      '#.   #$$ #',
      '#.     # #',
      '# ##  $  #',
      '#       L#',
      '##########',
    ],
  },
  {
    hint: 'Las últimas: las cajas de los juguetes. Cada una a su marca, y piensa antes de empujar: esta es la más difícil.',
    rows: [
      '  #####  ',
      '###   ###',
      '#  $ $  #',
      '# #.#.# #',
      '#  $@$  #',
      '# #.#.# #',
      '#   L   #',
      '#########',
    ],
  },
];
