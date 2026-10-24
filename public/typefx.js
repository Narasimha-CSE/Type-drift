/* Typing feedback: combo counter, per-key pop animations, error shake, nitro banners, sentence-complete bursts */
window.FX = (function () {
  const fx = { combo: 0, best: 0, shake: 0, boostUntil: 0, sentOk: true };
  const badge = document.createElement('div'); badge.id = 'fxCombo'; badge.hidden = true; badge.innerHTML = '<b>0</b><small>COMBO</small>';
  const banner = document.createElement('div'); banner.id = 'fxBanner'; banner.hidden = true;
  document.body.append(badge, banner);
  const num = badge.querySelector('b');
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const MILESTONES = {}; /* boosts only come from a flawless full sentence */
  const say = txt => { banner.textContent = txt; banner.hidden = false; restart(banner, 'go'); clearTimeout(say.t); say.t = setTimeout(() => banner.hidden = true, 1100); };
  fx.reset = () => { fx.boostUntil = 0; fx.sentOk = true; fx.combo = 0; badge.hidden = true; };
  fx.hit = function (ok, t, cur, box) {
    const r = cur.getBoundingClientRect(), b = box.getBoundingClientRect();
    const pop = document.createElement('i'); pop.className = 'fxpop' + (ok ? '' : ' bad');
    pop.textContent = ok ? (cur.textContent === ' ' ? '·' : cur.textContent) : '✕';
    pop.style.left = (r.left - b.left + r.width / 2) + 'px'; pop.style.top = (r.top - b.top) + 'px';
    box.append(pop); setTimeout(() => pop.remove(), 600);
    if (ok) {
      fx.combo++; fx.best = Math.max(fx.best, fx.combo);
      num.textContent = fx.combo; badge.hidden = fx.combo < 3; restart(badge, 'tick');
      badge.classList.toggle('hot', fx.combo >= 10);
      if (MILESTONES[fx.combo]) { say(MILESTONES[fx.combo]); fx.shake = Math.max(fx.shake, 8); }
      if (cur.textContent === '.') { const perfect = fx.sentOk; fx.sentOk = true; if (perfect) { fx.boostUntil = Date.now() + 3500; say('BOOST!'); } if (perfect) { restart(box, 'flash'); const s = document.createElement('i'); s.className = 'fxpop big'; s.textContent = '+ SENTENCE!';
        s.style.left = (r.left - b.left) + 'px'; s.style.top = (r.top - b.top - 6) + 'px'; box.append(s); setTimeout(() => s.remove(), 900); fx.shake = Math.max(fx.shake, 5); } }
    } else {
      fx.sentOk = false; fx.combo = 0; badge.hidden = true; fx.shake = 14; restart(box, 'shake');
    }
  };
  return fx;
})();

/* Typewriter text loop (typing the line, pausing, deleting, next line) */
FX.typewriter = function (el, lines, onChar) {
  if (!el) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = lines[0]; return; }
  let i = 0, j = 0, del = false;
  const tick = () => {
    if (!el.isConnected) return;
    const s = lines[i]; j += del ? -1 : 1; el.textContent = s.slice(0, j); if (!del && onChar && j > 0) onChar(s[j - 1]);
    let d = del ? 24 : 45 + Math.random() * 70;
    if (!del && j >= s.length) { del = true; d = 1700; } else if (del && j <= 0) { del = false; i = (i + 1) % lines.length; d = 350; }
    setTimeout(tick, d);
  };
  tick();
};

/* Types example values into an input's placeholder (stops while the user is typing) */
FX.typeHint = function (input, lines) {
  if (!input) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { input.placeholder = lines[0]; return; }
  let i = 0, j = 0, del = false;
  const tick = () => {
    if (!input.isConnected) return;
    if (input.value || document.activeElement === input) { input.placeholder = lines[0]; return setTimeout(tick, 700); }
    const s = lines[i]; j += del ? -1 : 1; input.placeholder = s.slice(0, j) + (j % 2 ? '' : '\u2009');
    let d = del ? 35 : 90 + Math.random() * 80;
    if (!del && j >= s.length) { del = true; d = 1400; } else if (del && j <= 0) { del = false; i = (i + 1) % lines.length; d = 300; }
    setTimeout(tick, d);
  };
  tick();
};

