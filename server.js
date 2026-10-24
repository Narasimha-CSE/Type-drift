const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
let QR = null; try { QR = require('qrcode'); } catch { console.log('Tip: run npm install to enable QR codes'); }
const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 3000, DB = path.join(__dirname, 'users.json');
const RACE_MS = 60000, COUNT_MS = 5000, MAX_PLAYERS = 8;

let users = {};
try { users = JSON.parse(fs.readFileSync(DB)); } catch {}
const save = () => fs.writeFileSync(DB, JSON.stringify(users, null, 1));
const tokens = new Map();
/* garage catalog: cosmetic designs. body = realistic 2D body style (super, gt, sedan, hatch, csuv, suv, boxy),
   paint = [h,s,l], stripe/accent/glow/rim/roof = livery. Real-world models use their names only (generic emblems, no manufacturer logos). */
const CARS = {
  starter: { tier: 1, brand: 'URBAN', name: 'Street Hatch', theme: 'Street', price: 0, type: 3, body: 'hatch', paint: [212, 75, 52], logo: 'star', lc: '#ffffff', tc: '#60a5fa' },
  metro: { tier: 2, brand: 'METRA', name: 'Metro Sedan', theme: 'City', price: 400, type: 1, body: 'sedan', paint: [150, 60, 40], rim: 150, logo: 'shield', tc: '#34d399' },
  dune: { tier: 3, brand: 'DUNEX', name: 'Dune Runner', theme: 'Rally', price: 900, type: 2, body: 'csuv', paint: [28, 90, 52], stripe: 1, accent: '#ffffff', rim: 40, logo: 'wing', tc: '#fb923c' },
  viper: { tier: 4, brand: 'VENOM', name: 'Viper GT', theme: 'Supercar', price: 1800, type: 0, body: 'super', paint: [356, 85, 46], stripe: 1, accent: '#111111', rim: 0, logo: 'fang', tc: '#f43f5e' },
  phantom: { tier: 5, brand: 'SPECTRE', name: 'Phantom', theme: 'Stealth', price: 3200, type: 1, body: 'sedan', paint: [235, 18, 16], stripe: 1, accent: '#7c3aed', glow: '#a855f7', rim: 280, logo: 'ghost', tc: '#a855f7' },
  neon: { tier: 6, brand: 'NEOVA', name: 'Neon Drift', theme: 'Neon', price: 5200, type: 0, body: 'super', paint: [185, 95, 46], stripe: 1, accent: '#ff2bd6', glow: '#22d3ee', rim: 320, pulse: 1, logo: 'bolt', tc: '#22d3ee' },
  titan: { tier: 7, brand: 'TITAN', name: 'Titan X', theme: 'Armored', price: 8000, type: 2, body: 'suv', paint: [215, 10, 28], stripe: 1, accent: '#ef4444', glow: '#ef4444', rim: 0, pulse: 1, logo: 'flame', tc: '#ef4444' },
  eagle: { tier: 8, brand: 'AURUM', name: 'Golden Eagle', theme: 'Luxury', price: 12500, type: 0, body: 'gt', paint: [46, 95, 55], stripe: 1, accent: '#1a1a1a', glow: '#facc15', rim: 46, pulse: 1, logo: 'crown', tc: '#facc15' },
  /* real-world models */
  tiago: { tier: 2, real: 1, brand: 'TATA', name: 'Tiago', theme: 'City Hatch', price: 450, type: 3, body: 'hatch', hk: .97, paint: [0, 80, 44], logo: 'shield', tc: '#f87171' },
  swift: { tier: 2, real: 1, brand: 'MARUTI SUZUKI', name: 'Swift', theme: 'Hatchback', price: 550, type: 3, body: 'hatch', hk: .96, paint: [48, 96, 52], roof: '#0b1220', logo: 'wing', tc: '#facc15' },
  golf: { tier: 2, real: 1, brand: 'VOLKSWAGEN', name: 'Golf GTI', theme: 'Hot Hatch', price: 700, type: 3, body: 'hatch', paint: [210, 6, 88], stripe: 1, accent: '#c1121f', rim: 0, logo: 'shield', tc: '#e2e8f0' },
  city: { tier: 3, real: 1, brand: 'HONDA', name: 'City', theme: 'Sedan', price: 1000, type: 1, body: 'sedan', paint: [215, 12, 64], logo: 'shield', tc: '#93c5fd' },
  nexon: { tier: 3, real: 1, brand: 'TATA', name: 'Nexon', theme: 'Compact SUV', price: 1100, type: 2, body: 'csuv', hk: .94, paint: [200, 70, 42], roof: '#0b1220', logo: 'shield', tc: '#38bdf8' },
  creta: { tier: 3, real: 1, brand: 'HYUNDAI', name: 'Creta', theme: 'Compact SUV', price: 1250, type: 2, body: 'csuv', paint: [0, 0, 90], roof: '#0b1220', logo: 'wing', tc: '#e2e8f0' },
  mustang: { tier: 3, real: 1, brand: 'FORD', name: 'Mustang GT', theme: 'Muscle', price: 1300, type: 0, body: 'gt', paint: [205, 90, 42], stripe: 1, accent: '#ffffff', rim: 0, logo: 'bolt', tc: '#38bdf8' },
  thar: { tier: 3, real: 1, brand: 'MAHINDRA', name: 'Thar', theme: 'Off-road', price: 1400, type: 2, body: 'boxy', paint: [28, 85, 48], logo: 'fang', tc: '#fb923c' },
  defender: { tier: 3, real: 1, brand: 'LAND ROVER', name: 'Defender 110', theme: 'Off-road', price: 1500, type: 2, body: 'boxy', paint: [95, 22, 32], rim: 0, logo: 'shield', tc: '#a3b18a' },
  harrier: { tier: 4, real: 1, brand: 'TATA', name: 'Harrier', theme: 'SUV', price: 2200, type: 2, body: 'suv', hk: .97, paint: [8, 80, 40], roof: '#0b1220', logo: 'shield', tc: '#f87171' },
  scorpio: { tier: 4, real: 1, brand: 'MAHINDRA', name: 'Scorpio-N', theme: 'SUV', price: 2400, type: 2, body: 'suv', paint: [220, 10, 14], logo: 'fang', tc: '#94a3b8' },
  a6: { tier: 4, real: 1, brand: 'AUDI', name: 'A6', theme: 'Executive', price: 2600, type: 1, body: 'sedan', paint: [215, 14, 30], rim: 0, logo: 'shield', tc: '#cbd5e1' },
  supra: { tier: 4, real: 1, brand: 'TOYOTA', name: 'GR Supra', theme: 'Sports', price: 2800, type: 0, body: 'gt', paint: [8, 88, 46], stripe: 1, accent: '#111111', rim: 0, logo: 'wing', tc: '#fb7185' },
  fortuner: { tier: 4, real: 1, brand: 'TOYOTA', name: 'Fortuner', theme: 'Full-size SUV', price: 2900, type: 2, body: 'suv', paint: [0, 0, 92], roof: '#0b1220', rim: 0, logo: 'crown', tc: '#e2e8f0' },
  bmw: { tier: 4, real: 1, brand: 'BMW', name: 'M3 Competition', theme: 'Sport Sedan', price: 3100, type: 1, body: 'sedan', paint: [165, 55, 26], stripe: 1, accent: '#2563eb', rim: 210, logo: 'star', tc: '#60a5fa' },
  benz: { tier: 5, real: 1, brand: 'MERCEDES-AMG', name: 'GT Coupe', theme: 'Grand Tourer', price: 4400, type: 0, body: 'gt', paint: [210, 6, 72], stripe: 1, accent: '#111111', rim: 0, logo: 'star', tc: '#cbd5e1' },
  audi: { tier: 5, real: 1, brand: 'AUDI', name: 'R8 V10', theme: 'Supercar', price: 4800, type: 0, body: 'super', paint: [220, 7, 44], stripe: 1, accent: '#e11d48', rim: 0, logo: 'shield', tc: '#f43f5e' },
  porsche: { tier: 6, real: 1, brand: 'PORSCHE', name: '911 GT3', theme: 'Track', price: 6300, type: 0, body: 'gt', paint: [48, 96, 52], stripe: 1, accent: '#111111', rim: 0, logo: 'crown', tc: '#facc15' },
  tesla: { tier: 6, real: 1, brand: 'TESLA', name: 'Model S Plaid', theme: 'Electric', price: 6900, type: 1, body: 'sedan', paint: [0, 0, 92], glow: '#60a5fa', rim: 210, logo: 'bolt', tc: '#60a5fa' },
  lambo: { tier: 7, real: 1, brand: 'LAMBORGHINI', name: 'Huracan', theme: 'Supercar', price: 9500, type: 0, body: 'super', paint: [82, 95, 48], stripe: 1, accent: '#111111', glow: '#a3e635', rim: 82, pulse: 1, logo: 'fang', tc: '#a3e635' },
  ferrari: { tier: 7, real: 1, brand: 'FERRARI', name: '488 GTB', theme: 'Supercar', price: 10800, type: 0, body: 'super', paint: [0, 92, 46], stripe: 1, accent: '#ffffff', glow: '#ef4444', rim: 0, pulse: 1, logo: 'flame', tc: '#ef4444' },
  mclaren: { tier: 8, real: 1, brand: 'MCLAREN', name: '720S', theme: 'Hypercar', price: 14000, type: 0, body: 'super', paint: [24, 100, 52], stripe: 1, accent: '#111111', glow: '#fb923c', rim: 24, pulse: 1, logo: 'wing', tc: '#fb923c' },
  bentley: { tier: 8, real: 1, brand: 'BENTLEY', name: 'Continental GT', theme: 'Luxury', price: 15500, type: 1, body: 'gt', paint: [150, 45, 18], stripe: 1, accent: '#d4af37', glow: '#34d399', rim: 45, pulse: 1, logo: 'wing', tc: '#34d399' },
  rolls: { tier: 9, real: 1, brand: 'ROLLS-ROYCE', name: 'Phantom', theme: 'Ultra Luxury', price: 19000, type: 1, body: 'sedan', paint: [240, 30, 11], stripe: 1, accent: '#d4af37', glow: '#d4af37', rim: 45, pulse: 1, logo: 'crown', tc: '#e5c76b' },
  bugatti: { tier: 10, real: 1, brand: 'BUGATTI', name: 'Chiron', theme: 'Hypercar', price: 28000, type: 0, body: 'super', paint: [222, 85, 30], stripe: 1, accent: '#0b0b0b', glow: '#38bdf8', rim: 200, pulse: 1, logo: 'ghost', tc: '#38bdf8' }
};
/* economy: coins = base performance pay x difficulty x race length x opponents. Prices ~ races of play at ~200 coins/race (tier 2 = 2 races ... tier 8 = ~60). */
const MINS = [1, 2, 3, 5, 10, 15, 20, 30], MAXMIN = 60; /* preset race time limits; users can also type any custom whole number of minutes 1-60 */
const okMins = x => Number.isInteger(+x) && +x >= 1 && +x <= MAXMIN;
const DIFFS = ['easy', 'medium', 'hard'], DIFFM = { easy: 1, medium: 1.4, hard: 2 }, DURM = { 1: 1, 2: 1.8, 3: 2.5, 5: 3.8, 10: 6.5, 15: 8.5, 20: 10, 30: 12 }, DIFFW = { easy: 1.1, medium: 1, hard: .85 };
const SELL_RATE = 0.6;
/* payout multiplier for any race length: presets use the table, custom lengths are interpolated between presets */
const durMult = m => {
  if (DURM[m]) return DURM[m];
  const ks = Object.keys(DURM).map(Number).sort((a, b) => a - b), last = ks[ks.length - 1];
  if (m > last) return +(DURM[last] + (m - last) * .1).toFixed(2);
  for (let i = 1; i < ks.length; i++) if (m < ks[i]) { const a = ks[i - 1], b = ks[i]; return +(DURM[a] + (DURM[b] - DURM[a]) * (m - a) / (b - a)).toFixed(2); }
  return 1;
};
const BOT_NAMES = ['Arjun', 'Zara', 'Kabir', 'Mia', 'Rohan', 'Luna', 'Vikram', 'Nova', 'Ishaan', 'Tara', 'Dev', 'Kiara', 'Ravi', 'Sana', 'Neel', 'Aria', 'Veer', 'Leo'];
const isBot = k => k.startsWith('bot:');
const nm = (r, k) => isBot(k) ? r.bots[k].name : users[k].name;
const carOf = (r, k) => isBot(k) ? r.bots[k].car : (users[k].car || 'starter');

