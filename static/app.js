/* AB Media landing: content, sky of screens, reel montage, journey story, live chart, films, form.
   Scroll choreography lives in motion.js; this file works on its own if motion.js or GSAP fails to load. */
(() => {
"use strict";

const DATA = window.ABM_DATA;
const { L, P, CASES } = window.ABM_I18N;
const FEAT = DATA.featured;
const MODEL = DATA.cjm;
const root = document.documentElement;

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;
/* phones get light copies of the films (media/m/: 854 px, no sound, ~4x smaller) for the opening, the previews
   and the planner, so the photos are not stuck behind 14 MB downloads; the viewing room always plays the full film */
const LITE = coarse || matchMedia("(max-width: 760px)").matches;
const vsrc = name => "media/" + (LITE ? "m/" : "") + name + ".mp4";
/* on phones the films wait until the page and its photos have arrived: on a slow connection the text and the photos come first */
const afterLoad = fn => { if (document.readyState === "complete") setTimeout(fn, 600); else addEventListener("load", () => setTimeout(fn, 600), { once: true }); };
let pageReady = !LITE;
if (LITE) afterLoad(() => { pageReady = true; if (reel.i >= 0) show(reel.i); monSync(); });
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const NS = "http://www.w3.org/2000/svg";
function icon(id, cls){ const s = document.createElementNS(NS, "svg"); s.setAttribute("class", "ic" + (cls ? " " + cls : "")); s.setAttribute("aria-hidden", "true"); const u = document.createElementNS(NS, "use"); u.setAttribute("href", "#i-" + id); s.append(u); return s; }
const svg = (tag, attrs) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
const fill = (str, v) => str.replace("{n}", v);
const pname = (id, l) => P[id][l] || P[id].en;
const byClient = n => CASES.findIndex(c => c.client === n);
const metric = n => DATA.metrics.find(m => m.client === n) || {};
const store = { get(k, s){ try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } }, set(k, v, s){ try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} } };
const M = () => window.ABM_MOTION && window.ABM_MOTION.ready ? window.ABM_MOTION : null;

let lang = "en";
const qLang = new URLSearchParams(location.search).get("lang"), saved = store.get("abm-lang2");
if (qLang && L[qLang]) lang = qLang; else if (saved && L[saved]) lang = saved;
const T = () => L[lang];
const LOCALE = { en: "en-US", es: "es-ES", ru: "ru-RU", ar: "ar-u-nu-latn" };
const fmt = n => Math.round(n).toLocaleString(LOCALE[lang] || "en-US");
const dec = x => String(Math.round(x * 10) / 10).replace(".", lang === "en" ? "." : ",");
const tr = o => (o && (o[lang] || o.en)) || "";

const builder = { goal: "trust", have: "task", dist: "yes" };
let brief = null, calc = null, mode = 0, jmode = 1, reach = MODEL.reach_default, openIdx = -1, lastName = "", scene = "top";
let story = { step: -1 };

/* split text into word spans; words marked *like this* get the accent */
function words(text, markRe){
  const marked = markRe ? text.replace(markRe, (_, s) => s.split(/\s+/).map(w => "\u0001" + w).join(" ")) : text;
  return marked.split(/\s+/).filter(Boolean).map(w => ({ text: w.replace("\u0001", ""), hl: w.startsWith("\u0001") }));
}
function goTo(sel){ const t = $(sel); if (!t) return; if (M()) M().scrollTo(t); else t.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }

/* ---------- 01 a sky of light: scattered stars -> a play button -> a frame of pixels -> the film ---------- */
const sky = { p: 0, q: 0, run: false };
function heroFrame(){
  const W = innerWidth, H = ($(".hero-pin") && $(".hero-pin").clientHeight) || innerHeight, narrow = W < 760 || W < H;
  const w = narrow ? W * .84 : Math.min(W * .46, H * .6 * 16 / 9), h = w * 9 / 16;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}
