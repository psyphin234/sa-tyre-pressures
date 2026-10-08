import sys, re, json, pdfplumber
# Parse TRA LT / flotation tables from the Toyo guide: each record is
# SIZE, Single|Dual, then loads in ascending pressure order, with "(C) 112"
# style markers closing each load range. Words are read in reading order.
path, first, last, start_psi, step = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
want = sys.argv[6:]
toks = []
with pdfplumber.open(path) as pdf:
    for pn in range(first, last + 1):
        p = pdf.pages[pn - 1]
        words = p.extract_words(x_tolerance=1.5)
        words.sort(key=lambda w: (round(w["top"] / 3), w["x0"]))
        toks += [w["text"] for w in words]
recs, cur = [], None
for t in toks:
    if re.match(r"^(LT\d|\d\dx)", t):
        cur = {"size": t, "fit": None, "items": []}
        recs.append(cur)
    elif cur is None:
        continue
    elif t in ("Single", "Dual"):
        if cur["fit"] is None:
            cur["fit"] = t
        else:  # size printed once for two lines in some layouts
            cur = {"size": cur["size"], "fit": t, "items": []}
            recs.append(cur)
    elif re.match(r"^\d{3,4}$", t) or re.match(r"^\([A-F]\)$", t) or re.match(r"^\d{2,3}$", t):
        cur["items"].append(t)
out = []
for r in recs:
    if want and r["size"] not in want:
        continue
    loads, ranges, psi = [], [], start_psi
    it = r["items"]; i = 0
    while i < len(it):
        t = it[i]
        if t.startswith("("):
            li = it[i + 1] if i + 1 < len(it) else None
            ranges.append({"range": t[1], "maxPsi": psi - step, "li": li})
            i += 2; continue
        loads.append([psi, int(t)]); psi += step; i += 1
    out.append({"size": r["size"], "fit": r["fit"], "loads": loads, "ranges": ranges, "raw": " ".join(it)})
print(json.dumps(out, indent=0))
