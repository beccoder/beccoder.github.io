(function () {
  "use strict";

  var root = document.documentElement;
  var VIEWS = ["hero", "about", "work", "stack", "contact"];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.setAttribute("data-view", "loading");

  // ---------------------------------------------------------------------------
  // Text splitting for the blur-in animations
  // ---------------------------------------------------------------------------
  function splitChars(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split("").forEach(function (c) {
            var s = document.createElement("span");
            s.className = "ch";
            s.setAttribute("aria-hidden", "true");
            s.style.setProperty("--i", i++);
            s.textContent = c;
            frag.appendChild(s);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    })(el);
    el.setAttribute("aria-label", el.textContent);
  }

  function splitWords(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            var s = document.createElement("span");
            s.className = "w";
            s.style.setProperty("--i", i++);
            s.textContent = p;
            frag.appendChild(s);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          if (child.tagName === "EM") {
            child.classList.add("w");
            child.style.setProperty("--i", i++);
          } else {
            walk(child);
          }
        }
      });
    })(el);
  }

  document.querySelectorAll('[data-split="chars"]').forEach(splitChars);
  document.querySelectorAll('[data-split="words"]').forEach(splitWords);

  // ---------------------------------------------------------------------------
  // Routing between screens
  // ---------------------------------------------------------------------------
  var flash = document.getElementById("flash");
  var current = null;

  function viewFromHash() {
    var v = location.hash.slice(1);
    return VIEWS.indexOf(v) > 0 ? v : "hero";
  }

  function setView(v) {
    if (v === current) return;
    var idx = VIEWS.indexOf(v);
    VIEWS.forEach(function (name, n) {
      var el = document.getElementById(name);
      el.style.setProperty("--dx", n === idx ? 0 : n < idx ? -1 : 1);
      el.setAttribute("aria-hidden", n === idx ? "false" : "true");
      if ("inert" in el) el.inert = n !== idx;
    });
    var prev = current;
    current = v;
    root.setAttribute("data-view", v);

    var screen = document.getElementById(v);
    screen.scrollTop = 0;
    if (prev && prev !== "loading") {
      if (!reduceMotion) {
        flash.classList.remove("on");
        void flash.offsetWidth;
        flash.classList.add("on");
      }
      var heading = screen.querySelector("h1, h2");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
    scene.setView(v);
  }

  window.addEventListener("hashchange", function () { setView(viewFromHash()); });

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    var idx = VIEWS.indexOf(current);
    var next = null;
    if (e.key >= "1" && e.key <= "4") next = VIEWS[+e.key];
    else if (e.key === "0" || e.key === "Escape") next = "hero";
    else if (e.key === "ArrowRight" && idx < VIEWS.length - 1) next = VIEWS[idx + 1];
    else if (e.key === "ArrowLeft" && idx > 0) next = VIEWS[idx - 1];
    if (next) {
      e.preventDefault();
      location.hash = next === "hero" ? "" : next;
      if (next === "hero") history.replaceState(null, "", location.pathname);
      setView(next);
    }
  });

  // Hero link clears the hash instead of leaving "#hero" in the URL
  document.querySelectorAll('a[href="#hero"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      history.pushState(null, "", location.pathname);
      setView("hero");
    });
  });
  window.addEventListener("popstate", function () { setView(viewFromHash()); });

  // ---------------------------------------------------------------------------
  // Contact tiles tilt toward the pointer
  // ---------------------------------------------------------------------------
  document.querySelectorAll(".tile").forEach(function (tile) {
    tile.addEventListener("pointermove", function (e) {
      var r = tile.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      tile.style.setProperty("--rx", (-y * 18).toFixed(2) + "deg");
      tile.style.setProperty("--ry", (x * 18).toFixed(2) + "deg");
    });
    tile.addEventListener("pointerleave", function () {
      tile.style.removeProperty("--rx");
      tile.style.removeProperty("--ry");
    });
  });

  // ---------------------------------------------------------------------------
  // Canvas scene: a particle lattice plus one shape per section
  // ---------------------------------------------------------------------------
  var scene = (function () {
    var canvas = document.getElementById("scene");
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, DPR = 1;
    var rand = mulberry(7);

    function mulberry(a) {
      return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function gauss() { return (rand() + rand() + rand() - 1.5) / 1.5; }

    // ---- Background lattice -------------------------------------------------
    var bg = { x: [], y: [], z: [], ph: [], b: [] };
    (function buildLattice() {
      var nodes = [];
      for (var i = 0; i < 10; i++) {
        nodes.push([(rand() - 0.5) * 5.5, (rand() - 0.5) * 3.4, (rand() - 0.5) * 5.5]);
      }
      var lines = [];
      var seen = {};
      nodes.forEach(function (a, ai) {
        var near = nodes.map(function (b, bi) {
          return [bi, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])];
        }).filter(function (d) { return d[0] !== ai; }).sort(function (p, q) { return p[1] - q[1]; });
        near.slice(0, 2).forEach(function (d) {
          var key = Math.min(ai, d[0]) + "-" + Math.max(ai, d[0]);
          if (!seen[key]) { seen[key] = 1; lines.push([a, nodes[d[0]]]); }
        });
      });
      // Long rays that run off into the distance
      for (var r = 0; r < 7; r++) {
        var n = nodes[Math.floor(rand() * nodes.length)];
        var th = rand() * Math.PI * 2, ph = (rand() - 0.5) * 1.2;
        lines.push([n, [n[0] + Math.cos(th) * Math.cos(ph) * 9, n[1] + Math.sin(ph) * 9, n[2] + Math.sin(th) * Math.cos(ph) * 9]]);
      }
      // Faint axis-aligned guides, like a far grid
      for (var g = 0; g < 6; g++) {
        var o = [(rand() - 0.5) * 8, (rand() - 0.5) * 5, (rand() - 0.5) * 8];
        var axis = g % 3;
        var a1 = o.slice(), b1 = o.slice();
        a1[axis] -= 9; b1[axis] += 9;
        lines.push([a1, b1, 0.45]);
      }
      lines.forEach(function (L) {
        var a = L[0], b = L[1], bright = L[2] || 1;
        var len = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        var count = Math.min(420, Math.round(len * 46));
        for (var k = 0; k < count; k++) {
          var t = rand();
          bg.x.push(a[0] + (b[0] - a[0]) * t + gauss() * 0.012);
          bg.y.push(a[1] + (b[1] - a[1]) * t + gauss() * 0.012);
          bg.z.push(a[2] + (b[2] - a[2]) * t + gauss() * 0.012);
          bg.ph.push(rand() * Math.PI * 2);
          bg.b.push(bright * (0.5 + rand() * 0.5));
        }
      });
      nodes.forEach(function (n) {
        for (var k = 0; k < 46; k++) {
          bg.x.push(n[0] + gauss() * 0.07);
          bg.y.push(n[1] + gauss() * 0.07);
          bg.z.push(n[2] + gauss() * 0.07);
          bg.ph.push(rand() * Math.PI * 2);
          bg.b.push(1.3);
        }
      });
    })();
    var BGN = bg.x.length;

    // ---- Section shapes -----------------------------------------------------
    var N = 1500;
    var EDGE_SHARE = 0.42;

    function edgePoints(verts, edges, count, out) {
      var lens = edges.map(function (e) {
        var a = verts[e[0]], b = verts[e[1]];
        return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      });
      var total = lens.reduce(function (s, l) { return s + l; }, 0);
      for (var i = 0; i < count; i++) {
        var pick = rand() * total, e = 0;
        while (pick > lens[e] && e < edges.length - 1) { pick -= lens[e]; e++; }
        var a = verts[edges[e][0]], b = verts[edges[e][1]], t = rand();
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      }
    }
    function boxEdges(cx, cy, cz, sx, sy, sz, verts, edges) {
      var base = verts.length;
      for (var i = 0; i < 8; i++) {
        verts.push([cx + (i & 1 ? sx : -sx), cy + (i & 2 ? sy : -sy), cz + (i & 4 ? sz : -sz)]);
      }
      [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]
        .forEach(function (e) { edges.push([base + e[0], base + e[1]]); });
    }
    function shuffle(a) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    var shapes = {};

    // about: icosahedron cage around a glowing sphere
    (function () {
      var p = (1 + Math.sqrt(5)) / 2, v = [];
      [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]]
        .forEach(function (q) { var m = Math.hypot(q[0], q[1], q[2]); v.push([q[0] / m * 1.05, q[1] / m * 1.05, q[2] / m * 1.05]); });
      var edges = [];
      for (var i = 0; i < 12; i++) for (var j = i + 1; j < 12; j++) {
        var d = Math.hypot(v[i][0] - v[j][0], v[i][1] - v[j][1], v[i][2] - v[j][2]);
        if (d < 1.15) edges.push([i, j]);
      }
      var out = [];
      edgePoints(v, edges, Math.round(N * EDGE_SHARE), out);
      var rest = N - out.length;
      for (var k = 0; k < rest; k++) {
        var y = 1 - (k / (rest - 1)) * 2, r = Math.sqrt(1 - y * y), th = k * 2.39996;
        var s = 0.68 + gauss() * 0.02;
        out.push([Math.cos(th) * r * s, y * s, Math.sin(th) * r * s]);
      }
      shapes.about = shuffle(out);
    })();

    // work: torus inside a cube frame
    (function () {
      var v = [], e = [];
      boxEdges(0, 0, 0, 0.95, 0.95, 0.95, v, e);
      var out = [];
      edgePoints(v, e, Math.round(N * EDGE_SHARE), out);
      while (out.length < N) {
        var u = rand() * Math.PI * 2, w = rand() * Math.PI * 2, R = 0.55, r = 0.2;
        out.push([(R + r * Math.cos(w)) * Math.cos(u), r * Math.sin(w), (R + r * Math.cos(w)) * Math.sin(u)]);
      }
      shapes.work = shuffle(out);
    })();

    // stack: three stacked slabs with dotted top faces
    (function () {
      var v = [], e = [];
      [-0.62, 0, 0.62].forEach(function (y) { boxEdges(0, y, 0, 0.82, 0.14, 0.82, v, e); });
      var out = [];
      edgePoints(v, e, Math.round(N * 0.55), out);
      var levels = [-0.48, 0.14, 0.76];
      while (out.length < N) {
        var gx = Math.round((rand() - 0.5) * 12) / 12 * 1.5;
        var gz = Math.round((rand() - 0.5) * 12) / 12 * 1.5;
        out.push([gx, levels[Math.floor(rand() * 3)] + gauss() * 0.01, gz]);
      }
      shapes.stack = shuffle(out);
    })();

    // contact: cone inside a tetrahedron
    (function () {
      var s = 1.15, v = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(function (q) { return [q[0] * s * 0.62, q[1] * s * 0.62, q[2] * s * 0.62]; });
      var e = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
      var out = [];
      edgePoints(v, e, Math.round(N * EDGE_SHARE), out);
      while (out.length < N) {
        var h = rand(), a = rand() * Math.PI * 2, r = (1 - h) * 0.42;
        out.push([Math.cos(a) * r, -0.35 + h * 0.85, Math.sin(a) * r]);
      }
      shapes.contact = shuffle(out);
    })();

    // hero / loading: particles drift out on a wide shell, invisible
    (function () {
      var out = [];
      for (var i = 0; i < N; i++) {
        var y = rand() * 2 - 1, r = Math.sqrt(1 - y * y), th = rand() * Math.PI * 2, s = 4 + rand() * 3;
        out.push([Math.cos(th) * r * s, y * s, Math.sin(th) * r * s]);
      }
      shapes.hero = out;
    })();

    var px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);
    var pk = new Float32Array(N), pph = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      px[i] = shapes.hero[i][0]; py[i] = shapes.hero[i][1]; pz[i] = shapes.hero[i][2];
      pk[i] = 0.035 + rand() * 0.05;
      pph[i] = rand() * Math.PI * 2;
    }

    // ---- State ----------------------------------------------------------------
    var ACCENTS = {
      loading: [127, 214, 255], hero: [127, 214, 255], about: [255, 194, 122],
      work: [195, 164, 255], stack: [127, 184, 255], contact: [111, 245, 216]
    };
    var CAMERA = {
      loading: [0, 0.05], hero: [0, 0.05], about: [0.9, 0.18], work: [1.85, -0.1], stack: [2.8, 0.22], contact: [3.7, -0.16]
    };
    var target = "loading";
    var color = ACCENTS.loading.slice();
    var shapeAlpha = 0, shapeSpin = 0;
    var camYaw = 0, camPitch = 0.05, camDist = 11, drift = 0;
    var mouseX = 0, mouseY = 0, mx = 0, my = 0;
    var anchor = null;
    var running = false, last = 0;

    window.addEventListener("pointermove", function (e) {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    function anchorFor() {
      var mobile = W / DPR <= 700;
      if (mobile) return { x: W * 0.5, y: H * 0.17, s: Math.min(W * 0.26, H * 0.12) };
      var wide = W / DPR > 1100;
      return { x: W * (wide ? 0.72 : 0.76), y: H * 0.45, s: Math.min(W * (wide ? 0.13 : 0.11), H * 0.2) };
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.round(window.innerWidth * DPR);
      H = Math.round(window.innerHeight * DPR);
      canvas.width = W;
      canvas.height = H;
      anchor = anchorFor();
      if (!running) frame(performance.now());
    }

    function frame(now) {
      var dt = Math.min(48, now - (last || now)) / 16.67;
      last = now;
      var motion = reduceMotion ? 0 : 1;

      // Ease global state toward the active section
      var acc = ACCENTS[target];
      for (var c = 0; c < 3; c++) color[c] += (acc[c] - color[c]) * 0.05 * dt;
      var cam = CAMERA[target];
      camYaw += (cam[0] + drift - camYaw) * 0.035 * dt;
      camPitch += (cam[1] - camPitch) * 0.035 * dt;
      camDist += (3.6 - camDist) * 0.03 * dt;
      drift += 0.0006 * dt * motion;
      mx += (mouseX - mx) * 0.04 * dt;
      my += (mouseY - my) * 0.04 * dt;
      var showShape = target !== "hero" && target !== "loading";
      shapeAlpha += ((showShape ? 1 : 0) - shapeAlpha) * 0.05 * dt;
      shapeSpin += 0.004 * dt * motion;
      var goal = anchorFor();
      anchor.x += (goal.x - anchor.x) * 0.08 * dt;
      anchor.y += (goal.y - anchor.y) * 0.08 * dt;
      anchor.s += (goal.s - anchor.s) * 0.08 * dt;

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      var t = now * 0.001;
      var dot = 1.3 * DPR;

      // Lattice
      var yaw = camYaw + mx * 0.25, pitch = camPitch + my * 0.15;
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var f = Math.min(W, H) * 0.95, cx0 = W / 2, cy0 = H / 2;
      var br = (W / DPR <= 700 ? 0.38 : 0.48) + color[0] / 255 * 0.06, lr = (150 + color[0] * 0.4) | 0, lg = (190 + color[1] * 0.25) | 0, lb = (235 + color[2] * 0.08) | 0;
      ctx.fillStyle = "rgb(" + Math.min(255, lr) + "," + Math.min(255, lg) + "," + Math.min(255, lb) + ")";
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

      // Section shape: morph toward the target shape and draw
      var tgt = shapes[target] || shapes.hero;
      for (var j = 0; j < N; j++) {
        var k = reduceMotion ? 1 : Math.min(1, pk[j] * dt);
        px[j] += (tgt[j][0] - px[j]) * k;
        py[j] += (tgt[j][1] - py[j]) * k;
        pz[j] += (tgt[j][2] - pz[j]) * k;
      }
      if (shapeAlpha > 0.01) {
        var S = anchor.s, ax = anchor.x, ay = anchor.y;
        var g = ctx.createRadialGradient(ax, ay, 0, ax, ay, S * 2.2);
        var rgb = (color[0] | 0) + "," + (color[1] | 0) + "," + (color[2] | 0);
        g.addColorStop(0, "rgba(" + rgb + "," + (0.16 * shapeAlpha) + ")");
        g.addColorStop(1, "rgba(" + rgb + ",0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.fillRect(ax - S * 2.2, ay - S * 2.2, S * 4.4, S * 4.4);

        var ry = shapeSpin + mx * 0.6, rx = 0.35 + Math.sin(shapeSpin * 0.7) * 0.15 + my * 0.4;
        var c1 = Math.cos(ry), s1 = Math.sin(ry), c2 = Math.cos(rx), s2 = Math.sin(rx);
        var D = 3.4;
        ctx.fillStyle = "rgb(" + rgb + ")";
        for (var q = 0; q < N; q++) {
          var X = px[q], Y = py[q], Z = pz[q];
          var X1 = X * c1 - Z * s1, Z1 = X * s1 + Z * c1;
          var Y1 = Y * c2 - Z1 * s2, Z2 = Y * s2 + Z1 * c2 + D;
          if (Z2 < 0.3) continue;
          var P = D / Z2;
          var SX = ax + X1 * S * P, SY = ay + Y1 * S * P;
          var al = shapeAlpha * (0.35 + 0.65 * (P - 0.6)) * (0.65 + 0.35 * Math.sin(t * 2 + pph[q]));
          if (al < 0.02) continue;
          ctx.globalAlpha = Math.min(1, al);
          var ss = dot * (0.7 + P * 0.6);
          ctx.fillRect(SX, SY, ss, ss);
        }
        // A few bright sparks for the warm glints
        ctx.fillStyle = "#fff";
        for (var w = 0; w < N; w += 23) {
          var X3 = px[w], Y3 = py[w], Z3 = pz[w];
          var X4 = X3 * c1 - Z3 * s1, Z4 = X3 * s1 + Z3 * c1;
          var Y4 = Y3 * c2 - Z4 * s2, Z5 = Y3 * s2 + Z4 * c2 + D;
          var P2 = D / Z5;
          ctx.globalAlpha = shapeAlpha * 0.5 * (0.5 + 0.5 * Math.sin(t * 3 + pph[w]));
          ctx.fillRect(ax + X4 * S * P2, ay + Y4 * S * P2, dot * 1.1, dot * 1.1);
        }
      }
      ctx.globalAlpha = 1;

      if (running) requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduceMotion) return;
      running = true;
      last = 0;
      requestAnimationFrame(frame);
    }
    function stop() { running = false; }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });
    window.addEventListener("resize", resize);
    resize();

    return {
      start: start,
      setView: function (v) {
        target = v;
        if (reduceMotion) {
          // Settle immediately and draw one still frame
          var acc = ACCENTS[v], cam = CAMERA[v];
          color = acc.slice(); camYaw = cam[0]; camPitch = cam[1]; camDist = 3.6;
          shapeAlpha = v === "hero" ? 0 : 1;
          frame(performance.now());
        }
      }
    };
  })();

  // ---------------------------------------------------------------------------
  // Boot: wait briefly for fonts, then fly in
  // ---------------------------------------------------------------------------
  scene.start();
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    setView(viewFromHash());
  }
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1500); })]).then(function () {
    setTimeout(boot, reduceMotion ? 0 : 500);
  });
})();
