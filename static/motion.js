/* AB Media landing: scroll choreography (GSAP + ScrollTrigger + Lenis). No 3D.
   01 stars swirl into a galaxy between AB and MEDIA; scrolling condenses it into a frame of light that becomes
      the film, and one line comes into focus. 02 the manifesto lights up word by word. 03 the customer journey snaps
      through four beats. 04 a playhead runs through time on the ads-vs-film chart. 05 two films, the rest open on "More films".
   Motion rules (Emil Kowalski standards): enter/exit ease-out, on-screen movement ease-in-out, UI under 300 ms,
   marketing scenes longer; only transform/opacity/clip-path/filter; reduced motion keeps fades, drops movement. */
(() => {
"use strict";
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const root = document.documentElement;
const ABM = window.ABM_MOTION = { ready: false, init, refresh, scrollTo, pause, settle: () => built && settle() };
let api = null, lenis = null, content = [], built = false;

function init(a){
  api = a;
  if (!window.gsap || !window.ScrollTrigger) return false;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  ABM.ready = true;
  if (a.reduce) {
    root.classList.add("no-motion");
    $("#intro") && $("#intro").remove();
    progress(); scenes(); a.setStory(1); a.setDuel(1); a.setHero(0); $("#offer").classList.remove("away"); $("#reel").style.clipPath = a.frameClip();
    return true;
  }
  if (window.Lenis) {
    lenis = new Lenis({ lerp: .1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  anchors();
  stepper();
  progress(); scenes(); offer();
  story(); duel(); portrait(); timeline(); shots(); mark();
  buildContent();
  ScrollTrigger.addEventListener("refresh", () => api.flowLayout());
  built = true;
  settle();
  intro();
  autoplay();
  return true;
}

/* ---------- utilities ---------- */
function scrollTo(t){
  if (lenis) lenis.scrollTo(t === "#top" ? 0 : t, { offset: -66, duration: 1.4, easing: x => 1 - Math.pow(1 - x, 4) });
  else (typeof t === "string" ? $(t) : t).scrollIntoView({ behavior: "smooth" });
}
function pause(on){ if (lenis) on ? lenis.stop() : lenis.start(); }
function anchors(){
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute("href"); if (id.length < 2) return;
    const t = id === "#top" ? "#top" : $(id); if (!t) return;
    e.preventDefault(); scrollTo(t);
  });
}
function refresh(){ if (!built) return; buildContent(); settle(); }
/* triggers are created out of page order (the manifesto is rebuilt per language), so put them back in order before measuring */
function settle(){ if (ScrollTrigger.sort) ScrollTrigger.sort(); ScrollTrigger.refresh(); }

/* ---------- opening slate: the bars part like a letterbox opening ----------
   The bars, the mark coming into focus and the line under it are CSS animations (style.css) that start with the
   first paint; here the slate only runs its timecode, can be skipped, and is removed once the bars are open. */
function intro(){
  const box = $("#intro");
  if (!box) return;
  const anims = box.getAnimations ? box.getAnimations({ subtree: true }) : [];
  const bar = anims.find(a => a.animationName.startsWith("lb-down"));
  if (api.introSeen || !bar || bar.playState === "finished") { box.remove(); return; }
  api.markIntro();
  if (lenis) lenis.stop();
  const tc = $("#intro-tc"), t0 = performance.now();
  const iv = setInterval(() => { const f = Math.floor((performance.now() - t0) / 40); tc.textContent = ["00", "00", String(Math.floor(f / 25)).padStart(2, "0"), String(f % 25).padStart(2, "0")].join(":"); }, 40);
  const done = () => { clearInterval(iv); box.remove(); if (lenis) lenis.start(); };
  bar.finished.then(done, done);
  const skip = () => { anims.forEach(a => { a.playbackRate = 4; }); ["wheel", "keydown", "pointerdown", "touchstart"].forEach(ev => removeEventListener(ev, skip)); };
  ["wheel", "keydown", "pointerdown", "touchstart"].forEach(ev => addEventListener(ev, skip, { passive: true }));
}

/* ---------- header: scroll progress + scene name ---------- */
function offer(){
  const o = $("#offer");
  ScrollTrigger.create({ trigger: "#manifest", start: "top 85%", onEnter: () => o.classList.remove("away"), onLeaveBack: () => o.classList.add("away") });
}
function progress(){
  gsap.to("#prog", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true, refreshPriority: -1 } });
}
function scenes(){
  $$("[data-scene]").forEach(s => ScrollTrigger.create({
    trigger: s, start: "top 50%", end: "bottom 50%",
    onToggle: self => {
      if (!self.isActive) return;
      api.setScene(s.dataset.scene);
      if (!api.reduce) gsap.fromTo("#scene-t", { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .28, ease: "power3.out", overwrite: true });
    }
  }));
}

/* ---------- 01 the stars become a galaxy, the galaxy becomes a frame, the frame becomes the film ----------
   The particles live in app.js (canvas); this timeline drives them through api.setHero(progress)
   and moves the DOM layers. Positions are fractions of the scroll so both stay in step. */
function hero(){
  const tl = gsap.timeline({ scrollTrigger: { trigger: "#top", start: "top top", end: "+=160%", scrub: .4, pin: ".hero-pin", anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 2,
    onUpdate: s => api.setHero(s.progress), onRefresh: s => api.setHero(s.progress) } });
  tl.to(".hero-foot", { opacity: 0, y: 20, ease: "none", duration: .1 }, 0)
    /* the two halves of the mark step aside and go out of focus while the galaxy turns */
    .to(".m-l", { x: () => -innerWidth * .05, opacity: 0, filter: "blur(14px)", ease: "power1.in", duration: .34 }, .06)
    .to(".m-r", { x: () => innerWidth * .05, opacity: 0, filter: "blur(14px)", ease: "power1.in", duration: .34 }, .06)
    /* light becomes an image: the film lights up inside the frame of stars, then fills the screen */
    .fromTo("#reel", { opacity: 0, clipPath: api.frameClip }, { opacity: 1, ease: "none", duration: .1 }, .6)
    .to("#reel-media", { scale: 1, ease: "none", duration: .3 }, .6)
    /* the frame grows evenly from the centre: the start shape is given in full (top right bottom left + radius),
       because the browser shortens the live value and the numbers would pair up wrong, opening it from the left */
    .fromTo("#reel", { clipPath: api.frameClip }, { clipPath: "inset(0px 0px 0px 0px round 0px)", ease: "power2.inOut", duration: .2, immediateRender: false }, .7)
    .to([".vf", ".reel-shade"], { opacity: 1, ease: "none", duration: .06 }, .86)
    .to([".reel-tag", ".segs"], { opacity: 1, ease: "none", duration: .06 }, .88)
    .set(".line", { opacity: 1 }, .84)
    .fromTo(".line .lw", { yPercent: 40, opacity: 0, filter: "blur(14px)" }, { yPercent: 0, opacity: 1, filter: "blur(0px)", ease: "power2.out", stagger: { amount: .08 }, duration: .06 }, .84)
    .to({}, { duration: .02 }, .98);
  return tl;
}

/* ---------- 03 the customer journey: four beats, snapped, short ---------- */
let storyST = null, duelST = null;
function story(){
  api.setStory(0);
  storyST = ScrollTrigger.create({
    trigger: "#story", start: "top top", end: () => "+=" + Math.round(innerHeight * .8),
    pin: true, invalidateOnRefresh: true,
    onUpdate: s => api.setStory(s.progress),
    onRefresh: s => api.setStory(s.progress),
    onEnter: () => api.flowLayout()
  });
}

/* ---------- 04 ads vs brand film: scroll moves the playhead ---------- */
function duel(){
  const o = { p: 0 };
  api.setDuel(0);
  duelST = gsap.to(o, {
    p: 1, ease: "none", onUpdate: () => api.setDuel(o.p),
    scrollTrigger: { trigger: "#diff", start: "top top", end: () => "+=" + Math.round(innerHeight * 1.1), pin: true, scrub: .5, invalidateOnRefresh: true }
  }).scrollTrigger;
}

/* the stops inside the pinned scenes, as scroll positions: hero (play button, film lit in the frame, full film + line),
   manifesto (start, end), journey (four beats), ads-vs-story chart (start, end) */
function zones(){
  const z = [], at = (st, ks) => ks.map(k => st.start + (st.end - st.start) * k);
  const h = content[0] && content[0].scrollTrigger, m = content[1] && content[1].scrollTrigger;
  if (h) z.push(at(h, [0, .7, 1]));
  if (m) z.push(at(m, [0, 1]));
  if (storyST) z.push(at(storyST, [0, 1 / 3, 2 / 3, 1]));
  if (duelST) z.push(at(duelST, [0, 1]));
  return z.map(s => s.map(Math.round));
}

/* ---------- autoplay: with nobody scrolling, the page plays on its own like a film ----------
   Each stop is held long enough to read what is on screen (about four words a second, 3 s at least, 10 s at most),
   then the page glides on: through the stops of the pinned scenes, then about a screen at a time, as far as the
   request form, where it stops. A wheel, touch, key or click hands control back at once; after 15 s without
   input it carries on from wherever the visitor left it. */
let autoGlide = false;
function autoplay(){
  if (api.reduce) return;
  const IDLE = 15000;
  let timer = 0, idleT = 0, on = true;
  const y = () => lenis ? lenis.animatedScroll : scrollY;
  const endY = () => { const r = $("#request"); return r ? Math.round(r.getBoundingClientRect().top + y() - 66) : Infinity; };
  const held = () => !!document.querySelector("dialog[open]") || document.hidden || (lenis && lenis.isStopped) ||
    !!(document.activeElement && document.activeElement.closest && document.activeElement.closest("input,textarea,select"));
  /* how many words the visitor can see right now */
  function words(){
    /* text that is faded out (a beat not shown yet, a closed panel) is not counted */
    const seen = new Map();
    const shown = el => {
      if (!el || el === document.body) return true;
      if (seen.has(el)) return seen.get(el);
      const cs = getComputedStyle(el);
      const v = cs.visibility !== "hidden" && cs.display !== "none" && parseFloat(cs.opacity) > .15 && shown(el.parentElement);
      seen.set(el, v); return v;
    };
    let n = 0; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t; t = w.nextNode()) {
      const s = t.nodeValue.trim(); if (!s) continue;
      const el = t.parentElement; if (!el || el.closest("script,style,noscript,[aria-hidden=true],.intro")) continue;
      const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 60 || r.top > innerHeight) continue;
      if (!shown(el)) continue;
      n += s.split(/\s+/).length;
    }
    return n;
  }
  const hold = () => Math.min(10, Math.max(3, 1.5 + words() / 4)) * 1000;
  function next(){
    const cur = y(), z = zones(), end = endY();
    if (cur >= end - 2) return null;
    for (const s of z) if (cur >= s[0] - 2 && cur < s[s.length - 1] - 2) return s.find(v => v > cur + 2);
    let to = cur + Math.round(innerHeight * .85);
    for (const s of z) if (s[0] > cur + 2 && s[0] < to) { to = s[0]; break; }
    return Math.min(to, end);
  }
  function step(){
    timer = 0;
    if (!on) return;
    if (held()) { timer = setTimeout(step, 1000); return; }
    const to = next();
    if (to == null) { on = false; return; }
    const dur = Math.min(3, Math.max(1.2, Math.abs(to - y()) / innerHeight * 1.8));
    let fin = false;
    const done = () => { if (fin) return; fin = true; autoGlide = false; if (on) timer = setTimeout(step, hold()); };
    autoGlide = true;
    /* a glide that gets cut short (a resize, a refresh) must not stall the autoplay */
    setTimeout(done, dur * 1000 + 500);
    if (lenis) lenis.scrollTo(to, { duration: dur, easing: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2, force: true, onComplete: done });
    else { scrollTo({ top: to, behavior: "smooth" }); setTimeout(done, dur * 1000); }
  }
  const takeOver = () => {
    on = false; autoGlide = false; clearTimeout(timer); timer = 0; clearTimeout(idleT);
    idleT = setTimeout(() => { on = true; timer = setTimeout(step, 0); }, IDLE);
  };
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach(ev => addEventListener(ev, takeOver, { passive: true, capture: true }));
  /* the first hold starts once the opening slate is gone */
  timer = setTimeout(step, 1200 + hold());
}