function frameClip(){ const f = heroFrame(); return "inset(" + f.y.toFixed(1) + "px " + f.x.toFixed(1) + "px " + f.y.toFixed(1) + "px " + f.x.toFixed(1) + "px round 10px)"; }
function initStars(){
  const cv = $("#stars"), g = cv.getContext("2d"), host = $(".hero-pin");
  let W = 0, H = 0, cx = 0, cy = 0, R = 0, ps = [], raf = 0, last = 0, t = 0, TRI = null;
  /* pointer in canvas space, with a decaying velocity: stars near it shimmer and drift the way it moves */
  const mouse = { x: -9999, y: -9999, vx: 0, vy: 0, on: false };
  const sprite = (r, gg, b) => { const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d"), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(" + r + "," + gg + "," + b + ",1)"); gr.addColorStop(.28, "rgba(" + r + "," + gg + "," + b + ",.55)"); gr.addColorStop(1, "rgba(" + r + "," + gg + "," + b + ",0)"); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return c; };
  const SPR = [sprite(237, 241, 241), sprite(255, 214, 150), sprite(244, 166, 42)];
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function build(n){
    ps = [];
    for (let i = 0; i < n; i++) {
      /* role in the play button: 0 ring, 1 triangle edge, 2 triangle fill */
      const u = rnd(), role = u < .3 ? 0 : u < .55 ? 1 : 2;
      ps.push({ sx: rnd(), sy: rnd(), role, u1: rnd(), u2: rnd(), j: (rnd() - .5) * 2,
        sz: .6 + Math.pow(rnd(), 3) * 2.2, c: role === 2 ? (rnd() < .55 ? 1 : 2) : (rnd() < .25 ? 1 : 0), a: .35 + rnd() * .65, ph: rnd() * 6.28, tw: .6 + rnd() * 2.2,
        px: 0, py: 0, fx: 0, fy: 0, fs: 1, ox: 0, oy: 0, glow: 0 });
    }
  }
  let lw = 0, lh = 0;
  function layout(){
    /* phones resize the page whenever the address bar slides; a height change that small is not worth a rebuild */
    if (coarse && ps.length && host.clientWidth === lw && Math.abs(host.clientHeight - lh) < 160) return;
    lw = host.clientWidth; lh = host.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
    W = host.clientWidth; H = host.clientHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const narrow = W < 760 || W < H;
    /* on tall layouts the ring sits between AB and MEDIA, so it may only use the height they leave free */
    cx = W / 2; cy = H / 2; R = narrow ? Math.max(60, Math.min(W * .36, H * .2, (H - 420) / 2)) : Math.max(60, Math.min(W * .15, H * .32, H / 2 - 150));
    /* the gap the two halves of the mark leave for the play button */
    root.style.setProperty("--hole", (narrow ? R * 2 + 40 : R * 2 + W * .05).toFixed(0) + "px");
    const n = coarse ? 520 : narrow ? 900 : 1700; if (ps.length !== n) build(n);
    /* play button: a ring of light and a triangle (edge + fill), optically centred a little to the right */
    const A = [cx - R * .34, cy - R * .5], B = [cx - R * .34, cy + R * .5], C = [cx + R * .52, cy];
    TRI = [A, B, C];
    const edge = (k) => { const L = k * 3; const q = L % 1; const [P0, P1] = L < 1 ? [A, B] : L < 2 ? [B, C] : [C, A]; return [P0[0] + (P1[0] - P0[0]) * q, P0[1] + (P1[1] - P0[1]) * q]; };
    const f = heroFrame(), per = Math.floor(n * .42), m = n - per, cols = Math.max(4, Math.round(Math.sqrt(m * 16 / 9))), rows = Math.ceil(m / cols), Pm = 2 * (f.w + f.h);
    ps.forEach((s, i) => {
      if (s.role === 0) { const an = s.u1 * 6.2832, rr = R * (1 + s.j * .025); s.px = cx + Math.cos(an) * rr; s.py = cy + Math.sin(an) * rr; }
      else if (s.role === 1) { const [x, y] = edge(s.u1); s.px = x + s.j * 1.5; s.py = y + s.j * 1.5; }
      else { let a1 = s.u1, b1 = s.u2; if (a1 + b1 > 1) { a1 = 1 - a1; b1 = 1 - b1; } s.px = A[0] + (B[0] - A[0]) * a1 + (C[0] - A[0]) * b1; s.py = A[1] + (B[1] - A[1]) * a1 + (C[1] - A[1]) * b1; }
      /* frame targets: an outline of light plus a lattice of "pixels" inside it */
      if (i < per) {
        let d = i / per * Pm;
        if (d < f.w) { s.fx = f.x + d; s.fy = f.y; } else if ((d -= f.w) < f.h) { s.fx = f.x + f.w; s.fy = f.y + d; } else if ((d -= f.h) < f.w) { s.fx = f.x + f.w - d; s.fy = f.y + f.h; } else { d -= f.w; s.fx = f.x; s.fy = f.y + f.h - d; }
        s.fs = 1.3;
      } else { const j = i - per; s.fx = f.x + (j % cols + .5) / cols * f.w; s.fy = f.y + (Math.floor(j / cols) + .5) / rows * f.h; s.fs = .7; }
    });
    if (!M()) $("#reel").style.clipPath = frameClip();
    draw(performance.now());
  }
  const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  function draw(now){
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; t += dt;
    const p = sky.p, k1 = Math.max(reduce ? 1 : sky.q, ss(0, .3, p)), k2 = ss(.36, .6, p), fade = 1 - ss(.62, .76, p);
    g.clearRect(0, 0, W, H);
    mouse.vx *= .88; mouse.vy *= .88;
    if (fade <= 0) return;
    /* a soft warm light behind the play button */
    const core = k1 * (1 - k2) * fade;
    if (core > 0) { const cr = R * 1.3, gr = g.createRadialGradient(cx, cy, 0, cx, cy, cr); gr.addColorStop(0, "rgba(255,214,150," + (.22 * core).toFixed(3) + ")"); gr.addColorStop(.5, "rgba(244,166,42," + (.07 * core).toFixed(3) + ")"); gr.addColorStop(1, "rgba(244,166,42,0)"); g.fillStyle = gr; g.fillRect(cx - cr, cy - cr, cr * 2, cr * 2); }
    /* hooks that pull the eye into the button: the film already plays through the triangle,
       a wave of light leaves the ring every few seconds, and an arc fills as soon as you start to scroll */
    const live = core * (1 - ss(.2, .36, p));
    const v = reel.vids[reel.i];
    if (live > .02 && TRI && v && v.readyState >= 2) {
      g.save(); g.beginPath(); g.moveTo(TRI[0][0], TRI[0][1]); g.lineTo(TRI[1][0], TRI[1][1]); g.lineTo(TRI[2][0], TRI[2][1]); g.closePath(); g.clip();
      const bw = TRI[2][0] - TRI[0][0], bh = TRI[1][1] - TRI[0][1], s = Math.max(bw / v.videoWidth, bh / v.videoHeight) || 1;
      g.globalAlpha = .62 * live; g.drawImage(v, (TRI[0][0] + TRI[2][0]) / 2 - v.videoWidth * s / 2, cy - v.videoHeight * s / 2, v.videoWidth * s, v.videoHeight * s);
      g.restore(); g.globalAlpha = 1;
    }
    if (live > .02 && !reduce) {
      const w = (t % 3.2) / 3.2;
      g.strokeStyle = "rgba(255,214,150," + (.35 * (1 - w) * live).toFixed(3) + ")"; g.lineWidth = 1.5;
      g.beginPath(); g.arc(cx, cy, R * (1.04 + w * .55), 0, 6.2832); g.stroke();
      const arc = ss(0, .3, p);
      if (arc > .005) { g.strokeStyle = "rgba(244,166,42," + (.9 * fade).toFixed(3) + ")"; g.lineWidth = 3; g.lineCap = "round"; g.beginPath(); g.arc(cx, cy, R * 1.1, -Math.PI / 2, -Math.PI / 2 + arc * 6.2832); g.stroke(); }
    }
    g.globalCompositeOperation = "lighter";
    const RAD = 130, sp = Math.hypot(mouse.vx, mouse.vy);
    for (const s of ps) {
      const sx = s.sx * W + Math.sin(t * .2 + s.ph) * 4, sy = s.sy * H + Math.cos(t * .17 + s.ph) * 4;
      /* the button breathes a little so it reads as light, not a drawing */
      const br = 1 + Math.sin(t * 1.4 + s.ph) * .012;
      const gx = cx + (s.px - cx) * br, gy = cy + (s.py - cy) * br;
      let x = sx + (gx - sx) * k1, y = sy + (gy - sy) * k1;
      x += (s.fx - x) * k2; y += (s.fy - y) * k2;
      /* the pointer: stars it passes shimmer and drift along its direction, then spring back */
      if (mouse.on && k2 < .5) {
        const dx = x + s.ox - mouse.x, dy = y + s.oy - mouse.y, d = Math.hypot(dx, dy);
        if (d < RAD) { const f = (1 - d / RAD) * (1 - d / RAD); s.ox += mouse.vx * f * .045 + dx / (d + 1) * f * (1.2 + sp * .004); s.oy += mouse.vy * f * .045 + dy / (d + 1) * f * (1.2 + sp * .004); s.glow = Math.max(s.glow, f * Math.min(1, .35 + sp / 900)); }
      }
      s.ox *= .93; s.oy *= .93; s.glow *= .94;
      x += s.ox; y += s.oy;
      const flick = s.glow > .02 ? .5 + .5 * Math.sin(t * 24 + s.ph * 3) : 1;
      const al = (s.a * (.6 + .4 * Math.sin(t * s.tw + s.ph)) * (.7 + .3 * k1) + s.glow * flick * .9) * fade;
      const sz = (s.sz * (1 + (s.role === 2 ? .35 : .15) * k1) * (1 - k2) + s.fs * k2 * 1.6) * (1 + s.glow * .9), d = sz * 4;
      g.globalAlpha = Math.min(1, al);
      g.drawImage(SPR[s.glow > .3 ? 1 : k2 > .5 && s.fs > 1 ? 2 : s.c], x - d / 2, y - d / 2, d, d);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  }
  function loop(now){ raf = 0; draw(now); if (sky.run) raf = requestAnimationFrame(loop); }
  const kick = () => { if (!raf && sky.run) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const vis = { on: true };
  const update = () => { sky.run = vis.on && !reduce && !document.hidden; kick(); };
  new IntersectionObserver(es => { vis.on = es[0].isIntersecting; update(); }).observe(host);
  document.addEventListener("visibilitychange", update);
  new ResizeObserver(layout).observe(host);
  if (!reduce) {
    host.addEventListener("pointermove", e => {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (mouse.on) { mouse.vx += (x - mouse.x) * 6; mouse.vy += (y - mouse.y) * 6; }
      mouse.x = x; mouse.y = y; mouse.on = true;
    }, { passive: true });
    host.addEventListener("pointerleave", () => { mouse.on = false; });
  }
  layout();
  sky.draw = () => draw(performance.now());
  /* the stars appear everywhere, then gather into the play button on their own */
  if (!reduce) {
    const t0 = performance.now() + (store.get("abm-intro", true) ? 900 : 1900), dur = 2600;
    const step = now => { const k = Math.min(1, Math.max(0, (now - t0) / dur)); sky.q = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  } else sky.q = 1;
}
function setHero(p){ sky.p = p; if (!sky.run && sky.draw) sky.draw(); }

/* ---------- hero copy ---------- */
function renderHero(){
  const t = T();
  $("#h1").textContent = t.hero_tag;
  const line = $("#line"); line.replaceChildren();
  t.hero_line.split("\n").forEach((ln, li) => {
    if (li) line.append(el("br"));
    words(ln).forEach((w, i) => { if (i) line.append(" "); line.append(el("span", "lw" + (li ? " hl" : ""), w.text)); });
  });
}

/* ---------- reel: a montage of the featured films ---------- */
const SHOT = 5200, START = [.22, .3, .35, .25];
const reel = { i: -1, timer: 0, prep: 0, vids: [], on: true, shots: FEAT.map(byClient) };
function initReel(){
  const media = $("#reel-media"), segs = $("#segs");
  root.style.setProperty("--shot", SHOT + "ms");
  reel.shots.forEach((ci, k) => {
    const v = el("video"); v.muted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "none";
    /* phones only ever show the first film here, so only its cover is fetched */
    if (!LITE || k === 0) v.poster = "media/" + CASES[ci].video + ".jpg";
    v.addEventListener("loadedmetadata", () => { if (v.dataset.seeked) return; v.dataset.seeked = "1"; try { v.currentTime = v.duration * START[k]; } catch (e) {} });
    media.append(v); reel.vids.push(v); segs.append(el("i"));
  });
  reel.load = k => { const v = reel.vids[k]; if (!pageReady) return; if (!v.src) { v.src = vsrc(CASES[reel.shots[k]].video); v.preload = "auto"; v.load(); } };
  show(0);
  new IntersectionObserver(es => { reel.on = es[0].isIntersecting; sync(); }).observe($("#reel"));
  document.addEventListener("visibilitychange", sync);
  $("#reel").addEventListener("click", () => openRoom(reel.shots[reel.i]));
}
function show(k){
  reel.i = k;
  const v = reel.vids[k];
  if (!reduce) { reel.load(k); const p = v.play(); if (p && p.catch) p.catch(() => {}); }
  reel.vids.forEach((x, j) => { x.classList.toggle("on", j === k); if (j !== k) setTimeout(() => { if (reel.i !== j) x.pause(); }, 950); });
  $$("#segs i").forEach((s, j) => { s.className = j < k ? "done" : j === k && !reduce && !coarse ? "on" : ""; });
  reelTag();
  clearTimeout(reel.timer); clearTimeout(reel.prep);
  /* phones keep one film: loading and switching a 14 MB video every few seconds stalls a phone */
  if (reduce || coarse) return;
  reel.prep = setTimeout(() => reel.load((k + 1) % reel.vids.length), SHOT - 2200);
  reel.timer = setTimeout(() => show((k + 1) % reel.vids.length), SHOT);
}
function reelTag(){ const c = CASES[reel.shots[reel.i]], m = metric(c.client); $("#reel-name").textContent = c.client; $("#reel-meta").textContent = m.views ? m.views + " " + T().k_views : c.dur; }
function sync(){
  const run = reel.on && !document.hidden && !reduce, v = reel.vids[reel.i];
  if (!v) return;
  if (run) { const p = v.play(); if (p && p.catch) p.catch(() => {}); if (!reel.timer) show(reel.i); }
  else { v.pause(); clearTimeout(reel.timer); clearTimeout(reel.prep); reel.timer = 0; $$("#segs i.on").forEach(s => s.className = ""); }
}

/* ---------- manifesto ---------- */
function renderManifest(){
  const p = $("#mf"); p.replaceChildren();
  words(T().mf, /\*(.*?)\*/g).forEach((w, i) => { if (i) p.append(" "); p.append(el("span", "w" + (w.hl ? " hl" : ""), w.text)); });
}

/* ---------- 03 customer journey: four quick beats ---------- */
const STAGE_NOW = MODEL.now, STAGE_FILM = MODEL.film;
const lvl = (arr, i) => Math.sqrt(arr[i] / arr[0]);
function storyVars(){
  const n = STAGE_NOW, f = STAGE_FILM;
  return { r0: fmt(n[0]), r1: fmt(n[1]), r2: fmt(n[2]), r3: fmt(n[3]), f1: fmt(f[1]), f2: fmt(f[2]), f3: fmt(f[3]),
    lost1: fmt(n[0] - n[1]), p2: Math.round((1 - n[2] / n[1]) * 100), x: dec(f[3] / n[3]) };
}
const fillVars = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : "");
function renderStory(){
  const t = T(), v = storyVars();
  const ol = $("#beats"); ol.replaceChildren();
  t.s_steps.forEach(([h, p]) => { const li = el("li"); li.append(el("b", null, fillVars(h, v)), el("p", null, fillVars(p, v))); ol.append(li); });
  const cols = $("#cols"); cols.replaceChildren();
  t.j_stages.forEach((h, i) => {
    const c = el("div", "col"), bar = el("div", "bar"), f = el("i", "fill"); bar.append(f); c.style.gridColumn = String(i + 1);
    const meta = el("div", "meta"), val = el("span", "v", fmt(STAGE_NOW[i])); val.dataset.v = STAGE_NOW[i];
    meta.append(val, el("span", "k", h));
    if (i) meta.append(el("span", "d", "+" + Math.round((STAGE_FILM[i] / STAGE_NOW[i] - 1) * 100) + "%"));
    c.append(bar, meta); cols.append(c);
  });
  const z = el("div", "zone"); z.append(el("span", null, t.j_zone)); cols.append(z);
  const s = story.step; story.step = -1; setStoryStep(s < 0 ? (M() ? 0 : 3) : s);
}
/* the section snaps to 0, 1/3, 2/3 and 1, so each beat sits in the middle of its own range */
function setStory(p){ setStoryStep(p < 1 / 6 ? 0 : p < .5 ? 1 : p < 5 / 6 ? 2 : 3); }
function setStoryStep(step){
  if (step === story.step) return;
  story.step = step;
  const film = step === 3, arr = film ? STAGE_FILM : STAGE_NOW;
  $$("#beats li").forEach((li, i) => { li.classList.toggle("on", i === step); li.classList.toggle("past", i < step); });
  $("#cols").classList.toggle("film", film);
  $$("#cols .col").forEach((c, i) => {
    c.classList.toggle("off", !film && i > step);
    c.querySelector(".fill").style.setProperty("--v", (film || i <= step) ? lvl(arr, i).toFixed(4) : "0");
    tweenNum(c.querySelector(".v"), arr[i]);
  });
  flow.step = step;
}
function tweenNum(node, to){
  const from = +node.dataset.v || 0; node.dataset.v = to;
  if (reduce || from === to) { node.textContent = fmt(to); return; }
  const t0 = performance.now(), d = 500;
  const tick = now => { const k = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k, 3); node.textContent = fmt(from + (to - from) * e); if (k < 1 && +node.dataset.v === to) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

/* people flowing through the stages: a flat 2D canvas */
const flow = { step: 0, run: false };
function initFlow(){
  const cv = $("#flow"), box = $("#funnel"), g = cv.getContext("2d");
  let W = 0, H = 0, gates = [], base = 0, laneTop = 0, laneH = 0;
  const N = 240, ps = [];
  function layout(){
    const dpr = Math.min(devicePixelRatio || 1, 2); W = box.clientWidth; H = box.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const b = box.getBoundingClientRect();
    gates = $$("#cols .bar").map(x => { const r = x.getBoundingClientRect(); return { x: r.left - b.left + r.width / 2, w: r.width }; });
    const bar = $("#cols .bar"); if (bar) { const r = bar.getBoundingClientRect(); base = r.bottom - b.top - 6; laneTop = r.top - b.top + r.height * .38; laneH = r.height * .3; }
  }
  const rates = () => { const s = flow.step === 3 ? STAGE_FILM : STAGE_NOW; return [s[1] / s[0], s[2] / s[1], s[3] / s[2]]; };
  function spawn(p, x){
    const r = rates(); let f = 0;
    if (Math.random() < r[0]) { f = 1; if (Math.random() < r[1]) { f = 2; if (Math.random() < r[2]) f = 3; } }
    p.x = x; p.y = laneTop + Math.random() * laneH; p.vx = 60 + Math.random() * 40; p.vy = 0; p.f = f; p.st = 0; p.t = 0; p.a = 0;
  }
  for (let i = 0; i < N; i++) { const p = {}; spawn(p, -Math.random() * 900); ps.push(p); }
  let last = performance.now(), raf = 0;
  function frame(now){
    raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now;
    g.clearRect(0, 0, W, H);
    if (!gates.length) layout();
    const edge = flow.step === 3 ? W + 20 : (gates[flow.step] ? gates[flow.step].x + gates[flow.step].w * .5 : W);
    g.globalCompositeOperation = "lighter";
    for (const p of ps) {
      if (p.st === 0) {
        p.x += p.vx * dt;
        const gi = p.f + 1;
        if (gi < 4 && gates[gi] && gi <= flow.step && p.x >= gates[gi].x - gates[gi].w * .35) { p.st = 1; p.vy = -20 - Math.random() * 30; p.vx *= .25; }
        p.a = Math.min(1, p.a + dt * 3) * (p.x > edge ? Math.max(0, 1 - (p.x - edge) / 50) : 1);
        if (p.x > edge + 50 || p.x > W + 10) spawn(p, -10 - Math.random() * 120);
        if (p.x > 0) { g.fillStyle = "rgba(255,197,106," + (.85 * p.a).toFixed(3) + ")"; g.beginPath(); g.arc(p.x, p.y, 2.1, 0, 6.283); g.fill(); }
      } else {
        if (p.st === 1) { p.vy += 260 * dt; p.y += p.vy * dt; p.x += p.vx * dt; if (p.y >= base) { p.y = base; p.st = 2; p.t = 0; } }
        else { p.t += dt; if (p.t > 1.6) { spawn(p, -10 - Math.random() * 120); continue; } }
        const k = p.st === 2 ? Math.max(0, 1 - p.t / 1.6) : 1;
        g.fillStyle = "rgba(143,154,160," + (.55 * k).toFixed(3) + ")"; g.beginPath(); g.arc(p.x, p.y, 1.9, 0, 6.283); g.fill();
      }
    }
    g.globalCompositeOperation = "source-over";
    if (flow.run) raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf && flow.run) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(es => { flow.run = es[0].isIntersecting && !reduce; start(); }).observe(box);
  new ResizeObserver(() => layout()).observe(box);
  flow.layout = layout;
  layout();
}

/* ---------- calculator ---------- */
const R_STEPS = 1000, LMIN = Math.log(MODEL.reach_min), LMAX = Math.log(MODEL.reach_max);
const toReach = v => { const r = Math.exp(LMIN + (LMAX - LMIN) * v / R_STEPS); const step = r < 200000 ? 10000 : r < 1000000 ? 50000 : 100000; return Math.min(MODEL.reach_max, Math.max(MODEL.reach_min, Math.round(r / step) * step)); };
const fromReach = r => Math.round((Math.log(r) - LMIN) / (LMAX - LMIN) * R_STEPS);
const scaled = (arr, i) => arr[i] * reach / MODEL.base_reach;
function journeyNumbers(){
  const now = [0, 1, 2, 3].map(i => scaled(MODEL.now, i)), film = [0, 1, 2, 3].map(i => scaled(MODEL.film, i));
  return { now, film, extra: film[3] - now[3], x: film[3] / now[3] };
}
function renderJourney(){
  const t = T(), n = journeyNumbers(), cur = jmode ? n.film : n.now;
  $$("#jmode button").forEach(b => { const m = +b.dataset.m; b.textContent = t.j_modes[m]; b.setAttribute("aria-pressed", String(m === jmode)); });
  $("#reach-o").textContent = fmt(reach);
  const box = $("#jstages");
  if (!box.children.length || box.dataset.lang !== lang) {
    box.replaceChildren(); box.dataset.lang = lang;
    t.j_stages.forEach((h, i) => {
      const ours = i === 1 || i === 2, d = el("article", "jc" + (ours ? " ours" : ""));
      const k = el("span", "k"); k.append(el("span", null, "0" + (i + 1))); if (ours) k.append(el("i", null, t.j_ours));
      const v = el("div", "v", fmt(cur[i])); v.dataset.v = cur[i];
      d.append(k, el("h3", null, h), v);
      if (i > 0) d.append(el("span", "delta"), el("span", "lost"));
      box.append(d);
    });
  }
  $$("#jstages .jc").forEach((d, i) => {
    tweenNum(d.querySelector(".v"), cur[i]);
    if (i > 0) {
      const dl = d.querySelector(".delta"); dl.hidden = !jmode; dl.textContent = "+" + Math.round((n.film[i] / n.now[i] - 1) * 100) + "%";
      d.querySelector(".lost").textContent = "−" + fmt(cur[i - 1] - cur[i]);
    }
  });
  $("#jsum").innerHTML = t.j_sum.replace("{n}", fmt(n.extra)).replace("{x}", dec(n.x));
}
const reachIn = $("#reach");
reachIn.min = 0; reachIn.max = R_STEPS; reachIn.step = 1; reachIn.value = fromReach(reach);
reachIn.addEventListener("input", () => { reach = toReach(+reachIn.value); renderJourney(); });
$$("#jmode button").forEach(b => b.addEventListener("click", () => { jmode = +b.dataset.m; renderJourney(); }));
$("#jsend").addEventListener("click", () => {
  const n = journeyNumbers();
  calc = { reach, buyers_now: Math.round(n.now[3]), buyers_film: Math.round(n.film[3]), extra: Math.round(n.extra) };
  renderBrief(); goForm();
});

/* ---------- 04 ads vs brand film: a playhead runs through time ---------- */
const AD_PATH = "M40 330 C 90 330, 110 110, 170 100 S 300 92, 420 96 S 540 92, 560 96 C 590 100, 610 300, 660 318 S 900 326, 960 326";
const FILM_PATH = "M40 330 C 160 326, 230 260, 330 210 S 520 130, 640 104 S 860 70, 960 58";
const X0 = 40, X1 = 960, XEND = 560, YB = 330, YT = 40;
const duel = { lut: null, p: -1 };
function renderDuel(){
  const s = $("#scope-svg"); s.replaceChildren();
  const defs = svg("defs");
  const grad = svg("linearGradient", { id: "film-fade", x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.append(svg("stop", { offset: "0", "stop-color": "#F4A62A", "stop-opacity": ".28" }), svg("stop", { offset: "1", "stop-color": "#F4A62A", "stop-opacity": "0" }));
  const clip = svg("clipPath", { id: "duel-clip" }); const rect = svg("rect", { x: 0, y: -20, width: X0, height: 400 }); clip.append(rect);
  defs.append(grad, clip); s.append(defs);
  [120, 200, 280].forEach(y => s.append(svg("line", { class: "g", x1: X0, x2: X1, y1: y, y2: y })));
  s.append(svg("line", { class: "g base", x1: X0, x2: X1, y1: YB, y2: YB }));
  s.append(svg("line", { class: "end", x1: XEND, x2: XEND, y1: 10, y2: YB }));
  const grp = svg("g", { "clip-path": "url(#duel-clip)" });
  grp.append(svg("path", { class: "area", d: FILM_PATH + " L960 330 L40 330 Z" }), svg("path", { class: "ln ln-ad", d: AD_PATH }), svg("path", { class: "ln ln-film", d: FILM_PATH }));
  s.append(grp);
  const head = svg("line", { class: "head", x1: X0, x2: X0, y1: 10, y2: YB }); s.append(head);
  const sample = d => { const p = svg("path", { d }); s.append(p); const len = p.getTotalLength(), pts = []; for (let i = 0; i <= 600; i++) { const q = p.getPointAtLength(len * i / 600); pts.push([q.x, q.y]); } p.remove(); return pts; };
  duel.lut = { ad: sample(AD_PATH), film: sample(FILM_PATH) };
  duel.rect = rect; duel.head = head;
  const p = duel.p; duel.p = -1; setDuel(p < 0 ? (M() ? 0 : 1) : p);
}
const yAt = (pts, x) => { let lo = 0, hi = pts.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][0] < x) lo = m; else hi = m; } const a = pts[lo], b = pts[hi], k = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * k; };
function setDuel(p){
  if (!duel.lut || p === duel.p) return;
  duel.p = p;
  const x = X0 + (X1 - X0) * Math.max(0, Math.min(1, p));
  duel.rect.setAttribute("width", x); duel.head.setAttribute("x1", x); duel.head.setAttribute("x2", x);
  [["#probe-ad", duel.lut.ad], ["#probe-film", duel.lut.film]].forEach(([sel, lut]) => {
    const y = yAt(lut, x), pr = $(sel);
    pr.style.setProperty("--px", (x / 10).toFixed(2) + "%"); pr.style.setProperty("--py", (y / 3.6).toFixed(2) + "%");
    pr.classList.toggle("flip", x > 780);
    pr.querySelector("b").textContent = Math.max(0, Math.round((YB - y) / (YB - YT) * 100)) + "%";
  });
  $("#scope").classList.toggle("ended", x >= XEND);
}

/* ---------- planner ---------- */
function recommend(){
  /* AB Media's own steps: audit, positioning, story, content, go-to-market, then running the campaign */
  const { goal, have, dist } = builder; let fmtI, stages;
  if (have === "agency") { fmtI = 0; stages = ["aud", "story", "contS", "gtm"]; }
  else if (have === "idea") { fmtI = 1; stages = ["aud", "story", "cont", "gtm"]; }
  else { fmtI = 1; stages = ["aud", "pos", "story", "cont", "gtm"]; }
  if (dist === "yes") { stages = stages.concat("run"); if (fmtI === 1) fmtI = 2; }
  const pick = have === "agency"
    ? { launch: "IMZO", trust: "Grand Capital", explain: "Sales Doctor Academy", social: "ZO'R TV" }[goal]
    : { launch: "Good Day Cappuccino", trust: "To'xtaniyoz Ota", explain: "Sales Doctor Academy", social: "ZO'R TV" }[goal];
  return { fmt: fmtI, stages, ci: byClient(pick) };
}
function renderBuilder(){
  const t = T(), f = $("#bq"); f.replaceChildren();
  [["goal", t.b_goal], ["have", t.b_have], ["dist", t.b_dist]].forEach(([key, opts], gi) => {
    const fs = el("fieldset"); const lg = el("legend"); lg.append(el("b", null, String(gi + 1)), t.b_q[gi]); fs.append(lg);
    const row = el("div", "opts");
    Object.entries(opts).forEach(([v, label]) => {
      const id = "b-" + key + "-" + v; const inp = el("input"); inp.type = "radio"; inp.name = "b-" + key; inp.id = id; inp.value = v; inp.checked = builder[key] === v;
      inp.addEventListener("change", () => { builder[key] = v; renderResult(); });
      const lab = el("label", null, label); lab.htmlFor = id; row.append(inp, lab);
    });
    fs.append(row); f.append(fs);
  });
  renderResult();
}
function goForm(){ goTo("#request"); setTimeout(() => $("#f-name").focus({ preventScroll: true }), reduce ? 0 : 1100); }
/* the answer is shown as an edit in progress: a monitor playing a similar film with the format as a
   lower third, and an editing timeline where every stage is a clip and a playhead runs over them */
const STAGE_W = { aud: .9, pos: 1, story: 1.3, cont: 1.7, contS: 1.7, gtm: 1.4, run: 1.6 };
const desk = { raf: 0, on: false, t0: performance.now(), lastCase: -1 };
function renderResult(){
  const t = T(), r = recommend(), box = $("#bres"), cs = CASES[r.ci];
  const changedCase = desk.lastCase !== r.ci; desk.lastCase = r.ci;
  /* monitor: keep the playing video when only the stages change */
  let mon = box.querySelector(".mon");
  if (!mon || changedCase) {
    mon = el("button", "mon"); mon.type = "button"; mon.dataset.cursor = "play";
    const v = el("video"); v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.dataset.poster = "media/" + cs.video + ".jpg";
    /* the film (and its cover) load only once the planner is near the screen (see runDesk), so they never compete with the photos above */
    if (!reduce) { v.preload = "none"; v.dataset.src = vsrc(cs.video) + "#t=6"; } else v.poster = v.dataset.poster;
    mon.append(v, el("span", "mon-rec"), el("span", "mon-l3"), el("span", "mon-tc"));
    mon.addEventListener("click", () => openRoom(desk.lastCase));
  }
  mon.querySelector(".mon-rec").textContent = "● REC";
  mon.querySelector(".mon-tc").textContent = cs.client + " · " + cs.dur;
  const l3 = mon.querySelector(".mon-l3"); l3.replaceChildren(el("small", null, t.r_format), el("b", null, t.fm[r.fmt][0]), el("em", null, t.r_focus + ": " + t.focus[builder.goal]));
  l3.classList.remove("in"); void l3.offsetWidth; l3.classList.add("in");
  /* timeline: ruler, one track of clips, a playhead */
  const tl = el("div", "edit");
  const ruler = el("div", "ruler"); for (let i = 0; i <= 6; i++) ruler.append(el("span", null, "00:" + String(i * 10).padStart(2, "0")));
  const track = el("div", "track-e"), total = r.stages.reduce((s, k) => s + (STAGE_W[k] || 1), 0);
  r.stages.forEach((k, i) => {
    const clip = el("span", "clip" + (/S$/.test(k) ? " sup" : "") + (k === "dist" ? " dist" : ""), t.sc[k]);
    clip.style.flexGrow = (STAGE_W[k] || 1) / total; clip.style.setProperty("--i", i);
    track.append(clip);
  });
  const head = el("i", "phead");
  tl.append(ruler, track, head);
  const acts = el("div", "acts");
  const send = el("button", "btn btn-t"); send.type = "button"; send.append(el("span", null, t.r_send), icon("arrow"));
  send.addEventListener("click", () => { brief = { fmt: r.fmt, goal: builder.goal, have: builder.have, dist: builder.dist }; renderBrief(); goForm(); });
  const watch = el("button", "linkbtn"); watch.type = "button"; watch.append(el("span", null, t.r_watch + ": " + cs.client), icon("arrow"));
  watch.addEventListener("click", () => openRoom(r.ci));
  acts.append(send, watch);
  box.replaceChildren(mon, tl, acts);
  runDesk(); monSync();
}
function monSync(){
  const v = $("#bres .mon video"); if (!v || reduce) return;
  if (desk.on && !v.poster) v.poster = v.dataset.poster;
  if (desk.on && pageReady) { if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.preload = "auto"; } const p = v.play(); if (p && p.catch) p.catch(() => {}); }
  else if (v.src) v.pause();
}
/* the playhead sweeps the track every 6 s and lights the clip under it */
function runDesk(){
  if (desk.io) return;
  desk.io = new IntersectionObserver(es => { desk.on = es[0].isIntersecting && !reduce; monSync(); if (desk.on && !desk.raf) desk.raf = requestAnimationFrame(step); }, { threshold: .1, rootMargin: "200px 0px" });
  desk.io.observe($("#bres"));
  function step(now){
    desk.raf = 0;
    const track = $("#bres .track-e"), head = $("#bres .phead");
    if (track && head) {
      const k = ((now - desk.t0) / 6000) % 1, w = track.clientWidth;
      head.style.transform = "translateX(" + (k * w).toFixed(1) + "px)";
      let x = 0; for (const c of track.children) { const cw = c.offsetWidth + 3; c.classList.toggle("hot", k * w >= x && k * w < x + cw); x += cw; }
    }
    if (desk.on) desk.raf = requestAnimationFrame(step);
  }
}
function renderBrief(){
  const box = $("#brief"), t = T(); box.replaceChildren();
  if (!brief && !calc) { box.hidden = true; return; }
  box.hidden = false;
  const s = el("span", "bt");
  if (brief) s.append(el("small", null, t.brief_l), document.createTextNode(t.fm[brief.fmt][0] + " · " + t.b_goal[brief.goal]));
  if (calc) s.append(el("small", null, t.calc_l), document.createTextNode(t.calc_s.replace("{r}", fmt(calc.reach)).replace("{n}", fmt(calc.extra))));
  const x = el("button", "bx"); x.type = "button"; x.setAttribute("aria-label", t.remove); x.append(icon("x"));
  x.addEventListener("click", () => { brief = null; calc = null; renderBrief(); });
  box.append(s, x);
}

