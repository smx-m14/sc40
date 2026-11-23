"""Genera las canciones chiptune del juego (js/songs-data.js).

Uso (desde la raíz del proyecto):  python tools/make_music.py          (todas)
                                    python tools/make_music.py lolete   (solo las que se nombren; el resto se conserva)

Cada canción sale de su MIDI, music/<id>.mid (copia del de "Material Insipiración/Base Musical"), con el reparto de
pistas y el bucle que se indican en MIDI_OPTS (conversión exacta: tools/midi_score.py). Hoy todas tienen MIDI.
Si alguna no lo tuviera, se transcribiría de su mp3 de "Base Musical" (transcripción automática: detecta el tempo,
sigue la melodía y el bajo y los cuantiza; recoge la melodía principal, no el arreglo completo).
"""
import json
import os
import sys
import subprocess
import numpy as np

SR = 11025
NFFT = 4096
WIN = 2048
HOP = 256
BASE = 'Material Insipiración/Base Musical/'
# id del juego → (fichero, nº máximo de corcheas del bucle)
SONGS = {
    'isla': ('Isla de Cait', 192),
    'lolete': ('Lolete 2', 640, dict(whole=True, search=True, voices=True)),
    'templo': ('Templo de los Sabios', 192),
    'combini': ('Combini', 64, dict(whole=True)),   # sale de music/combini.mid; el mp3 está en silencio
    'bosque': ('Bosque de los monos 2', 640, dict(whole=True, search=True, mlo=67, mid=True)),
    'ratitas': ('Apartamento ratitas 2', 640, dict(whole=True, search=True, voices=True)),
    'capybaras': ('Estanque de los Capybaras', 192),
    'pasteleria': ('Pastelería Real', 192),       # en realidad suena la del Castillo de Mazapán (music/pasteleria.mid)
    'horno': ('Pastelería real', 0),             # solo MIDI: la Pastelería Real por dentro y la prueba de Manteca
    'andamios2': ('Andamios2', 0),               # solo MIDI: minijuego de ritmo de los Gemelos bipolares (js/scenes/ritmo.js)
    'kapadokya': ('Kapadokya', 0),
    'helada': ('Isla Helada', 0),
    'tedi': ('Tedi', 0),
    'aeroflot': ('Aeroflot', 0),                 # solo MIDI: el aeropuerto de la Isla de Cait (quiosco de Aeroflot)                         # solo MIDI: tienda TEDI y su prueba (jefe)                # solo MIDI: la Isla Helada (menos la Casa de la Navidad y sus edificios)               # solo MIDI: zona de Kapadokya y prueba de los awawas               # solo MIDI: alternativa para el mismo minijuego (ritmo.js elige cuál)
    'teatro': ('Teatro de los Owitos', 192),
    'navidad': ('Casa de la Navidad', 192),     # sale de music/navidad.mid (solo suena en la Casa de la Navidad)
    'sweetfamosa': ('Sweet Famosa', 192),       # sale de music/sweetfamosa.mid («Girl like me»)
    'logro': ('Música Logro 2', 128, dict(whole=True, search=True)),
    'gym': ('Fitness Fattory', 0),     # solo MIDI (music/gym.mid); el gimnasio ahora se llama Fitness Bartory
    'fuxia': ('Fuxia', 0),             # solo MIDI
    'casa': ('Casa de Cait', 0),        # solo MIDI (music/casa.mid): la casa de Cait
    'inquisicion': ('Dragon Age', 0),
    'titulo': ('Pantalla título', 0),
    'perrunfli': ('Perrunfli', 0),     # solo MIDI (music/perrunfli.mid): el campo de nabos de Perrunfli  # solo MIDI (music/titulo.mid): la pantalla de título  # solo MIDI (music/inquisicion.mid): la mesa de guerra de los Owitos del castillo
}
# Reparto de pistas para los MIDI con arreglo completo (music/<id>.mid). Sin entrada aquí se trata como piano.
MIDI_OPTS = {
    # Isla de Cait: pista 6 = melodía (8 y 7 son adornos que entran cuando calla), 3 = bajo, 4 y 9 = acordes
    # La canción se toca dos veces: el compás 30 es idéntico al 1 (y así hasta el 51), y la segunda vuelta acaba con un
    # final y silencio. El bucle es la primera vuelta entera, compases 1-29: el 29 es la transición que en el original
    # lleva al 30 (= al 1), así que vuelve al principio sin costura (unos 70 s).
    'isla': dict(roles=dict(melody=[6, 8, 7], bass=[3], chords=[4, 9]), melody_shift=-12, max_beats=116),
    # Bosque de los monos: pista 3 = melodía doblada en octavas (5 = adorno), 2 = bajo, 4 = acompañamiento
    'bosque': dict(roles=dict(melody=[3, 5], bass=[2], chords=[4]), melody_shift=-12),
    # Música de logro: pista 2 = melodía, 3 = segunda voz, 4 = bajo
    'logro': dict(roles=dict(melody=[2], bass=[4], chords=[3]), melody_shift=-12),
    # Apartamento de las ratitas: 1 = voz, 4 = guitarra solista (suena cuando la voz calla), 3 = bajo, 5 = acordes
    # Ojo: el MIDI empieza con 9 negras en 1/4 antes del 4/4, así que el compás n del 4/4 (desde 0) empieza en la negra
    # 9 + 4n. Bucle de la segunda estrofa con su estribillo: compases 37-66 (2 de guitarra, la estrofa «So no one told you
    # life was gonna be this way…», el «It's like you're always stuck in second gear…» y el estribillo «I'll be there for
    # you…»). El 66 acaba como el 36 (final del primer estribillo), que en el original lleva a los mismos 2 compases de
    # guitarra del 37: vuelve sin costura (unos 38 s). Melodía: solo la voz (el órgano y los coros la ensuciaban).
    'ratitas': dict(roles=dict(melody=[1], bass=[3], chords=[5]), melody_shift=12, start_beat=157, max_beats=120),
    # Estanque de los capybaras: 0 = el canto (notas repetidas), 3 = bajo, 1 y 4 = adornos
    'capybaras': dict(roles=dict(melody=[0], bass=[3], chords=[1, 4]), melody_shift=12),
    # Fitness Bartory: 6 = melodía (4 entra en la segunda parte), 2 = bajo, 1 = arpegios
    'gym': dict(roles=dict(melody=[6, 4], bass=[2], chords=[1])),
    # Fuxia (music/fuxia.mid, «Moonlight Densetsu»): solo el estribillo, de «Nakitaku naru you na moonlight» a «…hato wa
    # mangekyou»: 8 compases, desde la anacrusa sol-do-mi♭ del compás 34 (tiempo 2,5) hasta el do largo del 41. Lo de
    # delante y la coda de después (42-45) fuera. Melodía: 5 y, cuando calla, 2 (la voz), una octava arriba. La 7 (notas
    # largas muy agudas) va como acordes arpegiados una octava más abajo: como melodía sonaban estridentes. 8 = bajo.
    # Acaba en do y vuelve a la anacrusa sin costura (unos 13 s).
    'fuxia': dict(roles=dict(melody=[5, 2], bass=[8], chords=[7]), melody_shift=12, shift_all=True, chord_shift=-12, start_beat=134.5, max_beats=32),
    # Pastelería Real: 1 = melodía, 2 = contracanto, 4 = bajo, 3 = acordes
    # Castillo de Mazapán (id «pasteleria» por historia; music/pasteleria.mid). Sin la intro (compases 1-6): bucle de los
    # compases 7-52, que es justo lo que la canción repite a partir del 53 (mismo arranque), así que no tiene costura.
    'pasteleria': dict(roles=dict(melody=[1, 2], bass=[4], chords=[3]), start_beat=24, max_beats=184),
    # Pastelería real (music/horno.mid, piano a dos manos): 0 = melodía, 1 = acordes; no tiene bajo, se saca de los
    # acordes. Se salta el primer tema (compases 1-8) y repite del compás 9 al 44: termina en do7, que lleva de vuelta
    # al fa del compás 9 igual que en el original (8→9), así que el bucle no tiene costura.
    'horno': dict(roles=dict(melody=[0], chords=[1]), start_beat=32, max_beats=144, bass_from_chords=True),
    # Andamios2 (music/andamios2.mid, formato 0: todo en una pista, se reparte por canales). Está escrito a doble
    # tempo (328 = 164 reales), así que beat=2. Compases 25-56 del MIDI: segunda estrofa (25-36), parón con la
    # anacrusa (37-40) y estribillo (41-56: mi, sol#m, do#m, la, si, mi). El 56 acaba en mi con la anacrusa
    # mi-fa#-sol#, que vuelve al mi del 25 sin costura.
    # Canales: 3 = melodía, 2 = notas largas cuando calla, 8 = contracanto de la estrofa; 1 = bajo;
    # 11 = guitarra de acordes del estribillo y 10 = sintetizador de la estrofa; batería fuera.
    # Al tempo del minijuego (120) y tan bajita como la primera.
    'andamios2': dict(roles=dict(melody=[3, 2, 8], bass=[1], chords=[11, 10]), by_channel=True, beat=2, start_beat=96, max_beats=128, bpm=120, vol=0.35),
    # Kapadokya (music/kapadokya.mid): 5 = flauta (melodía); cuando calla, 7 = koto, 6 = guitarra y 0 = sitar
    # (adornos); 3 = bajo; 4 = guitarra eléctrica y 8 = sintetizador como acordes; batería fuera. Compases 6-21: tema
    # (dos veces), puente grave con el sintetizador y variación en octavas. El 21 acaba en do con el adorno del
    # sitar (la#-sol-mi-do#) que en el original lleva al tema, así que vuelve al 6 sin costura (unos 35 s).
    'kapadokya': dict(roles=dict(melody=[5, 7, 6, 0], bass=[3], chords=[4, 8]), start_beat=20, max_beats=64),
    # Casa de la Navidad (music/navidad.mid, formato 0: se reparte por canales). Tras la intro lenta en 6/8 y 9/8
    # («You know Dasher and Dancer…», a 110), arranca en 4/4 a 172 en la negra 44,5 del MIDI. Solo el estribillo:
    # los 16 compases de «Rudolph, the red-nosed reindeer… reindeer games», que en el original se vuelven a cantar
    # tal cual, así que el bucle cierra solo (unos 22 s). Canales: 3 = voz (melodía; el contracanto del 10 no, que se colaba en sus huecos),
    # 1 = bajo, 4 = acordes; la batería (canal 10 del MIDI) fuera.
    'navidad': dict(roles=dict(melody=[3], bass=[1], chords=[4]), by_channel=True, start_beat=44.5, max_beats=64, bpm=172),
    # Isla Helada (music/helada.mid): 0 = koto (melodía), 1 = piano (acordes, arpegiados), 2 = piano eléctrico (el
    # bajo es su nota más grave). Balada a 67. Estribillo: compases 16-24 del MIDI (el 16 de colchón con la anacrusa
    # mi♭-fa del koto al final, y los 8 del estribillo; vuelve a sonar casi igual en el 53). El 24 acaba en si
    # (sexta rebajada) y vuelve al re♭ del 16, como en el original al pasar al 25 (unos 32 s).
    'helada': dict(roles=dict(melody=[0], bass=[2], chords=[1]), start_beat=60, max_beats=36),
    # Tedi (music/tedi.mid): 1 = caja de música (melodía, en octavas), 2 = piano (bajo: su nota más grave),
    # 0 = guitarra (acordes, ya arpegiados); batería fuera. Alterna mi y re todo el rato. Se salta la intro de
    # guitarra sola (compases 1-4) y el acorde final: compases 5-18, con la entrada del piano y la melodía entera;
    # el 18 (re) vuelve al mi del 5 sin costura (unos 28 s).
    'tedi': dict(roles=dict(melody=[1], bass=[2], chords=[0]), start_beat=16, max_beats=56),
    # Sweet Famosa: «Girl like me» (music/sweetfamosa.mid; antes también sonaba en el juego de ritmo, que ahora usa
    # andamios2). 1 = coro (melodía), 3 = bajo, 0 = sintetizador de acordes; la batería se descarta. Compases 6-21
    # (2 de groove + 14 con el coro): el 21 acaba en si menor y vuelve al fa# menor del 6 sin costura (unos 28 s).
    'sweetfamosa': dict(roles=dict(melody=[1], bass=[3], chords=[0]), melody_shift=12, start_beat=20, max_beats=64, chord_shift=12),
    # Aeroflot (music/aeroflot.mid): una versión de «Rasputin». Solo el gancho del violín (compases 23-26: si-si-si…)
    # y el estribillo «Ra-ra-Rasputin, lover of the Russian queen…» (43-50), sin las estrofas: dos trozos seguidos
    # (segments: negra de inicio y número de negras de cada uno). Melodía: piano (9) y, cuando calla, violín (6);
    # 3 = bajo; guitarra de jazz (7) y piano (8) de acompañamiento; baterías fuera. En si menor a 128. El estribillo acaba
    # y vuelve al gancho, como en la canción (unos 22 s).
    'aeroflot': dict(roles=dict(melody=[9, 6], bass=[3], chords=[7, 8]), segments=[(88, 16), (168, 32)]),
    # Mesa de guerra de los Owitos de la Inquisición (music/inquisicion.mid, «Dragon Age.mid»): 0 = caja de música
    # (melodía; lleva acordes, se toma la nota aguda), 1 = guitarra clásica (bajo y arpegios); el clavecín (2) solo
    # repite re en el ostinato, fuera. En re menor a 100. Se salta la intro, el ostinato y la parte en si♭: compases
    # 41-56, el tema principal entero (fa-re-la | la-si-do-si-la | re…) con su subida al re agudo. El 56 se queda en
    # si♭ y vuelve al re menor del 41 sin costura (unos 38 s).
    'inquisicion': dict(roles=dict(melody=[0], bass=[1], chords=[1]), start_beat=160, max_beats=64),
    # Casa de Cait (music/casa.mid): 1 = piano (melodía: su nota aguda), 2 = bajo, 3 = cuerdas (acordes); el arpa (4)
    # solo hace adornos, fuera. A 120. Solo el estribillo: los compases 1-8 (la melodía principal); el 9 la repite
    # con otra cola, así que volver del 8 al 1 suena igual que en el original (unos 16 s).
    'casa': dict(roles=dict(melody=[1], bass=[2], chords=[3]), max_beats=32),
    # Pantalla de título (music/titulo.mid = «Pantalla título.mid»), mi mayor a 110: 0 = melodía, 2 = segunda melodía
    # (entra en el tema B, compases 14-19, cuando la primera calla), 1 = bajo y acordes; la batería se descarta.
    # Bucle de los compases 4 a 20: se salta la fanfarria (2-3) y el final (21-22). El 20 baja en si7 y resuelve en el
    # mi del compás 4, así que la vuelta suena como una cadencia más.
    'titulo': dict(roles=dict(melody=[0, 2], bass=[1], chords=[1]), start_beat=12, max_beats=68),
    # Perrunfli (music/perrunfli.mid), do mayor a 70: 1 = melodía, 2 = acordes (quinta al aire; de ahí sale el bajo).
    # Cada compás empieza con un tresillo de anacrusa («sol-la-si → do»): rejilla de 12 pasos por negra (sub=12) para
    # que no salgan cojos. Bucle de los 8 compases enteros: el 8 cierra en do y vuelve al tresillo del principio.
    'perrunfli': dict(roles=dict(melody=[1], bass=[2], chords=[2]), max_beats=32, sub=12),
    # Lolete (music/lolete.mid = «Lolete (piano).mid», sacado del vídeo de piano de «El show del perro salchicha»):
    # 0 = mano derecha (melodía), 1 = mano izquierda (acordes, de ahí sale también el bajo). 4/4 a 140, mi mayor.
    # El bucle empieza en el segundo 5 del vídeo, en la anacrusa «si-do#-mi» de la segunda mitad del compás 2 (negra
    # 6,5), y dura 26 compases: llega al mismo punto del compás 28, que repite el 2, así que la vuelta es la del
    # original. carry: el acorde que ya suena en ese medio compás no se pierde al volver.
    # Se toca a 112 (el vídeo va a 140): más tranquila, más cerca de la de la Isla de Cait (100).
    'lolete': dict(roles=dict(melody=[0], chords=[1]), bass_from_chords=True, start_beat=6.5, max_beats=104, carry=True, bpm=112),
    # Teatro de los Owitos: 2 = melodía en octavas, 0 = bajo, 1 = piano
    # Sin la intro de piano (compases 1-5): bucle de los compases 6-30, el tema del violín entero (A y B). El 30 acaba
    # resolviendo en re♭, que es justo donde arranca el tema en el 6, así que vuelve sin costura (unos 46 s).
    'teatro': dict(roles=dict(melody=[2], bass=[0], chords=[1]), melody_shift=-12, start_beat=20, max_beats=100),
}
NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def load(name):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', BASE + name + '.mp3', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    return x / (np.abs(x).max() + 1e-9)


