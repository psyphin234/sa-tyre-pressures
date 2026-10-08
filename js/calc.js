/*
 * calc.js: pure calculations (no DOM). Pressures are kPa internally; the
 * tables' psi and lb are converted here. Every sourced number is read from
 * TYRE_DATA rules (data.js) or TYRE_TABLES (tables.js).
 */
(function (root) {
  "use strict";

  const KPA_PER_PSI = 6.894757;
  const KG_PER_LB = 0.45359237;

  const psiToKpa = (psi) => psi * KPA_PER_PSI;
  const kpaToPsi = (kpa) => kpa / KPA_PER_PSI;
  const barToKpa = (bar) => bar * 100;
  const kpaToBar = (kpa) => kpa / 100;

  function data() {
    return root.TYRE_DATA;
  }
  function tables() {
    return root.TYRE_TABLES;
  }
  function rule(id) {
    const r = data().rules.find((x) => x.id === id);
    if (!r) throw new Error("Unknown rule " + id);
    return r;
  }

  function findSize(sizeId) {
    return data().tyreSizes.find((s) => s.id === sizeId) || null;
  }
  function findType(size, typeId) {
    return (size && size.types.find((t) => t.id === typeId)) || null;
  }

  // Load ranges (C/D/E) an LT or flotation tyre comes in.
  function loadRanges(type) {
    if (!type || (type.table !== "tra-lt" && type.table !== "tra-flotation")) return [];
    return tables()[type.table].sizes[type.size].ranges;
  }

  /*
   * The published load curve for a tyre choice, as [kPa, kg per tyre] points
   * in rising pressure. choice: { sizeId, typeId, li, range }.
   * Returns null if the choice is incomplete or not in the tables.
   */
  function loadCurve(choice) {
    const size = findSize(choice.sizeId);
    const type = findType(size, choice.typeId);
    if (!type) return null;
    const T = tables()[type.table];
    let pts = [];
    let marking = type.example;
    if (type.table === "etrto-sl" || type.table === "etrto-xl") {
      const row = T.rowsLb[choice.li];
      if (!row) return null;
      pts = T.psi.map((psi, i) => [psiToKpa(psi), row[i] * KG_PER_LB]);
      marking = size.label + " " + choice.li + (type.table === "etrto-xl" ? " XL" : "");
    } else if (type.table === "tra-lt" || type.table === "tra-flotation") {
      const s = T.sizes[type.size];
      const rg = s.ranges.find((r) => r.range === choice.range) || s.ranges[s.ranges.length - 1];
      pts = s.single.filter(([psi]) => psi <= rg.maxPsi).map(([psi, lb]) => [psiToKpa(psi), lb * KG_PER_LB]);
      marking = type.size + " load range " + rg.range + " (" + rg.li + ")";
    } else if (type.table === "michelin-750r16") {
      pts = T.axleKg.map(([psi, kg]) => [psiToKpa(psi), kg / 2]);
    } else {
      return null;
    }
    return { points: pts, table: type.table, source: T.source, where: T.where, label: T.label, marking };
  }

  /*
   * Read a tyre size as people type it: "265/60R18", "265/60/R18", "265 60 18",
   * "LT265/75R16 123/120Q", "265/65R17 116H XL", "31x10.50R15LT", "7.50R16C".
   * Returns null if it isn't a size. Fields: kind (metric | flotation |
   * numeric), label (normalised), lt, xl, li, liDual, and the dimensions.
   */
  function parseTyreSize(text) {
    if (!text) return null;
    const t = String(text).toUpperCase().replace(/\s+/g, " ").trim();
    const tail = (rest) => {
      const m = rest.match(/(\d{2,3})(?:\s*\/\s*(\d{2,3}))?\s*([A-Z])?\b/);
      return {
        li: m ? parseInt(m[1], 10) : null,
        liDual: m && m[2] ? parseInt(m[2], 10) : null,
        xl: /\b(XL|RF|REINF|REINFORCED|EXTRA ?LOAD)\b/.test(rest),
        ltMark: /\bLT\b/.test(rest),
        cMark: /^\s*C\b/.test(rest),
      };
    };
    let m = t.match(/^(LT|P)?\s*(\d{3})\s*[\/ -]\s*(\d{2})\s*[\/ -]?\s*(?:Z?R|D|B)?\s*[\/ -]?\s*(\d{2})(?:\s*(LT|C)\b)?(.*)$/);
    if (m) {
      const rest = tail(m[6] || "");
      const lt = m[1] === "LT" || m[5] === "LT" || m[5] === "C" || rest.ltMark || !!rest.liDual;
      return {
        kind: "metric",
        widthMm: parseInt(m[2], 10),
        aspect: parseInt(m[3], 10),
        rimIn: parseInt(m[4], 10),
        label: `${m[2]}/${m[3]}R${m[4]}`,
        lt,
        xl: rest.xl,
        li: rest.li,
        liDual: rest.liDual,
        oddWidth: parseInt(m[2], 10) % 10 !== 5,
        // The middle number is height as a % of width: 30-95, in steps of 5.
        oddAspect: parseInt(m[3], 10) < 25 || parseInt(m[3], 10) > 100 || parseInt(m[3], 10) % 5 !== 0,
      };
    }
    m = t.match(/^(\d{2})\s*[X×*]\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*[\/ -]?\s*R?\s*[\/ -]?\s*(\d{2})\s*(LT)?(.*)$/);
    if (m) {
      const w = m[2].replace(",", ".");
      const rest = tail(m[5] || "");
      return { kind: "flotation", overallIn: parseInt(m[1], 10), sectionWidthIn: parseFloat(w), rimIn: parseInt(m[3], 10), label: `${m[1]}x${parseFloat(w).toFixed(2)}R${m[3]}LT`, lt: true, xl: false, li: rest.li, liDual: rest.liDual };
    }
    m = t.match(/^(\d{1,2}[.,]\d{2})\s*[\/ -]?\s*R?\s*[\/ -]?\s*(\d{2})\s*(C|LT)?(.*)$/);
    if (m) {
      const w = m[1].replace(",", ".");
      const rest = tail(m[4] || "");
      return { kind: "numeric", sectionWidthIn: parseFloat(w), rimIn: parseInt(m[2], 10), label: `${w}R${m[2]}`, lt: true, xl: false, li: rest.li, liDual: rest.liDual };
    }
    return null;
  }

  /*
   * The load curve for a typed size (Simple): ETRTO passenger tyres by load
   * index (any size), LT and flotation sizes only if their TRA row is here,
   * 7.50R16 from Michelin's table. wantLt: the LT / passenger answer.
   * Returns { curve, cls, table, needsLi, reason } (curve null if unknown).
   */
  function curveForTyped(parsed, wantLt, typedLi) {
    if (!parsed) return { curve: null, cls: wantLt ? "lt" : "passenger", reason: "unreadable" };
    const lt = parsed.lt || wantLt;
    const T = tables();
    const li = parsed.li || typedLi || null;
    if (parsed.kind === "numeric") {
      if (parsed.label === "7.50R16") return { curve: loadCurve({ sizeId: "750r16", typeId: "michelin" }), cls: "lt", table: "michelin-750r16" };
      return { curve: null, cls: "lt", reason: "noLtTable" };
    }
    if (lt) {
      const key = parsed.kind === "flotation" ? parsed.label : "LT" + parsed.label;
      const table = parsed.kind === "flotation" ? "tra-flotation" : "tra-lt";
      const row = T[table].sizes[key];
      if (!row) return { curve: null, cls: "lt", reason: "noLtTable" };
      const rg = row.ranges.find((r) => r.li === li) || row.ranges[row.ranges.length - 1];
      const pts = row.single.filter(([psi]) => psi <= rg.maxPsi).map(([psi, lb]) => [psiToKpa(psi), lb * KG_PER_LB]);
      return { curve: { points: pts, table, source: T[table].source, where: T[table].where, label: T[table].label, marking: key + " load range " + rg.range + " (" + rg.li + ")" }, cls: "lt", table };
    }
    const table = parsed.xl ? "etrto-xl" : "etrto-sl";
    if (!li) return { curve: null, cls: "passenger", table, needsLi: true, reason: "needsLi" };
    const row = T[table].rowsLb[li];
    if (!row) return { curve: null, cls: "passenger", table, needsLi: true, reason: "liOutOfRange" };
    const pts = T[table].psi.map((psi, i) => [psiToKpa(psi), row[i] * KG_PER_LB]);
    return { curve: { points: pts, table, source: T[table].source, where: T[table].where, label: T[table].label, marking: parsed.label + " " + li + (parsed.xl ? " XL" : "") }, cls: "passenger", table, li };
  }

  // Dimensions for the air-volume estimate from a typed size (null if unknown).
  function geometryFor(parsed) {
    if (!parsed) return null;
    if (parsed.kind === "metric") return parsed.oddAspect ? null : { widthMm: parsed.widthMm, aspect: parsed.aspect, rimIn: parsed.rimIn };
    if (parsed.kind === "flotation") return { overallIn: parsed.overallIn, sectionWidthIn: parsed.sectionWidthIn, rimIn: parsed.rimIn };
    const known = data().tyreSizes.find((z) => z.label === parsed.label);
    return known ? known.geometry : null;
  }

  /*
   * The lowest pressure at which the tables say one tyre carries wheelKg.
   * Between published pressures, read in a straight line (rule table-method).
   * status: "ok" | "belowTable" (load already carried at the lowest published
   * pressure; the tables say nothing lower) | "overload" (more than the tyre's
   * maximum) | "noLoad".
   */
  function requiredPressure(curve, wheelKg) {
    const pts = curve.points;
    const min = pts[0];
    const max = pts[pts.length - 1];
    const base = { tableMinKpa: min[0], tableMaxKpa: max[0], maxKg: max[1], minKg: min[1] };
    if (!(wheelKg > 0)) return { ...base, status: "noLoad", kpa: null };
    if (wheelKg > max[1] + 1e-9) return { ...base, status: "overload", kpa: null };
    if (wheelKg <= min[1]) return { ...base, status: "belowTable", kpa: min[0] };
    for (let i = 1; i < pts.length; i++) {
      const [p0, l0] = pts[i - 1];
      const [p1, l1] = pts[i];
      if (wheelKg <= l1) {
        const kpa = l1 === l0 ? p0 : p0 + ((wheelKg - l0) * (p1 - p0)) / (l1 - l0);
        return { ...base, status: "ok", kpa };
      }
    }
    return { ...base, status: "overload", kpa: null };
  }

  // Load one tyre may carry at kpa per the tables (null below the tables).
  function loadAt(curve, kpa) {
    const pts = curve.points;
    if (kpa < pts[0][0] - 1e-9) return null;
    if (kpa >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    for (let i = 1; i < pts.length; i++) {
      const [p0, l0] = pts[i - 1];
      const [p1, l1] = pts[i];
      if (kpa <= p1) return l0 + ((kpa - p0) * (l1 - l0)) / (p1 - p0);
    }
    return null;
  }

  /*
   * Road pressure for one axle: the vehicle maker's placard, raised to the
   * table pressure if the load needs more (Toyo: replacement tyres must carry
   * the load; ETRTO: inflate to the load carried).
   */
  function roadPressure(placardKpa, need) {
    // Only a real requirement raises it: "belowTable" just means the load is
    // carried at the lowest published pressure, which says nothing about need.
    const floor = need && need.status === "ok" && need.kpa != null ? need.kpa : null;
    if (placardKpa > 0 && floor != null) return { kpa: Math.max(placardKpa, floor), raisedForLoad: floor > placardKpa + 0.5 };
    if (placardKpa > 0) return { kpa: placardKpa, raisedForLoad: false };
    return { kpa: floor, raisedForLoad: false };
  }

  /*
   * Where a planned pressure sits, and what the sources say about it.
   * Returns { band, maxKmh, publicRoad, flags[] } where band is one of:
   *   "road"         at or above road pressure
   *   "belowPlacard" below the placard, but the tables say the load is carried
   *   "belowLoad"    below what the tables say the load needs
   *   "belowTable"   below the lowest published pressure (no load data)
   */
  function assessPressure(planKpa, need, roadKpa, terrainId, cls) {
    const below15 = rule("bfg-below-1-5").params;
    const au = rule("bfg-au-20psi").params;
    const flags = [];
    let band;
    if (need.status === "overload") band = "overload";
    else if (planKpa < need.tableMinKpa - 0.5 && need.status === "belowTable") band = "belowTable";
    else if (need.kpa != null && planKpa < need.kpa - 0.5) band = "belowLoad";
    else if (roadKpa != null && planKpa < roadKpa - 0.5) band = "belowPlacard";
    else band = "road";

    let maxKmh = null;
    if (planKpa < barToKpa(below15.bar) - 0.5) {
      maxKmh = below15.maxKmh;
      flags.push("bfg-below-1-5");
      if (planKpa < psiToKpa(au.psi)) flags.push("bfg-au-20psi");
    }
    const lowest = ["sand", "mud", "rock", "deepsnow"].includes(terrainId) ? lowestPublished(terrainId, cls) : null;
    if (lowest && planKpa < lowest.kpa - 0.5) flags.push("below-published:" + lowest.ruleId);
    if (band === "belowLoad" || band === "belowTable") flags.push("bfg-speed-load");
    const publicRoad = band === "road" || band === "belowPlacard";
    return { band, maxKmh, publicRoad, flags };
  }

  // "lt" for light-truck construction (TRA LT, flotation, C-type), else "passenger".
  function tyreClass(type) {
    if (!type) return "passenger";
    return type.table === "etrto-sl" || type.table === "etrto-xl" ? "passenger" : "lt";
  }

  /*
   * Range for a terrain on one axle and tyre class ("lt" | "passenger"):
   * - "cooper": Cooper's LT range for the terrain, never above road pressure;
   *   steps (BFGoodrich's 0.5 bar) only where the terrain says so.
   * - "toyo20": road pressure down 20% (Toyo's 20 per cent rule).
   * - "bfg": road pressure down to BFGoodrich's 1.5 bar (steps for sand only).
   * - none: no citable figure, so the range stays at road pressure.
   * Returns { terrain, topKpa, bottomKpa, steps, sourced, kind, ruleId }.
   */
  function terrainRange(terrainId, roadKpa, cls) {
    const t = data().terrains.find((x) => x.id === terrainId);
    if (!t || roadKpa == null) return null;
    const spec = t[cls === "lt" ? "lt" : "passenger"];
    const flat = (sourced) => ({ terrain: t, topKpa: roadKpa, bottomKpa: roadKpa, steps: [roadKpa], sourced, kind: spec ? spec.kind : null, ruleId: null });
    if (!spec) return flat(false);
    if (spec.kind === "keep") return { ...flat(true), ruleId: spec.rule };
    let top;
    let bottom;
    let stepBar = null;
    let ruleId;
    if (spec.kind === "cooper") {
      ruleId = "cooper-lt-terrain";
      const [lo, hi] = rule(ruleId).params.psi[spec.key];
      top = Math.min(psiToKpa(hi), roadKpa);
      bottom = Math.min(psiToKpa(lo), roadKpa);
      if (spec.steps) stepBar = rule(spec.steps).params.stepBar;
    } else if (spec.kind === "toyo20") {
      ruleId = "toyo-20-percent";
      top = roadKpa;
      bottom = roadKpa * (1 - rule(ruleId).params.dropFraction);
    } else {
      ruleId = spec.rule;
      const r = rule(ruleId).params;
      top = roadKpa;
      bottom = Math.min(barToKpa(r.minBar), roadKpa);
      stepBar = r.stepBar || null;
    }
    const steps = [];
    if (stepBar) {
      const step = barToKpa(stepBar);
      for (let p = top; p > bottom + 0.5; p -= step) steps.push(p);
    } else steps.push(top);
    if (bottom < top - 0.5) steps.push(bottom);
    return { terrain: t, topKpa: top, bottomKpa: bottom, steps, sourced: true, kind: spec.kind, ruleId };
  }

  // Lowest pressure a tyre maker publishes for sand or mud, for this tyre class.
  function lowestPublished(terrainId, cls) {
    const t = data().terrains.find((x) => x.id === terrainId);
    const spec = t && t[cls === "lt" ? "lt" : "passenger"];
    if (!spec) return null;
    if (spec.kind === "cooper") return { kpa: psiToKpa(rule("cooper-lt-terrain").params.psi[spec.key][0]), ruleId: "cooper-lt-terrain" };
    if (spec.kind === "bfg") return { kpa: barToKpa(rule(spec.rule).params.minBar), ruleId: spec.rule };
    return null;
  }

  /*
   * Hold a terrain range to the pressure the load needs (from the tables).
   * On terrain that's usually a public road (tar, gravel, corrugations: reg 238
   * applies) the range is raised so it never goes below that; elsewhere it's
   * left alone and flagged, because the makers allow going lower off-road only
   * if the tyre still carries the load and you slow down.
   * Returns the range with { floorKpa, raised, belowFloor }.
   */
  const PUBLIC_ROAD_TERRAINS = ["tar", "gravel", "corrugations", "snow"];
  function applyLoadFloor(range, floorKpa) {
    if (!range) return range;
    const base = { ...range, floorKpa: floorKpa == null ? null : floorKpa, raised: false, belowFloor: false };
    if (floorKpa == null || floorKpa <= range.bottomKpa + 0.5) return base;
    if (PUBLIC_ROAD_TERRAINS.indexOf(range.terrain.id) === -1) return { ...base, belowFloor: true };
    const top = Math.max(range.topKpa, floorKpa);
    const steps = range.steps.filter((p) => p > floorKpa + 0.5);
    steps.push(floorKpa);
    if (steps[0] < top - 0.5) steps.unshift(top);
    return { ...base, topKpa: top, bottomKpa: floorKpa, steps, raised: true };
  }

  /*
   * What goes on the speed sign for a pressure on a terrain. At or above road
   * pressure: nothing (normal limits). Otherwise, from the sources:
   *   rock                -> "Crawl" (Cooper: very slow, low range)
   *   below 1.4 bar       -> 20 (BFGoodrich: below 1.5 bar, 20 km/h)
   *   1.4-1.5 bar in sand -> 25 (BFGoodrich Africa: 25 km/h at 1.4 bar)
   *   1.4-1.5 bar         -> 20 (BFGoodrich: below 1.5 bar)
   *   mud                 -> 20 (BFGoodrich: not over 20 km/h in mud)
   *   gravel, corrugations-> 80 (Toyo: never over 80 km/h on dirt)
   *   anything else       -> "Slow" (BFGoodrich: lower pressure, lower speed)
   * Returns { text, kmh (number or null), ruleId } or null.
   */
  function speedCap(planKpa, roadKpa, terrainId) {
    if (planKpa == null || (roadKpa != null && planKpa >= roadKpa - 0.5)) return null;
    const below15 = rule("bfg-below-1-5").params;
    const africa = rule("bfg-africa-sand").params;
    if (terrainId === "rock") return { text: "Crawl", kmh: null, ruleId: "cooper-rocks" };
    if (planKpa < barToKpa(africa.minBar) - 0.5) return { text: String(below15.maxKmh), kmh: below15.maxKmh, ruleId: "bfg-below-1-5" };
    if (planKpa < barToKpa(below15.bar) - 0.5) {
      if (terrainId === "sand" || terrainId === "deepsnow") return { text: String(africa.maxKmhAtMin), kmh: africa.maxKmhAtMin, ruleId: "bfg-africa-sand" };
      return { text: String(below15.maxKmh), kmh: below15.maxKmh, ruleId: "bfg-below-1-5" };
    }
    if (terrainId === "mud") return { text: String(rule("bfg-mud").params.maxKmh), kmh: rule("bfg-mud").params.maxKmh, ruleId: "bfg-mud" };
    if (terrainId === "gravel" || terrainId === "corrugations") {
      const t = rule("toyo-20-percent").params.maxKmh;
      return { text: String(t), kmh: t, ruleId: "toyo-20-percent" };
    }
    return { text: "Slow", kmh: null, ruleId: "bfg-speed-load" };
  }

  // ETRTO hard-driving extra (towing, sustained high speed): passenger-type tyres only.
  function hardDriving(type, roadKpa) {
    if (!type || (type.table !== "etrto-sl" && type.table !== "etrto-xl") || roadKpa == null) return null;
    const p = rule("etrto-hard-driving").params;
    // XL tyres may go to the higher cap. For standard-load tyres the cap
    // depends on the speed symbol, which isn't asked for, so the lower cap
    // (speed symbols up to T) is used and the higher one is mentioned.
    const xl = type.table === "etrto-xl";
    const cap = xl ? p.maxKpaHigher : p.maxKpaUpToT;
    return {
      fromKpa: Math.min(roadKpa + p.addMinKpa, cap),
      toKpa: Math.min(roadKpa + p.addMaxKpa, cap),
      capKpa: cap,
      higherCapKpa: xl ? null : p.maxKpaHigher,
    };
  }

  // ---------------------------------------------------------------- reinflation physics

  function atmosphereKpa(altitudeM) {
    const p = rule("calc-altitude").params;
    const h = Math.max(-500, Math.min(altitudeM || 0, 11000));
    return p.p0Kpa * Math.pow(1 - p.k * h, p.n);
  }

  // Air volume in litres: published if the tyre maker gives one, else a
  // calibrated torus (rule calc-air-volume).
  function tyreVolume(geometry) {
    if (geometry.publishedVolumeL) return { litres: geometry.publishedVolumeL, published: true };
    let widthMm, heightMm;
    if (geometry.widthMm) {
      widthMm = geometry.widthMm;
      heightMm = (geometry.widthMm * geometry.aspect) / 100;
    } else {
      widthMm = geometry.sectionWidthIn * 25.4;
      heightMm = ((geometry.overallIn - geometry.rimIn) / 2) * 25.4;
    }
    return { litres: torusLitres(widthMm, heightMm, geometry.rimIn) * rule("calc-air-volume").params.calibration, published: false };
  }

  function torusLitres(widthMm, heightMm, rimIn) {
    const rimR = (rimIn * 25.4) / 2;
    const area = (Math.PI / 4) * widthMm * heightMm; // oval cross-section
    const centroidR = rimR + heightMm / 2; // Pappus: volume = area x path of centroid
    return (2 * Math.PI * centroidR * area) / 1e6;
  }

  /*
   * Free air (at the compressor's intake, local atmosphere) to take each tyre
   * from fromKpa to toKpa gauge, and the time at flowLpm.
   * axles: [{ fromKpa, toKpa }] for front and rear (two tyres each).
   */
  function reinflation({ volumeL, axles, altitudeM, flowLpm, dutyPercent, switchMin }) {
    const atm = atmosphereKpa(altitudeM);
    const perAxle = axles.map((a) => {
      const perTyre = Math.max(0, (volumeL * (a.toKpa - a.fromKpa)) / atm);
      return { ...a, perTyreL: perTyre, axleL: perTyre * 2 };
    });
    const totalL = perAxle.reduce((s, a) => s + a.axleL, 0);
    const runMin = flowLpm > 0 ? totalL / flowLpm : null;
    const duty = dutyPercent > 0 && dutyPercent < 100 ? dutyPercent / 100 : 1;
    const tyres = perAxle.length * 2;
    // Moving the hose to the next tyre: once between each pair of tyres.
    const moveMin = switchMin > 0 ? switchMin * (tyres - 1) : 0;
    const elapsedMin = runMin != null ? runMin / duty : null;
    return { atmKpa: atm, perAxle, totalL, runMin, elapsedMin, duty, tyres, moveMin, totalMin: elapsedMin != null ? elapsedMin + moveMin : null };
  }

  /*
   * Gauge pressure after the air in the tyre changes temperature (rule
   * calc-temperature): absolute pressure scales with absolute temperature.
   */
  function pressureAtTemp(gaugeKpa, fromC, toC, altitudeM) {
    const atm = atmosphereKpa(altitudeM || 0);
    return ((gaugeKpa + atm) * (toC + 273.15)) / (fromC + 273.15) - atm;
  }

  // Air temperature rise that explains a given gauge reading (e.g. the 20% warm rise).
  function tempRiseFor(coldGaugeKpa, warmGaugeKpa, coldC, altitudeM) {
    const atm = atmosphereKpa(altitudeM || 0);
    return ((warmGaugeKpa + atm) / (coldGaugeKpa + atm)) * (coldC + 273.15) - 273.15 - coldC;
  }

  // ---------------------------------------------------------------- formatting

  function fmtPressure(kpa, unit) {
    if (kpa == null || !isFinite(kpa)) return "–";
    if (unit === "kpa") return Math.round(kpa / 5) * 5 + " kPa";
    if (unit === "psi") return Math.round(kpaToPsi(kpa)) + " psi";
    return (Math.round(kpa / 5) / 20).toFixed(2).replace(/0$/, "") + " bar";
  }
  // Every unit, for one figure: "2.4 bar (240 kPa, 35 psi)"
  function fmtAll(kpa, unit) {
    const units = ["bar", "kpa", "psi"];
    const main = units.includes(unit) ? unit : "bar";
    return fmtPressure(kpa, main) + " (" + units.filter((u) => u !== main).map((u) => fmtPressure(kpa, u)).join(", ") + ")";
  }
  function parsePressure(value, unit) {
    const v = parseFloat(String(value).replace(",", "."));
    if (!isFinite(v) || v <= 0) return null;
    if (unit === "kpa") return v;
    if (unit === "psi") return psiToKpa(v);
    return barToKpa(v);
  }

  root.TYRE_CALC = {
    psiToKpa,
    kpaToPsi,
    barToKpa,
    kpaToBar,
    KG_PER_LB,
    findSize,
    findType,
    loadRanges,
    loadCurve,
    requiredPressure,
    loadAt,
    roadPressure,
    assessPressure,
    tyreClass,
    parseTyreSize,
    curveForTyped,
    geometryFor,
    terrainRange,
    lowestPublished,
    applyLoadFloor,
    speedCap,
    hardDriving,
    atmosphereKpa,
    tyreVolume,
    torusLitres,
    reinflation,
    pressureAtTemp,
    tempRiseFor,
    fmtPressure,
    fmtAll,
    parsePressure,
  };
})(typeof window !== "undefined" ? window : globalThis);
