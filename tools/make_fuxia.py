"""Prepara las canciones de la prueba de oído de Fuxia.

Uso (desde la raíz del proyecto):  python tools/make_fuxia.py

Lee "Material Insipiración/Prueba Fuxia/<Artista> - <Canción>.mp3", copia cada fragmento a assets/fuxia/NN.mp3
(con nombre numérico, para que el nombre del fichero no delate la respuesta) y escribe js/fuxia-songs.js con
el artista y el título de cada una.
"""
import glob
import json
import os
import re
import subprocess

SRC = 'Material Insipiración/Prueba Fuxia'
# Todas las canciones al mismo volumen medio (dB), con un limitador para que las de picos altos no saturen
TARGET_MEAN = -17.0  # medido en el mp3 final


def mean_volume(args):
    out = subprocess.run(['ffmpeg', '-v', 'info', *args, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    return float(re.search(r'mean_volume: (-?[\d.]+) dB', out).group(1))
# Canciones que vienen enteras: de dónde a dónde se corta el fragmento (segundo de inicio, duración). El resto ya
# vienen recortadas a mano.
CUTS = {
    # (Don't Go Yet ya viene recortada a mano: el «Don't go yet» de la entrada del estribillo)
}


def main():
    os.makedirs('assets/fuxia', exist_ok=True)
    for old in glob.glob('assets/fuxia/*.mp3'):
        os.remove(old)
    songs = []
    for i, path in enumerate(sorted(glob.glob(SRC + '/*.mp3'), key=str.lower), 1):
        name = os.path.splitext(os.path.basename(path))[0]
        artist, _, title = name.partition(' - ')
        sid = f'{i:02d}'
        cut = ['-ss', str(CUTS[name][0]), '-t', str(CUTS[name][1])] if name in CUTS else []
        out = f'assets/fuxia/{sid}.mp3'
        gain = TARGET_MEAN - mean_volume([*cut, '-i', path, '-vn'])
        for _ in range(3):  # el limitador come algo de volumen: se corrige midiendo el resultado
            af = f'volume={gain:.1f}dB,alimiter=limit=0.89:level=disabled'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', *cut, '-i', path, '-vn', '-af', af, '-ac', '2', '-b:a', '128k', out], check=True)
            err = TARGET_MEAN - mean_volume(['-i', out])
            if abs(err) < 0.5: break
            gain += err
        songs.append({'id': sid, 'artist': artist.strip(), 'title': title.strip()})
    with open('js/fuxia-songs.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write('// GENERADO por tools/make_fuxia.py a partir de los nombres de fichero. No editar a mano.\n')
        f.write('export const FUXIA_SONGS = ' + json.dumps(songs, ensure_ascii=False, indent=1) + ';\n')
    print(len(songs), 'canciones')


if __name__ == '__main__':
    main()