/* ---------- process ---------- */
function renderProcess(){
  const t = T();
  $$("#modes button").forEach(b => { const m = +b.dataset.m; b.textContent = t.modes[m]; b.setAttribute("aria-pressed", String(m === mode)); });
  $("#mode-d").textContent = t.mode_d[mode];
  /* with your team: they make the content, AB Media leads the rest */
  const kinds = mode === 0 ? ["full", "full", "full", "full", "full", "full"] : ["full", "full", "full", "with", "sup", "sup"];
  const ol = $("#steps"), on = $$("#steps .step.on").length;
  ol.replaceChildren();
  t.steps.forEach(([h, p], i) => {
    const li = el("li", "step" + (kinds[i] === "you" ? " off" : "") + (i < on ? " on" : ""));
    const tx = el("div", "step-t"); tx.append(el("h3", null, h), el("p", null, p));
    li.append(el("span", "n", "0" + (i + 1)), tx, el("span", "chip " + kinds[i], t.chip[kinds[i]]));
    ol.append(li);
  });
}

/* ---------- 06 what we fix ---------- */
let fixIO = null;
function renderFixes(){
  const ol = $("#fixlist"), hit = $$("#fixlist .fx.hit").length; ol.replaceChildren();
  T().fixes.forEach(([a, b], i) => { const li = el("li", "fx" + (i < hit ? " hit" : "")); li.append(el("span", "fx-old", a), el("span", "fx-new", b)); ol.append(li); });
  if (reduce || !("IntersectionObserver" in window)) { $$(".fx").forEach(x => x.classList.add("hit")); return; }
  if (!fixIO) fixIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("hit"); fixIO.unobserve(e.target); } }), { rootMargin: "0px 0px -32% 0px" });
  $$(".fx:not(.hit)").forEach(x => fixIO.observe(x));
}