const WORDS = ('road engine speed turn light sharp quick steady focus rhythm breath finger practice clean smooth ' +
  'again forward rapid corner track silver orange window garden simple strong gentle bridge island mountain river ' +
  'forest market morning evening winter summer letter number answer question follow listen travel carry gather ' +
  'build paint write learn teach watch bring state place right small large early later every always never maybe ' +
  'steel cloud stone water flame wheel brake shift gear lane start finish score point level master skill').split(' ');

const FILES = { '/': ['index.html', 'text/html'], '/style.css': ['style.css', 'text/css'], '/app.js': ['app.js', 'text/javascript'],
  '/scene3d.js': ['scene3d.js', 'text/javascript'], '/typefx.js': ['typefx.js', 'text/javascript'],
  '/cars.js': ['cars.js', 'text/javascript'], '/homefx.js': ['homefx.js', 'text/javascript'] };
const readBody = req => new Promise(r => {
  let d = '';
  req.on('data', c => { d += c; if (d.length > 2000) req.destroy(); });
  req.on('end', () => { try { r(JSON.parse(d)); } catch { r({}); } });
});

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0], f = FILES[url];
  if (req.method === 'GET' && f) {
    res.writeHead(200, { 'Content-Type': f[1] + '; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(__dirname, 'public', f[0])));
  }
  /* captcha-only login: no password and no separate "create account". A valid driver name + a correct captcha
     signs you in; a new name gets its profile (coins, cars, history) created automatically on first login. */
  if (req.method === 'POST' && url === '/api/login') {
    const { name = '', cid = '', captcha = '' } = await readBody(req);
    const send = (c, o) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    const nm0 = String(name).trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(nm0)) return send(400, { error: 'Driver name: 3-16 letters, numbers or _' });
    if (!capOk(cid, captcha)) return send(400, { error: 'Captcha is incorrect or expired. Try the new code.', captcha: true });
    const key = nm0.toLowerCase();
    if (!users[key]) { users[key] = { name: nm0, races: 0, wins: 0, best: 0 }; save(); }
    const token = crypto.randomBytes(16).toString('hex');
    tokens.set(token, key);
    return send(200, { token, name: users[key].name });
  }
  if (req.method === 'GET' && url === '/api/captcha') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(JSON.stringify(mkCaptcha())); }
  if (req.method === 'GET' && url === '/jsqr.js') {
    try { const f = fs.readFileSync(path.join(__dirname, 'node_modules/jsqr/dist/jsQR.js')); res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(f); }
    catch { res.writeHead(404); return res.end(); }
  }
  if (req.method === 'GET' && url === '/api/qr' && QR) {
    const text = new URL(req.url, 'http://x').searchParams.get('text') || '';
    if (text.length > 200) { res.writeHead(400); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    return res.end(await QR.toString(text, { type: 'svg', margin: 1 }));
  }
  res.writeHead(404); res.end('Not found');
});

