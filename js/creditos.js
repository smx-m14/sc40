// Créditos finales (los muestra js/scenes/movil.js después de los vídeos del móvil de Cait).
// Todo es texto editable: cambiar aquí nombres, cargos y chistes.

// Créditos del juego: bloques con título y líneas [cargo, nombre]. `big` = rótulo grande; `note` = texto suelto.
export const CREDITS = [
  { big: "SUPER CAIT'S 40", note: 'Una producción de Mindeos para Cait, con mucho amor y demasiadas horas.' },
  { title: 'Dirección', lines: [['Idea original, guion y dirección', 'Mindeos'], ['Productor ejecutivo', 'Mindeos'], ['Productora ejecutiva', 'Bart (insistió mucho)']] },
  { title: 'Desarrollo', lines: [['Programación', 'Mindeos y Claude'], ['Pixel art, píxel a píxel', 'Mindeos y Claude'], ['Diseño de puzles demasiado fáciles', 'Claude'], ['Diseño de puzles más difíciles', 'Mindeos (por quejarse)']] },
  { title: 'Música', lines: [['Arreglos chiptune', 'el sintetizador del juego'], ['A partir de los MIDI que fue encontrando', 'Mindeos'], ['DJ residente y gramola', 'Fucsia']] },
  { title: 'Departamentos', lines: [
    ['Mudanzas (menos la cama)', 'Lolete'],
    ['Animación del público', 'Tigrito y los monos'],
    ['Calcetines perdidos y monedas', 'Scooby'],
    ['Traducción simultánea del ruso', 'Cuy'],
    ['Siestas y sabiduría', 'Cuca'],
    ['Control de calidad de espejos', 'Kai'],
    ['Seguridad informática', 'Ovejoncia'],
    ['Preparación física (técnica estricta)', 'Bart, de Fitness Bartory'],
    ['Repostería', 'Mantecas y Manteca2'],
    ['Logística de tartas', 'Heladoncio'],
    ['Iluminación', 'los Owitos de Navidad'],
    ['Globos (con los dientecitos no)', 'Siri y los awawas'],
    ['Transporte marítimo', 'Narwal'],
    ['Catering', 'Perrunfli (paella de nabos)'],
    ['Patrimonio Nacional', 'el Rey Peludito'],
    ['Coordinación secreta', 'los Owitos de la Inquisición'],
    ['Cuidado de clones', 'Owinken'],
    ['Fondo de pantalla', 'Mootoo'],
  ] },
  { title: 'Agradecimientos', note: 'A todos los peluches, mascotas y amigos que se prestaron (sin saberlo) a salir en este juego.' },
  { note: 'Ningún calcetín resultó herido durante el desarrollo de este juego. Algunos siguen sin aparecer.' },
  { note: 'Las canciones, fragmentos y vídeos que suenan y se ven en el juego pertenecen a sus autores. Aquí solo se les quiere mucho.' },
];

// Reparto: sprites del juego (texturas «<nombre>_down_0/1», o una imagen fija), nombre y papel.
export const STARRING = [
  { spr: ['colgadin'], name: 'Colgadín', role: 'el héroe que nadie pidió y todos necesitábamos' },
  { spr: ['lolete'], name: 'Lolete', role: 'mudanzas y cuevas' },
  { spr: ['tigrito'], name: 'Tigrito', role: 'el rey del «¡1, 2, 3!»' },
  { spr: ['cuy', 'ratita_p', 'ratita_o', 'ratita_b'], name: 'Cuy y las ratitas', role: 'las vecinas del apartamento' },
  { spr: ['kai'], name: 'Kai', role: 'el gato del otro lado del espejo' },
  { spr: ['scooby'], name: 'Scooby', role: 'el sabio de los calcetines' },
  { spr: ['cuca'], name: 'Cuca', role: 'la sabia que solo habla ruso' },
  { spr: ['patito'], name: 'Patito', role: 'el más mareado del estanque' },
  { spr: ['capybara', 'capybara'], name: 'Los capybaras', role: 'el balneario' },
  { spr: ['owito_g', 'owito_k', 'owito_w', 'owito_v'], name: 'Owitos del Teatro', role: 'la compañía del Teatro Real' },
  { spr: ['mantecas', 'manteca2'], name: 'Mantecas y Manteca2', role: 'los maestros pasteleros' },
  { spr: ['peludito'], name: 'Rey Peludito', role: 'Su Majestad del Mazapán' },
  { spr: ['gato', 'gatot'], name: 'Los Gemelos bipolares', role: 'ritmo reversible' },
  { spr: ['narwal'], name: 'Narwal', role: 'hijo de dinosaurios' },
  { spr: ['bart'], name: 'Bart', role: 'la dueña de Fitness Bartory' },
  { spr: ['ovejoncio'], name: 'Ovejoncia', role: 'la hacker' },
  { spr: ['owinken'], name: 'Owinken', role: 'el original (de verdad)' },
  { spr: ['heladoncio'], name: 'Heladoncio', role: 'el de la tarta (y el sombrero)' },
  { spr: ['owito_n', 'owito_r'], name: 'Owitos de Navidad', role: 'las luces' },
  { spr: ['siri', 'awawa', 'awawa'], name: 'Siri y los awawas', role: 'los globos' },
  { spr: ['fuxia'], name: 'Fucsia', role: 'la DJ' },
  { spr: ['perrunfli'], name: 'Perrunfli', role: 'el de los nabos' },
  { spr: ['owi_jos', 'owi_lel', 'owi_cas', 'owi_dor', 'owi_mor', 'owi_col'], name: 'Owitos de la Inquisición', role: 'la mesa de guerra' },
  { img: 'movil_fondo', name: 'Mootoo', role: 'el fondo de pantalla' },
  { spr: [], name: 'Y Cait', role: 'el comandante, que nunca sale en pantalla' },
];

export const DISCLAIMER = [
  'AVISO',
  'Los personajes de este juego son una interpretación muy, muy creativa de peluches, mascotas y personas de verdad.',
  'Sus profesiones, títulos nobiliarios, idiomas y dotes para el hackeo son pura invención.',
  'Cualquier parecido con la realidad es pura coincidencia.',
  '(Bueno… casi.)',
];
