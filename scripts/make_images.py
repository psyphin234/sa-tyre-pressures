import sys, os, json, html
from PIL import Image, ImageOps
# Resize the chosen Commons photos into img/ and write js/images.js with
# their credits (author, licence, file page) and alt text.
src, proj = sys.argv[1], sys.argv[2]
meta = json.load(open(os.path.join(src, "meta.json"), encoding="utf-8"))
# The owner's own photos (in Pics/, not committed): they replace the Commons
# photo with the same key. Saved without EXIF, so no GPS or camera data is published.
OWN = {
  "hero": ("Pics/Cover.jpeg", "A Toyota Land Cruiser driving across wide white sand dunes under a blue sky", "Land Cruiser on the dunes."),
  "rock": ("Pics/rock.jpeg", "A white double-cab bakkie climbing a steep, rocky slope among aloes and bare trees", "Rocky climb, Brits, North West."),
  "corrugations": ("Pics/corrugations.jpeg", "A rutted, rippled sandy dirt track running between thorn trees", "Rough, rutted track, Alldays, Limpopo."),
  "riverbed": ("Pics/sand and river.png", "Aerial view of a convoy of 4x4s crossing a wide sandy riverbed with shallow channels of water", "A convoy crossing a sandy riverbed."),
  "snow": ("Pics/Snow Deep.jpeg", "A snow-covered mountain track with deep wheel ruts, between snowy peaks", "Deep snow on a mountain track."),
  "snowroad": ("Pics/Snow_Ice.jpeg", "An icy, partly snow-covered mountain road winding between snowy slopes", "Snow and ice on a mountain road."),
  "gravel": ("Pics/Gravel.jpg", "A long, straight gravel road through dry veld towards flat-topped hills", "Gravel road outside Carnarvon towards Prieska, Northern Cape."),
  "mud": ("Pics/mud.jpg", "A white Toyota Hilux with mud-caked tyres climbing a muddy red-earth track", "Hilux in the mud, Bass Lake, Free State."),
  "sand": ("Pics/DeepSand.jpg", "Two 4x4s on the crest of a red sand dune, with footprints in the sand and mountains behind", "Red dunes, Amam Dunes, Northern Cape."),
}