const wss = new WebSocketServer({ server });
const sendAll = o => { const m = JSON.stringify(o); wss.clients.forEach(c => c.readyState === 1 && c.send(m)); };
const sendTo = (c, o) => c.readyState === 1 && c.send(JSON.stringify(o));
const publicUser = u => ({ name: u.name, races: u.races, wins: u.wins, best: u.best, coins: u.coins || 0, cars: u.cars || ['starter'], car: u.car || 'starter', history: (u.history || []).slice(0, 20) });

function presence() {
  const names = [...new Set([...wss.clients].filter(c => c.key).map(c => users[c.key].name))];
  const lb = Object.values(users).filter(u => u.best > 0).sort((a, b) => b.best - a.best).slice(0, 5).map(u => ({ name: u.name, best: u.best }));
  sendAll({ type: 'presence', users: names, lb });
}

// ---- race rooms (join with a code or QR) ----
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const mkCode = () => { let c; do { c = Array.from({ length: 5 }, () => CODE_CHARS[Math.random() * CODE_CHARS.length | 0]).join(''); } while (rooms.has(c)); return c; };
/* ---- captcha: server-made, single-use, expires in 3 min. Racing-themed keycap image so it matches the app ---- */
const captchas = new Map();
function mkCaptcha() {
  const now = Date.now(); for (const [k, v] of captchas) if (v.exp < now) captchas.delete(k);
  if (captchas.size > 500) captchas.delete(captchas.keys().next().value);
  const text = Array.from({ length: 5 }, () => CODE_CHARS[Math.random() * CODE_CHARS.length | 0]).join(''), id = crypto.randomBytes(8).toString('hex');
  captchas.set(id, { text, exp: now + 180000 });
  const R = (a, b) => (a + Math.random() * (b - a)).toFixed(1);
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 72" width="220" height="72" role="img" aria-label="captcha"><rect width="220" height="72" rx="10" fill="#10141f"/>';
  svg += `<path d="M0 ${R(58, 66)} H220" stroke="#3a4458" stroke-width="3" stroke-dasharray="16 12"/>`;
  for (let i = 0; i < 5; i++) svg += `<path d="M${R(0, 40)} ${R(4, 68)} Q${R(60, 160)} ${R(0, 72)} ${R(180, 220)} ${R(4, 68)}" stroke="hsl(${Math.random() * 360 | 0},80%,60%)" stroke-width="1.6" fill="none" opacity=".65"/>`;
  [...text].forEach((ch, i) => {
    svg += `<g transform="translate(${28 + i * 41} ${R(32, 40)}) rotate(${R(-18, 18)})"><rect x="-16" y="-19" width="32" height="38" rx="8" fill="#232a38" stroke="#4a5670"/><text x="0" y="9" text-anchor="middle" font-family="ui-monospace,Consolas,monospace" font-size="25" font-weight="800" fill="${i % 2 ? '#f59e0b' : '#e8ebf0'}">${ch}</text></g>`;
  });
  for (let i = 0; i < 28; i++) svg += `<circle cx="${R(0, 220)}" cy="${R(0, 72)}" r="${R(.6, 1.6)}" fill="#8b94a5" opacity=".6"/>`;
  return { id, svg: svg + '</svg>' };
}
const capOk = (id, ans) => { const c = captchas.get(String(id)); captchas.delete(String(id)); return !!c && c.exp > Date.now() && String(ans).trim().toUpperCase() === c.text; };
const mkText = (diff, mins) => {
  const EASY = 'at in on up go do we be he me my no so to it is an as or if by cat dog sun run sit hat map pen cup bed red big top fun car bus tea egg ice day way man sky sea air arm leg box key toy fan jam'.split(' ');
  const HARD = 'adventure velocity momentum precision thunderstorm landscape technology challenge champion exhibition boundary discipline algorithm hurricane laboratory aerodynamic reliable accelerate illustrate mechanical spectacular tournament extraordinary generation development atmosphere experience competitor transmission navigation overtaking performance championship acceleration synchronize perspective determination'.split(' ');
  const D = { easy: { pool: EASY.concat(WORDS.filter(w => w.length <= 5)), a: 4, b: 3, per: 80 }, medium: { pool: WORDS, a: 5, b: 5, per: 90 }, hard: { pool: HARD.concat(WORDS), a: 8, b: 4, per: 75 } }[diff] || { pool: WORDS, a: 5, b: 5, per: 90 };
  const n = Math.round(mins * D.per), out = []; let c = 0;
  while (c < n) {
    const k = D.a + (Math.random() * D.b | 0), w = Array.from({ length: k }, () => D.pool[Math.random() * D.pool.length | 0]);
    if (diff === 'hard') { w[1 + (Math.random() * (k - 1) | 0)] = String(10 + (Math.random() * 990 | 0)); if (k > 8) w[3] += ','; }
    w[0] = w[0][0].toUpperCase() + w[0].slice(1); out.push(w.join(' ') + '.'); c += k;
  }
  return out.join(' ');
};
const toRoom = (r, o) => { const m = JSON.stringify(o); wss.clients.forEach(c => c.room === r.code && c.readyState === 1 && c.send(m)); };
const snap = r => ({
  type: 'race', diff: r.diff, pub: !!r.pub, manual: !!r.manual, dm: durMult(r.dur / 60000), auto: r.auto && r.state === 'lobby' ? Math.max(0, r.auto - Date.now()) : 0, code: r.code, host: users[r.host].name, state: r.state, dur: r.dur, len: r.text.length,
  left: r.state === 'countdown' ? r.t0 - Date.now() : r.state === 'running' ? r.t1 - Date.now() : 0,
  players: [...r.players].map(([k, p]) => ({ name: nm(r, k), car: carOf(r, k), bot: isBot(k), p: p.p, wpm: p.wpm, done: !!p.done }))
});
const lanIp = () => {
  for (const l of Object.values(os.networkInterfaces())) for (const a of l) if ((a.family === 'IPv4' || a.family === 4) && !a.internal) return a.address;
  return 'localhost';
};

