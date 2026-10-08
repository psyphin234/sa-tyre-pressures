/*
 * install.js: optional "Add to home screen". Chrome's own install pop-up is
 * held back (the site is under construction and nobody should be pushed to
 * install it); the visitor can still install from the button in the
 * "Works offline" box. Browsers without an install prompt (Safari on iPhone,
 * Firefox) get short instructions instead. Hidden once installed.
 */
(function () {
  "use strict";

  const wrap = document.getElementById("install");
  const button = document.getElementById("install-button");
  const help = document.getElementById("install-help");
  if (!wrap || !button || !help) return;

  let deferred = null;

  const installed = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isApple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // Keep Chrome's automatic pop-up from appearing; remember it for the button.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
  });

  window.addEventListener("appinstalled", () => {
    wrap.hidden = true;
  });

  button.addEventListener("click", () => {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.finally(() => {
        deferred = null;
      });
      return;
    }
    help.textContent = isApple
      ? "On iPhone or iPad: tap the Share button, then “Add to Home Screen”."
      : "Open your browser's menu and choose “Add to Home screen” or “Install app”.";
    help.hidden = !help.hidden;
  });

  if (!installed()) wrap.hidden = false;
})();
