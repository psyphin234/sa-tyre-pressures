/*
 * tyre3d.js: the "Try a pressure" tyre, in 3D (owner's request, 2026-11-10).
 *
 * A tyre rolls through sand (or the chosen terrain) while the slider sets its
 * pressure: it flattens, the sidewalls bulge, the footprint grows and, on soft
 * ground, it sinks less. The footprint's size is the page's own figure
 * (load / pressure, worked out in diagrams.js and passed in); everything else
 * is a picture:
 *   - the flattening is drawn FLATTEN times larger so it shows;
 *   - how deep the tyre sinks is a sketch, not a figure from any source.
 *
 * three.js (js/vendor/three.min.js, about 600 KB) is only fetched when the
 * slider first appears. Until it arrives, or where WebGL isn't available,
 * app.js keeps showing the flat drawing (liveTyre in diagrams.js).
 *
 * window.TYRE_3D = { supported(), ready(), load(done), view(options) }
 */
(function (root) {
  "use strict";

  var THREE_SRC = "js/vendor/three.min.js";
  var FLATTEN = 2.5;         // the flattening is drawn this many times larger
  var PITCHES = 32;         // tread blocks round the tyre
  var GROOVE = 0.036;       // tread depth, in tyre radii
  var SHEAR = 0.5;          // how far the blocks sweep back towards the shoulders (in pitches)
  var SPEED = 1.5;          // rolling speed, tyre radii per second
  var BULGE = 0.85;         // sidewall bulge, as a share of the flattening
  var TILE = 1.4;           // ground texture tile, tyre radii

  // Ground by terrain. soft: the tyre sinks in and leaves a rut.
  var TERRAIN = {
    sand: { soft: 1, color: 0xd9b57c, tex: "ripple", relief: 0.9, rough: 1, dust: 0xe8cc9c, print: 0.4 },
    deepsnow: { soft: 1, color: 0xe6edf6, tex: "ripple", relief: 0.35, rough: 0.75, dust: 0xffffff, print: 0.22 },
    mud: { soft: 1, color: 0x5d4631, tex: "lump", relief: 1.2, rough: 0.45, dust: 0x4d3a29, print: 0.5 },
    gravel: { soft: 0, color: 0x9a9184, tex: "lump", relief: 1.4, rough: 1, dust: 0xbdb4a6, print: 0.16 },
    corrugations: { soft: 0, color: 0xa98b64, tex: "ripple", relief: 1.7, rough: 1, dust: 0xcbb08a, print: 0.16 },
    tar: { soft: 0, color: 0x3d3f45, tex: "lump", relief: 0.7, rough: 0.9, dust: 0x8a8d94, print: 0 },
    snow: { soft: 0, color: 0xdfe8f2, tex: "lump", relief: 0.5, rough: 0.5, dust: 0xffffff, print: 0.12 },
    rock: { soft: 0, color: 0x79746e, tex: "lump", relief: 1.9, rough: 0.9, dust: 0xa09a92, print: 0.1 }
  };

  var T = null;
  var state = "idle";       // idle | loading | ready | failed
  var waiting = [];
  var webgl = null;
  var reduce = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var S = null;             // the scene, built the first time it's shown

  function supported() {
    if (state === "failed") return false;
    if (webgl === null) {
      try {
        var c = document.createElement("canvas");
        webgl = !!(root.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
      } catch (e) {
        webgl = false;
      }
    }
    return webgl;
  }

  function ready() {
    return state === "ready";
  }

  // Fetch three.js, then call done(). Nothing happens if it can't be loaded.
  function load(done) {
    if (!supported()) return;
    if (state === "ready") { if (done) done(); return; }
    if (done) waiting.push(done);
    if (state === "loading") return;
    state = "loading";
    var finish = function () {
      T = root.THREE;
      state = T ? "ready" : "failed";
      var list = waiting;
      waiting = [];
      if (state === "ready") list.forEach(function (f) { f(); });
    };
    if (root.THREE) { finish(); return; }
    var s = document.createElement("script");
    s.src = THREE_SRC;
    s.onload = finish;
    s.onerror = function () { state = "failed"; waiting = []; };
    document.head.appendChild(s);
  }

  // ------------------------------------------------------------ small helpers
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function colour(hex) { return new T.Color(hex).convertSRGBToLinear(); }
  function rng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Smooth noise that repeats every `period` cells, so textures tile.
  function tileNoise(period, seed) {
    var r = rng(seed), a = new Float32Array(period * period);
    for (var i = 0; i < a.length; i++) a[i] = r();
    return function (u, v) {
      var x = u * period, y = v * period, x0 = Math.floor(x), y0 = Math.floor(y);
      var fx = x - x0, fy = y - y0;
      fx = fx * fx * (3 - 2 * fx);
      fy = fy * fy * (3 - 2 * fy);
      var i0 = ((x0 % period) + period) % period, i1 = (i0 + 1) % period;
      var j0 = ((y0 % period) + period) % period, j1 = (j0 + 1) % period;
      var top = a[j0 * period + i0] + (a[j0 * period + i1] - a[j0 * period + i0]) * fx;
      var bot = a[j1 * period + i0] + (a[j1 * period + i1] - a[j1 * period + i0]) * fx;
      return top + (bot - top) * fy;
    };
  }
  function layered(periods, seed) {
    var ns = periods.map(function (p, i) { return tileNoise(p, seed + i * 31); });
    return function (u, v) {
      var s = 0, a = 0.5, t = 0;
      for (var i = 0; i < ns.length; i++) { s += a * ns[i](u, v); t += a; a *= 0.5; }
      return s / t;
    };
  }

  // Ground textures: a pale colour map (the material tints it) and a normal
  // map. "ripple": wind ripples across the direction of travel (sand, snow,
  // corrugations). "lump": stones and clods (mud, gravel, rock).
  var texCache = {};
  function groundTextures(kind) {
    if (texCache[kind]) return texCache[kind];
    var N = 512, h = new Float32Array(N * N), r = rng(kind === "ripple" ? 11 : 23);
    var big = layered([3, 6, 12], 5), fine = layered([24, 48, 96], 9), warp = layered([2, 4, 8], 3);
    var x, y, i;
    for (y = 0; y < N; y++) {
      for (x = 0; x < N; x++) {
        var u = x / N, v = y / N, val;
        if (kind === "ripple") {
          var w = Math.sin(2 * Math.PI * (7 * v + 1.3 * (warp(u, v) - 0.5)) + 3 * (big(u, v) - 0.5));
          w = w > 0 ? Math.pow(w, 0.7) : -Math.pow(-w, 1.4); // sharper crests, wider troughs
          val = 0.5 + 0.34 * w + 0.22 * (fine(u, v) - 0.5);
        } else {
          var f = fine(u, v), b = big(u, v);
          val = 0.25 + 0.5 * b + 0.5 * Math.pow(Math.abs(f - 0.5) * 2, 0.8);
        }
        h[y * N + x] = val;
      }
    }
    var c = document.createElement("canvas");
    c.width = c.height = N;
    var g = c.getContext("2d"), img = g.createImageData(N, N);
    for (i = 0; i < N * N; i++) {
      var shade = 212 + 46 * (h[i] - 0.5) + 30 * (big((i % N) / N, Math.floor(i / N) / N) - 0.5) + (r() - 0.5) * 34;
      if (r() < 0.012) shade -= 50; // darker grains
      shade = clamp(shade, 0, 255);
      img.data[i * 4] = shade;
      img.data[i * 4 + 1] = shade * 0.985;
      img.data[i * 4 + 2] = shade * 0.95;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    var map = new T.CanvasTexture(c);
    map.encoding = T.sRGBEncoding;

    var cn = document.createElement("canvas");
    cn.width = cn.height = N;
    var gn = cn.getContext("2d"), out = gn.createImageData(N, N);
    var at = function (px, py) { return h[((py + N) % N) * N + ((px + N) % N)]; };
    for (y = 0; y < N; y++) {
      for (x = 0; x < N; x++) {
        var nx = -(at(x + 1, y) - at(x - 1, y)) * 7 + (r() - 0.5) * 0.25;
        var ny = (at(x, y + 1) - at(x, y - 1)) * 7 + (r() - 0.5) * 0.25;
        var len = Math.sqrt(nx * nx + ny * ny + 1);
        i = (y * N + x) * 4;
        out.data[i] = (nx / len * 0.5 + 0.5) * 255;
        out.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
        out.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
        out.data[i + 3] = 255;
      }
    }
    gn.putImageData(out, 0, 0);
    var normal = new T.CanvasTexture(cn);
    [map, normal].forEach(function (t) {
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.anisotropy = 8;
    });
    texCache[kind] = { map: map, normal: normal };
    return texCache[kind];
  }

  // Where the tread blocks are: five rows across the tread, alternate rows
  // half a pitch out of step. m: which of the eight rings in a pitch.
  var RING_P = (function () { var e = 0.02; return [e, 0.18 - e, 0.18 + e, 0.5 - e, 0.5 + e, 0.68 - e, 0.68 + e, 1 - e]; })();
  function inBlock(row, m) {
    return row % 2 === 0 ? m <= 5 : m >= 4 || m <= 1;
  }

  // ------------------------------------------------------------ the tyre
  // W: section width, rimR: rim radius, both in tyre radii (the tyre's own
  // radius is 1). The mesh is rebuilt every frame by update(): each point is
  // turned to where the wheel is, then pressed flat where it would go below
  // the ground, with the sidewall taking up the squash and bulging out.
  function makeTyre(W, rimR) {
    var hw = W / 2, ht = 0.8 * hw, gw = 0.034, e = 0.004;
    var bw = (2 * ht - 4 * gw) / 5;
    var crownAt = function (x) { var u = x / ht; return 0.022 * u * u; };
    var half = [];
    var tread = function (x, row) {
      half.push({ x: x, r: 1 - GROOVE - crownAt(x), nx: 0, nr: 1, s: row >= 0 ? 1 : 0, row: row < 0 ? 0 : row, f: 1, b: 0, crown: crownAt(x) });
    };
    tread(0, 2);
    tread(bw / 2 - e, 2);
    tread(bw / 2 + e, -1);
    tread(bw / 2 + gw - e, -1);
    tread(bw / 2 + gw + e, 3);
    tread(bw / 2 + gw + bw - e, 3);
    tread(bw / 2 + gw + bw + e, -1);
    tread(bw / 2 + 2 * gw + bw - e, -1);
    tread(bw / 2 + 2 * gw + bw + e, 4);
    tread(ht, 4);
    // shoulder and sidewall: a curve from the tread edge out to the widest
    // point and back in to the bead on the rim
    var rS = 1 - GROOVE - crownAt(ht);
    var P = [[ht, rS], [hw * 1.12, rS - 0.02], [hw * 1.12, rimR + 0.11], [hw * 0.66, rimR - 0.012]];
    // [t along the curve, tread block height (side lugs), raised band]
    var side = [[0.08, 1, 0], [0.18, 0.8, 0], [0.29, 0.45, 0], [0.31, 0, 0], [0.4, 0, 0], [0.42, 0, 0.008], [0.52, 0, 0.008], [0.54, 0, 0], [0.66, 0, 0], [0.78, 0, 0], [0.9, 0, 0], [1, 0, 0]];
    side.forEach(function (sd) {
      var t = sd[0], q = 1 - t;
      var px = q * q * q * P[0][0] + 3 * q * q * t * P[1][0] + 3 * q * t * t * P[2][0] + t * t * t * P[3][0];
      var pr = q * q * q * P[0][1] + 3 * q * q * t * P[1][1] + 3 * q * t * t * P[2][1] + t * t * t * P[3][1];
      var dx = 3 * q * q * (P[1][0] - P[0][0]) + 6 * q * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]);
      var dr = 3 * q * q * (P[1][1] - P[0][1]) + 6 * q * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1]);
      var len = Math.sqrt(dx * dx + dr * dr) || 1, nx = -dr / len, nr = dx / len;
      var f = clamp((pr - rimR) / (rS - rimR), 0, 1);
      half.push({ x: px + nx * sd[2], r: pr + nr * sd[2], nx: nx, nr: nr, s: sd[1], row: 4, f: f, b: Math.sin(Math.PI * f), crown: crownAt(ht) * f * f });
    });
    var cols = [];
    for (var k = half.length - 1; k >= 1; k--) {
      var c = half[k];
      cols.push({ x: -c.x, r: c.r, nx: -c.nx, nr: c.nr, s: c.s, row: 4 - c.row, f: c.f, b: c.b, crown: c.crown, sgn: -1 });
    }
    half.forEach(function (c2) { cols.push(Object.assign({ sgn: 1 }, c2)); });
    var pitch = (2 * Math.PI) / PITCHES;
    cols.forEach(function (c3) { c3.shear = SHEAR * pitch * Math.min(1, Math.abs(c3.x) / ht); });

    var NC = cols.length, NR = PITCHES * RING_P.length;
    var theta = new Float32Array(NR), lug = new Float32Array(NR * NC);
    for (var i = 0; i < NR; i++) {
      var m = i % RING_P.length;
      theta[i] = (Math.floor(i / RING_P.length) + RING_P[m]) * pitch;
      for (var j = 0; j < NC; j++) lug[i * NC + j] = cols[j].s > 0 && inBlock(cols[j].row, m) ? cols[j].s * GROOVE : 0;
    }
    var pos = new Float32Array(NR * NC * 3), index = [];
    for (i = 0; i < NR; i++) {
      var i2 = (i + 1) % NR;
      for (j = 0; j < NC - 1; j++) {
        var a = i * NC + j, b = i * NC + j + 1, c4 = i2 * NC + j, d = i2 * NC + j + 1;
        index.push(a, b, c4, b, d, c4);
      }
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    geo.setIndex(index);
    var mesh = new T.Mesh(geo, new T.MeshStandardMaterial({ color: colour(0x1b1c20), roughness: 0.85, metalness: 0, envMapIntensity: 0.45 }));
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // turned: how far the wheel has rolled (radians); yc: axle height;
    // d: how far the tyre is pressed flat; spread: how far round the bulge reaches
    function update(turned, yc, d, spread) {
      var TWO_PI = 2 * Math.PI, kb = BULGE * d, K = 0.03, n = 0;
      for (var i3 = 0; i3 < NR; i3++) {
        for (var j3 = 0; j3 < NC; j3++) {
          var col = cols[j3], ang = theta[i3] + col.shear + turned;
          var cs = Math.cos(ang), sn = Math.sin(ang), delta = 0;
          if (cs > 0.05) {
            var reach = yc / cs, hh = Math.max(K - Math.abs(1 - reach), 0) / K;
            delta = 1 - (Math.min(1, reach) - hh * hh * K * 0.25);
          }
          var aw = ang - TWO_PI * Math.round(ang / TWO_PI);
          var bulge = kb * Math.exp(-(aw * aw) / (spread * spread));
          var L = lug[i3 * NC + j3];
          var r = col.r + col.crown * Math.min(1, delta / 0.012) - delta * col.f + L * col.nr;
          pos[n++] = col.x + L * col.nx + col.sgn * col.b * bulge;
          pos[n++] = yc - r * cs;
          pos[n++] = r * sn;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
    }
    return { mesh: mesh, update: update, hw: hw, ht: ht };
  }

  // ------------------------------------------------------------ the wheel
  // An alloy rim, built facing +z and then turned so its face is on the
  // camera's side (-x). Returns a group that spins about the axle.
  function makeWheel(W, rimR) {
    var hw = W / 2, a = hw * 0.66;
    var alloy = new T.MeshStandardMaterial({ color: colour(0xc6cbd3), metalness: 1, roughness: 0.3 });
    var dark = new T.MeshStandardMaterial({ color: colour(0x23262c), metalness: 0.7, roughness: 0.5, side: T.DoubleSide });
    var steel = new T.MeshStandardMaterial({ color: colour(0x8b9098), metalness: 1, roughness: 0.42 });
    var spin = new T.Group(), face = new T.Group();
    face.rotation.y = -Math.PI / 2; // +z of the face becomes -x: towards the camera
    spin.add(face);
    var add = function (geo, mat, z) {
      var m = new T.Mesh(geo, mat);
      if (z != null) m.position.z = z;
      m.castShadow = true;
      face.add(m);
      return m;
    };
    // barrel and lips: a profile (radius, along the axle) spun round
    var prof = [[rimR + 0.03, -a - 0.012], [rimR, -a], [rimR - 0.05, -a + 0.05], [rimR - 0.07, 0], [rimR - 0.05, a - 0.06], [rimR, a - 0.01], [rimR + 0.032, a + 0.004], [rimR + 0.032, a + 0.022], [rimR + 0.006, a + 0.026], [rimR - 0.03, a + 0.006], [rimR - 0.06, a - 0.05]];
    var lathe = new T.LatheGeometry(prof.map(function (p) { return new T.Vector2(p[0], p[1]); }), 72);
    lathe.rotateX(Math.PI / 2); // the lathe's axis (y) becomes the face's z
    var barrel = add(lathe, new T.MeshStandardMaterial({ color: colour(0xc6cbd3), metalness: 1, roughness: 0.3, side: T.DoubleSide }));
    barrel.castShadow = false;
    var zf = a - 0.035; // the spokes' front face
    var disc = new T.CylinderGeometry(rimR - 0.13, rimR - 0.13, 0.03, 48);
    disc.rotateX(Math.PI / 2);
    add(disc, steel, zf - 0.17); // brake disc behind the spokes
    var back = new T.CylinderGeometry(rimR - 0.055, rimR - 0.055, 0.02, 48);
    back.rotateX(Math.PI / 2);
    add(back, dark, -a + 0.06);
    var rO = rimR - 0.045;
    var shape = new T.Shape();
    shape.moveTo(-0.075, 0.09);
    shape.lineTo(0.075, 0.09);
    shape.lineTo(0.05, rO);
    shape.lineTo(-0.05, rO);
    shape.closePath();
    var slot = new T.Path(); // a slot down the middle of each spoke
    slot.moveTo(-0.018, 0.2);
    slot.lineTo(0.018, 0.2);
    slot.lineTo(0.013, rO - 0.07);
    slot.lineTo(-0.013, rO - 0.07);
    slot.closePath();
    shape.holes.push(slot);
    var spoke = new T.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
    for (var k = 0; k < 6; k++) {
      var s = add(spoke, alloy, zf - 0.053);
      s.rotation.z = (k * Math.PI) / 3;
    }
    var hub = new T.CylinderGeometry(0.17, 0.19, 0.08, 40);
    hub.rotateX(Math.PI / 2);
    add(hub, alloy, zf - 0.02);
    var cap = new T.CylinderGeometry(0.075, 0.085, 0.03, 32);
    cap.rotateX(Math.PI / 2);
    add(cap, dark, zf + 0.03);
    var nut = new T.CylinderGeometry(0.02, 0.02, 0.035, 6);
    nut.rotateX(Math.PI / 2);
    for (k = 0; k < 6; k++) {
      var ang = (k + 0.5) * (Math.PI / 3);
      var nm = add(nut, steel, zf + 0.03);
      nm.position.x = Math.cos(ang) * 0.128;
      nm.position.y = Math.sin(ang) * 0.128;
    }
    var valve = new T.CylinderGeometry(0.011, 0.014, 0.07, 10);
    valve.rotateX(Math.PI / 2);
    var vm = add(valve, new T.MeshStandardMaterial({ color: colour(0x101114), roughness: 0.6 }), a + 0.02);
    vm.position.x = Math.cos(Math.PI / 6) * (rimR - 0.045);
    vm.position.y = Math.sin(Math.PI / 6) * (rimR - 0.045);
    return spin;
  }

  // The tread's print in the rut: one pitch of blocks, repeated.
  function printTexture() {
    var w = 128, h = 64, c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    var g = c.getContext("2d"), img = g.createImageData(w, h);
    var gwU = 0.034 / 0.27, bwU = (2 - 4 * gwU) / 5; // groove and block widths where the tread is 2 wide
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var u = (x + 0.5) / w * 2 - 1, au = Math.abs(u), row = -1;
        if (au < bwU / 2) row = 2;
        else if (au > bwU / 2 + gwU && au < bwU / 2 + gwU + bwU) row = 3;
        else if (au > bwU / 2 + 2 * gwU + bwU) row = 4;
        var p = (y + 0.5) / h - SHEAR * au;
        p -= Math.floor(p);
        var on = row >= 0 && (row % 2 === 0 ? p < 0.68 : p > 0.5 || p < 0.18);
        img.data[(y * w + x) * 4 + 3] = on ? 255 : 0;
      }
    }
    g.putImageData(img, 0, 0);
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }

  // Soft light panels for the rim to reflect, and to fill the shadows.
  function environment(renderer, scene) {
    var room = new T.Scene();
    room.add(new T.Mesh(new T.BoxGeometry(30, 30, 30), new T.MeshBasicMaterial({ color: 0x0b1220, side: T.BackSide })));
    var panel = function (w, h, hex, k, pos) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(hex).multiplyScalar(k), side: T.DoubleSide }));
      m.position.set(pos[0], pos[1], pos[2]);
      m.lookAt(0, 0, 0);
      room.add(m);
    };
    panel(14, 10, 0xcfe2ff, 0.75, [0, 10, 0]);   // sky
    panel(4, 8, 0xffe2b8, 0.9, [-9, 4, 4]);      // warm, from the sun's side
    panel(4, 8, 0x4cc9ff, 0.45, [9, 3, -4]);     // cyan rim light
    panel(14, 3, 0xd8b98a, 0.3, [0, -6, 0]);     // light off the sand
    var pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(room, 0.04).texture;
    pm.dispose();
  }

  // ------------------------------------------------------------ the scene
  function build() {
    var el = document.createElement("div");
    el.className = "tyre3d";
    el.setAttribute("role", "img");
    var canvas = document.createElement("canvas");
    var lenTag = document.createElement("span");
    lenTag.className = "tyre3d-len";
    lenTag.setAttribute("aria-hidden", "true");
    var cap = document.createElement("div");
    cap.className = "tyre3d-cap";
    cap.setAttribute("aria-hidden", "true");
    var capMain = document.createElement("strong"), capNote = document.createElement("span");
    cap.appendChild(capMain);
    cap.appendChild(capNote);
    var stage = document.createElement("div");
    stage.className = "tyre3d-stage";
    stage.appendChild(canvas);
    stage.appendChild(lenTag);
    el.appendChild(stage);
    el.appendChild(cap);

    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    var scene = new T.Scene();
    environment(renderer, scene);
    var camera = new T.PerspectiveCamera(30, 1.6, 0.1, 50);
    scene.add(new T.HemisphereLight(0xbfd4f2, 0x6a5638, 0.35));
    var sun = new T.DirectionalLight(0xfff0d6, 1.9);
    sun.position.set(-2.6, 4.4, 1.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    var sc = sun.shadow.camera;
    sc.left = -2.6; sc.right = 2.6; sc.top = 2.8; sc.bottom = -2.8; sc.near = 0.5; sc.far = 12;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    // ---- ground: a grid, finer where the tyre runs, fading out at the edges
    var X0 = 2.7, ZF = -2.7, ZB = 3.5, xs = [], zs = [], x, z;
    for (x = -X0; x < -0.8; x += 0.19) xs.push(x);
    for (x = -0.8; x <= 0.8001; x += 0.04) xs.push(x);
    for (x = 0.8 + 0.19; x <= X0 + 0.001; x += 0.19) xs.push(x);
    for (z = ZF; z <= ZB + 0.001; z += 0.04) zs.push(z);
    var GX = xs.length, GZ = zs.length;
    var gpos = new Float32Array(GX * GZ * 3), guv = new Float32Array(GX * GZ * 2), gcol = new Float32Array(GX * GZ * 4), gidx = [];
    for (var iz = 0; iz < GZ; iz++) {
      for (var ix = 0; ix < GX; ix++) {
        var n = iz * GX + ix;
        gpos[n * 3] = xs[ix];
        gpos[n * 3 + 2] = zs[iz];
        guv[n * 2] = xs[ix] / TILE;
        guv[n * 2 + 1] = zs[iz] / TILE;
        var ex = xs[ix] / X0, ez = (zs[iz] - 0.4) / 3.1;
        gcol[n * 4] = gcol[n * 4 + 1] = gcol[n * 4 + 2] = 1;
        gcol[n * 4 + 3] = 1 - smooth(0.62, 1, Math.sqrt(ex * ex + ez * ez));
        if (ix < GX - 1 && iz < GZ - 1) gidx.push(n, n + GX, n + 1, n + 1, n + GX, n + GX + 1);
      }
    }
    var ggeo = new T.BufferGeometry();
    ggeo.setAttribute("position", new T.BufferAttribute(gpos, 3));
    ggeo.setAttribute("uv", new T.BufferAttribute(guv, 2));
    ggeo.setAttribute("color", new T.BufferAttribute(gcol, 4));
    ggeo.setIndex(gidx);
    var gmat = new T.MeshStandardMaterial({ roughness: 1, metalness: 0, vertexColors: true, transparent: true, envMapIntensity: 0.55 });
    var ground = new T.Mesh(ggeo, gmat);
    ground.receiveShadow = true;
    ground.frustumCulled = false;
    scene.add(ground);

    // ---- the tread's print along the rut
    var printTex = printTexture(), PITCH_LEN = (2 * Math.PI) / PITCHES;
    var PR = 24, ppos = new Float32Array((PR + 1) * 2 * 3), puv = new Float32Array((PR + 1) * 2 * 2), pcol = new Float32Array((PR + 1) * 2 * 4), pidx = [];
    var pgeo = new T.BufferGeometry();
    pgeo.setAttribute("position", new T.BufferAttribute(ppos, 3));
    pgeo.setAttribute("uv", new T.BufferAttribute(puv, 2));
    pgeo.setAttribute("color", new T.BufferAttribute(pcol, 4));
    for (var pr = 0; pr < PR; pr++) pidx.push(pr * 2, pr * 2 + 2, pr * 2 + 1, pr * 2 + 1, pr * 2 + 2, pr * 2 + 3);
    pgeo.setIndex(pidx);
    var pmat = new T.MeshBasicMaterial({ map: printTex, color: 0x000000, transparent: true, vertexColors: true, depthWrite: false, opacity: 0.4 });
    var print = new T.Mesh(pgeo, pmat);
    print.frustumCulled = false;
    print.renderOrder = 2;
    scene.add(print);

    // ---- the footprint, drawn through the tyre, and a bracket beside it
    var CYAN = colour(0x4cc9ff);
    var see = function (opacity) { return new T.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: opacity, depthTest: false, depthWrite: false }); };
    var patch = new T.Group(), edgeMat = see(0.85), bar = new T.BoxGeometry(1, 1, 1);
    var fill = new T.Mesh(new T.PlaneGeometry(1, 1), see(0.16));
    fill.rotation.x = -Math.PI / 2;
    patch.add(fill);
    var edges = [0, 1, 2, 3].map(function () { var m = new T.Mesh(bar, edgeMat); patch.add(m); return m; });
    patch.renderOrder = 5;
    patch.children.forEach(function (m) { m.renderOrder = 5; });
    scene.add(patch);
    // the round outline of the tyre with no load on it, beside the outer sidewall
    var ghost = new T.Mesh(new T.TorusGeometry(1, 0.007, 6, 120), new T.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.5 }));
    ghost.rotation.y = Math.PI / 2;
    scene.add(ghost);
    var bracket = new T.Group(), brMat = new T.MeshBasicMaterial({ color: CYAN });
    var brParts = [0, 1, 2].map(function () { var m = new T.Mesh(bar, brMat); bracket.add(m); return m; });
    scene.add(bracket);

    // ---- sand thrown up behind the tyre
    var NP = 340, parts = [], spos = new Float32Array(NP * 3), salpha = new Float32Array(NP), ssize = new Float32Array(NP);
    for (var pi = 0; pi < NP; pi++) parts.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, a: 0, grow: 0 });
    var sgeo = new T.BufferGeometry();
    sgeo.setAttribute("position", new T.BufferAttribute(spos, 3));
    sgeo.setAttribute("aA", new T.BufferAttribute(salpha, 1));
    sgeo.setAttribute("aS", new T.BufferAttribute(ssize, 1));
    var smat = new T.ShaderMaterial({
      uniforms: { color: { value: colour(0xe8cc9c) }, scale: { value: 300 } },
      vertexShader: "attribute float aA; attribute float aS; uniform float scale; varying float vA;" +
        "void main() { vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aS * scale / -mv.z; gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform vec3 color; varying float vA;" +
        "void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = (1.0 - smoothstep(0.25, 1.0, d)) * vA; if (a < 0.004) discard;" +
        " gl_FragColor = vec4(color, a);\n#include <encodings_fragment>\n}",
      transparent: true, depthWrite: false
    });
    var spray = new T.Points(sgeo, smat);
    spray.frustumCulled = false;
    spray.renderOrder = 4;
    scene.add(spray);
    var rand = rng(77), emitDebt = 0;

    // ---- state
    var tyre = null, wheel = null, dimsKey = "";
    var cur = { d: 0, sink: 0, ready: false }, target = { d: 0, sink: 0 };
    var terrain = TERRAIN.sand, terrainId = "";
    var turned = 0, dist = 0, clock = 0, yawOff = 0, last = 0, raf = 0, visible = true, sizeKey = "";
    var hw = 0.34, ht = 0.27, shown = { h: 0, top: 0 };

    function setDims(W, rimR) {
      var key = W.toFixed(3) + "/" + rimR.toFixed(3);
      if (key === dimsKey) return;
      dimsKey = key;
      if (tyre) { scene.remove(tyre.mesh); tyre.mesh.geometry.dispose(); scene.remove(wheel); }
      tyre = makeTyre(W, rimR);
      wheel = makeWheel(W, rimR);
      scene.add(tyre.mesh);
      scene.add(wheel);
      hw = tyre.hw;
      ht = tyre.ht;
      cur.ready = false;
    }

    function setTerrain(id) {
      if (id === terrainId) return;
      terrainId = id;
      terrain = TERRAIN[id] || TERRAIN.gravel;
      var tx = groundTextures(terrain.tex);
      gmat.map = tx.map;
      gmat.normalMap = tx.normal;
      gmat.normalScale.set(terrain.relief, terrain.relief);
      gmat.color.copy(colour(terrain.color));
      gmat.roughness = terrain.rough;
      gmat.needsUpdate = true;
      smat.uniforms.color.value.copy(colour(terrain.dust));
      pmat.opacity = terrain.print;
      cur.ready = false;
    }

    // The ground's shape for the tyre as it now sits: level at `top`, pressed
    // down to the tyre under and ahead of it, a rut behind, sand pushed up
    // ahead and along the rut's edges.
    function shapeGround(yc, h, top, bulge) {
      var inner = ht + 0.02, outer = hw + 0.07 + bulge * 0.8;
      var meet = top > 0.0005 ? -Math.sqrt(Math.max(0, 1 - (yc - top) * (yc - top))) : -h; // where the tyre meets the sand ahead
      var bermH = 0.4 * top, bowH = 0.32 * top;
      for (var iz2 = 0; iz2 < GZ; iz2++) {
        var zz = zs[iz2], floor = 0;
        if (zz < 0) floor = Math.abs(zz) <= h ? 0 : Math.abs(zz) < 0.999 ? Math.min(top, yc - Math.sqrt(1 - zz * zz)) : top;
        var along = smooth(meet - 0.12, meet + 0.25, zz);
        var bow = bowH * Math.exp(-Math.pow((zz - meet + 0.07) / 0.13, 2));
        for (var ix2 = 0; ix2 < GX; ix2++) {
          var ax = Math.abs(xs[ix2]);
          var w = 1 - smooth(inner, outer, ax);
          var y = top - w * (top - floor);
          y += bermH * along * Math.exp(-Math.pow((ax - outer - 0.03) / 0.075, 2));
          y += bow * (1 - smooth(outer * 0.6, outer + 0.2, ax)) * (1 - w * 0.999);
          gpos[(iz2 * GX + ix2) * 3 + 1] = y;
        }
      }
      ggeo.attributes.position.needsUpdate = true;
      ggeo.computeVertexNormals();

      // the print: a strip along the rut floor, fading in behind the tyre and out at the far end
      var z0 = h * 0.6, half = ht * 0.99;
      for (var r2 = 0; r2 <= PR; r2++) {
        var pz = z0 + ((ZB - 0.2 - z0) * r2) / PR;
        var fade = smooth(z0, h + 0.12, pz) * (1 - smooth(1.9, ZB - 0.3, pz));
        for (var sd = 0; sd < 2; sd++) {
          var q = r2 * 2 + sd;
          ppos[q * 3] = sd ? half : -half;
          ppos[q * 3 + 1] = 0.006;
          ppos[q * 3 + 2] = pz;
          puv[q * 2] = sd;
          puv[q * 2 + 1] = pz / PITCH_LEN;
          pcol[q * 4] = pcol[q * 4 + 1] = pcol[q * 4 + 2] = 1;
          pcol[q * 4 + 3] = fade;
        }
      }
      pgeo.attributes.position.needsUpdate = true;
      pgeo.attributes.uv.needsUpdate = true;
      pgeo.attributes.color.needsUpdate = true;

      // footprint outline (seen through the tyre) and the bracket beside it
      var t = 0.014, pw = 2 * ht, pl = Math.max(2 * h, 0.02);
      patch.position.set(0, 0.004, 0);
      fill.scale.set(pw, pl, 1);
      edges[0].scale.set(pw + t, t, t); edges[0].position.set(0, 0, -pl / 2);
      edges[1].scale.set(pw + t, t, t); edges[1].position.set(0, 0, pl / 2);
      edges[2].scale.set(t, t, pl); edges[2].position.set(-pw / 2, 0, 0);
      edges[3].scale.set(t, t, pl); edges[3].position.set(pw / 2, 0, 0);
      ghost.position.set(-(hw * 1.03 + 0.012), 1, 0);
      var bx = -(outer + 0.2 + bermH);
      bracket.position.set(bx, top + 0.012, 0);
      brParts[0].scale.set(t, t, pl); brParts[0].position.set(0, 0, 0);
      brParts[1].scale.set(0.1, t, t); brParts[1].position.set(0.05, 0, -pl / 2);
      brParts[2].scale.set(0.1, t, t); brParts[2].position.set(0.05, 0, pl / 2);
      shown.h = h;
      shown.top = top;
      shown.bx = bx;
    }

    function emit(h, top) {
      for (var k = 0; k < NP; k++) {
        var p = parts[k];
        if (p.life > 0) continue;
        var puff = rand() < 0.3, yc = 1 - cur.d;
        // carried up by the tread behind the footprint, then thrown off it:
        // along the tread's own direction, and a little outwards so it clears the tyre
        var ang = Math.asin(Math.min(1, h)) + (puff ? rand() * 0.25 : rand() * rand() * 1.25);
        var cs = Math.cos(ang), sn = Math.sin(ang);
        var along = puff ? 0.5 + rand() * 0.4 : SPEED * (0.75 + rand() * 0.85), out = puff ? 0.15 : 0.25 + rand() * 0.9;
        p.max = p.life = puff ? 0.8 + rand() * 0.6 : 0.45 + rand() * 0.5;
        spos[k * 3] = (rand() * 2 - 1) * ht;
        spos[k * 3 + 1] = Math.max(0.02, yc - 1.02 * cs);
        spos[k * 3 + 2] = 1.02 * sn + 0.02;
        p.vx = (rand() * 2 - 1) * (puff ? 0.18 : 0.45);
        p.vy = along * sn - out * cs + (puff ? 0.3 + rand() * 0.4 : 0);
        p.vz = along * cs + out * sn;
        p.a = puff ? 0.2 + rand() * 0.16 : 0.8 + rand() * 0.2;
        p.grow = puff ? 0.45 : 0;
        p.g = puff ? 0.25 : 4.2;
        ssize[k] = puff ? 0.24 + rand() * 0.22 : 0.02 + rand() * 0.03;
        return;
      }
    }

    function step(dt) {
      var ease = cur.ready && !reduce ? 1 - Math.exp(-dt * 7) : 1;
      var dd = (target.d - cur.d) * ease, ds = (target.sink - cur.sink) * ease;
      var moved = !cur.ready || Math.abs(dd) > 1e-5 || Math.abs(ds) > 1e-5;
      cur.d += dd;
      cur.sink += ds;
      var yc = 1 - cur.d, h = Math.sqrt(Math.max(0, 1 - yc * yc));
      if (moved) shapeGround(yc, h, cur.sink, BULGE * cur.d);
      cur.ready = true;
      if (!reduce) {
        clock += dt;
        dist += SPEED * dt;
        turned += (SPEED / yc) * dt;
      }
      tyre.update(turned, yc, cur.d, Math.asin(Math.min(1, h)) * 1.4 + 0.2);
      wheel.position.y = yc;
      wheel.rotation.x = -turned;
      var off = -(dist / TILE);
      if (gmat.map) { gmat.map.offset.y = off - Math.floor(off); gmat.normalMap.offset.y = gmat.map.offset.y; }
      var poff = -(dist / PITCH_LEN);
      printTex.offset.y = poff - Math.floor(poff);

      // spray: more where the tyre digs in
      if (!reduce) {
        emitDebt += dt * (terrain.soft ? 110 + 700 * cur.sink : terrain.print ? 30 : 0);
        while (emitDebt >= 1) { emitDebt -= 1; emit(h, cur.sink); }
      }
      for (var k = 0; k < NP; k++) {
        var p = parts[k];
        if (p.life <= 0) { salpha[k] = 0; continue; }
        p.life -= dt;
        p.vy -= p.g * dt;
        spos[k * 3] += p.vx * dt;
        spos[k * 3 + 1] += p.vy * dt;
        spos[k * 3 + 2] += (p.vz + (p.grow ? SPEED * 0.5 : 0)) * dt;
        ssize[k] += p.grow * dt;
        var lifeLeft = Math.max(0, p.life / p.max);
        salpha[k] = p.a * Math.min(1, lifeLeft * 2.2) * Math.min(1, (1 - lifeLeft) * 8);
        if (spos[k * 3 + 1] < 0.01 && p.vy < 0) { spos[k * 3 + 1] = 0.01; p.vy *= -0.25; p.vz *= 0.6; }
      }
      sgeo.attributes.position.needsUpdate = true;
      sgeo.attributes.aA.needsUpdate = true;
      sgeo.attributes.aS.needsUpdate = true;

      // camera: behind and to the side, so the rut runs towards the viewer
      var yaw = 0.95 + yawOff + (reduce ? 0 : 0.09 * Math.sin(clock * 0.45)), pitch = 0.24, D = 5.15;
      var tx = 0.05, ty = 0.86, tz = 0.4;
      camera.position.set(tx - Math.sin(yaw) * Math.cos(pitch) * D, ty + Math.sin(pitch) * D, tz + Math.cos(yaw) * Math.cos(pitch) * D);
      camera.lookAt(tx, ty, tz);
    }

    var v3 = null;
    function render() {
      var w = stage.clientWidth, hgt = stage.clientHeight;
      if (!w || !hgt) return;
      var dpr = Math.min(root.devicePixelRatio || 1, 2), key = w + "x" + hgt + "@" + dpr;
      if (key !== sizeKey) {
        sizeKey = key;
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, hgt, false);
        camera.aspect = w / hgt;
        // a narrow picture needs a wider view to keep the whole tyre in
        camera.fov = clamp(30 * (1.6 / camera.aspect), 30, 46);
        camera.updateProjectionMatrix();
        smat.uniforms.scale.value = (hgt * dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360));
      }
      renderer.render(scene, camera);
      // the length label sits by the bracket
      v3 = v3 || new T.Vector3();
      v3.set(shown.bx - 0.05, shown.top + 0.02, 0).project(camera);
      lenTag.style.left = clamp((v3.x * 0.5 + 0.5) * w, 34, w - 34).toFixed(1) + "px";
      lenTag.style.top = clamp((-v3.y * 0.5 + 0.5) * hgt, 12, hgt - 12).toFixed(1) + "px";
    }

    function running() {
      return !reduce && visible && el.isConnected && !document.hidden;
    }
    function frame(now) {
      raf = 0;
      if (!el.isConnected) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      step(dt);
      render();
      if (running()) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    function kick() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    if ("IntersectionObserver" in root) {
      new IntersectionObserver(function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) kick();
      }).observe(el);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });
    root.addEventListener("resize", kick);

    // drag sideways to look round the tyre
    var dragX = null;
    canvas.addEventListener("pointerdown", function (ev) {
      dragX = ev.clientX;
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
    });
    canvas.addEventListener("pointermove", function (ev) {
      if (dragX == null) return;
      yawOff = clamp(yawOff - (ev.clientX - dragX) * 0.008, -1.5, 0.75);
      dragX = ev.clientX;
      kick();
    });
    var drop = function () { dragX = null; };
    canvas.addEventListener("pointerup", drop);
    canvas.addEventListener("pointercancel", drop);
    canvas.addEventListener("webglcontextlost", function (ev) { ev.preventDefault(); });
    canvas.addEventListener("webglcontextrestored", function () { cur.ready = false; kick(); });

    /*
     * o: { kpa, radiusMm, widthMm, rimMm (optional), terrain, lengthMm,
     *      deflMm, areaCm2, label }
     */
    function set(o) {
      var W = clamp(o.widthMm / o.radiusMm, 0.42, 0.95);
      var rimR = clamp(o.rimMm ? o.rimMm / 2 / o.radiusMm : 0.556, 0.42, 0.7);
      setDims(W, rimR);
      setTerrain(o.terrain);
      var sidewall = 1 - GROOVE - rimR;
      target.d = clamp((o.deflMm / o.radiusMm) * FLATTEN, 0, sidewall * 0.62);
      target.sink = terrain.soft ? 0.04 + 0.15 * clamp((o.kpa - 80) / 170, 0, 1) : 0;
      el.setAttribute("aria-label", o.label);
      lenTag.textContent = "≈ " + Math.round(o.lengthMm / 10) + " cm";
      capMain.textContent = "Footprint ≈ " + Math.round(o.lengthMm / 10) + " cm long · " + Math.round(o.areaCm2) + " cm²";
      capNote.textContent = "Drag to look round. Flattening drawn " + FLATTEN + "× so it shows" + (terrain.soft ? "; how deep it sinks is a sketch." : ".");
      kick();
      return el;
    }

    return { el: el, set: set };
  }

  // The 3D picture for these options, or null if it can't be drawn (the
  // caller then shows the flat drawing).
  function view(o) {
    if (state !== "ready") return null;
    try {
      if (!S) S = build();
      return S.set(o);
    } catch (e) {
      state = "failed";
      S = null;
      if (root.console) console.warn("3D tyre unavailable:", e);
      return null;
    }
  }

  root.TYRE_3D = { supported: supported, ready: ready, load: load, view: view };
})(window);
