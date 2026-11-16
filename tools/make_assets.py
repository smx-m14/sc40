"""Genera las imágenes pixel art a partir de las fotos de "Material Insipiración".
Uso (desde la raíz del proyecto):  python tools/make_assets.py
Crea assets/album/*.png (Libro de los Miausis). Los regalos del gachapón se dibujan por código en js/art.js.
"""
import os
from PIL import Image, ImageOps, ImageEnhance

M = 'Material Insipiración/'

# (fichero, id, recorte opcional como fracciones l,t,r,b)
ALBUM = [
    ('Ibiza', '01-ibiza', None),
    ('Gran Canaria', '02-gran-canaria', None),
    ('Seychelles', '03-seychelles', (0.0, 0.0, 0.8, 1.0)),
    ('Malaga', '04-malaga', (0.0, 0.1, 1.0, 0.85)),
    ('Tailandia', '05-tailandia', (0.0, 0.3, 1.0, 1.0)),
    ('Turquía', '06-turquia', None),
    ('Kuala Lumpur', '07-kuala-lumpur', (0.0, 0.1, 1.0, 0.85)),
    ('Bako National Park', '08-bako', (0.1, 0.0, 0.9, 1.0)),
    ('Perhentian', '09-perhentian', None),
    ('Bali', '10-bali', (0.0, 0.3, 1.0, 1.0)),
    ('Egipto', '11-egipto', (0.0, 0.35, 1.0, 1.0)),
    ('China', '12-china', (0.0, 0.25, 1.0, 1.0)),
    ('Taiwan', '13-taiwan', (0.0, 0.25, 1.0, 1.0)),
    ('Córdoba', '14-cordoba', (0.0, 0.25, 1.0, 1.0)),
    ('Corea', '15-corea', (0.0, 0.25, 1.0, 1.0)),
]


def pixelate(im, w, h, colors):
    im = ImageOps.fit(im, (w * 4, h * 4), Image.LANCZOS)
    im = ImageEnhance.Color(im).enhance(1.35)
    im = ImageEnhance.Contrast(im).enhance(1.12)
    im = im.resize((w, h), Image.BOX)
    return im.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE)


def main():
    os.makedirs('assets/album', exist_ok=True)
    for name, out, crop in ALBUM:
        im = ImageOps.exif_transpose(Image.open(f'{M}Libro de los Miausis/{name}.jpg')).convert('RGB')
        if crop:
            W, H = im.size
            im = im.crop((int(crop[0] * W), int(crop[1] * H), int(crop[2] * W), int(crop[3] * H)))
        pixelate(im, 144, 108, 40).save(f'assets/album/{out}.png', optimize=True)
    print('ok')


if __name__ == '__main__':
    main()