def stft(x):
    n = 1 + (len(x) - WIN) // HOP
    idx = np.arange(WIN)[None, :] + HOP * np.arange(n)[:, None]
    frames = x[idx] * np.hanning(WIN)[None, :]
    return np.abs(np.fft.rfft(frames, NFFT, axis=1)).T  # [bin, t]


def midi_hz(m):
    return 440.0 * 2 ** ((np.asarray(m) - 69) / 12)


def salience(mag, lo, hi, harmonics=4, decay=0.75):
    """Suma armónica: energía de cada nota MIDI contando sus primeros armónicos."""
    S = np.zeros((hi - lo + 1, mag.shape[1]))
    for i, m in enumerate(range(lo, hi + 1)):
        f0 = midi_hz(m)
        for h in range(1, harmonics + 1):
            b = int(round(f0 * h * NFFT / SR))
            if b + 1 >= mag.shape[0]:
                break
            S[i] += decay ** (h - 1) * mag[b - 1:b + 2].max(axis=0)
    return S


def track(S, jump=0.12):
    """Camino de máxima energía con penalización por saltos (Viterbi)."""
    n, T = S.shape
    Sn = S / (S.max() + 1e-9)
    pen = jump * np.abs(np.arange(n)[:, None] - np.arange(n)[None, :])
    pen = np.minimum(pen, 1.2)
    cost = np.zeros((n, T)); back = np.zeros((n, T), dtype=int)
    cost[:, 0] = Sn[:, 0]
    for t in range(1, T):
        c = cost[:, t - 1][None, :] - pen
        back[:, t] = c.argmax(axis=1)
        cost[:, t] = c.max(axis=1) + Sn[:, t]
    path = np.zeros(T, dtype=int)
    path[-1] = cost[:, -1].argmax()
    for t in range(T - 1, 0, -1):
        path[t - 1] = back[path[t], t]
    return path


