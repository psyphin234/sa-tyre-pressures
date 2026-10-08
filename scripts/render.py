import sys, pdfplumber
# Render page crops to PNG so table values can be checked by eye.
path, out = sys.argv[1], sys.argv[2]
specs = sys.argv[3:]  # page:top:bottom:name
with pdfplumber.open(path) as pdf:
    for s in specs:
        pn, top, bottom, name = s.split(":")
        p = pdf.pages[int(pn) - 1]
        crop = p.crop((0, float(top), p.width, float(bottom)))
        crop.to_image(resolution=150).save(f"{out}/{name}.png")
        print("saved", name)
