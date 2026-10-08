import sys, json, urllib.request, urllib.parse, urllib.error, re, time, os
# Download Commons files as 1200px-wide JPEG thumbnails plus licence metadata.
UA = {"User-Agent": "PsyPhinTyreResearch/0.1 (https://psyphin.co.za) python-urllib"}
out = sys.argv[1]; titles = sys.argv[2:]
def get(url):
    for attempt in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(30 * (attempt + 1))
meta = {}
mf = os.path.join(out, "meta.json")
if os.path.exists(mf): meta = json.load(open(mf, encoding="utf-8"))
for t in titles:
    time.sleep(8)
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({"action": "query", "titles": "File:" + t, "prop": "imageinfo", "iiprop": "url|extmetadata|size", "iiurlwidth": 1200, "format": "json"})
    d = json.loads(get(url))
    p = list(d["query"]["pages"].values())[0]
    if "imageinfo" not in p: print("MISSING", t); continue
    ii = p["imageinfo"][0]; m = ii["extmetadata"]
    clean = lambda k: re.sub(r"<[^>]+>", "", m.get(k, {}).get("value", "")).strip()
    slug = re.sub(r"[^a-z0-9]+", "-", t.lower().rsplit(".", 1)[0])[:50].strip("-")
    time.sleep(5)
    data = get(ii["thumburl"])
    open(os.path.join(out, slug + ".jpg"), "wb").write(data)
    meta[slug] = {"title": t, "page": ii["descriptionurl"], "license": clean("LicenseShortName"), "licenseUrl": clean("LicenseUrl"), "artist": clean("Artist"), "credit": clean("Credit")[:200], "attributionRequired": clean("AttributionRequired"), "desc": clean("ImageDescription")[:200], "w": ii["width"], "h": ii["height"]}
    print("ok", slug, meta[slug]["license"], flush=True)
    json.dump(meta, open(mf, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
