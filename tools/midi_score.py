"""Convierte un fichero MIDI al formato del sintetizador del juego (conversión exacta, sin transcribir audio).

Los MIDI van en music/<id>.mid (id = el de la canción en el juego: isla, lolete, templo…).
tools/make_music.py los usa en lugar del mp3 cuando existen.

Salen hasta tres voces monofónicas, repartiendo las notas por registro en cada instante:
melodía (la más aguda que suena), bajo (la más grave) y, si queda algo en medio, una voz central.
"""
import struct

NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def read_midi(path):
    """Devuelve (ticks por negra, bpm, [(inicio, fin, nota, pista, canal)]) con los tiempos en ticks."""
    d = open(path, 'rb').read()
    assert d[:4] == b'MThd', 'no es un fichero MIDI'
    _, ntr, div = struct.unpack('>HHH', d[8:14])
    pos, notes, tempo = 14, [], None
    for tr in range(ntr):
        assert d[pos:pos + 4] == b'MTrk'
        end = pos + 8 + struct.unpack('>I', d[pos + 4:pos + 8])[0]
        pos += 8
        t, status, on = 0, 0, {}
        while pos < end:
            v = 0
            while True:  # tiempo delta de longitud variable
                b = d[pos]; pos += 1; v = (v << 7) | (b & 0x7F)
                if b < 0x80: break
            t += v
            b = d[pos]
            if b == 0xFF:  # meta
                typ = d[pos + 1]; pos += 2
                ln = 0
                while True:
                    c = d[pos]; pos += 1; ln = (ln << 7) | (c & 0x7F)
                    if c < 0x80: break
                if typ == 0x51 and tempo is None: tempo = int.from_bytes(d[pos:pos + 3], 'big')
                pos += ln
                continue
            if b in (0xF0, 0xF7):  # sysex
                pos += 1; ln = 0
                while True:
                    c = d[pos]; pos += 1; ln = (ln << 7) | (c & 0x7F)
                    if c < 0x80: break
                pos += ln
                continue
            if b & 0x80: status = b; pos += 1
            kind, ch = status & 0xF0, status & 0x0F
            if kind in (0x80, 0x90):
                n, vel = d[pos], d[pos + 1]; pos += 2
                if kind == 0x90 and vel > 0: on.setdefault((ch, n), []).append(t)
                elif on.get((ch, n)): notes.append((on[(ch, n)].pop(0), t, n, tr, ch))
            elif kind in (0xC0, 0xD0): pos += 1
            else: pos += 2
        pos = end
    return div, 60e6 / (tempo or 500000), sorted(notes)


def name(m):
    return f'{NAMES[m % 12]}{m // 12 - 1}'


def encode(grid):
    """grid: nota (o None) por paso → 'NOTA:pasos …'. Un cambio de nota o un nuevo ataque corta la anterior."""
    out = []
    for m, attack in grid:
        if out and out[-1][0] == m and not (attack and m is not None): out[-1][1] += 1
        else: out.append([m, 1])
    return ' '.join(f"{'-' if m is None else name(m)}:{d}" for m, d in out)


def voices_at(notes, total, q):
    """Notas que suenan y que atacan en cada paso."""
    sounding = [[] for _ in range(total)]
    starts = [set() for _ in range(total)]
    for a, b, n, *_ in notes:
        sa, sb = q(a), max(q(a) + 1, q(b))
        if sa >= total: continue
        starts[sa].add(n)
        for s in range(sa, min(sb, total)): sounding[s].append(n)
    return [sorted(set(x)) for x in sounding], starts


def chord_root(pcs):
    """Fundamental (0-11) de un acorde dado por sus clases de nota, o None."""
    pcs = set(pcs)
    for r in sorted(pcs):  # triada disminuida (r, r+3, r+6) = séptima de dominante sin fundamental: la fundamental está 4 por debajo
        if (r + 3) % 12 in pcs and (r + 6) % 12 in pcs and (r + 7) % 12 not in pcs: return (r - 4) % 12
    for r in sorted(pcs):  # triada mayor o menor
        if (r + 7) % 12 in pcs and ((r + 4) % 12 in pcs or (r + 3) % 12 in pcs): return r
    for r in sorted(pcs):  # sin quinta
        if (r + 4) % 12 in pcs or (r + 3) % 12 in pcs: return r
    return min(pcs) if pcs else None