function leave(ws) {
  const r = rooms.get(ws.room); ws.room = null;
  if (!r || [...wss.clients].some(c => c !== ws && c.key === ws.key && c.room === r.code)) return;
  r.players.delete(ws.key); if (r.players.size < 2) r.auto = 0;
  const hum = [...r.players.keys()].filter(k => !isBot(k)); if (!hum.length) return rooms.delete(r.code);
  if (r.host === ws.key) r.host = hum[0];
  toRoom(r, snap(r));
}

function startRace(r) {
  r.auto = 0; r.text = mkText(r.diff, r.dur / 60000); r.state = 'countdown'; r.t0 = Date.now() + COUNT_MS; toRoom(r, snap(r));
}

function addBot(r, now) {
  let name; do { name = BOT_NAMES[Math.random() * BOT_NAMES.length | 0]; } while ([...r.players.keys()].some(k => nm(r, k) === name) && r.players.size < BOT_NAMES.length);
  const hs = [...r.players.keys()].filter(k => !isBot(k)).map(k => users[k].best || 30), ref = Math.max(25, Math.min(110, hs.length ? Math.max(...hs) * .8 + 15 : 40));
  const k = 'bot:' + name + Math.random().toString(36).slice(2, 5), ids = Object.keys(CARS);
  r.bots[k] = { name, car: ids[Math.random() * ids.length | 0], base: ref * (DIFFW[r.diff] || 1) * (.65 + Math.random() * .6), acc: 88 + (Math.random() * 11 | 0), ph: Math.random() * 6, f: 0, slow: 0 };
  r.players.set(k, { p: 0, wpm: 0 }); r.nextBot = now + 900 + Math.random() * 700; toRoom(r, snap(r));
}
function dropBot(r) { const k = [...r.players.keys()].find(isBot); if (k) { r.players.delete(k); delete r.bots[k]; } }
function simBots(r, now) {
  const dt = Math.min(.5, (now - (r.lastSim || now)) / 1000); r.lastSim = now; const t = (now - r.tStart) / 1000;
  for (const [k, p] of r.players) if (isBot(k) && !p.done) {
    const b = r.bots[k]; if (Math.random() < .012) b.slow = now + 700 + Math.random() * 900; /* occasional typo: bot slows, never stops */
    const w = b.base * (1 + .18 * Math.sin(t * .7 + b.ph) + .1 * Math.sin(t * 2.3 + b.ph * 2)) * (now < b.slow ? .5 : 1);
    b.f += w * 5 / 60 * dt; p.p = Math.min(r.text.length, Math.floor(b.f)); p.wpm = Math.round(w); p.acc = b.acc; if (p.p >= r.text.length) p.done = now;
  }
}
function garage(ws, m) {
  const u = users[ws.key], c = CARS[m.id], say = (ok, msg) => sendTo(ws, { type: 'gmsg', ok, msg });
  u.cars = u.cars || ['starter']; u.car = u.car || 'starter'; u.coins = u.coins || 0;
  if (!c) return say(false, 'Unknown car');
  const own = u.cars.includes(m.id);
  if (m.type === 'buy') {
    if (own) return say(false, 'You already own this car');
    if (u.coins < c.price) return say(false, `Not enough coins. You need ${c.price - u.coins} more.`);
    u.coins -= c.price; u.cars.push(m.id); say(true, `Bought ${c.name} for ${c.price} coins!`);
  } else if (m.type === 'sell') {
    if (!own || m.id === 'starter') return say(false, 'You cannot sell this car');
    const back = Math.floor(c.price * SELL_RATE); u.coins += back; u.cars = u.cars.filter(x => x !== m.id); if (u.car === m.id) u.car = 'starter';
    say(true, `Sold ${c.name} for ${back} coins.`);
  } else { if (!own) return say(false, 'Buy this car first'); u.car = m.id; say(true, `${c.name} equipped.`); }
  save(); sendTo(ws, { type: 'me', user: publicUser(u) });
  const r = rooms.get(ws.room); if (r && r.state === 'lobby') toRoom(r, snap(r));
}

