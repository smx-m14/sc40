# Super Cait's 40

Juego de regalo para el 40 cumpleaños de Cait. HTML + CSS + Phaser 3, sin paso de compilación.

## Probarlo en local

Los módulos ES necesitan un servidor (no funciona abriendo `index.html` con doble clic):

```
python tools/serve.py
```

y abrir <http://127.0.0.1:8040>.

## Estructura

| Ruta | Qué hay |
| --- | --- |
| `index.html`, `css/style.css` | Página e interfaz (pantalla de carga, título, diálogos, HUD, menú, mandos táctiles) |
| `js/main.js` | Arranque de Phaser, pantalla de título y atajos de prueba |
| `js/state.js` | Partida, lista de invitados y guardado en `localStorage` |
| `js/art.js` | Todo el pixel art, generado por código |
| `js/audio.js` | Motor de sonido: sintetizador chiptune (WebAudio) y efectos grabados en mp3 |
| `js/songs-data.js` | Canciones chiptune generadas por `tools/make_music.py` (no editar a mano) |
| `js/maps.js` | Mapas: baldosas, edificios, entidades y zonas (con su música) |
| `js/story.js` | Guion: qué ocurre al interactuar con cada cosa |
| `js/ui.js`, `js/input.js` | Interfaz HTML (título, diálogos, menú) y teclado + mandos táctiles |
| `js/progress.js`, `js/debug.js` | Porcentaje de juego completado y modo debug |
| `js/fuxia.js`, `js/fuxia-songs.js` | Prueba de oído de Fucsia (la lista la genera `tools/make_fuxia.py`) |
| `js/beam.js` | Rayo de luz y espejos del Apartamento de las Ratitas |
| `js/scenes/world.js` | Exploración |
| `js/scenes/titlebg.js` | Fondo de la pantalla de título (la isla, quieta, con la casa de Cait en el centro) |
| `js/scenes/sokoban.js`, `js/sokoban-levels.js` | Lolete entre cajas |
| `js/scenes/monos.js`, `js/monos-levels.js` | Bosque de los monos |
| `js/scenes/pato.js`, `simon.js`, `horno.js`, `ritmo.js` | Castillo: Patito, Teatro Real, Pastelería Real y andamios (ritmo) |
| `js/scenes/cali.js`, `combate.js` | Fitness Bartory: calistenia y el «combate» con Bart |
| `js/scenes/otama.js` | El Otamatone en el muelle (llamar a Narwal) |
| `js/scenes/awawas.js` | Los awawas de Kapadokya |
| `js/scenes/luces.js`, `robot.js`, `tedi.js`, `tarta.js` | Isla Helada: luces de Navidad, robot del conducto, máquina clonadora de TEDI y la tarta |
| `js/scenes/fiesta.js` | Escena final: la fiesta sorpresa |
| `music/` | MIDI de cada canción (`<id>.mid`), copiados de `Material Insipiración/Base Musical` |
| `assets/audio/` | Efectos grabados (monos, Patito, awawas), los prepara `tools/make_sfx.py` |
| `assets/fuxia/` | Fragmentos de la prueba de Fucsia (numerados para no delatar la respuesta) |
| `assets/album/`, `assets/cuadros/` | Fotos pixeladas del Libro de los Miausis y cuadros de Ratencio |
| `tools/make_music.py`, `tools/midi_score.py` | Genera `js/songs-data.js` a partir de los MIDI (bucles y reparto de voces) |
| `tools/make_fuxia.py` | Prepara las canciones de la prueba de Fucsia |
| `tools/make_sfx.py` | Prepara los efectos grabados (necesita ffmpeg) |
| `tools/make_assets.py` | Regenera `assets/album` a partir de las fotos originales |
| `tools/serve.py` | Servidor local sin caché |
| `guia/` | Manual (`index.html`) y guía completa (`completa.html`) en A5, para imprimir |
| `vendor/`, `fonts/` | Phaser 3.80.1 y las fuentes pixel (VT323 y cirílico) |

## Modo debug

Pulsa **Mayús+D** durante el juego (o abre la página con `?dev`) para activarlo; queda guardado en el navegador hasta que se vuelva a pulsar.

- Aparece la pestaña 🛠 en el menú: «Saltar» da por superada una prueba y todas las anteriores, y hay botones para ir a cada zona y sumar monedas.
- Dentro de cualquier minijuego, **Mayús+W** o el botón «⏭ Ganar» lo superan al instante.

## Atajos de prueba

`?debug` empieza una partida limpia sin pasar por el título. Se puede combinar con:

- `flags=intro,invites,lolete,tigrito,caveOpen` — marca progreso · `party=lolete,tigrito` · `home=lolete`
- `at=isla,22,12` — mapa (`isla`, `cait`, `ratitas`, `castillo`, `helada`) y baldosa de inicio
- `scene=sokoban&level=2`, `scene=cali`, `scene=monos` — abre directamente un minijuego
- `album` — abre el Libro de los Miausis
- `run=scooby` — lanza un guion · `menu=cosas` — abre el menú

## Publicar

Es una web estática: sirve tal cual en GitHub Pages. `Material Insipiración/` y `Roadmap/` están en `.gitignore` para no subir las fotos ni el guion. Ojo: `assets/` sí se publica, con las fotos pixeladas del álbum, los efectos y los fragmentos de la prueba de Fucsia. `music/` también (son los MIDI de las canciones).