def bass_from(chord_sounding, total):
    """Bajo inventado a partir de los acordes, para arreglos que no tienen: «chum-pa» en negras,
    fundamental en los tiempos 1 y 3 y quinta en el 2 y el 4 (cada nota dura una corchea)."""
    out = []
    for s in range(total):
        beat = s - s % 4
        pcs = {n % 12 for k in range(beat, min(beat + 4, total)) for n in chord_sounding[k]}
        r = chord_root(pcs)
        if r is None or s % 4 >= 2:
            out.append((None, False)); continue
        root = 40 + (r - 4) % 12                       # entre mi2 y re#3
        fifth = root + 7 if root + 7 <= 52 else root - 5
        out.append((root if (s // 4) % 2 == 0 else fifth, s % 4 == 0))
    return out


def midi_to_song(path, max_beats=None, drums_channel=9, roles=None, melody_shift=0, start_beat=None, bass_from_chords=False, bpm=None, vol=1.0, chord_shift=0, by_channel=False, beat=1, shift_all=False, carry=False, sub=4):
    """roles (opcional, para arreglos con varias pistas): dict con listas de nº de pista
         melody: pistas de melodía por orden de prioridad (si la primera calla, suena la siguiente)
         bass:   pistas del bajo
         chords: pistas de acordes; se tocan arpegiados, una nota por semicorchea
       Sin roles se reparte como un piano: pista aguda = melodía, pista grave = bajo.
       melody_shift: semitonos que se sube o baja la melodía (p. ej. -12 si queda demasiado aguda). Solo la pista principal,
             salvo con shift_all=True (todas las de melodía).
       bass_from_chords: el arreglo no tiene bajo; se inventa uno a partir de las pistas de acordes (ver bass_from).
       bpm: tempo al que se tocará (por defecto, el del MIDI). vol: escala el volumen de todas las voces.
       chord_shift: semitonos que se suben o bajan los acordes (p. ej. 12 si van tan graves que se pisan con el bajo).
       by_channel: los números de roles son canales MIDI, no pistas (para MIDI de formato 0, todo en una pista).
       beat: negras del MIDI que forman un pulso real (2 si el MIDI está escrito a doble tempo). bpm y la salida
             se dan en pulsos reales, que es lo que usa un minijuego de ritmo.
       carry: si el bucle empieza a mitad de compás, las notas que ya estaban sonando (p. ej. un acorde largo de la mano
             izquierda) se conservan desde el inicio del bucle en vez de descartarse; así la vuelta no deja un hueco.
       sub: pasos por negra (4 = semicorcheas). 12 para canciones con tresillos, que en semicorcheas salen cojos; los
             arpegios de los acordes siguen yendo a semicorcheas."""
    div, midi_bpm, notes = read_midi(path)
    bpm = bpm or midi_bpm / beat
    if by_channel: notes = [(a, b, n, ch, ch) for a, b, n, _, ch in notes]
    notes = [n for n in notes if n[4] != drums_channel]
    if start_beat and carry:  # las notas que suenan al empezar se recortan al inicio del bucle
        s0 = start_beat * div
        notes = [(max(a, s0), b, *r) for a, b, *r in notes if b > s0 + div / 8]
    elif start_beat:  # se salta la introducción: empieza en esa negra del fichero
        notes = [n for n in notes if n[0] >= start_beat * div - 1]
    step = div / sub                                 # semicorcheas (o la rejilla que se pida)
    t0 = start_beat * div if start_beat else min(n[0] for n in notes)
    q = lambda t: int(round((t - t0) / step))
    total = max(q(n[1]) for n in notes)
    if max_beats: total = min(total, max_beats * sub)
    total += (-total) % (4 * sub)                    # cierra el último compás
    ids = sorted({n[3] for n in notes}, key=lambda t: -sum(n[2] for n in notes if n[3] == t) / sum(1 for n in notes if n[3] == t))
    hi, lo, mid = [], [], []

    if roles:
        of = lambda tr: voices_at([n for n in notes if n[3] == tr], total, q)
        mel = [of(t) for t in roles.get('melody', [])]
        bas = voices_at([n for n in notes if n[3] in roles.get('bass', [])], total, q)
        cho = voices_at([n for n in notes if n[3] in roles.get('chords', [])], total, q)
        for s in range(total):
            top, att = None, False
            for k, (snd, sta) in enumerate(mel):
                if snd[s]: top, att = snd[s][-1] + (melody_shift if k == 0 or shift_all else 0), snd[s][-1] in sta[s]; break   # se transporta la pista principal (o todas)
            hi.append((top, att))
            b = bas[0][s][0] if bas[0][s] else None
            lo.append((b + 12 if b is not None and b < 40 else b, b in bas[1][s]))
            c = cho[0][s]
            k = max(1, sub // 4)                                              # arpegio a semicorcheas, sea cual sea la rejilla
            mid.append((c[(s // k) % len(c)] + chord_shift if c else None, s % k == 0))   # arpegio: cada semicorchea, la siguiente nota del acorde
        if bass_from_chords: lo = bass_from(cho[0], total)
    else:
        # Dos o más pistas: la más aguda lleva la melodía y el resto el bajo (mano derecha / mano izquierda)
        if len(ids) >= 2:
            up = [n for n in notes if n[3] == ids[0]]
            down = [n for n in notes if n[3] != ids[0]]
        else:  # una sola pista: la nota más aguda que suena es la melodía y la más grave, si hay varias, el bajo
            up = down = notes
        su, au = voices_at(up, total, q)
        sd, ad = voices_at(down, total, q)
        for s in range(total):
            top = su[s][-1] if su[s] else None
            bot = sd[s][0] if sd[s] else None
            m = su[s][-2] if len(su[s]) > 1 else None          # voz central: segunda nota de la mano derecha
            if up is down:                                     # una sola pista: no repetir la misma nota en dos voces
                bot = bot if len(sd[s]) > 1 else None
                m = m if len(su[s]) > 2 else None
            hi.append((top + melody_shift if top is not None else None, top in au[s]))
            lo.append((bot + 12 if bot is not None and bot < 40 else bot, bot in ad[s]))   # por debajo de mi2 no se oye en altavoces pequeños
            mid.append((m, m in au[s]))

    v = lambda x: round(x * vol, 3)
    tracks = [{'wave': 'square', 'vol': v(0.08), 'notes': encode(hi)}]
    if any(m is not None for m, _ in lo): tracks.append({'wave': 'triangle', 'vol': v(0.17), 'notes': encode(lo)})
    if any(m is not None for m, _ in mid): tracks.append({'wave': 'square', 'vol': v(0.03 if roles else 0.04), 'notes': encode(mid)})
    info = dict(bpm=round(bpm, 1), pasos=total, compases=total / (4 * sub), segundos=round(total * 60 / bpm / sub / beat, 1), voces=len(tracks), notas=len(notes),
                registro=f'{name(min(n[2] for n in notes))}-{name(max(n[2] for n in notes))}', pistas=len(ids))
    return {'bpm': round(bpm, 1), 'div': sub * beat, 'tracks': tracks}, info