def tempo(flux):
    f = flux - flux.mean()
    ac = np.correlate(f, f, 'full')[len(f) - 1:]
    fps = SR / HOP
    best, bpm = -1, 120
    for b in np.arange(70, 181, 0.5):
        lag = fps * 60 / b
        i = int(lag)
        v = ac[i] * (1 - (lag - i)) + ac[i + 1] * (lag - i)
        v += 0.5 * ac[int(round(lag * 2))] + 0.5 * ac[int(round(lag / 2))]   # apoyo del doble y la mitad
        v *= np.exp(-0.5 * (np.log2(b / 118) / 0.55) ** 2)                   # preferencia suave por tempos medios
        if v > best:
            best, bpm = v, b
    return float(bpm)


def name(m):
    return f'{NAMES[m % 12]}{m // 12 - 1}'


def encode(seq):
    """seq: lista de (midi|None, pasos) → cadena del sintetizador."""
    return ' '.join(f"{'-' if m is None else name(m)}:{d}" for m, d in seq)


def quantize(pitch, voiced, strength, starts, per, max_len, frac=0.45):
    """Una nota por paso (moda de los fotogramas), uniendo pasos iguales salvo que haya un nuevo ataque."""
    out = []
    for k, s in enumerate(starts):
        a, b = int(s), int(s + per)
        v = voiced[a:b]
        p = None
        if len(v) and v.mean() > frac:
            vals, cnt = np.unique(pitch[a:b][v], return_counts=True)
            p = int(vals[cnt.argmax()])
        attack = p is not None and a > 2 and strength[a:a + 3].max() > 1.6 * strength[max(0, a - 3):a].mean() + 1e-9
        if out and out[-1][0] == p and out[-1][1] < max_len and not (attack and out[-1][1] >= 1 and p is not None and k % 2 == 0 and strength[a:a + 3].max() > 2.2 * strength[max(0, a - 3):a].mean()):
            out[-1][1] += 1
        else:
            out.append([p, 1])
    return [(p, d) for p, d in out]


