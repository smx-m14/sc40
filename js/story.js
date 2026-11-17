// Guion: qué pasa al interactuar con cada entidad. Cada script recibe (scene, ent).
// Un script de tipo "step" puede devolver true si ha cambiado de mapa/escena.
import { State, GACHA, GIFTS, CHARACTERS, HATCH_CODE, SOCK_DESIGNS, SOCK_DESIGN, TOTAL_SOCKS } from './state.js';
import { traceBeam } from './beam.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import { gachaIcon } from './art.js';
import { fuxiaQuiz, GOAL } from './fuxia.js';
import { hack } from './hack.js';

const S = State;
const C = 'Colgadín';

// Aviso de objeto conseguido. `big` hace sonar la Música de Logro.
function give(text, big = false) { if (big) Sound.logro(); else Sound.sfx('get'); UI.toast(text); UI.updateHud(); }
function invite(id, name) { if (S.flag('invites') && S.invite(id)) give(`{invites} Invitación entregada a ${name}`); }
function gift(id) { if (S.gift(id)) give(`{gift} ${GIFTS[id].name}`, true); }
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((v) => v[1]);

// Pista sobre qué hacer ahora (la usan Scooby y el menú)
export function hint() {
  if (!S.flag('invites')) return 'Recoge las invitaciones de la mesa de casa.';
  if (!S.flag('lolete')) return 'Se oyen ladridos en casa de Lolete, al oeste de la isla.';
  if (!S.flag('tigrito')) return 'En el bosque del noreste unos monos no dejan pasar a nadie. Dicen que se han llevado a Tigrito.';
  if (!S.flag('caveOpen')) return 'Pasado el bosque hay una cueva tapada por un derrumbe. Lolete cava como nadie.';
  if (!(S.flag('r1') && S.flag('r2') && S.flag('r3'))) return 'Al otro lado de la cueva está el Apartamento de las Ratitas. Cada ratita guarda un espejo y un número.';
  if (!S.flag('kai')) return 'Kai duerme delante de la puerta de Cuy. Con los tres espejos se puede llevar el rayo de sol hasta su hocico.';
  if (!S.flag('cuy')) return 'Cuy está en su cuarto, al fondo del apartamento. Tiene una pregunta sobre Cuca.';
  if (!S.flag('hatchOpen')) return 'El candado de la alcantarilla tiene cuatro cifras. La última está escrita en ruso: la nevera ayuda.';
  if (!S.flag('cuyTemple')) return 'Lleva a Cuy al Templo de los Sabios: por fin alguien puede traducir a Cuca.';
  if (!S.flag('pato')) return 'En el Castillo de Mazapán, los capybaras no se atreven a entrar en su estanque: algo hace «cuac» entre los juncos.';
  if (!S.flag('simon')) return 'Los Owitos del Teatro Real no pueden ensayar sin Tigrito.';
  if (!S.flag('horno')) return 'En la Pastelería Real, Mantecas necesita manos para hornear el mazapán de la muralla.';
  if (!S.flag('gateOpen')) return 'La muralla está entera, pero los andamios siguen tapando la puerta del castillo. Los gatos reversibles saben desmontarlos… al compás.';
  if (!S.flag('narwal')) return 'Toca en el muelle la melodía de los Owitos con el Otamatone.';
  if (!S.flag('tediHack')) return 'En la Isla Helada, la puerta de TEDI está cerrada. Una oveja muy grande tiene un plan.';
  if (!S.flag('tedi')) return 'La puerta de TEDI está abierta: toca apagar la máquina clonadora.';
  if (!S.flag('cali')) return 'Heladoncio no te dará la tarta hasta que entrenes en el Fitness Fattory.';
  if (!S.flag('tarta')) return 'Heladoncio tiene la tarta lista en Sweet Famosa. Hay que llevarla hasta Narwal.';
  if (!S.flag('luces')) return 'Los Owitos de Navidad, en la Isla Helada, tienen las luces para la fiesta.';
  if (!S.flag('globos')) return 'Una fiesta sin globos no es fiesta. Dicen que al sur del castillo hay unos bichitos con muchos.';
  if (!S.flag('gramola')) return 'Falta la música: Fuxia, al suroeste de la Isla de Cait, quiere ponerte a prueba.';
  if (!S.flag('fin')) return '¡Todo listo! Vuelve a casa de Cait para empezar la fiesta.';
  return 'La fiesta ha sido un éxito. Puedes seguir paseando, buscar calcetines o repetirla desde la mesa de casa de Cait.';
}
UI.hintFn = hint;

const RUSO = [
  'Гав-гав! Колгадин, носкибургер самоварка!',
  'Да-да… бабушка катюшка, косточка привет!',
  'Спутник борщ, Каит сорок годик! Ура!',
  'Матрёшка? Нет. Сосиска? Да, да, да!',
];

// Preguntas de la paella. Solo valen: arroz, pollo, conejo, batxoqueta, garrofó, tomate, aceite, azafrán, sal y agua.
const PAELLA = [
  { q: 'Empezamos fácil. ¿Qué es lo primero que cae en la paella?', ok: 'Aceite de oliva',
    bad: { Mantequilla: '¿Mantequilla? Esto es una paella, no un cruasán.', Mayonesa: 'Mayonesa… Voy a hacer como que no he oído nada.' } },
  { q: 'Ahora la carne. ¿Cuál echamos?', ok: 'Pollo y conejo',
    bad: { Chorizo: '¡¿CHORIZO?! Eso es «arroz con cosas». En Valencia se acaba de desmayar alguien.', 'Salchichas': 'Salchichas. En la paella. Lolete, tápate las orejas.' } },
  { q: 'La verdura. Piénsalo bien.', ok: 'Batxoqueta y garrofó',
    bad: { Guisantes: 'Los guisantes, a la menestra. Siguiente intento.', Nabos: '¡Que los nabos NO SE TOCAN! Ni los martes ni nunca.' } },
  { q: '¿Y qué se sofríe con la carne y la verdura?', ok: 'Tomate rallado',
    bad: { Cebolla: 'La cebolla ablanda el arroz. Y mi paciencia.', 'Pimiento rojo': 'El pimiento es para las paellas de las postales.' } },
  { q: 'El color y el aroma. ¿De dónde salen?', ok: 'Azafrán',
    bad: { Cúrcuma: 'Casi amarillo, casi correcto, totalmente mal.', 'Rotulador amarillo': 'Creativo. Pero no.' } },
  { q: '¿Le ponemos algo del mar?', ok: 'Nada: solo sal y agua',
    bad: { Gambas: 'Eso es otro plato. Muy rico, pero otro plato.', Mejillones: 'Mejillones… ¿Tú has venido a provocar?' } },
  { q: 'Y la última, la más importante. ¿Qué es lo que NO puede faltar?', ok: 'Arroz',
    bad: { Fideos: 'Eso es fideuà, y se hace otro día.', Cuscús: 'Me voy a sentar un momento.' } },
];

// Bart habla MUCHO. Es así.
const BART_INTRO = [
  '¡HOLA! ¡Bienvenido a FITNESS FATTORY! Soy Bart, monitora, y antes de que digas nada: sí, hago calistenia.',
  'La calistenia, por si no lo sabes, que seguro que no lo sabes, viene del griego «kallos», belleza, y «sthenos», fuerza.',
  'Belleza y fuerza. Como yo. Bueno, y como una barra bien anclada a la pared, que también tiene lo suyo.',
  'Mucha gente cree que la calistenia es hacer dominadas. ERROR. La calistenia es una forma de vida. Y también hacer dominadas.',
  'Yo empecé hace seis años. Antes hacía máquinas. ¿Sabes lo que te dan las máquinas? Nada. Aislamiento. Tristeza. Un bíceps sin contexto.',
  'En cambio, con el peso corporal trabajas cadenas musculares completas. COMPLETAS. Desde la escápula hasta el dedo gordo del pie.',
  'Hablando de escápulas: la retracción escapular. La gente no retrae. Se cuelga de la barra como un jamón. Sin ofender, que tú te llamas Colgadín.',
  'Mira, la progresión es sencilla: primero australianas, luego negativas, luego dominada estricta, luego lastrada, luego muscle-up, luego front lever…',
  '…luego back lever, luego bandera humana, luego plancha, y luego ya te compras un parque para ti solo.',
  'Yo el front lever lo saqué en catorce meses. Podría haber sido en doce, pero un día me resfrié. Aún me duele. El resfriado no, perder dos meses.',
  'Y no me hables del kipping. El kipping NO es una dominada. El kipping es un pez fuera del agua con cuota mensual.',
  '¿Por dónde iba? Ah, sí. El agarre. Prono, supino, neutro. Hay gente que usa correas. Yo a esa gente no la juzgo. La miro fijamente, pero no la juzgo.',
  'Total, que aquí mismo, en esta barra, se conocieron Cait y Mindeos. Cait estaba haciendo… bueno, estaba mirando la barra. Mindeos también. Fue precioso.',
  'Tengo un regalo guardado para Cait desde entonces. Pero no se lo doy a cualquiera: primero tienes que demostrarme que respetas la calistenia.',
];
const BART_MAS = [
  'Te cuento una cosa de la plancha. La plancha no es aguantar. La plancha es EMPUJAR EL SUELO mientras aprietas glúteo, abdomen, cuádriceps y carácter. Treinta segundos bien hechos valen más que tres minutos pensando en la cena. Yo en la cena también pienso, pero en proteína.',
  '¿Sabías que el magnesio no es para que resbale menos? Bueno, sí es para eso. Pero también es un estado mental. Hay días que me pongo magnesio para ir a comprar el pan. La barra de pan también es una barra, piénsalo.',
  'El otro día vino uno y me dijo que hacía calistenia «en casa, con una app». Con una app. Le pregunté por su retracción escapular y se fue llorando. Aquí se viene llorado de casa.',
  'Mi rutina es sencilla: lunes empuje, martes tirón, miércoles pierna (mentira, nadie hace pierna), jueves empuje, viernes tirón, sábado skills y domingo hablarle a la gente de mi rutina.',
];

