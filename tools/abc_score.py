"""Convierte una partitura en notación ABC al formato del sintetizador del juego.

Las partituras van en music/<id>.abc (id = el de la canción en el juego: isla, lolete, templo…).
tools/make_music.py (que importa este fichero, abc_score.py) las usa en lugar de transcribir el mp3 cuando existen: es una conversión exacta.

Admite: cabeceras L, Q y K (tonalidades mayores y menores), notas con alteraciones (^ _ =), octavas (' ,),
duraciones (2, /2, 3/2…), silencios (z), acordes entre corchetes [GB]2 y cifrado entre comillas "E".
Salen hasta tres voces: melodía (nota más aguda), segunda voz (nota más grave de los acordes escritos)
y bajo (fundamental y quinta alternadas según el cifrado).
"""
import re
from fractions import Fraction

NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
SEMI = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
SHARPS, FLATS = 'FCGDAEB', 'BEADGCF'
MAJOR = {'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7, 'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6}
MINOR = {'A': 0, 'E': 1, 'B': 2, 'F#': 3, 'C#': 4, 'G#': 5, 'D': -1, 'G': -2, 'C': -3, 'F': -4, 'Bb': -5}
NOTE = re.compile(r"([\^_=]*)([A-Ga-gz])([',]*)(\d*)(/*)(\d*)")


def key_signature(k):
    k = k.strip().replace('maj', '')
    m = re.match(r'([A-G][#b]?)\s*(m|min)?', k)
    n = (MINOR if m.group(2) else MAJOR).get(m.group(1), 0)
    return {c: 1 for c in SHARPS[:n]} if n > 0 else {c: -1 for c in FLATS[:-n]} if n < 0 else {}


def name(m):
    return f'{NAMES[m % 12]}{m // 12 - 1}'


def encode(seq):
    out = []
    for m, d in seq:  # une silencios seguidos y descarta duraciones nulas
        if d <= 0:
            continue
        if m is None and out and out[-1][0] is None:
            out[-1][1] += d
        else:
            out.append([m, d])
    return ' '.join(f"{'-' if m is None else name(m)}:{d}" for m, d in out)


def abc_to_song(text, default_bpm=120):
    unit, bpm, key, body = Fraction(1, 8), default_bpm, {}, []
    for line in text.splitlines():
        line = line.split('%')[0].strip()
        h = re.match(r'^([A-Za-z]):\s*(.*)$', line)
        if h and not line.startswith('|'):
            f, v = h.group(1), h.group(2)
            if f == 'L': unit = Fraction(v)
            elif f == 'Q': bpm = float(re.search(r'=\s*(\d+)', v).group(1)) if '=' in v else float(v)
            elif f == 'K': key = key_signature(v)
            continue
        body.append(line)
    s = ' '.join(body)
    step = Fraction(1, 16)                 # el sintetizador trabaja en semicorcheas (div = 4)
    mult = unit / step

    def length(num, slashes, den):
        d = Fraction(int(num) if num else 1)
        if slashes: d /= (int(den) if den else 2 ** len(slashes))
        d *= mult
        assert d.denominator == 1, 'duración más corta que una semicorchea'
        return int(d)

    def pitch(acc, letter, octs, barAcc):
        base = letter.upper()
        m = 60 + SEMI[base] + (12 if letter.islower() else 0) + 12 * octs.count("'") - 12 * octs.count(',')
        k = (base, m // 12)
        if acc: barAcc[k] = acc.count('^') - acc.count('_')
        return m + (barAcc[k] if k in barAcc else key.get(base, 0))

    mel, low, chords, t, i, barAcc = [], [], [], 0, 0, {}
    while i < len(s):
        c = s[i]
        if c == '"':
            j = s.index('"', i + 1); chords.append((t, s[i + 1:j])); i = j + 1
        elif c == '[' and i + 1 < len(s) and (s[i + 1].isalpha() or s[i + 1] in '^_='):
            j = s.index(']', i)
            notes = [pitch(a, l, o, barAcc) for a, l, o, *_ in NOTE.findall(s[i + 1:j]) if l != 'z']
            m = re.match(r'(\d*)(/*)(\d*)', s[j + 1:])
            d = length(*m.groups()); i = j + 1 + m.end()
            mel.append((max(notes), d)); low.append((min(notes) if len(notes) > 1 else None, d)); t += d
        elif c == '|':
            barAcc = {}; i += 1
        elif c.isalpha() or c in '^_=':
            m = NOTE.match(s, i)
            if not m: i += 1; continue
            acc, letter, octs, num, sl, den = m.groups()
            d = length(num, sl, den); i = m.end()
            mel.append((None if letter == 'z' else pitch(acc, letter, octs, barAcc), d)); low.append((None, d)); t += d
        else:
            i += 1

    # Bajo: fundamental y quinta alternando a negras mientras dura cada acorde del cifrado
    bass, pos = [], 0
    for n, (start, sym) in enumerate(chords):
        end = chords[n + 1][0] if n + 1 < len(chords) else t
        if start > pos: bass.append((None, start - pos))
        r = re.match(r'([A-G])([#b]?)', sym)
        root = 36 + SEMI[r.group(1)] + (1 if r.group(2) == '#' else -1 if r.group(2) == 'b' else 0)
        if root < 40: root += 12          # entre mi2 y re#3: audible también en altavoces pequeños
        k, p = 0, start
        while p < end:
            d = min(4, end - p); bass.append((root + (7 if k % 2 else 0), d)); p += d; k += 1
        pos = end

    tracks = [{'wave': 'square', 'vol': 0.08, 'notes': encode(mel)}]
    if bass: tracks.append({'wave': 'triangle', 'vol': 0.17, 'notes': encode(bass)})
    if any(m is not None for m, _ in low): tracks.append({'wave': 'square', 'vol': 0.045, 'notes': encode(low)})
    return {'bpm': bpm, 'div': 4, 'tracks': tracks}, dict(bpm=bpm, pasos=t, compases=t / 16, voces=len(tracks), notas=len(mel))
