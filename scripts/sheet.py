import sys, os, glob
from PIL import Image, ImageDraw
# Contact sheet: thumbnails with their file names, 4 per row.
src, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(os.path.join(src, "*.jpg")))
tw, th, cols = 300, 200, 4
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * (th + 18)), "white")
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB"); im.thumbnail((tw, th))
    x, y = (i % cols) * tw, (i // cols) * (th + 18)
    sheet.paste(im, (x, y))
    d.text((x + 2, y + th + 2), str(i) + " " + os.path.basename(f)[:40], fill="black")
sheet.save(out, quality=80)
print(len(files))