// Cuarto de ratita resuelto: espejo + cifra del candado
let cheeseStep = 0;
async function roomDone(n, who, line) {
  await UI.say(who, line);
  S.set('r' + n);
  const total = ['r1', 'r2', 'r3'].filter((k) => S.flag(k)).length;
  give(`{mirror} Espejo de mano (${total}/3)`, true);
}

export const SCRIPTS = {
  // ---------------------------------------------------------- Casa de Cait
  async intro() {
    await UI.say(C, [
      '¡Hoy es el gran día! ¡Cait cumple 40 años!',
      'Voy a prepararle la mejor fiesta sorpresa que se haya visto en la isla.',
      'A ver… hacen falta invitados, música, luces… ¡y una tarta enorme!',
      'Lo primero: las invitaciones. Las dejé encima de la mesa.',
    ]);
    S.set('intro');
  },
  async invites() {
    Sound.logro();
    await UI.say('', [
      '¡Has conseguido las INVITACIONES para la fiesta de Cait!',
      'En letra pequeña pone: «Esta invitación NO ha sido generada con IA».',
      '(En el dibujo, Cait tiene siete dedos en cada mano y sonríe con tres filas de dientes.)',
    ]);
    S.set('invites');
    await UI.say(C, '¡Perfectas! Ahora, a repartirlas por toda la isla.');
  },
  async bed() { await UI.say(C, 'La cama de Cait. Hoy no hay tiempo para siestas… bueno, quizá luego.'); },
  async shelf() { await UI.say(C, 'La estantería de Cait: videojuegos, mangas y un hueco perfecto para un regalo.'); },
  async exitCait(scene) {
    if (!S.flag('invites')) { await UI.say(C, '¡Espera! No puedo irme sin las invitaciones. Están en la mesa.'); return false; }
    scene.warp('isla', 22, 11, 'down');
    return true;
  },
  async enterCait(scene) { scene.warp('cait', 6, 7, 'up'); return true; },

  // ---------------------------------------------------------- Lolete
  async doorLolete(scene) {
    if (S.flag('lolete')) {
      await UI.say('', 'La casa de Lolete. Sigue llena de cajas… ya las ordenará después de la fiesta.');
      return false;
    }
    await UI.say('???', ['¡Guau, guau! ¿Hay alguien ahí?', '¡Estaba preparando la mudanza y me he quedado atrapado entre las cajas!']);
    const c = await UI.choose(C, '¡Es Lolete! ¿Entro a ayudarle?', ['¡Vamos!', 'Ahora no']);
    if (c !== 0) return false;
    scene.startScene('sokoban', 11, 18);
    return true;
  },
  async loleteRescued() {
    Sound.logro();
    await UI.say('Lolete', [
      '¡LIBRE! ¡Gracias, Colgadín! Pensaba que iba a vivir para siempre entre cartón.',
      '¿Una fiesta sorpresa para Cait? ¡Cuenta conmigo!',
      'Y si por el camino hay que cavar algo, yo cavo. Es mi especialidad.',
    ]);
    S.set('lolete');
    if (S.flag('caveOpen')) S.goHome('lolete'); else S.join('lolete');
    invite('lolete', 'Lolete');
    await UI.say('', '¡Lolete se une a la aventura!');
  },

  // ---------------------------------------------------------- Cueva
  async rubble(scene) {
    if (!S.flag('lolete')) {
      await UI.say(C, ['Un derrumbe tapa la entrada de la cueva.', 'Haría falta alguien que sepa cavar…']);
      return;
    }
    await UI.say('Lolete', '¿Un montón de piedras? ¡Déjamelo a mí!');
    Sound.sfx('dig'); scene.cameras.main.shake(700, 0.006);
    await new Promise((r) => scene.time.delayedCall(800, r));
    S.set('caveOpen');
    scene.sync();
    Sound.sfx('get');
    await UI.say('Lolete', [
      '¡Listo! Túnel abierto. Y ni me he despeinado.',
      'Mi trabajo aquí ha terminado. Me voy a casa de Cait a ir preparando la fiesta: alguien tiene que inflar los globos.',
    ]);
    S.goHome('lolete');
    scene.sync();
    await UI.say('', 'Lolete se marcha a casa de Cait. ¡Nos vemos en la fiesta!');
  },
  async cave(scene) { scene.warp('ratitas', 2, 11, 'up'); return true; },

  // ---------------------------------------------------------- Bosque de los monos
  async monos(scene) {
    if (!S.flag('metMonos')) {
      await UI.say('Monos', ['¡Uh uh uh! ¡Ah ah ah!', '¡Por aquí no se pasa! ¡Estamos jugando a pasarnos la pelota!']);
      await UI.say(C, ['Eso no es una pelota… ¡es TIGRITO!', '¡Aguanta, Tigrito! ¡Voy a por ti!']);
      S.set('metMonos');
    } else await UI.say('Monos', '¡Uh uh! ¿Otra vez tú? ¡La pelota amarilla es nuestra!');
    const c = await UI.choose(C, '¿Me cuelgo de las ramas para rescatar a Tigrito?', ['¡A por él!', 'Ahora no']);
    if (c !== 0) return;
    scene.startScene('monos', 41, 12);
  },
  async tigritoRescued() {
    Sound.logro();
    await UI.say('Tigrito', [
      '¡Grrr… gracias, Colgadín! Tres horas de rama en rama. Estoy mareadísimo.',
      'Yo solo había venido al bosque a ensayar, que los Owitos del Teatro me esperan para poner la música de su obra.',
      '¿Una fiesta para Cait? ¡Me apunto! Voy contigo, que al teatro se llega por el castillo.',
    ]);
    S.set('tigrito');
    if (S.flag('simon')) S.goHome('tigrito'); else S.join('tigrito');
    invite('tigrito', 'Tigrito');
    await UI.say('Monos', '¡Uh uh…! Vale, nos hemos pasado. Dejamos el camino libre. ¿Habrá plátanos en esa fiesta?');
    await UI.say('', '¡Tigrito se une a la aventura! Los monos despejan el camino hacia la cueva.');
  },

  // ---------------------------------------------------------- Apartamento de las Ratitas
  async exitRatitas(scene) { scene.warp('isla', 46, 10, 'down'); return true; },
  async signRatitas() {
    await UI.say('', [
      'APARTAMENTO DE LAS RATITAS. El único apartamento real que existe.',
      '(Cualquier parecido con «Apartamento para tres» es imposible: esa sitcom solo se emite en la cabeza de Cait y no pasó del episodio piloto.)',
    ]);
  },
  async grate() { await UI.say('', ['Por la rejilla del techo se cuela un rayo de sol que cae recto hasta el suelo. Si algo lo desviara…', 'Por el pasillo hay nueve pedestales vacíos, tres espejos atornillados al suelo que no se pueden mover y dos cristales de color.']); },
  async kaiSleep() {
    await UI.say('', ['Kai, el gato negro, duerme atravesado delante de la puerta de Cuy. Ronca como una moto.', 'No hay quien lo mueva. Aunque dicen que no hay gato que se resista a un puntito de luz…']);
  },
  async kai() {
    await UI.say('Kai', 'Mrrrau. (Está muy ocupado sujetando el puntito de luz con las dos patas.)');
    if (S.flag('invites') && !S.d.invited.includes('kai')) {
      await UI.say('', 'Le dejas la invitación al lado. La pisa. En idioma gato, eso es que sí.');
      invite('kai', 'Kai');
    }
  },
  async mirror(scene, ent) {
    if (S.flag('kai')) return UI.say('', 'El espejo está justo donde tiene que estar. Mejor no tocarlo.');
    const f = S.d.flags, ids = scene.map.beam.mirrors.map((m) => m.id);
    const have = ['r1', 'r2', 'r3'].filter((k) => f[k]).length, placed = ids.filter((k) => f[k]).length;
    const cur = f[ent.id] || 0;
    if (!cur) {
      if (have <= placed) return UI.say('', have ? 'Un pedestal vacío. No te quedan espejos en las manos: recoge alguno de otro pedestal o consigue más.' : 'Un pedestal vacío. Aquí encajaría un espejo de mano.');
      f[ent.id] = 1; Sound.sfx('get');
    } else if (cur === 1) { f[ent.id] = 2; Sound.sfx('step'); }
    else { f[ent.id] = 0; Sound.sfx('undo'); UI.toast('{mirror} Recoges el espejo del pedestal'); }
    S.save();
    scene.sync();
    const b = traceBeam(scene.map, f);
    if (!b.hit) return;
    await new Promise((r) => scene.time.delayedCall(500, r));
    if (!b.solved) {
      return UI.say('', [
        b.gems ? 'Un puntito de color baila delante del hocico de Kai. Abre un ojo… y lo vuelve a cerrar.' : 'Un puntito de luz blanca baila delante del hocico de Kai. Ni se inmuta.',
        'Dicen que a Kai solo le vuelven loco los puntitos MORADOS. Y el morado sale de mezclar rojo y azul…',
      ]);
    }
    await UI.say('', ['Un puntito morado baila justo delante del hocico de Kai…', 'Kai abre un ojo. Luego el otro. Se le dilatan las pupilas.']);
    Sound.logro();
    S.set('kai');
    scene.sync();
    await UI.say('Kai', '¡¡MIAU!!');
    await UI.say('', 'Kai se lanza a cazar el puntito y deja libre la puerta del cuarto de Cuy.');
  },
  async mirrorFixed() { await UI.say('', 'Un espejo atornillado al suelo sobre una base de piedra. No se puede girar ni quitar: habrá que contar con él.'); },
  async gem(scene, ent) { await UI.say('', `Un cristal ${ent.id === 'gem_r' ? 'rojo' : 'azul'} sobre una peana. La luz que lo atraviesa sale teñida de su color.`); },
  // Cocina: cinco quesos. Primero los de tamaño par (2.º y 4.º), de menor a mayor; luego los impares (1.º, 3.º y 5.º)
  async cheese(scene, ent) {
    if (S.flag('r1')) return UI.say('', 'Ñam. Ya no quedan más que migas.');
    const ORDER = [2, 4, 1, 3, 5];
    if (ent.size !== ORDER[cheeseStep]) {
      const was = cheeseStep;
      cheeseStep = 0;
      Sound.sfx('bad');
      return UI.say('Ratita gris', was ? `¡Iiik! Ibas bien: llevabas ${was}. Pero ese no tocaba. Vuelta a empezar.` : '¡Iiik! Por ese no se empieza. Repasa mis normas.');
    }
    cheeseStep++;
    Sound.sfx('rep');
    if (cheeseStep < ORDER.length) return UI.say('', `Ñam. (${cheeseStep} de ${ORDER.length})`);
    await UI.say('', 'ÑAM. ¡Los cinco, y en el orden de la casa!');
    await roomDone(1, 'Ratita gris', 'Así da gusto. Toma: mi espejo de mano. Y apunta: la primera cifra del candado es el 1.');
  },
  async ratitaP() {
    if (S.flag('r1')) return UI.say('Ratita gris', 'La primera cifra es el 1. Y los quesos, primero los pares.');
    await UI.say('Ratita gris', [
      '¡Iiik! Bienvenido al Apartamento de las Ratitas. Vivimos tres… bueno, cuatro con Cuy. Y un gato, pero ese no paga alquiler.',
      '¿El candado de la alcantarilla? Cada una sabemos una cifra. La mía te la digo si demuestras buenos modales en la mesa.',
      'En mi cocina hay cinco quesos, todos de tamaño distinto. Ordénalos en la cabeza del más pequeño (el 1.º) al más grande (el 5.º).',
      'Las normas de la casa: primero se muerden los que ocupan puesto PAR, de menor a mayor. Después los de puesto IMPAR, también de menor a mayor.',
      'Si te equivocas, se empieza otra vez. Y fíjate bien, que algunos se parecen mucho.',
    ]);
  },
  async ratitaO() {
    const R = 'Ratita blanca';
    if (S.flag('r2')) return UI.say(R, 'La segunda cifra es el 9. Y ahora calla, que empieza el capítulo. (La tele sigue apagada.)');
    await UI.say(R, [
      '¡Chsss! Estoy viendo «Apartamento para tres». Sí, con la tele apagada: esa serie solo existe en la cabeza de Cait y no pasó del piloto.',
      'En los anuncios, que son todos, me entretengo contando lo que hay en mi salón. Mi cifra del candado sale de una cuenta.',
      'Multiplica los COJINES por las TAZAS. Al resultado súmale los CUADROS. Y a eso réstale las PLANTAS.',
      'Cuenta solo lo de este cuarto. Y mira bien por los rincones, que soy muy desordenada.',
    ]);
    const n = await UI.code('Cojines × tazas + cuadros − plantas =', 2);
    if (n === null) return;
    if (+n !== 9) { Sound.sfx('bad'); return UI.say(R, `¿${+n}? ¡Meeec! Risas enlatadas. Cuenta otra vez, despacito.`); }
    await roomDone(2, R, '¡Nueve! Dos cojines por cinco tazas, más dos cuadros, menos tres plantas. Toma mi espejo. La segunda cifra es el 9.');
  },
  async tv() { await UI.say('', 'La tele está apagada. En la pantalla solo se refleja una ratita blanca riéndose de un chiste que nadie ha contado.'); },
  async ratitaB(scene) {
    const R = 'Ratita parda';
    if (S.flag('r3')) return UI.say(R, 'La tercera cifra es el 8. Y gracias por la luz: ya puedo dormir.');
    if (!S.flag('metRatitaB')) {
      await UI.say(R, [
        'No puedo dormir a oscuras. Necesito las CINCO lámparas de mi cuarto encendidas a la vez.',
        'El problema es el electricista: cada interruptor enciende o apaga su lámpara… y alguna otra. Cada vez que arreglo una, se me apaga la de al lado.',
        'Si consigues dejarlas todas encendidas, te doy mi espejo y mi cifra.',
      ]);
      S.set('metRatitaB');
      return;
    }
    if (await UI.choose(R, 'Sigo a oscuras. ¿Quieres que las apague todas para empezar de cero?', ['Apágalas todas', 'No, sigo yo']) === 0) {
      S.d.flags.lamps = [0, 0, 0, 0, 0]; S.save(); Sound.sfx('undo'); scene.sync();
    }
  },
  // Cada interruptor cambia su lámpara y otras. Única solución desde todo apagado: roja, azul, amarilla y rosa.
  async lamp(scene, ent) {
    if (S.flag('r3')) return UI.say('', 'La lámpara da una luz calentita. Mejor no tocar nada.');
    const TOGGLE = [[0, 2], [1, 3], [2, 3, 1], [3, 2, 0], [4, 0, 3]];
    const L = S.d.flags.lamps = S.d.flags.lamps || [0, 0, 0, 0, 0];
    for (const j of TOGGLE[ent.n]) L[j] = L[j] ? 0 : 1;
    S.save();
    Sound.sfx('step');
    scene.sync();
    if (!L.every(Boolean)) return;
    await new Promise((r) => scene.time.delayedCall(400, r));
    await roomDone(3, 'Ratita parda', '¡Las cinco! ¡Qué maravilla, se ve todo! Toma mi espejo. Y la tercera cifra del candado es el 8.');
    scene.sync();
  },
  async fridge() {
    S.set('imanes');
    await UI.say('', ['La nevera está llena de imanes de letras raras que forman tres palabras. Debajo de cada una, alguien ha pegado una etiqueta:', '«ЖБЛ» = SOL\n«ШЮЯ» = TÍA\n«ЛДЦ» = LEY'], { ruso: true });
  },
  async note() {
    S.set('nota');
    await UI.say('', ['Una nota clavada en la pared, con la letra de Cuca:', '«Д Ш Д Ю Ж»'], { ruso: true });
    await UI.say(S.flag('cuy') ? C : 'Cuy', S.flag('cuy') ? 'La cuarta cifra del candado, en ruso… y Cuy dijo que Cuca lo escribía todo al revés.' : 'Es la cuarta cifra del candado. Cuca me la apuntó en ruso para que nadie la entendiera. Y encima ella lo escribía todo al revés, de derecha a izquierda. Funcionó: tampoco la entiendo yo.');
  },
  async cuy() {
    const Y = 'Cuy';
    if (!S.flag('metCuy')) {
      await UI.say(Y, ['¡Cui, cui! ¿Quién ha despertado a Kai? …¡Colgadín!', 'Antes de nada, una pregunta. Es muy importante.']);
      S.set('metCuy');
    }
    const opts = shuffle(['Cuca siempre está con nosotros', 'No, ya no está', '¿Qué Cuca?']);
    if (opts[await UI.choose(Y, '¿Está Cuca?', opts)] !== 'Cuca siempre está con nosotros') {
      Sound.sfx('bad');
      return UI.say(Y, '…Cui. (Cuy se da la vuelta, muy serio. Quizá esperaba otra respuesta.)');
    }
    await UI.say(Y, [
      '¡Lo sabía! ¡Cui, cui, cui! Cuca siempre está con nosotros.',
      'Yo era el único que la entendía, ¿sabes? Solo habla ruso. Si me llevas contigo, te hago de traductor.',
    ]);
    if (await UI.choose(Y, '¿Puedo unirme a la aventura?', ['¡Vente!', 'Ahora no']) !== 0) return UI.say(Y, 'Cui… Aquí estaré. No tengo otro apartamento.');
    S.set('cuy');
    S.join('cuy');
    Sound.logro();
    invite('cuy', 'Cuy y las ratitas');
    await UI.say('', '¡Cuy se une a la aventura! Con él podrás entender a Cuca en el Templo de los Sabios.');
  },
  async hatch(scene) {
    if (S.flag('hatchOpen')) {
      if (await UI.choose('', 'La alcantarilla baja, oscura y pegajosa de azúcar, hasta el Castillo de Mazapán.', ['Bajar', 'Ahora no']) === 0) scene.warp('castillo', 5, 20, 'right');
      return;
    }
    await UI.say('', 'La tapa de la alcantarilla que lleva al Castillo de Mazapán. Tiene un candado de cuatro cifras.');
    const code = await UI.code('Candado de la alcantarilla');
    if (code === null) return;
    if (code !== HATCH_CODE) { Sound.sfx('bad'); return UI.say('', `${code.split('').join(' ')}… El candado no cede.`); }
    Sound.logro();
    S.set('hatchOpen');
    scene.sync();
    await UI.say('', ['¡CLAC! 1 · 9 · 8 · 7.', '1987… ¡El año en que nació Cait!', 'La tapa se abre. Huele a mazapán.']);
  },

  // ---------------------------------------------------------- Castillo de Mazapán
  async sewerDown() {
    await UI.say(C, ['Uf… Me he hartado a mazapanes. Por esa alcantarilla ya no quepo ni de lado.', 'Tendré que salir por la puerta principal… cuando quiten los andamios.']);
    return false;
  },
  async exitCastle(scene) { scene.warp('isla', 50, 28, 'down'); return true; },
  async gateIn() { await UI.say('', 'La puerta principal del castillo, cerrada y cubierta de andamios. El Rey Peludito no la abrirá hasta que la muralla esté reconstruida.'); },
  async peludito(scene) {
    const P = 'Rey Peludito';
    if (!S.flag('metPeludito')) {
      await UI.say(P, [
        '¡Miau! Digo… ¡Ejem! Soy el Rey Peludito, soberano del Castillo de Mazapán.',
        '¿Has entrado por la alcantarilla? Normal. La puerta principal no se puede abrir.',
        'Unos cerditos rosas, todos idénticos, se han comido media muralla. Y hasta que no esté reconstruida la puerta se queda cerrada: órdenes del arquitecto real. Que soy yo.',
        'El mazapán para tapar los agujeros se hornea en la Pastelería Real, pero Mantecas no da abasto. Si le echas una pata…',
      ]);
      S.set('metPeludito');
      return;
    }
    if (S.flag('horno') && !S.flag('gateOpen')) {
      return UI.say(P, [
        '¡La muralla vuelve a estar entera! Y huele de maravilla.',
        'Pero la puerta sigue tapada por los andamios. De desmontarlos se encargan los gatos reversibles, ahí junto a la puerta.',
        'Trabajan al compás… cuando están del lado contento.',
      ]);
    }
    if (S.flag('gateOpen') && !S.d.invited.includes('peludito')) {
      await UI.say(P, '¿Una fiesta para Cait? Un rey nunca falta a una fiesta. Sobre todo si hay tarta.');
      return invite('peludito', P);
    }
    if (!S.flag('horno')) return UI.say(P, 'La Pastelería Real está al este de la plaza. Sin mazapán no hay muralla, y sin muralla no hay puerta.');
    invite('peludito', P);
    await UI.say(P, 'Reinar cansa mucho. Me quedo aquí, en mi trono, esperando a que empiece la fiesta. Sentado. Como casi siempre.');
  },
  async capybaras(scene) {
    const K = 'Capybara';
    if (!S.flag('metCapys')) {
      await UI.say(K, [
        '…',
        'Nosotros solo queremos remojarnos en nuestro estanque. Pero entre los juncos hay ALGO.',
        'Hace un ruido espantoso. «Cuac». Así, sin avisar. Dicen que es un pato feroz.',
      ]);
      S.set('metCapys');
    } else await UI.say(K, '…Sigue ahí. Ha vuelto a hacer «cuac».');
    if (await UI.choose(C, '¿Me acerco a ver qué hay entre los juncos?', ['Con mucho cuidado', 'Ahora no']) !== 0) return;
    scene.startScene('pato', 27, 12);
  },
  async patoDone() {
    await UI.say('Patito', [
      '¡¡CUAC!! ¡No me comas! …Espera. ¿Colgadín?',
      'Qué susto. Creía que eras uno de esos ratones gigantes que rondan el estanque. Llevo días sin salir de los juncos.',
    ]);
    await UI.say(C, 'No son ratones: son capybaras. Y están aterrados… de ti.');
    await UI.say('Patito', ['¿De mí? Si yo ni siquiera soy un pato. Me llaman Patito porque soy amarillo.', 'Y el «cuac» lo hago cuando me pongo nervioso.']);
    await UI.say('Capybara', '¿Ese era el monstruo? Pero si es blandito. Anda, ven al agua, que hay sitio para todos.');
    Sound.logro();
    S.set('pato');
    await UI.say('Capybara', 'Gracias, Colgadín. Te debemos un baño. Cuando quieras, hay sitio.');
    invite('patito', 'Patito');
    invite('capybaras', 'los capybaras');
  },
  async capybarasHappy() { invite('capybaras', 'los capybaras'); await UI.say('Capybara', 'Glu, glu, glu. Por fin en remojo. El agua está a la temperatura exacta de no hacer nada. A la fiesta vamos, pero despacio.'); },
  async patito() { invite('patito', 'Patito'); await UI.say('Patito', 'Cuac. Es broma, ya no estoy nervioso. Bueno, un poco. ¿En la fiesta habrá ratones gigantes?'); },
  async teatro(scene) {
    const D = 'Owito director';
    if (S.flag('simon')) return UI.say('', 'Dentro siguen ensayando «Malowita». Ya van por el segundo acto: el de la escoba.');
    if (!S.d.party.includes('tigrito')) {
      return UI.say(D, ['¡No se puede ensayar! ¡Nos falta Tigrito, el músico!', 'Se fue al bosque a practicar y no ha vuelto. Sin música no hay musical. Solo hay… «cal».']);
    }
    await UI.say(D, ['¡TIGRITO! ¡Por fin! ¡Estrenamos «Malowita» y no hemos ensayado ni una vez con música!', 'Tú, el de las orejas caídas: necesito a alguien que marque las entradas.']);
    if (await UI.choose(C, '¿Entro al ensayo?', ['¡Arriba el telón!', 'Ahora no']) !== 0) return;
    scene.startScene('simon', 5, 8);
  },
  async simonDone() {
    const D = 'Owito director';
    Sound.logro();
    await UI.say(D, ['¡Bravo! ¡Bravísimo! Ha sido… ¡popular!', 'Toma, Colgadín: un OTAMATONE, el instrumento oficial de los Owitos. Te lo has ganado.']);
    S.set('simon');
    give('{music} Otamatone', true);
    await UI.say(D, ['Y guarda bien esa melodía.', 'Dice la leyenda que esa canción puede llamar a grandes animales capaces de surcar los mares…']);
    invite('owitos_teatro', 'los Owitos del Teatro');
    await UI.say('Tigrito', 'Yo ya he cumplido con el teatro. Me voy a casa de Cait a ensayar el «Cumpleaños feliz». ¡Nos vemos en la fiesta!');
    S.goHome('tigrito');
    await UI.say('', 'Tigrito se marcha a casa de Cait.');
  },
  async gatos(scene) {
    const G = 'Gato reversible';
    if (S.flag('andamios')) { invite('gatos', 'los gatos reversibles'); return UI.say(G, ['Miau. (Este lado está contento.)', '¿Una fiesta? Iremos los dos. Uno sonreirá en las fotos y el otro pondrá esta cara. Equilibrio.']); }
    if (!S.flag('horno')) return UI.say(G, ['Miau. (Está del lado enfurruñado.)', '¿Desmontar los andamios con la muralla llena de agujeros? Ni hablar. Primero, mazapán.']);
    await UI.say(G, [
      '¡Miau! Somos los gatos reversibles. Si algo sale bien, se nos ve contentos. Si sale mal, nos damos la vuelta.',
      'Los andamios se desmontan a martillazos, pero al compás: yo marco el ritmo y tú lo repites.',
    ]);
    if (await UI.choose(G, '¿Le damos al martillo?', ['¡Al compás!', 'Ahora no']) !== 0) return;
    scene.startScene('ritmo', 19, 24);
  },
  async ritmoDone() {
    Sound.logro();
    await UI.say('Gato reversible', ['¡Ocho tablones al suelo! Mira qué cara de contento se me ha quedado. Por este lado, claro.', 'El otro sigue enfurruñado. Es su naturaleza.']);
    S.set('andamios');
    invite('gatos', 'los gatos reversibles');
    await UI.say('Rey Peludito', '¡Sin andamios y con la muralla entera! ¡Que se abra la puerta principal del Castillo de Mazapán!');
    S.set('gateOpen');
    await UI.say('', 'La puerta principal se abre. Ya se puede entrar y salir del castillo por el sur de la plaza.');
  },
  async statue(scene, ent) {
    await UI.say('', [
      'Estatua de piedra: «Su Majestad el Rey Peludito, sentado. Como casi siempre».',
      'Estatua de piedra: «El Rey Peludito blandiendo la Espada de Mazapán en la batalla contra el hambre de media tarde».',
      'Estatua de piedra: «El Rey Peludito con cetro y capa el día de su coronación. La capa era una manta».',
    ][ent.n - 1]);
  },
  async plazaVend1() { await UI.say('Vendedora', ['¡Frutas de mazapán! ¡Recién pintadas! Naranjas, fresas, peras…', 'Son las mismas que usan para tapar la muralla. Si ves un agujero con forma de pera, no he sido yo.']); },
  async plazaVend2() { await UI.say('Vendedor', ['Vendo recuerdos del castillo: muralla en porciones individuales.', 'Bueno, vendía. El Rey dice que eso es «comerse el patrimonio».']); },
  async plazaPintor() { await UI.say('Owito pintor', ['Chsss. Estoy retratando a Su Majestad. Es el retrato número cuarenta y uno.', 'Siempre sale igual: redondo, peludo y con cara de querer merendar.']); },
  async plazaGuardia() { await UI.say('Guardia real', S.flag('gateOpen') ? 'Puerta abierta, muralla entera y ni un cerdito a la vista. Hoy es un buen día para ser guardia.' : 'La puerta principal no se abre hasta que acaben las obras. Órdenes del Rey. Y del arquitecto. Que es el Rey.'); },
  async owitoT() { await UI.say('Owito tanuki', 'Yo hago de mono volador. Llevo sombrero porque el presupuesto no daba para alas.'); },
  async owitoC() { await UI.say('Owito de la suerte', 'El rosa combina bien con el verde. Lo dice el libreto, lo dice el telón y lo digo yo.'); },
  async mantecas(scene) {
    const M = 'Mantecas';
    if (S.flag('horno')) return UI.say(M, 'La muralla ha quedado para comérsela. Pero NO te la comas. Te estoy mirando. Bueno, no: tengo los ojos cerrados. Pero te oigo masticar.');
    if (!S.flag('metMantecas')) {
      await UI.say(M, [
        '¡Bienvenido a la Pastelería Real! Yo soy Mantecas y ese es Manteca2. No preguntes por Manteca1.',
        'Aquí se hornea el mazapán con el que se reconstruye la muralla del castillo. Almendra y azúcar, nada más.',
        'Y vamos fatal de tiempo: cada vez que tapamos un agujero, alguien se come otro.',
      ]);
      S.set('metMantecas');
    }
    if (await UI.choose(M, '¿Te pones el delantal?', ['¡A hornear!', 'Ahora no']) !== 0) return;
    scene.startScene('horno', 32, 19);
  },
  async hornoDone() {
    Sound.logro();
    await UI.say('Mantecas', ['¡DIEZ PEDIDOS! ¡Manteca2, owitos, a tapar agujeros!', 'Tú avisa al Rey Peludito: la muralla está lista y ya puede abrir la puerta.']);
    S.set('horno');
    invite('mantecas', 'Mantecas y Manteca2');
    await UI.say('', 'Los albañiles reales colocan los mazapanes en la muralla. Ha quedado como nueva (y ligeramente mordisqueable).');
  },

  // ---------------------------------------------------------- Isla Helada
  async heladoncio(scene) {
    const H = 'Heladoncio';
    if (S.flag('tarta')) { invite('heladoncio', H); return UI.say(H, 'La tarta ya va camino de casa de Cait a lomos de Narwal. Yo llevo las velas. Cuarenta. Las he contado tres veces.'); }
    if (!S.flag('metHel')) {
      await UI.say(H, [
        'Bienvenido a SWEET FAMOSA, la fábrica de pasteles más dulce del hemisferio helado. Soy Heladoncio, maestro pastelero.',
        '¿Ves las cascadas? Chocolate negro, chocolate blanco, crema de Speculoos y crema de pistacho. Los panettones se rellenan hasta que revientan. Así debe ser.',
        '¿Una tarta para Cait? Me encantaría… pero cada pastel que sale del horno se lo lleva un cerdito rosa antes de que nadie pueda probarlo.',
        'Vienen de TEDI, la fábrica de ahí al lado. Tienen una máquina que no para de escupirlos. Mientras siga encendida, no hay tarta que dure.',
      ]);
      S.set('metHel');
      return;
    }
    if (S.flag('tedi') && !S.flag('cali')) {
      return UI.say(H, [
        '¡La máquina se ha parado! Ya puedo hornear en paz.',
        'Pero una tarta de cuatro pisos pesa lo suyo, y por el camino quedan clones. Así, sin preparación, no te la doy: se te caería en el primer resbalón.',
        'Ve al Fitness Fattory, aquí al lado, y que Bart te ponga en forma. Luego hablamos.',
      ]);
    }
    if (!S.flag('tedi')) return UI.say(H, 'Mientras esa máquina de TEDI siga escupiendo clones, aquí no llega un pastel entero ni a la puerta. Está al este, la del logo azul y amarillo.');
    await UI.say(H, ['¡La máquina se ha parado! ¡Por fin puedo hornear en paz!', 'Tengo lista una tarta de cuatro pisos para Cait. Solo falta llevarla hasta Narwal… y aún quedan clones despistados por el camino.']);
    if (await UI.choose(H, '¿La llevamos entre los dos?', ['¡Vamos!', 'Ahora no']) !== 0) return;
    scene.startScene('tarta', 19, 20);
  },
  async tartaDone(layers) {
    const H = 'Heladoncio';
    Sound.logro();
    await UI.say(H, [
      layers === 4 ? '¡Los cuatro pisos, intactos! Eres mejor repartidor que yo pastelero. Casi.' : `¡Hemos llegado! Con ${layers} ${layers === 1 ? 'piso' : 'pisos'}. Los clones se han dado un festín, pero una tarta es una tarta.`,
      '¿Sabes? A mí también casi se me llevan una vez. En Edimburgo. Estaba en un escaparate y alguien dudó… pero al final me vine a casa.',
      'Narwal la lleva a casa de Cait. Y yo voy detrás: a esa fiesta no falto.',
    ]);
    S.set('tarta', layers);
    give(`{cake} Tarta de ${layers} ${layers === 1 ? 'piso' : 'pisos'}`);
    invite('heladoncio', H);
  },
  async sfDoor() {
    await UI.say('', [
      'SWEET FAMOSA — Old School. Por la fachada caen cascadas de chocolate negro, chocolate blanco, crema de Speculoos y crema de pistacho.',
      'Por la ventana se ve cómo rellenan un panettone. Le sale crema por arriba, por los lados y por sitios que un panettone no debería tener.',
    ]);
  },
  async tediDoor(scene) {
    if (S.flag('tedi')) return UI.say('', 'La fábrica TEDI está apagada. Dentro, los clones se han quedado quietos, mirando una máquina que ya no hace nada.');
    if (!S.flag('tediHack')) return UI.say('', ['La puerta de TEDI está cerrada con un panel de seguridad. Por dentro se oye un «oink» multiplicado por mil.', 'Junto a la entrada, una oveja enorme mira la puerta con los brazos cruzados. Bueno, con las patitas.']);
    await UI.say('', ['TEDI. Dentro se oye un «oink» multiplicado por mil y el zumbido de una máquina enorme.', 'Un cartel dice: «Clones generados con IA. Cualquier parecido con un cerdito real es exactamente la idea».']);
    if (await UI.choose(C, '¿Entro a apagar la máquina clonadora?', ['¡Adentro!', 'Ahora no']) !== 0) return;
    scene.startScene('tedi', 30, 11);
  },
  async tediDone() {
    Sound.logro();
    await UI.say('', ['La máquina clonadora da un último resoplido y se apaga. Los clones se quedan quietos.', 'De una compuerta sale un cerdito igual que los demás, pero con cara de llevar mucho sin dormir.']);
    await UI.say('Owinken', [
      '¡Oink! ¡Libre! Soy Owinken. El original. Me tenían enchufado ahí dentro para copiarme con IA.',
      'No se lo tengas en cuenta a mis clones: no son malos, solo tienen hambre. Mucha. Como yo, pero por mil.',
      '¿Una fiesta? ¿Con tarta? Dime dónde y cuándo.',
    ]);
    S.set('tedi');
    invite('owinken', 'Owinken');
  },
  async ovejoncio() {
    const O = 'Ovejoncio';
    if (S.flag('tediHack')) {
      invite('ovejoncio', O);
      return UI.say(O, S.flag('tedi') ? 'Máquina apagada, Owinken libre. Lo celebraré comiéndome un trozo de césped. Bueno, de nieve.' : 'La puerta está abierta. Yo vigilo desde aquí. Si algo sale mal, grita «¡beeee!».');
    }
    if (!S.flag('metOvejoncio')) {
      await UI.say(O, [
        'Beee. Soy Ovejoncio. Llevo días intentando entrar en TEDI para pararles los pies a esos clones.',
        'La puerta se abre desde un panel que está dentro. Y la única forma de llegar es ese conducto de ventilación.',
        'Yo no quepo: tengo demasiada lana. Tú, en cambio, eres justo del tamaño.',
        'El panel se programa en JavaScript. Tú escribe; yo te dicto pistas desde aquí fuera.',
      ]);
      S.set('metOvejoncio');
    }
    if (await UI.choose(O, '¿Te metes por el conducto?', ['¡Me meto!', 'Ahora no']) !== 0) return;
    await UI.say('', 'Colgadín se escurre por el conducto de ventilación. Al fondo brilla un terminal con tres cerraduras.');
    if (!(await hack())) return UI.say(O, 'Sal cuando quieras. El terminal recuerda en qué cerradura te quedaste.');
    Sound.logro();
    S.set('tediHack');
    invite('ovejoncio', O);
    await UI.say(O, ['¡CLIC! ¡La puerta de TEDI está abierta!', 'Cait lo habría hecho con los ojos cerrados, pero tú no lo has hecho nada mal.', 'Yo me quedo aquí vigilando. Ah, y a la fiesta voy. Llevo el portátil.']);
  },
  async owinken() { invite('owinken', 'Owinken'); await UI.say('Owinken', 'Estoy enseñando a mis clones a pedir las cosas por favor. Vamos por «oink, por favor». Es un comienzo.'); },
  async clon() { await UI.say('Clon', ['Oink. Soy Owinken. Oink. Soy Owinken. Oink. Soy Owinken.', '(Lleva un pastel debajo de cada pata y te mira sin parpadear. Tiene seis dedos en una pezuña.)']); },
  async navidad(scene) {
    const N = 'Owito de Navidad';
    if (S.flag('luces')) { invite('owitos_navidad', 'los Owitos de Navidad'); return UI.say(N, 'Las luces ya están de camino a casa de Cait. Y si sobra espumillón, también.'); }
    await UI.say(N, [
      '¡Feliz Navidad! Sí, todo el año. Es nuestra casa, son nuestras normas.',
      'Tenemos las luces perfectas para el cumpleaños de Cait. El problema es que nadie recuerda cómo se conectaban.',
    ]);
    if (await UI.choose(N, '¿Nos ayudas a tender el cable?', ['¡Claro!', 'Ahora no']) !== 0) return;
    scene.startScene('luces', 8, 11);
  },
  async lucesDone() {
    Sound.logro();
    await UI.say('Owito de Navidad', ['¡Se han encendido todas! ¡Qué bonito! ¡Qué gasto de luz!', 'Las descolgamos y las llevamos a casa de Cait. Cuenta con nosotros para la fiesta.']);
    S.set('luces');
    invite('owitos_navidad', 'los Owitos de Navidad');
  },

  // ---------------------------------------------------------- La fiesta
  async fiestaCheck(scene, ent, forced) {
    const ready = S.flag('luces') && S.flag('tarta') && S.flag('gramola') && S.flag('globos');
    if (!ready) {
      if (forced) await UI.say(C, 'Todavía no está todo: ' + [!S.flag('gramola') && 'falta la música', !S.flag('luces') && 'faltan las luces', !S.flag('globos') && 'faltan los globos', !S.flag('tarta') && 'falta la tarta'].filter(Boolean).join(', ') + '.');
      return;
    }
    const missing = CHARACTERS.filter((c) => !S.d.invited.includes(c.id));
    const line = missing.length ? `Luces, globos, tarta y música: ¡todo listo! Aunque ${missing.length === 1 ? 'falta por invitar a' : 'faltan por invitar'} ${missing.map((c) => c.name).join(', ')}.` : 'Luces, globos, tarta, música… ¡y todos los invitados! No falta nada.';
    await UI.say(C, line);
    if (await UI.choose(C, S.flag('fin') ? '¿Repetimos la fiesta?' : '¿Empezamos la fiesta sorpresa?', ['¡Que empiece la fiesta!', 'Todavía no']) !== 0) return;
    scene.startScene('fiesta', 6, 6);
  },
  async fiestaTable(scene, ent) { return SCRIPTS.fiestaCheck(scene, ent, true); },

  // ---------------------------------------------------------- Invitados en casa de Cait
  async homeGuest(scene, ent) {
    const lines = {
      lolete: ['Estoy inflando globos. Bueno, mordiéndolos. Es un proceso.', 'He escondido las cajas de la mudanza debajo de la cama de Cait. Ni se nota.'],
      tigrito: ['Estoy ensayando el «Cumpleaños feliz» en cuatro tonalidades, por si acaso.'],
    }[ent.who] || ['¡Preparando la fiesta!'];
    const n = S.d.flags['home_' + ent.who] = ((S.d.flags['home_' + ent.who] || 0) + 1);
    await UI.say(CHARACTERS.find((c) => c.id === ent.who).name, lines[n % lines.length]);
  },

  // ---------------------------------------------------------- Fuxia
  async fuxia() {
    const F = 'Fuxia';
    if (S.flag('gramola')) {
      invite('fuxia', F);
      if (await UI.choose(F, 'La gramola ya está camino de casa de Cait. ¿Quieres otra ronda, solo por gusto? Te pongo canciones distintas.', ['¡Otra ronda!', 'Ahora no']) !== 0) return;
      if (await fuxiaQuiz()) await UI.say(F, 'Otros cien puntos. Empiezo a pensar que me espías la colección.');
      return;
    }
    if (!S.flag('metFuxia')) {
      await UI.say(F, [
        'Soy Fuxia, la mayor melómana de la isla. Tengo más discos que zanahorias.',
        '¿Música para la fiesta de Cait? Podría llevar mi gramola y toda mi colección…',
        '…pero no pincho para cualquiera. Antes tendrás que demostrar que tienes buen oído.',
      ]);
      S.set('metFuxia');
    }
    const pts = S.d.flags.fuxiaPts || 0;
    await UI.say(F, [
      `Te pongo un trocito de una canción y tú me escribes el título. ${pts ? `Llevas ${pts} puntos de ${GOAL}.` : `Necesitas ${GOAL} puntos.`}`,
      'A la primera son 10 puntos. Si me pides una pista te digo quién la canta, y entonces vale 5. Y si aun así no caes, te doy cuatro opciones por 2 puntitos.',
      'No me pongo tiquismiquis con las tildes ni con las mayúsculas. Y cada vez saco discos distintos.',
    ]);
    if (await UI.choose(F, '¿Empezamos?', ['¡Dale!', 'Ahora no']) !== 0) return;
    if (!(await fuxiaQuiz())) return UI.say(F, `Te quedas con ${S.d.flags.fuxiaPts || 0} puntos. Vuelve cuando quieras: te los guardo.`);
    Sound.logro();
    S.set('gramola');
    await UI.say(F, ['¡Cien puntos! ¡Oído absoluto! Bueno, oído suficiente.', 'Trato hecho: llevo la gramola y toda mi colección a la fiesta de Cait. Hoy pincho yo.']);
    invite('fuxia', F);
  },
  async doorFuxia() {
    await UI.say('', 'Dentro suena música a todo volumen. Fuxia no deja entrar a nadie mientras ordena sus discos.');
    return false;
  },

  // ---------------------------------------------------------- Templo de los Sabios
  async scooby() {
    if (!S.flag('metScooby')) {
      await UI.say('Scooby', [
        '¡Colgadín! Qué alegría verte por el templo.',
        'Cuca y yo cuidamos de Cait desde aquí arriba. Siempre estamos con él, aunque no nos vea.',
        '¿La aureola? Viene con el puesto. Queda elegante, ¿verdad?',
      ]);
      S.set('metScooby');
      if (S.flag('invites')) await UI.say('Scooby', '¿Una invitación para nosotros? No nos perderíamos esa fiesta por nada.');
      invite('scooby', 'Scooby');
      await UI.say('Scooby', 'Por cierto: si encuentras calcetines desparejados, tráemelos. Te doy una moneda de gachapón por cada pareja. Pero pareja de verdad: los dos del mismo dibujo.');
    } else invite('scooby', 'Scooby');

    const pairs = S.pairsAvailable();
    if (pairs.length) {
      const names = pairs.map((d) => 'los ' + SOCK_DESIGNS[d]).join(', ');
      await UI.say('Scooby', `¡Snif, snif! ¡Eso que huelo es una pareja completa! Me quedo ${names}.`);
      S.d.traded.push(...pairs); S.d.coins += pairs.length; S.save();
      Sound.sfx('coin');
      give(`{coin} +${pairs.length} moneda${pairs.length > 1 ? 's' : ''} de gachapón`);
    } else {
      const loose = S.d.socks.filter((s) => !S.d.traded.includes(SOCK_DESIGN[s])).length;
      if (loose) await UI.say('Scooby', `Llevas ${loose === 1 ? 'un calcetín suelto' : loose + ' calcetines sueltos'}, pero ninguno hace pareja con otro. Tienen que ser del mismo dibujo. La pareja de cada uno suele andar lejos.`);
    }
    if (S.flag('cuyTemple')) await UI.say('Scooby', 'Los consejos, ahora, pídeselos a Cuca, que por fin se la entiende. Yo me quedo con los calcetines.');
    else await UI.say('Scooby', 'Un consejo de sabio: ' + hint());
  },
  async cuca(scene) {
    if (!S.flag('cuy')) {
      await UI.say('Cuca', RUSO[(S.d.flags.cucaN = ((S.d.flags.cucaN || 0) + 1)) % RUSO.length], { ruso: true });
      await UI.say(C, '…No he entendido ni una palabra. Cuca solo habla ruso. Haría falta un traductor.');
      return;
    }
    if (!S.flag('cuyTemple')) {
      await UI.say('Cuca', RUSO[0], { ruso: true });
      await UI.say('Cuy', ['¡CUCA! ¡Cui, cui, cui!', 'Dice: «¡Colgadín! ¡Ya era hora de que trajeras a alguien con estudios!»']);
      await UI.say('Cuca', RUSO[2], { ruso: true });
      await UI.say('Cuy', [
        'Dice que lleva meses dándote consejos buenísimos y tú poniendo cara de calcetín.',
        'Y que claro que va a la fiesta de Cait. Que ella no se ha ido nunca.',
      ]);
      invite('cuca', 'Cuca');
      await UI.say('Cuy', 'Yo me quedo aquí con ella, que tenemos mucho de qué hablar. Si necesitas una pista, ven: yo traduzco.');
      S.d.party = S.d.party.filter((p) => p !== 'cuy');
      S.set('cuyTemple');
      scene.sync();
      await UI.say('', 'Cuy se queda en el templo con Cuca. A partir de ahora, Cuca da las pistas.');
      return;
    }
    invite('cuca', 'Cuca');
    await UI.say('Cuca', RUSO[(S.d.flags.cucaN = ((S.d.flags.cucaN || 0) + 1)) % RUSO.length], { ruso: true });
    await UI.say('Cuy', 'Dice: «' + hint() + '»');
  },
  async signTemple() { await UI.say('', 'TEMPLO DE LOS SABIOS. Suba la escalinata con respeto. Se aceptan calcetines.'); },

  // ---------------------------------------------------------- Biang Biang
  async biang() {
    await UI.say('', [
      'BIANG BIANG MIAN — fideos anchos como cinturones, estirados a mano.',
      'El carácter «biáng» tiene 58 trazos. El cocinero lleva tres días pintando el cartel y va por la mitad.',
    ]);
    const c = await UI.choose('', '¿Pedir un cuenco?', ['¡Uno picante!', 'Ahora no']);
    if (c !== 0) return;
    Sound.sfx('biang');
    await UI.say('Cocinero', '¡BIANG! ¡BIANG!');
    S.set('biang');
    Sound.sfx('biang');
    await UI.say('', [
      '(Es el ruido de la masa al golpear la mesa. De ahí el nombre.)',
      'Te sirven un único fideo de dos metros. Colgadín lo sorbe entero sin respirar.',
    ]);
  },

  // ---------------------------------------------------------- Campo de nabos
  async perrunfli() {
    const P = 'Perrunfli';
    if (S.flag('paella')) {
      invite('perrunfli', P);
      return UI.say(P, ['La paella va a salir de escándalo. Y sin un solo guisante.', 'Los nabos siguen sin tocarse, por cierto.']);
    }
    if (!S.flag('metPerrunfli')) {
      await UI.say(P, [
        '¡Hombre, Colgadín! Sí, sí, es un campo de nabos. Ya sé lo que estás pensando.',
        'No creerás que te vamos a poner a recoger nabos los martes a las 23:37 h, ¿verdad?',
        'Aquí los nabos ni se compran ni se venden ni se pudren. Son de adorno.',
        'Lo que sí estamos preparando en el pueblo es una paella valenciana para la fiesta de Cait.',
        'El problema es que cada vecino dice que lleva una cosa distinta, y ya hemos tenido dos peleas y media.',
      ]);
      S.set('metPerrunfli');
    }
    const c = await UI.choose(P, '¿Tú sabes qué lleva una paella valenciana DE VERDAD?', ['Claro que sí', 'Mejor otro día']);
    if (c !== 0) return UI.say(P, 'Pues vuelve cuando lo tengas claro. Los nabos y yo no nos movemos.');

    let fails = 0;
    for (const p of PAELLA) {
      for (;;) {
        const opts = shuffle([p.ok, ...Object.keys(p.bad)]);
        const pick = opts[await UI.choose(P, p.q, opts)];
        if (pick === p.ok) { Sound.sfx('get'); break; }
        fails++;
        Sound.sfx('bad');
        await UI.say(P, p.bad[pick]);
      }
    }
    S.set('paella');
    await UI.say(P, [
      fails === 0 ? '¡Ni un fallo! Tú has nacido con una paella debajo del brazo.' : `¡Eso es! Con ${fails === 1 ? 'un susto' : fails + ' sustos'} por el camino, pero lo tenemos.`,
      'Arroz, pollo, conejo, batxoqueta, garrofó, tomate, aceite, azafrán, sal y agua. Y NADA MÁS.',
      'Te has ganado esto. Es para Cait: una Mocadorà.',
    ]);
    gift('mocadora');
    await UI.say('', '¡Has conseguido la MOCADORÀ! Un pañuelo anudado lleno de figuritas de mazapán con forma de frutas y hortalizas de la huerta valenciana.');
    invite('perrunfli', P);
    await UI.say(P, 'Y cuenta conmigo para la fiesta. Llevo la paella. Y ni un nabo.');
  },

  // ---------------------------------------------------------- Fitness Fattory
  async bart(scene) {
    const B = 'Bart';
    if (!S.flag('metBart')) {
      await UI.say(B, BART_INTRO);
      S.set('metBart');
    } else if (!S.flag('cali')) {
      await UI.say(B, ['¡Has vuelto! Sabía que la barra te llamaba. La barra siempre llama.', BART_MAS[(S.d.flags.bartN = ((S.d.flags.bartN || 0) + 1)) % BART_MAS.length]]);
    } else {
      await UI.say(B, BART_MAS[(S.d.flags.bartN = ((S.d.flags.bartN || 0) + 1)) % BART_MAS.length]);
      invite('bart', B);
      const again = await UI.choose(B, '¿Otra tanda? Las escápulas no se retraen solas.', ['Venga, otra', 'Me duele todo']);
      if (again === 0) scene.startScene('cali', 26, 18);
      return;
    }
    const c = await UI.choose(B, 'Tres series: dominadas, fondos y muscle-ups. Técnica ESTRICTA. ¿Empezamos?', ['Vale…', 'Ahora no']);
    if (c !== 0) {
      return UI.say(B, 'Eso mismo dijo Cait el primer día. «Ahora no». Y mira, volvió. Volvió porque aquí conoció a Mindeos, no por la barra, pero volvió. Te espero. Yo siempre estoy aquí. Literalmente: duermo colgada.');
    }
    scene.startScene('cali', 26, 18);
  },
  async bartWin() {
    const B = 'Bart';
    Sound.logro();
    await UI.say(B, [
      '¡¡ESO ES!! ¡Técnica limpia! ¡Sin kipping! Estoy… estoy un poco emocionada. Es el magnesio, que se me mete en los ojos.',
      'Te lo has ganado. Esto lleva guardado en mi taquilla desde el día que Cait y Mindeos se conocieron aquí.',
      'Lo fui llenando yo con las fotos que me mandaban de sus viajes. Lo llamo el Libro de los Miausis.',
    ]);
    gift('miausis');
    await UI.say('', '¡Has conseguido el LIBRO DE LOS MIAUSIS! Un álbum de fotos de Cait y Mindeos.');
    await UI.album();
    invite('bart', B);
    await UI.say(B, 'Puedes volver a mirarlo cuando quieras desde el menú. Y ahora, hablando de retracción escapular…');
    await UI.say(C, '(Colgadín sale corriendo.)');
  },
  async gymDoor() {
    await UI.say('', ['FITNESS FATTORY. «Entra como puedas, sal como una barra».', 'Dentro huele a magnesio y a sufrimiento. La monitora está fuera, hablando con alguien que ya se ha ido.']);
  },

  // ---------------------------------------------------------- Kapadokya
  async siri(scene) {
    const N = 'Siri';
    if (S.flag('globos')) {
      invite('siri', 'Siri y los awawas');
      return UI.say(N, ['¡Awawa! Los globos ya están camino de casa de Cait. Mis sobrinos van dentro, claro.', 'Vuelve cuando quieras. Aquí siempre hay un awawa asomado a algo.']);
    }
    if (!S.flag('metSiri')) {
      await UI.say(N, [
        '¡Awawa! Bienvenido a KAPADOKYA. Soy Siri. Sí, soy un damán. No, no soy un conejillo de Indias. Mira qué dientecitos.',
        'Aquí vivimos en madrigueras excavadas en las chimeneas de hadas. Y esos globos de ahí arriba son nuestros.',
        '¿Globos para una fiesta? Te los prestaría… pero mis sobrinos no dejan nada en paz hasta que alguien les gana a su juego favorito.',
        'Se pasan un calcetín de madriguera en madriguera. Si consigues quitárselo tres veces, los globos son tuyos.',
      ]);
      S.set('metSiri');
    }
    if (await UI.choose(N, '¿Juegas con ellos?', ['¡A por el calcetín!', 'Ahora no']) !== 0) return;
    scene.startScene('awawas', 46, 35);
  },
  async awawa() { await UI.say('Awawa', ['¡Awawa!', '(Te enseña los dientecitos. No queda claro si es una amenaza o una sonrisa.)']); },
  async awawasDone() {
    Sound.logro();
    await UI.say('Siri', ['¡AWAWA! ¡Tres veces! Mis sobrinos no salen de su asombro. Ni de sus madrigueras.', 'Trato es trato: los globos son para la fiesta de Cait. Los inflamos nosotros.']);
    S.set('globos');
    give('{balloon} Globos para la fiesta', true);
    invite('siri', 'Siri y los awawas');
    await UI.say('Siri', 'El calcetín se lo quedan ellos, eso sí. Es su juguete. No es de nadie de la isla, no te preocupes.');
  },

  // ---------------------------------------------------------- Vecinos
  async signLaw() {
    await UI.say('', '«Abogada soltera, lucha por su cliente, lleva minifaldas provocativas y además es autosuficiente».');
  },
  async houseLaw() { await UI.say('', 'Bufete cerrado. Horario de atención: cuando ella quiera, que para eso es autosuficiente.'); },
  async houseA() { await UI.say('', 'Hay una nota en la puerta: «He ido al Combini, vuelvo en cinco minutos». La nota tiene telarañas.'); },
  async houseB() { await UI.say('', 'Por la ventana se ve a alguien haciendo un puzle de 5.000 piezas de un cielo completamente azul. Mejor no molestar.'); },
  async houseC() { await UI.say('', 'Nadie abre. En el buzón pone: «No se admite publicidad. Calcetines, sí».'); },

  // ---------------------------------------------------------- Combini
  async combini() {
    Sound.jingle('combini');
    await UI.say('', ['COMBINI — CERRADO POR OBRAS. Disculpen las molestias.', '(Aun así, la puerta sigue tocando su musiquita cada vez que alguien se acerca.)']);
  },
  async gatolleta() {
    await UI.say('', [
      'Un cartel: «GATOLLETA — la galleta helada con forma de gato. ¡Tan rica que parece de otro planeta!»',
      '(Debajo, a boli: «Agotadas hasta que terminen las obras. No insistan».)',
    ]);
  },
  async gachapon() {
    const left = GACHA.filter((g) => !S.d.gacha.includes(g.id));
    if (!left.length) return UI.say('', 'La máquina de gachapón está vacía. ¡Tienes todos los regalos!');
    if (S.d.coins < 1) return UI.say('', ['Una máquina de gachapón llena de cápsulas con regalos.', 'Funciona con monedas de gachapón. Dicen que en el templo las cambian por calcetines.']);
    const c = await UI.choose('', `Quedan ${left.length} cápsulas. ¿Echar una moneda?`, ['¡Sí!', 'No']);
    if (c !== 0) return;
    S.d.coins--; UI.updateHud();
    Sound.sfx('gacha');
    await UI.say('', 'Clac, clac, clac… ¡POP!');
    const prize = left[Math.floor(Math.random() * left.length)];
    S.d.gacha.push(prize.id); S.save();
    give(`{gift} ${prize.name}`, true);
    await UI.say('', `¡Ha salido «${prize.name}»! Un regalo estupendo para Cait.`, { img: gachaIcon(prize.id) });
  },

  // ---------------------------------------------------------- Aeropuerto
  async aeroflot() {
    await UI.say('Aeroflot', ['Estimado pasajero: AEROFLOT ha cesado sus operaciones.', 'Todos los vuelos han sido cancelados. Todos. Para siempre.']);
    const c = await UI.choose('Aeroflot', '¿Desea presentar una reclamación?', ['Escribir reclamación', 'No, gracias']);
    if (c !== 0) return;
    const text = await UI.prompt('Hoja de reclamaciones de Aeroflot');
    if (!text) return UI.say('Aeroflot', 'Reclamación en blanco archivada con éxito.');
    S.d.quejas.push(text.slice(0, 300)); S.d.quejas = S.d.quejas.slice(-10);
    S.d.vales++; S.save();
    await UI.say('Aeroflot', ['Su reclamación ha sido procesada y triturada correctamente.', 'Como compensación, reciba este VALE DE AEROFLOT.']);
    give('{ticket} Vale de Aeroflot');
    await UI.say('', '(El vale no sirve absolutamente para nada.)');
  },
  async plane() { await UI.say('', 'Un avión de Aeroflot. Tiene telarañas en las ruedas y un nido en el motor.'); },

  // ---------------------------------------------------------- Castillo
  async gate(scene) {
    if (S.flag('gateOpen')) { scene.warp('castillo', 19, 25, 'up'); return; }
    await UI.say('', ['OBRAS DE RECONSTRUCCIÓN DEL CASTILLO DE MAZAPÁN.', 'Los andamios bloquean la puerta principal. Habrá que encontrar otra entrada…']);
  },
  async signCastle() { await UI.say('', 'CASTILLO DE MAZAPÁN. Cerrado por reconstrucción: alguien se ha comido un trozo de muralla.'); },

  // ---------------------------------------------------------- Varios
  async signCross() { await UI.say('', 'Norte: Casa de Cait · Oeste: Casa de Lolete\nEste: templo, bosque y castillo · Sur: Casa Fuxia, Combini y Aeropuerto'); },
  async signDock(scene) {
    await UI.say('', ['MUELLE. Próximas salidas: ninguna.', '(Alguien ha escrito debajo: «los barcos no, pero los amigos grandes sí».)']);
    if (!S.flag('simon') || S.flag('narwal')) return;
    if (await UI.choose(C, 'Grandes animales capaces de surcar los mares… ¿Toco la melodía de los Owitos con el Otamatone?', ['¡Tocar!', 'Ahora no']) !== 0) return;
    scene.startScene('otama', 9, 11);
  },
  async narwalCalled() {
    Sound.logro();
    S.set('narwal');
    await UI.say('Narwal', [
      '¡Fiuuuu! ¿Quién ha tocado la canción de los grandes animales del mar? Hacía siglos que nadie se la sabía entera.',
      'Sí, ya sé lo que estás pensando: no tengo cuerno. Mis padres son dinosaurios. Mis abuelos, dinosaurios. Y yo salí narval.',
      'Nadie sabe por qué. En las cenas de Navidad es un tema delicado.',
      '¿Una fiesta para Cait? ¡Cuenta conmigo! Y si necesitas cruzar el mar hasta la Isla Helada, súbete cuando quieras. Agárrate a la corona.',
    ]);
    invite('narwal', 'Narwal');
  },
  async narwal(scene) {
    invite('narwal', 'Narwal');
    if (await UI.choose('Narwal', '¡Fiuuu! ¿Rumbo a la Isla Helada? Agárrate a la corona, que de cuerno no ando bien.', ['¡A la Isla Helada!', 'Ahora no']) === 0) scene.warp('helada', 19, 22, 'up');
  },
  async narwalBack(scene) {
    if (await UI.choose('Narwal', '¿Volvemos a la Isla de Cait?', ['Sí, vámonos', 'Todavía no']) === 0) scene.warp('isla', 9, 10, 'down');
  },
  async sock(scene, ent) {
    S.d.socks.push(ent.id); S.save();
    const d = SOCK_DESIGN[ent.id], pair = S.d.socks.filter((s) => SOCK_DESIGN[s] === d).length === 2;
    give(`{sock_${d}} Calcetín ${SOCK_DESIGNS[d]}${pair ? ': ¡ya tienes la pareja!' : ''} (${S.d.socks.length}/${TOTAL_SOCKS})`);
    scene.sync();
    return false;
  },
};

export const TOTAL_GUESTS = CHARACTERS.length;
