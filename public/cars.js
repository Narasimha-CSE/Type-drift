/* Type Drift - realistic 2D car renderer (no 3D meshes).
   Every car is a hand-drawn vector body with clear-coat paint, tinted glass with reflections, alloy wheels,
   headlights / tail-lights and shading.  Body styles: super, gt, sedan, hatch, csuv, suv, boxy.
     Cars.side(g, x, y, w, col, o)  side view, ground line at y, car length w   (login, home, garage, podium)
     Cars.rear(g, x, y, w, col, o)  rear view, ground line at y, car width w     (race road)
   Emblems are generic shapes, never manufacturer logos. */
window.Cars = (function () {
  'use strict';
  const G = 165, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hsla = (h, s, l, a) => `hsla(${Math.round(h)},${Math.round(clamp(s, 0, 100))}%,${Math.round(clamp(l, 0, 100) * 10) / 10}%,${a == null ? 1 : a})`;
  const rgba = (hex, a) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : `rgba(255,255,255,${a})`; };
  const parse = col => { if (Array.isArray(col)) return col; const m = /hsla?\(\s*(-?[\d.]+)[ ,]+([\d.]+)%[ ,]+([\d.]+)%/.exec(col || ''); return m ? [+m[1], +m[2], +m[3]] : [210, 60, 50]; };
  const cache = new Map();
  const P = (d, hk) => { hk = hk || 1; const key = d + '|' + hk; let p = cache.get(key); if (!p) { p = new Path2D(); p.addPath(new Path2D(d), new DOMMatrix([1, 0, 0, hk, 0, G * (1 - hk)])); cache.set(key, p); } return p; };

  /* ---------------- side-view body designs (design units: car length 400, ground line y = 165, facing right) ---------------- */
  const SIDE = {
    super: { R: 28, wx: [84, 319], belt: 86, sill: 152, top: 56, wing: 1,
      body: 'M12 146 C5 136 6 114 18 102 C52 92 112 86 150 82 C172 68 192 58 222 56 C250 56 268 70 296 86 C330 94 366 104 392 120 C400 126 402 140 398 148 L392 152 L20 152 Z',
      glass: 'M162 83 C178 71 194 63 222 61.5 C246 61.5 262 71 289 85 Z', pillars: ['M224 62 L229 84'],
      head: 'M352 110 C368 111 386 117 394 124 L386 127 C372 122 360 119 348 116 Z', tail: 'M13 108 C30 103 50 101 66 101 L66 107 C48 108 30 110 15 116 Z',
      doors: [200, 268], hx: 236, mirror: [286, 86], grille: 'M366 130 L396 130 L396 146 L370 148 Z',
      line: 'M30 112 C100 106 200 104 330 118', intake: 'M128 100 L196 106 L198 130 L130 134 Z', ix: 134 },
    gt: { R: 28, wx: [84, 318], belt: 89, sill: 152, top: 52, wing: 0,
      body: 'M10 148 C4 138 5 118 16 108 C20 104 24 102 40 100 C80 96 120 92 150 90 C170 76 190 58 224 54 C252 52 268 64 288 84 C322 90 356 98 380 110 C394 118 398 134 395 148 L388 152 L18 152 Z',
      glass: 'M160 89 C176 77 194 63 224 59.5 C248 58.5 262 68 281 87 Z', pillars: ['M222 59 L226 88'],
      head: 'M360 104 C374 106 388 112 396 121 L388 125 C376 120 366 117 356 114 Z', tail: 'M12 110 C22 106 32 104 46 104 L46 113 C32 113 22 115 12 119 Z',
      doors: [186, 262], hx: 232, mirror: [282, 87], grille: 'M372 128 L396 128 L394 146 L376 148 Z',
      line: 'M26 114 C100 106 220 104 350 118', intake: null },
    sedan: { R: 27, wx: [82, 318], belt: 84, sill: 152, top: 45, wing: 0,
      body: 'M8 148 C2 136 4 108 14 98 L22 92 C50 88 92 86 112 85 C128 84 142 68 160 54 C172 47 186 45 202 45 L236 45 C250 45 262 54 280 84 C312 88 354 94 382 106 C396 114 400 130 396 148 L388 152 L14 152 Z',
      glass: 'M120 83 C133 81.5 145 68 162 57.5 C174 51.5 187 49 202 49 L234 49 C247 49 257 57 272 83 Z', pillars: ['M198 49 L198 83'],
      head: 'M360 100 C374 102 390 108 396 118 L388 122 C378 118 368 114 356 110 Z', tail: 'M10 102 C16 96 24 94 38 93 L38 103 C28 105 20 108 12 112 Z',
      doors: [150, 232], hx: 214, mirror: [270, 84], grille: 'M372 122 L396 122 L394 146 L376 148 Z',
      line: 'M22 104 C100 96 220 94 380 112', intake: null },
    hatch: { R: 26, wx: [80, 322], belt: 72, sill: 152, top: 19, wing: 0,
      body: 'M6 148 C0 134 3 108 12 92 C16 84 20 78 26 70 C40 50 70 30 110 24 C150 19 190 19 214 22 C236 26 254 40 276 66 C282 72 288 74 296 76 C330 80 366 86 388 98 C398 106 400 128 394 148 L386 152 L12 152 Z',
      glass: 'M38 71 C52 54 76 37 112 31 C150 27 190 27 212 29 C230 33 246 45 266 71 Z', pillars: ['M152 28 L154 71', 'M86 38 L92 71'],
      head: 'M364 88 C378 90 392 96 397 104 L389 108 C380 103 372 100 360 98 Z', tail: 'M5 100 C6 92 8 86 12 82 L22 82 L18 104 Z',
      doors: [140, 238], hx: 216, mirror: [270, 72], grille: 'M372 112 L397 112 L394 146 L376 148 Z',
      line: 'M20 100 C100 92 220 90 380 106', intake: null },
    suv: { R: 32, wx: [86, 316], belt: 56, sill: 142, top: 11, wing: 0, rails: 1, clad: 1,
      body: 'M8 136 C2 124 4 92 12 66 C16 46 24 30 44 20 C66 13 140 11 206 11 L252 12 C268 16 280 34 294 58 C326 60 360 64 384 74 C396 82 400 104 398 128 L392 142 L14 142 Z',
      glass: 'M44 55 C46 44 52 35 62 29 C80 23 140 21 204 21 L248 22 C258 26 268 38 282 55 Z', pillars: ['M152 21 L152 55', 'M92 22 L94 55'],
      head: 'M364 72 C380 74 392 80 397 88 L396 102 L384 100 C376 94 370 88 360 82 Z', tail: 'M6 66 L14 62 L16 98 L6 102 Z',
      doors: [152, 230], hx: 208, mirror: [288, 58], grille: 'M372 100 L397 102 L395 130 L376 130 Z',
      line: 'M16 86 C100 80 220 78 380 92', intake: null },
    csuv: { R: 30, wx: [86, 316], belt: 62, sill: 142, top: 18, wing: 0, rails: 1, clad: 1,
      body: 'M8 138 C2 126 4 98 12 76 C16 58 26 42 46 32 C70 22 130 18 196 18 L240 19 C256 23 270 40 288 64 C324 66 360 70 384 80 C396 88 400 106 398 128 L392 142 L14 142 Z',
      glass: 'M46 62 C50 50 58 41 72 35 C92 28 140 25 196 25 L236 26 C250 30 262 42 278 62 Z', pillars: ['M146 25 L146 62', 'M92 29 L94 62'],
      head: 'M364 78 C380 80 392 86 397 94 L396 106 L384 104 C376 98 370 92 360 88 Z', tail: 'M6 74 L14 70 L16 102 L6 106 Z',
      doors: [146, 224], hx: 202, mirror: [282, 64], grille: 'M372 104 L397 106 L395 130 L376 130 Z',
      line: 'M16 92 C100 86 220 84 380 98', intake: null },
    boxy: { R: 33, wx: [82, 318], belt: 62, sill: 144, top: 10, wing: 0, rails: 1, clad: 1, flare: 1,
      body: 'M8 142 L6 66 C6 40 8 24 20 14 L248 10 C256 12 260 18 264 28 L280 64 L370 66 C388 66 396 74 398 88 L398 134 L392 144 L14 144 Z',
      glass: 'M92 62 L98 22 L240 19 C246 21 250 27 254 34 L268 62 Z', pillars: ['M172 21 L172 62'],
      head: null, round: [388, 92, 11], tail: 'M6 88 L14 88 L14 120 L6 120 Z',
      doors: [172, 244], hx: 214, mirror: [274, 64], grille: 'M376 104 L398 104 L398 132 L380 132 Z',
      line: 'M12 92 C100 88 220 88 372 92', intake: null }
  };
  const DEFAULT_BODY = { 0: 'super', 1: 'sedan', 2: 'suv', 3: 'hatch' };
  const bodyOf = c => (c && SIDE[c.body] ? c.body : DEFAULT_BODY[c && c.type] || 'sedan');

  /* generic emblems (never manufacturer marks) */
  const LG = { star: [[0, -1], [.3, -.3], [1, -.25], [.45, .2], [.6, .95], [0, .55], [-.6, .95], [-.45, .2], [-1, -.25], [-.3, -.3]], bolt: [[.2, -1], [-.5, .15], [-.05, .15], [-.25, 1], [.55, -.15], [.1, -.15]],
    wing: [[-1, .2], [-.3, -.7], [1, -.8], [.4, -.2], [.9, .1], [.2, .2], [-.4, .7]], fang: [[-.8, -.8], [0, -.3], [.8, -.8], [.5, .2], [0, 1], [-.5, .2]], ghost: [[-.7, 1], [-.7, -.2], [-.4, -.8], [.4, -.8], [.7, -.2], [.7, 1], [.35, .6], [0, 1], [-.35, .6]],
    flame: [[0, -1], [.5, -.3], [.7, .3], [.4, .9], [0, 1], [-.4, .9], [-.7, .3], [-.4, -.1], [-.2, -.5]], shield: [[-.8, -.8], [.8, -.8], [.8, .1], [0, 1], [-.8, .1]], crown: [[-.9, .7], [-.9, -.5], [-.45, 0], [0, -.8], [.45, 0], [.9, -.5], [.9, .7]] };
  function logo(g, k, x, y, r, col) {
    g.save(); g.translate(x, y); g.fillStyle = 'rgba(8,10,16,.88)'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.strokeStyle = col; g.lineWidth = Math.max(1, r * .12); g.stroke();
    g.fillStyle = col; g.beginPath(); (LG[k] || LG.star).forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0] * r * .58, p[1] * r * .58)); g.closePath(); g.fill(); g.restore();
  }

  /* ---------------- shared pieces ---------------- */
  function rimStyle(o) { /* real cars: neutral alloys; original designs: tinted rims */
    if (o.rimH != null) return [o.rimH, 55, 52];
    return o.dark ? [220, 6, 30] : [214, 7, 68];
  }
  function wheel(g, cx, cy, R, rot, o) {
    const [rh, rs, rl] = rimStyle(o);
    g.save(); g.translate(cx, cy);
    g.fillStyle = '#08090c'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = R * .06; g.beginPath(); g.arc(0, 0, R * .92, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = R * .03; g.beginPath(); g.arc(0, 0, R * .8, 0, TAU); g.stroke();
    const rr = R * .68, gr = g.createLinearGradient(-rr, -rr, rr, rr);
    gr.addColorStop(0, hsla(rh, rs, rl + 26)); gr.addColorStop(.5, hsla(rh, rs, rl - 6)); gr.addColorStop(1, hsla(rh, rs, rl - 26));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.fill();
    g.fillStyle = '#111319'; g.beginPath(); g.arc(0, 0, rr * .84, 0, TAU); g.fill();               /* brake disc seen between spokes */
    g.strokeStyle = o.caliper || '#d33'; g.lineWidth = rr * .22; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, rr * .58, -1.25, -.3); g.stroke(); g.lineCap = 'butt'; /* caliper */
    g.rotate(rot);
    for (let i = 0; i < 10; i++) {
      g.rotate(TAU / 10);
      const sg = g.createLinearGradient(0, -rr * .1, 0, rr * .1); sg.addColorStop(0, hsla(rh, rs, rl + 22)); sg.addColorStop(1, hsla(rh, rs, rl - 22));
      g.fillStyle = sg; g.beginPath(); g.moveTo(rr * .16, -rr * .055); g.lineTo(rr * .86, -rr * .12); g.lineTo(rr * .86, rr * .12); g.lineTo(rr * .16, rr * .055); g.closePath(); g.fill();
    }
    g.rotate(-rot);
    g.strokeStyle = hsla(rh, rs, rl + 18, .9); g.lineWidth = R * .045; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke();   /* rim lip */
    const cg = g.createRadialGradient(-rr * .05, -rr * .05, 1, 0, 0, rr * .2); cg.addColorStop(0, hsla(rh, rs, rl + 30)); cg.addColorStop(1, hsla(rh, rs, rl - 20));
    g.fillStyle = cg; g.beginPath(); g.arc(0, 0, rr * .19, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.ellipse(-R * .25, -R * .4, R * .3, R * .1, -.6, 0, TAU); g.fill(); /* tyre gloss */
    g.restore();
  }

  /* ---------------- side view ---------------- */
  function side(g, x, y, w, col, o) {
    o = o || {};
    const B = SIDE[o.body] || SIDE.sedan, hk = o.hk || 1, Y = v => G - (G - v) * hk;
    const [h, s, l] = parse(col), k = w / 400, tm = o.time != null ? o.time : performance.now() / 1000, rot = o.rot || 0;
    const R = B.R, wy = G - R, lights = o.lights !== false, gp = o.pulse ? .65 + .35 * Math.sin(tm * 3.8) : 1;
    const body = P(B.body, hk), glass = P(B.glass, hk), sill = Y(B.sill);
    g.save(); g.translate(x, y); g.scale(o.flip ? -k : k, k); g.translate(-200, -G);

    /* ground shadow + neon underglow */
    g.save(); g.translate(200, G + 1); g.scale(1, .07);
    let sh = g.createRadialGradient(0, 0, 10, 0, 0, 225); sh.addColorStop(0, 'rgba(0,0,0,.7)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, 225, 0, TAU); g.fill();
    if (o.glow) { g.translate(0, -6); g.scale(1, 1.6); sh = g.createRadialGradient(0, 0, 10, 0, 0, 250); sh.addColorStop(0, rgba(o.glow, .6 * gp)); sh.addColorStop(1, rgba(o.glow, 0)); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, 250, 0, TAU); g.fill(); }
    g.restore();
    if (o.medal) { const mg = g.createRadialGradient(200, G - 50, 20, 200, G - 50, 260); mg.addColorStop(0, rgba(o.medal, .38)); mg.addColorStop(1, rgba(o.medal, 0)); g.fillStyle = mg; g.fillRect(-60, -60, 520, 260); }

    /* headlight beam (drawn first so the body covers its start) */
    if (lights && (B.head || B.round)) {
      const hx = B.round ? B.round[0] : 384, hy = Y(B.round ? B.round[1] : (B.belt + 30));
      const bg = g.createLinearGradient(hx, 0, hx + 200, 0); bg.addColorStop(0, 'rgba(255,244,190,.34)'); bg.addColorStop(1, 'rgba(255,244,190,0)');
      g.fillStyle = bg; g.beginPath(); g.moveTo(hx, hy - 4); g.lineTo(hx + 200, hy - 26); g.lineTo(hx + 200, G + 4); g.lineTo(hx, hy + 10); g.closePath(); g.fill();
    }

    /* underbody darkness between the wheels */
    const ug = g.createLinearGradient(0, sill - 4, 0, G); ug.addColorStop(0, 'rgba(0,0,0,.92)'); ug.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = ug; g.fillRect(B.wx[0], sill - 4, B.wx[1] - B.wx[0], G - sill + 4);

    /* painted body: clear-coat gradient */
    const bt = Y(B.top), bg = g.createLinearGradient(0, bt, 0, sill);
    bg.addColorStop(0, hsla(h, s, l + 22)); bg.addColorStop(.3, hsla(h, s, l + 8)); bg.addColorStop(.62, hsla(h, s, l)); bg.addColorStop(1, hsla(h, s, l - 20));
    g.fillStyle = bg; g.fill(body);
    g.save(); g.clip(body);
    if (o.roof) { g.fillStyle = o.roof; g.fillRect(0, 0, 400, Y(B.belt) - 1); }                         /* two-tone roof / black pillars */
    const lg = g.createLinearGradient(0, Y(B.belt) + 14, 0, sill); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.42)'); g.fillStyle = lg; g.fillRect(0, Y(B.belt) + 14, 400, sill - Y(B.belt));
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2.6; g.save(); g.translate(0, 3.2); g.stroke(body); g.restore();   /* top-edge highlight */
    g.strokeStyle = hsla(h, s, l + 24, .55); g.lineWidth = 1.5; g.stroke(P(B.line, hk));                  /* shoulder character line */
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.save(); g.translate(0, 3.5); g.stroke(P(B.line, hk)); g.restore();
    if (o.stripe) { g.fillStyle = o.accent || '#ffffff'; g.globalAlpha = .92; g.fillRect(0, Y(B.belt) + 24, 400, 6); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, Y(B.belt) + 30, 400, 2); }
    const sx = ((tm * 95 + (o.ph || 0)) % 640) - 140, sg = g.createLinearGradient(sx, 0, sx + 110, 50);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.2)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.fillRect(0, 0, 400, G); /* moving light sheen */
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1.2;                                                  /* door seams + handle */
    B.doors.forEach(dx => { g.beginPath(); g.moveTo(dx, Y(B.belt) + 1); g.lineTo(dx + 2, sill - 3); g.stroke(); });
    g.fillStyle = hsla(h, s, l + 14); g.strokeStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.roundRect(B.hx, Y(B.belt) + 7, 15, 3.6, 1.8); g.fill(); g.stroke();
    if (B.intake) { const ig = g.createLinearGradient(0, 0, 70, 0); ig.addColorStop(0, '#050608'); ig.addColorStop(1, '#14161b'); g.fillStyle = ig; g.fill(P(B.intake, hk)); g.strokeStyle = 'rgba(255,255,255,.14)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(B.ix + i * 12, Y(104) + 4); g.lineTo(B.ix + 2 + i * 12, Y(132) - 2); g.stroke(); } }
    if (B.flare) { g.strokeStyle = '#15171c'; g.lineWidth = 7; B.wx.forEach(wx => { g.beginPath(); g.arc(wx, G - R, R + 6, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); }); }
    if (B.clad) { g.fillStyle = 'rgba(14,16,20,.9)'; g.fillRect(14, sill - 9, 380, 9); }               /* plastic sill cladding */
    else { g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(24, sill - 4, 366, 4); }
    g.restore();

    /* wheel arches (dark wells) */
    g.save(); g.clip(body);
    B.wx.forEach(wx => {
      const ag = g.createRadialGradient(wx, wy, R * .6, wx, wy, R + 8); ag.addColorStop(0, '#000'); ag.addColorStop(1, '#0b0c10');
      g.fillStyle = ag; g.beginPath(); g.arc(wx, wy, R + 7, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(wx, wy, R + 8, Math.PI, TAU); g.stroke();
    });
    g.restore();
    if (B.clad) { g.strokeStyle = '#16181d'; g.lineWidth = 6; B.wx.forEach(wx => { g.beginPath(); g.arc(wx, wy, R + 10, Math.PI * 1.02, Math.PI * 1.98); g.stroke(); }); }

    /* glass */
    const gg = g.createLinearGradient(0, Y(B.top), 0, Y(B.belt)); gg.addColorStop(0, '#2a4258'); gg.addColorStop(.45, '#0d1a27'); gg.addColorStop(1, '#16293a');
    g.fillStyle = gg; g.fill(glass);
    g.save(); g.clip(glass);
    const rx = ((tm * 70 + (o.ph || 0) * 1.3) % 520) - 120;
    g.fillStyle = 'rgba(255,255,255,.13)'; g.beginPath(); g.moveTo(rx, 0); g.lineTo(rx + 34, 0); g.lineTo(rx - 40, G); g.lineTo(rx - 74, G); g.fill();
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(rx + 52, 0); g.lineTo(rx + 66, 0); g.lineTo(rx - 8, G); g.lineTo(rx - 22, G); g.fill();
    const sk = g.createLinearGradient(0, Y(B.top), 0, Y(B.top) + 24); sk.addColorStop(0, 'rgba(160,200,235,.35)'); sk.addColorStop(1, 'rgba(160,200,235,0)'); g.fillStyle = sk; g.fillRect(0, Y(B.top), 400, 24);
    g.restore();
    g.strokeStyle = 'rgba(220,230,240,.5)'; g.lineWidth = 1.2; g.stroke(glass);
    g.strokeStyle = o.roof ? '#0a0b0e' : hsla(h, s, l * .72); g.lineWidth = 5; B.pillars.forEach(d => g.stroke(P(d, hk)));
    g.fillStyle = hsla(h, s, l + 6); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.beginPath(); g.roundRect(B.mirror[0] - 3, Y(B.mirror[1]) - 6, 14, 8, 3); g.fill(); g.stroke();   /* wing mirror */

    /* roof rails, spoiler, wing */
    if (B.rails) { g.strokeStyle = hsla(215, 8, 70, .95); g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(50, Y(B.top) - 4); g.lineTo(240, Y(B.top) - 3); g.stroke(); g.lineWidth = 2; [66, 140, 224].forEach(rx2 => { g.beginPath(); g.moveTo(rx2, Y(B.top) - 4); g.lineTo(rx2, Y(B.top) + 1); g.stroke(); }); g.lineCap = 'butt'; }
    if (B.wing) { g.fillStyle = hsla(h, s, l * .55); g.beginPath(); g.moveTo(6, Y(98)); g.lineTo(70, Y(92)); g.lineTo(70, Y(97)); g.lineTo(8, Y(103)); g.closePath(); g.fill(); g.fillStyle = '#0a0b0e'; g.fillRect(30, Y(97), 5, 8); g.fillRect(52, Y(95), 5, 7); }

    /* lights and grille */
    g.fillStyle = '#07080b'; g.fill(P(B.grille, hk));
    g.strokeStyle = 'rgba(190,200,215,.35)'; g.lineWidth = 1; g.save(); g.clip(P(B.grille, hk)); for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(360, Y(B.sill) - 4 - i * 4.5); g.lineTo(400, Y(B.sill) - 4 - i * 4.5); g.stroke(); } g.restore();
    if (B.head) {
      const hp = P(B.head, hk), hg = g.createLinearGradient(340, 0, 400, 0); hg.addColorStop(0, '#9aa7b5'); hg.addColorStop(.5, '#fffbe6'); hg.addColorStop(1, '#ffe27a');
      g.fillStyle = hg; g.fill(hp); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke(hp);
      if (lights) { g.save(); g.shadowColor = '#fff1a8'; g.shadowBlur = 16; g.fillStyle = 'rgba(255,248,200,.9)'; g.fill(hp); g.restore(); }
    } else if (B.round) {
      const [rx0, ry0, rr0] = B.round, ry = Y(ry0);
      g.fillStyle = '#0a0b0e'; g.beginPath(); g.arc(rx0, ry, rr0 + 3, 0, TAU); g.fill();
      const hg = g.createRadialGradient(rx0 - 2, ry - 2, 1, rx0, ry, rr0); hg.addColorStop(0, '#fffef0'); hg.addColorStop(1, '#ffe27a'); g.fillStyle = hg; g.beginPath(); g.arc(rx0, ry, rr0, 0, TAU); g.fill();
      if (lights) { g.save(); g.shadowColor = '#fff1a8'; g.shadowBlur = 16; g.fillStyle = 'rgba(255,248,200,.9)'; g.beginPath(); g.arc(rx0, ry, rr0 - 1, 0, TAU); g.fill(); g.restore(); }
    }
    const tp = P(B.tail, hk), tg = g.createLinearGradient(0, 0, 70, 0); tg.addColorStop(0, '#ff5a64'); tg.addColorStop(1, '#8c0c1c');
    g.save(); if (lights || o.brake) { g.shadowColor = '#ff1d33'; g.shadowBlur = o.brake ? 24 : 12; } g.fillStyle = o.brake ? '#ff7b86' : tg; g.fill(tp); g.restore();
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke(tp);

    /* body outline */
    g.strokeStyle = hsla(h, s, l * .3, .85); g.lineWidth = 1.5; g.stroke(body);

    /* wheels */
    B.wx.forEach(wx => wheel(g, wx, wy, R * .96, rot, o));
    g.restore();
  }

  /* ---------------- rear view (width 100 units, ground at y = 0, up is negative y) ---------------- */
  const REAR = {
    super: { H: 35, sh: 22, bw: 37, rw: 28, tire: 20, tw: 11, light: 'bar', glass: .55, wing: 1, quad: 1, plate: 1 },
    gt: { H: 41, sh: 24, bw: 40, rw: 33, tire: 21, tw: 11, light: 'bar', glass: .6, quad: 1, plate: 1 },
    sedan: { H: 46, sh: 26, bw: 40, rw: 34, tire: 21, tw: 10, light: 'wrap', glass: .7, plate: 1 },
    hatch: { H: 52, sh: 27, bw: 42, rw: 38, tire: 21, tw: 10, light: 'vert', glass: .88, spoiler: 1, plate: 1 },
    csuv: { H: 57, sh: 31, bw: 43, rw: 38, tire: 25, tw: 10.5, light: 'vert', glass: .8, rails: 1, skid: 1, plate: 1 },
    suv: { H: 62, sh: 33, bw: 44, rw: 41, tire: 27, tw: 11, light: 'vert', glass: .9, rails: 1, skid: 1, plate: 1 },
    boxy: { H: 66, sh: 35, bw: 45, rw: 43, tire: 28, tw: 12, light: 'vert', glass: .84, rails: 1, skid: 1, spare: 1, plate: 1 }
  };
  function rear(g, x, y, w, col, o) {
    o = o || {};
    const T = REAR[o.body] || REAR.sedan, k = w / 100, [h, s, l] = parse(col), tm = o.time != null ? o.time : performance.now() / 1000;
    const brake = !!(o.brake || o.v > 4 || o.boost), gp = o.pulse ? .65 + .35 * Math.sin(tm * 3.8) : 1, lean = clamp(o.t || 0, -.2, .2);
    const H = T.H, sh = T.sh, bw = T.bw, rw = T.rw, b0 = 5.5;
    g.save(); g.translate(x, y); g.scale(k, k); g.transform(1, 0, -lean * .6, 1, 0, 0);

    /* shadow, underglow, boost / medal aura */
    g.save(); g.translate(0, 1); g.scale(1, .1); let sg = g.createRadialGradient(0, 0, 4, 0, 0, 64); sg.addColorStop(0, 'rgba(0,0,0,.7)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.beginPath(); g.arc(0, 0, 64, 0, TAU); g.fill();
    if (o.glow) { g.translate(0, -8); g.scale(1, 1.4); sg = g.createRadialGradient(0, 0, 4, 0, 0, 70); sg.addColorStop(0, rgba(o.glow, .6 * gp)); sg.addColorStop(1, rgba(o.glow, 0)); g.fillStyle = sg; g.beginPath(); g.arc(0, 0, 70, 0, TAU); g.fill(); }
    g.restore();
    const aura = o.boost ? '#5ab4ff' : o.medal || null;
    if (aura) { const ag = g.createRadialGradient(0, -H * .5, 6, 0, -H * .5, 80); ag.addColorStop(0, rgba(aura, .4)); ag.addColorStop(1, rgba(aura, 0)); g.fillStyle = ag; g.fillRect(-90, -H * 2, 180, H * 2.4); }
    if (o.boost) for (const sx of [-1, 1]) { const fx = sx * (T.quad ? 14 : 22), fl = 14 + Math.random() * 12, fg = g.createLinearGradient(0, -b0, 0, -b0 + fl); fg.addColorStop(0, '#e8f6ff'); fg.addColorStop(.4, '#3da0ff'); fg.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = fg; g.beginPath(); g.moveTo(fx - 3, -b0 - 2); g.lineTo(fx + 3, -b0 - 2); g.lineTo(fx, -b0 + fl); g.fill(); }

    /* tyres */
    for (const sx of [-1, 1]) { g.fillStyle = '#07080b'; g.beginPath(); g.roundRect(sx > 0 ? 50 - T.tw - .5 : -50 + .5, -T.tire, T.tw, T.tire, 3.5); g.fill(); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(sx > 0 ? 50 - T.tw + 1.5 : -50 + 2, -T.tire + 3, 1.6, T.tire - 6); }

    /* cabin (greenhouse) */
    const cr = 5, cp = new Path2D();
    cp.moveTo(-bw, -sh + 1); cp.lineTo(-rw, -H + cr); cp.quadraticCurveTo(-rw, -H, -rw + cr, -H); cp.lineTo(rw - cr, -H); cp.quadraticCurveTo(rw, -H, rw, -H + cr); cp.lineTo(bw, -sh + 1); cp.closePath();
    const cg = g.createLinearGradient(0, -H, 0, -sh); cg.addColorStop(0, hsla(h, s, l + 20)); cg.addColorStop(1, hsla(h, s, l - 6));
    g.fillStyle = cg; g.fill(cp);
    if (o.roof) { g.fillStyle = o.roof; g.fill(cp); }
    if (T.rails) { g.strokeStyle = hsla(215, 8, 72); g.lineWidth = 1.8; g.lineCap = 'round'; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * (rw - 2), -H - 1.5); g.lineTo(sx * (rw - 2), -H + 1); g.stroke(); } g.beginPath(); g.moveTo(-rw + 2, -H - 1.6); g.lineTo(rw - 2, -H - 1.6); g.stroke(); g.lineCap = 'butt'; }
    /* rear glass */
    const gi = 3.6, gtop = H - 3, gbot = sh + 3, gw0 = bw - gi - (1 - T.glass) * 8, gw1 = rw - gi, glp = new Path2D();
    glp.moveTo(-gw0, -gbot); glp.lineTo(-gw1, -gtop + 3); glp.quadraticCurveTo(-gw1, -gtop, -gw1 + 3, -gtop); glp.lineTo(gw1 - 3, -gtop); glp.quadraticCurveTo(gw1, -gtop, gw1, -gtop + 3); glp.lineTo(gw0, -gbot); glp.closePath();
    const gg = g.createLinearGradient(0, -gtop, 0, -gbot); gg.addColorStop(0, '#2c455c'); gg.addColorStop(.5, '#0c1824'); gg.addColorStop(1, '#17293a'); g.fillStyle = gg; g.fill(glp);
    g.save(); g.clip(glp); const gx = ((tm * 40 + (o.ph || 0)) % 200) - 100; g.fillStyle = 'rgba(255,255,255,.13)'; g.beginPath(); g.moveTo(gx, -H); g.lineTo(gx + 10, -H); g.lineTo(gx - 14, 0); g.lineTo(gx - 24, 0); g.fill();
    if (T.quad) { g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = .8; for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 5, -gtop); g.lineTo(i * 5.6, -gbot); g.stroke(); } }
    g.restore(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke(glp);
    if (brake && T.light !== 'bar') { g.fillStyle = 'rgba(255,40,60,.9)'; g.fillRect(-9, -gtop + 3, 18, 2.2); }   /* third brake light */

    /* lower body */
    const bp = new Path2D(); bp.roundRect(-50, -sh, 100, sh - b0, [7, 7, 4, 4]);
    const bg = g.createLinearGradient(0, -sh, 0, -b0); bg.addColorStop(0, hsla(h, s, l + 18)); bg.addColorStop(.35, hsla(h, s, l + 4)); bg.addColorStop(1, hsla(h, s, l - 22));
    g.fillStyle = bg; g.fill(bp);
    g.save(); g.clip(bp);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-46, -sh + 2.4); g.lineTo(46, -sh + 2.4); g.stroke();   /* shoulder highlight */
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -sh); g.lineTo(0, -sh + 6); g.stroke();
    if (o.stripe) { g.fillStyle = o.accent || '#fff'; g.fillRect(-7, -sh, 4, sh); g.fillRect(3, -sh, 4, sh); }
    const bump = g.createLinearGradient(0, -b0 - 9, 0, -b0); bump.addColorStop(0, 'rgba(0,0,0,0)'); bump.addColorStop(1, 'rgba(0,0,0,.65)'); g.fillStyle = bump; g.fillRect(-50, -b0 - 9, 100, 9 + 1);
    if (T.skid) { g.fillStyle = 'rgba(190,198,210,.5)'; g.fillRect(-24, -b0 - 3, 48, 3); }
    if (T.quad) { g.fillStyle = 'rgba(0,0,0,.55)'; for (let i = -5; i <= 5; i++) g.fillRect(i * 7 - .5, -b0 - 8, 1.4, 8); }
    g.restore();
    g.strokeStyle = hsla(h, s, l * .3, .8); g.lineWidth = 1; g.stroke(bp); g.stroke(cp);

    /* tail-lights */
    const tl = (px, py, pw, ph, r) => { g.save(); g.shadowColor = '#ff1d33'; g.shadowBlur = brake ? 18 : 8; const lg = g.createLinearGradient(0, py, 0, py + ph); lg.addColorStop(0, brake ? '#ff8a94' : '#ff4d5c'); lg.addColorStop(1, brake ? '#ff2a40' : '#a10f22'); g.fillStyle = lg; g.beginPath(); g.roundRect(px, py, pw, ph, r); g.fill(); g.restore(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = .8; g.beginPath(); g.roundRect(px, py, pw, ph, r); g.stroke(); };
    if (T.light === 'bar') { tl(-46, -sh + 5, 92, 4.6, 2.3); tl(-49, -sh + 3, 10, 9, 3); tl(39, -sh + 3, 10, 9, 3); }
    else if (T.light === 'wrap') { tl(-49, -sh + 3, 22, 8, 3); tl(27, -sh + 3, 22, 8, 3); g.fillStyle = 'rgba(210,218,230,.7)'; g.fillRect(-26, -sh + 6.6, 52, 1.6); }
    else { tl(-49.5, -sh + 1, 8, H > 58 ? 17 : 13, 2.5); tl(41.5, -sh + 1, 8, H > 58 ? 17 : 13, 2.5); }

    /* emblem, plate, exhaust, extras */
    if (o.logo) logo(g, o.logo, 0, -sh + 9, 4.6, o.lc || '#fff');
    if (T.spare) { g.fillStyle = '#08090c'; g.beginPath(); g.arc(0, -(sh + H) / 2 + 3, 14, 0, TAU); g.fill(); g.fillStyle = hsla(h, s, l * .6); g.beginPath(); g.arc(0, -(sh + H) / 2 + 3, 7.5, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.beginPath(); g.arc(0, -(sh + H) / 2 + 3, 12, 0, TAU); g.stroke(); }
    if (T.plate) { g.fillStyle = '#eef1f6'; g.beginPath(); g.roundRect(-8.5, -b0 - 13.5, 17, 7, 1.2); g.fill(); g.fillStyle = '#2b3140'; g.fillRect(-6.5, -b0 - 10.6, 13, 1.1); g.fillRect(-6.5, -b0 - 8.6, 9, 1); }
    const ex = T.quad ? [-17, -10, 10, 17] : T.skid ? [] : [-20, 20];
    ex.forEach(ex0 => { g.fillStyle = '#050506'; g.beginPath(); g.ellipse(ex0, -b0 + 1, 3.2, 2.2, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(210,218,230,.8)'; g.lineWidth = .9; g.stroke(); });
    if (T.spoiler) { g.fillStyle = hsla(h, s, l * .55); g.beginPath(); g.roundRect(-rw - 1, -H - 2.4, 2 * rw + 2, 3, 1.4); g.fill(); }
    if (T.wing && o.wing !== false) { g.fillStyle = hsla(h, s, l * .5); g.beginPath(); g.roundRect(-bw + 2, -H + 1, 2 * bw - 4, 3.2, 1.4); g.fill(); g.fillStyle = '#08090c'; g.fillRect(-bw + 8, -H + 4, 2.2, 6); g.fillRect(bw - 10.2, -H + 4, 2.2, 6); }
    /* gloss */
    const gl = g.createLinearGradient(-50, -H, 50, 0); gl.addColorStop(0, 'rgba(255,255,255,.14)'); gl.addColorStop(.4, 'rgba(255,255,255,0)'); g.save(); g.clip(bp); g.fillStyle = gl; g.fillRect(-50, -sh, 100, sh); g.restore();
    g.restore();
  }

  /* cars shown on the login screen and home strip (names only, no logos) */
  const SHOW = [
    { body: 'super', paint: [220, 7, 44], label: 'AUDI · R8 V10', stripe: 1, accent: '#e11d48' },
    { body: 'csuv', hk: .94, paint: [200, 70, 42], label: 'TATA · NEXON', roof: '#0b1220' },
    { body: 'suv', paint: [0, 0, 92], label: 'TOYOTA · FORTUNER' },
    { body: 'boxy', paint: [28, 85, 48], label: 'MAHINDRA · THAR' },
    { body: 'sedan', paint: [165, 55, 26], label: 'BMW · M3', stripe: 1, accent: '#2563eb' },
    { body: 'suv', hk: .97, paint: [8, 80, 40], label: 'TATA · HARRIER', roof: '#0b1220' },
    { body: 'hatch', hk: .96, paint: [48, 96, 52], label: 'MARUTI · SWIFT' },
    { body: 'gt', paint: [205, 90, 42], label: 'FORD · MUSTANG GT', stripe: 1, accent: '#ffffff' },
    { body: 'super', paint: [82, 95, 48], label: 'LAMBORGHINI · HURACAN', glow: '#a3e635' }
  ];
  const rearH = b => (REAR[b] || REAR.sedan).H / 100;   /* car height as a fraction of its width (rear view) */
  return { side, rear, wheel, logo, SIDE, SHOW, bodyOf, rearH, hsla, rgba, parse };
})();