/* ---------- one scroll = one scene ----------
   Inside the pinned scenes the page moves stop to stop: a single wheel notch, swipe or arrow key goes to the
   next stop, and a fast flick goes to the next stop too (the rest of its momentum is swallowed).
   Stops: hero (play button, film lit in the frame, full film + line), manifesto (start, end),
   journey (four beats), ads-vs-story chart (start, end). Between scenes the page scrolls normally. */
function stepper(){
  let busy = false, quietT = 0, endT = 0;
  const locked = () => !!document.querySelector("dialog[open]") || (lenis && lenis.isStopped && !busy);
  const y = () => lenis ? lenis.animatedScroll : scrollY;
  const goal = () => lenis ? lenis.targetScroll : scrollY;
  /* after a step, ignore input until it has been quiet for a moment, so trackpad and flick momentum can't stack steps */
  let moving = false;
  const settle = () => { clearTimeout(quietT); quietT = setTimeout(() => { if (!moving) busy = false; }, 220); };
  let goAt = -1e9, goTo = 0, wheelAt = -1e9;
  function go(to){
    goAt = performance.now(); goTo = to;
    busy = moving = true; clearTimeout(quietT); clearTimeout(endT);
    let fin = false;
    const done = () => { if (fin) return; fin = true; clearTimeout(endT); moving = false; settle(); };
    if (lenis) lenis.scrollTo(to, { duration: 1.05, easing: x => 1 - Math.pow(1 - x, 3), force: true, onComplete: done });
    else scrollTo({ top: to, behavior: "smooth" });
    /* a step must never lock the page: if its glide is interrupted (a touchpad, a click on a link), release anyway */
    endT = setTimeout(done, 1400);
  }
  /* where should a move in direction `dir` land? null = leave it to normal scrolling */
  function target(dir, projected, from){
    const cur = from != null ? from : y(), z = zones();
    for (const s of z) {
      const a = s[0], b = s[s.length - 1];
      if (cur >= a - 2 && cur <= b + 2) {
        const nxt = dir > 0 ? s.find(v => v > cur + 2) : [...s].reverse().find(v => v < cur - 2);
        if (nxt != null) return nxt;
      }
    }
    /* outside a scene (or leaving one): if the next scene is about a screen away, one notch goes straight to it;
       a fast move must stop at the start (or end, going up) of the next scene, not fly through it */
    const reach = innerHeight * 1.3;
    projected = dir > 0 ? Math.max(projected, cur + reach) : Math.min(projected, cur - reach);
    for (const s of (dir > 0 ? z : [...z].reverse())) {
      const a = s[0], b = s[s.length - 1];
      if (dir > 0 && cur < a && projected >= a) return a;
      if (dir < 0 && cur > b && projected <= b) return b;
    }
    return null;
  }
  /* a touchpad sends a stream of small deltas (and sideways ones); holding it back would make the page feel stuck,
     so touchpad scrolling stays smooth and free, and a scene snaps to its nearest step when the scroll rests */
  let padT = -1e9;
  const pad = () => performance.now() - padT < 900;
  addEventListener("wheel", e => {
    if (e.ctrlKey || locked()) return;
    if (e.deltaMode === 0 && (Math.abs(e.deltaY) < 40 || e.deltaX !== 0)) padT = performance.now();
    if (pad()) return;
    const dir = Math.sign(e.deltaY); if (!dir) return;
    const now = performance.now(), fresh = now - wheelAt > 90; wheelAt = now;
    if (busy) {
      const eat = () => { e.preventDefault(); e.stopImmediatePropagation(); };
      /* a new notch while a step is still gliding goes on to the next stop (from where the glide is heading),
         so the wheel never has to be turned two or three times; a burst of events from one flick still counts once */
      const back = dir !== Math.sign(goTo - y());
      if (fresh && (back || now - goAt > 380)) {
        const t = target(dir, goTo + e.deltaY * 1.2, back ? y() : goTo);
        if (t != null && t !== goTo) { eat(); go(t); return; }
        /* past the last stop the page scrolls normally again: hand this notch back to it */
        if (t == null && !back && Math.abs(y() - goTo) < 40) { busy = moving = false; clearTimeout(quietT); clearTimeout(endT); return; }
      }
      eat(); settle(); return;
    }
    const t = target(dir, goal() + e.deltaY * 1.2);
    if (t == null) return;
    e.preventDefault(); e.stopImmediatePropagation(); go(t);
  }, { capture: true, passive: false });
  addEventListener("keydown", e => {
    if (locked() || (e.target.closest && e.target.closest("input,textarea,select,button,[contenteditable]"))) return;
    const dir = ["ArrowDown", "PageDown", " "].includes(e.key) ? (e.shiftKey && e.key === " " ? -1 : 1) : ["ArrowUp", "PageUp"].includes(e.key) ? -1 : 0;
    if (!dir) return;
    if (busy) { e.preventDefault(); return; }
    const t = target(dir, goal() + dir * innerHeight * .9);
    if (t == null) return;
    e.preventDefault(); go(t);
  }, { capture: true });
  /* phones and tablets scroll natively: touches are never intercepted and a touch scroll is never snapped,
     so the page can't lock up or fight the finger's momentum */
  if (matchMedia("(pointer: coarse)").matches) return;
  /* if a wheel scroll ever comes to rest between two stops inside a scene, finish it to the nearest one */
  let restT = 0;
  addEventListener("scroll", () => {
    clearTimeout(restT);
    restT = setTimeout(() => {
      if (busy || autoGlide || (lenis && lenis.isStopped)) return;
      const cur = y();
      for (const s of zones()) {
        if (cur > s[0] + 2 && cur < s[s.length - 1] - 2 && !s.some(v => Math.abs(v - cur) <= 2)) {
          const to = s.reduce((p, v) => Math.abs(v - cur) < Math.abs(p - cur) ? v : p, s[0]);
          /* after a touchpad scroll: a soft glide that the next swipe simply takes over, never a lock */
          if (performance.now() - padT < 3000 && lenis) lenis.scrollTo(to, { duration: .7, easing: x => 1 - Math.pow(1 - x, 3) }); else go(to);
          return;
        }
      }
    }, 160);
  }, { passive: true });
}

