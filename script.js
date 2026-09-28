(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  // ---- Theme toggle --------------------------------------------------------
  var themeBtn = document.getElementById("theme-toggle");
  var media = window.matchMedia("(prefers-color-scheme: dark)");

  function currentTheme() {
    return root.getAttribute("data-theme") || (media.matches ? "dark" : "light");
  }

  themeBtn.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  // ---- Mobile menu ---------------------------------------------------------
  var menuBtn = document.getElementById("menu-toggle");
  var navLinks = document.getElementById("nav-links");

  function setMenu(open) {
    navLinks.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  menuBtn.addEventListener("click", function () {
    setMenu(!navLinks.classList.contains("open"));
  });
  navLinks.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });

  // ---- Nav border on scroll ------------------------------------------------
  var nav = document.querySelector(".nav");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- Reveal on scroll + active nav link ---------------------------------
  if ("IntersectionObserver" in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObs.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    document.querySelectorAll(".reveal").forEach(function (el) { revealObs.observe(el); });

    var links = {};
    navLinks.querySelectorAll("a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var sectionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = links[entry.target.id];
        if (link && entry.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove("active"); });
          link.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { sectionObs.observe(s); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("visible"); });
  }

  // ---- Copy email ----------------------------------------------------------
  var copyBtn = document.getElementById("copy-email");
  if (copyBtn && navigator.clipboard) {
    copyBtn.addEventListener("click", function () {
      var label = copyBtn.querySelector("span");
      navigator.clipboard.writeText(copyBtn.dataset.email).then(function () {
        label.textContent = "Copied!";
        setTimeout(function () { label.textContent = "Copy email"; }, 1800);
      });
    });
  } else if (copyBtn) {
    copyBtn.hidden = true;
  }

  // ---- Footer year ---------------------------------------------------------
  document.getElementById("year").textContent = new Date().getFullYear();
})();
