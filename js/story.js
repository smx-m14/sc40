// Guion: qué pasa al interactuar con cada entidad. Cada script recibe (scene, ent).
// Un script de tipo "step" puede devolver true si ha cambiado de mapa/escena.
import { State, GACHA, GIFTS, CHARACTERS, INVITE_READY, HATCH_CODE, SOCK_DESIGNS, SOCK_DESIGN, TOTAL_SOCKS } from './state.js';
import { traceBeam } from './beam.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import { gachaIcon } from './art.js';
import { buildMap, MAP_IDS } from './maps.js';
import { fuxiaQuiz, GOAL } from './fuxia.js';

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
  if (!S.flag('kai') && !S.flag('grateOpen')) return 'En el pasillo del apartamento hay una rejilla en el techo. Si se abriera, entraría el sol.';
  if (!S.flag('kai')) return 'Kai duerme delante de la puerta del último cuarto. Con los tres espejos se puede llevar el rayo de sol hasta su hocico' + ((S.d.flags.kaiCols || []).length >= 3 ? '… pero tiene que llegarle lila.' : '. Prueba a pasarlo por los cristales.');
  if (!S.flag('cuy')) return 'Al fondo del apartamento vive el cuarto roedor. Tiene una pregunta sobre Cuca.';
  if (!S.flag('hatchOpen')) return 'La alcantarilla del pasillo tiene un candado de cuatro cifras. ¿Y esos números que te dieron en el apartamento? El último está en ruso: la nevera ayuda.';
  if (!S.flag('cuyTemple')) return 'Lleva a Cuy al Templo de los Sabios: por fin alguien puede traducir a Cuca.';
  if (!S.flag('pato')) return 'En el Castillo de Mazapán, los capybaras no se atreven a entrar en su estanque: algo hace «cuac» entre los juncos.';
  if (!S.flag('simon')) return 'Los Owitos del Teatro Real no pueden ensayar sin Tigrito.';
  if (!S.flag('horno')) return 'En la Pastelería Real, Mantecas necesita manos para hornear el mazapán de la muralla.';
  if (!S.flag('gateOpen')) return 'La muralla está entera, pero los andamios siguen tapando la puerta del castillo. Los Gemelos bipolares saben desmontarlos… al compás.';
  if (!S.flag('narwal')) return 'Toca en el muelle la melodía de los Owitos con el Otamatone.';
  if (!S.flag('tediHack')) return S.flag('cali')
    ? 'En la Isla Helada, la puerta de TEDI está cerrada. Una oveja muy grande tiene un plan.'
    : 'Para colarse en TEDI hay que caber por un conducto muy estrecho. Una tanda de calistenia en el Fitness Bartory no te vendría mal.';
  if (!S.flag('tedi')) return 'La puerta de TEDI está abierta: toca apagar la máquina clonadora.';
  if (!S.flag('cali')) return 'Heladoncio no te dará la tarta hasta que entrenes en el Fitness Bartory.';
  if (!S.flag('tarta')) return 'Heladoncio tiene la tarta lista en Sweet Famosa. Hay que llevarla hasta Narwal.';
  if (!S.flag('luces')) return 'Los Owitos de Navidad, en la Isla Helada, tienen las luces para la fiesta.';
  if (!S.flag('globos')) return 'Una fiesta sin globos no es fiesta. Dicen que al sur del castillo hay unos bichitos con muchos.';
  if (!S.flag('gramola')) return 'Falta la música: Fucsia, al suroeste de la Isla de Cait, quiere ponerte a prueba.';
  if (!S.flag('fin')) return '¡Todo listo! Vuelve a casa de Cait para empezar la fiesta.';
  return 'La fiesta ha sido un éxito. Puedes seguir paseando y buscar lo que te falte.';
}
UI.hintFn = hint;

const RUSO = [
  'Гав-гав! Колгадин, носкибургер самоварка!',
  'Да-да… бабушка катюшка, косточка привет!',
  'Спутник борщ, Каит сорок годик! Ура!',
  'Матрёшка? Нет. Сосиска? Да, да, да!',
];

// Preguntas de la paella. Solo valen: arroz, pollo, conejo, bachoqueta, garrofón, tomate, aceite, azafrán, sal y agua.
// Perrunfli parla en valencià; les respostes (el que tria Colgadín) van en castellà.
const PAELLA = [
  { q: 'Comencem fàcil. Què és el primer que tirem a la paella?', ok: 'Aceite de oliva',
    bad: { Mantequilla: 'Mantega? Açò és una paella, no un croissant.', Mayonesa: 'Maionesa… Faré com si no haguera sentit res.' } },
  { q: 'Ara la carn. Quina tirem?', ok: 'Pollo y conejo',
    bad: { Chorizo: 'XORIÇO?! Això és «arròs amb coses». A València s\'acaba d\'esvanir algú.', 'Salchichas': 'Salsitxes. A la paella. Lolete, tapa\'t les orelles.' } },
  { q: 'La verdura. Pensa-ho bé.', ok: 'Bachoqueta y garrofón',
    bad: { Guisantes: 'Els pésols, a la menestra. Següent intent.', Nabos: 'Que els naps NO ES TOQUEN! Ni els dimarts ni mai.' } },
  { q: 'I què es sofregix amb la carn i la verdura?', ok: 'Tomate rallado',
    bad: { Cebolla: 'La ceba estova l\'arròs. I la meua paciència.', 'Pimiento rojo': 'El pebrot és per a les paelles de postal.' } },
  { q: 'El color i l\'aroma. D\'on ixen?', ok: 'Azafrán',
    bad: { Cúrcuma: 'Quasi groc, quasi correcte, totalment malament.', 'Rotulador amarillo': 'Creatiu. Però no.' } },
  { q: 'Li posem alguna cosa de la mar?', ok: 'Nada: solo sal y agua',
    bad: { Gambas: 'Això és un altre plat. Molt bo, però un altre plat.', Mejillones: 'Musclos… Tu has vingut a provocar?' } },
  { q: 'I l\'última, la més important. Què és el que NO pot faltar?', ok: 'Arroz',
    bad: { Fideos: 'Això és fideuà, i es fa un altre dia.', Cuscús: 'M\'assec un moment.' } },
];

// Bart habla MUCHO. Es así.
const BART_INTRO = [
  '¡HOLA! ¡Bienvenido a FITNESS BARTORY! Soy Bart, la dueña, y antes de que digas nada: sí, hago calistenia.',
  'El gimnasio es mío. MÍO. Y esto es solo el principio: estoy pensando en abrir tres sedes más. Fitness Bartory Norte, Fitness Bartory Sur y… la tercera ya le pensaré el nombre.',
  'La calistenia, por si no lo sabes, que seguro que no lo sabes, viene del griego «kallos» y «thenos». ¿Por qué? Porque la gente que hacía calistenia en Grecia tenía muchos callos en las manos.',
  'Callos. Muchísimos callos. Como yo, mira qué manos. Eso no te lo da una máquina, te lo da una barra bien anclada a la pared.',
  'Mucha gente cree que la calistenia es hacer dominadas. ERROR. La calistenia es una forma de vida. Y también hacer dominadas.',
  'Yo empecé hace seis años. Antes hacía máquinas. ¿Sabes lo que te dan las máquinas? Nada. Aislamiento. Tristeza. Un bíceps sin contexto.',
  'En cambio, con el peso corporal trabajas cadenas musculares completas. COMPLETAS. Desde la escápula hasta el dedo gordo del pie.',
  'Hablando de escápulas: la retracción escapular. La gente no retrae. Se cuelga de la barra como un jamón. Sin ofender, que tú te llamas Colgadín.',
  'Mira, la progresión es sencilla: primero australianas, luego negativas, luego dominada estricta, luego lastrada, luego muscle-up, luego front lever…',
  '…luego back lever, luego bandera humana, luego plancha, y luego ya te compras un parque para ti solo.',
  'Yo el front lever lo saqué en catorce meses. Podría haber sido en doce, pero un día me resfrié. Aún me duele. El resfriado no, perder dos meses.',
  'Y no me hables del kipping. El kipping NO es una dominada. El kipping es un pez fuera del agua con cuota mensual.',
  '¿Por dónde iba? Ah, sí. El agarre. Prono, supino, neutro. Hay gente que usa correas. Yo a esa gente no la juzgo. La miro fijamente, pero no la juzgo. Lo que SÍ se permite son los estropajos: para el agarre no hay nada mejor. Y de paso dejas la barra reluciente.',
  'Total, que aquí mismo, en esta sala, se conocieron Cait y Mindeos. Cait estaba haciendo… bueno, estaba mirando la barra. Mindeos también. Fue precioso.',
  'Y tú, Colgadín, ¿respetas la calistenia? Eso hay que demostrarlo. Aquí, en la barra.',
];
const BART_MAS = [
  'Te cuento una cosa de la plancha. La plancha no es aguantar. La plancha es EMPUJAR EL SUELO mientras aprietas glúteo, abdomen, cuádriceps y carácter. Treinta segundos bien hechos valen más que tres minutos pensando en la cena. Yo en la cena también pienso, pero en proteína. Sin gluten, eso sí.',
  '¿Sabías que el magnesio no es para que resbale menos? Bueno, sí es para eso. Pero también es un estado mental. Hay días que me pongo magnesio para ir a comprar el pan. La barra de pan también es una barra, piénsalo.',
  'El otro día vino uno y me dijo que hacía calistenia «en casa, con una app». Con una app. Le pregunté por su retracción escapular y se fue llorando. Aquí se viene llorado de casa.',
  'Mi rutina es sencilla: lunes empuje, martes tirón, miércoles pierna (mentira, nadie hace pierna), jueves empuje, viernes tirón, sábado skills y domingo hablarle a la gente de mi rutina.',
];

