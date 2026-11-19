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
| `index.html`, `css/style.css` | Página e interfaz (diálogos, HUD, menú, título, mandos táctiles) |
| `js/main.js` | Arranque de Phaser y atajos de prueba |
| `js/state.js` | Partida, lista de invitados y guardado en `localStorage` |
| `js/art.js` | Todo el pixel art, generado por código |
| `js/audio.js` | Motor de sonido: sintetizador chiptune (WebAudio) y reproducción de mp3 |
| `js/songs-data.js` | Canciones chiptune generadas a partir de los mp3 (no editar a mano) |
| `js/maps.js` | Mapas: baldosas, edificios y entidades |
| `js/story.js` | Guion: qué ocurre al interactuar con cada cosa |
| `js/scenes/world.js` | Exploración |
| `js/scenes/sokoban.js`, `js/sokoban-levels.js` | Minijuego de Lolete |
| `js/scenes/cali.js` | Minijuego de calistenia de Bart |
| `js/beam.js` | Rayo de luz y espejos del Apartamento de las Ratitas |
| `js/scenes/pato.js`, `simon.js`, `horno.js` | Pruebas del Castillo: Patito, Teatro Real y Pastelería Real |
| `js/scenes/luces.js`, `robot.js`, `tedi.js`, `tarta.js` | Pruebas de la Isla Helada: luces de Navidad, robot del conducto (hackeo de TEDI), jefe de TEDI y escolta de la tarta |
| `js/scenes/fiesta.js` | Escena final: la fiesta sorpresa |
| `js/debug.js` | Modo debug: saltar pruebas y teletransporte |
| `js/scenes/monos.js`, `js/monos-levels.js` | Minijuego del bosque de los monos |
| `assets/audio/` | Música de las zonas (mp3) y efectos grabados |
| `assets/album/` | Fotos del Libro de los Miausis, pixeladas |
| `tools/make_assets.py` | Regenera `assets/album` a partir de las fotos originales |
| `tools/make_music.py` | Transcribe los mp3 originales a `js/songs-data.js` (necesita ffmpeg y numpy) |
| `vendor/`, `fonts/` | Phaser 3.80.1 y la fuente VT323 |

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

Es una web estática: sirve tal cual en GitHub Pages. `Material Insipiración/` y `Roadmap/` están en `.gitignore` para no subir las fotos ni el guion. Ojo: `assets/` sí se publica, con las fotos pixeladas del álbum y la música.
