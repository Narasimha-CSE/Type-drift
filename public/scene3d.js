/* Pseudo-3D ROAD renderer (Asphalt / OutRun style): curves, hills, forests, rocks, mountains.
   The cars on it are realistic 2D vector cars from cars.js (Cars.rear), not 3D meshes. */
(function () {
  const N = 500, SEG = 200, DRAW = 110, ROADW = 900, CF = 0.35, CAMH = 1000, DEPTH = 0.84, K = Math.PI * 2 / N;
  const TRACK = N * SEG, PLAYER_Z = CAMH * DEPTH;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const segs = Array.from({ length: N }, (_, i) => ({
    y: 900 * Math.sin(K * 2 * i) + 500 * Math.sin(K * 5 * i),
    curve: 3 * Math.sin(K * 3 * i) + 1.5 * Math.sin(K * 7 * i),
    zone: Math.sin(K * 2 * i + 1) > 0 ? 'forest' : 'rock',
    deco: i % 3 === 0
  }));
  const elev = z => { const f = (z / SEG) % N, a = segs[Math.floor(f) % N], b = segs[(Math.floor(f) + 1) % N]; return a.y + (b.y - a.y) * (f % 1); };
  let bgX = 0, rows = [];

  function pine(g, x, y, s, shade) {
    g.fillStyle = '#4a2f1a'; g.fillRect(x - s * .06, y - s * .25, s * .12, s * .25);
    for (let k = 0; k < 3; k++) {
      g.fillStyle = `hsl(${135 - shade * 8},${48 - k * 4}%,${15 + k * 6 + shade * 4}%)`;
      g.beginPath(); g.moveTo(x, y - s * (1.0 - k * .05)); g.lineTo(x - s * (.34 - k * .06 + .06), y - s * (.22 + k * .22)); g.lineTo(x + s * (.34 - k * .06 + .06), y - s * (.22 + k * .22)); g.fill();
    }
  }
  function rock(g, x, y, s, seed) {
    const r = hash(seed) * .3;
    g.fillStyle = '#6c6f78'; g.beginPath(); g.moveTo(x - s * .4, y); g.lineTo(x - s * (.3 + r), y - s * .38); g.lineTo(x - s * .05, y - s * (.55 + r)); g.lineTo(x + s * .28, y - s * .42); g.lineTo(x + s * .42, y); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(x - s * .05, y - s * (.55 + r)); g.lineTo(x + s * .28, y - s * .42); g.lineTo(x + s * .1, y - s * .2); g.lineTo(x - s * .2, y - s * .3); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(x + s * .1, y - s * .2); g.lineTo(x + s * .28, y - s * .42); g.lineTo(x + s * .42, y); g.lineTo(x + s * .05, y); g.fill();
  }
  function bush(g, x, y, s) { g.fillStyle = '#1f5a2a'; g.beginPath(); g.arc(x - s * .15, y - s * .12, s * .2, 0, 7); g.arc(x + s * .15, y - s * .12, s * .22, 0, 7); g.arc(x, y - s * .22, s * .22, 0, 7); g.fill(); }

  /* cars: realistic 2D rear-view vector cars (cars.js). w = car width in pixels, (x, y) = centre / ground line */
  const BODIES = ['super', 'gt', 'sedan', 'hatch', 'csuv', 'suv', 'boxy'];
  function car(g, x, y, w, col, o) {
    o = o || {};
    if (!window.Cars) return;
    if (!o.body) o.body = Cars.bodyOf(o);
    Cars.rear(g, x, y, w, col, o);
  }
  const logo = (g, k, x, y, r, col) => window.Cars && Cars.logo(g, k, x, y, r, col);

  /* state: {pos, speed, cars:[{dz, lane, col, o}], nitro, W, H}; returns [{i, x, y, w}] for label placement */
  function draw(g, W, H, st) {
    const pos = st.pos, base = Math.floor(pos / SEG), frac = (pos % SEG) / SEG, hz = H * .42;
    const camY = CAMH + elev(pos + PLAYER_Z), cur0 = segs[base % N].curve;
    bgX = (bgX + cur0 * st.speed * .0000042) % 1;
    const sk = g.createLinearGradient(0, 0, 0, hz + 20); sk.addColorStop(0, '#0f1638'); sk.addColorStop(.55, '#7a4f96'); sk.addColorStop(1, '#f7b267');
    g.fillStyle = sk; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffe3a1'; g.beginPath(); g.arc(W * .7, hz - 30, 44, 0, 7); g.fill();
    for (let L = 0; L < 3; L++) { /* parallax mountain ranges */
      const par = [.25, .5, .9][L], hh = [70, 52, 34][L];
      g.fillStyle = ['#3a2f66', '#2b2650', '#1f2144'][L]; g.beginPath(); g.moveTo(0, hz + 4);
      for (let x = 0; x <= W; x += 16) { const u = (x / W + bgX * par * 6) * 6.28; g.lineTo(x, hz - hh * (.55 + .3 * Math.sin(u * (1 + L)) + .15 * Math.sin(u * 3.7 + L))); }
      g.lineTo(W, hz + 4); g.fill();
    }
    g.fillStyle = '#16301d'; g.fillRect(0, hz, W, H - hz);
    /* project road segments */
    let x = 0, dx = -cur0 * frac, maxy = H; rows = [];
    for (let n = 0; n < DRAW; n++) {
      const s = segs[(base + n) % N], s2 = segs[(base + n + 1) % N];
      const z1 = n * SEG - frac * SEG + 1, z2 = z1 + SEG; if (z1 < 1) { x += dx; dx += s.curve; continue; }
      const sc1 = DEPTH / z1, sc2 = DEPTH / z2;
      const pr = (sc, wy, wx) => ({ x: W / 2 + sc * wx * W / 2, y: hz + sc * (camY - wy) * H / 2, w: sc * ROADW * W / 2 });
      const a = pr(sc1, s.y, -x * CF), b = pr(sc2, s2.y, -(x + dx) * CF);
      rows[n] = { x: a.x, y: a.y, w: a.w, sc: sc1, z: z1, s };
      x += dx; dx += s.curve;
      if (a.y <= b.y || b.y >= maxy) continue; /* behind a hill crest */
      const alt = (base + n) % 2, fog = Math.min(.8, n / DRAW);
      const grass = s.zone === 'forest' ? (alt ? '#1b4d27' : '#1f5a2c') : (alt ? '#5b5646' : '#645e4d');
      g.fillStyle = grass; g.fillRect(0, b.y, W, Math.min(a.y, maxy) - b.y + 1);
      const rb = 1.12, quad = (c, ax, ay, aw, bx, by, bw) => { g.fillStyle = c; g.beginPath(); g.moveTo(ax - aw, ay); g.lineTo(bx - bw, by); g.lineTo(bx + bw, by); g.lineTo(ax + aw, ay); g.fill(); };
      quad(alt ? '#fff' : '#e0334a', a.x, a.y, a.w * rb, b.x, b.y, b.w * rb);
      quad(alt ? '#3d414c' : '#383c47', a.x, a.y, a.w, b.x, b.y, b.w);
      if (alt) for (const L of [-.5, 0, .5]) { const lw = .018; g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.moveTo(a.x + a.w * (L - lw), a.y); g.lineTo(b.x + b.w * (L - lw), b.y); g.lineTo(b.x + b.w * (L + lw), b.y); g.lineTo(a.x + a.w * (L + lw), a.y); g.fill(); }
      if (fog > .25) { g.fillStyle = `rgba(122,79,150,${(fog - .25) * .5})`; g.fillRect(0, b.y, W, a.y - b.y + 1); }
      maxy = b.y;
    }
    /* sprites back to front: scenery + cars */
    const out = [], items = [];
    for (let n = DRAW - 1; n > 0; n--) {
      const r = rows[n]; if (!r) continue; const s = r.s, id = (base + n);
      if (s.deco) for (const side of [-1, 1]) {
        const hv = hash(id * 3 + side); if (hv < .12) continue;
        const off = 1.45 + hash(id * 7 + side) * (s.zone === 'forest' ? 1.6 : 2.2), size = r.w * (s.zone === 'forest' ? 1.1 + hash(id) * .8 : .5 + hash(id) * .8);
        items.push({ n, z: r.z, f: () => { const px = r.x + side * r.w * off, py = r.y; if (px < -200 || px > W + 200) return;
          if (s.zone === 'forest') { hv > .6 ? pine(g, px, py, size, n / DRAW) : bush(g, px, py, size * .7); if (hv > .85) pine(g, px + side * size * .4, py - 2, size * .8, n / DRAW); }
          else hv > .5 ? rock(g, px, py, size, id) : (hv > .3 ? pine(g, px, py, size * .8, n / DRAW) : rock(g, px, py, size * .6, id + 1)); } });
      }
    }
    for (const c of st.cars) {
      const fn = Math.max(1, Math.min(DRAW - 2.01, c.z / SEG + frac)), n = Math.floor(fn), tt = fn - n, ra = rows[n] || rows[n + 1], rb = rows[n + 1] || ra; if (!ra) continue; /* sub-segment interpolation: no stepping/jitter */
      const r = { x: ra.x + (rb.x - ra.x) * tt, y: ra.y + (rb.y - ra.y) * tt, w: ra.w + (rb.w - ra.w) * tt };
      const w = r.w * .23 * c.size; items.push({ n, z: c.z, f: () => { const cx = r.x + c.lane * r.w * .62, cy = Math.min(r.y, H - 14); c.o.vx = (W / 2 - cx) / (W / 2); if (!c.o.body) c.o.body = BODIES[[...String(c.id)].reduce((q, ch) => q + ch.charCodeAt(0), 0) % BODIES.length]; car(g, cx, cy, w, c.col, c.o); out.push({ id: c.id, x: cx, y: cy - w * .65, top: cy - w * (window.Cars ? Cars.rearH(c.o.body) : .6), w }); } });
    }
    items.sort((a, b) => b.z - a.z).forEach(i => i.f());
    /* speed streaks + nitro vignette */
    if (st.speed > 10) { g.strokeStyle = `rgba(255,255,255,${Math.min(.18, st.speed / 120)})`; g.lineWidth = 2; for (let k = 0; k < 14; k++) { const a = hash(k + 5) * 6.28, d0 = 90 + ((st.pos * .4 + k * 53) % 260), d1 = d0 + 40 + st.speed * 2; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * d0 * 1.6, hz + 40 + Math.sin(a) * d0 * .5); g.lineTo(W / 2 + Math.cos(a) * d1 * 1.6, hz + 40 + Math.sin(a) * d1 * .5); g.stroke(); } }
    if (st.nitro > 0) { const vg = g.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .85); vg.addColorStop(0, 'rgba(60,160,255,0)'); vg.addColorStop(1, `rgba(60,160,255,${.35 * st.nitro})`); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
    return out;
  }
  window.Scene3D = { draw, car, logo, TRACK, SEG, PLAYER_Z, N };
})();
