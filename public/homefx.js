/* Type Drift - home page (dashboard) animations.
   hero scene  : your equipped car driving through a dusk city (parallax skyline, speed lines, exhaust, boost, rev gauge)
   parade strip: the garage cars driving past with typed name plates
   showroom    : the Garage card cycles through cars
   keyboard    : keycaps press in time with the typed headline
   ticker, stat bars, scroll-reveal and pointer glow are driven from here too. */
window.HomeFX = (function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hx = { cat: () => ({}), me: () => ({}) };
  const $ = s => document.querySelector(s), TAU = Math.PI * 2;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  let on = false, last = 0, clock = 0, built = false;
  const st = { puffs: [], lines: [], rot: 0, par: [], showI: 0, showT: 0, boostAt: 5 };

  const hslOf = p => `hsl(${p[0]},${p[1]}%,${p[2]}%)`;
  const copts = (c, extra) => Object.assign({ body: Cars.bodyOf(c), hk: c.hk, roof: c.roof, stripe: c.stripe, accent: c.accent, glow: c.glow, pulse: !!c.pulse, rimH: !c.real && c.rim != null ? c.rim : null, caliper: c.tc || '#e11d48', time: clock }, extra);
  const visible = cv => { const r = cv.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  const list = () => { const o = Object.values(hx.cat()).sort((a, b) => a.price - b.price); return o.length ? o : Cars.SHOW.map(d => Object.assign({ brand: d.label.split(' · ')[0], name: d.label.split(' · ')[1], real: 1, tier: 3, tc: '#f59e0b' }, d)); };

  /* ---------- hero: dusk city drive ---------- */
  function hero(cv, dt) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, me = hx.me(), cat = hx.cat();
    const c = cat[me.car || 'starter'] || list()[0], boostP = Math.max(0, Math.min(1, Math.sin((clock - st.boostAt) * 1.4)));
    const boost = clock > st.boostAt && clock < st.boostAt + 2.2 ? boostP : 0; if (clock > st.boostAt + 2.2) st.boostAt = clock + 6 + Math.random() * 4;
    const spd = 330 * (1 + boost * 1.2), hz = H * .66;
    const sk = g.createLinearGradient(0, 0, 0, hz); sk.addColorStop(0, '#0b1030'); sk.addColorStop(.55, '#5a3b82'); sk.addColorStop(1, '#f7a35c'); g.fillStyle = sk; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.globalAlpha = (.2 + .6 * Math.abs(Math.sin(clock * .9 + i))) * (1 - hash(i + 5) * .5); g.fillStyle = '#e6ecff'; g.fillRect(hash(i) * W, hash(i + 40) * hz * .55, 1.6, 1.6); } g.globalAlpha = 1;
    const sun = g.createRadialGradient(W * .74, hz - 6, 4, W * .74, hz - 6, 60); sun.addColorStop(0, '#fff2c2'); sun.addColorStop(.35, 'rgba(255,200,120,.85)'); sun.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = sun; g.fillRect(W * .74 - 70, hz - 76, 140, 80);
    for (let L = 0; L < 2; L++) { /* skyline layers */
      const bw = L ? 44 : 64, off = clock * (L ? spd * .22 : spd * .09), i0 = Math.floor(off / bw);
      for (let i = i0 - 1; i < i0 + W / bw + 2; i++) {
        const bh = (L ? 40 : 60) + hash(i * 3 + L * 41) * (L ? 56 : 70), bx = i * bw - off;
        g.fillStyle = L ? '#171a36' : '#2b2a52'; g.fillRect(bx, hz - bh, bw - 4, bh + 2);
        if (L) { g.fillStyle = 'rgba(255,214,120,.85)'; for (let wy = 6; wy < bh - 6; wy += 9) for (let wx = 5; wx < bw - 12; wx += 10) if (hash(i * 13 + wy + wx) > .55) g.fillRect(bx + wx, hz - bh + wy, 4, 4); }
      }
    }
    const rd = g.createLinearGradient(0, hz, 0, H); rd.addColorStop(0, '#454b59'); rd.addColorStop(1, '#2b303b'); g.fillStyle = rd; g.fillRect(0, hz, W, H - hz);
    const cw = 26, so = (clock * spd) % (cw * 2);
    for (let x = -so; x < W; x += cw) { g.fillStyle = Math.round((x + so) / cw) % 2 ? '#fff' : '#e0334a'; g.fillRect(x, hz, cw, 6); }
    g.fillStyle = 'rgba(255,255,255,.6)'; const ds = (clock * spd * 1.3) % 90; for (let x = -ds; x < W; x += 90) g.fillRect(x, hz + (H - hz) * .58, 46, 3);
    /* speed lines */
    if (Math.random() < dt * (14 + boost * 40)) st.lines.push({ x: W + 10, y: 10 + Math.random() * (H - 20), l: 40 + Math.random() * 90, v: 700 + Math.random() * 600 });
    g.strokeStyle = `rgba(255,255,255,${.22 + boost * .3})`; g.lineWidth = 1.4;
    st.lines = st.lines.filter(q => (q.x -= q.v * dt * (1 + boost)) + q.l > 0); st.lines.forEach(q => { g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x + q.l, q.y); g.stroke(); });
    /* the car */
    const w = 268, k = w / 400, cx = W * .4 + boost * 14, gy = H * .93 + Math.sin(clock * 14) * .8 + Math.sin(clock * 4.6) * .7;
    st.rot += spd * dt / (28 * k);
    if (Math.random() < dt * 30) st.puffs.push({ x: cx - w * .5, y: gy - 14, vx: -40 - Math.random() * 40, vy: -8 - Math.random() * 14, life: .8, max: .8, r: 3 + Math.random() * 3 });
    st.puffs = st.puffs.filter(q => (q.life -= dt) > 0); st.puffs.forEach(q => { q.x += (q.vx - spd * .35) * dt; q.y += q.vy * dt; g.globalAlpha = q.life / q.max * .35; g.fillStyle = boost ? '#8cc8ff' : '#aab0bf'; g.beginPath(); g.arc(q.x, q.y, q.r * (2 - q.life / q.max), 0, TAU); g.fill(); }); g.globalAlpha = 1;
    g.save(); g.translate(cx, gy); g.rotate(Math.sin(clock * 3) * .004 - boost * .012); g.translate(-cx, -gy);
    if (boost) { const fg = g.createLinearGradient(cx - w * .5, 0, cx - w * .5 - 70, 0); fg.addColorStop(0, 'rgba(120,190,255,.9)'); fg.addColorStop(1, 'rgba(120,190,255,0)'); g.fillStyle = fg; g.beginPath(); g.moveTo(cx - w * .5, gy - 22); g.lineTo(cx - w * .5 - 60 - Math.random() * 30, gy - 16); g.lineTo(cx - w * .5, gy - 10); g.fill(); }
    Cars.side(g, cx, gy, w, hslOf(c.paint), copts(c, { rot: st.rot, ph: 40 }));
    g.restore();
    if (boost > .05) { const vg = g.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .9); vg.addColorStop(0, 'rgba(60,160,255,0)'); vg.addColorStop(1, `rgba(60,160,255,${.4 * boost})`); g.fillStyle = vg; g.fillRect(0, 0, W, H); g.fillStyle = `rgba(190,225,255,${boost})`; g.font = '800 15px system-ui,sans-serif'; g.fillText('NITRO', 16, 26); }
    /* rev gauge */
    const gx = W - 46, gyy = H - 50, v = .34 + .22 * Math.sin(clock * 1.3) + boost * .4;
    g.fillStyle = 'rgba(8,10,16,.72)'; g.beginPath(); g.arc(gx, gyy, 34, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 4; g.beginPath(); g.arc(gx, gyy, 27, Math.PI * .8, Math.PI * 2.2); g.stroke();
    g.strokeStyle = v > .8 ? '#ef4444' : '#f59e0b'; g.beginPath(); g.arc(gx, gyy, 27, Math.PI * .8, Math.PI * (.8 + 1.4 * Math.min(1, v))); g.stroke();
    const a = Math.PI * (.8 + 1.4 * Math.min(1, v)); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(gx, gyy); g.lineTo(gx + Math.cos(a) * 24, gyy + Math.sin(a) * 24); g.stroke(); g.fillStyle = '#f59e0b'; g.beginPath(); g.arc(gx, gyy, 3, 0, TAU); g.fill();
    g.fillStyle = '#9aa4b8'; g.font = '700 8px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('RPM', gx, gyy + 16); g.textAlign = 'left';
  }

  /* ---------- parade strip: garage cars with typed plates ---------- */
  function parade(cv, dt) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, arr = list(), w = 190;
    if (!st.par.length) for (let i = 0; i < 4; i++) st.par.push({ x: i * (W / 4) - 60, idx: i * 3, rot: 0, v: 100, age: 4 });
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0e1328'); bg.addColorStop(1, '#1d2236'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) { g.globalAlpha = .2 + .5 * Math.abs(Math.sin(clock + i)); g.fillStyle = '#d6dcff'; g.fillRect(hash(i) * W, hash(i + 9) * H * .5, 1.5, 1.5); } g.globalAlpha = 1;
    const off = clock * 14; for (let i = Math.floor(off / 60) - 1; i < off / 60 + W / 60 + 2; i++) { const bh = 26 + hash(i * 7) * 40; g.fillStyle = '#171b33'; g.fillRect(i * 60 - off, H - 26 - bh, 54, bh); g.fillStyle = 'rgba(255,214,120,.7)'; for (let wy = 6; wy < bh - 4; wy += 10) for (let wx = 6; wx < 46; wx += 12) if (hash(i * 11 + wy + wx) > .6) g.fillRect(i * 60 - off + wx, H - 26 - bh + wy, 4, 5); }
    g.fillStyle = '#2a2f40'; g.fillRect(0, H - 26, W, 26); g.fillStyle = 'rgba(245,158,11,.55)'; g.fillRect(0, H - 26, W, 2);
    const ds = (clock * 140) % 80; g.fillStyle = 'rgba(255,255,255,.3)'; for (let x = -ds; x < W; x += 80) g.fillRect(x, H - 12, 40, 2.5);
    st.par.forEach(c => {
      const car = arr[c.idx % arr.length]; c.x += c.v * dt; c.age += dt; c.rot += c.v * dt / (28 * w / 400);
      if (c.x > W + w * .6) { c.x = -w * .6; c.idx = (c.idx + 4) % arr.length; c.age = 0; }
      Cars.side(g, c.x, H - 6, w, hslOf(car.paint), copts(car, { rot: c.rot, ph: c.idx * 33 }));
      const txt = (car.brand + ' ' + car.name).toUpperCase(), n = Math.min(txt.length, Math.floor(c.age * 14));
      g.font = '700 11px ui-monospace,Consolas,monospace'; const tw = g.measureText(txt).width + 18, tx = c.x - tw / 2;
      g.fillStyle = 'rgba(8,10,18,.8)'; g.strokeStyle = (car.tc || '#f59e0b') + '99'; g.lineWidth = 1; g.beginPath(); g.roundRect(tx, 8, tw, 22, 7); g.fill(); g.stroke();
      g.fillStyle = car.tc || '#f59e0b'; g.fillText(txt.slice(0, n), tx + 9, 23); if (n < txt.length) g.fillRect(tx + 9 + g.measureText(txt.slice(0, n)).width + 1, 12, 2, 14);
    });
  }

  /* ---------- showroom in the Garage card ---------- */
  function showroom(cv, dt) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, arr = list(); st.showT += dt;
    if (st.showT > 3.4) { st.showT = 0; st.showI = (st.showI + 1) % arr.length; }
    const c = arr[st.showI % arr.length], p = Math.min(1, st.showT / .7), e = 1 - Math.pow(1 - p, 3);
    g.clearRect(0, 0, W, H);
    const sp = g.createRadialGradient(W / 2, H * .85, 4, W / 2, H * .85, W * .55); sp.addColorStop(0, (c.tc || '#f59e0b') + '66'); sp.addColorStop(1, (c.tc || '#f59e0b') + '00'); g.fillStyle = sp; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.ellipse(W / 2, H - 14, W * .4, 8, 0, 0, TAU); g.fill();
    g.save(); g.globalAlpha = Math.min(1, p * 1.4); const x = W / 2 + (1 - e) * 150;
    Cars.side(g, x, H - 14, 200, hslOf(c.paint), copts(c, { rot: -clock * 2, ph: st.showI * 50 })); g.restore();
    const txt = ((c.brand || '') + ' ' + (c.name || '')).trim().toUpperCase(), n = Math.min(txt.length, Math.floor(st.showT * 16));
    g.font = '700 11px ui-monospace,Consolas,monospace'; g.fillStyle = c.tc || '#f59e0b'; g.textAlign = 'left'; g.fillText(txt.slice(0, n) + (n < txt.length || Math.floor(clock * 2) % 2 ? '▍' : ''), 8, 16);
  }

  /* ---------- keyboard + ticker + stat bars + reveal ---------- */
  function buildKeyboard() {
    const kb = $('#kb'); if (!kb || kb.children.length) return;
    kb.innerHTML = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map(r => '<div>' + [...r].map(ch => `<i data-k="${ch}">${ch}</i>`).join('') + '</div>').join('') + '<div><i class="sp" data-k=" "></i></div>';
  }
  hx.press = ch => { const kb = $('#kb'); if (!kb || !ch || reduce) return; const el = kb.querySelector(`[data-k="${String(ch).toUpperCase() === ' ' ? ' ' : String(ch).toUpperCase()}"]`); if (!el) return; el.classList.add('dn'); setTimeout(() => el.classList.remove('dn'), 130); };
  function buildTicker() {
    const tr = $('.tickTrack'); if (!tr || tr.children.length) return;
    const items = ['\u{1F3C1} TYPE FAST', '\u{1F3CE}️ DRIFT FASTER', '⚡ FLAWLESS SENTENCE = BOOST', '\u{1FA99} WIN RACES, EARN COINS', '\u{1F698} AUDI · TATA · FORTUNER · THAR', '⌨️ EVERY KEY IS A GEAR SHIFT'];
    tr.innerHTML = [...items, ...items].map(t => `<span>${t}</span>`).join('');
  }
  hx.bars = u => {
    const set = (id, v, max) => { const el = $(id); if (el) el.style.width = Math.max(4, Math.min(100, v / max * 100)) + '%'; };
    set('#bRaces', u.races || 0, 50); set('#bWins', u.wins || 0, 25); set('#bBest', u.best || 0, 100); set('#bCoins', u.coins || 0, 5000);
  };
  let io = null;
  hx.reveal = () => { /* cards below the fold animate in as they scroll into view */
    if (reduce || !('IntersectionObserver' in window)) return;
    if (!io) io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
    document.querySelectorAll('#dash .card:not(.hero)').forEach(el => { if (!el.classList.contains('in')) { el.classList.add('rv'); io.observe(el); } });
  };
  document.addEventListener('pointermove', e => { const c = e.target.closest && e.target.closest('#dash .card'); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); });

  /* ---------- loop ---------- */
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!on || document.hidden || !window.Cars) return;
    const dt = Math.min(.1, (ts - last) / 1000); if (dt < .033) return; last = ts; clock += dt;
    const h = $('#heroCar'), p = $('#parade'), s = $('#garageShow');
    if (h && visible(h)) hero(h, dt); if (p && visible(p)) parade(p, dt); if (s && visible(s)) showroom(s, dt);
  }
  hx.init = o => { Object.assign(hx, o); if (!built) { built = true; buildKeyboard(); buildTicker(); } requestAnimationFrame(frame); };
  hx.active = v => { on = !!v; if (on) { hx.reveal(); if (reduce) setTimeout(() => { clock = 1; const h = $('#heroCar'), p = $('#parade'), s = $('#garageShow'); if (h) hero(h, .016); if (p) parade(p, .016); if (s) showroom(s, .016); }, 200); } };
  return hx;
})();