/* ---------- 07 portrait opens like an iris, the photo settles ---------- */
function portrait(){
  gsap.fromTo("#why-ph", { clipPath: "inset(16% 12% 16% 12% round 26px)" }, { clipPath: "inset(0% 0% 0% 0% round 26px)", ease: "none", scrollTrigger: { trigger: "#why-ph", start: "top 92%", end: "top 30%", scrub: .5 } });
  gsap.to("#why-img", { scale: 1, ease: "none", scrollTrigger: { trigger: "#why-ph", start: "top bottom", end: "bottom top", scrub: true } });
}

/* ---------- 08 process: the line fills, each step lights as it is reached ---------- */
function timeline(){
  const light = s => {
    const tl = $("#tl"), y = s.progress * tl.offsetHeight + 8;
    $$("#steps .step").forEach(li => li.classList.toggle("on", li.offsetTop + li.offsetHeight * .5 <= y));
  };
  gsap.to("#tl-fill", { scaleY: 1, ease: "none", scrollTrigger: { trigger: "#tl", start: "top 62%", end: "bottom 62%", scrub: .3, onUpdate: light, onRefresh: light } });
}

/* ---------- what happens next: the line runs through the three frames, each develops as it is reached ---------- */
function shots(){
  const vertical = () => innerWidth <= 760;
  const lit = s => { $$("#shots .shot").forEach((f, i) => f.classList.toggle("lit", s.progress >= (i + .15) / 3)); };
  const draw = s => { lit(s); $("#shots-fill").style.transform = (vertical() ? "scaleY(" : "scaleX(") + s.progress.toFixed(3) + ")"; };
  ScrollTrigger.create({ trigger: "#shots", start: "top 72%", end: "bottom 55%", onUpdate: draw, onRefresh: draw });
}

