import sys
from PIL import Image
# App icons from the PsyPhin emblem (shield, tyre, radio; no lettering) on the
# site's background colour. "any" icons fill most of the square; the maskable
# one keeps the emblem inside Android's safe zone (the central 80% circle).
src = sys.argv[1]
BG = (2, 2, 3)  # --bg in css/style.css and the manifest
logo = Image.open(src).convert("RGB")
emblem = logo.crop((345, 22, 1072, 606))  # checked by eye against the 1408x768 logo


def icon(size, fill):
    canvas = Image.new("RGB", (size, size), BG)
    e = emblem.copy()
    scale = fill * size / max(e.size)
    e = e.resize((round(e.width * scale), round(e.height * scale)), Image.LANCZOS)
    canvas.paste(e, ((size - e.width) // 2, (size - e.height) // 2))
    return canvas


icon(192, 0.92).save("icon-192.png", optimize=True)
icon(512, 0.92).save("icon-512.png", optimize=True)
icon(512, 0.70).save("icon-maskable-512.png", optimize=True)
icon(180, 0.84).save("apple-touch-icon.png", optimize=True)
print("ok")