/* Login-card showcase: one real car at a time drives in, parks while its name types itself out, then drives away */
FX.carStrip = function (cv) {
  if (!cv) return;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const w = 440, cx = W / 2, gy = H - 30, hz = H - 64, DUR = { in: 1.5, hold: 2.8, out: 1.2 };
  const hh = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  let idx = 6, ph = 'in', t = 0, x = -w, rot = 0, dash = 0, sky = 0, last = 0;
  function paint(v, dt) {
    const C = window.Cars, d = C.SHOW[idx % C.SHOW.length];
    sky += v * dt; dash = (dash + v * dt) % 120;
    const bgG = g.createLinearGradient(0, 0, 0, hz); bgG.addColorStop(0, '#0b1030'); bgG.addColorStop(.7, '#4b3478'); bgG.addColorStop(1, '#e8955a'); g.fillStyle = bgG; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { g.globalAlpha = .25 + .6 * Math.abs(Math.sin(Date.now() / 700 + i)); g.fillStyle = '#e6ecff'; g.fillRect(hh(i) * W, hh(i + 30) * hz * .6, 2, 2); } g.globalAlpha = 1;
    const off = sky * .18, bw = 70; for (let i = Math.floor(off / bw) - 1; i < off / bw + W / bw + 2; i++) { const bh = 40 + hh(i * 3) * 80, bx = i * bw - off; g.fillStyle = '#1a1d3d'; g.fillRect(bx, hz - bh, bw - 6, bh + 2); g.fillStyle = 'rgba(255,214,120,.8)'; for (let wy = 10; wy < bh - 8; wy += 15) for (let wx = 8; wx < bw - 18; wx += 16) if (hh(i * 13 + wy + wx) > .55) g.fillRect(bx + wx, hz - bh + wy, 6, 7); }
    const rd = g.createLinearGradient(0, hz, 0, H); rd.addColorStop(0, '#454b59'); rd.addColorStop(1, '#262a35'); g.fillStyle = rd; g.fillRect(0, hz, W, H - hz);
    g.fillStyle = '#e0334a'; for (let i = -1; i < W / 40 + 2; i += 2) g.fillRect(i * 40 - (sky % 80), hz, 40, 6); g.fillStyle = '#fff'; for (let i = 0; i < W / 40 + 2; i += 2) g.fillRect(i * 40 - 40 - (sky % 80), hz, 40, 6);
    g.fillStyle = 'rgba(255,255,255,.55)'; for (let q = -dash; q < W; q += 120) g.fillRect(q, hz + (H - hz) * .62, 60, 4);
    C.side(g, x, gy, w, `hsl(${d.paint[0]},${d.paint[1]}%,${d.paint[2]}%)`, { body: d.body, hk: d.hk, roof: d.roof, stripe: d.stripe, accent: d.accent, glow: d.glow, rot, brake: ph === 'hold', lights: true });
    const txt = d.label, n = ph === 'in' ? 0 : ph === 'hold' ? Math.min(txt.length, Math.floor((t + .15) * 15)) : txt.length;
    if (n > 0) {
      g.font = '700 24px ui-monospace,Consolas,monospace'; const tw = g.measureText(txt).width + 38, tx = Math.max(8, Math.min(W - tw - 8, x - tw / 2)), ty = 14;
      g.fillStyle = 'rgba(8,10,18,.85)'; g.strokeStyle = 'rgba(245,158,11,.7)'; g.lineWidth = 2; g.beginPath(); g.roundRect(tx, ty, tw, 46, 14); g.fill(); g.stroke();
      g.fillStyle = '#f59e0b'; g.fillText(txt.slice(0, n), tx + 19, ty + 31);
      if (n < txt.length || Math.floor(Date.now() / 450) % 2) g.fillRect(tx + 19 + g.measureText(txt.slice(0, n)).width + 2, ty + 9, 4, 28);
    }
  }
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!window.Cars || document.hidden || !cv.offsetParent) return;
    const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; t += dt;
    const D = DUR[ph], u = Math.min(1, t / D); let v = 0;
    if (ph === 'in') { const a = w * .6 + cx; x = -w * .6 + a * (1 - Math.pow(1 - u, 3)); v = 3 * Math.pow(1 - u, 2) * a / D; }
    else if (ph === 'hold') { x = cx; v = 0; }
    else { const a = W + w * .6 - cx; x = cx + a * u * u; v = 2 * u * a / D; }
    rot += v * dt / (28 * w / 400);
    if (t >= D) { t = 0; ph = ph === 'in' ? 'hold' : ph === 'hold' ? 'out' : 'in'; if (ph === 'in') { idx = (idx + 1) % window.Cars.SHOW.length; x = -w; } }
    paint(v, dt);
  }
  if (reduce) { const wait = setInterval(() => { if (!window.Cars) return; clearInterval(wait); ph = 'hold'; t = 1; x = cx; paint(0, 0); }, 100); return; }
  requestAnimationFrame(frame);
};

/* Animated backdrop used on every screen except the race track:
   typing keycaps drift upward while cars drive along a road strip at the bottom.
   mode: 'auth' (big, vivid) | 'app' (subtle) | 'off' */
