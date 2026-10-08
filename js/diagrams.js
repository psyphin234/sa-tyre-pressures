/*
 * diagrams.js: SVG diagrams. Colours come from CSS classes (style.css), so
 * every diagram follows the light/dark theme. Text goes in via textContent.
 * Static explainer diagrams draw the physics in the cited rules; the pressure
 * ladder and footprint are drawn from the user's own numbers.
 */
(function (root) {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";

  function s(tag, attrs, ...children) {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v);
    });
    children.flat(Infinity).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  function svg(w, h, label, ...children) {
    return s("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": label, class: "diagram-svg" }, s("title", null, label), children);
  }
  const text = (x, y, str, cls, extra) => s("text", { x, y, class: cls || "d-text", ...(extra || {}) }, str);

  // ------------------------------------------------------------ pressure ladder
  /*
   * One vertical bar for one axle showing where the planned pressure sits.
   * a: { name, roadKpa, floorKpa, tableMinKpa, planKpa, status, range }
   * opts: { fmt, bfgKpa, maxKpa } (maxKpa keeps both axles on one scale).
   * The legend is HTML (app.js), so it stays readable on a phone.
   */
  function ladder(a, opts) {
    const W = 300;
    const H = 300;
    const top = 14;
    const bottom = H - 34;
    const maxKpa = opts.maxKpa;
    const minKpa = 50;
    const y = (kpa) => bottom - ((Math.max(minKpa, Math.min(maxKpa, kpa)) - minKpa) / (maxKpa - minKpa)) * (bottom - top);
    const nodes = [];
    for (let k = 100; k <= maxKpa; k += 50) {
      nodes.push(s("line", { x1: 52, x2: W - 6, y1: y(k), y2: y(k), class: k % 100 === 0 ? "d-grid" : "d-grid d-grid--minor" }));
      if (k % 100 === 0) nodes.push(text(46, y(k) + 4, opts.fmt(k), "d-axis", { "text-anchor": "end" }));
    }
    if (opts.bfgKpa) nodes.push(s("line", { x1: 52, x2: W - 6, y1: y(opts.bfgKpa), y2: y(opts.bfgKpa), class: "d-line-fail" }));
    const bx = 120;
    const bw = 36;
    const zone = (fromKpa, toKpa, cls) => {
      if (fromKpa == null || toKpa == null || toKpa <= fromKpa) return null;
      return s("rect", { x: bx, width: bw, y: y(toKpa), height: Math.max(0, y(fromKpa) - y(toKpa)), class: cls });
    };
    nodes.push(zone(minKpa, a.tableMinKpa, "z-nodata"));
    if (a.status === "ok") nodes.push(zone(a.tableMinKpa, a.floorKpa, "z-belowload"));
    nodes.push(zone(a.floorKpa, a.roadKpa, "z-loadok"));
    nodes.push(zone(a.roadKpa, maxKpa, "z-road"));
    nodes.push(s("rect", { x: bx, y: top, width: bw, height: bottom - top, class: "d-frame" }));
    if (a.range && a.range.bottomKpa < a.range.topKpa - 1) {
      nodes.push(s("path", { d: `M${bx + bw + 4} ${y(a.range.topKpa)} h7 V${y(a.range.bottomKpa)} h-7`, class: "d-bracket" }));
    }
    // markers, labels on the right; nudge a label down if two collide
    const used = [];
    const mark = (kpa, label, cls) => {
      if (kpa == null) return;
      let ly = y(kpa) + 4;
      used.forEach((other) => {
        if (Math.abs(other - ly) < 14) ly = other + 14;
      });
      used.push(ly);
      nodes.push(s("line", { x1: bx - 4, x2: bx + bw + 4, y1: y(kpa), y2: y(kpa), class: cls }));
      nodes.push(text(bx + bw + 16, ly, label, "d-small"));
    };
    mark(a.roadKpa, "road " + opts.fmt(a.roadKpa), "d-mark");
    if (a.floorKpa != null && Math.abs(a.floorKpa - a.roadKpa) > 6) mark(a.floorKpa, (a.status === "belowTable" ? "table starts " : "load needs ") + opts.fmt(a.floorKpa), "d-mark d-mark--floor");
    if (a.planKpa != null) {
      const py = y(a.planKpa);
      nodes.push(s("path", { d: `M${bx - 2} ${py} l-12 -8 v16 z`, class: "d-plan" }));
      nodes.push(text(bx - 16, py + 4, opts.fmt(a.planKpa), "d-small d-strong", { "text-anchor": "end" }));
    }
    nodes.push(text(bx + bw / 2, H - 10, a.name, "d-text d-strong", { "text-anchor": "middle" }));
    return svg(W, H, `${a.name} axle: where your planned pressure sits`, nodes);
  }

  // ------------------------------------------------------------ footprint
  /*
   * Footprint area ≈ load ÷ pressure (rule nhtsa-contact-patch), drawn for a
   * few pressures. Tread width is held constant and the length grows, which is
   * how a radial tyre's footprint mostly changes.
   */
  function footprint(wheelKg, pressuresKpa, opts) {
    const W = 520;
    const H = 230;
    const g = 9.81;
    const areas = pressuresKpa.map((p) => (wheelKg * g) / (p * 1000)); // m²
    const maxA = Math.max(...areas);
    const treadPx = 70;
    const maxLenPx = 150;
    const scale = maxLenPx / (maxA / 0.2); // 0.2 m nominal tread width for proportions
    const nodes = [];
    const step = W / pressuresKpa.length;
    pressuresKpa.forEach((p, i) => {
      const a = areas[i];
      const len = Math.max(20, (a / 0.2) * scale);
      const cx = step * i + step / 2;
      const cy = 105;
      nodes.push(s("rect", { x: cx - treadPx / 2, y: cy - len / 2, width: treadPx, height: len, rx: 18, class: "d-patch" }));
      for (let k = -2; k <= 2; k++) {
        nodes.push(s("line", { x1: cx + k * 13, x2: cx + k * 13, y1: cy - len / 2 + 8, y2: cy + len / 2 - 8, class: "d-tread" }));
      }
      nodes.push(text(cx, 200, opts.fmt(p), "d-text d-strong", { "text-anchor": "middle" }));
      nodes.push(text(cx, 218, "≈ " + Math.round(a * 10000) + " cm²", "d-small", { "text-anchor": "middle" }));
    });
    return svg(W, H, `Approximate footprint of one tyre carrying ${Math.round(wheelKg)} kg at different pressures`, nodes);
  }

  // ------------------------------------------------------------ deflection and heat
  function deflection() {
    const W = 520;
    const H = 240;
    /*
     * Side view: the dashed circle is the tyre unloaded; the solid shape is the
     * loaded tyre, flattened against the ground by `squash` (its deflection),
     * with the sidewall bulging out either side of the footprint.
     */
    const one = (cx, squash, label, sub) => {
      const r = 80;
      const ground = 196;
      const half = Math.sqrt(r * r - (r - squash) * (r - squash)); // half the footprint length
      const yFlat = ground;
      const yc = yFlat - (r - squash); // centre that puts the flattened circle on the ground
      const bulge = squash * 0.55;
      const shape =
        `M${cx - half} ${yFlat} ` +
        `C${cx - half - bulge} ${yFlat} ${cx - r - bulge * 0.6} ${yc + (r - squash) * 0.5} ${cx - r} ${yc} ` +
        `A ${r} ${r} 0 0 1 ${cx + r} ${yc} ` +
        `C${cx + r + bulge * 0.6} ${yc + (r - squash) * 0.5} ${cx + half + bulge} ${yFlat} ${cx + half} ${yFlat} Z`;
      return s(
        "g",
        null,
        s("circle", { cx, cy: yc, r, class: "d-ghost" }), // unloaded outline: dips below the ground by the deflection
        s("path", { d: shape, class: "d-tyre" }),
        s("circle", { cx, cy: yc, r: 46, class: "d-rim" }),
        s("circle", { cx, cy: yc, r: 8, class: "d-hub" }),
        squash > 10 ? s("ellipse", { cx: cx - half - bulge * 0.4, cy: yFlat - 16, rx: 9, ry: 15, class: "d-heat" }) : null,
        squash > 10 ? s("ellipse", { cx: cx + half + bulge * 0.4, cy: yFlat - 16, rx: 9, ry: 15, class: "d-heat" }) : null,
        s("line", { x1: cx - 125, x2: cx + 125, y1: ground, y2: ground, class: "d-ground" }),
        s("path", { d: `M${cx - half} ${ground + 8} V${ground + 14} H${cx + half} V${ground + 8}`, class: "d-bracket" }),
        text(cx, 232, label, "d-text d-strong", { "text-anchor": "middle" }),
        text(cx, 18, sub, "d-small", { "text-anchor": "middle" })
      );
    };
    return svg(
      W,
      H + 6,
      "A tyre at road pressure and aired down. Dashed: the tyre with no load. The aired-down tyre squashes further, so its footprint is longer and its sidewall bulges and flexes more, which makes more heat",
      one(130, 8, "Road pressure", "small deflection, short footprint"),
      one(390, 26, "Aired down", "more deflection: longer footprint, more heat")
    );
  }

  // ------------------------------------------------------------ bead and rim
  function bead() {
    const W = 520;
    const H = 250;
    // half cross-section of a drop-centre rim with a hump, and a tyre bead on the seat
    const rim =
      "M40 60 C40 40 58 34 70 40 L78 60 L80 120 L140 120 L150 112 L170 112 L178 120 L210 120 L222 160 L330 160 L342 120 L370 120 L378 112 L398 112 L408 120 L468 120 L470 60 L478 40 C490 34 508 40 508 60";
    return svg(
      W,
      H,
      "Cross-section of a drop-centre rim: the tyre bead sits on the bead seat, held in by the flange outside and the hump inside; if it is pushed past the hump it can drop into the well and the tyre comes off",
      s("path", { d: rim, class: "d-rimline" }),
      // beads on seats
      s("rect", { x: 82, y: 98, width: 40, height: 22, rx: 8, class: "d-bead" }),
      s("rect", { x: 426, y: 98, width: 40, height: 22, rx: 8, class: "d-bead" }),
      // sidewalls going up
      s("path", { d: "M90 98 C70 40 120 10 200 6", class: "d-sidewall" }),
      s("path", { d: "M458 98 C478 40 428 10 348 6", class: "d-sidewall" }),
      // sideways force arrow on the left bead
      s("path", { d: "M30 150 H120", class: "d-arrow" }),
      s("path", { d: "M120 150 l-10 -6 v12 z", class: "d-arrowhead" }),
      text(28, 172, "side force, low pressure", "d-small"),
      text(150, 105, "hump", "d-small d-strong"),
      text(276, 182, "well (drop centre)", "d-small", { "text-anchor": "middle" }),
      text(58, 30, "flange", "d-small"),
      text(102, 92, "bead", "d-small", { "text-anchor": "middle" }),
      text(276, 228, "The bead must climb the hump before it can slip into the well.", "d-small", { "text-anchor": "middle" })
    );
  }

  // ------------------------------------------------------------ hot vs cold
  function hotCold(coldKpa, rise, fmt) {
    const W = 520;
    const H = 170;
    const warm = coldKpa * (1 + rise);
    const gauge = (cx, kpa, label, cls) =>
      s(
        "g",
        null,
        s("circle", { cx, cy: 78, r: 54, class: "d-gauge" }),
        s("path", { d: `M${cx - 40} 104 A 48 48 0 1 1 ${cx + 40} 104`, class: "d-gauge-arc" }),
        s("line", { x1: cx, y1: 78, x2: cx + 38 * Math.cos(Math.PI * (1.15 - (kpa / (warm * 1.25)) * 1.3)), y2: 78 - 38 * Math.sin(Math.PI * (1.15 - (kpa / (warm * 1.25)) * 1.3)), class: "d-needle " + cls }),
        s("circle", { cx, cy: 78, r: 5, class: "d-hub" }),
        text(cx, 152, label + ": " + fmt(kpa), "d-text d-strong", { "text-anchor": "middle" })
      );
    return svg(
      W,
      H,
      `Cold ${fmt(coldKpa)} can read about ${fmt(warm)} warm. That is normal; don't let air out of warm tyres.`,
      gauge(130, coldKpa, "Cold", "d-needle--cold"),
      s("path", { d: "M215 78 H295", class: "d-arrow" }),
      s("path", { d: "M295 78 l-10 -6 v12 z", class: "d-arrowhead" }),
      text(255, 66, "+" + Math.round(rise * 100) + "% or more", "d-small", { "text-anchor": "middle" }),
      gauge(390, warm, "Warm", "d-needle--warm")
    );
  }

  // ------------------------------------------------------------ CTIS staircase
  function ctis(modes) {
    const W = 520;
    const H = 230;
    const maxPsi = Math.max(...modes.map((m) => m.psi));
    const maxKmh = Math.max(...modes.map((m) => m.kmh));
    const bw = 80;
    const nodes = [];
    modes.forEach((m, i) => {
      const x = 40 + i * 120;
      const h = (m.psi / maxPsi) * 130;
      nodes.push(s("rect", { x, y: 170 - h, width: bw / 2 - 4, height: h, class: "d-bar-pressure" }));
      const h2 = (m.kmh / maxKmh) * 130;
      nodes.push(s("rect", { x: x + bw / 2, y: 170 - h2, width: bw / 2 - 4, height: h2, class: "d-bar-speed" }));
      nodes.push(text(x + bw / 2 - 2, 190, m.mode, "d-small d-strong", { "text-anchor": "middle" }));
      nodes.push(text(x + bw / 2 - 2, 206, m.psi + " psi · " + m.kmh + " km/h", "d-small", { "text-anchor": "middle" }));
    });
    nodes.push(s("line", { x1: 30, x2: W - 20, y1: 170, y2: 170, class: "d-ground" }));
    nodes.push(s("rect", { x: 330, y: 10, width: 10, height: 10, class: "d-bar-pressure" }), text(346, 19, "pressure", "d-small"));
    nodes.push(s("rect", { x: 420, y: 10, width: 10, height: 10, class: "d-bar-speed" }), text(436, 19, "top speed", "d-small"));
    return svg(W, H, "US Army FMTV central tyre inflation modes: each lower pressure comes with a lower top speed", nodes);
  }

  // ------------------------------------------------------------ sidewall markings
  function markings() {
    const W = 520;
    const H = 200;
    const parts = [
      { t: "LT", x: 40, note: "light truck: TRA LT table" },
      { t: "265", x: 92, note: "width, mm" },
      { t: "/75", x: 152, note: "height, % of width" },
      { t: "R16", x: 218, note: "radial, 16 in rim" },
      { t: "123/120", x: 300, note: "load index single/dual" },
      { t: "Q", x: 398, note: "speed symbol" },
    ];
    const nodes = [s("path", { d: "M20 120 Q260 40 500 120", class: "d-sidewall-arc" })];
    parts.forEach((p, i) => {
      nodes.push(text(p.x, 92 - (i === 0 || i === 5 ? 0 : 6), p.t, "d-mark-text"));
      nodes.push(s("line", { x1: p.x + 12, x2: p.x + 12, y1: 100, y2: 140 + (i % 2) * 22, class: "d-leader" }));
      nodes.push(text(p.x, 154 + (i % 2) * 22, p.note, "d-small"));
    });
    nodes.push(text(20, 24, "No \"LT\", one load index: ETRTO passenger table (XL or Reinforced: the XL table).", "d-small"));
    return svg(W, H, "Reading a tyre sidewall: LT265/75R16 123/120Q", nodes);
  }

  root.TYRE_DIAGRAMS = { ladder, footprint, deflection, bead, hotCold, ctis, markings };
})(window);