CHOSEN = [
  # key, source slug, alt text, caption, author link override
  ("hero", "driving-in-south-africa-banner-calvinia", "A gravel road running through Northern Cape veld towards flat-topped mountains near Calvinia", "Gravel road near Calvinia, Northern Cape.", None),
  ("tar", "driving-south-from-swakopmund-to-walvis-bay-sand-m", "A tar road between sand dunes and the sea south of Swakopmund, Namibia", "Tar road between Swakopmund and Walvis Bay, Namibia.", None),
  ("gravel", "karoo-gravel-road-panoramio", "A gravel road through red Karoo hills under a blue sky", "Karoo gravel road.", None),
  ("corrugations", "corrugations-washboarding-on-mckenzies-road-in-yat", "Close-up of regular ripples (corrugations) across a gravel road", "Corrugations (washboarding) on a gravel road, New South Wales.", None),
  ("sand", "4wd-dunes-bydem", "A white Toyota Land Cruiser among large sand dunes, with footprints in the foreground", "Land Cruiser in the dunes.", None),
  ("mud", "mud-track-at-venture-4x4-near-three-holes-panorami", "A muddy, rutted 4x4 track beside long grass", "Mud track at a 4x4 venue.", None),
  ("rock", "npld-2016-4x4-touring-31122752081", "An off-road buggy crawling over large boulders", "Rock crawling, BLM El Centro, California.", None),
  ("snow", "mitsubishi-shogun-suv-4x4-in-the-snow-cropped", "A silver Mitsubishi Shogun (Pajero) SUV standing in snow", "4x4 in snow.", None),
  ("snowroad", "snowy-road-sosonka-2013-g1", "A packed-snow road between snow-laden trees", "Snow-covered road near Sosonka, Ukraine.", None),
  ("markings", "tyremarkings", "A drawing of a tyre sidewall with its markings numbered", "Sidewall markings (drawn on a truck tyre).", None),
  ("gauge", "porsche-tire-pressure-gauge-9207945919", "A dial tyre pressure gauge reading in bar and psi", "A dial gauge reads in bar and psi.", None),
  ("compressor", "compressor-tire-pump-tyre-pump-edited-2020-4990679", "A small 12 V tyre compressor with a gauge and coiled air hose", "A portable 12 V compressor.", "https://www.mechanicalcaveman.com/"),
  ("beadlock", "beadlock1", "A wheel with a bolted beadlock ring clamping the tyre's outer bead", "A beadlock ring bolted over the outer bead.", None),
  ("riverbed", None, "", "", None),
  ("deflated", "deflated-car-tire", "A car tyre with almost no air, its sidewall bulging out at the bottom", "With too little air the sidewall bulges and flexes on every turn.", None),
]
TERRAIN_KEYS = {"tar", "gravel", "corrugations", "sand", "mud", "rock", "snow", "snowroad"}
os.makedirs(os.path.join(proj, "img"), exist_ok=True)
out = []
for key, slug, alt, caption, author_url in CHOSEN:
    own = OWN.get(key)
    if own:
        im = ImageOps.exif_transpose(Image.open(os.path.join(proj, own[0]))).convert("RGB")
        alt, caption = own[1], own[2]
        m = {"artist": "PsyPhin", "license": "Own photo", "licenseUrl": None, "page": None, "title": None}
    else:
        m = meta[slug]
        im = ImageOps.exif_transpose(Image.open(os.path.join(src, slug + ".jpg"))).convert("RGB")
    full = im.copy(); full.thumbnail((1600 if key == "hero" else 1000, 1000))
    fname = f"img/{key}.jpg"
    full.save(os.path.join(proj, fname), quality=78, optimize=True, progressive=True)
    tname = None
    if key in TERRAIN_KEYS:  # small crops for the terrain picker buttons
        thumb = ImageOps.fit(im, (320, 200), method=Image.LANCZOS)
        tname = f"img/{key}-thumb.jpg"
        thumb.save(os.path.join(proj, tname), quality=75, optimize=True)
    out.append({
        "key": key, "file": fname, "thumb": tname, "w": full.width, "h": full.height,
        "alt": alt, "caption": caption,
        "author": html.unescape(m["artist"]).strip(), "authorUrl": author_url, "own": bool(own),
        "license": m["license"], "licenseUrl": m["licenseUrl"] or None,
        "page": m["page"], "title": m["title"],
    })
    print(key, full.size, os.path.getsize(os.path.join(proj, fname)) // 1024, "KB")
# The deflating-tyre animation (made by scripts/make_anim.py from Pics/deflate.gif).
if os.path.exists(os.path.join(proj, "img", "deflate.webp")):
    out.append({
        "key": "deflate-anim", "file": "img/deflate.webp", "still": "img/deflate-still.jpg", "thumb": None, "w": 720, "h": 318,
        "alt": "Animation of a tyre on sand, side and front view, letting air out from 2.5 to 1.0 bar: the tyre flattens and its footprint grows longer and wider",
        "caption": "Illustration: as pressure drops the footprint grows. It goes down to 1.0 bar, below the 1.4 bar that tyre makers publish.",
        "author": "PsyPhin", "authorUrl": None, "own": True, "license": "Own animation", "licenseUrl": None, "page": None, "title": None,
    })
js = "/*\n * images.js: the photos, all from Wikimedia Commons under open licences, with\n * the credit each licence asks for. GENERATED by scripts/make_images.py.\n */\nwindow.TYRE_IMAGES = " + json.dumps(out, indent=2, ensure_ascii=False) + ";\n"
open(os.path.join(proj, "js", "images.js"), "w", encoding="utf-8", newline="\n").write(js)