window.BG = (function () {
  const cv = document.createElement('canvas'); cv.id = 'bgfx'; document.body.prepend(cv);
  const g = cv.getContext('2d'), bg = { mode: 'auth' }, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, last = 0, dash = 0;
  const resize = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
  addEventListener('resize', resize); resize();
  const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,.;';
  const keys = Array.from({ length: 30 }, () => ({ x: Math.random(), y: Math.random(), v: 8 + Math.random() * 24, s: 20 + Math.random() * 22, c: CH[Math.random() * CH.length | 0], ph: Math.random() * 6, a: .07 + Math.random() * .15 }));
  /* cars from cars.js (Cars.SHOW): realistic 2D side-view vector cars, each with a name plate that types itself out */
  const NC = 6, cars = Array.from({ length: NC }, (_, i) => ({ x: i * 330 + Math.random() * 120, v: 60 + Math.random() * 110, lane: i % 2, idx: i, rot: 0, age: 4 }));
  const hsl = p => `hsl(${p[0]},${p[1]}%,${p[2]}%)`;
  function plate(c, d, x, y, w) {
    const txt = d.label, n = Math.min(txt.length, Math.floor(c.age * 14));
    g.font = '700 12px ui-monospace,Consolas,monospace'; const tw = g.measureText(txt).width + 20, tx = x - tw / 2;
    g.fillStyle = 'rgba(8,10,18,.82)'; g.strokeStyle = 'rgba(245,158,11,.65)'; g.lineWidth = 1; g.beginPath(); g.roundRect(tx, y, tw, 24, 8); g.fill(); g.stroke();
    g.fillStyle = '#f59e0b'; g.fillText(txt.slice(0, n), tx + 10, y + 16);
    if (n < txt.length || Math.floor(Date.now() / 450) % 2) g.fillRect(tx + 10 + g.measureText(txt.slice(0, n)).width + 1, y + 5, 2, 14);
  }
  function draw(dt) {
    g.clearRect(0, 0, W, H);
    const auth = bg.mode === 'auth', k = auth ? 1 : .55, t = Date.now() / 1000;
    /* drifting keycaps */
    keys.forEach(q => {
      q.y -= q.v * dt / H; if (q.y < -.1) { q.y = 1.08; q.x = Math.random(); q.c = CH[Math.random() * CH.length | 0]; }
      const x = q.x * W + Math.sin(t * .6 + q.ph) * 14, y = q.y * H, s = q.s;
      g.globalAlpha = q.a * k; g.strokeStyle = '#f59e0b'; g.fillStyle = '#f59e0b'; g.lineWidth = 2;
      g.beginPath(); g.roundRect(x, y, s, s, s * .22); g.stroke();
      g.font = `700 ${s * .5}px ui-monospace,Consolas,monospace`; g.textAlign = 'center'; g.fillText(q.c, x + s / 2, y + s * .66);
    });
    g.globalAlpha = 1; g.textAlign = 'left';
    /* road strip */
    const roadH = auth ? Math.max(170, H * .28) : 70, top = H - roadH;
    const rd = g.createLinearGradient(0, top, 0, H); rd.addColorStop(0, 'rgba(40,46,60,0)'); rd.addColorStop(.25, `rgba(40,46,60,${.55 * k + .2})`); rd.addColorStop(1, `rgba(24,28,38,${.8 * k + .15})`);
    g.fillStyle = rd; g.fillRect(0, top, W, roadH);
    dash = (dash + dt * 160) % 90; g.fillStyle = 'rgba(255,255,255,.28)';
    const ly = auth ? top + roadH * .52 : top + roadH * .55;
    for (let x = -dash; x < W; x += 90) g.fillRect(x, ly, 46, 3);
    /* cars: far lane first, near lane on top */
    const C = window.Cars; if (!C || !C.SHOW) return;
    const n = auth ? NC : 2;
    for (const lane of [0, 1]) for (let i = 0; i < n; i++) {
      const c = cars[i]; if ((auth ? c.lane : 1) !== lane) continue;
      c.x += c.v * dt * (auth ? 1 : .8); c.age += dt; const w = auth ? (c.lane ? 190 : 150) : 84;
      c.rot += c.v * dt / (28 * w / 400);
      if (c.x > W + w * 2) { c.x = -w * 2; c.v = 60 + Math.random() * 110; const used = new Set(cars.slice(0, n).map(q => q.idx)); let k = c.idx; do { k = (k + 1) % C.SHOW.length; } while (used.has(k) && used.size < C.SHOW.length); c.idx = k; c.age = 0; }
      const d = C.SHOW[c.idx % C.SHOW.length], y = auth ? (c.lane ? H - roadH * .1 : H - roadH * .42) : H - 8;
      C.side(g, c.x, y, w, hsl(d.paint), { body: d.body, hk: d.hk, roof: d.roof, stripe: d.stripe, accent: d.accent, glow: d.glow, rot: c.rot, time: t, ph: i * 40 });
      if (auth && c.x > -w && c.x < W + w) plate(c, d, c.x, y - w * .46 - 34, w);
    }
  }
  function loop(ts) {
    requestAnimationFrame(loop);
    if (bg.mode === 'off' || document.hidden || reduce) return;
    const dt = Math.min(.1, (ts - last) / 1000); if (dt < .032) return; last = ts; draw(dt);
  }
  bg.set = m => { bg.mode = m; cv.style.display = m === 'off' ? 'none' : 'block'; if (reduce && m !== 'off') draw(.016); };
  requestAnimationFrame(loop);
  return bg;
})();
