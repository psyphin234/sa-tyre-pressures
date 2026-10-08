/*
 * sources.js: builds sources.html from data.js, tables.js and images.js.
 * Each rule has an anchor (#rule-id) that the calculator's "Read more" links use.
 */
(function () {
  "use strict";

  const D = window.TYRE_DATA;
  const T = window.TYRE_TABLES;
  const { el, externalLink, categoryTag, formatDate } = window.TYRE_UI;

  const GROUPS = [
    ["law", "South African law"],
    ["standard", "Standards (ETRTO, TRA)"],
    ["tyre-maker", "Tyre makers"],
    ["vehicle-maker", "Vehicle makers"],
    ["engineering", "Engineering research"],
    ["calculation", "This site's own calculations (physics)"],
    ["field-practice", "Field practice (experience, not from any maker; shown at the owner's request)"],
  ];

  function sourceLink(id) {
    const s = D.sources[id];
    return s ? el("li", null, externalLink(s.url, s.label)) : null;
  }

  // withAnchor: false for the copies shown at the top (?show=), so ids stay unique.
  function renderRule(r, withAnchor) {
    return el(
      "li",
      withAnchor === false ? { class: "source-item" } : { class: "source-item", id: r.id, tabindex: "-1" },
      el("h3", null, r.title, " ", categoryTag(r.category)),
      el("p", null, r.summary),
      r.quote ? el("blockquote", null, "“", r.quote, "”") : null,
      r.regulation ? el("p", { class: "source-meta" }, el("strong", null, "Regulation: "), r.regulation) : null,
      r.sources.length
        ? el("ul", { class: "source-meta" }, r.sources.map(sourceLink))
        : el("p", { class: "source-meta" }, r.category === "field-practice" ? "No published source: the experience of the site's owner and other drivers." : "No outside source: worked out from physics, as described."),
      r.notes && r.notes.length ? el("ul", { class: "source-meta" }, r.notes.map((n) => el("li", null, n))) : null,
      el("p", { class: "source-meta" }, "Last checked: ", formatDate(r.checked))
    );
  }

  document.getElementById("rule-groups").replaceChildren(
    ...GROUPS.map(([cat, title]) => {
      const rules = D.rules.filter((r) => r.category === cat);
      if (!rules.length) return null;
      return el("section", null, el("h3", { class: "group-title" }, title, " (", String(rules.length), ")"), el("ul", { class: "source-groups" }, rules.map((r) => renderRule(r))));
    }).filter(Boolean)
  );

  // Load tables: what's in them and where they came from.
  const tableIds = ["etrto-sl", "etrto-xl", "tra-lt", "tra-flotation", "michelin-750r16"];
  const bar = (psi) => (Math.round(psi * 0.0689476 * 20) / 20).toFixed(2).replace(/0$/, "");
  document.getElementById("table-info").replaceChildren(
    el("p", null, "Loads per tyre at each pressure, typed out of the source as published (pounds and psi; shown here in bar), checked row by row against the page and by script (every row rises with pressure and ends at its load index's rated load). The calculator converts them to kg and kPa, and reads between two published pressures in a straight line."),
    el(
      "ul",
      { class: "source-list" },
      tableIds.map((id) => {
        const t = T[id];
        let what;
        if (t.rowsLb) {
          const lis = Object.keys(t.rowsLb).map(Number);
          what = `load indices ${Math.min(...lis)}–${Math.max(...lis)}, ${bar(t.psi[0])}–${bar(t.psi[t.psi.length - 1])} bar`;
        } else if (t.sizes) what = Object.keys(t.sizes).join(", ") + ` (from ${bar(Object.values(t.sizes)[0].single[0][0])} bar)`;
        else what = `axle loads, ${bar(t.axleKg[0][0])}–${bar(t.axleKg[t.axleKg.length - 1][0])} bar`;
        return el("li", null, el("strong", null, t.label + ": "), what + ". ", t.where + ". ", externalLink(D.sources[t.source].url, "Source"));
      })
    )
  );

  document.getElementById("gap-list").replaceChildren(...D.gaps.map((g) => el("li", { class: "source-item", id: g.id }, el("h3", null, g.title), el("p", null, g.text))));

  document.getElementById("source-docs").replaceChildren(
    ...Object.entries(D.sources).map(([id, s]) => el("li", null, categoryTag(s.kind), " ", externalLink(s.url, s.label)))
  );

  document.getElementById("credit-list").replaceChildren(
    ...(window.TYRE_IMAGES || []).map((i) =>
      i.own
        ? el("li", null, el("strong", null, i.caption + " "), "Photo by PsyPhin, used on this site with permission.")
        : el(
        "li",
        null,
        el("strong", null, i.caption + " "),
        externalLink(i.page, i.title),
        " by ",
        i.authorUrl ? externalLink(i.authorUrl, i.author) : i.author,
        ", ",
        i.licenseUrl ? externalLink(i.licenseUrl, i.license) : i.license,
        "."
      )
    )
  );

  // sources.html?show=a,b: the calculator card's sources, at the top.
  const show = (new URLSearchParams(location.search).get("show") || "")
    .split(",")
    .map((id) => D.rules.find((r) => r.id === id))
    .filter(Boolean);
  if (show.length) {
    document.getElementById("shown").replaceChildren(...show.map((r) => renderRule(r, false)));
    document.getElementById("shown-wrap").hidden = false;
    // Back to the calculator as it was (Simple or Advanced, inputs kept).
    document.getElementById("back-to-calc").addEventListener("click", (e) => {
      if (document.referrer && new URL(document.referrer).origin === location.origin) {
        e.preventDefault();
        history.back();
      }
    });
  }

  document.getElementById("checked").textContent = "Sources last checked " + formatDate(D.checked) + ".";
  document.getElementById("year").textContent = new Date().getFullYear();

  // Jump to the rule the visitor came for once the list exists.
  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  }
})();
