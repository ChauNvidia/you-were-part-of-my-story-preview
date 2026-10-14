/* You Were Part of My Story: interactions.
   Everything runs in the browser. No backend, no tracking, nothing is stored.
   Letters and cards: the approved set from letters-back-data.js (same as library.scholarsequity.org). */

(function () {
  'use strict';

  // Placeholder: swap for the final address of this gift once it has one.
  const GIFT_URL = 'https://library.scholarsequity.org/';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const people = (window.lettersBackData || []).slice();
  const bySlug = Object.fromEntries(people.map((p) => [p.slug, p]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const params = new URLSearchParams(location.search);
  if (params.get('only')) { // review aid: show a single section so it can be photographed
    const st = document.createElement('style');
    st.textContent = `main > section:not(#${params.get('only')}), .foot { display: none !important; } #${params.get('only')} { padding-top: 96px; }`;
    document.head.appendChild(st);
  }
  if (params.has('still')) document.documentElement.style.scrollBehavior = 'auto'; // review aid: jump instantly to #sections

  function rng(seed) { // small seeded random so layouts are the same every visit
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  const cleanRole = (r) => String(r || '').replace(/\s+--\s+/g, ' · ').replace(/--/g, '—');
  const shortName = (n) => String(n).split(',')[0].trim();

  // The sentence where each scholar says how they pay it forward (their own words).
  function payForward(p) {
    const sents = p.letter.split(/(?<=[.!?])\s+/);
    const hit = sents.filter((s) => /pay(ing)? it forward|giving back|give back|lifting|hold the door|opportunity for someone/i.test(s));
    return (hit.length ? hit[hit.length - 1] : p.quote).replace(/^Larry,\s*/i, '').trim();
  }

  // How we grouped scholars (our reading of what each wrote; not official categories).
  const THEMES = [
    { id: 'teach', title: 'In classrooms and schools', desc: 'Teaching, leading schools, and studying how people learn.' },
    { id: 'health', title: 'In health and healing', desc: 'Medicine, public health, social work, and care.' },
    { id: 'lift', title: 'Lifting others as they climb', desc: 'Mentoring, coaching, and opening doors for the next person.' },
    { id: 'build', title: 'Building this community', desc: 'Showing up for the network that showed up for them.' },
    { id: 'lead', title: 'Leading in their fields', desc: 'Law, science, business, and public service.' },
  ];
  const TAGS = {
    christen: ['health', 'lead'], brittany: ['teach'], irvin: ['teach'], jen: ['teach'], marcos: ['health', 'build'],
    tara: ['lead'], darrius: ['lead'], charity: ['lift', 'health'], jasmine: ['lift'], judith: ['health', 'lead', 'build'],
    shambrekia: ['lift'], tina: ['lift'], lila: ['health'], ana: ['health', 'lift'], allyson: ['build'], lani: ['build', 'lift'],
    chau: ['build'], corey: ['lift'], onyinye: ['health', 'lift'], hernando: ['teach'], joi: ['teach', 'lift'],
    tilifayea: ['lift'], dpbetlehem: ['build'], kelvin: ['build'], whitney: ['lift'], sara: ['lift'], timothy: ['lift'],
    nicole: ['build'], shai: ['lift'], ibraheem: ['lift'], lima: ['lift'], robert: ['build', 'lead'], kristen: ['build'],
    tiffani: ['teach', 'build'], naomie: ['build'], ramona: ['lift'], aaron: ['build'],
  };
  const tagsOf = (p) => TAGS[p.slug] || [];

  // Circular face crops come from the left (photo) side of each approved card.
  const FACE_POS = {}; // optional per-person nudges: { slug: [x%, y%] }
  function faceStyle(p) {
    const pos = FACE_POS[p.slug] || [4, 30];
    return `background-image:url('${esc(p.image)}');--fx:${pos[0]}%;--fy:${pos[1]}%`;
  }

  /* ---------------- ripples on a canvas ---------------- */
  class Ripples {
    constructor(canvas, opts) {
      this.c = canvas; this.ctx = canvas.getContext('2d');
      this.dots = opts.dots || []; this.rings = []; this.raf = 0; this.last = 0;
      this.baseAlpha = opts.baseAlpha == null ? 0.2 : opts.baseAlpha;
      this.speed = opts.speed || 120;
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
    }
    resize() {
      const r = this.c.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = r.width; this.h = r.height;
      this.c.width = Math.max(1, Math.round(r.width * dpr)); this.c.height = Math.max(1, Math.round(r.height * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.draw();
    }
    spawn(x, y, max) {
      if (reduce) { this.flash(x, y); return; }
      this.rings.push({ x, y, r: 0, max: max || Math.hypot(this.w, this.h) * 0.55 });
      this.start();
    }
    flash(x, y) { // reduced motion: light the nearby points once, no movement
      this.dots.forEach((d) => { if (Math.hypot(d.x * this.w - x, d.y * this.h - y) < Math.min(this.w, this.h) * 0.35) d.g = 1; });
      this.draw();
      setTimeout(() => { this.dots.forEach((d) => { d.g = 0; }); this.draw(); }, 1400);
    }
    start() { if (!this.raf && !reduce) { this.last = performance.now(); this.raf = requestAnimationFrame((t) => this.tick(t)); } }
    stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
    tick(t) {
      const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
      this.rings.forEach((g) => { g.r += this.speed * dt; });
      this.dots.forEach((d) => {
        const px = d.x * this.w; const py = d.y * this.h;
        this.rings.forEach((g) => { if (Math.abs(Math.hypot(px - g.x, py - g.y) - g.r) < 12) d.g = 1; });
        d.g = Math.max(0, (d.g || 0) - dt * 0.55);
      });
      this.rings = this.rings.filter((g) => g.r < g.max);
      this.draw();
      this.raf = (this.rings.length || this.dots.some((d) => d.g > 0.01)) ? requestAnimationFrame((n) => this.tick(n)) : 0;
    }
    draw() {
      const { ctx } = this; ctx.clearRect(0, 0, this.w, this.h);
      this.rings.forEach((g) => {
        const k = Math.max(0, 1 - g.r / g.max);
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(217,190,130,${0.55 * k * k})`; ctx.lineWidth = 1.4; ctx.stroke();
        if (g.r > 40) { ctx.beginPath(); ctx.arc(g.x, g.y, g.r - 26, 0, Math.PI * 2); ctx.strokeStyle = `rgba(217,190,130,${0.25 * k * k})`; ctx.lineWidth = 1; ctx.stroke(); }
      });
      this.dots.forEach((d) => {
        const g = d.g || 0; const x = d.x * this.w; const y = d.y * this.h;
        if (g > 0.02) { ctx.beginPath(); ctx.arc(x, y, 5 + g * 9, 0, Math.PI * 2); ctx.fillStyle = `rgba(217,190,130,${0.16 * g})`; ctx.fill(); }
        ctx.beginPath(); ctx.arc(x, y, 1.5 + g * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(236,214,160,${this.baseAlpha + (1 - this.baseAlpha) * g})`; ctx.fill();
      });
    }
  }

  /* ---------------- 1. hero ---------------- */
  (function hero() {
    const canvas = $('#heroCanvas'); if (!canvas) return;
    const r = rng(7);
    const dots = people.map(() => ({ x: 0.06 + r() * 0.88, y: 0.08 + r() * 0.84, g: 0 }));
    const rip = new Ripples(canvas, { dots, baseAlpha: 0.22, speed: 130 });
    const origin = () => [rip.w * 0.5, rip.h * 0.46];
    canvas.addEventListener('pointerdown', (e) => { const b = canvas.getBoundingClientRect(); rip.spawn(e.clientX - b.left, e.clientY - b.top); });
    let timer = 0;
    const begin = () => { if (reduce || timer) return; const go = () => rip.spawn(...origin()); go(); timer = setInterval(go, 2800); };
    const end = () => { clearInterval(timer); timer = 0; };
    let inView = false;
    new IntersectionObserver((es) => { inView = es[0].isIntersecting; if (inView && !document.hidden) begin(); else end(); }, { threshold: 0.2 }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (document.hidden) end(); else if (inView) begin(); });
    if (reduce) { $('#heroHint').textContent = 'Tap anywhere to light a few stars.'; dots.forEach((d, i) => { if (i % 3 === 0) d.g = 0.5; }); rip.draw(); }
  })();

  /* ---------------- 2. for Larry ---------------- */
  $('#letterCount').textContent = String(people.length);
  $('#larryFaces').innerHTML = ['joi', 'jen', 'irvin', 'lani', 'onyinye', 'christen', 'marcos'].filter((s) => bySlug[s]).map((s) => `<span class="face" style="${faceStyle(bySlug[s])}"></span>`).join('');

  /* ---------------- generic tabs ---------------- */
  function makeTabs(root, onShow) {
    const tabs = $$('[role="tab"]', root);
    const show = (tab, focus) => {
      tabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; const panel = document.getElementById(t.getAttribute('aria-controls')); if (panel) panel.hidden = !on; });
      if (focus) tab.focus(); if (onShow) onShow(tab.id);
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(t));
      t.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') show(tabs[(i + 1) % tabs.length], true); if (e.key === 'ArrowLeft') show(tabs[(i + tabs.length - 1) % tabs.length], true); });
    });
    return show;
  }

  /* ---------------- 3. stories ---------------- */
  const tile = (p, extra) => `<button class="tile" data-slug="${esc(p.slug)}" aria-label="Read ${esc(shortName(p.name))}'s letter">
      <img class="tile__img" src="${esc(p.image)}" alt="" loading="lazy" decoding="async">
      <span class="tile__name">${esc(shortName(p.name))}${extra || ''}</span></button>`;
  $('#gridAll').innerHTML = people.map((p) => tile(p)).join('');
  $('#themeGroups').innerHTML = THEMES.map((t) => {
    const group = people.filter((p) => tagsOf(p).includes(t.id));
    return `<section class="theme" aria-label="${esc(t.title)}"><h3>${esc(t.title)}</h3><p>${esc(t.desc)}</p><div class="grid">${group.map((p) => tile(p)).join('')}</div></section>`;
  }).join('');
  document.addEventListener('click', (e) => { const t = e.target.closest('.tile'); if (t) openStory(t.dataset.slug, t); });

  // constellation
  const starBox = $('#constellation'); const lines = $('#starLines'); const starLabel = $('#starLabel');
  const HINT = 'Hover or tap a light to see who it is.';
  const pos = people.map((p, i) => { const k = Math.sqrt((i + 0.5) / people.length); const a = i * 2.399963; return { p, x: 50 + k * 43 * Math.cos(a), y: 50 + k * 41 * Math.sin(a) }; });
  starBox.insertAdjacentHTML('beforeend', pos.map((n) => `<button class="face star" data-slug="${esc(n.p.slug)}" style="left:${n.x.toFixed(2)}%;top:${n.y.toFixed(2)}%;${faceStyle(n.p)}" aria-label="${esc(shortName(n.p.name))}: open letter"></button>`).join(''));
  const stars = $$('.star', starBox);
  function edgesFor(themeId) {
    const set = new Set(); const out = [];
    const pool = themeId ? pos.filter((n) => tagsOf(n.p).includes(themeId)) : pos;
    pool.forEach((a) => {
      pool.filter((b) => b !== a && (themeId || tagsOf(a.p).some((t) => tagsOf(b.p).includes(t))))
        .sort((m, n) => Math.hypot(m.x - a.x, m.y - a.y) - Math.hypot(n.x - a.x, n.y - a.y)).slice(0, 2)
        .forEach((b) => { const key = [a.p.slug, b.p.slug].sort().join('|'); if (!set.has(key)) { set.add(key); out.push([a, b]); } });
    });
    return out;
  }
  function drawStars(themeId) {
    lines.innerHTML = edgesFor(themeId).map(([a, b]) => `<line class="${themeId ? 'on' : ''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"></line>`).join('');
    stars.forEach((s) => s.classList.toggle('dim', !!themeId && !tagsOf(bySlug[s.dataset.slug]).includes(themeId)));
    $$('#starChips .chip').forEach((c) => c.setAttribute('aria-pressed', String((c.dataset.theme || '') === (themeId || ''))));
  }
  $('#starChips').innerHTML = [{ id: '', title: 'All threads' }].concat(THEMES).map((t) => `<button class="chip" data-theme="${t.id}" aria-pressed="${t.id === '' }">${esc(t.title)}</button>`).join('');
  $('#starChips').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) drawStars(c.dataset.theme); });
  const starTell = (s) => { const p = bySlug[s.dataset.slug]; starLabel.textContent = `${shortName(p.name)}: “${p.quote}”`; };
  stars.forEach((s) => {
    s.addEventListener('mouseenter', () => starTell(s)); s.addEventListener('focus', () => starTell(s));
    s.addEventListener('mouseleave', () => { starLabel.textContent = HINT; });
    s.addEventListener('click', () => openStory(s.dataset.slug, s));
  });
  drawStars('');

  const showStoriesTab = makeTabs($('#stories .tabs'));
  const wantTab = params.get('tab');
  if (wantTab && $('#tab-' + wantTab)) showStoriesTab($('#tab-' + wantTab));
  if (params.get('theme')) drawStars(params.get('theme'));

  /* ---------------- story detail ---------------- */
  const modal = $('#modal'); const panel = $('.modal__panel', modal);
  let current = -1; let lastFocus = null;
  function paragraphs(text) {
    const sents = text.split(/(?<=[.!?])\s+/); const out = []; let buf = '';
    sents.forEach((s) => { buf += (buf ? ' ' : '') + s; if (buf.length > 330) { out.push(buf); buf = ''; } });
    if (buf) out.push(buf); return out;
  }
  function fillStory(i) {
    current = (i + people.length) % people.length; const p = people[current];
    $('#mImg').src = p.image; $('#mImg').alt = `The card for ${shortName(p.name)}: “${p.quote}”`;
    $('#mName').textContent = p.name; $('#mRole').textContent = cleanRole(p.role);
    $('#mLetter').innerHTML = paragraphs(p.letter.replace(/\s+--\s+/g, ' \u2014 ')).map((t) => `<p>${esc(t)}</p>`).join('');
    $('#mStatus').textContent = ''; panel.scrollTop = 0;
    history.replaceState(null, '', '#story=' + p.slug);
  }
  function openStory(slug, from) {
    const i = people.findIndex((p) => p.slug === slug); if (i < 0) return;
    lastFocus = from || document.activeElement; fillStory(i);
    modal.hidden = false; document.body.classList.add('modal-open'); panel.focus();
  }
  function closeStory() {
    modal.hidden = true; document.body.classList.remove('modal-open');
    history.replaceState(null, '', location.pathname + location.search + '#stories');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  modal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) closeStory(); });
  $('#mPrev').addEventListener('click', () => fillStory(current - 1));
  $('#mNext').addEventListener('click', () => fillStory(current + 1));
  $('#mThank').addEventListener('click', () => { modal.hidden = true; document.body.classList.remove('modal-open'); });
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') closeStory();
    if (e.key === 'ArrowRight') fillStory(current + 1);
    if (e.key === 'ArrowLeft') fillStory(current - 1);
    if (e.key === 'Tab') { // keep focus inside the letter
      const f = $$('button, a[href]', panel).filter((x) => !x.hidden && x.offsetParent !== null); if (!f.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {
      const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_e) { ok = false; } t.remove(); return ok;
    }
  }
  $('#mShare').addEventListener('click', async () => {
    const p = people[current]; const url = `${GIFT_URL}#story=${p.slug}`;
    if (navigator.share) { try { await navigator.share({ title: `${shortName(p.name)}'s letter back to Larry`, text: `“${p.quote}”`, url }); return; } catch (_) { /* fall through to copy */ } }
    $('#mStatus').textContent = (await copyText(url)) ? 'Link copied. You can paste it anywhere.' : 'Please copy this link: ' + url;
  });

  /* ---------------- 5. ripple ---------------- */
  (function ripple() {
    const stage = $('#rippleStage'); const canvas = $('#rippleCanvas'); if (!stage) return;
    const r = rng(21); const dots = [];
    for (let i = 0; i < 170; i++) { const a = r() * Math.PI * 2; const rad = 0.405 + r() * 0.09; dots.push({ x: 0.5 + rad * Math.cos(a), y: 0.5 + rad * Math.sin(a), g: 0 }); }
    for (let i = 0; i < 60; i++) { const a = r() * Math.PI * 2; const rad = 0.06 + r() * 0.3; dots.push({ x: 0.5 + rad * Math.cos(a), y: 0.5 + rad * Math.sin(a), g: 0 }); }
    const rip = new Ripples(canvas, { dots, baseAlpha: 0.16, speed: 190 });
    const inner = people.filter((_, i) => i % 2 === 0); const outer = people.filter((_, i) => i % 2 === 1);
    const place = (list, R, off) => list.map((p, i) => { const a = (i / list.length) * Math.PI * 2 - Math.PI / 2 + off; return { p, x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) }; });
    const nodes = place(inner, 22, 0).concat(place(outer, 35, Math.PI / outer.length));
    stage.insertAdjacentHTML('beforeend', nodes.map((n) => `<button class="face" data-slug="${esc(n.p.slug)}" style="left:${n.x.toFixed(2)}%;top:${n.y.toFixed(2)}%;${faceStyle(n.p)}" aria-label="${esc(shortName(n.p.name))}: how they pay it forward"></button>`).join(''));
    const faces = $$('.face', stage); const cap = $('#rippleCaption'); let idx = 0; let seq = [];
    const centerOf = (n) => [n.x / 100 * rip.w, n.y / 100 * rip.h];
    function pick(i, wave) {
      idx = i; const n = nodes[i];
      faces.forEach((f, k) => f.classList.toggle('is-on', k === i));
      $('.ripple-caption__who', cap).textContent = shortName(n.p.name);
      $('.ripple-caption__line', cap).textContent = '“' + payForward(n.p) + '”';
      if (wave) rip.spawn(...centerOf(n), rip.w * 0.62);
    }
    faces.forEach((f, i) => f.addEventListener('click', () => { seq.forEach(clearTimeout); seq = []; pick(i, true); }));
    $('#rippleNext').addEventListener('click', () => pick((idx + 1) % nodes.length, true));
    $('#rippleWatch').addEventListener('click', () => {
      seq.forEach(clearTimeout); seq = [];
      if (reduce) { pick((idx + 1) % nodes.length, true); return; }
      rip.spawn(rip.w / 2, rip.h / 2, rip.w * 0.62);
      for (let i = 0; i < nodes.length; i++) seq.push(setTimeout(() => pick(i, i % 3 === 0), 900 + i * 650));
    });
    if (params.get('ripple') && bySlug[params.get('ripple')]) pick(nodes.findIndex((n) => n.p.slug === params.get('ripple')), false);
  })();

  /* ---------------- 4. pass it along ---------------- */
  (function gift() {
    const WHO = [
      { id: 'teacher', label: 'A teacher', to: 'To a teacher who believed in me', start: 'You saw something in me before I did. I think about you when…' },
      { id: 'counselor', label: 'A counselor', to: 'To a counselor who believed in me', start: 'You handed me an application and trusted I could finish it. Because of that…' },
      { id: 'mentor', label: 'A mentor', to: 'To a mentor who believed in me', start: 'You treated my big idea like it mattered. Here is where it led…' },
      { id: 'family', label: 'A family member', to: 'To someone in my family who made room for me', start: 'I know what it cost you to make this possible. I wanted you to see…' },
      { id: 'friend', label: 'A friend', to: 'To a friend who stood by me', start: 'You were there when I wasn’t sure I would make it. I wanted you to know…' },
      { id: 'door', label: 'Someone who opened a door', to: 'To someone who opened a door for me', start: 'You may never know it, but when you opened that door for me…' },
      { id: 'other', label: 'Someone else', to: 'To someone who believed in me', start: 'I have been meaning to tell you…' },
    ];
    const EXAMPLE = 'You handed me an application and said, “You should try.” I did. Years later I am still carrying what you started, and I wanted you to see what your belief in me helped make possible. Thank you.';
    const STYLES = [{ id: 'ivory', label: 'Ivory' }, { id: 'midnight', label: 'Midnight' }, { id: 'ripple', label: 'Ripple' }];
    const state = { who: '', to: '', msg: '', from: '', style: 'ivory' };

    $('#whoChips').innerHTML = WHO.map((w) => `<button type="button" class="chip" role="radio" aria-checked="false" data-id="${w.id}">${esc(w.label)}</button>`).join('');
    $('#styleChoices').innerHTML = STYLES.map((s) => `<button type="button" class="style-opt" role="radio" aria-checked="${s.id === state.style}" data-id="${s.id}"><i class="sw-${s.id}"></i>${s.label}</button>`).join('');
    $('#linkShown').textContent = GIFT_URL;

    const card = $('#cardPreview'); const msg = $('#message');
    const whoObj = () => WHO.find((w) => w.id === state.who);
    const salutation = () => (state.to.trim() ? `Dear ${state.to.trim()},` : (whoObj() ? whoObj().to + ',' : 'To someone who believed in me,'));

    const DECO = {
      ivory: '<svg class="card__deco" viewBox="0 0 100 125" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#B48A3C" stroke-width=".35" opacity=".75"><path d="M0 18 C 22 8, 30 28, 52 14 S 88 6, 100 16"/><path d="M0 22 C 22 12, 30 32, 52 18 S 88 10, 100 20" opacity=".5"/><path d="M0 107 C 20 117, 40 97, 62 111 S 90 119, 100 109"/><path d="M0 111 C 20 121, 40 101, 62 115 S 90 123, 100 113" opacity=".5"/></g></svg>',
      midnight: (() => { // a constellation that traces the edge of the card, clear of the writing
        const r = rng(5); const pts = [];
        for (let i = 0; i < 28; i++) {
          const t = i / 28 * 4; const inset = 2 + r() * 5; const side = Math.floor(t); const f = t - side;
          pts.push(side === 0 ? [f * 100, inset] : side === 1 ? [100 - inset, f * 125] : side === 2 ? [100 - f * 100, 125 - inset] : [inset, 125 - f * 125]);
        }
        let d = '';
        pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; d += `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}" stroke="#D9BE82" stroke-width=".16" opacity=".4"/>`; });
        pts.forEach((p) => { d += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(0.35 + r() * .45).toFixed(2)}" fill="#EBD6A0" opacity=".85"/>`; });
        return `<svg class="card__deco" viewBox="0 0 100 125" preserveAspectRatio="none" aria-hidden="true">${d}</svg>`;
      })(),
      ripple: '<svg class="card__deco" viewBox="0 0 100 125" aria-hidden="true"><g fill="none" stroke="#B48A3C" stroke-width=".3">' + [10, 18, 26, 34, 42, 50, 58].map((r, i) => `<circle cx="100" cy="125" r="${r}" opacity="${(0.7 - i * 0.08).toFixed(2)}"/>`).join('') + '</g></svg>',
    };

    function renderCard() {
      const empty = !state.msg.trim();
      card.className = `card card--${state.style}` + (empty ? ' card--empty' : '');
      card.innerHTML = `${DECO[state.style]}<p class="card__top">You were part of my story</p><p class="card__to">${esc(salutation())}</p>
        <p class="card__msg">${esc(empty ? 'Your words will appear here.' : state.msg)}</p>
        ${state.from.trim() ? `<p class="card__from">With gratitude,<br>${esc(state.from.trim())}</p>` : ''}
        <p class="card__foot">A gift from the Gates Millennium Scholars community</p>`;
      $('#msgCount').textContent = `${state.msg.length} / 420`;
    }
    const setWho = (id) => { state.who = id; $$('#whoChips .chip').forEach((c) => c.setAttribute('aria-checked', String(c.dataset.id === id))); renderCard(); };
    const setStyle = (id) => { state.style = id; $$('#styleChoices .style-opt').forEach((c) => c.setAttribute('aria-checked', String(c.dataset.id === id))); renderCard(); };

    $('#whoChips').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) setWho(c.dataset.id); });
    $('#styleChoices').addEventListener('click', (e) => { const c = e.target.closest('.style-opt'); if (c) setStyle(c.dataset.id); });
    $('#toName').addEventListener('input', (e) => { state.to = e.target.value; renderCard(); });
    $('#fromName').addEventListener('input', (e) => { state.from = e.target.value; renderCard(); });
    msg.addEventListener('input', () => { state.msg = msg.value; renderCard(); });
    $('#starter').addEventListener('click', () => { const w = whoObj() || WHO[6]; if (!msg.value.trim()) { msg.value = w.start + ' '; state.msg = msg.value; } else { $('#giftStatus').textContent = 'Here is an opening you could use: “' + w.start + '”'; } renderCard(); msg.focus(); msg.setSelectionRange(msg.value.length, msg.value.length); });
    $('#example').addEventListener('click', () => { if (!state.who) setWho('counselor'); msg.value = EXAMPLE; state.msg = EXAMPLE; $('#giftStatus').textContent = 'This is just an example. Change it to your own words.'; renderCard(); });

    const plain = () => `${salutation()}\n\n${state.msg.trim()}\n\n${state.from.trim() ? 'With gratitude,\n' + state.from.trim() + '\n\n' : ''}You were part of my story. I wanted you to see what your belief in me helped make possible:\n${GIFT_URL}`;
    const ready = () => { if (!state.msg.trim()) { $('#giftStatus').textContent = 'Write a few words first, then copy or share.'; msg.focus(); return false; } return true; };
    $('#copyBtn').addEventListener('click', async () => { if (!ready()) return; $('#giftStatus').textContent = (await copyText(plain())) ? 'Copied. Paste it into an email or a text.' : 'Please select and copy the message from the card.'; });
    $('#shareBtn').addEventListener('click', async () => {
      if (!ready()) return;
      if (navigator.share) { try { await navigator.share({ title: 'You were part of my story', text: plain().replace(GIFT_URL, '').trim(), url: GIFT_URL }); return; } catch (_) { return; } }
      $('#giftStatus').textContent = (await copyText(plain())) ? 'Sharing is not available in this browser, so we copied your message instead.' : 'Please copy the message from the card.';
    });

    // Save as a picture: redraws the card on a canvas (1080 x 1350)
    function wrap(ctx, text, maxW) {
      const lines = [];
      text.split('\n').forEach((para) => { let line = ''; para.split(/\s+/).forEach((w) => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }); lines.push(line); });
      return lines;
    }
    async function savePicture() {
      if (!ready()) return;
      try { await Promise.all([document.fonts.load('500 40px Newsreader'), document.fonts.load('italic 500 40px Newsreader'), document.fonts.load('600 20px Inter')]); } catch (_) { /* fonts fall back */ }
      const W = 1080; const H = 1350; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
      const dark = state.style === 'midnight'; const ink = dark ? '#F4EEDD' : (state.style === 'ripple' ? '#1E2438' : '#231F1A'); const accent = dark ? '#D9BE82' : '#B48A3C';
      if (dark) { const g = ctx.createRadialGradient(W * .3, H * .2, 10, W * .3, H * .2, H * .9); g.addColorStop(0, '#223070'); g.addColorStop(.65, '#0B1330'); g.addColorStop(1, '#0B1330'); ctx.fillStyle = g; }
      else if (state.style === 'ripple') ctx.fillStyle = '#FBF6E8'; else { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#FCF8EC'); g.addColorStop(1, '#F1E8D0'); ctx.fillStyle = g; }
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = accent; ctx.fillStyle = accent;
      if (state.style === 'ripple') { ctx.lineWidth = 3; [10, 18, 26, 34, 42, 50, 58].forEach((r, i) => { ctx.globalAlpha = .7 - i * .08; ctx.beginPath(); ctx.arc(W, H, r * 10.8, 0, Math.PI * 2); ctx.stroke(); }); }
      if (dark) { const r = rng(5); const pts = []; for (let i = 0; i < 28; i++) { const t = i / 28 * 4; const inset = (2 + r() * 5) * 10.8; const side = Math.floor(t); const f = t - side; pts.push(side === 0 ? [f * W, inset] : side === 1 ? [W - inset, f * H] : side === 2 ? [W - f * W, H - inset] : [inset, H - f * H]); }
        pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; ctx.globalAlpha = .4; ctx.lineWidth = 1.5; ctx.strokeStyle = '#D9BE82'; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); });
        pts.forEach((p) => { ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(p[0], p[1], 3 + r() * 4, 0, Math.PI * 2); ctx.fillStyle = '#EBD6A0'; ctx.fill(); }); }
      if (state.style === 'ivory') { ctx.globalAlpha = .7; ctx.lineWidth = 3; [[0, 180], [0, 1070]].forEach(([x, y], k) => { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(240, y - 90, 330, y + 100, 560, y - 40); ctx.bezierCurveTo(780, y - 120, 950, y - 90, W, y + (k ? 10 : -10)); ctx.stroke(); }); }
      ctx.globalAlpha = 1;
      const pad = 97; const maxW = W - pad * 2; let y = pad + 20;
      ctx.fillStyle = accent; ctx.font = '600 27px Inter, system-ui, sans-serif'; ctx.textBaseline = 'alphabetic';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '5px'; ctx.fillText('YOU WERE PART OF MY STORY', pad, y); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      y += 90; ctx.fillStyle = ink; ctx.font = 'italic 500 62px Newsreader, Georgia, serif'; wrap(ctx, salutation(), maxW).forEach((l) => { ctx.fillText(l, pad, y); y += 72; });
      y += 20; let size = 52; let lines;
      const room = H - 260 - y - (state.from.trim() ? 150 : 0);
      for (; size >= 30; size -= 2) { ctx.font = `400 ${size}px Newsreader, Georgia, serif`; lines = wrap(ctx, state.msg.trim(), maxW); if (lines.length * size * 1.42 <= room) break; }
      lines.forEach((l) => { ctx.fillText(l, pad, y); y += size * 1.42; });
      if (state.from.trim()) { y += 30; ctx.font = 'italic 500 56px Newsreader, Georgia, serif'; ctx.fillText('With gratitude,', pad, y); y += 66; ctx.fillText(state.from.trim(), pad, y); }
      ctx.globalAlpha = .8; ctx.font = '500 25px Inter, system-ui, sans-serif'; ctx.fillStyle = ink; ctx.fillText('A gift from the Gates Millennium Scholars community', pad, H - 86);
      cv.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'thank-you-card.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); $('#giftStatus').textContent = 'Saved. Look for “thank-you-card.png” in your downloads.'; }, 'image/png');
    }
    $('#saveBtn').addEventListener('click', savePicture);

    renderCard();
    if (params.get('example')) { setWho(params.get('who') || 'counselor'); msg.value = EXAMPLE; state.msg = EXAMPLE; $('#toName').value = state.to = 'Ms. Alvarez'; $('#fromName').value = state.from = 'Your former student'; setStyle(params.get('style') || 'ivory'); }
  })();

  /* ---------------- 6. what's next ---------------- */
  makeTabs($('#living .tabs'), () => {});
  (function weave() {
    const svg = $('#weave'); if (!svg) return; let s = '';
    for (let x = 14; x <= 206; x += 12) s += `<line x1="${x}" y1="8" x2="${x}" y2="112" stroke="#F4EEDD" stroke-opacity=".28" stroke-width="1"/>`;
    for (let row = 0; row < 8; row++) { const y = 18 + row * 12; let d = `M8 ${y}`; for (let x = 8; x < 212; x += 12) d += ` q 6 ${row % 2 ? -5 : 5} 12 0`; s += `<path d="${d}" fill="none" stroke="#D9BE82" stroke-width="1.8" stroke-linecap="round" opacity="${(0.95 - row * 0.07).toFixed(2)}"/>`; }
    svg.innerHTML = s;
  })();

  /* ---------------- nav ---------------- */
  const navLinks = $('#navLinks'); const toggle = $('#navToggle');
  toggle.addEventListener('click', () => { const open = navLinks.classList.toggle('is-open'); toggle.setAttribute('aria-expanded', String(open)); });
  navLinks.addEventListener('click', (e) => { if (e.target.closest('a')) { navLinks.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); } });

  // open a shared letter straight from a link like ...#story=joi
  const m = location.hash.match(/^#story=([\w-]+)/);
  if (m) setTimeout(() => openStory(m[1]), 50);
})();