function finishRace(r) {
  const list = [...r.players].map(([k, p]) => ({ k, ...p }));
  list.sort((a, b) => (a.done && b.done) ? a.done - b.done : a.done ? -1 : b.done ? 1 : b.p - a.p);
  const ranking = list.map(x => ({ name: nm(r, x.k), car: carOf(r, x.k), bot: isBot(x.k), p: x.p, wpm: x.wpm, acc: x.acc ?? 100, done: !!x.done, ms: x.done ? x.done - r.tStart : null }));
  const mins = r.dur / 60000;
  /* coins: reward performance, not just winning. Solo races pay half so they can't be farmed. */
  const RANK_BONUS = [50, 25, 10], solo = list.length < 2;
  const coinsFor = (x, i) => {
    const pct = Math.round(x.p / r.text.length * 100), acc = x.acc ?? 100;
    const parts = [
      ['Participation', 10],
      ['Text completed', Math.round(pct / 100 * 40)],
      ['Typing speed', Math.round(Math.min(300, x.wpm) * 0.5)],
      ['Accuracy', acc >= 98 ? 30 : acc >= 95 ? 20 : acc >= 90 ? 10 : 0],
      ['Finish line', x.done ? 20 : 0],
      ['Rank bonus', solo ? 0 : (RANK_BONUS[i] || 0)]
    ].filter(p => p[1] > 0);
    let total = parts.reduce((a, p) => a + p[1], 0);
    const dm = DIFFM[r.diff] || 1, tm = durMult(r.dur / 60000), om = solo ? .5 : r.pub ? .7 : 1, sub = total, u0 = users[x.k];
    total = Math.max(1, Math.round(sub * dm * tm * om));
    parts.push([`${r.diff[0].toUpperCase() + r.diff.slice(1)} text x${dm} · ${r.dur / 60000} min x${tm}${solo ? ' · solo x0.5' : r.pub ? ' · vs computers x0.7' : ''}`, total - sub]);
    const sb = u0 && i === 0 && !solo ? Math.round(total * Math.min(.25, (u0.streak || 0) * .05)) : 0;
    if (sb > 0) { parts.push([`Win streak (${u0.streak} wins)`, sb]); total += sb; }
    return { total, parts };
  };
  const rewards = list.map(coinsFor);
  ranking.forEach((e, i) => { e.coins = rewards[i].total; e.parts = rewards[i].parts; });
  list.forEach((x, i) => {
    const u = users[x.k]; if (!u) return; u.races++; u.best = Math.max(u.best, x.wpm); u.coins = (u.coins || 0) + rewards[i].total;
    if (i === 0 && list.length > 1) { u.wins++; u.streak = (u.streak || 0) + 1; } else u.streak = 0;
    u.history = u.history || [];
    u.history.unshift({ t: Date.now(), rank: i + 1, of: list.length, wpm: x.wpm, acc: ranking[i].acc, mins, diff: r.diff, winner: ranking[0].name, coins: rewards[i].total, pct: Math.round(x.p / r.text.length * 100) });
    u.history.length = Math.min(u.history.length, 20);
  });
  save();
  r.state = 'result';
  toRoom(r, { type: 'result', len: r.text.length, mins, ranking });
  wss.clients.forEach(c => c.key && sendTo(c, { type: 'me', user: publicUser(users[c.key]) }));
  presence();
  /* nothing restarts automatically: each player chooses Home or Retry from the results screen */
}

