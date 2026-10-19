/* Visual effects, decoration only (nothing here touches the calculations):
   - the tyre hologram in the header (canvas.hero-fx): a 4x4 tyre rolling on
     tar at road pressure, airing down (air hissing from the valve, the gauge
     needle dropping, the tyre squashing and its contact patch growing longer),
     rolling on sand, then pumped back up by a compressor, and round again.
     The gauge has no numbers, so it can't be mistaken for a result;
   - the explainers fading in as they scroll into view;
   - the diagrams' build-in: the first time a diagram scrolls into view it
     gets .is-in (style.css grows the footprints, raises the bars and fills
     the pumping timeline); one redrawn in the same place later gets .fx-seen
     and just shows.
   Under prefers-reduced-motion the hologram is drawn once, aired down on sand,
   and nothing fades or builds in. The circuit board behind the page is
   js/circuit.js. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- fade-ins
  function setUpReveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("fx-reveal");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
    document.querySelectorAll(".explainer").forEach(function (el) { io.observe(el); });
    // Fail-safe: nothing stays invisible if the observer misses it.
    setTimeout(function () {
      document.querySelectorAll(".explainer").forEach(function (el) { el.classList.add("is-visible"); });
    }, 4000);
  }

  // ------------------------------------------------------- diagram build-in
  function setUpDiagrams() {
    if (reduceMotion || !("IntersectionObserver" in window) || !("MutationObserver" in window)) return;
    document.documentElement.classList.add("fx-diagrams");
    var seen = {};
    var key = function (svg) { return (svg.getAttribute("aria-label") || "").slice(0, 28); };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        seen[key(e.target)] = true;
        io.unobserve(e.target);
      });
    }, { threshold: 0.35 });
    function prepare(svg) {
      if (svg.classList.contains("is-in")) return;
      svg.querySelectorAll(".d-patch").forEach(function (n, i) { n.style.setProperty("--i", i); });
      svg.querySelectorAll(".d-bar-pressure, .d-bar-speed").forEach(function (n, i) { n.style.setProperty("--i", Math.floor(i / 2)); });
      svg.querySelectorAll('rect[y="30"]').forEach(function (n, i) { n.style.setProperty("--i", i); });
      if (seen[key(svg)]) svg.classList.add("is-in", "fx-seen");
      else io.observe(svg);
    }
    document.querySelectorAll(".diagram-svg").forEach(prepare);
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        r.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.classList && n.classList.contains("diagram-svg")) prepare(n);
          else if (n.querySelectorAll) n.querySelectorAll(".diagram-svg").forEach(prepare);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ------------------------------------------------------------ the hologram
  // World units: the ground is y = 0, up is negative, the tyre's centre is over
  // x = 0. p is the pressure as a share of road pressure (1 on tar, AIRED on
  // sand); the tyre squashes and its footprint lengthens as p drops.
  var R = 110, RIM = 62, AIRED = 0.45;
  var CYCLE = 9.6;
  var BOX = { l: -205, t: -332, r: 380, b: 50 };
  var GAUGE = { x: 300, y: -178, r: 56 }, PATCH = { x: 300, y: -52 };
  var STEPS = [
    { label: "ROAD", from: 0, to: 2.2 },
    { label: "AIR DOWN", from: 2.2, to: 4.4 },
    { label: "SAND", from: 4.4, to: 7.4 },
    { label: "PUMP UP", from: 7.4, to: 9.6 },
  ];

  function ease(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }

  // Where everything is at time t (seconds into the cycle).
  function state(t) {
    var p, sand, roll, hiss = 0, pump = 0;
    if (t < 2.2) { p = 1; sand = 0; roll = t / 2.2; }
    else if (t < 4.4) { var u = (t - 2.2) / 2.2; p = 1 - (1 - AIRED) * ease(u); sand = ease(u); roll = 1; hiss = Math.sin(Math.min(1, u * 1.15) * Math.PI); }
    else if (t < 7.4) { p = AIRED; sand = 1; roll = 1 + (t - 4.4) / 3; }
    else { var v = (t - 7.4) / 2.2; p = AIRED + (1 - AIRED) * ease(v); sand = 1 - ease(v); roll = 2; pump = Math.sin(Math.min(1, v * 1.1) * Math.PI); }
    return { p: p, sand: sand, rot: roll * Math.PI * 2, travel: roll * Math.PI * 2 * R, hiss: hiss, pump: pump, step: STEPS.findIndex(function (s) { return t >= s.from && t < s.to; }) };
  }

  function setUpHologram() {
    var canvas = document.querySelector(".hero-fx");
    if (!canvas || !canvas.getContext) return;
    var header = canvas.parentElement;
    var text = header.querySelector(".brand-text");
    var ctx = canvas.getContext("2d");

    var w = 0, h = 0, s = 1, ox = 0, oy = 0, fade = 1, labels = true;
    var mx = 0, my = 0, tx = 0, ty = 0;
    var bw = BOX.r - BOX.l, bh = BOX.b - BOX.t;
    var puffs = [];
    for (var i = 0; i < 26; i++) puffs.push({ p: Math.random(), a: (Math.random() - 0.5) * 0.9, v: 0.8 + Math.random() * 0.8 });
    var grains = [];
    for (var g = 0; g < 18; g++) grains.push({ p: Math.random(), v: 0.9 + Math.random() * 0.7, k: 0.6 + Math.random() * 0.8 });

    function resize() {
      var rect = header.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var textRight = text ? text.getBoundingClientRect().right - rect.left : w * 0.6;
      var contentRight = (w + Math.min(w, 1120)) / 2;
      var room = Math.min(w - 24, contentRight + 200) - textRight - 30;
      // keep clear of the pill and the Calculator / Sources links along the top
      var nav = header.querySelector(".brand-nav");
      var top = nav ? nav.getBoundingClientRect().bottom - rect.top + 10 : 20;
      if (room > 300) {
        s = Math.min(room / bw, (h - top - 14) / bh);
        ox = textRight + 30 + (room - bw * s) / 2 - BOX.l * s;
        oy = h - 14 - BOX.b * s - Math.max(0, (h - top - 14 - bh * s) / 2);
        fade = 1; labels = true;
      } else {
        // Narrow screens: a faint tyre behind the text, bottom right.
        s = Math.min((w * 0.7) / bw, (h * 0.62) / bh);
        ox = w - BOX.r * s - 8;
        oy = h - BOX.b * s - 6;
        fade = 0.2; labels = false;
      }
    }

    function stroke(colour, width, blur) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = width / s;
      ctx.shadowColor = "rgba(76, 201, 255, 0.9)";
      ctx.shadowBlur = blur;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    function rgba(c, a) { return "rgba(" + c[0] + ", " + c[1] + ", " + c[2] + ", " + a + ")"; }

    // The tyre's side view flattened by `sq` against the ground (the same shape
    // as the deflection diagram on the page).
    function tyrePath(sq) {
      var half = Math.sqrt(R * R - (R - sq) * (R - sq)), yc = -(R - sq), bulge = sq * 0.55;
      ctx.moveTo(-half, 0);
      ctx.bezierCurveTo(-half - bulge, 0, -R - bulge * 0.6, yc + (R - sq) * 0.5, -R, yc);
      ctx.arc(0, yc, R, Math.PI, Math.PI * 2, false);
      ctx.bezierCurveTo(R + bulge * 0.6, yc + (R - sq) * 0.5, half + bulge, 0, half, 0);
      ctx.closePath();
      return { half: half, yc: yc, bulge: bulge };
    }

    function frame(t) {
      var time = t / 1000;
      var phase = reduceMotion ? 5.9 : (time + 4.4) % CYCLE;   // opens on the sand step (owner's call)
      var st = state(phase);
      var sq = 7 + 30 * (1 - st.p) / (1 - AIRED);       // deflection: road to aired down
      var BLUE = [76, 201, 255], AMBER = [255, 200, 87];

      ctx.clearRect(0, 0, w, h);
      tx += (mx - tx) * 0.05; ty += (my - ty) * 0.05;
      ctx.save();
      ctx.translate(ox + tx * 10, oy + ty * 6);
      ctx.scale(s, s);
      ctx.globalAlpha = fade;

      var pool = ctx.createRadialGradient(80, -120, 10, 80, -120, 380);
      pool.addColorStop(0, "rgba(47, 107, 255, 0.2)");
      pool.addColorStop(1, "rgba(47, 107, 255, 0)");
      ctx.fillStyle = pool;
      ctx.fillRect(-320, -520, 820, 800);

      // ---- the ground: tar fading into sand and back, sliding past while it rolls
      var shift = st.travel;
      ctx.save();
      ctx.beginPath(); ctx.rect(-200, -40, 420, 100); ctx.clip();
      var slab = ctx.createLinearGradient(-200, 0, 220, 0);
      slab.addColorStop(0, "rgba(5, 10, 30, 0)");
      slab.addColorStop(0.2, "rgba(5, 10, 30, 0.9)");
      slab.addColorStop(0.8, "rgba(5, 10, 30, 0.9)");
      slab.addColorStop(1, "rgba(5, 10, 30, 0)");
      ctx.fillStyle = slab;
      ctx.fillRect(-200, 0, 420, 60);
      if (st.sand < 1) {
        ctx.globalAlpha = fade * (1 - st.sand);
        ctx.strokeStyle = "rgba(76, 201, 255, 0.4)";
        ctx.lineWidth = 2 / s;
        ctx.beginPath();
        for (var x = -200 - (shift % 70); x < 230; x += 70) { ctx.moveTo(x, 16); ctx.lineTo(x + 32, 16); }
        ctx.stroke();
      }
      if (st.sand > 0) {
        ctx.globalAlpha = fade * st.sand;
        ctx.strokeStyle = "rgba(76, 201, 255, 0.3)";
        ctx.lineWidth = 1 / s;
        [12, 26, 42].forEach(function (y, k) {
          ctx.beginPath();
          for (var xx = -200; xx <= 220; xx += 6) {
            var yy = y + 3 * Math.sin((xx + shift) / (18 + k * 6));
            if (xx === -200) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        });
      }
      ctx.restore();
      ctx.globalAlpha = fade;
      var edge = ctx.createLinearGradient(-205, 0, 225, 0);
      edge.addColorStop(0, "rgba(76, 201, 255, 0)");
      edge.addColorStop(0.2, "rgba(76, 201, 255, 0.75)");
      edge.addColorStop(0.8, "rgba(76, 201, 255, 0.75)");
      edge.addColorStop(1, "rgba(76, 201, 255, 0)");
      ctx.beginPath();
      if (st.sand > 0.02) {
        for (var ex = -205; ex <= 225; ex += 5) {
          var ey = st.sand * 2.5 * Math.sin((ex + shift) / 14);
          if (ex === -205) ctx.moveTo(ex, ey); else ctx.lineTo(ex, ey);
        }
      } else { ctx.moveTo(-205, 0); ctx.lineTo(225, 0); }
      ctx.strokeStyle = edge; ctx.lineWidth = 1.3 / s;
      ctx.shadowColor = "rgba(76, 201, 255, 0.9)"; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;

      // sand thrown up behind the tyre while it rolls on sand
      var rolling = (phase < 2.2 || (phase >= 4.4 && phase < 7.4)) && !reduceMotion;
      if (rolling && st.sand > 0.5) {
        ctx.fillStyle = "rgb(150, 210, 255)";
        grains.forEach(function (gr) {
          var q = (gr.p + time * gr.v) % 1;
          ctx.globalAlpha = fade * (1 - q) * 0.8;
          ctx.fillRect(-60 - q * 120 * gr.k, -4 - q * 70 * gr.k + q * q * 80, 2.4 / s, 2.4 / s);
        });
        ctx.globalAlpha = fade;
      }

      // ---- the tyre
      var shape;
      ctx.save();
      ctx.beginPath(); shape = tyrePath(sq);
      var body = ctx.createLinearGradient(0, -2 * R, 0, 0);
      body.addColorStop(0, "rgba(76, 201, 255, 0.12)");
      body.addColorStop(1, "rgba(76, 201, 255, 0.03)");
      ctx.fillStyle = body;
      ctx.fill();
      ctx.clip();
      // tread blocks turning with the wheel, and the tread band's inner edge
      ctx.beginPath();
      for (var k = 0; k < 28; k++) {
        var a = st.rot + k * Math.PI * 2 / 28;
        ctx.moveTo(Math.cos(a) * (R - 14), shape.yc + Math.sin(a) * (R - 14));
        ctx.lineTo(Math.cos(a) * (R + 30), shape.yc + Math.sin(a) * (R + 30));
      }
      stroke("rgba(76, 201, 255, 0.45)", 2.2, 0);
      ctx.beginPath(); ctx.arc(0, shape.yc, R - 16, 0, Math.PI * 2);
      stroke("rgba(76, 201, 255, 0.35)", 1, 0);
      ctx.fillStyle = "rgba(160, 225, 255, 0.06)";
      var ls = reduceMotion ? 0 : (time * 12) % 4;
      for (var ly = -2 * R - 10 + ls; ly < 0; ly += 4) ctx.fillRect(-R - 40, ly, 2 * R + 80, 1 / s);
      ctx.restore();
      ctx.beginPath(); tyrePath(sq); stroke("rgba(76, 201, 255, 0.85)", 1.6, 8);

      // the sidewall flexing: heat glows on the bulges when aired down
      var heat = (1 - st.p) / (1 - AIRED);
      if (heat > 0.05) {
        [-1, 1].forEach(function (d) {
          var hx = d * (shape.half + shape.bulge * 0.45), hy = -16;
          var gl = ctx.createRadialGradient(hx, hy, 1, hx, hy, 22);
          var pulse = reduceMotion ? 0.7 : 0.55 + 0.45 * Math.sin(time * 5);
          gl.addColorStop(0, "rgba(255, 120, 130, " + 0.55 * heat * pulse + ")");
          gl.addColorStop(1, "rgba(255, 93, 115, 0)");
          ctx.fillStyle = gl;
          ctx.fillRect(hx - 24, hy - 24, 48, 48);
        });
      }

      // the rim: two rings, six spokes, wheel nuts and the valve
      var yc = shape.yc;
      ctx.beginPath();
      ctx.moveTo(RIM, yc); ctx.arc(0, yc, RIM, 0, Math.PI * 2);
      ctx.moveTo(RIM - 8, yc); ctx.arc(0, yc, RIM - 8, 0, Math.PI * 2);
      ctx.moveTo(15, yc); ctx.arc(0, yc, 15, 0, Math.PI * 2);
      for (var sp = 0; sp < 6; sp++) {
        var sa = st.rot + sp * Math.PI / 3;
        ctx.moveTo(Math.cos(sa) * 15, yc + Math.sin(sa) * 15);
        ctx.lineTo(Math.cos(sa) * (RIM - 8), yc + Math.sin(sa) * (RIM - 8));
        var na = sa + Math.PI / 6;
        ctx.moveTo(Math.cos(na) * 24 + 3, yc + Math.sin(na) * 24);
        ctx.arc(Math.cos(na) * 24, yc + Math.sin(na) * 24, 3, 0, Math.PI * 2);
      }
      stroke("rgba(76, 201, 255, 0.8)", 1.2, 5);
      var va = st.rot - Math.PI / 3;                    // the valve sits up and right when the wheel stops
      var v0 = [Math.cos(va) * (RIM - 4), yc + Math.sin(va) * (RIM - 4)];
      var v1 = [Math.cos(va) * (RIM + 12), yc + Math.sin(va) * (RIM + 12)];
      ctx.beginPath(); ctx.moveTo(v0[0], v0[1]); ctx.lineTo(v1[0], v1[1]);
      stroke("rgba(200, 240, 255, 0.95)", 2.4, 6);

      // air hissing out of the valve
      if (st.hiss > 0.02) {
        ctx.fillStyle = "rgb(190, 235, 255)";
        puffs.forEach(function (pf) {
          var q = (pf.p + time * pf.v) % 1;
          var ang = va + pf.a;
          var dist = 8 + q * 70;
          ctx.globalAlpha = fade * st.hiss * (1 - q) * 0.9;
          ctx.beginPath(); ctx.arc(v1[0] + Math.cos(ang) * dist, v1[1] + Math.sin(ang) * dist, 1.1 + q * 2.2, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = fade;
      }

      // the compressor and its hose while pumping up
      if (st.pump > 0.02) {
        ctx.globalAlpha = fade * Math.min(1, st.pump * 1.6);
        var cpx = 150, cpy = -26;
        ctx.beginPath(); ctx.rect(cpx, cpy, 52, 26);
        ctx.moveTo(cpx + 10, cpy); ctx.lineTo(cpx + 10, cpy - 8); ctx.lineTo(cpx + 42, cpy - 8); ctx.lineTo(cpx + 42, cpy);
        for (var f = 0; f < 4; f++) { ctx.moveTo(cpx + 8 + f * 10, cpy + 6); ctx.lineTo(cpx + 8 + f * 10, cpy + 20); }
        stroke("rgba(76, 201, 255, 0.8)", 1.2, 5);
        function hose() {
          ctx.moveTo(cpx + 4, cpy + 10);
          ctx.bezierCurveTo(cpx - 40, cpy + 20, v1[0] + 70, v1[1] + 40, v1[0] + 3, v1[1] - 2);
        }
        ctx.beginPath(); hose(); stroke("rgba(120, 215, 255, 0.8)", 1.6, 6);
        ctx.setLineDash([6, 10]);
        ctx.lineDashOffset = reduceMotion ? 0 : time * 60;
        ctx.beginPath(); hose(); stroke("rgba(235, 250, 255, 0.95)", 1.2, 6);
        ctx.setLineDash([]);
        ctx.globalAlpha = fade;
      }

      // the footprint under the tyre
      ctx.beginPath();
      ctx.moveTo(-shape.half, 10); ctx.lineTo(-shape.half, 16); ctx.lineTo(shape.half, 16); ctx.lineTo(shape.half, 10);
      stroke("rgba(76, 201, 255, 0.9)", 1.4, 6);

      if (labels) {
        ctx.font = "600 " + (10.5 / s) + "px Inter, system-ui, sans-serif";
        if ("letterSpacing" in ctx) ctx.letterSpacing = (1.6 / s) + "px";
        ctx.textBaseline = "middle";

        // ---- the gauge: no numbers; a green band for the road, amber for sand
        var A0 = Math.PI * 0.75, SPAN = Math.PI * 1.5;
        var at = function (f) { return A0 + SPAN * f; };
        var road = 0.78, aired = road * AIRED;
        ctx.beginPath(); ctx.arc(GAUGE.x, GAUGE.y, GAUGE.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(6, 12, 32, 0.6)"; ctx.fill();
        stroke("rgba(76, 201, 255, 0.7)", 1.3, 6);
        [[road - 0.06, road + 0.06, [46, 230, 166]], [aired - 0.08, aired + 0.06, AMBER]].forEach(function (z) {
          ctx.beginPath(); ctx.arc(GAUGE.x, GAUGE.y, GAUGE.r - 9, at(z[0]), at(z[1]));
          ctx.strokeStyle = rgba(z[2], 0.85); ctx.lineWidth = 5 / s;
          ctx.shadowColor = rgba(z[2], 0.9); ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
        });
        ctx.beginPath();
        for (var tk = 0; tk <= 12; tk++) {
          var ta = at(tk / 12), r0 = GAUGE.r - (tk % 3 === 0 ? 20 : 16);
          ctx.moveTo(GAUGE.x + Math.cos(ta) * r0, GAUGE.y + Math.sin(ta) * r0);
          ctx.lineTo(GAUGE.x + Math.cos(ta) * (GAUGE.r - 13), GAUGE.y + Math.sin(ta) * (GAUGE.r - 13));
        }
        stroke("rgba(76, 201, 255, 0.6)", 1, 0);
        var jitter = st.hiss > 0.1 && !reduceMotion ? Math.sin(time * 40) * 0.006 : 0;
        var na2 = at(road * st.p + jitter);
        ctx.beginPath();
        ctx.moveTo(GAUGE.x - Math.cos(na2) * 8, GAUGE.y - Math.sin(na2) * 8);
        ctx.lineTo(GAUGE.x + Math.cos(na2) * (GAUGE.r - 14), GAUGE.y + Math.sin(na2) * (GAUGE.r - 14));
        stroke("rgba(255, 220, 140, 0.95)", 2.2, 8);
        ctx.beginPath(); ctx.arc(GAUGE.x, GAUGE.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 220, 140, 0.95)"; ctx.fill();

        // ---- the contact patch from above, growing as the pressure drops
        var len = shape.half * 2 * 0.62, pw2 = 40;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(PATCH.x - len / 2, PATCH.y - pw2 / 2, len, pw2, 12) : ctx.rect(PATCH.x - len / 2, PATCH.y - pw2 / 2, len, pw2);
        ctx.fillStyle = "rgba(76, 201, 255, 0.1)"; ctx.fill();
        stroke("rgba(76, 201, 255, 0.9)", 1.4, 8);
        ctx.beginPath();
        [-12, 0, 12].forEach(function (dy) { ctx.moveTo(PATCH.x - len / 2 + 8, PATCH.y + dy); ctx.lineTo(PATCH.x + len / 2 - 8, PATCH.y + dy); });
        stroke("rgba(76, 201, 255, 0.4)", 1, 0);
        // a dashed link from the bracket under the tyre to the patch
        ctx.setLineDash([3 / s, 4 / s]);
        ctx.beginPath(); ctx.moveTo(shape.half + 6, 13); ctx.quadraticCurveTo(PATCH.x - len / 2 - 30, 14, PATCH.x - len / 2 - 4, PATCH.y + 6);
        stroke("rgba(76, 201, 255, 0.5)", 1, 0);
        ctx.setLineDash([]);

        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(225, 242, 255, 0.95)";
        ctx.shadowColor = "rgba(76, 201, 255, 0.9)"; ctx.shadowBlur = 8;
        ctx.fillText("PRESSURE", GAUGE.x, GAUGE.y + GAUGE.r + 18);
        ctx.fillText("CONTACT PATCH", PATCH.x, PATCH.y + pw2 / 2 + 20);
        ctx.shadowBlur = 0;

        // ---- the four steps along the top, the current one lit
        var sx0 = BOX.l + 30, sgap = (BOX.r - BOX.l - 60) / 4;
        STEPS.forEach(function (stp, n) {
          var cx = sx0 + sgap * n + sgap / 2, on = n === st.step;
          ctx.fillStyle = on ? "rgba(235, 248, 255, 1)" : "rgba(150, 190, 235, 0.55)";
          if (on) { ctx.shadowColor = "rgba(76, 201, 255, 1)"; ctx.shadowBlur = 10; }
          ctx.fillText(stp.label, cx, BOX.t + 46);
          ctx.shadowBlur = 0;
          var prog = on ? (phase - stp.from) / (stp.to - stp.from) : n < st.step ? 1 : 0;
          ctx.fillStyle = "rgba(76, 201, 255, 0.18)";
          ctx.fillRect(cx - sgap / 2 + 8, BOX.t + 60, sgap - 16, 3);
          ctx.fillStyle = "rgba(76, 201, 255, 0.95)";
          ctx.fillRect(cx - sgap / 2 + 8, BOX.t + 60, (sgap - 16) * prog, 3);
          if (n < STEPS.length - 1) {
            ctx.fillStyle = "rgba(76, 201, 255, 0.5)";
            ctx.beginPath(); ctx.arc(cx + sgap / 2, BOX.t + 46, 2.2 / s, 0, Math.PI * 2); ctx.fill();
          }
        });

        // ---- HUD frame, its name and a blinking light
        ctx.strokeStyle = "rgba(76, 201, 255, 0.55)";
        ctx.lineWidth = 1 / s;
        var L = BOX.l, T = BOX.t, Rr = BOX.r, Bm = BOX.b, cc = 16;
        ctx.beginPath();
        ctx.moveTo(L, T + cc); ctx.lineTo(L, T); ctx.lineTo(L + cc, T);
        ctx.moveTo(Rr - cc, T); ctx.lineTo(Rr, T); ctx.lineTo(Rr, T + cc);
        ctx.moveTo(L, Bm - cc); ctx.lineTo(L, Bm); ctx.lineTo(L + cc, Bm);
        ctx.moveTo(Rr - cc, Bm); ctx.lineTo(Rr, Bm); ctx.lineTo(Rr, Bm - cc);
        ctx.stroke();
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(150, 190, 235, 0.8)";
        ctx.fillText("TYRE PRESSURE", L + 30, T + 14);
        ctx.fillStyle = "rgba(46, 230, 166, " + (0.4 + 0.6 * (Math.sin(time * 4) > 0 ? 1 : 0.2)) + ")";
        ctx.beginPath(); ctx.arc(L + 18, T + 14, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    var running = false, visible = true, raf = 0;
    function loop(t) { frame(t); raf = requestAnimationFrame(loop); }
    function update() {
      var should = !reduceMotion && visible && !document.hidden;
      if (should && !running) { running = true; raf = requestAnimationFrame(loop); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }
    function still() { if (!running) frame(5900); }

    resize();
    still();
    if ("ResizeObserver" in window) new ResizeObserver(function () { resize(); still(); }).observe(header);
    else window.addEventListener("resize", function () { resize(); still(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resize(); still(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; update(); }).observe(header);
    }
    document.addEventListener("visibilitychange", update);
    header.addEventListener("pointermove", function (e) {
      var rect = header.getBoundingClientRect();
      mx = (e.clientX - rect.left) / rect.width - 0.5;
      my = (e.clientY - rect.top) / rect.height - 0.5;
    });
    update();
  }

  function start() { setUpReveal(); setUpDiagrams(); setUpHologram(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
