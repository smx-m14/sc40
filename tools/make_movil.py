"""Fondo de pantalla del móvil de Cait (escena tras la fiesta, js/scenes/movil.js).

Mootoo.png («Material Insipiración/Móvil») → assets/movil/fondo.png: pixel art de 90×160 con 24 colores.
Los vídeos de TikTok ya no se convierten: están recreados en pixel art, a mano, en js/movil-clips.js.

Uso: python tools/make_movil.py
"""
import os
from PIL import Image

SRC = 'Material Insipiración/Móvil/'
OUT = 'assets/movil/'
W, H = 90, 160


def main():
    os.makedirs(OUT, exist_ok=True)
    im = Image.open(SRC + 'Mootoo.png').convert('RGB')
    w, h = im.size
    if w / h > W / H:  # recorta los lados para quedarse en 9:16
        nw = round(h * W / H); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w * H / W); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    im.resize((W, H), Image.LANCZOS).quantize(24, dither=Image.Dither.NONE).convert('RGB').save(OUT + 'fondo.png')
    print('ok')


if __name__ == '__main__':
    main()