setInterval(() => {
  const now = Date.now();
  for (const r of rooms.values()) {
    if (r.state === 'running') simBots(r, now);
    if (r.pub && r.state === 'lobby' && !r.manual) { /* random match: bots join one by one; race auto-starts a few seconds after */
      if (r.players.size < Math.min(r.target, MAX_PLAYERS) && now >= (r.nextBot || 0)) addBot(r, now);
      if (r.players.size >= 2 && !r.auto) r.auto = now + 8000;
      if (r.auto && r.players.size >= Math.min(r.target, MAX_PLAYERS)) r.auto = Math.min(r.auto, now + 2500);
      if (r.auto && now >= r.auto) startRace(r); else if (r.auto) toRoom(r, snap(r));
    }
    if (r.state === 'countdown' && now >= r.t0) {
      r.state = 'running'; r.tStart = now; r.t1 = now + r.dur; r.lastSim = now; Object.values(r.bots).forEach(b => { b.f = 0; b.slow = 0; });
      wss.clients.forEach(c => c.room === r.code && sendTo(c, { type: 'start', text: r.text }));
    } else if (r.state === 'running' && (now >= r.t1 || [...r.players].filter(([k]) => !isBot(k)).every(([, p]) => p.done))) { finishRace(r); continue; }
    if (r.state === 'countdown' || r.state === 'running') toRoom(r, snap(r));
  }
}, 250);

