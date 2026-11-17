"""Prepara las canciones de la prueba de oído de Fuxia.

Uso (desde la raíz del proyecto):  python tools/make_fuxia.py

Lee "Material Insipiración/Prueba Fuxia/<Artista> - <Canción>.mp3", copia cada fragmento a assets/fuxia/NN.mp3
(con nombre numérico, para que el nombre del fichero no delate la respuesta) y escribe js/fuxia-songs.js con
el artista y el título de cada una.
"""
import glob
import json
import os
import subprocess

SRC = 'Material Insipiración/Prueba Fuxia'


def main():
    os.makedirs('assets/fuxia', exist_ok=True)
    for old in glob.glob('assets/fuxia/*.mp3'):
        os.remove(old)
    songs = []
    for i, path in enumerate(sorted(glob.glob(SRC + '/*.mp3'), key=str.lower), 1):
        name = os.path.splitext(os.path.basename(path))[0]
        artist, _, title = name.partition(' - ')
        sid = f'{i:02d}'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-vn', '-ac', '2', '-b:a', '128k', f'assets/fuxia/{sid}.mp3'], check=True)
        songs.append({'id': sid, 'artist': artist.strip(), 'title': title.strip()})
    with open('js/fuxia-songs.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write('// GENERADO por tools/make_fuxia.py a partir de los nombres de fichero. No editar a mano.\n')
        f.write('export const FUXIA_SONGS = ' + json.dumps(songs, ensure_ascii=False, indent=1) + ';\n')
    print(len(songs), 'canciones')


if __name__ == '__main__':
    main()
