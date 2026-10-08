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
      nodes.push(text(x + bw / 2 - 2, 206, (m.psi * 0.0689476).toFixed(1) + " bar · " + m.kmh + " km/h", "d-small", { "text-anchor": "middle" }));
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


  // ============================================================ gauges, signs, live tyre, timelines, animations
  // Polar helpers for the semicircular gauge: angle 0 = left (lowest), 180 = right.
  const RAD = Math.PI / 180;
  function polar(cx, cy, r, deg) {
    return [cx - r * Math.cos(deg * RAD), cy - r * Math.sin(deg * RAD)];
  }
  function arcPath(cx, cy, r, fromDeg, toDeg) {
    const [x1, y1] = polar(cx, cy, r, fromDeg);
    const [x2, y2] = polar(cx, cy, r, toDeg);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${toDeg - fromDeg > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }

  /*
   * A tyre-gauge dial for one axle. a: { name, roadKpa, floorKpa, tableMinKpa,
   * planKpa, status, range }. opts: { fmt, maxKpa, bfgKpa }. The needle points
   * at the planned pressure; app.js animates it from the previous reading.
   * Returns { svg, needle, angle }.
   */
  function gauge(a, opts) {
    const W = 260;
    const H = 200;
    const cx = W / 2;
    const cy = 140;
    const r = 105;
    const max = opts.maxKpa;
    const deg = (kpa) => Math.max(0, Math.min(180, (kpa / max) * 180));
    const nodes = [];
    const zone = (from, to, cls) => {
      if (from == null || to == null || to <= from + 0.5) return;
      nodes.push(s("path", { d: arcPath(cx, cy, r, deg(from), deg(to)), class: "g-zone " + cls }));
    };
    zone(0, a.tableMinKpa, "gz-nodata");
    if (a.status === "ok") zone(a.tableMinKpa, a.floorKpa, "gz-belowload");
    zone(a.floorKpa != null ? a.floorKpa : a.tableMinKpa, a.roadKpa, "gz-loadok");
    zone(a.roadKpa, max, "gz-road");
    // ticks every 0.5 bar, numbers every 1 bar
    for (let k = 0; k <= max + 0.1; k += 50) {
      const big = k % 100 === 0;
      const [x1, y1] = polar(cx, cy, r - 14, deg(k));
      const [x2, y2] = polar(cx, cy, r - (big ? 26 : 20), deg(k));
      nodes.push(s("line", { x1, y1, x2, y2, class: "g-tick" }));
      if (big) {
        const [tx, ty] = polar(cx, cy, r - 38, deg(k));
        nodes.push(text(tx, ty + 4, String(k / 100), "d-small", { "text-anchor": "middle" }));
      }
    }
    // the terrain range as a thin outer arc
    if (a.range && a.range.bottomKpa < a.range.topKpa - 1) nodes.push(s("path", { d: arcPath(cx, cy, r + 9, deg(a.range.bottomKpa), deg(a.range.topKpa)), class: "g-range" }));
    // BFGoodrich's 1.5 bar line
    if (opts.bfgKpa) {
      const [x1, y1] = polar(cx, cy, r - 8, deg(opts.bfgKpa));
      const [x2, y2] = polar(cx, cy, r + 14, deg(opts.bfgKpa));
      nodes.push(s("line", { x1, y1, x2, y2, class: "d-line-fail" }));
    }
    // road pressure marker
    if (a.roadKpa != null) {
      const [x1, y1] = polar(cx, cy, r - 8, deg(a.roadKpa));
      const [x2, y2] = polar(cx, cy, r + 14, deg(a.roadKpa));
      nodes.push(s("line", { x1, y1, x2, y2, class: "g-road" }));
    }
    const angle = a.planKpa != null ? deg(a.planKpa) : deg(a.roadKpa || 0);
    // the needle is drawn pointing left (angle 0) and rotated about the hub
    const needle = s(
      "g",
      { class: "g-needle", style: `transform-origin:${cx}px ${cy}px` },
      s("path", { d: `M${cx} ${cy - 4} L${cx - r + 18} ${cy} L${cx} ${cy + 4} Z`, class: "g-needle-shape" })
    );
    nodes.push(needle);
    nodes.push(s("circle", { cx, cy, r: 9, class: "g-hub" }));
    nodes.push(text(cx, cy + 34, a.planKpa != null ? opts.fmt(a.planKpa) : opts.fmt(a.roadKpa), "g-value", { "text-anchor": "middle" }));
    nodes.push(text(cx, cy + 54, a.name, "d-small", { "text-anchor": "middle" }));
    const el = svg(W, H, `${a.name} axle gauge: planned ${a.planKpa != null ? opts.fmt(a.planKpa) : "not set"}, road pressure ${opts.fmt(a.roadKpa)}`, nodes);
    return { svg: el, needle, angle };
  }

  // A round South African speed-limit sign. text: "20" | "80" | "Slow" | "Crawl".
  function speedSign(textValue, caption) {
    const numeric = /^\d+$/.test(textValue);
    return svg(
      96,
      118,
      numeric ? `Speed limit ${textValue} km/h` : textValue,
      s("circle", { cx: 48, cy: 48, r: 44, class: "sign-ring" }),
      s("circle", { cx: 48, cy: 48, r: 33, class: "sign-face" }),
      text(48, numeric ? 60 : 54, textValue, numeric ? "sign-num" : "sign-word", { "text-anchor": "middle" }),
      text(48, 112, caption || (numeric ? "km/h max" : ""), "d-small", { "text-anchor": "middle" })
    );
  }

  /*
   * The tyre at a given pressure, side view and footprint from below. The
   * footprint area is load ÷ pressure (rule nhtsa-contact-patch), held at the
   * tread width; its length gives how far the tyre flattens.
   * o: { kpa, wheelKg, radiusMm, widthMm, fmt }
   */
  function liveTyre(o) {
    const W = 520;
    const H = 230;
    const EXAGGERATE = 2.5; // the flattening is only a few cm: drawn larger so it shows
    const areaM2 = (o.wheelKg * 9.81) / (o.kpa * 1000);
    const lengthMm = Math.min((areaM2 * 1e6) / o.widthMm, o.radiusMm * 1.2);
    // A circle cut flat by the ground over the footprint length.
    const halfMm = lengthMm / 2;
    const deflMm = o.radiusMm - Math.sqrt(Math.max(0, o.radiusMm * o.radiusMm - halfMm * halfMm));
    const k = 80 / o.radiusMm; // px per mm, side view
    const R = o.radiusMm * k;
    const d = Math.min(deflMm * k * EXAGGERATE, R * 0.45);
    const h = Math.sqrt(Math.max(0, R * R - (R - d) * (R - d)));
    const ground = 190;
    const cx = 130;
    const cy = ground - (R - d);
    const tyre = `M${(cx - h).toFixed(1)} ${ground} A ${R.toFixed(1)} ${R.toFixed(1)} 0 1 1 ${(cx + h).toFixed(1)} ${ground} Z`;
    // footprint from below, at its own (larger) scale
    const kf = 0.42; // px per mm
    const fx = 360;
    const fy = 110;
    const fw = o.widthMm * kf;
    const fl = lengthMm * kf;
    const nodes = [
      s("rect", { x: 0, y: ground, width: 262, height: 24, class: "lt-sand" }),
      s("circle", { cx, cy: ground - R, r: R, class: "d-ghost" }),
      s("path", { d: tyre, class: "d-tyre" }),
      s("circle", { cx, cy, r: R * 0.55, class: "d-rim" }),
      s("circle", { cx, cy, r: 6, class: "d-hub" }),
      s("path", { d: `M${cx - h} ${ground + 7} V${ground + 13} H${cx + h} V${ground + 7}`, class: "d-bracket" }),
      text(cx, 222, "Side view (flattening drawn 2.5× for clarity)", "d-small", { "text-anchor": "middle" }),
      text(fx, 18, "Footprint, from below", "d-small", { "text-anchor": "middle" }),
      s("rect", { x: fx - fw / 2, y: fy - fl / 2, width: fw, height: fl, rx: Math.min(14, fw / 4), class: "d-patch" }),
    ];
    for (let i = -2; i <= 2; i++) nodes.push(s("line", { x1: fx + (i * fw) / 6, x2: fx + (i * fw) / 6, y1: fy - fl / 2 + 6, y2: fy + fl / 2 - 6, class: "d-tread" }));
    nodes.push(text(fx, 222, `≈ ${Math.round(lengthMm / 10)} cm long · ${Math.round(areaM2 * 10000)} cm²`, "d-small d-strong", { "text-anchor": "middle" }));
    return svg(W, H + 4, `At ${o.fmt(o.kpa)} one tyre carrying ${Math.round(o.wheelKg)} kg has a footprint of about ${Math.round(areaM2 * 10000)} square centimetres, about ${Math.round(lengthMm / 10)} cm long`, nodes);
  }

  /*
   * Pumping back up as a timeline: pumping per tyre, compressor rests and
   * moving to the next tyre. r: result of C.reinflation; switchMin per move.
   */
  function pumpTimeline(r, switchMin) {
    const W = 560;
    const H = 96;
    const total = r.totalMin || 0;
    if (!(total > 0)) return null;
    const x0 = 10;
    const span = W - 20;
    const px = (min) => (min / total) * span;
    const pumpEach = r.runMin / r.tyres;
    const restEach = (r.elapsedMin - r.runMin) / r.tyres;
    const nodes = [];
    let x = x0;
    for (let i = 0; i < r.tyres; i++) {
      const pw = px(pumpEach);
      nodes.push(s("rect", { x, y: 30, width: Math.max(1, pw), height: 26, class: "pt-pump" }));
      nodes.push(text(x + pw / 2, 47, String(i + 1), "pt-label", { "text-anchor": "middle" }));
      x += pw;
      if (restEach > 0.001) {
        const rw = px(restEach);
        nodes.push(s("rect", { x, y: 30, width: rw, height: 26, class: "pt-rest" }));
        x += rw;
      }
      if (i < r.tyres - 1 && switchMin > 0) {
        const mw = px(switchMin);
        nodes.push(s("rect", { x, y: 30, width: mw, height: 26, class: "pt-move" }));
        x += mw;
      }
    }
    nodes.push(text(x0, 20, "0", "d-small"));
    nodes.push(text(W - 10, 20, Math.round(total) + " min", "d-small", { "text-anchor": "end" }));
    const lg = [
      ["pt-pump", "pumping (tyre 1–4)"],
      ["pt-rest", "compressor resting"],
      ["pt-move", "moving to the next tyre"],
    ];
    lg.forEach(([cls, label], i) => {
      nodes.push(s("rect", { x: 10 + i * 180, y: 72, width: 12, height: 12, class: cls }));
      nodes.push(text(28 + i * 180, 82, label, "d-small"));
    });
    return svg(W, H, `Pumping all four tyres takes about ${Math.round(total)} minutes`, nodes);
  }

  // The bead diagram, with the bead animated sliding over the hump into the well.
  function beadAnimated() {
    const base = bead();
    const g = s(
      "g",
      { class: "anim-bead" },
      s("rect", { x: 82, y: 98, width: 40, height: 22, rx: 8, class: "d-bead d-bead--moving" })
    );
    const arrow = s("g", { class: "anim-push" }, s("path", { d: "M30 150 H120", class: "d-arrow" }), s("path", { d: "M120 150 l-10 -6 v12 z", class: "d-arrowhead" }));
    // hide the static left bead and arrow; the animated ones replace them
    base.querySelectorAll(".d-bead")[0].setAttribute("class", "d-bead d-bead--ghost");
    base.querySelectorAll(".d-arrow")[0].remove();
    base.querySelectorAll(".d-arrowhead")[0].remove();
    base.appendChild(arrow);
    base.appendChild(g);
    return base;
  }

  /*
   * Corrugations: the same rippled road under a hard tyre (bounces over every
   * ripple) and a softer one (flattens over them). Ripples scroll; tyres bob.
   */
  function corrugation() {
    const W = 520;
    const H = 250;
    const ripple = (y) => {
      let d = `M-60 ${y}`;
      for (let x = -60; x <= W + 60; x += 30) d += ` q7.5 -8 15 0 q7.5 8 15 0`;
      return s("g", { class: "anim-road" }, s("path", { d: d + ` V${y + 30} H-60 Z`, class: "cor-road" }));
    };
    const lane = (y, hard, label) => {
      const cx = 160;
      const R = 34;
      const flat = hard ? 0 : 7;
      const body = s("rect", { x: cx - 70, y: y - 92, width: 260, height: 26, rx: 6, class: "cor-body" });
      const tyre = hard
        ? s("circle", { cx, cy: y - R, r: R, class: "d-tyre" })
        : s("path", {
            d: `M${cx - 16} ${y} C${cx - 30} ${y} ${cx - R - 3} ${y - 14} ${cx - R} ${y - R + flat} A ${R} ${R} 0 0 1 ${cx + R} ${y - R + flat} C${cx + R + 3} ${y - 14} ${cx + 30} ${y} ${cx + 16} ${y} Z`,
            class: "d-tyre",
          });
      return s(
        "g",
        null,
        ripple(y),
        s("g", { class: hard ? "anim-bounce-hard" : "anim-bounce-soft" }, s("line", { x1: cx, y1: y - R + flat / 2, x2: cx, y2: y - 70, class: "cor-strut" }), body, tyre, s("circle", { cx, cy: y - R + flat / 2, r: 14, class: "d-rim" })),
        text(360, y - 52, label, "d-text d-strong")
      );
    };
    return svg(
      W,
      H,
      "Corrugations: a hard tyre bounces over every ripple; a softer tyre flattens over them and the ride is smoother",
      lane(110, true, "Hard tyre: bounces"),
      lane(230, false, "Softer tyre: soaks it up")
    );
  }

  /*
   * Warm-up: the thermometer shows the temperature of the air in the tyre,
   * the gauge its pressure. Both rise together, from the cold reading to
   * ETRTO's normal 20% warmer (warmC: the air temperature that explains that
   * rise, from the gas law). The marks sit exactly where the animation stops.
   */
  function warmUp(coldKpa, rise, fmt, coldC, warmC) {
    const W = 520;
    const H = 240;
    const warm = coldKpa * (1 + rise);
    // thermometer: the red column runs from 35% (cold) to 85% (warm) of the tube
    const tubeBottom = 152;
    const tubeLen = 112;
    const LOW = 0.35;
    const HIGH = 0.85;
    const yAt = (f) => tubeBottom - tubeLen * f;
    // gauge: the needle (drawn pointing left) turns 60deg (cold) to 110deg (warm)
    const gx = 350;
    const gy = 92;
    const COLD_DEG = 60;
    const WARM_DEG = 110;
    const mark = (deg, label) => {
      const [x1, y1] = polar(gx, gy, 50, deg);
      const [x2, y2] = polar(gx, gy, 60, deg);
      const [tx, ty] = polar(gx, gy, 74, deg);
      return [s("line", { x1, y1, x2, y2, class: "g-tick" }), text(tx, ty + 4, label, "d-small d-strong", { "text-anchor": "middle" })];
    };
    return svg(
      W,
      H,
      `Driving warms the air in the tyre from about ${coldC}°C to about ${warmC}°C, and the gauge goes from ${fmt(coldKpa)} to about ${fmt(warm)}`,
      // thermometer
      s("rect", { x: 92, y: 26, width: 22, height: 116, rx: 11, class: "th-tube" }),
      s("circle", { cx: 103, cy: 152, r: 20, class: "th-bulb" }),
      s("rect", { x: 98, y: tubeBottom - tubeLen, width: 10, height: tubeLen, class: "th-fill anim-mercury", style: "transform-origin:103px 152px" }),
      s("line", { x1: 116, x2: 126, y1: yAt(LOW), y2: yAt(LOW), class: "g-tick" }),
      text(130, yAt(LOW) + 4, `${coldC}°C`, "d-small d-strong"),
      s("line", { x1: 116, x2: 126, y1: yAt(HIGH), y2: yAt(HIGH), class: "g-tick" }),
      text(130, yAt(HIGH) + 4, `≈ ${warmC}°C`, "d-small d-strong"),
      text(103, 190, "Temperature of", "d-small", { "text-anchor": "middle" }),
      text(103, 204, "the air inside", "d-small", { "text-anchor": "middle" }),
      text(225, 96, "→", "d-text", { "text-anchor": "middle" }),
      // gauge
      s("circle", { cx: gx, cy: gy, r: 60, class: "d-gauge" }),
      s("path", { d: arcPath(gx, gy, 50, 20, 160), class: "d-gauge-arc" }),
      mark(COLD_DEG, fmt(coldKpa)),
      mark(WARM_DEG, fmt(warm)),
      s("g", { class: "anim-gauge-needle", style: `transform-origin:${gx}px ${gy}px` }, s("line", { x1: gx, y1: gy, x2: gx - 42, y2: gy, class: "d-needle d-needle--warm" })),
      s("circle", { cx: gx, cy: gy, r: 5, class: "d-hub" }),
      text(gx, 176, "Pressure on the gauge", "d-small", { "text-anchor": "middle" }),
      text(W / 2, 232, `Same air: ${fmt(coldKpa)} at ${coldC}°C becomes about ${fmt(warm)} at about ${warmC}°C`, "d-text d-strong", { "text-anchor": "middle" })
    );
  }

  // Small line icons for the "Before you go" list.
  const ICONS = {
    tar: () => [s("path", { d: "M8 22 L11 2 M16 22 L13 2", class: "ic" }), s("path", { d: "M12 5v2 M12 11v2 M12 17v2", class: "ic ic-dash" })],
    slope: () => [s("path", { d: "M2 20 L22 8 V20 Z", class: "ic" }), s("circle", { cx: 12, cy: 11, r: 3, class: "ic" })],
    gauge: () => [s("circle", { cx: 12, cy: 13, r: 8, class: "ic" }), s("path", { d: "M12 13 L16 9 M3 22h18", class: "ic" })],
    thermo: () => [s("path", { d: "M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0Z", class: "ic" }), s("path", { d: "M12 9v8", class: "ic" })],
  };
  function icon(name) {
    const f = ICONS[name];
    if (!f) return null;
    return s("svg", { viewBox: "0 0 24 24", class: "icon", "aria-hidden": "true" }, f());
  }

  root.TYRE_DIAGRAMS = { footprint, deflection, bead, ctis, markings, gauge, speedSign, liveTyre, pumpTimeline, beadAnimated, corrugation, warmUp, icon };
})(window);