wss.on('connection', (ws, req) => {
  const key = tokens.get(new URL(req.url, 'http://x').searchParams.get('t'));
  if (!key) return ws.close(4001);
  ws.key = key; ws.room = null;
  sendTo(ws, { type: 'me', user: publicUser(users[key]), words: WORDS, catalog: CARS, sell: SELL_RATE, econ: { diff: DIFFM, dur: DURM, mins: MINS }, lan: `http://${lanIp()}:${PORT}` });
  presence();

  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const r = rooms.get(ws.room);
    if (m.type === 'create') {
      leave(ws);
      const code = mkCode(), room = { code, host: key, state: 'lobby', bots: {}, players: new Map([[key, { p: 0, wpm: 0 }]]), text: '', t0: 0, t1: 0, tStart: 0, diff: DIFFS.includes(m.diff) ? m.diff : 'medium', dur: (okMins(m.mins) ? +m.mins : 1) * 60000 };
      rooms.set(code, room); ws.room = code; toRoom(room, snap(room));
    } else if (m.type === 'quick') {
      leave(ws);
      const dur = (okMins(m.mins) ? +m.mins : 1) * 60000, diff = DIFFS.includes(m.diff) ? m.diff : 'medium';
      let room = [...rooms.values()].find(x => x.pub && x.state === 'lobby' && x.dur === dur && x.diff === diff && (x.players.size < MAX_PLAYERS || Object.keys(x.bots).length));
      if (!room) { const code = mkCode(); room = { code, pub: 1, auto: 0, bots: {}, target: 4 + (Math.random() * 5 | 0), nextBot: Date.now() + 1200, host: key, state: 'lobby', players: new Map(), text: '', t0: 0, t1: 0, tStart: 0, dur, diff }; rooms.set(code, room); }
      if (room.players.size >= MAX_PLAYERS) dropBot(room);
      room.players.set(key, { p: 0, wpm: 0 }); ws.room = room.code; toRoom(room, snap(room));
    } else if (m.type === 'buy' || m.type === 'sell' || m.type === 'equip') {
      garage(ws, m);
    } else if (m.type === 'join') {
      const room = rooms.get(String(m.code || '').toUpperCase().trim());
      if (!room) return sendTo(ws, { type: 'err', msg: 'Room not found. Check the code.' });
      if (room.state !== 'lobby') return sendTo(ws, { type: 'err', msg: 'That race has already started.' });
      if (room.players.size >= MAX_PLAYERS && !room.players.has(key)) return sendTo(ws, { type: 'err', msg: 'Room is full.' });
      if (ws.room !== room.code) leave(ws);
      room.players.set(key, room.players.get(key) || { p: 0, wpm: 0 });
      ws.room = room.code; toRoom(room, snap(room));
    } else if (m.type === 'start' && r && r.host === key && r.state === 'lobby') {
      startRace(r);
    } else if (m.type === 'dur' && r && !r.pub && r.host === key && r.state === 'lobby' && okMins(m.mins)) {
      r.dur = m.mins * 60000; toRoom(r, snap(r));
    } else if (m.type === 'diff' && r && r.host === key && r.state === 'lobby' && !r.pub && DIFFS.includes(m.diff)) {
      r.diff = m.diff; toRoom(r, snap(r));
    } else if (m.type === 'retry') {
      if (r && r.state === 'result') { /* back to the lobby; the host must press Start, no auto-start */
        r.state = 'lobby'; r.text = ''; r.auto = 0; r.manual = 1;
        r.players.forEach((p, k) => r.players.set(k, { p: 0, wpm: 0 }));
        if (!r.players.has(r.host)) r.host = [...r.players.keys()].find(k => !isBot(k)) || r.host;
        toRoom(r, snap(r));
      }
    } else if (m.type === 'leave') {
      leave(ws);
    } else if (m.type === 'progress' && r && r.state === 'running') {
      const p = r.players.get(key);
      if (!p || p.done || !Number.isInteger(m.i) || m.i < p.p || m.i > p.p + 5) return;
      p.p = Math.min(m.i, r.text.length);
      p.wpm = Math.max(0, Math.min(300, Math.round(+m.wpm || 0)));
      p.acc = Math.max(0, Math.min(100, Math.round(+m.acc || 0)));
      if (p.p >= r.text.length) p.done = Date.now();
    }
  });
  ws.on('close', () => { leave(ws); presence(); });
});

server.listen(PORT, () => console.log(`Type Drift running at http://localhost:${PORT}`));
