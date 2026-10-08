import sys, json, pdfplumber
# Parse the ETRTO load tables in the Toyo guide (load index rows x psi columns).
# Cells may wrap: trailing digits sit on a second line just below. Load-index
# labels may also sit on their own line, so they are matched to the nearest row.
path, first, last = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
result = {}
for_page_footer = 750
with pdfplumber.open(path) as pdf:
    for pn in range(first, last + 1):
        p = pdf.pages[pn - 1]
        words = [w for w in p.extract_words(x_tolerance=1.0) if w["top"] < for_page_footer]
        hdr_top = min(w["top"] for w in words if w["text"] == "22" and w["x0"] > 40)
        cols = sorted([w for w in words if abs(w["top"] - hdr_top) < 2 and w["text"].isdigit()], key=lambda w: w["x0"])
        psis = [int(w["text"]) for w in cols]
        xs = [w["x0"] for w in cols]
        label_x = xs[0] - 12
        body = [w for w in words if w["top"] > hdr_top + 5 and w["text"].isdigit()]
        labels = [w for w in body if w["x0"] < label_x]
        vals = [w for w in body if w["x0"] >= label_x]
        lines = {}
        for w in vals:
            lines.setdefault(round(w["top"]), []).append(w)
        tops = sorted(lines)
        rows, i = [], 0
        while i < len(tops):
            t = tops[i]
            cells = {}
            def add(ws):
                for w in ws:
                    k = min(range(len(xs)), key=lambda q: abs(xs[q] - w["x0"]))
                    cells[k] = cells.get(k, "") + w["text"]
            add(lines[t])
            j = i + 1
            while j < len(tops) and tops[j] - t < 9 and all(len(w["text"]) <= 1 for w in lines[tops[j]]):
                add(lines[tops[j]]); j += 1
            rows.append((t, cells)); i = j
        # labels: merge wrapped label digits (e.g. "10" + "6" -> 106)
        lab_lines = {}
        for w in sorted(labels, key=lambda w: w["top"]):
            lab_lines.setdefault(round(w["top"]), []).append(w)
        lt = sorted(lab_lines); labs = []; i = 0
        while i < len(lt):
            txt = "".join(w["text"] for w in lab_lines[lt[i]]); top = lt[i]; j = i + 1
            if len(txt) == 2 and j < len(lt) and lt[j] - lt[i] < 9 and len("".join(w["text"] for w in lab_lines[lt[j]])) == 1:
                txt += "".join(w["text"] for w in lab_lines[lt[j]]); j += 1
            labs.append((top, int(txt))); i = j
        for t, cells in rows:
            if len(cells) != len(psis):
                print("SKIP p%d top %d cells %d" % (pn, t, len(cells)), file=sys.stderr); continue
            top, li = min(labs, key=lambda l: abs(l[0] - t))
            if abs(top - t) > 9:
                print("NOLABEL p%d top %d" % (pn, t), file=sys.stderr); continue
            result[li] = [int(cells[k]) for k in range(len(psis))]
        result["_psi"] = psis
print(json.dumps(result))
