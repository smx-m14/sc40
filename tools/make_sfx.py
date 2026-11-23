"""Prepara los efectos grabados con el móvil (monos, Patito y awawas) para el juego.

Uso (desde la raíz del proyecto):  python tools/make_sfx.py      (necesita ffmpeg)

Lee "Material Insipiración/Sonidos/*.mp3" y escribe assets/audio/sfx_*.mp3:
  - quita el zumbido de fondo del móvil (filtro de paso alto + reducción de ruido) y los silencios de los extremos;
  - les da un toque «8 bits» para que casen con la música chiptune: menos agudos, frecuencia de muestreo baja y un
    poco de reducción de bits (mezclada con el original, para que se sigan reconociendo);
  - los deja todos al mismo volumen medio, con un limitador para que no saturen.
El «cuac» son ocho graznidos seguidos: se guarda entero (para el susto) y tres graznidos sueltos (para cuando
Patito se gira, que así no se pisan con el siguiente giro). Los awawas son cuatro «awawa» seguidos: se cortan sueltos.
"""
import os
import re
import subprocess

SRC = 'Material Insipiración/Sonidos'
OUT = 'assets/audio'
TARGET = -18.0  # volumen medio (dB) del resultado
CLEAN = 'highpass=f=220,afftdn=nr=20:nf=-32,lowpass=f=5200'
CHIP = 'aresample=16000,acrusher=bits=7:mode=lin:aa=1:mix=0.45,aresample=44100'
TRIM = 'silenceremove=start_periods=1:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_threshold=-40dB,areverse'

# (fichero de salida, origen, recorte opcional en segundos)
JOBS = [
    ('sfx_mono1', 'Mono1', None),           # cuando Colgadín les quita a Tigrito
    ('sfx_mono2', 'Mono2', None),           # cada vez que los monos se pasan a Tigrito
    ('sfx_cuac', 'cuac', (0.22, 2.36)),     # el susto: la ristra de graznidos
    ('sfx_cuac1', 'cuac', (0.24, 0.47)),    # graznidos sueltos: Patito se gira
    ('sfx_cuac2', 'cuac', (0.85, 1.10)),
    ('sfx_cuac3', 'cuac', (1.49, 1.73)),
    ('sfx_awawa1', 'awawa_01', (0.00, 0.77)),   # cuatro «awawa» sueltos (Kapadokya): cosquillas y protestas
    ('sfx_awawa2', 'awawa_01', (0.87, 1.67)),
    ('sfx_awawa3', 'awawa_01', (1.74, 2.58)),
    ('sfx_awawa4', 'awawa_01', (2.68, 3.12)),
]


def mean_volume(args):
    out = subprocess.run(['ffmpeg', '-v', 'info', *args, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    return float(re.search(r'mean_volume: (-?[\d.]+) dB', out).group(1))


def main():
    for out, src, cut in JOBS:
        path = f'{SRC}/{src}.mp3'
        dst = f'{OUT}/{out}.mp3'
        pre = ['-ss', str(cut[0]), '-t', str(round(cut[1] - cut[0], 3))] if cut else []
        chain = f'{CLEAN},{TRIM},{CHIP}' if not cut else f'{CLEAN},{CHIP}'
        gain = 0.0
        for _ in range(3):  # se ajusta el volumen midiendo el resultado
            af = f'{chain},volume={gain:.1f}dB,alimiter=limit=0.89:level=disabled'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', *pre, '-i', path, '-vn', '-ac', '1', '-af', af, '-b:a', '96k', dst], check=True)
            err = TARGET - mean_volume(['-i', dst])
            if abs(err) < 0.6: break
            gain += err
        v = mean_volume(['-i', dst])
        assert v > -40, f'{out} ha salido en silencio ({v} dB)'
        print(out, f'{v:.1f} dB')


if __name__ == '__main__':
    main()
