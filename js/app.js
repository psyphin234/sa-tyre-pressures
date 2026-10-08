/*
 * app.js: wires the form to calc.js and renders the result cards and
 * diagrams. No sourced numbers here: they come from data.js / tables.js.
 */
(function () {
  "use strict";

  const D = window.TYRE_DATA;
  const C = window.TYRE_CALC;
  const UI = window.TYRE_UI;
  const G = window.TYRE_DIAGRAMS;
  const { el } = UI;

  const form = document.getElementById("tyre-form");
  const $ = (id) => document.getElementById(id);
  const PRESSURE_FIELDS = ["placardFront", "placardRear", "planFront", "planRear"];
  const STORE_KEY = "tyre-pressures-v1";
  const CFM_TO_LPM = 28.3168;

  let unit = "bar";
  let terrainId = "sand";
  // "simple" (default): placard + terrain only. "advanced" (#advanced, #example): everything.
  let mode = "simple";
  let lastRanges = [null, null];

  // ------------------------------------------------------------ setup

  function fillSelect(select, options, value) {
    select.replaceChildren(...options.map((o) => el("option", { value: o.value }, o.label)));
    if (value != null && options.some((o) => String(o.value) === String(value))) select.value = String(value);
  }

  function buildTerrains() {
    const grid = $("terrain-grid");
    D.terrains.forEach((t) => {
      const img = (window.TYRE_IMAGES || []).find((i) => i.key === t.image);
      const b = el(
        "button",
        { type: "button", class: "terrain", role: "radio", "aria-checked": t.id === terrainId ? "true" : "false", "data-terrain": t.id },
        img ? el("img", { src: img.thumb || img.file, alt: "", loading: "lazy", width: 160, height: 100 }) : el("span", { class: "terrain-noimg" }),
        el("span", { class: "terrain-name" }, t.name)
      );
      b.addEventListener("click", () => {
        terrainId = t.id;
        grid.querySelectorAll(".terrain").forEach((x) => x.setAttribute("aria-checked", x.dataset.terrain === terrainId ? "true" : "false"));
        update();
      });
      grid.appendChild(b);
    });
  }

  // Pressures are entered and shown in bar. Older saves may hold kPa or psi
  // (the site used to offer them): convert those values once, on load.
  function convertSavedPressures(v) {
    if (!v || !v.unit || v.unit === "bar") return v;
    const out = { ...v, unit: "bar" };
    PRESSURE_FIELDS.forEach((name) => {
      const kpa = C.parsePressure(v[name], v.unit);
      if (kpa != null) out[name] = String(Math.round(kpa / 5) / 20);
    });
    return out;
  }

  // A kPa figure as a bar number, for an input field.
  function toUnitValue(kpa) {
    return String(Math.round(kpa / 5) / 20);
  }

  const fmt = (kpa) => C.fmtPressure(kpa, "bar");
  // A quoted figure without the site's 0.05 bar rounding (12 psi -> 0.83 bar, not 0.85).
  const fmtExact = (kpa) => (kpa / 100).toFixed(2) + " bar";

  /*
   * What's known about going below the lowest published pressure (sand and
   * mud): BFGoodrich's speed rule, the Humvee manual, and, for sand only, the
   * labelled field-practice note.
   */
  function goingLower(terrain, cls) {
    if (terrain !== "sand" && terrain !== "mud" && terrain !== "deepsnow") return null;
    const lowest = C.lowestPublished(terrain, cls);
    const below = UI.ruleById("bfg-below-1-5").params;
    const hm = UI.ruleById("army-hmmwv-sand").params;
    const items = [
      el("li", null, UI.categoryTag("tyre-maker"), ` BFGoodrich allows less than ${fmt(C.barToKpa(below.bar))} off-road only at ${below.maxKmh} km/h or slower, and only if the tyre still carries the load.`),
      el(
        "li",
        null,
        UI.categoryTag("engineering"),
        terrain === "sand" || terrain === "deepsnow"
          ? ` The US Army's Humvee manual runs its 37-inch tyres at ${fmtExact(C.psiToKpa(hm.sandFrontPsi))} front and ${fmtExact(C.psiToKpa(hm.sandRearPsi))} rear in sand (${fmtExact(C.psiToKpa(hm.mssFrontPsi))} / ${fmtExact(C.psiToKpa(hm.mssRearPsi))} for mud, sand and snow), at ${hm.maxKmh} km/h at most. Military tyres and wheels: not a figure for your 4x4.`
          : ` The US Army's Humvee manual uses ${fmtExact(C.psiToKpa(hm.mssFrontPsi))} front and ${fmtExact(C.psiToKpa(hm.mssRearPsi))} rear for mud, sand and snow, at ${hm.maxKmh} km/h at most. Military tyres and wheels: not a figure for your 4x4.`
      ),
    ];
    if (terrain === "sand") items.push(el("li", { class: "field-note" }, UI.categoryTag("field-practice"), " ", UI.ruleById("field-practice-sand").summary));
    return el("div", { class: "going-lower" }, el("h4", null, "Going lower than " + (lowest ? fmt(lowest.kpa) : "that")), el("ul", null, items));
  }

  const CLASS_NAME = { lt: "LT tyres", passenger: "passenger-type tyres" };

  /*
   * The words for a terrain answer, shared by Simple and Advanced. ranges are
   * the per-axle results of C.terrainRange; the numbers all come from them.
   */
  function terrainAdvice(t, cls, ranges, opts) {
    const loadKnown = opts && opts.loadKnown;
    const r = ranges.find(Boolean);
    const lines = [];
    if (!r) return { headline: t.name, lines };
    const b = fmt(Math.min(...ranges.filter(Boolean).map((x) => x.bottomKpa)));
    const tp = fmt(Math.max(...ranges.filter(Boolean).map((x) => x.topKpa)));
    const lowers = ranges.some((x) => x && x.bottomKpa < x.topKpa - 1);
    const below = UI.ruleById("bfg-below-1-5").params;
    const toyoSpeed = UI.ruleById("toyo-speeds").params;
    const dirtMax = UI.ruleById("toyo-20-percent").params.maxKmh;
    let headline;
    if (t.id === "tar") {
      headline = "Road pressure";
      lines.push(el("p", null, "Use the vehicle maker's placard pressure on the tar."));
    } else if (!r.sourced) {
      headline = "Keep road pressure";
      if (t.id === "rock") lines.push(el("p", null, "Cooper's rock figures are for LT tyres only, and no figure was found for passenger-type tyres. Go very slowly, and if you need more grip on a climb, lower cautiously: a tyre can puncture halfway up."));
      else lines.push(el("p", null, t.summary));
    } else if (t.id === "snow") {
      headline = "Keep road pressure";
      lines.push(el("p", { class: "answer-sub" }, "Bridgestone: letting air out doesn't help grip on snow or ice, and can damage the tyres."));
      lines.push(el("p", null, "Cold air lowers tyre pressure (about 0.07 bar for every 5.5°C), so check the tyres cold, at the temperature you'll drive in, and top up to the placard figure."));
    } else if (t.id === "sand" || t.id === "deepsnow") {
      const sandRule = UI.ruleById("bfg-africa-sand").params;
      headline = lowers ? (t.id === "deepsnow" ? "Off-road only: lower step by step, down to " : "Lower step by step, down to ") + b : "Keep road pressure";
      if (t.id === "deepsnow") lines.push(el("p", { class: "answer-sub" }, "No civilian tyre maker publishes deep-snow pressures, so these are your tyres' sand figures: deep soft snow is a flotation problem like sand."));
      else lines.push(el("p", { class: "answer-sub" }, r.kind === "cooper" ? `${b} is the lowest Cooper publishes for LT tyres in sand.` : `${b} is the lowest BFGoodrich (South Africa) publishes for sand.`));
      if (t.id === "sand") {
        const anim = el("figure", { class: "anim" });
        UI.photo(anim, "deflate-anim");
        lines.push(anim);
      }
      lines.push(
        el(
          "p",
          null,
          `Let air out ${fmt(C.barToKpa(sandRule.stepBar))} at a time until the tyres float. At ${fmt(C.barToKpa(sandRule.minBar))}, drive ${sandRule.maxKmhAtMin} km/h or slower` +
            (r.kind === "cooper" ? `, and slower still below that.` : `.`) +
            (t.id === "sand" ? ` Toyo suggests about ${toyoSpeed.sandAvgKmh} km/h on average in sand. Rest the tyres now and then: sand builds heat.` : ` Back to road pressure before any snowy road.`)
        )
      );
    } else if (t.id === "mud") {
      headline = lowers ? "Lower if you need to, down to " + b : "Keep road pressure";
      lines.push(el("p", { class: "answer-sub" }, r.kind === "cooper" ? `Cooper's range for LT tyres in mud.` : `${b} is the lowest BFGoodrich (South Africa) publishes for mud.`));
      lines.push(el("p", null, "There's no single best pressure: thick mud on a soft base needs lower, watery mud on a firm base can stay higher, and too low can cut traction. Keep it slow."));
    } else if (!lowers) {
      headline = "Keep " + tp;
      lines.push(el("p", null, "That's what your load needs, so there's no room to go lower here."));
    } else if (t.id === "rock" && r.kind === "toyo20") {
      headline = `Crawl, and drop about 20%: down to ${b}`;
      lines.push(el("p", { class: "answer-sub" }, "No tyre maker publishes a rock pressure for passenger-type tyres, so this is Toyo's 20 per cent rule for leaving the tar, as a cautious start."));
      lines.push(el("p", null, `Air down conservatively (BFGoodrich), especially before a climb: a tyre can puncture halfway up. Below about ${fmt(C.psiToKpa(20))} a tyre can be pushed off the rim (Cooper).`));
    } else if (t.id === "rock") {
      headline = `Very slow, low range: ${b}–${tp}`;
      lines.push(el("p", { class: "answer-sub" }, "Cooper's range for LT tyres on rock."));
      lines.push(el("p", null, `Lower pressure helps the tyre wrap over rocks without damage. Don't go below ${b}: below about ${fmt(C.psiToKpa(20))} the tyre can be pushed off the rim.`));
    } else if (r.kind === "toyo20") {
      headline = `Drop about 20%: down to ${b}`;
      lines.push(el("p", { class: "answer-sub" }, "Toyo's 20 per cent rule: 20% less pressure and 20% less speed than on the tar."));
      lines.push(el("p", null, (t.id === "corrugations" ? "Slow down on corrugations: they build heat in tyres quickly. " : "") + `${dirtMax} km/h at most on dirt.`));
    } else {
      headline = `Air down a little: ${b}–${tp}`;
      lines.push(el("p", { class: "answer-sub" }, `Cooper's range for LT tyres on ${t.name.toLowerCase()}. Heavier loads and faster driving: the higher end.`));
      lines.push(el("p", null, (t.id === "corrugations" ? "Slow down on corrugations: they build heat in tyres quickly. " : "Too low costs steering and stability at speed. ") + `${dirtMax} km/h at most on dirt.`));
    }
    if (lowers && !loadKnown) lines.push(el("p", { class: "note note--warn" }, "Only if the tyres can still carry the load. Add your tyre size and weight above, or use Advanced, to check."));
    lines.push(goingLower(t.id, cls));
    return { headline, lines, lowers };
  }

  const fmtAll = fmt; // bar only

  // ------------------------------------------------------------ state

  function readState() {
    const f = form.elements;
    const num = (name) => {
      const v = parseFloat(String(f[name].value).replace(",", "."));
      return isFinite(v) ? v : null;
    };
    return {
      frontKg: num("frontKg"),
      rearKg: num("rearKg"),
      placard: [C.parsePressure(f.placardFront.value, unit), C.parsePressure(f.placardRear.value, unit)],
      plan: [C.parsePressure(f.planFront.value, unit), C.parsePressure(f.planRear.value, unit)],
      speed: num("speed"),
      tyreClass: f.tyreClass ? f.tyreClass.value : "unsure",
      simpleSize: f.simpleSize.value.trim(),
      simpleLi: parseInt(f.simpleLi.value, 10),
      simpleKg: num("simpleKg"),
      beadlock: f.beadlock.checked,
      towing: f.towing.checked,
      flowLpm: num("flow") != null ? num("flow") * (f.flowUnit.value === "cfm" ? CFM_TO_LPM : 1) : null,
      freeFlow: f.freeFlow.checked,
      duty: num("duty"),
      switchMin: num("switchMin") != null ? num("switchMin") : 0,
      altitude: num("altitude") || 0,
    };
  }

  function save() {
    try {
      const f = form.elements;
      const values = {};
      Array.from(f).forEach((i) => {
        if (!i.name) return;
        if (i.type === "radio") {
          if (i.checked) values[i.name] = i.value;
        } else if (i.type === "checkbox") values[i.name] = i.checked;
        else values[i.name] = i.value;
      });
      values.terrain = terrainId;
      localStorage.setItem(STORE_KEY, JSON.stringify(values));
    } catch (e) {
      /* storage unavailable: inputs just aren't remembered */
    }
  }

  function restore() {
    let v = null;
    try {
      v = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    } catch (e) {
      v = null;
    }
    if (!v) return null;
    v = convertSavedPressures(v);
    if (v.terrain && D.terrains.some((t) => t.id === v.terrain)) terrainId = v.terrain;
    return v;
  }

  function applyValues(v) {
    const f = form.elements;
    Object.entries(v).forEach(([name, value]) => {
      if (["size", "type", "li", "range", "unit", "terrain", "simpleSize", "simpleLi"].includes(name)) return;
      // Blank axle loads keep the page's default bakkie figures.
      if ((name === "frontKg" || name === "rearKg") && value === "") return;
      const input = f[name];
      if (!input) return;
      if (input instanceof RadioNodeList) {
        Array.from(input).forEach((r) => (r.checked = r.value === value));
      } else if (input.type === "checkbox") input.checked = !!value;
      else input.value = value;
    });
  }

  // ------------------------------------------------------------ compute

  // Both modes use the typed tyre (simpleTyre) for the load table and air volume.
  function compute(st) {
    const tyre = simpleTyre(st);
    const curve = tyre && tyre.curve ? tyre.curve : null;
    const cls = tyre ? tyre.cls : st.tyreClass === "lt" ? "lt" : "passenger";
    const geometry = tyre && tyre.parsed ? C.geometryFor(tyre.parsed) : null;
    const axles = [
      { name: "Front", kg: st.frontKg, placard: st.placard[0], plan: st.plan[0] },
      { name: "Rear", kg: st.rearKg, placard: st.placard[1], plan: st.plan[1] },
    ].map((a) => {
      const wheelKg = a.kg != null ? a.kg / 2 : null;
      const need = curve ? C.requiredPressure(curve, wheelKg) : null;
      const road = C.roadPressure(a.placard, need && need.status !== "overload" ? need : null);
      const range = road.kpa != null ? C.applyLoadFloor(C.terrainRange(terrainId, road.kpa, cls), need && need.status === "ok" ? need.kpa : null) : null;
      const assess = a.plan != null && need && need.status !== "noLoad" ? C.assessPressure(a.plan, need, road.kpa, terrainId, cls) : null;
      return { ...a, wheelKg, need, road, range, assess };
    });
    return { tyre, curve, axles, cls, geometry, sizeLabel: tyre && tyre.parsed ? tyre.parsed.label : null, table: tyre && tyre.table ? tyre.table : null };
  }

  // ------------------------------------------------------------ render helpers

  function card(title, cls, ...children) {
    return el("section", { class: "card " + (cls || "") }, el("h3", null, title), children);
  }
  function status(kind, text) {
    return el("span", { class: "status status--" + kind }, text);
  }
  // ------------------------------------------------------------ cards

  // Why there's no load table for the typed tyre, in plain words.
  function noTableReason(tyre) {
    if (!tyre) return "Type your tyre size under Your tyres to see what your load needs.";
    if (!tyre.parsed) return "Couldn't read that tyre size. Try it like 265/60R18, LT265/75R16 or 31x10.50R15.";
    if (tyre.reason === "needsLi") return "Add the load index (the number after the size on the sidewall) to read the load table.";
    if (tyre.reason === "liOutOfRange") return "That load index isn't in the table here, so there's no load check.";
    return "There's no load table for this LT size here yet, so there's no load check.";
  }

  function loadCard(m) {
    if (!m.curve) return card("What your load needs", "card--load", el("p", { class: "muted" }, noTableReason(m.tyre)), UI.sourcesLink(["table-method", "table-lowest-pressure"]));
    const items = m.axles.map((a) => {
      const n = a.need;
      let body;
      if (!n || n.status === "noLoad") body = el("p", { class: "muted" }, "Enter the axle load to see what this axle's tyres need.");
      else if (n.status === "overload")
        body = el(
          "p",
          null,
          status("fail", "Overloaded"),
          " ",
          `${Math.round(a.wheelKg)} kg per tyre is more than this tyre's maximum of ${Math.round(n.maxKg)} kg (at ${fmtAll(n.tableMaxKpa)}). No pressure fixes that: you need tyres with a higher load rating, or less load. Not allowed on public roads (reg 238).`
        );
      else if (n.status === "belowTable")
        body = el(
          "p",
          null,
          status("pass", "Carried"),
          " ",
          `${Math.round(a.wheelKg)} kg per tyre is carried even at the table's lowest pressure, ${fmtAll(n.tableMinKpa)} (${Math.round(n.minKg)} kg). The table says nothing below that.`
        );
      else body = el("p", null, status("pass", "Needs " + fmt(n.kpa)), " ", `At least ${fmtAll(n.kpa)} to carry ${Math.round(a.wheelKg)} kg per tyre.`);
      const extra = [];
      if (a.road.raisedForLoad)
        extra.push(el("p", { class: "note note--warn" }, `Your placard pressure (${fmt(a.placard)}) is lower than this load needs, so road pressure here is ${fmt(a.road.kpa)}.`));
      return el("div", { class: "axle-block" }, el("h4", null, a.name + (a.kg ? ` · ${Math.round(a.kg)} kg axle` : "")), body, extra);
    });
    return card(
      "What your load needs",
      "card--load",
      el("p", { class: "muted" }, "Load table: ", el("strong", null, m.curve.marking), " (", m.curve.label, ")."),
      items,
      UI.sourcesLink(["table-method", "table-lowest-pressure", "law-reg238", "toyo-load-index"].concat(m.table === "michelin-750r16" ? ["michelin-750r16-axle"] : []))
    );
  }

  function terrainCard(m, st) {
    const t = D.terrains.find((x) => x.id === terrainId);
    const figure = el("figure", { class: "card-photo" });
    UI.photo(figure, t.image);
    const rows = m.axles.map((a) => {
      if (!a.range) return el("li", null, el("strong", null, a.name + ": "), "enter the placard pressure or the axle load.");
      if (a.range.bottomKpa >= a.range.topKpa - 1)
        return el("li", null, el("strong", null, a.name + ": "), fmtAll(a.range.topKpa), a.range.sourced ? "" : ", no published figure for going lower");
      return el(
        "li",
        null,
        el("strong", null, a.name + ": "),
        `${fmt(a.range.topKpa)} down to ${fmt(a.range.bottomKpa)}`,
        a.range.steps.length > 2 ? ", in steps: " + a.range.steps.map(fmt).join(" → ") : ""
      );
    });
    const extra = [];
    const hdRule = UI.ruleById("etrto-hard-driving").params;
    if (t.id === "tar" && st.towing) {
      const hd = m.axles.map((a) => ({ a, h: m.table ? C.hardDriving({ table: m.table }, a.road.kpa) : null }));
      if (hd.some((x) => x.h))
        extra.push(
          el(
            "p",
            { class: "note" },
            "Towing or sustained high speed: ETRTO recommends ",
            hd
              .filter((x) => x.h)
              .map((x) => `${x.a.name.toLowerCase()} ${fmt(x.h.fromKpa)}–${fmt(x.h.toKpa)}`)
              .join(", "),
            hd[0].h && hd[0].h.higherCapKpa ? ` (not above ${fmt(hd[0].h.capKpa)}, or ${fmt(hd[0].h.higherCapKpa)} if your tyre's speed symbol is H, V, W or Y), unless your vehicle handbook says otherwise.` : " (not above the tyre's maximum), unless your vehicle handbook says otherwise."
          )
        );
      else extra.push(el("p", { class: "note" }, `ETRTO's towing advice (${fmt(hdRule.addMinKpa)}–${fmt(hdRule.addMaxKpa)} extra) is for passenger-type tyres; nothing equivalent was found for LT tyres. Check your vehicle handbook.`));
    }
    const advice = terrainAdvice(t, m.cls, m.axles.map((x) => x.range), { loadKnown: m.axles.some((a) => a.need && a.need.status !== "noLoad") });
    if (m.axles.some((a) => a.range && a.range.raised))
      extra.push(el("p", { class: "note note--warn" }, "The bottom of the range is raised to what your load needs: the law doesn't allow less on public roads, gravel included."));
    return card(
      "Terrain: " + t.name,
      "card--terrain",
      figure,
      el("p", { class: "answer-headline" }, advice.headline),
      el("p", { class: "muted" }, "For " + CLASS_NAME[m.cls] + ", from your tyre choice."),
      el("ul", { class: "range-list" }, rows),
      advice.lines,
      extra,
      UI.sourcesLink(t.ruleIds)
    );
  }

  const BAND = {
    road: { kind: "pass", label: "Road pressure", text: "At or above road pressure." },
    belowPlacard: { kind: "info", label: "Below placard, load carried", text: "Below the vehicle maker's road pressure, but the tables say the tyre still carries your load. Go back up to road pressure before the tar." },
    belowLoad: { kind: "fail", label: "Below what your load needs", text: "Below the pressure the tables say your load needs: the tyre is carrying more than the standard allows at this pressure. Not for public roads. BFGoodrich only allows lower pressure if the tyre still has enough load capacity, and says to slow down." },
    belowTable: { kind: "warn", label: "Below the tables", text: "Below the lowest pressure in the published tables, so there's no load figure here. Off-road only, and slowly." },
    overload: { kind: "fail", label: "Overloaded", text: "The load is more than this tyre's maximum at any pressure." },
  };

  function planCard(m, st) {
    const withPlan = m.axles.filter((a) => a.assess);
    const diagram = el("div", { class: "diagram ladders" });
    const shown = m.axles.filter((a) => a.need && a.need.status !== "noLoad" && a.need.status !== "overload");
    if (shown.length) {
      const bfg = C.barToKpa(UI.ruleById("bfg-below-1-5").params.bar);
      const maxKpa = Math.max(300, ...shown.map((a) => Math.max(a.road.kpa || 0, a.plan || 0, a.need.kpa || 0) + 40));
      shown.forEach((a) =>
        diagram.appendChild(
          G.ladder({ name: a.name, roadKpa: a.road.kpa, floorKpa: a.need.kpa, tableMinKpa: a.need.tableMinKpa, planKpa: a.plan, status: a.need.status, range: a.range }, { fmt, bfgKpa: bfg, maxKpa })
        )
      );
      const sw = (cls, label) => el("li", null, el("span", { class: "swatch " + cls }), label);
      diagram.appendChild(
        el(
          "ul",
          { class: "legend" },
          sw("z-road", "road pressure"),
          sw("z-loadok", "load carried (tables)"),
          sw("z-belowload", "below what the load needs"),
          sw("z-nodata", "below the tables: no data"),
          sw("swatch--plan", "your plan"),
          sw("swatch--range", "terrain range"),
          sw("swatch--bfg", "below " + fmt(bfg) + ": " + UI.ruleById("bfg-below-1-5").params.maxKmh + " km/h max (BFGoodrich)")
        )
      );
    }
    const rows = withPlan.map((a) => {
      const b = BAND[a.assess.band];
      const lines = [el("p", null, status(b.kind, b.label), " ", b.text)];
      if (a.assess.maxKmh) {
        const au = UI.ruleById("bfg-au-20psi").params;
        lines.push(el("p", { class: "note note--warn" }, `Below ${fmt(C.barToKpa(UI.ruleById("bfg-below-1-5").params.bar))}: ${a.assess.maxKmh} km/h or less (BFGoodrich UK).` + (a.assess.flags.includes("bfg-au-20psi") ? ` BFGoodrich Australia: below ${au.psi} psi, ${au.maxKmh} km/h or less.` : "")));
      }
      const lowFlag = a.assess.flags.find((f) => f.startsWith("below-published:"));
      if (lowFlag) {
        const lowest = C.lowestPublished(terrainId, m.cls);
        lines.push(el("p", { class: "note note--fail" }, `Below ${fmt(lowest.kpa)}, the lowest a tyre maker publishes for ${CLASS_NAME[m.cls]} on ${D.terrains.find((x) => x.id === terrainId).name.toLowerCase()}.`));
      }
      if (st.speed != null && a.assess.maxKmh && st.speed > a.assess.maxKmh)
        lines.push(el("p", { class: "note note--fail" }, `You plan ${st.speed} km/h; the limit at this pressure is ${a.assess.maxKmh} km/h.`));
      else if (st.speed != null && (a.assess.band === "belowLoad" || a.assess.band === "belowTable") && !a.assess.maxKmh)
        lines.push(el("p", { class: "note note--warn" }, `You plan ${st.speed} km/h. No tyre maker found gives a speed for this pressure, only that you must slow down.`));
      if (!a.assess.publicRoad) lines.push(el("p", { class: "note" }, "Public roads, gravel included: reinflate first (reg 238)."));
      return el("div", { class: "axle-block" }, el("h4", null, `${a.name}: ${fmtAll(a.plan)}`), lines);
    });
    return card(
      "Your planned pressure",
      "card--plan",
      withPlan.length ? null : el("p", { class: "muted" }, "Enter the pressure you plan to run (step 5), or tap \"Use the bottom of the range\"."),
      diagram,
      rows,
      UI.sourcesLink(["bfg-speed-load", "bfg-below-1-5", "bfg-au-20psi", "law-reg238", "toyo-vehicle-maker-minimum"])
    );
  }

  function safetyCard(m, st) {
    const lowered = m.axles.some((a) => a.plan != null && a.road.kpa != null && a.plan < a.road.kpa - 0.5);
    const items = [
      ["Reinflate before the road", "Back to road pressure before the tar. On any public road, gravel included, the law also needs at least the pressure your load needs.", ["bfg-reinflate", "ford-off-road", "etrto-off-road", "law-reg238", "law-public-road"]],
      ["Heat", "Low pressure plus load plus speed makes heat, a tyre's greatest enemy. Slow down when you air down.", ["bfg-air-carries-load", "bfg-speed-load", "nhtsa-deflection-heat"]],
      ["Temperature", "Set pressures cold (morning, or parked at least an hour). Warm tyres read 20% or more higher: never let air out to reach a cold figure, and recheck once cool after airing down or pumping up warm tyres. Keep tyres away from anything over 90°C.", ["etrto-hot-pressure", "toyo-cold", "nhtsa-temperature", "calc-temperature", "etrto-90c"]],
      ["After the trail", "Check every tyre for cuts, exposed cords and bulges before the road; those make a tyre illegal on public roads.", ["ford-off-road", "law-reg212"]],
      ["No compressor", "Don't air down far. BFGoodrich: without a compressor drive very slowly and only short distances.", ["bfg-sand"]],
    ];
    if (lowered) items.splice(1, 0, ["Side slopes and the bead", "Low pressure plus a sideways push can roll a bead off the rim. Run road pressure across steep side slopes.", ["bfg-side-slopes", "etrto-hump-rims", "etrto-underinflation"]]);
    if (st.beadlock) items.push(["Beadlocks", "They hold the bead, but the air still carries the load, so the floor and speed limits don't change. Ford approves true beadlocks off-road only.", ["ford-beadlock", "bfg-air-carries-load"]]);
    return card(
      "Safety",
      "card--safety",
      el(
        "ul",
        { class: "safety-list" },
        items.map(([title, text]) => el("li", null, el("strong", null, title + ". "), text))
      ),
      UI.sourcesLink([...new Set(items.flatMap((i) => i[2]))])
    );
  }

  function pumpCard(m, st) {
    if (!m.geometry) return card("Pumping back up", "card--pump", el("p", { class: "muted" }, "Type your tyre size under Your tyres (or check it) to estimate how much air it takes to pump back up."), UI.sourcesLink(["calc-free-air", "calc-air-volume"]));
    const vol = C.tyreVolume(m.geometry);
    const axles = m.axles
      .filter((a) => a.road.kpa != null)
      .map((a) => ({ name: a.name, fromKpa: a.plan != null && a.plan < a.road.kpa ? a.plan : a.road.kpa, toKpa: a.road.kpa }));
    if (!axles.length || axles.every((a) => a.toKpa <= a.fromKpa))
      return card("Pumping back up", "card--pump", el("p", { class: "muted" }, "Enter a planned pressure below road pressure to see how much air and time it takes to pump back up."), UI.sourcesLink(["calc-free-air", "calc-air-volume"]));
    const r = C.reinflation({ volumeL: vol.litres, axles, altitudeM: st.altitude, flowLpm: st.flowLpm, dutyPercent: st.duty, switchMin: st.switchMin });
    const lines = [
      el("p", null, `Air in one ${m.sizeLabel} tyre: about ${Math.round(vol.litres)} L`, vol.published ? " (published by the tyre maker)." : " (estimated from its size)."),
      el(
        "ul",
        null,
        r.perAxle.map((a) => el("li", null, `${a.name}: ${fmt(a.fromKpa)} → ${fmt(a.toKpa)} needs about ${Math.round(a.perTyreL)} L of free air per tyre (${Math.round(a.axleL)} L for the axle).`))
      ),
      el("p", null, el("strong", null, `Total: about ${Math.round(r.totalL)} L`), ` at ${Math.round(st.altitude)} m, where the air pressure is about ${(r.atmKpa / 100).toFixed(2)} bar.`),
    ];
    if (r.runMin != null) {
      const mins = (x) => (x < 1 ? "under a minute" : `about ${Math.round(x)} min`);
      const atLeast = st.freeFlow ? "at least " : "";
      lines.push(el("p", { class: "big" }, `Time for all four tyres: ${atLeast}${mins(r.totalMin)}.`));
      const parts = [`pumping ${mins(r.runMin)}`];
      if (r.duty < 1) parts.push(`rests for the compressor ${mins(r.elapsedMin - r.runMin)} (${Math.round(r.duty * 100)}% duty cycle)`);
      if (r.moveMin > 0) parts.push(`moving between tyres ${mins(r.moveMin)} (${r.tyres - 1} moves of ${st.switchMin} min)`);
      lines.push(el("p", null, "That's " + parts.join(", ") + "."));
      const perTyre = r.runMin / 4;
      lines.push(el("p", null, `Pumping alone is ${perTyre < 1 ? "under a minute" : "about " + Math.round(perTyre * 10) / 10 + " min"} per tyre on average.`));
      if (st.freeFlow) lines.push(el("p", { class: "note" }, "Free-flow ratings are measured with nothing to push against. Into a tyre at 2–3 bar a compressor delivers less, so expect longer."));
    } else lines.push(el("p", { class: "muted" }, "Enter your compressor's flow (step 6) for a time."));
    lines.push(el("p", { class: "note" }, "The air comes out warm and the pressure drops a little as it cools: check again once the tyres are cold."));
    return card("Pumping back up", "card--pump", lines, UI.sourcesLink(["calc-free-air", "calc-air-volume", "calc-altitude"]));
  }

  function gapsCard() {
    const ids = ["gap-below-tables", "gap-speed", "gap-sans1550"];
    if (["gravel", "corrugations", "rock", "snow"].includes(terrainId)) ids.unshift("gap-terrain");
    if (terrainId === "sand") ids.unshift("gap-sand-low");
    return card(
      "What isn't known",
      "card--gaps",
      el("ul", null, ids.map((id) => D.gaps.find((g) => g.id === id)).map((g) => el("li", null, el("strong", null, g.title + ". "), g.text))),
      el("p", { class: "read-more" }, el("a", { href: "sources.html#gaps" }, "All the gaps"))
    );
  }

  // ------------------------------------------------------------ simple mode

  /*
   * Simple's optional tyre, typed as on the sidewall. The typed marks (LT, two
   * load indices, XL) win over the LT / passenger buttons.
   */
  function simpleTyre(st) {
    const parsed = C.parseTyreSize(st.simpleSize);
    if (!st.simpleSize || !parsed) return parsed === null && st.simpleSize ? { parsed: null, curve: null, cls: st.tyreClass === "lt" ? "lt" : "passenger", reason: "unreadable" } : null;
    const r = C.curveForTyped(parsed, st.tyreClass === "lt", st.simpleLi > 0 ? st.simpleLi : null);
    return { parsed, ...r };
  }

  // Show what was read from the size box, and ask for the load index if needed.
  function simpleTyreChanged() {
    const st = readState();
    const tyre = simpleTyre(st);
    const read = $("simple-size-read");
    // Passenger-type tyres need a load index; ask for it unless it's in the size text.
    $("simple-li-field").hidden = !(tyre && tyre.parsed && tyre.cls === "passenger" && !tyre.parsed.li);
    if (!tyre) {
      read.textContent = "As on the sidewall, e.g. 265/60R18, LT265/75R16 or 31x10.50R15. Add the load index if you know it (the number after the size).";
      return;
    }
    if (!tyre.parsed) {
      read.textContent = "Couldn't read that size. Try it like 265/60R18, LT265/75R16 or 31x10.50R15.";
      return;
    }
    const pz = tyre.parsed;
    const kind = tyre.cls === "lt" ? "LT (light truck)" : pz.xl ? "passenger-type, Extra Load" : "passenger-type";
    const li = pz.li || tyre.li;
    const parts = ["Read as " + (tyre.cls === "lt" && pz.kind === "metric" ? "LT" : "") + pz.label + ", " + kind];
    if (li && tyre.cls === "passenger") parts.push("load index " + li + " (" + window.TYRE_TABLES.loadIndexKg[li] + " kg max per tyre)");
    let text = parts.join(", ") + ".";
    if (pz.oddWidth) text += ` ${pz.widthMm} isn't a usual width (they end in 5, like ${Math.round((pz.widthMm - 5) / 10) * 10 + 5}); check the sidewall.`;
    if (pz.oddAspect) text += ` ${pz.aspect} isn't a usual height: the middle number is the sidewall height as a % of the width, usually 30–95 (e.g. 265/65R17).`;
    if (tyre.reason === "noLtTable") text += " There's no load table for this LT size here yet, so no weight check.";
    if (tyre.reason === "liOutOfRange") text += " That load index isn't in the table here, so no weight check.";
    read.textContent = text;
  }

  /*
   * Simple: road pressure from the placard and the terrain, nothing else. If
   * only one axle's placard figure is entered, it's used for both.
   */
  function simpleResults(st) {
    const t = D.terrains.find((x) => x.id === terrainId);
    const front = st.placard[0] || st.placard[1];
    const rear = st.placard[1] || st.placard[0];
    const figure = el("figure", { class: "card-photo" });
    UI.photo(figure, t.image);
    const toAdvanced = el("p", { class: "to-advanced" }, "Carrying a heavy load or towing? ", el("a", { href: "#advanced", "data-go": "advanced" }, "Advanced"), " checks your tyres can carry the load at the pressure you pick.");
    if (!front) {
      return [
        card(t.name, "card--simple", figure, el("p", { class: "lede-small" }, "Enter the road pressure from your tyre placard to see what to run on " + t.name.toLowerCase() + ".")),
        toAdvanced,
      ];
    }
    const tyre = simpleTyre(st);
    const cls = tyre ? tyre.cls : st.tyreClass === "lt" ? "lt" : "passenger";
    // Load check: one total weight shared evenly over four tyres.
    const perTyreKg = tyre && tyre.curve && st.simpleKg > 0 ? st.simpleKg / 4 : null;
    const need = perTyreKg ? C.requiredPressure(tyre.curve, perTyreKg) : null;
    const floor = need && need.status === "ok" ? need.kpa : null;
    const axles = [
      { name: "Front", placard: front },
      { name: "Rear", placard: rear },
    ].map((a) => {
      const road = C.roadPressure(a.placard, need && need.status !== "overload" ? need : null);
      return { ...a, road, r: C.applyLoadFloor(C.terrainRange(terrainId, road.kpa, cls), floor) };
    });
    const advice = terrainAdvice(t, cls, axles.map((a) => a.r), { loadKnown: !!need });
    const lowers = advice.lowers;
    const answer = el(
      "div",
      { class: "answer" },
      axles.map((a) =>
        el(
          "div",
          { class: "answer-axle" },
          el("span", { class: "answer-name" }, a.name),
          el("span", { class: "answer-value" }, a.r.bottomKpa < a.r.topKpa - 1 ? fmt(a.r.topKpa) + " → " + fmt(a.r.bottomKpa) : fmt(a.r.topKpa)),
          a.r.steps.length > 2 ? el("span", { class: "answer-steps" }, "steps: " + a.r.steps.map(fmt).join(" · ")) : null
        )
      )
    );
    const headline = advice.headline;
    const notes = advice.lines;
    const loadLines = [];
    if (tyre && tyre.table === "michelin-750r16" && axles.some((a) => a.r.kind === "cooper"))
      loadLines.push(el("p", { class: "note" }, "Cooper says narrow commercial-style tyres like this one need higher pressures than its ranges, which are for average LT sizes."));
    if (tyre && tyre.parsed && tyre.cls === "lt" && st.tyreClass !== "lt") loadLines.push(el("p", { class: "muted" }, `${tyre.parsed.label} is marked as an LT tyre, so this is the LT answer.`));
    if (need) {
      const kg = Math.round(perTyreKg);
      if (need.status === "overload") loadLines.push(el("p", { class: "note note--fail" }, `About ${kg} kg per tyre is more than these tyres can carry at any pressure (${Math.round(need.maxKg)} kg). You need tyres with a higher load rating, or less weight.`));
      else if (need.status === "belowTable") loadLines.push(el("p", { class: "note" }, `About ${kg} kg per tyre: these tyres carry that even at the lowest pressure in their load table (${fmt(need.tableMinKpa)}).`));
      else loadLines.push(el("p", { class: "note" }, `About ${kg} kg per tyre: these tyres need at least ${fmt(need.kpa)} to carry it, according to their load table.`));
      if (axles.some((a) => a.road.raisedForLoad)) loadLines.push(el("p", { class: "note note--warn" }, "Your placard pressure is lower than this weight needs, so road pressure here is raised to match."));
      if (axles.some((a) => a.r.raised)) loadLines.push(el("p", { class: "note note--warn" }, `The bottom of the range is raised to ${fmt(floor)}, what your weight needs: the law doesn't allow less on public roads, gravel included.`));
      if (axles.some((a) => a.r.belowFloor)) loadLines.push(el("p", { class: "note note--warn" }, `Below ${fmt(floor)} your tyres are carrying more than their load table allows. The makers allow that off-road only if the tyre still carries the load, and slowly; keep off public roads until you've pumped up.`));
      loadLines.push(el("p", { class: "muted small" }, "This assumes the weight is shared evenly by all four tyres. A loaded bakkie's rear tyres carry more, so leave some margin, or use Advanced with weighbridge axle weights."));
    }
    // Weight notes go right after the "lowest published" line under the headline.
    const subAt = notes.findIndex((n) => n && n.classList && n.classList.contains("answer-sub"));
    notes.splice(subAt + 1, 0, ...loadLines);
    const before = [
      ["Reinflate before the tar", "back to road pressure before you drive on tar."],
      ["Carry a gauge and a compressor", "check pressures cold, and pump back up before the road."],
      ["Set pressures cold", "first thing in the morning, or after at least an hour parked. Warm tyres read 20% or more higher, so never let air out to reach a cold figure. Air down warm tyres and they'll drop a little more as they cool."],
    ];
    if (lowers) before.splice(1, 0, ["Side slopes", "go back to road pressure before crossing a steep slope, or a tyre can come off the rim."]);
    const ids = t.ruleIds.concat(["bfg-reinflate", "ford-off-road", "etrto-hot-pressure", "toyo-cold", "nhtsa-temperature", "calc-temperature"]);
    return [
      card(
        t.name,
        "card--simple",
        figure,
        el("p", { class: "answer-headline" }, headline),
        answer,
        notes,
        el("h4", null, "Before you go"),
        el("ul", { class: "before-list" }, before.map(([b, rest]) => el("li", null, el("strong", null, b), ": " + rest))),
        UI.sourcesLink(ids)
      ),
      toAdvanced,
    ];
  }

  function setMode(next, updateHash) {
    mode = next === "advanced" ? "advanced" : "simple";
    document.querySelectorAll(".mode-button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    document.querySelectorAll("[data-modes]").forEach((node) => {
      node.hidden = node.dataset.modes.split(" ").indexOf(mode) === -1;
    });
    if (updateHash) history.replaceState(null, "", mode === "advanced" ? "#advanced" : location.pathname + location.search);
  }

  // ------------------------------------------------------------ update

  function update() {
    const st = readState();
    const body = $("results-body");
    if (mode === "simple") {
      body.replaceChildren(...simpleResults(st));
      body.querySelectorAll("[data-go]").forEach((a) =>
        a.addEventListener("click", (e) => {
          e.preventDefault();
          setMode(a.dataset.go, true);
          update();
          $("tyre-form").scrollIntoView({ behavior: "smooth" });
        })
      );
      save();
      return;
    }
    const m = compute(st);
    lastRanges = m.axles.map((a) => a.range);
    body.replaceChildren(loadCard(m), terrainCard(m, st), planCard(m, st), safetyCard(m, st), pumpCard(m, st), gapsCard());
    renderDynamicDiagrams(m);
    save();
  }

  function renderDynamicDiagrams(m) {
    const heavier = m.axles.reduce((best, a) => (a.wheelKg && (!best || a.wheelKg > best.wheelKg) ? a : best), null);
    const wheelKg = heavier ? heavier.wheelKg : 600;
    const road = heavier && heavier.road.kpa ? heavier.road.kpa : 240;
    const pressures = [road, road * (2 / 3), Math.max(C.barToKpa(UI.ruleById("bfg-sand").params.minBar), road / 2)].filter((p, i, arr) => arr.findIndex((q) => Math.abs(q - p) < 5) === i);
    document.querySelectorAll('[data-diagram="footprint"]').forEach((d) => {
      d.replaceChildren(G.footprint(wheelKg, pressures, { fmt }), el("p", { class: "diagram-caption" }, `One tyre carrying ${Math.round(wheelKg)} kg${heavier ? " (your heavier axle)" : " (example)"}. Area ≈ load ÷ pressure.`));
    });
    const rise = UI.ruleById("etrto-hot-pressure").params.warmRiseFraction;
    document.querySelectorAll('[data-diagram="hotcold"]').forEach((d) => d.replaceChildren(G.hotCold(road, rise, fmt)));
    const alt = readState().altitude;
    const setC = 20;
    const temps = [0, 10, 20, 30, 40];
    const warmRise = C.tempRiseFor(road, road * (1 + rise), setC, alt);
    document.querySelectorAll('[data-diagram="temptable"]').forEach((d) =>
      d.replaceChildren(
        el(
          "table",
          { class: "temp-table" },
          el("caption", null, `A tyre set to ${fmt(road)} with the air at ${setC}°C reads:`),
          el("thead", null, el("tr", null, el("th", { scope: "col" }, "Air temperature"), temps.map((t) => el("th", { scope: "col" }, t + "°C")), el("th", { scope: "col" }, "After driving"))),
          el(
            "tbody",
            null,
            el(
              "tr",
              null,
              el("th", { scope: "row" }, "Gauge reads"),
              temps.map((t) => el("td", { class: t === setC ? "set" : null }, fmt(C.pressureAtTemp(road, setC, t, alt)))),
              el("td", null, "about " + fmt(road * (1 + rise)))
            )
          )
        ),
        el("p", { class: "diagram-caption" }, `"After driving" is ETRTO's normal 20% rise: the air inside about ${Math.round(warmRise)}°C warmer than it was. Same air in the tyre throughout.`)
      )
    );
  }

  function renderStatic() {
    const ctisRule = UI.ruleById("army-ctis-modes");
    const map = { markings: () => G.markings(), deflection: () => G.deflection(), bead: () => G.bead(), ctis: () => G.ctis(ctisRule.params.modes) };
    document.querySelectorAll("[data-diagram]").forEach((d) => {
      const f = map[d.dataset.diagram];
      if (f) d.replaceChildren(f());
    });
    document.querySelectorAll("p.read-more[data-rules]").forEach((p) => {
      const links = UI.sourcesLink(p.dataset.rules.split(" "), "Sources");
      if (links) p.replaceWith(links);
    });
    document.querySelectorAll("figure[data-image]").forEach((f) => UI.photo(f, f.dataset.image));
  }

  // ------------------------------------------------------------ init

  // A made-up example (not any real vehicle's figures), loaded by #example.
  const EXAMPLE = {
    unit: "bar",
    terrain: "sand",
    tyreClass: "passenger",
    simpleSize: "265/65R17 112T",
    simpleKg: "2800",
    frontKg: "1300",
    rearKg: "1500",
    placardFront: "2.3",
    placardRear: "2.5",
    planFront: "1.6",
    planRear: "1.6",
    speed: "30",
    flow: "72",
    duty: "50",
    altitude: "1000",
  };

  function init() {
    let saved = restore();
    if (location.hash === "#advanced" || location.hash === "#example") mode = "advanced";
    if (location.hash === "#example") {
      saved = EXAMPLE;
      unit = EXAMPLE.unit;
      terrainId = EXAMPLE.terrain;
    }
    window.addEventListener("hashchange", () => {
      if (location.hash === "#example") location.reload();
    });
    if (saved) applyValues(saved);
    if (saved && saved.simpleSize) {
      // Older saves stored a size id ("265-65r17"); show it as a size instead.
      const old = C.findSize(saved.simpleSize);
      $("simpleSize").value = old ? old.label : saved.simpleSize;
    }
    if (saved && saved.simpleLi) $("simpleLi").value = saved.simpleLi;
    simpleTyreChanged();
    buildTerrains();
    renderStatic();
    setMode(mode, false);
    document.querySelectorAll(".mode-button").forEach((b) =>
      b.addEventListener("click", () => {
        setMode(b.dataset.mode, true);
        update();
      })
    );

    form.addEventListener("input", (e) => {
      if (e.target.name === "simpleSize" || e.target.name === "tyreClass" || e.target.name === "simpleLi") simpleTyreChanged();
      update();
    });
    $("use-bottom").addEventListener("click", () => {
      ["planFront", "planRear"].forEach((name, i) => {
        if (lastRanges[i]) form.elements[name].value = toUnitValue(lastRanges[i].bottomKpa);
      });
      update();
    });
    $("year").textContent = new Date().getFullYear();
    update();
  }

  init();
})();