/* ---------- viewing room ---------- */
const room = $("#room"), rv = $("#room-v");
function openRoom(i){
  if (i < 0) return;
  openIdx = i; rv.src = "media/" + CASES[i].video + ".mp4"; rv.poster = "media/" + CASES[i].video + ".jpg"; fillRoom();
  if (room.showModal) room.showModal(); else room.setAttribute("open", "");
  if (M()) M().pause(true);
  const p = rv.play(); if (p && p.catch) p.catch(() => {});
}
function fillRoom(){
  if (openIdx < 0) return;
  const t = T(), c = CASES[openIdx], [task, concept] = c.t[lang] || c.t.en;
  $("#room-title").textContent = c.client; $("#room-x").setAttribute("aria-label", t.close); $("#room-c").textContent = concept;
  const dl = $("#room-dl"); dl.replaceChildren();
  const add = (k, node) => { const d = el("div"); d.append(el("dt", null, k)); const dd = el("dd"); if (typeof node === "string") dd.textContent = node; else dd.append(node); d.append(dd); dl.append(d); };
  add(t.l_exec, c.exec); add(t.l_task, task);
  const s = el("span", "sl"); c.scope.forEach(k => s.append(el("span", null, t.sc[k]))); add(t.l_scope, s);
  const cr = el("div", "cr"); c.credits.forEach(([role, ids]) => { const row = el("div"); row.append(el("span", "r", t[role]), el("span", ids.includes("AB") ? "me" : null, ids.map(id => pname(id, lang)).join(lang === "ar" ? "، " : ", "))); cr.append(row); });
  add(t.l_team, cr);
  const tabs = $("#room-tabs"); tabs.replaceChildren(); tabs.hidden = !c.bts;
  if (c.bts) [[t.v_film, c.video], [t.v_bts, c.bts.video]].forEach(([label, src]) => {
    const b = el("button", null, label); b.type = "button"; b.setAttribute("aria-pressed", String(rv.src.endsWith("/" + src + ".mp4")));
    b.addEventListener("click", () => { rv.src = "media/" + src + ".mp4"; rv.poster = "media/" + src + ".jpg"; const p = rv.play(); if (p && p.catch) p.catch(() => {}); tabs.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
    tabs.append(b);
  });
}
function closeRoom(){ rv.pause(); if (room.open) room.close(); }
$("#room-x").addEventListener("click", closeRoom);
room.addEventListener("click", e => { if (e.target === room) closeRoom(); });
room.addEventListener("close", () => { rv.pause(); rv.removeAttribute("src"); rv.load(); openIdx = -1; if (M()) M().pause(false); });

/* ---------- 05 films: two on show, the rest behind "More films" ---------- */
const ORDER = FEAT.map(byClient).filter(i => i >= 0).concat(CASES.map((_, i) => i).filter(i => !FEAT.includes(CASES[i].client)));
const SHOWN = 2;
let filmsOpen = false;
function setFilmsLabel(){
  const t = T(), btn = $("#more-btn");
  $("#more-lbl").textContent = filmsOpen ? t.cs_less : t.cs_more;
  $("#more-n").textContent = filmsOpen ? "" : "+" + (ORDER.length - SHOWN);
  btn.setAttribute("aria-expanded", String(filmsOpen));
  btn.classList.toggle("open", filmsOpen);
}
function toggleFilms(){
  filmsOpen = !filmsOpen;
  $("#track").classList.toggle("open", filmsOpen);
  setFilmsLabel();
  const extra = $$("#track .cc.extra");
  if (filmsOpen && window.gsap && !reduce) gsap.fromTo(extra, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .6, ease: "power3.out", stagger: .07, clearProps: "opacity,transform" });
  if (!filmsOpen) { extra.forEach(c => preview(c.querySelector(".cc-media"), false)); if (M()) M().scrollTo("#cases"); }
  requestAnimationFrame(() => { if (M()) M().settle(); });
}
$("#more-btn").addEventListener("click", toggleFilms);
function renderCases(){
  const t = T(), track = $("#track"); track.replaceChildren();
  ORDER.forEach((i, k) => {
    const c = CASES[i], big = FEAT.includes(c.client), m = metric(c.client);
    const card = el("article", "cc" + (big ? " big" : "") + (k >= SHOWN ? " extra" : ""));
    const media = el("button", "cc-media"); media.type = "button"; media.dataset.cursor = "play"; media.dataset.video = c.video;
    media.setAttribute("aria-label", t.open_case + ": " + c.client);
    /* "lazy" must be set before the address, or the photo downloads at once even far down the page */
    const im = el("img"); im.loading = "lazy"; im.decoding = "async"; im.src = "media/" + c.video + ".jpg"; im.alt = "";
    const v = el("video"); v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "none";
    media.append(im, v, el("span", "cc-n", String(k + 1).padStart(2, "0")), el("span", "tc", c.dur + (c.bts ? " + " + c.bts.dur : "")));
    media.addEventListener("click", () => openRoom(i));
    const head = el("div", "cc-head"), l = el("div");
    l.append(el("h3", null, c.client), el("span", "cat", t.cat[c.client])); head.append(l);
    if (big && m.views) { const pill = el("div", "pill"); pill.append(el("b", null, m.views), el("span", null, t.k_views)); head.append(pill); }
    card.append(media, head);
    if (big && m.result) card.append(el("p", "res", tr(m.result)));
    track.append(card);
  });
  setFilmsLabel();
  const run = $("#run"); run.replaceChildren();
  for (let r = 0; r < 2; r++) CASES.forEach(c => run.append(el("span", null, c.client)));
  $("#run-sr").textContent = CASES.map(c => c.client).join(", ");
  bindPreviews();
}
/* a muted preview plays while the pointer rests on a film (or while it sits in view on touch screens) */
function preview(media, on){
  const v = media.querySelector("video");
  if (on && !reduce) {
    if (!v.src) v.src = vsrc(media.dataset.video) + "#t=4";
    const p = v.play(); if (p && p.then) p.then(() => media.classList.add("playing")).catch(() => {});
  } else { v.pause(); media.classList.remove("playing"); }
}
let previewIO = null;
function bindPreviews(){
  const medias = $$(".cc-media");
  if (finePointer) medias.forEach(m => { m.addEventListener("mouseenter", () => preview(m, true)); m.addEventListener("mouseleave", () => preview(m, false)); });
  else {
    if (previewIO) previewIO.disconnect();
    /* phones: a preview starts only after the film has stayed on screen for a moment, not while you scroll past it */
    previewIO = new IntersectionObserver(es => es.forEach(e => {
      const m = e.target; clearTimeout(m._pt);
      if (e.intersectionRatio > .7) m._pt = setTimeout(() => preview(m, true), 600); else preview(m, false);
    }), { threshold: [0, .7, 1] });
    medias.forEach(m => previewIO.observe(m));
  }
}

/* ---------- what happens next: three big frames on one strip of film ---------- */
const SHOTS = [
  { img: "media/portrait.jpg", pos: "30% 72%", zoom: 1.35, hud: "READING", kind: "scan" },
  { img: "media/abror-timessquare.jpg", pos: "50% 38%", zoom: 1.08, hud: "LIVE · 00:30:00", kind: "wave" },
  { img: "media/sales-doctor-backstage.jpg", pos: "50% 45%", zoom: 1.15, hud: "CONCEPT v1", kind: "grid" }
];
function renderShots(t){
  const box = $("#shots"), lit = $$("#shots .shot.lit").length;
  box.querySelectorAll(".shot").forEach(n => n.remove());
  t.nx.forEach((title, i) => {
    const s = SHOTS[i], f = el("figure", "shot" + (i < lit ? " lit" : ""));
    const im = el("img"); im.loading = "lazy"; im.decoding = "async"; im.src = s.img; im.alt = i < 2 ? t.name : ""; im.style.objectPosition = s.pos; im.style.setProperty("--z", s.zoom);
    const hud = el("span", "shot-hud"); hud.append(el("i"), document.createTextNode(s.hud));
    const fx = el("span", "shot-fx " + s.kind, null);
    if (s.kind === "wave") for (let k = 0; k < 18; k++) { const b = el("i"); b.style.setProperty("--k", k); fx.append(b); }
    const cap = el("figcaption"); cap.append(el("b", null, String(i + 1).padStart(2, "0")), el("h3", null, title));
    f.append(im, fx, hud, cap); box.append(f);
  });
}

/* ---------- slate ---------- */
function renderSlate(){
  const t = T(), b = $("#slate-board"); b.replaceChildren();
  [[t.slate[0], "AB MEDIA"], [t.slate[1], "11"], [t.slate[2], "1"], [t.slate[3], t.name]].forEach(([k, v]) => { const s = el("span"); s.append(el("small", null, k), el("b", null, v)); b.append(s); });
}
let slateT = 0;
function clap(hold){
  const s = $("#slate"); clearTimeout(slateT);
  s.classList.remove("hit"); void s.offsetWidth; s.classList.add("hit");
  if (!hold) slateT = setTimeout(() => s.classList.remove("hit"), 650);
}
$("#slate").addEventListener("click", () => clap(false));

/* ---------- contacts & footer ---------- */
/* contacts: Telegram and Instagram follow the page language, phone / YouTube / email are the same everywhere */
function contactHref(kind, v){
  if (kind === "tel") return "tel:" + String(v).replace(/[^\d+]/g, "");
  if (kind === "mail") return "mailto:" + v;
  if (/^https?:\/\//.test(v)) return v;
  const h = String(v).replace(/^@/, "");
  return { tg: "https://t.me/", ig: "https://instagram.com/", yt: "https://youtube.com/@" }[kind] + h;
}
/* a link is shown as its handle: https://t.me/name -> @name */
function contactText(kind, v){
  if (kind === "tel" || kind === "mail") return v;
  const m = /^https?:\/\/(?:www\.)?(?:t\.me|instagram\.com|youtube\.com)\/(?:c\/|channel\/|user\/)?@?([^/?#]+)/.exec(v);
  return m ? "@" + m[1] : v;
}
function renderMark(){
  const fm = $("#fm"); if (fm.querySelector(".ch")) return;
  "AB MEDIA".split("").forEach(ch => fm.append(ch === " " ? el("span", "sp") : el("span", "ch", ch)));
}

/* ---------- reveals: opacity + short rise, staggered ---------- */
let revealIO = null;
function bindReveals(){
  if (!revealIO) revealIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
  $$(".rv-c").forEach(c => Array.from(c.children).forEach((ch, i) => ch.style.setProperty("--d", Math.min(i, 8) * 60)));
  $$(".rv:not(.in),.rv-c:not(.in)").forEach(n => { if (n.getBoundingClientRect().top < innerHeight * .92) n.classList.add("in"); else revealIO.observe(n); });
}

/* ---------- full render ---------- */
const WHY_IC = ["reel", "clap", "link", "target"];
function render(){
  const t = T();
  root.lang = lang; root.dir = lang === "ar" ? "rtl" : "ltr";
  $$("[data-i]").forEach(n => { const v = t[n.dataset.i]; if (typeof v === "string") n.textContent = v; });
  $$(".langs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  $$("#nav a").forEach((a, i) => { a.textContent = t.nav[i]; });
  $("#offer").hidden = DATA.offer_bar === false || left < 0;
  $("#bar-t").replaceChildren(el("span", "bar-l", t.bar.replace("5", String(DATA.offer_minutes)) + " "), el("b", null, tr(DATA.bonus)));
  $("#why-img").alt = t.alt_p;
  renderHero();
  if (reel.i >= 0) reelTag();
  renderManifest();


  renderStory();
  renderJourney();
  renderDuel();
  renderCases();
  renderFixes();

  const rs = $("#reasons"); rs.replaceChildren(); rs.classList.add("rv-c");
  t.why.forEach((h, i) => { const li = el("li"); li.append(icon(WHY_IC[i]), el("span", null, h)); rs.append(li); });

  renderProcess();
  renderBuilder();

  renderShots(t);
  renderSlate();
  renderBrief();
  $$(".err[data-k], #send-err[data-k]").forEach(n => { if (!n.hidden) n.textContent = t[n.dataset.k]; });
  if (!$("#done").hidden) $("#done-msg").textContent = t.ok.replace("{n}", lastName);

  const fq = $("#faqlist"); fq.replaceChildren(); fq.classList.add("rv-c");
  t.faq.forEach(([q, a]) => { const d = el("details"); d.append(el("summary", null, q), el("p", null, a)); fq.append(d); });

  const ct = $("#contacts"); ct.replaceChildren();
  const cv = DATA.contacts;
  const forLang = o => (o && o[lang]) || null;
  [["tel", t.ct[0], cv.phone], ["tg", t.ct[1], forLang(cv.telegram)], ["ig", t.ct[2], forLang(cv.instagram)],
   ["yt", t.ct[4] || "YouTube", cv.youtube], ["mail", t.ct[3], cv.email]].forEach(([kind, label, v]) => {
    if (!v) return;  /* only contacts that really exist (in this language) */
    const d = el("a", "ct"); d.href = contactHref(kind, v); if (kind !== "tel" && kind !== "mail") { d.target = "_blank"; d.rel = "noopener"; }
    d.append(el("span", null, label), el("b", null, contactText(kind, v))); ct.append(d);
  });
  renderMark();
  setScene(scene);
  fillRoom();
  bindReveals();
  if (M()) M().refresh();
}

function setScene(id){
  scene = id;
  const ids = $$("[data-scene]").map(s => s.dataset.scene), n = Math.max(0, ids.indexOf(id)) + 1, t = T();
  $("#scene-n").textContent = String(n).padStart(2, "0");
  $("#scene-t").textContent = t.scene_l + " · " + (t.scene[id] || "");
}

$$(".langs button").forEach(b => b.addEventListener("click", () => { if (b.dataset.lang === lang) return; lang = b.dataset.lang; store.set("abm-lang2", lang); render(); }));
$$("#modes button").forEach(b => b.addEventListener("click", () => { mode = +b.dataset.m; renderProcess(); if (M()) M().refresh(); }));

/* ---------- form ---------- */
const form = $("#form");
function setErr(input, id, key){
  const e = $("#" + id);
  if (key) { e.dataset.k = key; e.textContent = T()[key]; e.hidden = false; input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", id); }
  else { delete e.dataset.k; e.hidden = true; input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); }
}
function utm(){ const q = new URLSearchParams(location.search), o = {}; ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach(k => { const v = q.get(k); if (v) o[k] = v.slice(0, 100); }); return o; }
const FIELD = { name: ["#f-name", "e-name", "e_name"], phone: ["#f-phone", "e-phone", "e_phone"], email: ["#f-email", "e-email", "e_email"] };
form.addEventListener("submit", async e => {
  e.preventDefault();
  const t = T(), n = $("#f-name"), p = $("#f-phone"), m = $("#f-email"), btn = form.querySelector('button[type="submit"]'), se = $("#send-err");
  const okN = n.value.trim().length >= 2;
  const digits = p.value.replace(/\D/g, "");
  const okP = /^\+?[\d\s().-]+$/.test(p.value.trim()) && digits.length >= 7 && digits.length <= 15;
  const okM = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m.value.trim());
  setErr(n, "e-name", okN ? null : "e_name"); setErr(p, "e-phone", okP ? null : "e_phone"); setErr(m, "e-email", okM ? null : "e_email");
  if (!okN) return n.focus(); if (!okP) return p.focus(); if (!okM) return m.focus();
  se.hidden = true;
  const lead = { name: n.value.trim(), phone: p.value.trim(), email: m.value.trim(), lang, brief, calc, website: $("#f-web").value, utm: utm(), page: location.pathname, referrer: document.referrer.slice(0, 300) };
  const label = btn.querySelector("span"); btn.disabled = true; label.textContent = t.sending;
  const fail = key => { btn.disabled = false; label.textContent = T().f_btn; se.dataset.k = key; se.textContent = T()[key]; se.hidden = false; };
  /* the static preview (Vercel test link) has no server behind it: show the success state without sending */
  if (!window.ABM_PREVIEW) try {
    const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
    if (res.status === 422) { const j = await res.json().catch(() => ({})); const f = FIELD[j.field]; btn.disabled = false; label.textContent = T().f_btn; if (f) { setErr($(f[0]), f[1], f[2]); $(f[0]).focus(); } else fail("e_send"); return; }
    if (res.status === 429) return fail("e_rate");
    if (!res.ok) throw new Error("HTTP " + res.status);
  } catch (err) { return fail("e_send"); }
  btn.disabled = false; label.textContent = T().f_btn;
  lastName = lead.name;
  form.hidden = true; $("#done").hidden = false;
  $("#done-msg").textContent = T().ok.replace("{n}", lastName);
  $("#done-h").focus({ preventScroll: true });
  clap(true);
});
Object.values(FIELD).forEach(([s, id]) => $(s).addEventListener("input", e => { if (e.target.getAttribute("aria-invalid")) setErr(e.target, id, null); }));
$("#again").addEventListener("click", () => { form.reset(); brief = null; calc = null; renderBrief(); $("#done").hidden = true; form.hidden = false; $("#slate").classList.remove("hit"); $("#f-name").focus(); });

/* ---------- offer timer & timecode ---------- */
let left = (DATA.offer_minutes || 5) * 60; const tm = $("#timer");
const tick = () => { if (left < 0) return; tm.textContent = String(Math.floor(left / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0"); if (left === 0) { clearInterval(cd); $("#offer").hidden = true; } left--; };
const cd = setInterval(tick, 1000); tick();
const T0 = performance.now();
function timecode(){ const f = Math.floor((performance.now() - T0) / 40); return [Math.floor(f / 90000), Math.floor(f / 1500) % 60, Math.floor(f / 25) % 60, f % 25].map(x => String(x).padStart(2, "0")).join(":"); }
if (!reduce) setInterval(() => { if (reel.on && !document.hidden) $("#tc").textContent = timecode(); }, 80);

/* ---------- PLAY cursor and magnetic buttons (real pointers only) ---------- */
if (finePointer && !reduce) {
  const cur = $("#cur"); let x = 0, y = 0, cx = 0, cy = 0, raf = 0, shown = false;
  const loop = () => { cx += (x - cx) * .35; cy += (y - cy) * .35; cur.style.setProperty("--x", cx.toFixed(1) + "px"); cur.style.setProperty("--y", cy.toFixed(1) + "px"); raf = shown || Math.abs(x - cx) > .5 ? requestAnimationFrame(loop) : 0; };
  addEventListener("pointermove", e => {
    x = e.clientX; y = e.clientY;
    const over = !!e.target.closest('[data-cursor="play"]') && !e.target.closest(".reel-tag,.btn");
    if (over !== shown) { shown = over; cur.classList.toggle("on", over); if (over) { cx = x; cy = y; } }
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener("pointerleave", () => { shown = false; cur.classList.remove("on"); });
  document.addEventListener("pointermove", e => {
    const b = e.target.closest(".mag"); if (!b) return;
    const r = b.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    b.style.setProperty("--mx", (dx * .18).toFixed(1) + "px"); b.style.setProperty("--my", (dy * .28).toFixed(1) + "px");
  }, { passive: true });
  document.addEventListener("pointerout", e => { const b = e.target.closest && e.target.closest(".mag"); if (b && !b.contains(e.relatedTarget)) { b.style.setProperty("--mx", "0px"); b.style.setProperty("--my", "0px"); } });
}

/* ---------- start ---------- */
render();
initStars();
initReel();
initFlow();
const motionOK = !!(window.ABM_MOTION && window.ABM_MOTION.init({ setStory, setScene, setDuel, setHero, frameClip, reduce, introSeen: !!store.get("abm-intro", true), markIntro: () => store.set("abm-intro", "1", true), flowLayout: () => flow.layout && flow.layout() }));
if (!motionOK) { root.classList.add("no-motion"); $("#intro").remove(); setStoryStep(3); setDuel(1); $$(".fx").forEach(x => x.classList.add("hit")); $("#offer").classList.remove("away"); $("#reel").style.clipPath = frameClip(); }
})();
