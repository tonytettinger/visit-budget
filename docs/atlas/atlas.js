/* Atlas shared behaviors — no dependencies, safe to omit (pages degrade to static).
   1. Theme toggle: dark is the default; toggles dark ↔ light, persisted in
      localStorage, applied as data-theme on <html> (atlas.css picks it up).
   2. Section nav: highlights the nav.toc link of the section in view.
   3. Filters: any .filters button[data-filter] toggles visibility of items
      matching [data-type] inside the element named by the bar's data-target. */
(function () {
  "use strict";

  /* ── theme toggle (default = dark, no attribute needed) ── */
  var KEY = "atlas-theme";
  var root = document.documentElement;
  var saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch (e) {}
  if (saved === "light") root.setAttribute("data-theme", "light");

  var btn = document.querySelector(".theme-toggle");
  if (btn) {
    var label = function () {
      btn.textContent =
        root.getAttribute("data-theme") === "light" ? "○ light" : "● dark";
    };
    label();
    btn.addEventListener("click", function () {
      var toLight = root.getAttribute("data-theme") !== "light";
      if (toLight) root.setAttribute("data-theme", "light");
      else root.removeAttribute("data-theme");
      try {
        toLight
          ? localStorage.setItem(KEY, "light")
          : localStorage.removeItem(KEY);
      } catch (e) {}
      label();
    });
  }

  /* ── section-nav highlighting ── */
  var links = Array.prototype.slice.call(
    document.querySelectorAll('nav.toc a[href^="#"]'),
  );
  if (links.length && "IntersectionObserver" in window) {
    var byId = {};
    links.forEach(function (a) {
      byId[a.getAttribute("href").slice(1)] = a;
    });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            links.forEach(function (a) {
              a.classList.remove("active");
            });
            var a = byId[en.target.id];
            if (a) a.classList.add("active");
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    Object.keys(byId).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) io.observe(sec);
    });
  }

  /* ── type filters ── */
  document.querySelectorAll(".filters[data-target]").forEach(function (bar) {
    var scope = document.getElementById(bar.getAttribute("data-target"));
    if (!scope) return;
    bar.querySelectorAll("button[data-filter]").forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-filter");
        var on = b.getAttribute("aria-pressed") === "true";
        bar.querySelectorAll("button").forEach(function (x) {
          x.setAttribute("aria-pressed", "false");
        });
        b.setAttribute("aria-pressed", String(!on));
        scope.querySelectorAll("[data-type]").forEach(function (item) {
          item.style.display =
            on || f === "all" || item.getAttribute("data-type") === f
              ? ""
              : "none";
        });
      });
    });
  });
})();
