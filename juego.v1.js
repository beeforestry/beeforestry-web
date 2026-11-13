/* "Abeja al vuelo" · minijuego de BeeForestry (Canvas 2D, sin librerías).
   Un botón: tocar / clic / Espacio / flecha ↑ para aletear. */
(function () {
  "use strict";
  var root = document.getElementById("bee-game");
  if (!root) return;

  var W = 360, H = 540, GROUND = 470;           // mundo lógico
  var BEE_X = 104, BEE_R = 11;
  var GRAVITY = 1450, FLAP = -420, MAX_FALL = 620;
  var OB_W = 64, SPACING = 214;
  var BEST_KEY = "beeforestry-abeja-best";
  var landscapeMQ = window.matchMedia ? window.matchMedia("(orientation: landscape) and (max-height: 520px)") : { matches: false };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var canvas = root.querySelector("canvas");
  var ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if (!ctx) return;
  var screens = {
    start: root.querySelector('[data-screen="start"]'),
    over: root.querySelector('[data-screen="over"]'),
    pause: root.querySelector('[data-screen="pause"]')
  };
  var soundBtn = root.querySelector(".game-sound");
  var live = root.querySelector("[data-live]");

  var state = "idle";            // idle | ready | play | falling | over | paused
  var bee, obstacles, score, best = 0, speed, t = 0, scroll = 0, lastPalette = -1;
  var raf = 0, lastTs = 0, visible = false, inited = false, scale = 1, dpr = 1;
  var overAt = 0, readyFromPause = false, flashT = 0;

  try { best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) {}

  /* ---------- Paletas ---------- */
  var HIVES = [
    ["#f6d27a", "#e3b552"],   // mantequilla
    ["#a9c9a4", "#87ad82"],   // salvia
    ["#f4b3a6", "#df9384"],   // coral
    ["#a9cfe0", "#86b4c9"],   // cielo
    ["#d9c4ec", "#bea5d6"],   // lavanda
    ["#ebbd7a", "#d9a35c"]    // caramelo
  ];
  var FLOWERS = ["#f28f86", "#f5b942", "#ef7aa0", "#ffffff"];

  /* ---------- Utilidades ---------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function seeded(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  /* ---------- Sonido (apagado por defecto; se crea solo si lo encienden) ---------- */
  var audio = null, soundOn = false;
  function tone(f1, f2, dur, type, vol, delay) {
    if (!soundOn || !audio) return;
    var t0 = audio.currentTime + (delay || 0);
    var o = audio.createOscillator(), g = audio.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.05, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(audio.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  var sfx = {
    flap: function () { tone(420, 640, 0.09, "sine", 0.045); },
    point: function () { tone(880, 900, 0.07, "triangle", 0.05); tone(1320, 1340, 0.1, "triangle", 0.045, 0.07); },
    hit: function () { tone(260, 70, 0.28, "square", 0.035); }
  };
  soundBtn.addEventListener("click", function () {
    soundOn = !soundOn;
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    soundBtn.setAttribute("aria-label", soundOn ? "Apagar sonido" : "Encender sonido");
    if (soundOn && !audio) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { try { audio = new AC(); } catch (e) { audio = null; } }
    }
    if (audio && audio.state === "suspended") audio.resume();
    if (soundOn) sfx.point();
  });

  /* ---------- Tamaño del canvas (nítido en pantallas retina) ---------- */
  function resize() {
    var r = root.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    scale = r.width / W;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    draw();
  }

  /* ---------- Mundo ---------- */
  function reset() {
    bee = { y: 236, vy: 0, rot: 0, wing: 0, baseY: 236 };
    obstacles = []; score = 0; speed = 150; scroll = 0; flashT = 0;
    spawn(W + 70);
  }
  function spawn(x) {
    var gap = Math.max(132, 156 - score * 1.2);
    var prev = obstacles.length ? obstacles[obstacles.length - 1].gapY : 240;
    var minY = 70 + gap / 2, maxY = GROUND - 56 - gap / 2;
    var gy = clamp(prev + rnd(-150, 150), minY, maxY);
    var p; do { p = Math.floor(Math.random() * HIVES.length); } while (p === lastPalette);
    lastPalette = p;
    obstacles.push({ x: x, gapY: gy, gap: gap, pal: p, seed: 1 + Math.floor(Math.random() * 99999), scored: false });
  }

  function flap() {
    if (state === "ready") { state = "play"; readyFromPause = false; }
    if (state !== "play") return;
    bee.vy = FLAP; bee.wing = 1; sfx.flap();
  }

  function hitTest() {
    if (bee.y + BEE_R >= GROUND) return true;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (BEE_X + BEE_R < o.x - 2 || BEE_X - BEE_R > o.x + OB_W + 2) continue;
      var top = o.gapY - o.gap / 2, bot = o.gapY + o.gap / 2;
      // rectángulos de colisión (con un poquito de perdón)
      if (circleRect(BEE_X, bee.y, BEE_R, o.x + 3, -50, OB_W - 6, top + 50 - 4)) return true;
      if (circleRect(BEE_X, bee.y, BEE_R, o.x - 2, bot + 2, OB_W + 4, GROUND - bot)) return true;
    }
    return false;
  }
  function circleRect(cx, cy, r, x, y, w, h) {
    var nx = clamp(cx, x, x + w), ny = clamp(cy, y, y + h);
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  function update(dt) {
    t += dt;
    bee.wing = Math.max(0, bee.wing - dt * 4);
    if (state === "idle" || state === "ready") {
      if (!(state === "idle" && reduceMotion)) bee.y = bee.baseY + Math.sin(t * 3.2) * 7;
      bee.rot = Math.sin(t * 3.2) * 0.05;
      if (state === "ready" && !readyFromPause) scroll += speed * 0.6 * dt;
      return;
    }
    if (state === "play") {
      speed = 150 + Math.min(score * 2.5, 70);
      scroll += speed * dt;
      bee.vy = Math.min(bee.vy + GRAVITY * dt, MAX_FALL);
      bee.y += bee.vy * dt;
      if (bee.y < BEE_R) { bee.y = BEE_R; bee.vy = 0; }
      bee.rot = clamp(bee.vy / 900, -0.42, 1.1);
      for (var i = 0; i < obstacles.length; i++) {
        var o = obstacles[i];
        o.x -= speed * dt;
        if (!o.scored && o.x + OB_W < BEE_X - BEE_R) {
          o.scored = true; score++; flashT = 1; sfx.point();
        }
      }
      if (obstacles.length && obstacles[0].x < -OB_W - 30) obstacles.shift();
      var last = obstacles[obstacles.length - 1];
      if (last.x < W - SPACING) spawn(last.x + SPACING);
      flashT = Math.max(0, flashT - dt * 3);
      if (hitTest()) crash();
      return;
    }
    if (state === "falling") {
      bee.vy = Math.min(bee.vy + GRAVITY * dt, MAX_FALL * 1.2);
      bee.y = Math.min(bee.y + bee.vy * dt, GROUND - BEE_R + 2);
      bee.rot = Math.min(bee.rot + dt * 5, 1.4);
      if (performance.now() - overAt > 650) showOver();
    }
  }

  function crash() {
    state = "falling"; overAt = performance.now(); sfx.hit();
    root.classList.remove("is-playing");
    if (bee.vy < 0) bee.vy = 0;
    if (navigator.vibrate && !reduceMotion) { try { navigator.vibrate(25); } catch (e) {} }
  }

  /* ---------- Dibujo ---------- */
  function draw() {
    if (!ctx || !bee) return;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    drawSky();
    for (var i = 0; i < obstacles.length; i++) drawObstacle(obstacles[i]);
    drawGround();
    drawBee(BEE_X, bee.y, bee.rot);
    if (state === "play" || state === "falling" || (state === "ready" && readyFromPause)) drawScore();
    if (state === "ready") drawHint();
  }

  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, "#fbe9c4"); g.addColorStop(0.55, "#fdf3dd"); g.addColorStop(1, "#f3efdc");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // sol suave
    var sg = ctx.createRadialGradient(282, 92, 6, 282, 92, 120);
    sg.addColorStop(0, "rgba(255,214,120,.95)"); sg.addColorStop(0.25, "rgba(255,214,120,.55)"); sg.addColorStop(1, "rgba(255,214,120,0)");
    ctx.fillStyle = sg; ctx.fillRect(150, 0, 220, 230);
    // nubes
    ctx.fillStyle = "rgba(255,255,255,.75)";
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 170 - scroll * 0.08) % 510 + 510) % 510 - 75, cy = 70 + c * 46;
      ctx.beginPath(); ctx.ellipse(cx, cy, 34, 11, 0, 0, 6.283); ctx.ellipse(cx + 22, cy - 7, 22, 12, 0, 0, 6.283); ctx.ellipse(cx - 20, cy - 3, 18, 9, 0, 0, 6.283); ctx.fill();
    }
    // lomas lejanas (paralaje)
    hills(0.18, 390, 34, "#cfdcc0", 0.011);
    hills(0.35, 420, 26, "#b5cba6", 0.017);
  }
  function hills(par, base, amp, color, freq) {
    var off = scroll * par;
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, GROUND);
    for (var x = 0; x <= W + 12; x += 12) {
      var wx = x + off;
      ctx.lineTo(x, base - Math.sin(wx * freq) * amp - Math.sin(wx * freq * 2.3 + 1) * amp * 0.35);
    }
    ctx.lineTo(W, GROUND); ctx.closePath(); ctx.fill();
  }

  function drawGround() {
    ctx.fillStyle = "#8fb27f"; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#7aa06b"; ctx.fillRect(0, GROUND + 12, W, H - GROUND);
    ctx.fillStyle = "#e9dcbf"; ctx.fillRect(0, GROUND + 34, W, H - GROUND);
    ctx.fillStyle = "#dccca9"; ctx.fillRect(0, GROUND + 34, W, 3);
    // borde de grama ondulado + florecitas
    ctx.fillStyle = "#9cc08a"; ctx.beginPath(); ctx.moveTo(0, GROUND + 4);
    var off = scroll % 18;
    for (var x = -off; x <= W + 18; x += 18) { ctx.quadraticCurveTo(x + 9, GROUND - 6, x + 18, GROUND + 4); }
    ctx.lineTo(W, GROUND + 14); ctx.lineTo(0, GROUND + 14); ctx.closePath(); ctx.fill();
    var fo = scroll % 56;
    for (var f = -fo, k = Math.floor(scroll / 56); f < W + 56; f += 56, k++) {
      ctx.fillStyle = FLOWERS[((k % 4) + 4) % 4];
      var fx = f + 20, fy = GROUND + 22;
      for (var p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(fx + Math.cos(p * 1.2566) * 3.2, fy + Math.sin(p * 1.2566) * 3.2, 2.4, 0, 6.283); ctx.fill(); }
      ctx.fillStyle = "#f2b632"; ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, 6.283); ctx.fill();
    }
  }

  function drawObstacle(o) {
    var top = o.gapY - o.gap / 2, bot = o.gapY + o.gap / 2, x = o.x;
    drawFoliage(x, top, o.seed);
    drawHives(x, bot, HIVES[o.pal], o.seed);
  }

  // Cortina colgante de follaje tropical con flores (tipo trinitaria), no un tubo
  function drawFoliage(x, bottom, seed) {
    var r = seeded(seed), cx = x + OB_W / 2;
    var shades = ["#5f8f5c", "#6f9e69", "#7fab74", "#8fb983", "#a3c794"];
    // ramita
    ctx.strokeStyle = "#7a5a3a"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx + 4, -10);
    ctx.bezierCurveTo(cx - 10, bottom * 0.35, cx + 12, bottom * 0.7, cx - 2, bottom - 8); ctx.stroke();
    // masa de hojas: círculos irregulares en capas (oscuro atrás, claro al frente)
    for (var layer = 0; layer < 2; layer++) {
      for (var y = -16; y < bottom - 6; y += 13) {
        for (var k = 0; k < 3; k++) {
          var px = x + 10 + k * 22 + (r() - 0.5) * 10;
          var rad = (layer ? 9 : 13) + r() * 5;
          ctx.fillStyle = shades[layer ? 2 + Math.floor(r() * 3) : Math.floor(r() * 2)];
          ctx.beginPath(); ctx.arc(px, y + (r() - 0.5) * 8, rad, 0, 6.283); ctx.fill();
        }
      }
    }
    // hojitas sueltas en los bordes
    for (var yy = 10; yy < bottom - 10; yy += 34) {
      leaf(x + 2, yy + r() * 10, 2.4 + r() * 0.5, 15 + r() * 4, shades[3]);
      leaf(x + OB_W - 2, yy + 14 + r() * 10, 0.3 + r() * 0.4, 15 + r() * 4, shades[2]);
    }
    // borde inferior con hojas colgantes
    leaf(cx - 16, bottom - 8, 1.95, 17, shades[1]);
    leaf(cx + 14, bottom - 6, 1.2, 16, shades[3]);
    leaf(cx - 1, bottom - 6, 1.6, 15, shades[4]);
    // flores repartidas y racimo en la punta
    var main = FLOWERS[Math.floor(r() * 3)];
    for (var fy = 12; fy < bottom - 30; fy += 38) {
      flower(x + 12 + r() * (OB_W - 24), fy + r() * 16, 4.5 + r() * 2, r() < 0.7 ? main : FLOWERS[Math.floor(r() * 4)]);
    }
    flower(cx - 13, bottom - 10, 8.5, main);
    flower(cx + 13, bottom - 16, 7, FLOWERS[Math.floor(r() * 4)]);
    flower(cx + 1, bottom - 2, 6, main);
  }
  function leaf(x, y, ang, len, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(len - 3, 0); ctx.stroke();
    ctx.restore();
  }
  function flower(x, y, r, color) {
    ctx.fillStyle = color;
    for (var p = 0; p < 5; p++) {
      var a = p * 1.2566 - 1.57;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.72, r * 0.52, a, 0, 6.283); ctx.fill();
    }
    ctx.fillStyle = "#f2b632"; ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#b5670c"; ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, 6.283); ctx.fill();
  }

  // Colmenas de colores apiladas (cajas tipo Langstroth con tapa)
  function drawHives(x, top, pal, seed) {
    var lidH = 12, boxH = 46;
    // sombra
    ctx.fillStyle = "rgba(60,50,20,.10)"; rr(x + 2, top + 6, OB_W + 4, GROUND - top, 6); ctx.fill();
    // tapa
    ctx.fillStyle = "#fffaf0"; rr(x - 5, top, OB_W + 10, lidH, 4); ctx.fill();
    ctx.fillStyle = "#e9dfc9"; ctx.fillRect(x - 5, top + lidH - 3, OB_W + 10, 3);
    // cajas
    var y = top + lidH, i = 0;
    while (y < GROUND) {
      var h = Math.min(boxH, GROUND - y + 4);
      var c = i % 2 ? pal[1] : pal[0];
      ctx.fillStyle = c; ctx.fillRect(x, y, OB_W, h);
      // luz lateral
      ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(x + 4, y, 6, h);
      ctx.fillStyle = "rgba(0,0,0,.06)"; ctx.fillRect(x + OB_W - 8, y, 8, h);
      // agarradera
      if (h > 26) { ctx.fillStyle = "rgba(60,40,10,.28)"; rr(x + OB_W / 2 - 10, y + 14, 20, 6, 3); ctx.fill(); }
      // línea entre cajas
      ctx.fillStyle = "rgba(60,40,10,.16)"; ctx.fillRect(x, y + h - 2, OB_W, 2);
      y += boxH; i++;
    }
    // piquera (entrada) justo encima de la grama
    ctx.fillStyle = "#3b2a10"; rr(x + 14, GROUND - 9, OB_W - 28, 5, 2.5); ctx.fill();
  }

  function drawBee(x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    var flapA = state === "falling" ? 0.2 : (bee.wing > 0 ? Math.sin(t * 60) : Math.sin(t * 26)) ;
    // alas (detrás)
    ctx.fillStyle = "rgba(255,255,255,.78)"; ctx.strokeStyle = "rgba(120,160,190,.55)"; ctx.lineWidth = 1;
    ctx.save(); ctx.translate(-2, -9); ctx.rotate(-0.5 + flapA * 0.45);
    ctx.beginPath(); ctx.ellipse(-4, -9, 8, 13, -0.3, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.restore();
    // aguijón
    ctx.fillStyle = "#3a2a12"; ctx.beginPath(); ctx.moveTo(-17, 1); ctx.lineTo(-23, 3); ctx.lineTo(-16, 5); ctx.closePath(); ctx.fill();
    // cuerpo
    var bg = ctx.createRadialGradient(-2, -5, 2, 0, 0, 20);
    bg.addColorStop(0, "#ffd866"); bg.addColorStop(1, "#eba51c");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 2, 18, 13.5, 0, 0, 6.283); ctx.fill();
    // rayas
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 2, 18, 13.5, 0, 0, 6.283); ctx.clip();
    ctx.fillStyle = "#3a2a12";
    ctx.fillRect(-9, -14, 5.5, 32); ctx.fillRect(1, -14, 5.5, 32);
    ctx.restore();
    // cara
    ctx.fillStyle = "#3a2a12"; ctx.beginPath(); ctx.arc(11, -1, 3, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(11.9, -2.1, 1.1, 0, 6.283); ctx.fill();
    ctx.fillStyle = "rgba(242,143,134,.55)"; ctx.beginPath(); ctx.arc(13, 5, 2.6, 0, 6.283); ctx.fill();
    ctx.strokeStyle = "#3a2a12"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
    if (state === "falling" || state === "over") {
      ctx.beginPath(); ctx.moveTo(14, 6); ctx.lineTo(17, 6); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(15, 4.5, 2.4, 0.3, 2.2); ctx.stroke();
    }
    // antenas
    ctx.beginPath(); ctx.moveTo(8, -10); ctx.quadraticCurveTo(11, -18, 16, -18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -11); ctx.quadraticCurveTo(6, -20, 10, -21); ctx.stroke();
    ctx.fillStyle = "#3a2a12"; ctx.beginPath(); ctx.arc(16, -18, 1.6, 0, 6.283); ctx.arc(10, -21, 1.6, 0, 6.283); ctx.fill();
    // ala delantera
    ctx.fillStyle = "rgba(255,255,255,.88)"; ctx.strokeStyle = "rgba(120,160,190,.6)";
    ctx.save(); ctx.translate(1, -10); ctx.rotate(-0.15 + flapA * 0.55);
    ctx.beginPath(); ctx.ellipse(0, -10, 8.5, 14, 0.15, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.restore();
  }

  function drawScore() {
    var s = String(score), size = 46 + flashT * 8;
    ctx.save();
    ctx.font = "700 " + size + "px Fraunces, Georgia, serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.lineJoin = "round"; ctx.lineWidth = 8; ctx.strokeStyle = "rgba(255,250,238,.95)";
    ctx.shadowColor = "rgba(30,74,40,.25)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.strokeText(s, W / 2, 30 - flashT * 4);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#1e4a28"; ctx.fillText(s, W / 2, 30 - flashT * 4);
    ctx.restore();
  }
  function drawHint() {
    var a = reduceMotion ? 1 : 0.65 + Math.sin(t * 4) * 0.35;
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = "600 17px 'DM Sans', system-ui, sans-serif"; ctx.textAlign = "center";
    var msg = readyFromPause ? "Toque para seguir" : "Toque para aletear";
    var w = ctx.measureText(msg).width + 34;
    ctx.fillStyle = "rgba(255,252,245,.92)"; rr(W / 2 - w / 2, 318, w, 38, 19); ctx.fill();
    ctx.fillStyle = "#1e4a28"; ctx.fillText(msg, W / 2, 343);
    ctx.restore();
  }

  /* ---------- Bucle ---------- */
  function loop(ts) {
    raf = 0;
    var dt = lastTs ? Math.min((ts - lastTs) / 1000, 1 / 30) : 1 / 60;
    lastTs = ts;
    update(dt); draw();
    if (needsLoop()) raf = requestAnimationFrame(loop);
  }
  function needsLoop() {
    if (!visible || document.hidden) return false;
    if (state === "play" || state === "falling" || state === "ready") return true;
    if (state === "idle") return !reduceMotion;
    return false;
  }
  function kick() {
    if (!raf && needsLoop()) { lastTs = 0; raf = requestAnimationFrame(loop); }
    else if (!needsLoop()) draw();
  }

  /* ---------- Pantallas ---------- */
  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
  }
  function fitInView() {
    var r = root.getBoundingClientRect(), vh = window.innerHeight;
    var bar = document.querySelector(".mobile-cta"), barH = 0;
    if (bar && getComputedStyle(bar).display !== "none") barH = bar.getBoundingClientRect().height + 8;
    var head = document.querySelector(".top"), headH = 0;
    if (head && !landscapeMQ.matches && getComputedStyle(head).position === "sticky") headH = head.getBoundingClientRect().height;
    var room = vh - barH - headH, dy = 0;
    if (r.height <= room) {
      if (r.top < headH + 8) dy = r.top - headH - 8;
      else if (r.bottom > vh - barH) dy = r.bottom - (vh - barH);
    } else dy = r.top - headH - 4;
    if (Math.abs(dy) > 2) window.scrollBy({ top: dy, behavior: reduceMotion ? "auto" : "smooth" });
  }
  function start() {
    reset(); bee.baseY = bee.y; state = "ready"; readyFromPause = false;
    show(null); root.classList.add("is-playing"); document.documentElement.classList.add("bee-playing");
    canvas.focus({ preventScroll: true });
    fitInView(); kick();
  }
  function showOver() {
    state = "over";
    var isNew = score > best;
    if (isNew) { best = score; try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} }
    screens.over.querySelector("[data-score]").textContent = score;
    screens.over.querySelector("[data-best]").textContent = best;
    screens.over.querySelector("[data-newbest]").hidden = !(isNew && score > 0);
    screens.over.querySelector("h3").textContent = score === 0 ? "¡Uy! Otra vez" : "¡Buen vuelo!";
    updateBestLabels();
    if (live) live.textContent = "Fin del juego. Puntos: " + score + ". Récord: " + best + ".";
    show("over"); draw();
    var b = screens.over.querySelector("button");
    if (root.contains(document.activeElement)) b.focus({ preventScroll: true });
  }
  function pause() {
    if (state !== "play" && state !== "ready") return;
    state = "paused"; root.classList.remove("is-playing"); show("pause");
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    draw();
  }
  function resume() {
    state = "ready"; readyFromPause = true; bee.baseY = bee.y; bee.vy = 0;
    show(null); root.classList.add("is-playing"); document.documentElement.classList.add("bee-playing");
    canvas.focus({ preventScroll: true }); fitInView(); kick();
  }
  function updateBestLabels() {
    [].forEach.call(root.querySelectorAll("[data-best-start]"), function (el) { el.textContent = best; });
  }

  root.addEventListener("click", function (e) {
    var b = e.target.closest("[data-action]");
    if (b) {
      var a = b.getAttribute("data-action");
      if (a === "play") start();
      if (a === "resume") resume();
      return;
    }
    // Tocar en cualquier parte del juego (fuera del panel) también empieza / reinicia / sigue.
    // Se usa "click" y no "pointerdown" para que deslizar el dedo para bajar la página no arranque el juego.
    var ov = e.target.closest(".game-overlay");
    if (!ov || e.target.closest(".game-panel")) return;
    if (state === "over" && performance.now() - overAt < 900) return;
    if (state === "idle" || state === "over") start();
    else if (state === "paused") resume();
  });

  /* ---------- Controles ---------- */
  canvas.addEventListener("pointerdown", function (e) {
    if (state !== "ready" && state !== "play") return;
    e.preventDefault();
    if (e.pointerType === "mouse" && e.button !== 0) return;
    flap();
  });
  // iOS: sin zoom por doble toque, sin menú de mantener presionado, sin rebote mientras se juega
  canvas.addEventListener("touchstart", function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
  canvas.addEventListener("touchmove", function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
  canvas.addEventListener("dblclick", function (e) { e.preventDefault(); });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  document.addEventListener("keydown", function (e) {
    var k = e.code || e.key;
    var isFlap = k === "Space" || k === " " || k === "ArrowUp" || k === "Up";
    if (!isFlap) return;
    var ae = document.activeElement, tag = ae && ae.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (ae && ae.isContentEditable)) return;
    if ((state === "ready" || state === "play") && visible) {
      e.preventDefault(); if (!e.repeat) flap(); return;
    }
    // En inicio / fin: Espacio arranca solo si el juego tiene el foco (si no, la página baja normal)
    if ((state === "idle" || state === "over") && ae === canvas && k !== "ArrowUp") {
      if (state === "over" && performance.now() - overAt < 900) { e.preventDefault(); return; }
      e.preventDefault(); start();
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pause(); else kick();
  });
  window.addEventListener("pagehide", pause);
  window.addEventListener("blur", function () { if (state === "play") pause(); });

  /* ---------- Inicio perezoso: nada corre hasta que la sección esté cerca ---------- */
  function init() {
    if (inited) return; inited = true;
    reset(); updateBestLabels(); show("start");
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(root);
    else window.addEventListener("resize", resize);
    resize();
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) init();
      });
    }, { rootMargin: "400px 0px" }).observe(root);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        visible = en.isIntersecting;
        if (!visible) { pause(); document.documentElement.classList.remove("bee-playing"); } else kick();
      });
    }, { threshold: 0.35 }).observe(root);
  } else { init(); visible = true; }
})();