/* ---------- numbers count up once ---------- */
function stats(){
  ScrollTrigger.create({ trigger: ".stats", start: "top 88%", once: true, onEnter: () => {
    $$(".stat b").forEach((b, i) => {
      const m = /^([\d.,]+)(.*)$/.exec(b.dataset.n || b.textContent); if (!m) return;
      const to = parseFloat(m[1].replace(",", ".")), dp = (m[1].split(/[.,]/)[1] || "").length, o = { v: 0 };
      gsap.to(o, { v: to, duration: 1.6, delay: i * .08, ease: "power3.out", onUpdate: () => { b.textContent = o.v.toFixed(dp) + m[2]; }, onComplete: () => { b.textContent = b.dataset.n; } });
    });
  } });
}

/* ---------- the mark, set big, rises letter by letter ---------- */
function mark(){
  gsap.from("#fm .ch", { yPercent: 115, duration: 1.1, stagger: .05, ease: "expo.out", scrollTrigger: { trigger: "#fm", start: "top 94%" } });
  gsap.from("#fm i", { scale: .4, opacity: 0, duration: .6, ease: "power3.out", scrollTrigger: { trigger: "#fm", start: "top 94%" } });
}

/* ---------- rebuilt when the language changes (their words are re-rendered): the hero and the manifesto ---------- */
function buildContent(){
  /* rewind before killing so every element is back at its start state when the timeline is rebuilt */
  content.forEach(x => { if (x.scrollTrigger) x.scrollTrigger.kill(); x.progress(0).kill(); });
  content = [];
  content.push(hero());
  content.push(gsap.timeline({ scrollTrigger: { trigger: "#manifest", start: "top top", end: "+=90%", pin: true, scrub: .5, refreshPriority: 1 } })
    .fromTo("#mf .w", { opacity: .14 }, { opacity: 1, stagger: .1, ease: "none" }));
}
})();