// Cuarto de ratita resuelto: espejo + cifra del candado
let cheeseStep = 0;
const remindSeen = {}; // desde cuándo está pendiente cada invitación (para remindInvite)

// ---------------------------------------------------------------- Trucos («cheatcodes»)
// Se escriben en la hoja de reclamaciones de Aeroflot empezando por «#». No hacen nada en el momento: Aeroflot
// devuelve un papelito con la pista en ruso, y hay que llevárselo a Cuca (con Cuy de traductor) para que surta efecto.
// Para añadir uno: una entrada aquí con `once` (si solo vale una vez) y `run(scene)`, que devuelve lo que dice Cuy
// (o [lo que dice Cuy, función que se ejecuta después], p. ej. para teletransportar).
const CHEATS = {
  wherearemysocks: { run: () => sockClue() },
  frozen: { // a la Isla Helada sin pasar por Narwal… y sin billete de vuelta
    run: (scene) => ['Dice que te abrigues bien. Y que cierres los ojos.', () => scene.warp('helada', 19, 22, 'up')],
  },
  gimmemoney: {
    run: () => { S.d.coins++; S.save(); give('{coin} +1 moneda de gachapón'); return 'Dice que tengas esta moneda. Que es para el gachapón, no para gastártela en mazapanes.'; },
  },
};
// Dónde buscar un calcetín que falta: primero los que completarían una pareja (para Scooby), luego cualquiera
function sockClue() {
  const missing = Object.keys(SOCK_DESIGN).filter((id) => !S.d.socks.includes(id));
  if (!missing.length) return 'Dice que ya tienes todos los calcetines. Que dejes de buscar debajo de las camas.';
  const half = missing.filter((id) => S.d.socks.some((s) => SOCK_DESIGN[s] === SOCK_DESIGN[id]));
  const id = (half.length ? half : missing)[0];
  for (const mid of MAP_IDS) {
    const m = buildMap(mid), e = m.ents.find((x) => x.id === id);
    if (!e) continue;
    const reg = m.regions.find((r) => e.tx >= r.x0 && e.tx <= r.x1 && e.ty >= r.y0 && e.ty <= r.y1)
      || m.regions.slice().sort((a, b) => Math.hypot((a.x0 + a.x1) / 2 - e.tx, (a.y0 + a.y1) / 2 - e.ty) - Math.hypot((b.x0 + b.x1) / 2 - e.tx, (b.y0 + b.y1) / 2 - e.ty))[0];
    return `Dice que busques un calcetín ${SOCK_DESIGNS[SOCK_DESIGN[id]]} en ${m.name}${reg ? `, cerca de ${reg.name}` : ''}. Escondido detrás de algo, como siempre.`;
  }
  return `Dice que el calcetín ${SOCK_DESIGNS[SOCK_DESIGN[id]]} lo tienen los awawas de Kapadokya. Que se lo ganes jugando.`;
}

