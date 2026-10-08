/*
 * ui.js: small DOM helpers shared by index.html and sources.html.
 * All text goes in via textContent, never innerHTML.
 */
(function (root) {
  "use strict";

  // "1 250 kg", "20 km/h": keep numbers and units on one line.
  function keepTogether(text) {
    return text.replace(/(\d) (?=\d{3}\b)/g, "$1 ").replace(/(\d) (kg|km\/h|m|bar|kPa|psi|L|L\/min|min|%)\b/g, "$1 $2");
  }

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === "class") node.className = v;
      else node.setAttribute(k, v === true ? "" : v);
    });
    children.flat(Infinity).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(keepTogether(c)) : c);
    });
    return node;
  }

  function externalLink(url, text) {
    return el("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, text);
  }

  const CATEGORY = {
    law: { label: "SA law", cls: "law" },
    standard: { label: "Standard", cls: "standard" },
    "tyre-maker": { label: "Tyre maker", cls: "maker" },
    "vehicle-maker": { label: "Vehicle maker", cls: "maker" },
    engineering: { label: "Engineering", cls: "engineering" },
    calculation: { label: "Calculation", cls: "calc" },
    "field-practice": { label: "Field practice", cls: "field" },
  };

  function categoryTag(category) {
    const c = CATEGORY[category] || { label: category, cls: "calc" };
    return el("span", { class: "tag tag--" + c.cls }, c.label);
  }

  function ruleById(id) {
    return root.TYRE_DATA.rules.find((r) => r.id === id) || null;
  }

  // "Read more: Title · Title", each linking to the rule on the sources page.
  function ruleLinks(ids) {
    const rules = ids.map(ruleById).filter(Boolean);
    if (!rules.length) return null;
    const parts = [];
    rules.forEach((r, i) => {
      if (i) parts.push(" · ");
      parts.push(el("a", { href: "sources.html#" + r.id }, r.title));
    });
    return el("p", { class: "read-more" }, "Read more: ", parts);
  }

  // One small link per card to the sources page, showing just these rules at
  // the top (sources.html?show=a,b). Keeps quotes and citations off the calculator.
  function sourcesLink(ids, text) {
    const known = ids.filter((id) => ruleById(id));
    if (!known.length) return null;
    return el("p", { class: "sources-link" }, el("a", { href: "sources.html?show=" + known.join(",") }, text || "Where these numbers come from"));
  }

  // Fill <figure data-image="key"> with the photo and its credit line.
  function photo(figure, key) {
    const img = (root.TYRE_IMAGES || []).find((i) => i.key === key);
    if (!img) {
      figure.hidden = true;
      return;
    }
    const image = el("img", { src: img.file, alt: img.alt, width: img.w, height: img.h, loading: "lazy", decoding: "async" });
    figure.replaceChildren(
      // Animations show a still to visitors who've asked for reduced motion.
      img.still ? el("picture", null, el("source", { media: "(prefers-reduced-motion: reduce)", srcset: img.still }), image) : image,
      el(
        "figcaption",
        null,
        img.caption ? img.caption + " " : "",
        img.own
          ? el("span", { class: "credit" }, (img.creditLabel || "Photo") + ": " + img.author + ".")
          : el("span", { class: "credit" }, "Photo: ", externalLink(img.authorUrl || img.page, img.author), ", ", img.licenseUrl ? externalLink(img.licenseUrl, img.license) : img.license)
      )
    );
  }

  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  }

  root.TYRE_UI = { el, externalLink, categoryTag, ruleById, ruleLinks, sourcesLink, photo, formatDate, CATEGORY };
})(window);
