"""Transcribe los mp3 de "Material Insipiración/Base Musical" a pistas chiptune para js/songs-data.js.

Uso (desde la raíz del proyecto):  python tools/make_music.py

Para cada canción: detecta el tempo, sigue la melodía (tono dominante en el registro agudo) y el bajo
(tono dominante en el grave), los cuantiza a corcheas y escribe las notas en el formato del sintetizador
("NOTA:pasos"). Es una transcripción automática: recoge la melodía principal, no el arreglo completo.
Al final imprime, por canción, el parecido armónico (croma) entre el original y la versión generada.
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
    'pasteleria': ('Pastelería Real', 192),
    'teatro': ('Teatro de los Owitos', 192),
    'navidad': ('Casa de la Navidad', 192),
    'sweetfamosa': ('Sweet Famosa', 192),
    'logro': ('Música Logro 2', 128, dict(whole=True, search=True)),
    'gym': ('Fitness Fattory', 0),     # solo MIDI
    'fuxia': ('Fuxia', 0),             # solo MIDI
}
# Reparto de pistas para los MIDI con arreglo completo (music/<id>.mid). Sin entrada aquí se trata como piano.
MIDI_OPTS = {
    # Isla de Cait: pista 6 = melodía (8 y 7 son adornos que entran cuando calla), 3 = bajo, 4 y 9 = acordes
    'isla': dict(roles=dict(melody=[6, 8, 7], bass=[3], chords=[4, 9]), melody_shift=-12),
    # Bosque de los monos: pista 3 = melodía doblada en octavas (5 = adorno), 2 = bajo, 4 = acompañamiento
    'bosque': dict(roles=dict(melody=[3, 5], bass=[2], chords=[4]), melody_shift=-12),
    # Música de logro: pista 2 = melodía, 3 = segunda voz, 4 = bajo
    'logro': dict(roles=dict(melody=[2], bass=[4], chords=[3]), melody_shift=-12),
    # Apartamento de las ratitas: 1 = voz, 4 = guitarra solista (suena cuando la voz calla), 3 = bajo, 5 = acordes
    'ratitas': dict(roles=dict(melody=[1, 4, 2], bass=[3], chords=[5]), melody_shift=12, max_beats=330),
    # Estanque de los capybaras: 0 = el canto (notas repetidas), 3 = bajo, 1 y 4 = adornos
    'capybaras': dict(roles=dict(melody=[0], bass=[3], chords=[1, 4]), melody_shift=12),
    # Fitness Fattory: 6 = melodía (4 entra en la segunda parte), 2 = bajo, 1 = arpegios
    'gym': dict(roles=dict(melody=[6, 4], bass=[2], chords=[1])),
    # Fuxia: se salta la introducción y empieza en el tema principal (negra 38). 2 = tema, 7/5 = puente, 8 = bajo
    'fuxia': dict(roles=dict(melody=[2, 7, 5], bass=[8], chords=[9, 3]), melody_shift=12, start_beat=38),
    # Pastelería Real: 1 = melodía, 2 = contracanto, 4 = bajo, 3 = acordes
    'pasteleria': dict(roles=dict(melody=[1, 2], bass=[4], chords=[3]), max_beats=248),
    # Teatro de los Owitos: 2 = melodía en octavas, 0 = bajo, 1 = piano
    'teatro': dict(roles=dict(melody=[2], bass=[0], chords=[1]), melody_shift=-12, max_beats=260),
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


def main():
    out = {}
    # Lo ya generado: si falta el audio de origen de una canción, se conserva su versión actual
    prev = {}
    if os.path.exists('js/songs-data.js'):
        txt = open('js/songs-data.js', encoding='utf-8').read()
        prev = json.loads(txt[txt.index('{'):txt.rindex('}') + 1])
    sys.path.insert(0, os.path.dirname(__file__))
    from abc_score import abc_to_song  # tools/abc_score.py
    for sid, (file, steps, *opts) in SONGS.items():
        if os.path.exists(f'music/{sid}.mid'):  # hay MIDI: conversión exacta
            from midi_score import midi_to_song
            song, info = midi_to_song(f'music/{sid}.mid', **MIDI_OPTS.get(sid, {}))
            out[sid] = song
            print(f'{sid:12s}', 'MIDI', info)
            continue
        if os.path.exists(f'music/{sid}.abc'):  # hay partitura: conversión exacta, sin transcribir el audio
            song, info = abc_to_song(open(f'music/{sid}.abc', encoding='utf-8').read())
            out[sid] = song
            print(f'{sid:12s}', 'PARTITURA', info)
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