def render(seq, step, wave):
    out = []
    for m, d in seq:
        n = int(round(d * step * SR))
        if m is None:
            out.append(np.zeros(n)); continue
        t = np.arange(n) / SR
        ph = (t * midi_hz(m)) % 1
        y = np.sign(ph - 0.5) if wave == 'square' else 4 * np.abs(ph - 0.5) - 1
        out.append(y * np.minimum(1, np.minimum(t * 200, (n / SR - t) * 60)))
    return np.concatenate(out)


def chroma(x):
    mag = stft(x)
    C = np.zeros((12, mag.shape[1]))
    for m in range(36, 96):
        b = int(round(midi_hz(m) * NFFT / SR))
        C[m % 12] += mag[b - 1:b + 2].max(axis=0)
    return C / (np.linalg.norm(C, axis=0, keepdims=True) + 1e-9)


def transcribe(file, max_steps, voice=0.30, frac=0.45, whole=False, div=2, jump=0.12, x=None, mlo=57, mid=False):
    """div: pasos por negra (2 = corcheas, 4 = semicorcheas). jump: penalización de saltos de la melodía.
    mlo: nota MIDI más grave que se acepta como melodía. mid: añade una tercera voz con el acompañamiento
    que queda entre el bajo y la melodía."""
    x = load(file) if x is None else x
    mag = stft(x)
    logm = np.log1p(40 * mag)
    flux = np.maximum(0, np.diff(logm, axis=1)).sum(axis=0)
    flux = np.concatenate([[0], flux])
    bpm = tempo(flux)
    fps = SR / HOP
    per = fps * 60 / bpm / div  # fotogramas por paso

    # Melodía (A3–E6) y bajo (G1–E3)
    MLO, MHI, BLO, BHI = mlo, 90, 31, 52
    Sm = salience(np.sqrt(mag), MLO, MHI)
    Sb = salience(np.sqrt(mag), BLO, BHI, harmonics=3)
    pm = track(Sm, jump) + MLO
    pb = track(Sb, jump=0.05) + BLO
    em = Sm.max(axis=0); eb = Sb.max(axis=0)
    vm = em > voice * np.percentile(em, 90)
    vb = eb > voice * np.percentile(eb, 90)
    sm = Sm[pm - MLO, np.arange(Sm.shape[1])]

    # Fase del compás: desplazamiento que mejor alinea los ataques con la rejilla
    T = mag.shape[1]
    offs = np.arange(0, per, 0.5)
    score = [flux[(o + per * div * np.arange(int((T - o) / (per * div)))).astype(int)].sum() for o in offs]
    off = offs[int(np.argmax(score))]
    starts = off + per * np.arange(int((T - off) / per) - 1)

    # Empieza en el primer paso con melodía, en múltiplo de compás, y toma como mucho max_steps
    first = next((k for k, s in enumerate(starts) if vm[int(s):int(s + per)].mean() > frac), 0)
    first -= first % div
    rest = len(starts) - first
    n = min(max_steps, rest - rest % div) if whole else (min(max_steps, rest // (8 * div) * (8 * div)) or min(max_steps, rest))
    starts = starts[first:first + n]

    mel = quantize(pm, vm, sm, starts, per, 4 * div, frac)
    bass_q = quantize(pb, vb, eb, starts[::div], per * div, 4, frac)
    bass = [(p, d * div) for p, d in bass_q]
    acc = None
    if mid:
        Sa = salience(np.sqrt(mag), BHI + 1, MLO - 1, harmonics=3)
        pa = track(Sa, 0.04) + BHI + 1
        ea = Sa.max(axis=0)
        acc = quantize(pa, ea > voice * np.percentile(ea, 90), ea, starts, per, 2 * div, frac)

    # Parecido de croma entre el original y la versión generada
    step = 60 / bpm / div
    a = int(starts[0] * HOP); seg = x[a:a + int(n * step * SR)]
    y = render(mel, step, 'square')
    yb = render(bass, step, 'triangle')
    ya = render(acc, step, 'square') if acc else np.zeros(len(y))
    L = min(len(seg), len(y), len(yb), len(ya))
    Co, Cg = chroma(seg[:L]), chroma(0.6 * y[:L] + yb[:L] + 0.4 * ya[:L])
    sim = float((Co * Cg).sum(axis=0).mean())
    voiced = sum(d for p, d in mel if p is not None) / max(1, n)

    song = {'bpm': round(bpm, 1), 'div': div, 'tracks': [
        {'wave': 'square', 'vol': 0.07, 'notes': encode(mel)},
        {'wave': 'triangle', 'vol': 0.16, 'notes': encode(bass)},
    ] + ([{'wave': 'square', 'vol': 0.035, 'notes': encode(acc)}] if acc else [])}
    return song, dict(bpm=bpm, div=div, jump=jump, mlo=mlo, mid=mid, pasos=n, croma=round(sim, 3), melodia=round(voiced, 2), notas=len(mel))


def midi_song(path, opts):
    """MIDI → canción. Con segments=[(negra de inicio, negras), …] encadena varios trozos (para saltarse partes)."""
    from midi_score import midi_to_song
    opts = dict(opts)
    segs = opts.pop('segments', None)
    if not segs: return midi_to_song(path, **opts)
    parts = [midi_to_song(path, start_beat=a, max_beats=n, **opts) for a, n in segs]
    song = parts[0][0]
    for other, _ in parts[1:]:
        for t, o in zip(song['tracks'], other['tracks']): t['notes'] = t['notes'].rstrip() + ' ' + o['notes'].strip()
    info = dict(parts[0][1]); info['trozos'] = len(segs); info['compases'] = sum(n for _, n in segs) / 4
    return song, info


def main():
    out = {}
    # Lo ya generado: si falta el audio de origen de una canción, se conserva su versión actual
    prev = {}
    if os.path.exists('js/songs-data.js'):
        txt = open('js/songs-data.js', encoding='utf-8').read()
        prev = json.loads(txt[txt.index('{'):txt.rindex('}') + 1])
    sys.path.insert(0, os.path.dirname(__file__))
    only = set(sys.argv[1:])  # p. ej. «python tools/make_music.py lolete»: solo esas; el resto se conserva tal cual
    for sid, (file, steps, *opts) in SONGS.items():
        if only and sid not in only and sid in prev:
            out[sid] = prev[sid]
            continue
        if os.path.exists(f'music/{sid}.mid'):  # hay MIDI: conversión exacta
            song, info = midi_song(f'music/{sid}.mid', MIDI_OPTS.get(sid, {}))
            out[sid] = song
            print(f'{sid:12s}', 'MIDI', info)
            continue
        if not os.path.exists(BASE + file + '.mp3'):
            if sid in prev:
                out[sid] = prev[sid]
                print(f'{sid:12s}', f'SE CONSERVA (no está «{file}.mp3»)')
            else:
                print(f'{sid:12s}', f'OMITIDA: no está «{file}.mp3» ni hay versión anterior')
            continue
        o = dict(opts[0]) if opts else {}
        if o.pop('search', False):  # prueba varias rejillas y suavizados y se queda con la versión más parecida al original
            x = load(file)
            # voices=True: prueba además distintos suelos de melodía y la tercera voz de acompañamiento
            vs = [dict(mlo=m, mid=True) for m in (60, 64, 67, 71)] + [dict()] if o.pop('voices', False) else [dict()]
            cands = [transcribe(file, steps, div=d, jump=j, x=x, **{**o, **v}) for v in vs for d in (2, 4) for j in (0.06, 0.12, 0.2)]
            for c in sorted(cands, key=lambda c: -c[1]['croma'])[:4]:
                print('   candidato', c[1])
            song, info = max(cands, key=lambda c: c[1]['croma'])
        else:
            song, info = transcribe(file, steps, **o)
        out[sid] = song
        print(f'{sid:12s}', info)
    with open('js/songs-data.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write('// GENERADO por tools/make_music.py a partir de los mp3 originales. No editar a mano.\n')
        f.write('export const GENERATED = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')


if __name__ == '__main__':
    main()
