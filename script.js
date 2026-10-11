(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LANGS = ["en", "ru", "uz"];
  var I18N = window.I18N || {};

  // ---------------------------------------------------------------------------
  // Languages. English is read from the page; ru/uz come from i18n.js.
  // ---------------------------------------------------------------------------
  var textNodes = document.querySelectorAll("[data-i18n]");
  var attrNodes = document.querySelectorAll("[data-i18n-attr]");
  var en = {
    "meta.title": document.title,
    "meta.desc": document.querySelector('meta[name="description"]').content,
    "menu.open": "Open menu",
    "menu.close": "Close menu",
    "contact.copied": "Copied"
  };
  textNodes.forEach(function (el) {
    var k = el.getAttribute("data-i18n");
    if (!(k in en)) en[k] = el.innerHTML;
  });
  attrNodes.forEach(function (el) {
    el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
      var p = pair.split(":");
      if (!(p[1] in en)) en[p[1]] = el.getAttribute(p[0]);
    });
  });
  I18N.en = en;

  var lang = "en";
  function t(key) { return (I18N[lang] && I18N[lang][key]) || en[key] || ""; }

  function applyLang(next, opts) {
    if (LANGS.indexOf(next) < 0) next = "en";
    lang = next;
    root.lang = next;
    textNodes.forEach(function (el) { el.innerHTML = t(el.getAttribute("data-i18n")); });
    attrNodes.forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":");
        el.setAttribute(p[0], t(p[1]));
      });
    });
    document.title = t("meta.title");
    document.querySelector('meta[name="description"]').content = t("meta.desc");
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === next));
    });
    splitName();
    setMenu(false);
    root.removeAttribute("data-lang-pending");

    if (opts && opts.persist) {
      try { localStorage.setItem("lang", next); } catch (e) {}
      try {
        var url = new URL(location.href);
        if (next === "en") url.searchParams.delete("lang"); else url.searchParams.set("lang", next);
        history.replaceState(null, "", url.pathname + url.search + url.hash);
      } catch (e) {}
    }
  }

  document.querySelectorAll(".lang button").forEach(function (b) {
    b.addEventListener("click", function () { applyLang(b.getAttribute("data-lang"), { persist: true }); });
  });

  // ---------------------------------------------------------------------------
  // Name: letters blur in one by one
  // ---------------------------------------------------------------------------
  var nameEl = document.querySelector("[data-split]");
  function splitName() {
    var text = nameEl.textContent;
    nameEl.setAttribute("aria-label", text);
    nameEl.textContent = "";
    var i = 0;
    text.split(" ").forEach(function (word, wi) {
      if (wi) nameEl.appendChild(document.createTextNode(" "));
      // Letters sit inside a no-wrap word so lines only break between words
      var w = document.createElement("span");
      w.className = "word";
      w.setAttribute("aria-hidden", "true");
      word.split("").forEach(function (c) {
        var s = document.createElement("span");
        s.className = "ch";
        s.style.setProperty("--i", i++);
        s.textContent = c;
        w.appendChild(s);
      });
      nameEl.appendChild(w);
    });
    nameEl.classList.remove("play");
    void nameEl.offsetWidth;
    nameEl.classList.add("play");
  }

  // ---------------------------------------------------------------------------
  // Mobile menu
  // ---------------------------------------------------------------------------
  var menuBtn = document.getElementById("menu-toggle");
  var menu = document.getElementById("nav-menu");
  function setMenu(open) {
    menu.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", t(open ? "menu.close" : "menu.open"));
  }
  menuBtn.addEventListener("click", function () { setMenu(!menu.classList.contains("open")); });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  // ---------------------------------------------------------------------------
  // Header border, active section, reveal on scroll
  // ---------------------------------------------------------------------------
  var nav = document.querySelector(".nav");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var ACCENT = { hero: "#7fd6ff", about: "#ffc27a", experience: "#c3a4ff", projects: "#ff9ec4", skills: "#7fb8ff", education: "#b8f27a", contact: "#6ff5d8" };
  var links = {};
  document.querySelectorAll(".nav-links a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[data-view]"));
  var activeView = null;

  function updateActive() {
    // The active section is the last one whose top has passed 40% of the viewport
    var line = window.innerHeight * 0.4, view = "hero";
    sections.forEach(function (s) { if (s.getBoundingClientRect().top <= line) view = s.getAttribute("data-view"); });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) view = "contact";
    if (view === activeView) return;
    activeView = view;
    Object.keys(links).forEach(function (k) { links[k].classList.toggle("active", k === view); });
    root.style.setProperty("--nav-accent", ACCENT[view]);
    scene.setView(view);
  }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; updateActive(); });
  }, { passive: true });
  window.addEventListener("resize", updateActive);

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  // ---------------------------------------------------------------------------
  // Copy email, tilting tiles, footer year
  // ---------------------------------------------------------------------------
  var copyBtn = document.getElementById("copy-email");
  if (navigator.clipboard) {
    copyBtn.addEventListener("click", function () {
      var label = copyBtn.querySelector("span");
      navigator.clipboard.writeText(copyBtn.getAttribute("data-email")).then(function () {
        label.textContent = t("contact.copied");
        setTimeout(function () { label.innerHTML = t("contact.copy"); }, 1800);
      });
    });
  } else {
    copyBtn.hidden = true;
  }

  document.querySelectorAll(".tile").forEach(function (tile) {
    tile.addEventListener("pointermove", function (e) {
      var r = tile.getBoundingClientRect();
      tile.style.setProperty("--rx", (-((e.clientY - r.top) / r.height - 0.5) * 18).toFixed(2) + "deg");
      tile.style.setProperty("--ry", (((e.clientX - r.left) / r.width - 0.5) * 18).toFixed(2) + "deg");
    });
    tile.addEventListener("pointerleave", function () {
      tile.style.removeProperty("--rx");
      tile.style.removeProperty("--ry");
    });
  });

  document.getElementById("year").textContent = new Date().getFullYear();

  // ---------------------------------------------------------------------------
  // Canvas scene: a particle lattice behind the page, plus a shape on wide
  // screens that morphs as you scroll from section to section.
  // ---------------------------------------------------------------------------
  var scene = (function () {
    var canvas = document.getElementById("scene");
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, DPR = 1, cssW = 0;
    var rand = mulberry(7);

    function mulberry(a) {
      return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        var q = Math.imul(a ^ (a >>> 15), 1 | a);
        q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
        return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
      };
    }
    function gauss() { return (rand() + rand() + rand() - 1.5) / 1.5; }

    // ---- Background lattice -------------------------------------------------
    var bg = { x: [], y: [], z: [], ph: [], b: [] };
    (function () {
      var nodes = [], lines = [], seen = {};
      for (var i = 0; i < 10; i++) nodes.push([(rand() - 0.5) * 5.5, (rand() - 0.5) * 3.4, (rand() - 0.5) * 5.5]);
      nodes.forEach(function (a, ai) {
        nodes.map(function (b, bi) { return [bi, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])]; })
          .filter(function (d) { return d[0] !== ai; })
          .sort(function (p, q) { return p[1] - q[1]; })
          .slice(0, 2)
          .forEach(function (d) {
            var key = Math.min(ai, d[0]) + "-" + Math.max(ai, d[0]);
            if (!seen[key]) { seen[key] = 1; lines.push([a, nodes[d[0]]]); }
          });
      });
      for (var r = 0; r < 7; r++) {
        var n = nodes[Math.floor(rand() * nodes.length)], th = rand() * Math.PI * 2, ph = (rand() - 0.5) * 1.2;
        lines.push([n, [n[0] + Math.cos(th) * Math.cos(ph) * 9, n[1] + Math.sin(ph) * 9, n[2] + Math.sin(th) * Math.cos(ph) * 9]]);
      }
      for (var g = 0; g < 6; g++) {
        var o = [(rand() - 0.5) * 8, (rand() - 0.5) * 5, (rand() - 0.5) * 8], ax = g % 3, a1 = o.slice(), b1 = o.slice();
        a1[ax] -= 9; b1[ax] += 9;
        lines.push([a1, b1, 0.45]);
      }
      lines.forEach(function (L) {
        var a = L[0], b = L[1], bright = L[2] || 1;
        var count = Math.min(420, Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 46));
        for (var k = 0; k < count; k++) {
          var s = rand();
          bg.x.push(a[0] + (b[0] - a[0]) * s + gauss() * 0.012);
          bg.y.push(a[1] + (b[1] - a[1]) * s + gauss() * 0.012);
          bg.z.push(a[2] + (b[2] - a[2]) * s + gauss() * 0.012);
          bg.ph.push(rand() * Math.PI * 2);
          bg.b.push(bright * (0.5 + rand() * 0.5));
        }
      });
      nodes.forEach(function (n) {
        for (var k = 0; k < 46; k++) {
          bg.x.push(n[0] + gauss() * 0.07); bg.y.push(n[1] + gauss() * 0.07); bg.z.push(n[2] + gauss() * 0.07);
          bg.ph.push(rand() * Math.PI * 2); bg.b.push(1.3);
        }
      });
    })();
    var BGN = bg.x.length;

    // ---- Shapes ---------------------------------------------------------------
    var N = 1500;
    function edgePoints(verts, edges, count, out) {
      var lens = edges.map(function (e) { var a = verts[e[0]], b = verts[e[1]]; return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); });
      var total = lens.reduce(function (s, l) { return s + l; }, 0);
      for (var i = 0; i < count; i++) {
        var pick = rand() * total, e = 0;
        while (pick > lens[e] && e < edges.length - 1) { pick -= lens[e]; e++; }
        var a = verts[edges[e][0]], b = verts[edges[e][1]], s = rand();
        out.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s]);
      }
    }
    function boxEdges(cx, cy, cz, sx, sy, sz, verts, edges) {
      var base = verts.length;
      for (var i = 0; i < 8; i++) verts.push([cx + (i & 1 ? sx : -sx), cy + (i & 2 ? sy : -sy), cz + (i & 4 ? sz : -sz)]);
      [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]
        .forEach(function (e) { edges.push([base + e[0], base + e[1]]); });
    }
    function shuffle(a) {
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
      return a;
    }
    function fill(out, fn) { while (out.length < N) out.push(fn()); return shuffle(out); }

    var shapes = {};
    shapes.ico = (function () {
      var p = (1 + Math.sqrt(5)) / 2, v = [], e = [], out = [];
      [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]]
        .forEach(function (q) { var m = Math.hypot(q[0], q[1], q[2]) / 1.05; v.push([q[0] / m, q[1] / m, q[2] / m]); });
      for (var i = 0; i < 12; i++) for (var j = i + 1; j < 12; j++) {
        if (Math.hypot(v[i][0] - v[j][0], v[i][1] - v[j][1], v[i][2] - v[j][2]) < 1.15) e.push([i, j]);
      }
      edgePoints(v, e, 630, out);
      var rest = N - out.length, k = 0;
      return fill(out, function () {
        var y = 1 - (k / (rest - 1)) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), th = k++ * 2.39996, s = 0.68 + gauss() * 0.02;
        return [Math.cos(th) * r * s, y * s, Math.sin(th) * r * s];
      });
    })();
    shapes.torus = (function () {
      var v = [], e = [], out = [];
      boxEdges(0, 0, 0, 0.95, 0.95, 0.95, v, e);
      edgePoints(v, e, 630, out);
      return fill(out, function () {
        var u = rand() * Math.PI * 2, w = rand() * Math.PI * 2;
        return [(0.55 + 0.2 * Math.cos(w)) * Math.cos(u), 0.2 * Math.sin(w), (0.55 + 0.2 * Math.cos(w)) * Math.sin(u)];
      });
    })();
    shapes.octa = (function () {
      var v = [[1.05, 0, 0], [-1.05, 0, 0], [0, 1.05, 0], [0, -1.05, 0], [0, 0, 1.05], [0, 0, -1.05]], out = [];
      var e = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [2, 5], [3, 4], [3, 5]];
      edgePoints(v, e, 630, out);
      var cv = [], ce = [];
      boxEdges(0, 0, 0, 0.36, 0.36, 0.36, cv, ce);
      edgePoints(cv, ce, 420, out);
      return fill(out, function () {
        var y = rand() * 2 - 1, r = Math.sqrt(1 - y * y), th = rand() * Math.PI * 2, s = 0.2 * Math.cbrt(rand());
        return [Math.cos(th) * r * s, y * s, Math.sin(th) * r * s];
      });
    })();
    shapes.slabs = (function () {
      var v = [], e = [], out = [], levels = [-0.48, 0.14, 0.76];
      [-0.62, 0, 0.62].forEach(function (y) { boxEdges(0, y, 0, 0.82, 0.14, 0.82, v, e); });
      edgePoints(v, e, 820, out);
      return fill(out, function () {
        return [Math.round((rand() - 0.5) * 12) / 12 * 1.5, levels[Math.floor(rand() * 3)] + gauss() * 0.01, Math.round((rand() - 0.5) * 12) / 12 * 1.5];
      });
    })();
    shapes.helix = (function () {
      var out = [];
      for (var i = 0; i < 1000; i++) {
        var s = rand(), a = s * Math.PI * 5, side = i % 2 ? Math.PI : 0;
        out.push([Math.cos(a + side) * 0.5, s * 2 - 1, Math.sin(a + side) * 0.5]);
      }
      return fill(out, function () {
        var step = Math.floor(rand() * 18) / 18, a = step * Math.PI * 5, m = rand() * 2 - 1;
        return [Math.cos(a) * 0.5 * m, step * 2 - 1, Math.sin(a) * 0.5 * m];
      });
    })();
    shapes.cone = (function () {
      var s = 0.71, v = [[s, s, s], [s, -s, -s], [-s, s, -s], [-s, -s, s]], out = [];
      edgePoints(v, [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]], 630, out);
      return fill(out, function () {
        var h = rand(), a = rand() * Math.PI * 2, r = (1 - h) * 0.42;
        return [Math.cos(a) * r, -0.35 + h * 0.85, Math.sin(a) * r];
      });
    })();
    shapes.out = (function () {
      var out = [];
      for (var i = 0; i < N; i++) {
        var y = rand() * 2 - 1, r = Math.sqrt(1 - y * y), th = rand() * Math.PI * 2, s = 4 + rand() * 3;
        out.push([Math.cos(th) * r * s, y * s, Math.sin(th) * r * s]);
      }
      return out;
    })();

    var VIEW = {
      hero:       { shape: "ico",   rgb: [127, 214, 255], cam: [0, 0.05] },
      about:      { shape: "ico",   rgb: [255, 194, 122], cam: [0.7, 0.16] },
      experience: { shape: "torus", rgb: [195, 164, 255], cam: [1.4, -0.08] },
      projects:   { shape: "octa",  rgb: [255, 158, 196], cam: [2.1, 0.2] },
      skills:     { shape: "slabs", rgb: [127, 184, 255], cam: [2.8, -0.12] },
      education:  { shape: "helix", rgb: [184, 242, 122], cam: [3.5, 0.14] },
      contact:    { shape: "cone",  rgb: [111, 245, 216], cam: [4.2, -0.1] }
    };

    var px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N), pk = new Float32Array(N), pph = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      px[i] = shapes.out[i][0]; py[i] = shapes.out[i][1]; pz[i] = shapes.out[i][2];
      pk[i] = 0.03 + rand() * 0.05; pph[i] = rand() * Math.PI * 2;
    }

    var target = "hero";
    var color = VIEW.hero.rgb.slice();
    var shapeAlpha = 0, shapeSpin = 0;
    var camYaw = -0.6, camPitch = 0.05, camDist = 10, drift = 0;
    var mouseX = 0, mouseY = 0, mx = 0, my = 0, scrollPar = 0;
    var anchor = { x: 0, y: 0, s: 0 };
    var running = false, last = 0;

    window.addEventListener("pointermove", function (e) {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    function wide() { return cssW >= 1180; }
    function anchorGoal() {
      var pad = 32, wrapW = Math.min(cssW, 1200), left = (cssW - wrapW) / 2 + pad, inner = wrapW - pad * 2;
      var free = inner - 720;
      return { x: (left + 720 + free / 2) * DPR, y: H * 0.5, s: Math.min(free * 0.3, window.innerHeight * 0.19) * DPR };
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      cssW = window.innerWidth;
      W = Math.round(cssW * DPR);
      H = Math.round(window.innerHeight * DPR);
      canvas.width = W; canvas.height = H;
      var g = anchorGoal();
      anchor.x = g.x; anchor.y = g.y; anchor.s = g.s;
      if (!running) frame(performance.now());
    }

    function frame(now) {
      var dt = Math.min(48, now - (last || now)) / 16.67;
      last = now;
      var motion = reduceMotion ? 0 : 1;
      var v = VIEW[target];

      for (var c = 0; c < 3; c++) color[c] += (v.rgb[c] - color[c]) * 0.05 * dt;
      camYaw += (v.cam[0] + drift - camYaw) * 0.03 * dt;
      camPitch += (v.cam[1] - camPitch) * 0.03 * dt;
      camDist += (3.8 - camDist) * 0.028 * dt;
      drift += 0.0005 * dt * motion;
      mx += (mouseX - mx) * 0.04 * dt;
      my += (mouseY - my) * 0.04 * dt;
      scrollPar += (window.scrollY * 0.00025 - scrollPar) * 0.1 * dt;
      shapeAlpha += ((wide() ? 1 : 0) - shapeAlpha) * 0.05 * dt;
      shapeSpin += 0.004 * dt * motion;
      var goal = anchorGoal();
      anchor.x += (goal.x - anchor.x) * 0.1 * dt;
      anchor.y += (goal.y - anchor.y) * 0.1 * dt;
      anchor.s += (goal.s - anchor.s) * 0.1 * dt;

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      var t = now * 0.001, dot = 1.25 * DPR;

      // Lattice: dimmer on small screens where text sits over it
      var yaw = camYaw + mx * 0.22, pitch = camPitch + my * 0.12 + scrollPar;
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var f = Math.min(W, H) * 0.95, cx0 = W / 2, cy0 = H / 2;
      var br = cssW < 760 ? 0.3 : 0.42;
      ctx.fillStyle = "rgb(" + Math.min(255, (150 + color[0] * 0.4) | 0) + "," + Math.min(255, (190 + color[1] * 0.25) | 0) + "," + Math.min(255, (235 + color[2] * 0.08) | 0) + ")";
      for (var i = 0; i < BGN; i++) {
        var x = bg.x[i], y = bg.y[i], z = bg.z[i];
        var x1 = x * cy - z * sy, z1 = x * sy + z * cy;
        var y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + camDist;
        if (z2 < 0.25) continue;
        var sx = cx0 + x1 * f / z2, syy = cy0 + y1 * f / z2;
        if (sx < -4 || sx > W + 4 || syy < -4 || syy > H + 4) continue;
        var depth = Math.min(1, 2.6 / z2);
        var a = bg.b[i] * depth * br * (0.55 + 0.45 * Math.sin(t * 1.3 + bg.ph[i]));
        if (a < 0.03) continue;
        ctx.globalAlpha = Math.min(1, a);
        var s = dot * (0.6 + depth * 0.9);
        ctx.fillRect(sx, syy, s, s);
      }

      // Shape: morph toward the active section's form
      var tgt = shapes[v.shape];
      for (var j = 0; j < N; j++) {
        var k = reduceMotion ? 1 : Math.min(1, pk[j] * dt);
        px[j] += (tgt[j][0] - px[j]) * k; py[j] += (tgt[j][1] - py[j]) * k; pz[j] += (tgt[j][2] - pz[j]) * k;
      }
      if (shapeAlpha > 0.01) {
        var S = anchor.s, ax0 = anchor.x, ay0 = anchor.y, rgb = (color[0] | 0) + "," + (color[1] | 0) + "," + (color[2] | 0);
        var grad = ctx.createRadialGradient(ax0, ay0, 0, ax0, ay0, S * 2.3);
        grad.addColorStop(0, "rgba(" + rgb + "," + (0.15 * shapeAlpha) + ")");
        grad.addColorStop(1, "rgba(" + rgb + ",0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.fillRect(ax0 - S * 2.3, ay0 - S * 2.3, S * 4.6, S * 4.6);

        var ry = shapeSpin + mx * 0.6, rx = 0.35 + Math.sin(shapeSpin * 0.7) * 0.15 + my * 0.4;
        var c1 = Math.cos(ry), s1 = Math.sin(ry), c2 = Math.cos(rx), s2 = Math.sin(rx), D = 3.4;
        ctx.fillStyle = "rgb(" + rgb + ")";
        for (var q = 0; q < N; q++) {
          var X = px[q], Y = py[q], Z = pz[q];
          var X1 = X * c1 - Z * s1, Z1 = X * s1 + Z * c1, Y1 = Y * c2 - Z1 * s2, Z2 = Y * s2 + Z1 * c2 + D;
          if (Z2 < 0.3) continue;
          var P = D / Z2;
          var al = shapeAlpha * (0.35 + 0.65 * (P - 0.6)) * (0.65 + 0.35 * Math.sin(t * 2 + pph[q]));
          if (al < 0.02) continue;
          ctx.globalAlpha = Math.min(1, al);
          var ss = dot * (0.7 + P * 0.6);
          ctx.fillRect(ax0 + X1 * S * P, ay0 + Y1 * S * P, ss, ss);
        }
        ctx.fillStyle = "#fff";
        for (var w = 0; w < N; w += 23) {
          var X3 = px[w], Y3 = py[w], Z3 = pz[w];
          var X4 = X3 * c1 - Z3 * s1, Z4 = X3 * s1 + Z3 * c1, Y4 = Y3 * c2 - Z4 * s2, P2 = D / (Y3 * s2 + Z4 * c2 + D);
          ctx.globalAlpha = shapeAlpha * 0.5 * (0.5 + 0.5 * Math.sin(t * 3 + pph[w]));
          ctx.fillRect(ax0 + X4 * S * P2, ay0 + Y4 * S * P2, dot * 1.1, dot * 1.1);
        }
      }
      ctx.globalAlpha = 1;
      if (running) requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduceMotion) return;
      running = true; last = 0;
      requestAnimationFrame(frame);
    }
    document.addEventListener("visibilitychange", function () { if (document.hidden) running = false; else start(); });
    window.addEventListener("resize", resize);
    resize();

    return {
      start: start,
      setView: function (name) {
        if (!VIEW[name]) return;
        target = name;
        if (reduceMotion) {
          color = VIEW[name].rgb.slice(); camYaw = VIEW[name].cam[0]; camPitch = VIEW[name].cam[1]; camDist = 3.8;
          shapeAlpha = wide() ? 1 : 0;
          frame(performance.now());
        }
      }
    };
  })();

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  var initial = root.getAttribute("data-lang-pending") || "en";
  applyLang(initial, { persist: initial !== "en" && /[?&]lang=/.test(location.search) });
  scene.start();
  updateActive();
})();