// Coleowe le trae a Colgadín un juego de mesa para Cait: tiene tres, pero solo uno le parece buena idea
async function coleoweGift() {
  if (S.d.gifts.includes('sushigo')) return;
  await UI.say('Coleowe', 'Te he traído un juego de mesa. Para Cait. Tengo tres. Elige.');
  const NO = {
    Root: ['Root. Gatos con ejército, pájaros burócratas y un mapa enorme…', 'Seguro que Mindeos se queda dormido a mitad de la partida jugando con Cait. Roncando encima del bosque. ¿No prefieres otro?'],
    Zombicide: ['Zombicide. Una ciudad infestada de zombis, supervivientes a la desesperada y un montón de miniaturas que preparar antes de empezar…', 'Si Cait lo saca, creo que Mindeos va a huir corriendo. Más rápido que de los propios zombis. ¿No prefieres otro?'],
  };
  for (;;) {
    const opts = ['Root', 'Zombicide', 'Sushi Go!'];
    const pick = opts[await UI.choose('Coleowe', '¿Cuál le llevas a Cait?', opts)];
    if (NO[pick]) { await UI.say('Coleowe', NO[pick]); continue; }
    await UI.say('Coleowe', 'Sushi Go. Ese está bien: facilito, rapidito, sin montajes, ni tablets, ni libros de instrucciones de cuarenta páginas. Todos contentos.');
    break;
  }
  gift('sushigo');
}
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
      'Lo primero: las invitaciones…',
      '…¿Y eso? Encima de la mesa hay un montón de invitaciones. Yo no las he hecho… ¿O sí?',
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
    await UI.say(C, ['No sé quién las habrá dejado aquí, pero son justo lo que necesitaba.', '¡A repartirlas por toda la isla!']);
  },
  async bed() { await UI.say(C, ['La cama de Cait. Hará falta una escalera para subirse.', 'De momento no hay tiempo para siestas… bueno, quizá luego.']); },
  async sofa() { await UI.say(C, 'El sofá de Cait, gris azulado, con sus cojines de gatolleta y la manta beige.'); },
  async coffeeCait() { await UI.say(C, 'La mesita de centro. Tres mandos a distancia y ninguno sabe exactamente qué enciende.'); },
  async tvCait() { await UI.say(C, ['La tele de Cait, con cientos de consolas debajo. En el mueble, unos cuantos peluches vigilan quién tiene el mando.', 'Y una selección de juegos de mesa para las noches de insomnio de Mindeos.']); },
  async lampCait(scene) {
    const off = !S.flag('lampOff');
    S.set('lampOff', off);
    Sound.sfx('step');
    scene.sync();
    if (!off) return; // al encenderla, sin comentarios
    const n = S.d.flags.mimir = (S.d.flags.mimir || 0) + 1;
    await UI.say(C, n === 1 ? 'A mimir.' : n === 2 ? 'Two mimir.' : 'Enough mimir, ¡hay una fiesta que preparar!');
  },
  async ventanaCait() { await UI.say(C, ['Desde la ventana se ve a la vecina asomada… y unos molinillos para espantar palomas.', '¿Por qué tienen que reflejar tanto?']); },
  async cuadros() { await UI.say('', ['Tres pósters: Bulbasaur, Squirtle y Charmander.', '¡En este juego no hay que elegir a nadie!']); },
  async shelf() { await UI.say(C, ['La estantería de Cait: peluches en cada hueco, juegos de mesa y un mono colgado de lo más alto.', 'Ya no cabe ni uno más. Con razón le va regalando peluches a la vecina.']); },
  async exitCait(scene) {
    if (!S.flag('invites')) { await UI.say(C, '¡Espera! Antes, esas invitaciones de la mesa. No puedo irme sin ellas.'); return false; }
    scene.warp('isla', 22, 11, 'down');
    return true;
  },
  async enterCait(scene) { scene.warp('cait', 6, 8, 'up'); return true; },

  // ---------------------------------------------------------- Lolete
  async doorLolete(scene) {
    if (S.flag('lolete')) {
      await UI.say('', 'La casa de Lolete. Sigue llena de cajas… ya las ordenará después de la fiesta.');
      return false;
    }
    await UI.say('???', ['¡Guau, guau! ¿Hay alguien ahí?', '¡Estaba preparando mi mudanza a Isla Pachencio y me he quedado atrapado entre las cajas!']);
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
      'Yo solo había venido al bosque a ensayar. Soy el director de la obra de los Owitos del Teatro, y sin mí no empiezan.',
      '¿Una fiesta para Cait? ¡Me apunto! Voy contigo, que al teatro se llega por el castillo.',
    ]);
    S.set('tigrito');
    if (S.flag('simon')) S.goHome('tigrito'); else S.join('tigrito');
    invite('tigrito', 'Tigrito');
    await UI.say('Monos', '¡Uh uh…! Vale, nos hemos pasado. Dejamos el camino libre. ¿Habrá bananas en esa fiesta?');
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
  async grate(scene) {
    if (!S.flag('grateOpen')) {
      await UI.say('', 'Una rejilla en el techo, con la trampilla cerrada. Por las rendijas se adivina que fuera hace sol.');
      if (await UI.choose(C, '¿La abro?', ['Abrir la rejilla', 'Mejor no']) !== 0) return;
      S.set('grateOpen');
      Sound.sfx('get');
      scene.sync();
      scene.drawBeam();
    }
    return SCRIPTS.grateLight();
  },
  async grateLight() { await UI.say('', ['Por la rejilla del techo se cuela un rayo de sol que cae recto hasta el suelo. Si algo lo desviara…', 'Por el pasillo hay once pedestales vacíos, tres espejos atornillados al suelo que no se pueden mover y cuatro cristales de color: rojo, azul, amarillo y verde.']); },
  async kaiSleep() {
    await UI.say('', [
      'Kai, el gato negro, duerme atravesado delante de la puerta del último cuarto. Ronca como una moto.',
      'Le pusieron «Kai» para no confundirlo con Cait. No ha servido de nada: todo el mundo los confunde igual, porque son igual de gatos.',
      'No hay quien lo mueva. Aunque dicen que no hay gato que se resista a un puntito de luz… de cierto color.',
    ]);
  },
  async kai() {
    await UI.say('Kai', 'Mrrrau. (Está muy ocupado sujetando el puntito de luz con las dos patas.)');
    if (!S.d.flags.kaiName) { S.set('kaiName'); await UI.say(C, '«Kai», con K, para no confundirlo con Cait. Y aun así todo el mundo los confunde. Normal: son igual de gatos.'); }
    if (S.flag('invites') && !S.d.invited.includes('kai')) {
      await UI.say('', 'Le dejas la invitación al lado. La pisa. En idioma gato, eso es que sí.');
      invite('kai', 'Kai');
    }
  },
  async kaiDoor() {
    if (S.flag('invites') && !S.d.invited.includes('kai')) {
      await UI.say('', 'Al pasar, Colgadín le deja a Kai su invitación al lado. Kai la pisa sin soltar el puntito de luz. En idioma gato, eso es que sí.');
      invite('kai', 'Kai');
    }
    return true; // es un paso de puerta: Colgadín sigue su camino
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
    if (!S.flag('grateOpen')) return; // sin la rejilla abierta no hay luz que reflejar
    const b = traceBeam(scene.map, f);
    if (!b.hit) return;
    await new Promise((r) => scene.time.delayedCall(500, r));
    if (!b.solved) {
      // Lo del lila no se cuenta hasta que le hayan llegado al menos tres colores distintos
      const cols = f.kaiCols = f.kaiCols || [];
      if (b.mask && !cols.includes(b.mask)) { cols.push(b.mask); S.save(); } // la luz blanca no cuenta como color
      return UI.say('', [
        b.mask ? `Un puntito de luz ${b.color} baila delante del hocico de Kai. Abre un ojo… y lo vuelve a cerrar.` : 'Un puntito de luz blanca baila delante del hocico de Kai. Ni se inmuta.',
        ...(cols.length >= 3 ? ['Su colorimetría solo le permite moverse con láseres LILAS.'] : []),
      ]);
    }
    await UI.say('', ['Un puntito lila baila justo delante del hocico de Kai…', 'Kai abre un ojo. Luego el otro. Se le dilatan las pupilas.']);
    Sound.logro();
    S.set('kai');
    scene.sync();
    await UI.say('Kai', '¡¡MIAU!!');
    await UI.say('', 'Kai se lanza a cazar el puntito y deja libre la puerta del último cuarto.');
  },
  async mirrorFixed() { await UI.say('', 'Un espejo atornillado al suelo sobre una base de piedra. No se puede girar ni quitar: habrá que contar con él.'); },
  async gem(scene, ent) { await UI.say('', `Un cristal ${ent.id === 'gem_r' ? 'rojo' : 'azul'} sobre una peana. La luz que lo atraviesa sale teñida de su color.`); },
  // Cocina: cinco quesos. Primero los de tamaño par (2.º y 4.º), de menor a mayor; luego los impares al revés (5.º, 3.º y 1.º)
  async cheese(scene, ent) {
    if (S.flag('r1')) return UI.say('', 'Ñam. Ya no quedan más que migas.');
    const ORDER = [2, 4, 5, 3, 1];
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
    await roomDone(1, 'Ratita gris', [
      'Así da gusto. Toma: mi espejo de mano.',
      'Y apunta este número, que quizá te sea útil en el futuro. Es el primero de cuatro: impar, el más pequeño de todos los impares… y si lo multiplicas por sí mismo, se queda tal cual.',
      '…Qué obsesión tengo con esto de los pares y los impares.',
    ]);
  },
  async ratitaP() {
    if (S.flag('r1')) return UI.say('Ratita gris', ['El primer número: el impar más pequeño. El que, multiplicado por sí mismo, se queda tal cual.', 'Ay, otra vez los pares y los impares. No lo puedo evitar.']);
    await UI.say('Ratita gris', [
      '¡Iiik! Bienvenido al Apartamento de las Ratitas. Aquí vivimos cuatro roedores. Y un gato, pero ese no paga alquiler.',
      'Cada una de nosotras guarda un número. El mío te lo digo si demuestras buenos modales en la mesa.',
      'En mi cocina hay cinco quesos, todos de tamaño distinto. Ordénalos en la cabeza de pequeño a grande.',
      'Las normas de la casa: primero se muerden los que ocupan puesto PAR, de menor a mayor. Después los de puesto IMPAR, pero al revés.',
      'Si te equivocas, se empieza otra vez. Y fíjate bien, que algunos se parecen mucho.',
    ]);
  },
  async ratitaO() {
    const R = 'Ratita blanca';
    if (S.flag('r2')) return UI.say(R, 'El segundo número es el 9. Y ahora calla, que empieza el capítulo. (La tele sigue apagada.)');
    await UI.say(R, [
      '¡Chsss! Estoy viendo «Apartamento para tres». Sí, con la tele apagada: esa serie solo existe en la cabeza de Cait y no pasó del piloto.',
      'En los anuncios, que son todos, me entretengo contando lo que hay en mi salón. Mi número sale de una cuenta.',
      'Multiplica los COJINES ROSAS por las TAZAS. Al resultado súmale los CUADROS. Y a eso réstale las PLANTAS.',
      'Cuenta solo lo de este cuarto. Y mira bien por los rincones, que soy muy desordenada.',
    ]);
    const n = await UI.code('Cojines rosas × tazas + cuadros − plantas =', 2);
    if (n === null) return;
    if (+n !== 9) { Sound.sfx('bad'); return UI.say(R, `¿${+n}? ¡Meeec! Risas enlatadas. Cuenta otra vez, despacito.`); }
    await roomDone(2, R, '¡Nueve! Dos cojines rosas por cinco tazas, más dos cuadros, menos tres plantas. Toma mi espejo. Y apunta: el segundo número es el 9. Quizá te sea útil algún día.');
  },
  async ratencio(scene, ent) {
    const n = (ent && ent.n) || 1;
    await UI.say('', n === 1
      ? ['Un cuadro de Ratencio the Rat. Mira un limón con muchísima desconfianza.', '(El limón no ha hecho nada. De momento.)']
      : ['Otro cuadro de Ratencio the Rat, esta vez de chef, espátula en mano.', 'Dicen que cocina de maravilla. Sin limón, eso sí.'], { img: `assets/cuadros/ratencio${n}.png`, big: true });
  },
  async tv() { await UI.say('', 'La tele está apagada. En la pantalla solo se refleja una ratita blanca riéndose de un chiste que nadie ha contado.'); },
  async ratitaB(scene) {
    const R = 'Ratita parda';
    if (S.flag('r3')) return UI.say(R, 'El tercer número es el 8. Y gracias por la luz: ya puedo dormir.');
    if (!S.flag('metRatitaB')) {
      await UI.say(R, [
        'No puedo dormir a oscuras. Necesito las CINCO lámparas de mi cuarto encendidas a la vez.',
        'El problema es el electricista: cada interruptor enciende o apaga su lámpara… y alguna otra. Cada vez que arreglo una, se me apaga la de al lado.',
        'Si consigues dejarlas todas encendidas, te doy mi espejo y mi número.',
      ]);
      S.set('metRatitaB');
      return;
    }
    if (await UI.choose(R, 'Sigo a oscuras. ¿Quieres que las apague todas para empezar de cero?', ['Apágalas todas', 'No, sigo yo']) === 0) {
      S.d.flags.lamps = [0, 0, 0, 0, 0]; S.save(); Sound.sfx('undo'); scene.sync();
    }
  },
  // Cada interruptor cambia su lámpara y otras. Única solución desde todo apagado: verde, azul y rosa.
  async lamp(scene, ent) {
    if (S.flag('r3')) return UI.say('', 'La lámpara da una luz calentita. Mejor no tocar nada.');
    const TOGGLE = [[0, 1], [1, 0, 2], [2, 0, 3], [3, 0, 4], [4, 0, 2]];
    const L = S.d.flags.lamps = S.d.flags.lamps || [0, 0, 0, 0, 0];
    for (const j of TOGGLE[ent.n]) L[j] = L[j] ? 0 : 1;
    S.save();
    Sound.sfx('step');
    scene.sync();
    if (!L.every(Boolean)) return;
    await new Promise((r) => scene.time.delayedCall(400, r));
    await roomDone(3, 'Ratita parda', '¡Las cinco! ¡Qué maravilla, se ve todo! Toma mi espejo. Y apunta este número, que quizá te sirva en el futuro: el tercero es el 8.');
    scene.sync();
  },
  async fridge() {
    S.set('imanes');
    await UI.say('', [
      'La nevera está llena de imanes de letras raras que forman tres palabras. Debajo de cada una, alguien ha pegado una etiqueta:',
      '«ФГДЖБ» = QUESO\n«ШЯПШЯ» = TARTA\n«ЭЮЯГ» = MIAU',
      '(La etiqueta de QUESO tiene marcas de dientecitos. La de MIAU, pelos de gato negro.)',
    ], { ruso: true });
  },
  async note() {
    S.set('nota');
    await UI.say('', ['Una nota clavada en la pared, con la letra de Cuca:', '«Д Ш Д Ю Ж»'], { ruso: true });
    await UI.say(S.flag('cuy') ? C : 'Cuy', S.flag('cuy') ? 'El cuarto número, en ruso… y Cuy dijo que Cuca lo escribía todo al revés.' : 'Es el cuarto número. Cuca me lo apuntó en ruso para que nadie lo entendiera. Y encima ella lo escribía todo al revés, de derecha a izquierda. Funcionó: tampoco lo entiendo yo.');
  },
  async cuy() {
    const Y = 'Cuy';
    if (!S.flag('metCuy')) {
      await UI.say(Y, ['¡Cui, cui! ¿Quién ha despertado a Kai? …¡Colgadín!', 'Antes de nada, una pregunta. Es muy importante.']);
      S.set('metCuy');
    }
    const OK = '¡Claro! ¡Está con Scooby!', BEA = 'Quieres decir ¿Беа?';
    const opts = shuffle([OK, '¿Qué Cuca?', BEA]);
    const pick = opts[await UI.choose(Y, '¿Has visto a Cuca?', opts)];
    if (pick !== OK) {
      Sound.sfx('bad');
      // «Беа» era su nombre antiguo, y no le gusta nada que la llamen así
      if (pick === BEA) return UI.say(Y, ['¡¿Беа?! ¡Cui! ¡Ese es su nombre de antes!', 'No le gusta NADA que la llamen así. Si te oye, te contesta en ruso. Y no precisamente cosas bonitas.']);
      return UI.say(Y, '…Cui. (Cuy se da la vuelta, muy serio. Quizá esperaba otra respuesta.)');
    }
    await UI.say(Y, [
      '¡Lo sabía! ¡Cui, cui, cui! Con Scooby, en el Templo de los Sabios.',
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
      // Cuy no baja: así hay que llevarlo a ver a Cuca antes de pasar al castillo
      if (S.d.party.includes('cuy')) {
        return UI.say('Cuy', ['¿Por la alcantarilla? ¡Ni hablar! ¡Cui!', 'Ahí abajo me confundirían con una rata. Y yo soy un cuy peruano. Con pedigrí.', 'Primero llévame al templo a ver a Cuca. Luego ya veremos.']);
      }
      if (await UI.choose('', 'La alcantarilla baja, oscura y pegajosa de azúcar, hasta el Castillo de Mazapán.', ['Bajar', 'Ahora no']) === 0) scene.warp('castillo', 5, 15, 'right');
      return;
    }
    await UI.say('', 'La tapa de la alcantarilla que lleva al Castillo de Mazapán. Tiene un candado de cuatro cifras.');
    if (S.flag('r1') || S.flag('r2') || S.flag('r3') || S.flag('nota')) await UI.say(C, '¿Cuatro cifras? Me suena haber apuntado unos cuantos números por el apartamento…');
    const code = await UI.code('Candado de la alcantarilla');
    if (code === null) return;
    if (code !== HATCH_CODE) { Sound.sfx('bad'); return UI.say('', `${code.split('').join(' ')}… El candado no cede.`); }
    // Código correcto, pero sin haber conseguido los cuatro números (las tres ratitas, la nota y los imanes): no vale
    if (!['r1', 'r2', 'r3', 'nota', 'imanes'].every((k) => S.flag(k))) {
      Sound.sfx('bad');
      return UI.say('', [`${code.split('').join(' ')}… El candado hace «clic», pero no se abre.`, 'Parece que alguien está jugando a ser adivino. Mejor conseguir los cuatro números como es debido.']);
    }
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
        'Pero la puerta sigue tapada por los andamios. De desmontarlos se encargan los Gemelos bipolares, ahí junto a la puerta.',
        'Trabajan al compás… cuando están del lado contento.',
      ]);
    }
    if (S.flag('gateOpen') && !S.d.invited.includes('peludito')) {
      await UI.say(P, '¿Una fiesta para Cait? Un rey nunca falta a una fiesta. Sobre todo si hay tarta.');
      return invite('peludito', P);
    }
    if (!S.flag('horno')) return UI.say(P, 'La Pastelería Real está al este de la plaza. Sin mazapán no hay muralla, y sin muralla no hay puerta.');
    invite('peludito', P);
    await UI.say(P, 'Reinar cansa mucho. Me quedo aquí, en mi Trono Real, esperando a que empiece la fiesta. Sentado. Como casi siempre.');
  },
  // Los lados del trono: mientras el Rey tenga algo que encargar (muralla, andamios, invitación), habla de eso; después, del trono
  async trono(scene) {
    if (!S.d.invited.includes('peludito')) return SCRIPTS.peludito(scene);
    await UI.say('Rey Peludito', [
      '¡Eh, eh! Ese es mi Trono Real. Es solo mío.',
      'Nadie más puede sentarse en él: le quitaría su energía monárquica. Y sin energía monárquica, solo soy un gato redondo en una silla.',
    ]);
  },
  async capybaras(scene) {
    const K = 'Capybara';
    if (!S.flag('metCapys')) {
      await UI.say(K, [
        '…',
        'Nosotros solo queremos pegarnos un chapu en nuestro estanque. Pero entre los juncos hay ALGO.',
        'Hace un ruido espantoso. «Cuac». Así, sin avisar. Dicen que es un pato feroz.',
      ]);
      S.set('metCapys');
    } else await UI.say(K, '…Sigue ahí. Ha vuelto a hacer «cuac». Así no hay quien se pegue un chapu.');
    if (await UI.choose(C, '¿Me acerco a ver qué hay entre los juncos?', ['Con mucho cuidado', 'Ahora no']) !== 0) return;
    scene.startScene('pato', 27, 12);
  },
  async patoDone() {
    await UI.say('Patito', [
      '¡¡CUAC!! ¡No me comas! …Espera. ¿Colgadín?',
      'Qué susto. Creía que eras uno de esos ratones gigantes que rondan el estanque. Llevo días sin salir de los juncos.',
    ]);
    await UI.say(C, 'No son ratones: son capybaras. Y están aterrados… de ti.');
    await UI.say('Patito', ['¿De mí? Si yo ni siquiera soy un pato. Me llaman Patito porque soy amarillo.', 'De pequeño me tragué el altavoz de un pato de juguete. Desde entonces, cuando me pongo nervioso, me sale el «cuac».']);
    await UI.say('Capybara', '¿Ese era el monstruo? Pero si es blandito. Anda, ven a pegarte un chapu, que hay sitio para todos.');
    Sound.logro();
    S.set('pato');
    await UI.say('Capybara', ['Gracias, Colgadín. Te debemos un chapu. Cuando quieras, hay sitio.', 'Y llévale esto a Cait de nuestra parte: un centro con las flores de loto más bonitas del estanque.']);
    gift('flores');
    invite('patito', 'Patito');
    invite('capybaras', 'los capybaras');
  },
  async capybarasHappy() { invite('capybaras', 'los capybaras'); await UI.say('Capybara', 'Glu, glu, glu. Por fin, un chapu. El agua está a la temperatura exacta de no hacer nada. A la fiesta vamos, pero despacio.'); },
  async patito() { invite('patito', 'Patito'); await UI.say('Patito', 'Cuac. Es broma, ya no estoy nervioso. Bueno, un poco. ¿En la fiesta habrá ratones gigantes?'); },
  async teatro(scene) {
    const O = 'Owitos del Teatro';
    if (S.flag('simon')) return UI.say('', 'Dentro siguen ensayando «Owicked». Ya van por el segundo acto: el de la escoba.');
    if (!S.d.party.includes('tigrito')) {
      return UI.say(O, ['¡No se puede ensayar! ¡Nos falta el director, Tigrito!', 'Se fue al bosque a practicar y no ha vuelto. Sin director no hay musical. Solo hay… «cal».']);
    }
    await UI.say(O, '¡DIRECTOR! ¡Por fin! ¡Estrenamos «Owicked» y no hemos ensayado ni una vez!');
    await UI.say('Tigrito', ['¡A sus puestos, Owitos! Colgadín, tú me ayudas: necesito a alguien que marque las entradas.']);
    if (await UI.choose(C, '¿Entro al ensayo?', ['¡Arriba el telón!', 'Ahora no']) !== 0) return;
    scene.startScene('simon', 5, 8);
  },
  async simonDone() {
    const D = 'Tigrito';
    Sound.logro();
    await UI.say(D, ['¡Bravo! ¡Bravísimo! Ha sido… ¡popular!', 'Toma, Colgadín: un OTAMATONE, el instrumento oficial de los Owitos. Te lo has ganado.']);
    S.set('simon');
    give('{music} Otamatone', true);
    await UI.say(D, ['Y guarda bien esa melodía.', 'Dice la leyenda que esa canción puede llamar a grandes animales capaces de surcar los mares…']);
    invite('owitos_teatro', 'los Owitos del Teatro');
    await UI.say(D, 'Los Owitos ya están listos para el estreno. Me voy a casa de Cait a ensayar el «Cumpleaños feliz». ¡Nos vemos en la fiesta!');
    S.goHome('tigrito');
    await UI.say('', 'Tigrito se marcha a casa de Cait.');
  },
  async gatos(scene) {
    const G = 'Gemelo bipolar';
    if (S.flag('andamios')) { invite('gatos', 'los Gemelos bipolares'); return UI.say(G, ['Miau. (Este lado está contento.)', '¿Una fiesta? Iremos los dos. Uno sonreirá en las fotos y el otro pondrá esta cara. Equilibrio.']); }
    if (!S.flag('horno')) return UI.say(G, ['Miau. (Está del lado enfurruñado.)', '¿Desmontar los andamios con la muralla llena de agujeros? Ni hablar. Primero, mazapán.']);
    await UI.say(G, [
      '¡Miau! Somos los Gemelos bipolares. Si algo sale bien, se nos ve contentos. Si sale mal, nos damos la vuelta.',
      'Con la muralla entera ya podemos quitar los andamios. Eso sí: a nuestra manera.',
    ]);
    if (await UI.choose(G, '¿Le damos al martillo?', ['¡Al compás!', 'Ahora no']) !== 0) return;
    scene.startScene('ritmo', 19, 24);
  },
  async ritmoDone() {
    Sound.logro();
    await UI.say('Gemelo bipolar', ['¡Ocho tablones al suelo! Mira qué cara de contento se me ha quedado. Por este lado, claro.', 'El otro sigue enfurruñado. Es su naturaleza.']);
    S.set('andamios');
    invite('gatos', 'los Gemelos bipolares');
    await UI.say('Rey Peludito', '¡Sin andamios y con la muralla entera! ¡Que se abra la puerta principal del Castillo de Mazapán!');
    S.set('gateOpen');
    await UI.say('', 'La puerta principal se abre. Ya se puede entrar y salir del castillo por el sur de la plaza.');
  },
  async statue(scene, ent) {
    await UI.say('', [
      'Estatua de piedra: «Su Majestad el Rey Peludito, sentado. Como casi siempre».',
      'Estatua de piedra: «El Rey Peludito blandiendo la Espada de Mazapán en la batalla contra el hambre de media tarde».',
      'Estatua de piedra: «El Rey Peludito con cetro y capa el día de su coronación. La capa era una manta».',
      'Estatua de piedra: «El Rey Peludito descubriendo nuevos ingredientes para el mazapán». Ninguno ha superado a la almendra.',
      'Estatua de piedra: «El Rey Peludito echando la siesta real». Dicen que es la única estatua que posó sin quejarse.',
    ][ent.n - 1]);
  },
  async plazaVend1() { await UI.say('Vendedora', ['¡Frutas de mazapán! ¡Recién pintadas! Naranjas, fresas, peras…', 'Son las mismas que usan para tapar la muralla. Si ves un agujero con forma de pera, no he sido yo.']); },
  async plazaVend2() { await UI.say('Vendedor', ['Vendo recuerdos del castillo: muralla en porciones individuales.', 'Bueno, vendía. El Rey dice que eso es «comerse el patrimonio».']); },
  async plazaPintor() { await UI.say('Owito pintor', ['Chsss. Estoy retratando a Su Majestad. Es el retrato número cuarenta y uno.', 'Siempre sale igual: redondo, peludo y con cara de querer merendar.']); },
  async plazaGuardia() { await UI.say('Guardia real', S.flag('gateOpen') ? 'Puerta abierta, muralla entera y ni un cerdito a la vista. Hoy es un buen día para ser guardia.' : 'La puerta principal no se abre hasta que acaben las obras. Órdenes del Rey. Y del arquitecto. Que es el Rey.'); },
  // ---------------------------------------------------------- Cameo: la mesa de guerra de los Owitos de la Inquisición
  // Escena de unos 40 segundos: planean la fiesta sorpresa de su comandante, Cullen (Cait), y reciben su invitación.
  // Sin decirlo nunca, se intuye que son ellos quienes le encargaron la misión a Colgadín y le dejaron las invitaciones
  // en casa de Cait: las figuritas del mapa, la lista de invitados, «he hecho las invitaciones», el dibujo…
  async owiquis(scene, e) {
    const T = 'Owitos', SH = '¡¡CHSSST!! ¡Que no se entere el comandante!';
    const LINES = {
      owq_jos: ['Owephine', '¡Protocolo! La lista de invitados está revisada tres veces y sellada. Nadie entra en esta fiesta sin invitación.'],
      owq_lel: ['Lowiana', 'Mis espías ya me han dicho dónde está cada invitado. Todos. Tú también, Colgadín: llevas un buen rato dando vueltas por el patio.'],
      owq_cas: ['Cassandrowa', ['Uf. Fiestas, guirnaldas, sorpresas… Esto no es lo mío.', '…Aunque he repasado el plan catorce veces. Y he hecho los carteles. Y las invitaciones. ¡Pero no es lo mío!']],
      owq_dor: ['Dowian', 'La decoración la llevo yo, evidentemente. Velas, terciopelo y mucho dorado. Va a ser la fiesta más elegante de la historia. Como todo lo que toco.'],
      owq_mor: ['Mowigan', ['Todo esto me parece innecesario. Una fiesta… qué costumbre tan curiosa.', '(No se va.)']],
    };
    // La invitación: nadie se sorprende demasiado
    const invitation = async () => {
      await UI.say(C, 'Bueno… yo venía a daros esto. Una invitación para la fiesta sorpresa de Cait.');
      await UI.say('Owephine', '¿Una invitación? ¡Oh! Qué… sorpresa. Papel noble, sello bien centrado, letra pequeña en su sitio. Un trabajo impecable. Lo haya hecho quien lo haya hecho.');
      await UI.say('Dowian', '¿Que Cait sale con siete dedos? Eso no es un error, es estilo. Se llama expresionismo.');
      await UI.say('Lowiana', 'Y la has traído justo a tiempo. Como estaba previsto. …Como era de esperar, quiero decir.');
      await UI.say('', '(Cassandrowa tacha algo en una lista muy larga. Ya casi no quedan casillas sin tachar.)');
      invite('inquisicion', 'los Owitos de la Inquisición');
    };
    // Ya visto y con la invitación entregada: cada uno dice lo suyo, y todos piden silencio. (Si la escena se vio antes
    // de que existiera la invitación, se repite entera, con Coleowe incluido.)
    if (S.flag('owiquis') && S.d.invited.includes('inquisicion') && !S.d.gifts.includes('sushigo')) {
      const p = scene.p, cole = scene.add.image(p.x + 18, p.y, 'owi_col_down_0').setOrigin(0.5, 1).setDepth(p.y + 1);
      Sound.sfx('rep');
      await UI.say('', '(De repente, junto a Colgadín, vuelve a estar el Owito del sombrero enorme.)');
      await coleoweGift();
      scene.tweens.add({ targets: cole, alpha: 0, duration: 200, onComplete: () => cole.destroy() });
      return UI.say('', '(Y ya no está.)');
    }
    if (S.flag('owiquis') && S.d.invited.includes('inquisicion')) {
      const [who, line] = LINES[e && e.id] || [T, 'Siguen cuchicheando alrededor de la mesa de guerra, moviendo figuritas por el mapa.'];
      return UI.say(who, [...[].concat(line), SH]);
    }
    await UI.say('', [
      'En la esquina del patio, un grupo de Owitos cuchichea alrededor de una gran mesa con un mapa lleno de figuritas.',
      '(Hay figuritas repartidas por toda la isla: un perro con aureola, una cobaya, un pato enorme… y una con las orejas muy largas, colgando, justo encima del castillo.)',
    ]);
    await UI.say(C, '¿Qué estáis…?');
    await UI.say(T, SH);
    for (const id of ['owq_jos', 'owq_lel', 'owq_cas', 'owq_dor', 'owq_mor']) await UI.say(LINES[id][0], LINES[id][1]);
    // Coleowe aparece de golpe junto a Colgadín, dice algo extrañamente tierno y desaparece
    const p = scene.p, cole = scene.add.image(p.x + 18, p.y, 'owi_col_down_0').setOrigin(0.5, 1).setDepth(p.y + 1).setAlpha(0);
    scene.tweens.add({ targets: cole, alpha: 1, duration: 120 });
    Sound.sfx('rep');
    await new Promise((r) => scene.time.delayedCall(700, r)); // un instante sin diálogo, para que se le vea aparecer
    await UI.say('', '(De repente, junto a Colgadín, hay un Owito con un sombrero enorme. Nadie lo ha visto llegar.)');
    await UI.say('Coleowe', 'Las orejas de Colgadín cuelgan porque escucha con todo el cuerpo. Por eso, cuando Cait le habla, se queda tan quieto. Le gusta guardar lo que oye.');
    await coleoweGift();
    scene.tweens.add({ targets: cole, alpha: 0, duration: 200, onComplete: () => cole.destroy() });
    await UI.say('', '(Y ya no está. Nadie lo ha visto irse.)');
    await invitation();
    await UI.say(C, 'Oye, ¿y quién es ese comandante…?');
    await UI.say(T, '¡¡CHSSST!! ¡QUE NO SE ENTERE EL COMANDANTE!');
    S.set('owiquis');
  },
  async owitoT() { await UI.say('Owito tanuki', 'Yo hago de mono volador. Llevo sombrero porque el presupuesto no daba para alas.'); },
  async owitoC() { await UI.say('Owito de la suerte', 'El rosa combina bien con el verde. Lo dice el libreto, lo dice el telón y lo digo yo.'); },
  async mantecas(scene) {
    const M = 'Mantecas';
    const bye = () => UI.say('Manteca2', '¡Dragsta pronto, shiushi!'); // al despedirse
    if (S.flag('horno')) { await UI.say(M, 'La muralla ha quedado para comérsela. Pero NO te la comas. Te estoy mirando. Bueno, no: tengo los ojos cerrados. Pero te oigo masticar.'); return bye(); }
    if (!S.flag('metMantecas')) {
      await UI.say(M, '¡Bienvenido a la Pastelería Real! Yo soy Mantecas y aquí tienes a Manteca2. Últimamente le ha dado muy fuerte con Drag Race.');
      await UI.say('Manteca2', '¡Hola, hola, shiushi! ¡Bienvenido al taller! Hoy hornearemos con tacones.');
      await UI.say(M, [
        'Aquí se hornea el mazapán con el que se reconstruye la muralla del castillo. Almendra y azúcar, nada más. Ni purpurina.',
        'Y vamos fatal de tiempo: cada vez que tapamos un agujero, alguien se come otro.',
      ]);
      S.set('metMantecas');
    }
    if (await UI.choose(M, '¿Te pones el delantal?', ['¡A hornear!', 'Ahora no']) !== 0) return bye();
    scene.startScene('horno', 32, 19);
  },
  async manteca2() {
    const M = 'Manteca2';
    if (await UI.choose(M, '¿Sí, shiushi? Ando a tope. Bueno, a tope de estorbar.', ['¿Vas de drag?', 'Nada, nada']) !== 0) return UI.say(M, '¡Dragsta pronto, shiushi!');
    await UI.say(M, [
      '¡Pues sí, shiushi! Estoy experimentando con esta nueva faceta… ¡y me encanta!',
      'Mis reinas son Kandy Krush y Wasabi Spice. Kandy va de kawaii, pero es malísima. Y Wasabi tiene una lengua afiladísima. ¡Por eso me encantan! ¡Harían tan buena pareja!',
      'Peluca cardada, tiara, pestañas hasta el techo… ¿Para cuándo un lipsync?',
      '¡Dragsta pronto, shiushi!',
    ]);
  },
  async hornoDone() {
    Sound.logro();
    await UI.say('Manteca2', '¡Shantay, te quedas!');
    await UI.say('Mantecas', ['¡DIEZ PEDIDOS! ¡Manteca2, owitos, a tapar agujeros!', 'Tú avisa al Rey Peludito: la muralla está lista y ya puede abrir la puerta.']);
    S.set('horno');
    invite('mantecas', 'Mantecas y Manteca2');
    await UI.say('', 'Los albañiles reales colocan los mazapanes en la muralla. Ha quedado como nueva (y ligeramente mordisqueable).');
  },

  // ---------------------------------------------------------- Isla Helada
  async heladaFrio() {
    S.set('heladaFrio');
    await UI.say(C, [
      '¡Brrrr! ¡Qué frío! Se me han congelado hasta las orejas. Y tengo MUCHA oreja.',
      'Esto es como untarse de Tiger Balm de la cabeza a los pies. Pero sin ese olorcito tan rico.',
    ]);
  },
  async heladoncio(scene) {
    const H = 'Heladoncio';
    // Curiosidad (no es obligatoria ni da regalo): devolverle el sombrero que se le voló
    if (S.flag('hatGot') && !S.flag('hat')) {
      await UI.say(H, [
        '¡MI SOMBRERO! Ana me lo regaló. Este viento no respeta nada. ¡Gracias, Colgadín!',
        'Un pastelero sin sombrero es como un panettone sin relleno. Gracias, gracias, gracias. Ahora sí que voy guapo a la fiesta.',
      ]);
      S.set('hat');
      return;
    }
    if (S.flag('metHel') && !S.flag('hatGot') && !S.flag('hatAsk')) {
      S.set('hatAsk');
      await UI.say(H, 'Por cierto… con el viento de esta mañana se me voló el sombrero. Si lo encuentras, me harías el pastelero más feliz del hemisferio helado.');
    }
    if (S.flag('tarta')) { invite('heladoncio', H); return UI.say(H, 'La tarta ya va camino de casa de Cait a lomos de Narwal. Yo llevo las velas. Cuarenta. Las he contado tres veces.'); }
    if (!S.flag('metHel')) {
      await UI.say(H, [
        'Bienvenido a SWEET FAMOSA, la fábrica de pasteles más dulce del hemisferio helado. Soy Heladoncio, maestro pastelero.',
        '¿Ves las cascadas? Chocolate negro, chocolate blanco, crema de Lotus y crema de pistacho. Los panettones se rellenan hasta que revientan. Así debe ser.',
        '¿Una tarta para Cait? Me encantaría… pero cada pastel que sale del horno se lo lleva un cerdito rosa antes de que nadie pueda probarlo.',
      ]);
      S.set('metHel');
      // Si la máquina de TEDI ya está apagada cuando se le conoce, no tiene sentido que diga que sigue encendida:
      // sigue la conversación y ofrece la tarta en el momento
      if (!S.flag('tedi')) return UI.say(H, 'Vienen de TEDI, la fábrica de ahí al lado. Tienen una máquina que no para de escupirlos. Mientras siga encendida, no hay tarta que dure.');
      await UI.say(H, 'Venían de TEDI, la fábrica de al lado… pero me han dicho que alguien ha apagado su máquina. ¿Has sido tú? ¡Gracias!');
    }
    if (S.flag('tedi') && !S.flag('cali')) {
      return UI.say(H, [
        '¡La máquina se ha parado! Ya puedo hornear en paz.',
        'Pero una tarta de cuatro pisos pesa lo suyo, y por el camino quedan clones. Así, sin preparación, no te la doy: se te caería en el primer resbalón.',
        'Ve al Fitness Bartory, aquí al lado, y que Bart te ponga en forma. Luego hablamos.',
      ]);
    }
    if (!S.flag('tedi')) return UI.say(H, 'Mientras esa máquina de TEDI siga escupiendo clones, aquí no llega un pastel entero ni a la puerta. Está al este, la del logo azul y amarillo.');
    await UI.say(H, ['¡La máquina se ha parado! ¡Por fin puedo hornear en paz!', 'Tengo lista una tarta de cuatro pisos para Cait. Solo falta llevarla hasta Narwal… y aún quedan clones despistados por el camino.']);
    if (await UI.choose(H, '¿La llevamos entre los dos?', ['¡Vamos!', 'Ahora no']) !== 0) return;
    scene.startScene('tarta', 22, 9); // si se sale a medias, vuelve a la puerta; al ganar, la escena lo deja en el muelle
  },
  async tartaDone(layers) {
    const H = 'Heladoncio';
    Sound.logro();
    await UI.say(H, [
      '¡Los cuatro pisos, intactos! ¡Eres el mejor repartidor!', // Narwal solo acepta la tarta entera
      '¿Sabes? A mí casi me secuestran en Edimburgo... estuve a punto de no llegar nunca a casa de Cait. ¡Menudo disgusto!',
      'Narwal la lleva a casa de Cait. Y yo voy detrás: a esa fiesta no falto.',
    ]);
    S.set('tarta', layers);
    give(`{cake} Tarta de ${layers} ${layers === 1 ? 'piso' : 'pisos'}`);
    invite('heladoncio', H);
  },
  async hatPick() {
    await UI.say('', ['Medio enterrado en la nieve, detrás de la Casa de la Navidad, hay un sombrero marrón.',
      S.flag('hatAsk') ? '¡Es el sombrero de Heladoncio! Se lo llevo a Sweet Famosa.' : 'Seguro que alguien de la isla lo está buscando.']);
    S.set('hatGot');
    give(S.flag('hatAsk') ? '{straw_hat} Sombrero de Heladoncio' : '{straw_hat} Sombrero');
  },
  async sfDoor(scene) {
    await UI.say('', [
      'SWEET FAMOSA. Por la fachada caen cascadas de chocolate negro, chocolate blanco, crema de Lotus y crema de pistacho.',
      'Por la ventana se ve cómo rellenan un panettone. Le sale crema por arriba, por los lados y por sitios que un panettone no debería tener.',
    ]);
    // Dentro no se entra: quien atiende es Heladoncio, en la puerta. Llamar a la puerta es como hablar con él.
    if (!S.flag('tarta')) { await UI.say('', 'Heladoncio asoma por la puerta, secándose las manos en el delantal.'); return SCRIPTS.heladoncio(scene); }
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
  async ovejoncio(scene) {
    const O = 'Ovejoncia';
    if (S.flag('tediHack')) {
      invite('ovejoncio', O);
      return UI.say(O, S.flag('tedi') ? 'Máquina apagada, Owinken libre. Lo celebraré comiéndome un trozo de césped. Bueno, de nieve.' : 'La puerta está abierta. Yo vigilo desde aquí. Si algo sale mal, grita «¡beeee!».');
    }
    if (!S.flag('metOvejoncio')) {
      await UI.say(O, [
        'Beee. Soy Ovejoncia. Llevo días intentando entrar en TEDI para pararles los pies a esos clones.',
        'La puerta se abre desde un panel que está dentro. Y la única forma de llegar es ese conducto de ventilación.',
        'Yo no quepo: tengo demasiada lana.',
      ]);
      S.set('metOvejoncio');
    }
    // El conducto es estrecho: sin la calistenia de Bart, Colgadín (lleno de mazapán) tampoco cabe
    if (!S.flag('cali')) {
      return UI.say(O, [
        'Y tú… sin ofender, pero tampoco cabes por el conducto. ¿Mucho mazapán últimamente?',
        'Prueba a hacer algo de calistenia. En el Fitness Bartory, aquí al lado, Bart te deja como una barra. Luego vuelves.',
      ]);
    }
    if (!S.flag('ovejaFit')) {
      S.set('ovejaFit');
      await UI.say(O, [
        '¡Beee! Se te nota que has estado haciendo calistenia. Esos hombros, esa retracción escapular… Ahora sí cabes por el conducto.',
        'Dentro está el robot de mantenimiento de la máquina clonadora. Si lo reprogramas, irá hasta los interruptores de la puerta. Yo te ayudo desde aquí fuera.',
      ]);
    }
    if (await UI.choose(O, '¿Te metes por el conducto?', ['¡Me meto!', 'Ahora no']) !== 0) return;
    await UI.say('', 'Colgadín se escurre por el conducto de ventilación. Al fondo, el robot de mantenimiento de la clonadora espera órdenes.');
    scene.startScene('robot', 27, 12); // js/scenes/robot.js; si sale a medias, recuerda la cerradura en la que iba
  },
  async tediHackDone() {
    const O = 'Ovejoncia';
    Sound.logro();
    S.set('tediHack');
    invite('ovejoncio', O);
    await UI.say(O, ['¡CLIC! ¡La puerta de TEDI está abierta!', 'Cait lo habría programado con los ojos cerrados, pero tú no lo has hecho nada mal.', 'Yo me quedo aquí vigilando. Ah, y a la fiesta voy. Llevo el portátil.']);
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
    scene.startScene('fiesta', 6, 7);
  },
  async fiestaTable(scene, ent) { return SCRIPTS.fiestaCheck(scene, ent, true); },
  // Restos de la fiesta en casa de Cait, después del final: al acercarse, se puede volver a celebrar
  async fiestaRest(scene, ent) {
    const what = ent && ent.id || '';
    const line = what.startsWith('rest_cake') ? 'Lo que queda de la tarta. Una porción, la vela apagada… y migas por todas partes.'
      : what === 'rest_balloons' ? 'Los globos de los awawas, ya medio desinflados. Aún se resisten a tocar el suelo.'
      : 'Papel de regalo arrugado, un lazo suelto y un gorrito de fiesta. Y confeti. Mucho confeti.';
    await UI.say(C, line);
    if (await UI.choose(C, '¿Y si lo celebramos otra vez?', ['¡Otra fiesta!', 'Ahora no']) !== 0) return;
    scene.startScene('fiesta', 6, 7);
  },

  // ---------------------------------------------------------- Invitados en casa de Cait
  async homeGuest(scene, ent) {
    const lines = {
      lolete: ['Estoy inflando globos. Bueno, mordiéndolos. Es un proceso.', 'He escondido las cajas de la mudanza debajo de la cama de Cait. Ni se nota.'],
      tigrito: ['Estoy ensayando el «Cumpleaños feliz» en cuatro tonalidades, por si acaso.'],
    }[ent.who] || ['¡Preparando la fiesta!'];
    const n = S.d.flags['home_' + ent.who] = ((S.d.flags['home_' + ent.who] || 0) + 1);
    await UI.say(CHARACTERS.find((c) => c.id === ent.who).name, lines[n % lines.length]);
  },

  // ---------------------------------------------------------- Fucsia
  async fuxia() {
    const F = 'Fucsia';
    if (S.flag('gramola')) {
      invite('fuxia', F);
      if (await UI.choose(F, 'La gramola ya está camino de casa de Cait. ¿Quieres otra ronda, solo por gusto? Te pongo canciones distintas.', ['¡Otra ronda!', 'Ahora no']) !== 0) return;
      if (await fuxiaQuiz()) await UI.say(F, 'Otros cien puntos. Empiezo a pensar que me espías la colección.');
      return;
    }
    if (!S.flag('metFuxia')) {
      await UI.say(F, [
        'Soy Fucsia, la mayor melómana de la isla. Tengo más discos que zanahorias.',
        'Fucsia, con C y con S. Durante años todo el mundo me llamó «Furcia». Me ha costado muchísimo hacer el rebranding, así que pronúncialo bien.',
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
    await UI.say('', 'Dentro suena música a todo volumen. Fucsia no deja entrar a nadie mientras ordena sus discos.');
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
      if (loose) await UI.say('Scooby', `Llevas ${loose === 1 ? 'un calcetín suelto' : loose + ' calcetines sueltos'}, pero ninguno hace pareja con otro. Tienen que ser del mismo dibujo.`);
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
        'Y que claro que va a la fiesta de Cait.',
      ]);
      invite('cuca', 'Cuca');
      await UI.say('Cuy', 'Yo me quedo aquí con ella, que tenemos mucho de qué hablar. Si necesitas una pista, ven: yo traduzco.');
      S.d.party = S.d.party.filter((p) => p !== 'cuy');
      S.set('cuyTemple');
      scene.sync();
      await UI.say('', 'Cuy se queda en el templo con Cuca. Ahora que Cuy la traduce, podremos entender sus pistas.');
      return;
    }
    invite('cuca', 'Cuca');
    const pend = S.d.flags.cheats || [];
    if (pend.length) { // papelitos de Aeroflot: Cuca los lee y Cuy traduce
      S.d.flags.cheats = [];
      S.d.flags.cheatsUsed = [...new Set([...(S.d.flags.cheatsUsed || []), ...pend])];
      S.save();
      let after = null;
      for (const code of pend) {
        await UI.say('Cuca', 'Гав! Аэрофлот… хм-хм. Гав-гав!', { ruso: true });
        const r = CHEATS[code] ? CHEATS[code].run(scene) : 'Dice que esta nota no hay quien la entienda.';
        const [text, then] = Array.isArray(r) ? r : [r];
        await UI.say('Cuy', text);
        if (then && !after) after = then;
      }
      if (after) { after(); return true; }
      return;
    }
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
      'Le sirven a Colgadín un único fideo de dos metros. Se lo sorbe entero sin respirar.',
    ]);
  },

  // ---------------------------------------------------------- Campo de nabos
  async perrunfli() {
    const P = 'Perrunfli';
    if (S.flag('paella')) {
      invite('perrunfli', P);
      return UI.say(P, ['La paella eixirà de categoria. I sense ni un pésol.', 'Els naps continuen sense tocar-se, per cert.']);
    }
    if (!S.flag('metPerrunfli')) {
      await UI.say(P, [
        'Home, Colgadín! Sí, sí, és un camp de naps. Ja sé el que estàs pensant.',
        'No et pensaràs que et farem collir naps els dimarts a les 23:37 h, veritat?',
        'Ací els naps ni es compren ni es venen ni es podreixen. Són de decoració.',
        'El que sí que estem preparant al poble és una paella valenciana per a la festa de Cait.',
        'El problema és que cada veí diu que porta una cosa diferent, i ja hem tingut dues baralles i mitja. Aixina no hi ha manera.',
      ]);
      S.set('metPerrunfli');
    }
    const c = await UI.choose(P, 'Tu saps què porta una paella valenciana DE VERITAT?', ['Claro que sí', 'Mejor otro día']);
    if (!S.flag('perrunfliVa')) { // la primera vez que Colgadín le contesta en castellano
      S.set('perrunfliVa');
      await UI.say(P, 'Ei, ei… Que no parles valencià?');
      await UI.say(C, 'No, pero lo entiendo perfectamente.');
      await UI.say(P, 'Doncs meleta de romer! Seguim.');
    }
    if (c !== 0) return UI.say(P, 'Doncs torna quan ho tingues clar. A la marxeta, que els naps i jo no ens movem.');

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
      fails === 0 ? 'Ni una errada! Tu has nascut amb una paella davall del braç.' : `Això és! Amb ${fails === 1 ? 'un esglai' : fails + ' esglais'} pel camí, però ja la tenim.`,
      'Arròs, pollastre, conill, bajoqueta, garrofó, tomaca, oli, safrà, sal i aigua. I RES MÉS. Aixina, i només aixina.',
      'T\'has guanyat açò. És per a Cait: una Mocadorà, amb els últims massapans d\'abans de les obres.',
    ]);
    gift('mocadora');
    await UI.say('', '¡Has conseguido la MOCADORÀ! Un pañuelo anudado lleno de figuritas de mazapán con forma de frutas y hortalizas de la huerta valenciana: los últimos de antes de las obras.');
    invite('perrunfli', P);
    await UI.say(P, 'I compta amb mi per a la festa. Jo porte la paella, a la marxeta, que el bon arròs no té pressa. I ni un nap.');
  },

  // ---------------------------------------------------------- Fitness Bartory (el gimnasio de Bart)
  async bart(scene) {
    const B = 'Bart';
    // La primera vez: «combate» gratuito, sin mediar palabra (escena combate.js); Bart lo corta y sigue su charla
    if (!S.flag('bartPelea')) { S.set('bartPelea'); return scene.startScene('combate', 26, 18); }
    if (!S.flag('metBart')) {
      // Justo después del «combate», la bienvenida empieza de cero
      await UI.say(B, S.flag('bartPelea') ? ['Bueno. Empecemos de cero.', ...BART_INTRO] : BART_INTRO);
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
    await UI.say(B, 'Tres series: dominadas, sprint de flexiones y plancha. Técnica ESTRICTA. Y da gracias, que por lo menos no te pido burpees. Los burpees NO son calistenia.');
    const c = await UI.choose(B, '¿Empezamos?', ['Vale…', 'Ahora no']);
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
    await UI.say('', ['FITNESS BARTORY. «Entra como puedas, sal como una barra».', 'Dentro huele a magnesio y a sufrimiento. La dueña está fuera, hablando con alguien que ya se ha ido.']);
  },

  // ---------------------------------------------------------- Kapadokya
  async siri(scene) {
    const N = 'Siri';
    if (S.flag('globos')) {
      invite('siri', 'Siri y los awawas');
      await UI.say(N, ['¡Awawa! Mis sobrinos ya han llevado los globos a casa de Cait. Bien atados, que si no salen volando… y ellos detrás.', 'Vuelve cuando quieras. Aquí siempre hay un awawa asomado a algo.']);
      return SCRIPTS.awawaSock(); // partidas en las que se ganó antes de que dieran el calcetín
    }
    if (!S.flag('metSiri')) {
      await UI.say(N, [
        '¡Awawa! Bienvenido a KAPADOKYA. Soy Siri. Sí, soy un damán. No, no soy un conejillo de Indias. Mira qué dientecitos.',
        'Aquí vivimos en madrigueras excavadas en las chimeneas de hadas. Y esos globos de ahí arriba son nuestros.',
        '¿Globos para una fiesta? De esos grandes no, que no caben por la puerta. Pero de los de fiesta tenemos un montón.',
        'Te los daría… pero mis sobrinos no dejan nada en paz hasta que alguien les gana a su juego favorito.',
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
    give('{party_balloons} Globos para la fiesta', true);
    invite('siri', 'Siri y los awawas');
    await SCRIPTS.awawaSock();
  },
  // El calcetín con el que juegan los awawas: te lo dan (su pareja anda por Kapadokya). Primera pareja posible de la isla.
  async awawaSock() {
    if (S.d.socks.includes('s12')) return;
    await UI.say('Siri', ['Y toma, quédate el calcetín. Mis sobrinos ya le han sacado todo el jugo.', 'Lo encontraron por aquí, entre las chimeneas. Tenía pareja… pero esa se nos escapó.']);
    S.d.socks.push('s12'); S.save();
    const d = SOCK_DESIGN.s12, pair = S.d.socks.filter((s) => SOCK_DESIGN[s] === d).length === 2;
    give(`{sock_${d}} Calcetín ${SOCK_DESIGNS[d]}${pair ? ': ¡ya tienes la pareja!' : ''} (${S.d.socks.length}/${TOTAL_SOCKS})`);
  },

  // Al alejarse de alguien con quien ya se ha terminado sin darle la invitación, Colgadín se lo pregunta (una vez por
  // personaje). Solo si hace un rato que está pendiente, para no saltar justo al acabar su prueba.
  async remindInvite() {
    if (!S.flag('invites')) return;
    const now = Date.now(), seen = remindSeen;
    const due = CHARACTERS.filter((c) => {
      const r = INVITE_READY[c.id];
      if (!r || !S.flag(r[0]) || S.d.invited.includes(c.id) || S.flag('rem_' + c.id)) return false;
      seen[c.id] = seen[c.id] || now;
      return now - seen[c.id] > 15000;
    });
    if (!due.length) return;
    const c = due[0];
    S.set('rem_' + c.id);
    await UI.say(C, `Un momento… ¿Le he dado la invitación ${INVITE_READY[c.id][1]}?`);
  },

  // ---------------------------------------------------------- Puestos y tiendas
  async taiyaki() {
    const V = 'Vendedor de taiyakis'; // un Owito de Navidad, el del gorro de árbol
    if (S.d.gifts.includes('taiyaki')) return UI.say(V, 'Siguen calentitos. ¿Por dónde se empiezan, por la cola o por la cabeza? Aquí hay debates que acaban a gritos.');
    await UI.say(V, ['¡Taiyakis calentitos! Pastelitos con forma de pez, rellenos de anko.', 'Con este frío se venden solos. Y te calientan las manos de camino.']);
    await UI.say(C, 'Son para el cumpleaños de Cait. ¿Me pones unos cuantos?');
    await UI.say(V, '¿Para Cait? Entonces invita la casa. Toma: una bolsita, recién salidos de la plancha.');
    gift('taiyaki');
  },
  async mochis() {
    const V = 'Vendedora de mochis'; // una Owito color melocotón
    if (S.d.gifts.includes('mochis')) return UI.say(V, 'Los capybaras vienen todas las tardes a mirar los mochis. No compran nada. Solo miran. Mucho rato.');
    await UI.say(V, ['¡Mochis! De fresa, de matcha, de sésamo negro… Blanditos como un cojín.', 'Por eso estoy aquí, en esta esquina: no queremos hacerle la competencia a los mazapanes. En este castillo, el mazapán es sagrado.']);
    await UI.say(C, '¿Me preparas una cajita? Es para el cumpleaños de Cait.');
    await UI.say(V, '¡Claro! Una de cada sabor. Llévala con cuidado, que se pegan a todo.');
    gift('mochis');
  },
  async comics() {
    await UI.say('', ['DOKI DOKI MANGA. En el escaparate: mangas, tebeos, figuritas y un póster enorme de una chica mágica con coletas.', 'Hay dos carteles pegados en la puerta, escritos con mucha rabia: «NO SOMOS PUNTO DE RECOGIDA DE PAQUETES» y «ESTO NO ES UNA BIBLIOTECA».', '(Debajo, alguien ha dejado un paquetito. Con una nota: «Vuelvo luego a por él. Y a terminarme el tomo 12».)']);
  },

  // ---------------------------------------------------------- Vecinos
  async signLaw() {
    await UI.say('', '«Abogada soltera, lucha por su cliente, lleva minifaldas provocativas y además es autosuficiente».');
  },
  async houseLaw() { await UI.say('', 'Bufete cerrado. Horario de atención: cuando ella quiera, que para eso es autosuficiente.'); },
  async houseA() { await UI.say('', 'Hay una nota en la puerta: «He ido al Combini, vuelvo en cinco minutos». La nota tiene telarañas. Parece que alguien dejó a su familia atrás.'); },
  async houseB() { await UI.say('', ['Por la ventana se ven unas estanterías medio vacías, con unos pocos peluches.', 'Parece que a Cait ya no le caben más peluches en casa y ha empezado a regalárselos a su vecina.']); },
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
    await UI.say('Aeroflot', ['Estimado pasajero: AEROFLOT ha cesado sus operaciones en esta isla.', 'Todos los vuelos desde aquí han sido cancelados. Todos. Para siempre.']);
    const c = await UI.choose('Aeroflot', '¿Desea presentar una reclamación?', ['Escribir reclamación', 'No, gracias']);
    if (c !== 0) return;
    const text = await UI.prompt('Hoja de reclamaciones de Aeroflot');
    if (!text) return UI.say('Aeroflot', 'Reclamación en blanco archivada con éxito.');
    if (text.trim().startsWith('#')) { // un truco: se devuelve un papelito con la pista para Cuca
      const code = text.trim().slice(1).toLowerCase().replace(/[^a-z0-9]/g, ''), ch = CHEATS[code];
      const used = S.d.flags.cheatsUsed || [], pend = S.d.flags.cheats || [];
      if (!ch) return UI.say('Aeroflot', ['Código no reconocido.', 'Su reclamación ha sido procesada y triturada correctamente.']);
      if (ch.once && used.includes(code)) return UI.say('Aeroflot', 'Ese código ya fue utilizado. Aeroflot no repite. Ni vuelos ni regalos.');
      if (pend.includes(code)) return UI.say('Aeroflot', 'Ya tiene usted esa nota. Llévela a quien corresponda.');
      S.d.flags.cheats = [...pend, code]; S.save();
      await UI.say('Aeroflot', ['Código aceptado.', 'La máquina escupe una nota con algo escrito en ruso. Y una flecha que señala… hacia el templo.']);
      give('{note} Nota en ruso');
      return;
    }
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
  async signCait() { await UI.say('', 'Un cartel de madera pintado a mano: «CAIT». Alguien le ha dibujado un corazoncito en la esquina.'); },
  async boats() { await UI.say(C, ['Un embarcadero con dos barquitas amarradas. Se mecen muy tranquilas.', 'Hoy no hay tiempo para remar: ¡hay una fiesta que preparar!']); },
  async signCross() { await UI.say('', 'Norte: Casa de Cait · Oeste: Casa de Lolete\nEste: templo, bosque y castillo · Sur: Casa Fucsia, Combini y Aeropuerto'); },
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
  // En el muelle de la Isla Helada sin haber llamado a Narwal (se llegó con el truco #frozen)
  async heladaAtrapado(scene) {
    await UI.say(C, ['Ni un barco, ni una barca, ni un triste flotador…', 'Me he quedado atrapado para siempre en esta isla. Tenía que haber pensado en cómo volver.']);
    await UI.say('', '(Al rato, un témpano de hielo pasa flotando junto al muelle, rumbo a la Isla de Cait. Colgadín se sube de un salto, sin pensárselo dos veces.)');
    scene.warp('isla', 9, 10, 'down');
    return true;
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
