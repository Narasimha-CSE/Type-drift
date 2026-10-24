const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const ORD = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10 < 4 ? n % 10 : 0]);
let token = localStorage.getItem('td_token'), ws, me = {}, WORDS = ['type', 'fast'];
let CATALOG = {}, SELL = .6, ECON = {};
let race = null, view = 'auth', lan = '', pendingRoom = new URLSearchParams(location.search).get('room');
const words = n => { const out = []; let c = 0; while (c < n) { const k = 5 + (Math.random() * 5 | 0), w = Array.from({ length: k }, () => WORDS[Math.random() * WORDS.length | 0]); w[0] = w[0][0].toUpperCase() + w[0].slice(1); out.push(w.join(' ') + '.'); c += k; } return out.join(' '); };

/* ---------- views ---------- */
function show(v) {
  if (view === 'race' && v !== 'race' && race) { send({ type: 'leave' }); race = null; qrFor = null; }
  if (v === 'auth' && (view !== 'auth' || !capId)) loadCaptcha();
  view = v; FX.reset(); BG.set(v === 'race' ? 'off' : v === 'auth' ? 'auth' : 'app'); HomeFX.active(v === 'dash');
  $$('#nav [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === v));
  $$('.view').forEach(e => e.hidden = e.id !== v);
  $('#nav').hidden = v === 'auth';
  if (v === 'dash' && me.name) { ['#sRaces', '#sWins', '#sBest', '#sCoins'].forEach(s => $(s).dataset.v = 0); renderMe(); }
  if (v === 'practice') startPractice();
  if (v === 'garage') { $('#gmsg').textContent = ''; renderGarage(); }
  if (v === 'race') { resetRaceBox(); renderRace(); }
}
$$('[data-go]').forEach(b => b.onclick = () => show(b.dataset.go));

/* ---------- auth ---------- */
let capId = '';
async function loadCaptcha() {
  $('#capIn').value = ''; $('#capStat').hidden = true; $('#capImg').innerHTML = '<span class="mut">Loading code...</span>';
  try { const j = await (await fetch('/api/captcha', { cache: 'no-store' })).json(); capId = j.id; $('#capImg').innerHTML = j.svg; }
  catch { capId = ''; $('#capImg').innerHTML = '<span class="mut">Could not load the code. Press refresh.</span>'; }
}
$('#capNew').onclick = loadCaptcha;
$('#authForm').onsubmit = async e => { /* captcha-only login: driver name + captcha, no password, no sign-up step */
  e.preventDefault(); $('#authBtn').disabled = true;
  try {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: $('#u').value.trim(), cid: capId, captcha: $('#capIn').value }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    $('#capStat').hidden = false; $('#err').textContent = ''; /* captcha verified -> show it, then the animation */
    await new Promise(ok => setTimeout(ok, 800));
    token = j.token; localStorage.setItem('td_token', token); $('#capStat').hidden = true; $('#capIn').value = ''; playSplash(j.name || $('#u').value.trim()); connect();
  } catch (err) { $('#err').textContent = err.message || 'Something went wrong'; loadCaptcha(); }
  finally { $('#authBtn').disabled = false; }
};
$('#logout').onclick = () => { localStorage.removeItem('td_token'); token = null; if (ws) ws.close(); show('auth'); };

/* ---------- logo splash after a successful login, then the main page ---------- */
let splashT = null;
function playSplash(name) {
  const sp = $('#splash'), t = sp.querySelector('.spTitle'); clearTimeout(splashT);
  t.innerHTML = [...'TYPE DRIFT'].map((ch, i) => `<span class="${i > 4 ? 'd' : ''}" style="animation-delay:${(.9 + i * .07).toFixed(2)}s">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
  sp.querySelector('.spWelcome').innerHTML = `Welcome, <b>${esc(name || 'driver')}</b>`;
  sp.classList.remove('out'); sp.hidden = false;
  const end = () => { clearTimeout(splashT); sp.classList.add('out'); setTimeout(() => { sp.hidden = true; sp.classList.remove('out'); }, 500); };
  sp.onclick = end; splashT = setTimeout(end, 3000);
}

/* ---------- websocket ---------- */
const send = o => ws && ws.readyState === 1 && ws.send(JSON.stringify(o));
function connect() {
  ws = new WebSocket((location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/?t=' + token);
  ws.onopen = () => {
    race = null; if (view === 'auth') show('dash'); else if (view === 'race') renderRace();
    if (pendingRoom) { show('race'); send({ type: 'join', code: pendingRoom }); pendingRoom = null; history.replaceState(null, '', '/'); }
  };
  ws.onclose = ev => {
    if (ev.code === 4001) { localStorage.removeItem('td_token'); token = null; show('auth'); }
    else if (token) setTimeout(connect, 2000);
  };
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.type === 'gmsg') { $('#gmsg').textContent = m.msg; $('#gmsg').style.color = m.ok ? '#4ade80' : '#ff6b7a'; }
    if (m.type === 'me') { if (m.catalog) { CATALOG = m.catalog; SELL = m.sell; ECON = m.econ || ECON; } me = m.user; if (m.words) WORDS = m.words; if (m.lan) lan = m.lan; renderMe(); }
    if (m.type === 'presence') renderPresence(m);
    if (m.type === 'race') { race = m; renderRace(); }
    if (m.type === 'err') $('#gerr').textContent = m.msg;
    if (m.type === 'start') { R.reset(m.text); R.err = 0; FX.reset(); R.on = true; $('#big').textContent = 'GO!'; setTimeout(() => { if ($('#big').textContent === 'GO!') $('#big').textContent = ''; }, 900); }
    if (m.type === 'result') showResult(m);
  };
}

function renderMe() {
  renderHistory(); if (view === 'garage') renderGarage();
  $('#who').textContent = me.name; countTo($('#sRaces'), me.races || 0);
  countTo($('#sWins'), me.wins || 0); countTo($('#sBest'), me.best || 0);
  countTo($('#sCoins'), me.coins || 0, v => v.toLocaleString()); countTo($('#navCoins'), me.coins || 0, v => v.toLocaleString());
  const hc = CATALOG[me.car || 'starter']; if (hc) $('#heroCarName').textContent = hc.brand + ' ' + hc.name;
  HomeFX.bars(me);
}
function countTo(el, to, f = v => v) { /* animated number counter */
  const from = +(el.dataset.v || 0); el.dataset.v = to; if (from === to) { el.textContent = f(to); return; }
  const t0 = performance.now(), tick = now => { const k = Math.min(1, (now - t0) / 700); el.textContent = f(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
}
function renderPresence(m) {
  $('#onCount').textContent = m.users.length;
  $('#onList').innerHTML = m.users.map(n => `<li>${esc(n)}${n === me.name ? ' (you)' : ''}</li>`).join('');
  $('#lbList').innerHTML = m.lb.map(u => `<li>${esc(u.name)} <span class="mut">${u.best} WPM</span></li>`).join('') || '<li class="mut">No races yet</li>';
}
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- typing engine (shows two lines, scrolls as you type) ---------- */
function makeTyper(box, cfg) {
  const inner = document.createElement('div'); inner.className = 'inner'; box.replaceChildren(inner);
  const t = { idx: 0, tot: 0, errs: 0, t0: 0, lock: 0, text: '', on: false, spans: [] };
  t.add = s => { for (const c of s) { const e = document.createElement('span'); e.textContent = c; inner.append(e); t.spans.push(e); } t.text += s; };
  const mark = () => { const c = t.spans[t.idx]; if (c) { c.className = 'cur'; inner.style.transform = `translateY(${-c.offsetTop}px)`; } };
  t.reset = txt => { inner.replaceChildren(); inner.style.transform = ''; Object.assign(t, { idx: 0, tot: 0, errs: 0, t0: 0, lock: 0, text: '', spans: [] }); t.add(txt); mark(); };
  t.wpm = () => t.t0 ? Math.round(t.idx / 5 / (Math.max(Date.now() - t.t0, 2000) / 60000)) : 0;
  t.acc = () => t.tot ? Math.round((t.tot - t.errs) / t.tot * 100) : 100;
  t.key = ch => {
    if (!t.on || Date.now() < t.lock || t.idx >= t.text.length) return;
    if (!t.t0) t.t0 = Date.now();
    t.tot++;
    const cur = t.spans[t.idx];
    if (ch === t.text[t.idx]) {
      cur.className = 'ok'; t.idx++; FX.hit(true, t, cur, box);
      if (cfg.endless && t.text.length - t.idx < 150) t.add(' ' + words(60));
      mark();
    } else {
      t.errs++; FX.hit(false, t, cur, box); cur.classList.add('bad'); setTimeout(() => cur.classList.remove('bad'), 200);
      cfg.onErr && cfg.onErr();
    }
    cfg.onKey && cfg.onKey(t);
  };
  return t;
}
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || ['INPUT', 'SELECT'].includes(e.target.tagName)) return;
  if (view === 'practice') { e.preventDefault(); P.key(e.key); }
  if (view === 'race') { e.preventDefault(); R.key(e.key); }
});

/* ---------- practice: endless text, no time limit ---------- */
const P = makeTyper($('#pbox'), { endless: true, onKey: () => paintP() });
function paintP() { $('#pw').textContent = P.wpm(); $('#pa').textContent = P.acc() + '%'; $('#pc').textContent = P.idx; }
function startPractice() { P.reset(words(60)); P.on = true; paintP(); }
$('#pr').onclick = startPractice;
setInterval(() => view === 'practice' && P.t0 && paintP(), 500);

/* ---------- race rooms ---------- */
const RACE_MS = 60000;
const R = makeTyper($('#rbox'), { onErr: () => { R.err = Date.now(); }, onKey: t => { send({ type: 'progress', i: t.idx, wpm: t.wpm(), acc: t.acc() }); paintR(); } });
let prevState = null, qrFor = null;
const joinUrl = () => (lan && ['localhost', '127.0.0.1'].includes(location.hostname) ? lan : location.origin) + '/?room=' + race.code;
function resetRaceBox(msg) { R.on = false; R.reset(msg || 'The text appears here when the race starts. Only two lines show at a time.'); paintR(); }
function paintR() {
  $('#rw').textContent = R.wpm(); $('#ra').textContent = R.acc() + '%';
  const order = race ? [...race.players].sort((a, b) => b.p - a.p) : [], i = order.findIndex(p => p.name === me.name);
  $('#rp').textContent = i < 0 ? '-' : ORD(i + 1) + ' of ' + order.length;
}
function pickMins(sel, inp) { /* preset or custom (1-60 whole minutes) */
  if (sel.value !== 'custom') return +sel.value;
  const v = Math.round(+inp.value); if (!(v >= 1 && v <= 60)) { $('#gerr').textContent = 'Enter custom minutes between 1 and 60'; return null; } return v;
}
$('#mins').onchange = () => $('#minsCw').hidden = $('#mins').value !== 'custom';
$('#qMins').onchange = () => $('#qMinsCw').hidden = $('#qMins').value !== 'custom';
$('#mkRoom').onclick = () => { $('#gerr').textContent = ''; const m = pickMins($('#mins'), $('#minsC')); if (m != null) send({ type: 'create', mins: m, diff: $('#diff').value }); };
$('#jf').onsubmit = e => { e.preventDefault(); $('#gerr').textContent = ''; send({ type: 'join', code: $('#jc').value }); };
$('#quickBtn').onclick = () => { $('#gerr').textContent = ''; const m = pickMins($('#qMins'), $('#qMinsC')); if (m != null) send({ type: 'quick', mins: m, diff: $('#qDiff').value }); };
$('#startBtn').onclick = () => send({ type: 'start' });
$('#leave').onclick = () => { send({ type: 'leave' }); race = null; qrFor = null; renderRace(); };
$('#copy').onclick = () => { try { navigator.clipboard.writeText(joinUrl()); $('#copy').textContent = 'Copied'; setTimeout(() => $('#copy').textContent = 'Copy link', 1500); } catch { prompt('Copy this link', joinUrl()); } };
$('#qr').onerror = () => $('#qr').hidden = true;

function renderRace() {
  const s = race && race.state, sec = race ? Math.max(0, Math.ceil(race.left / 1000)) : 0;
  $('#gate').hidden = !!race; $('#lobby').hidden = s !== 'lobby'; $('#arena').hidden = !race || s === 'lobby';
  if (!race) { prevState = null; return; }
  if (s !== prevState) {
    if (s === 'lobby' || s === 'countdown') { cars = {}; if (s === 'countdown') $('#resModal').hidden = true; resetRaceBox(s === 'countdown' ? 'Get ready... the text appears at the green light.' : undefined); }
    prevState = s;
  }
  if (s === 'lobby') {
    if (qrFor !== race.code) { qrFor = race.code; $('#code').textContent = race.code; const u = joinUrl(); $('#qr').hidden = false; $('#qr').src = '/api/qr?text=' + encodeURIComponent(u); $('#qrUrl').textContent = u; }
    $('#lpl').innerHTML = race.players.map(p => `<li>${p.bot ? '🤖 ' : ''}${esc(p.name)}${p.name === race.host ? ' <span class="mut">(host)</span>' : ''}</li>`).join('');
    const host = race.host === me.name;
    $$('#chips button').forEach(b => { b.classList.toggle('on', +b.dataset.m === race.dur / 60000); b.disabled = !host || race.pub; });
    $$('#dchips button').forEach(b => { b.classList.toggle('on', b.dataset.d === race.diff); b.disabled = !host || race.pub; });
    const presets = ECON.mins || [1, 2, 3, 5, 10, 15, 20, 30], mm = race.dur / 60000;
    $('#lcMin').disabled = $('#lcSet').disabled = !host || race.pub; $('#lcNote').textContent = presets.includes(mm) ? '' : 'Custom: ' + mm + ' min';
    $('#startBtn').hidden = !host; $('#lhint').textContent = race.manual ? (host ? 'Press Start race when everyone is ready. Nothing starts automatically.' : 'Waiting for the host to start...') : race.pub ? (race.players.length < 2 ? 'Finding random players... ' + race.players.length + '/8 joined (need 2 to start)' : 'Race starts in ' + Math.ceil(race.auto / 1000) + 's · ' + race.players.length + '/8 players' + (host ? ' (or press Start now)' : '')) : host ? 'Start when your friends have joined (up to 8 players).' : 'Waiting for the host to start...';
  }
  $('#limit').textContent = (race.dur / 60000) + ' minute limit · ' + race.diff + ' text' + (ECON.diff ? ' · payout x' + (ECON.diff[race.diff] * (race.dm || 1) * (race.pub ? .7 : 1)).toFixed(2) : '');
  const txt = s === 'countdown' ? `Starts in ${sec}s` : s === 'running' ? `${sec}s left` : 'Race finished';
  $('#rStatus').textContent = `Room ${race.code} · ${txt} · ${race.players.length} racing`;
  if (s === 'countdown') $('#big').textContent = sec; else if (s !== 'running') $('#big').textContent = '';
  $('#tb').style.width = s === 'running' ? Math.max(0, race.left / (race.dur / 100)) + '%' : s === 'countdown' ? '100%' : '0';
  if (s === 'running') paintR();
}
const MED = ['🥇', '🥈', '🥉'];
const fmt = ms => ms == null ? 'did not finish' : ms >= 60000 ? Math.floor(ms / 60000) + 'm ' + ((ms % 60000) / 1000).toFixed(1) + 's' : (ms / 1000).toFixed(1) + 's';
const gradeOf = r => { const sc = r.wpm * r.acc / 100; return sc >= 70 ? 'S' : sc >= 50 ? 'A' : sc >= 35 ? 'B' : sc >= 20 ? 'C' : 'D'; };
function showResult(m) {
  R.on = false;
  const rk = m.ranking, n = rk.length, w = rk[0], won = w.name === me.name, mi = rk.findIndex(r => r.name === me.name), mine = rk[mi];
  const maxW = Math.max(1, ...rk.map(r => r.wpm));
  $('#resHead').textContent = won ? `🏆 Congratulations, ${me.name}!` : mine ? `${ORD(mi + 1)} place. Better luck next time!` : 'Race finished';
  $('#resSub').textContent = w.done ? `${w.name} crossed the finish line first in ${fmt(w.ms)}.` : `Time's up. ${w.name} led with ${Math.round(w.p / m.len * 100)}% of the text.`;
  /* podium: 2nd | 1st | 3rd */
  $('#resPodium').innerHTML = [1, 0, 2].filter(i => rk[i]).map(i => { const r = rk[i], c = CATALOG[r.car] || {};
    return `<div class="pod p${i + 1}" style="--h:${[92, 68, 48][i]}px;--d:${(.3 + (2 - i) * .35).toFixed(2)}s"><canvas class="pcv" width="220" height="96" data-car="${esc(r.car || 'starter')}"></canvas><b>${r.bot ? '🤖 ' : ''}${esc(r.name)}${r.name === me.name ? ' (you)' : ''}</b><small>${esc(c.name || '')}</small><small>${r.wpm} WPM · ${r.acc}%</small><div class="pstep">${MED[i]}</div></div>`; }).join('');
  drawPodiumCars();
  /* my performance tiles */
  $('#resMine').innerHTML = mine ? [['Rank', ORD(mi + 1) + ' of ' + n], ['Speed', mine.wpm + ' WPM'], ['Accuracy', mine.acc + '%'], ['Completed', Math.round(mine.p / m.len * 100) + '%'], ['Time', mine.done ? fmt(mine.ms) : 'not finished'], ['Grade', `<span class="gr g-${gradeOf(mine)}">${gradeOf(mine)}</span>`]]
    .map(([k, v], i) => `<div class="mt" style="animation-delay:${(.5 + i * .08).toFixed(2)}s"><small>${k}</small><b>${v}</b></div>`).join('') : '';
  /* every player's performance bars */
  $('#resRows').innerHTML = rk.map((r, i) => { const c = CATALOG[r.car] || {}, pct = Math.round(r.p / m.len * 100), you = r.name === me.name;
    return `<div class="rrow2${i === 0 ? ' win' : ''}${you ? ' you' : ''}" style="animation-delay:${((n - 1 - i) * .25 + .4).toFixed(2)}s">
      <div class="m">${MED[i] || ORD(i + 1)}</div>
      <div class="who"><b>${r.bot ? '🤖 ' : ''}${esc(r.name)}${you ? ' (you)' : ''}</b><small>${esc((c.brand ? c.brand + ' ' : '') + (c.name || ''))} · ${r.done ? 'finished in ' + fmt(r.ms) : 'did not finish'}</small>
        <div class="bars">
          <label><span>Speed <b>${r.wpm}</b></span><i class="bar"><u style="--w:${Math.round(r.wpm / maxW * 100)}%"></u></i></label>
          <label><span>Accuracy <b>${r.acc}%</b></span><i class="bar acc"><u style="--w:${r.acc}%"></u></i></label>
          <label><span>Progress <b>${pct}%</b></span><i class="bar pr"><u style="--w:${pct}%"></u></i></label>
        </div></div>
      <div class="gr g-${gradeOf(r)}" title="Performance grade">${gradeOf(r)}</div></div>`; }).join('');
  $('#rain').innerHTML = won ? Array.from({ length: 70 }, () => `<i style="left:${Math.random() * 100}%;background:hsl(${Math.random() * 360},90%,60%);animation-duration:${2 + Math.random() * 2.5}s;animation-delay:${Math.random() * 1.2}s"></i>`).join('') : '';
  const cb = $('#resCoins');
  cb.hidden = !mine || !mine.coins;
  if (!cb.hidden) {
    $('#coinParts').innerHTML = mine.parts.map((p, i) => `<li style="animation-delay:${(n * .25 + .9 + i * .2).toFixed(2)}s"><span>${esc(p[0])}</span><b>${p[1] > 0 ? '+' + p[1] : p[1] < 0 ? p[1] : ''}</b></li>`).join('');
    const total = mine.coins, t0 = performance.now() + (n * .25 + .9) * 1000, el = $('#coinTotal');
    el.textContent = '+0'; const tick = now => { const k = Math.max(0, Math.min(1, (now - t0) / 1400)); el.textContent = '+' + Math.round(total * (1 - Math.pow(1 - k, 3))); if (k < 1 && !$('#resModal').hidden) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  }
  $('#resModal').scrollTop = 0; $('#resModal').hidden = false;
}
/* the player must pick one: Home page, or Retry (back to the room lobby; the host starts the next race manually) */
$('#resHome').onclick = () => { $('#resModal').hidden = true; show('dash'); };
$('#resRetry').onclick = () => { $('#resModal').hidden = true; send({ type: 'retry' }); };
function renderHistory() {
  const h = me.history || [];
  const html = h.length ? h.map((x, i) => `<li style="animation-delay:${i * 60}ms"><b>${MED[x.rank - 1] || ORD(x.rank)} ${x.rank <= 3 ? ORD(x.rank) : ''}</b> of ${x.of}<span class="mut"> · ${x.wpm} WPM · ${x.acc}% accuracy · ${x.mins} min${x.diff ? ' · ' + x.diff : ''} · winner ${esc(x.winner)} · ${new Date(x.t).toLocaleString()}</span>${x.coins ? ` <span class="coinTag">+${x.coins} 🪙</span>` : ''}</li>`).join('') : '<li class="mut">No races yet. Your results will appear here.</li>';
  $('#hist').innerHTML = html; $('#hist2').innerHTML = html;
}

/* ---------- join: team code + QR scanner ---------- */
$('#codeBtn').onclick = () => { $('#jf').hidden = !$('#jf').hidden; if (!$('#jf').hidden) $('#jc').focus(); };
let scanStream = null, scanTimer = null;
const parseCode = t => { try { return (new URL(t).searchParams.get('room') || '').toUpperCase() || null; } catch { return /^[A-Z0-9]{5}$/i.test(t.trim()) ? t.trim().toUpperCase() : null; } };
const loadJsQR = () => window.jsQR ? Promise.resolve() : new Promise((ok, no) => { const e = document.createElement('script'); e.src = '/jsqr.js'; e.onload = ok; e.onerror = no; document.head.append(e); });
function closeScanner() { clearInterval(scanTimer); if (scanStream) scanStream.getTracks().forEach(t => t.stop()); scanStream = null; $('#scan').hidden = true; $('#scanCode').hidden = true; $('#scanInput').value = ''; }
function joinFromScanner(code) {
  clearInterval(scanTimer);
  $('#scanCode').hidden = false; $('#scanCode b').textContent = code; $('#scanMsg').textContent = 'Match code found. Joining the race...';
  setTimeout(() => { closeScanner(); $('#gerr').textContent = ''; send({ type: 'join', code }); }, 1000);
}
$('#scanForm').onsubmit = e => { e.preventDefault(); const code = $('#scanInput').value.trim().toUpperCase(); if (code) joinFromScanner(code); };
$('#scanClose').onclick = closeScanner;
$('#scanBtn').onclick = async () => {
  $('#scan').hidden = false; $('#scanCode').hidden = true; $('#scanMsg').textContent = 'Point the camera at the room QR code, or type the match code below';
  try {
    await loadJsQR();
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const v = $('#vid'); v.srcObject = scanStream; await v.play();
    const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
    scanTimer = setInterval(() => {
      if (!v.videoWidth) return;
      const k = Math.min(1, 640 / v.videoWidth); c.width = v.videoWidth * k; c.height = v.videoHeight * k;
      x.drawImage(v, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height), r = window.jsQR(d.data, d.width, d.height), code = r && parseCode(r.data);
      if (code) joinFromScanner(code);
    }, 200);
  } catch { $('#scanMsg').textContent = 'Camera is not available here. Type the match code below, or scan with your phone camera app.'; }
};
$$('#dchips button').forEach(b => b.onclick = () => send({ type: 'diff', diff: b.dataset.d }));
$$('#chips button').forEach(b => b.onclick = () => send({ type: 'dur', mins: +b.dataset.m }));
$('#lcSet').onclick = () => { const v = Math.round(+$('#lcMin').value); if (v >= 1 && v <= 60) { send({ type: 'dur', mins: v }); $('#lcMin').value = ''; } else $('#lcNote').textContent = 'Enter 1-60 minutes'; };
$('#lcMin').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('#lcSet').click(); } };

/* ---------- animated track ---------- */
const cv = $('#cv'), g = cv.getContext('2d');
let cars = {}, parts = [], scroll = 0, lastT = 0; const cam = { pos: 0, nitro: 0 };
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const colorOf = n => `hsl(${[...n].reduce((a, c) => a + c.charCodeAt(0) * 37, 0) % 360},75%,58%)`;
function confetti() { for (let i = 0; i < 160; i++) parts.push({ t: 'conf', x: Math.random() * cv.width, y: -10, vx: (Math.random() - .5) * 200, vy: Math.random() * 140, life: 3, max: 3, size: 4 + Math.random() * 5, col: `hsl(${Math.random() * 360},90%,60%)` }); }

function drawWorld(W, H, top, lanes, lh) {
  const sk = g.createLinearGradient(0, 0, 0, top); sk.addColorStop(0, '#141b3a'); sk.addColorStop(.6, '#6a4a8c'); sk.addColorStop(1, '#f2a65a');
  g.fillStyle = sk; g.fillRect(0, 0, W, top);
  g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(W * .72, top - 8, 36, 0, 7); g.fill();
  g.fillStyle = '#2b2a52'; g.beginPath(); g.moveTo(0, top);
  for (let x = 0; x <= W; x += 20) g.lineTo(x, top - 34 - 14 * Math.sin((x + scroll * .08) / 70) - 8 * Math.sin((x + scroll * .08) / 23));
  g.lineTo(W, top); g.fill();
  const bw = 46, off = scroll * .22, i0 = Math.floor(off / bw);
  for (let i = i0; i < i0 + W / bw + 2; i++) {
    const bh = 24 + hash(i) * 46, bx = i * bw - off;
    g.fillStyle = '#171a36'; g.fillRect(bx, top - 36 - bh, bw - 6, bh + 36);
    g.fillStyle = 'rgba(255,214,120,.85)';
    for (let wy = 0; wy < bh - 6; wy += 10) for (let wx = 6; wx < bw - 14; wx += 12) if (hash(i * 13 + wy + wx) > .55) g.fillRect(bx + wx, top - 36 - bh + 6 + wy, 5, 5);
  }
  g.fillStyle = '#23253f'; g.fillRect(0, top - 30, W, 22);
  const co = scroll * .7;
  for (let x = -(co % 10); x < W; x += 10) { const k = Math.floor((x + co) / 10); g.fillStyle = `hsl(${hash(k) * 360},60%,62%)`; g.beginPath(); g.arc(x, top - 20 + hash(k + 9) * 6, 3.5, 0, 7); g.fill(); }
  const cw = 28, so = scroll % (cw * 2);
  for (let x = -so; x < W; x += cw) { g.fillStyle = Math.round((x + so) / cw) % 2 ? '#fff' : '#e0334a'; g.fillRect(x, top - 8, cw, 8); }
  const rd = g.createLinearGradient(0, top, 0, H); rd.addColorStop(0, '#454b59'); rd.addColorStop(1, '#2b303b');
  g.fillStyle = rd; g.fillRect(0, top, W, H - top);
  g.fillStyle = 'rgba(255,255,255,.5)';
  for (let l = 1; l < lanes; l++) for (let x = -(scroll % 80); x < W; x += 80) g.fillRect(x, top + l * lh - 1.5, 44, 3);
  for (let x = -so; x < W; x += cw) { g.fillStyle = Math.round((x + so) / cw) % 2 ? '#fff' : '#e0334a'; g.fillRect(x, H - 12, cw, 12); }
  for (let r = 0; r < (H - top) / 10; r++) { g.fillStyle = r % 2 ? '#fff' : '#111'; g.fillRect(W - 110, top + r * 10, 10, 10); g.fillStyle = r % 2 ? '#111' : '#fff'; g.fillRect(W - 100, top + r * 10, 10, 10); }
  g.fillStyle = '#111'; g.fillRect(W - 126, top - 70, 56, 18); g.fillStyle = '#fff'; g.font = '700 11px system-ui,sans-serif'; g.fillText('FINISH', W - 119, top - 57);
}
function drawCar(c, x, y, s, col, hurt, tilt, medal) {
  g.save(); g.translate(x, y + Math.sin(c.rot * .5) * Math.min(c.v, 8) * .15 * s); g.rotate(tilt || 0); g.scale(s, s);
  if (medal) { const gl = g.createRadialGradient(40, -14, 4, 40, -14, 75); gl.addColorStop(0, medal + '77'); gl.addColorStop(1, medal + '00'); g.fillStyle = gl; g.fillRect(-40, -80, 160, 110); }
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(40, 3, 46, 5, 0, 0, 7); g.fill();
  if (c.v > 4) {
    const fl = 10 + Math.random() * 14 + c.v, gr = g.createLinearGradient(0, 0, -fl, 0);
    gr.addColorStop(0, '#fff3b0'); gr.addColorStop(.4, '#ff9a1f'); gr.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -11); g.lineTo(-fl, -8); g.lineTo(0, -5); g.fill();
  }
  const bm = g.createLinearGradient(80, 0, 150, 0); bm.addColorStop(0, 'rgba(255,248,200,.35)'); bm.addColorStop(1, 'rgba(255,248,200,0)');
  g.fillStyle = bm; g.beginPath(); g.moveTo(80, -12); g.lineTo(150, -24); g.lineTo(150, 0); g.lineTo(80, -6); g.fill();
  g.fillStyle = col; g.beginPath(); g.roundRect(0, -18, 80, 14, 6); g.fill();
  g.beginPath(); g.moveTo(14, -18); g.lineTo(24, -30); g.lineTo(54, -30); g.lineTo(66, -18); g.fill();
  const sh = g.createLinearGradient(0, -18, 0, -4); sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.4)');
  g.fillStyle = sh; g.beginPath(); g.roundRect(0, -18, 80, 14, 6); g.fill();
  g.fillStyle = 'rgba(200,230,255,.88)';
  g.beginPath(); g.moveTo(20, -19); g.lineTo(27, -28); g.lineTo(38, -28); g.lineTo(38, -19); g.fill();
  g.beginPath(); g.moveTo(41, -19); g.lineTo(41, -28); g.lineTo(53, -28); g.lineTo(61, -19); g.fill();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(3, -12, 74, 2);
  g.fillStyle = '#111'; g.fillRect(-3, -28, 10, 3); g.fillRect(2, -26, 2, 8);
  g.fillStyle = '#fff6c2'; g.fillRect(76, -15, 4, 4); g.fillStyle = '#ff3b4d'; g.fillRect(0, -15, 3, 4);
  [16, 64].forEach(wx => {
    g.save(); g.translate(wx, -6); g.fillStyle = '#0b0d12'; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill();
    g.rotate(c.rot); g.strokeStyle = '#c9d1dc'; g.lineWidth = 2;
    for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.stroke(); }
    g.restore();
  });
  if (hurt) { g.fillStyle = 'rgba(255,50,60,.45)'; g.beginPath(); g.roundRect(0, -18, 80, 14, 6); g.fill(); }
  g.restore();
}
const MEDAL = ['#ffd700', '#cfd8e3', '#cd7f32'];
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (ts - lastT) / 1000 || 0); lastT = ts;
  if (view !== 'race' || !race || race.state === 'lobby') return;
  const W = cv.width, H = cv.height, ps = race.players, lanes = Math.max(ps.length, 3), top = 138, lh = (H - 14 - top) / lanes;
  const s = Math.min(1.15, lh / 44), trav = W - 140 - 80 * s, now = Date.now();
  const order = [...ps].sort((a, b) => b.p - a.p || a.name.localeCompare(b.name));
  let vMax = 0;
  ps.forEach(p => {
    const c = cars[p.name] || (cars[p.name] = { f: 0, df: 0, v: 0, rot: 0, rank: -1, y: null, y0: 0, y1: 0, lt: 1, tilt: 0 }), rk = order.indexOf(p);
    const pp = p.name === me.name && race.state === 'running' ? Math.max(p.p, R.idx) : p.p, f = race.len ? pp / race.len : 0, nf = c.f + (f - c.f) * Math.min(1, dt * 6);
    const vel = dt ? (nf - c.f) * race.len / dt : 0; c.f = nf;
    const boost = 1 + (ps.length - 1 - rk) * .08; /* better rank = faster looking car */
    const isMe0 = p.name === me.name, bst = isMe0 && Date.now() < FX.boostUntil; c.pen = Math.max(0, (c.pen || 0) - dt * .8);
    if (isMe0 && (R.err || 0) > (c.errSeen || 0)) { c.errSeen = R.err; c.pen = 1; } /* typo: gentle slow-down, never a sudden stop */
    const tgt = vel * boost * (1 - .5 * c.pen) * (bst ? 1.5 : 1); c.v += (tgt - c.v) * Math.min(1, dt * (tgt > c.v ? 3 : .9)); c.rot += (6 + c.v * 2.2) * dt; vMax = Math.max(vMax, c.v);
    /* each rank has its own lane path; a car glides along a smooth S-curve to its new lane */
    const ty = ps.length < 2 ? 0 : -.72 + 1.44 * rk / (ps.length - 1);
    if (c.y == null) { c.y = c.y0 = c.y1 = ty; c.lt = 1; }
    if (Math.abs(ty - c.y1) > .5) { c.y0 = c.y; c.y1 = ty; c.lt = 0; }
    c.lt = Math.min(1, c.lt + dt / .8);
    const py = c.y; c.y = c.y0 + (c.y1 - c.y0) * (c.lt * c.lt * (3 - 2 * c.lt));
    c.tilt += ((dt ? Math.max(-.14, Math.min(.14, (c.y - py) / dt * .07)) : 0) - c.tilt) * Math.min(1, dt * 5);
    if (c.rank > rk && race.state === 'running') c.burst = 1;
    c.rank = rk;
  });
  /* cars always line up in rank order: a lower rank is never drawn ahead of a higher one */
  let lead = 1; order.forEach(p => { const c = cars[p.name]; c.df = Math.max(0, Math.min(c.f, lead)); lead = c.df - .006; });
  const S3 = window.Scene3D, mine = cars[me.name] || cars[ps[0].name], running = race.state === 'running';
  const run = running ? Math.max(mine.v, vMax * .7) : 0, spd = (30 + run * 75) * (Date.now() < FX.boostUntil ? 1.5 : 1);
  cam.pos = (cam.pos + (running ? spd : 25) * dt * 14) % S3.TRACK; scroll += spd * dt;
  cam.nitro += ((running && Date.now() < FX.boostUntil ? 1 : 0) - cam.nitro) * Math.min(1, dt * 3);
  /* depth on the road comes from RANK: last place sits nearest the camera, each better rank is one slot further up the road.
     When ranks swap, the cars ease past each other (and change lanes) instead of snapping. */
  const minF = Math.min(...ps.map(p => cars[p.name].df)), SLOT = 750;
  const list = ps.map(p => {
    const c = cars[p.name], isMe = p.name === me.name, rk = c.rank;
    const tz = S3.PLAYER_Z + (ps.length - 1 - rk) * SLOT + Math.min(1200, (c.df - minF) * S3.TRACK * .12);
    c.zs = c.zs == null ? tz : c.zs + (tz - c.zs) * Math.min(1, dt * 2.2);
    c.sz = Math.abs(tz - c.zs); /* still travelling between slots */
    const ct = CATALOG[p.car] || CATALOG.starter || { paint: [38, 90, 50], type: 0 };
    return { id: p.name, z: c.zs, lane: c.y, size: 1, col: paintOf(ct),
      o: { ...carOpts(ct), boost: isMe && Date.now() < FX.boostUntil, rank: rk + 1, t: c.tilt, v: c.v + Math.min(6, c.sz / 250), hurt: isMe && (R.err || 0) + 700 > now, brake: isMe && (R.err || 0) + 700 > now, medal: race.state !== 'countdown' && ps.length > 1 ? MEDAL[rk] : null } };
  });
  g.save(); FX.shake = 0; /* steady camera: no shaking */
  const tags = S3.draw(g, W, H, { pos: cam.pos, speed: spd, cars: list, nitro: cam.nitro });
  tags.forEach(tg => {
    const p = ps.find(q => q.name === tg.id), c = cars[tg.id], isMe = tg.id === me.name, rk = c.rank, medal = race.state !== 'countdown' && ps.length > 1 ? MEDAL[rk] : null;
    const by = tg.y + tg.w * .65;
    if (c.burst) { c.burst = 0; for (let k = 0; k < 14; k++) parts.push({ t: 'spark', x: tg.x + (Math.random() - .5) * tg.w, y: by - 8, vx: (Math.random() - .5) * 260, vy: -60 - Math.random() * 120, life: .6, max: .6, size: 2.5, col: medal || '#fff' }); }
    if (c.v > 4 && Math.random() < dt * (rk === 0 ? 40 : 20)) parts.push({ t: 'spark', x: tg.x + (Math.random() - .5) * tg.w * .6, y: by, vx: (Math.random() - .5) * 60, vy: 30 + Math.random() * 40, life: .4, max: .4, size: 2, col: medal || '#ffb347' });
    if (isMe && (R.err || 0) + 700 > now && Math.random() < dt * 45) parts.push({ t: 'smoke', x: tg.x, y: tg.y, vx: (Math.random() - .5) * 30, vy: -30 - Math.random() * 30, life: .9, max: .9, size: 5, col: '120,120,130' });
    const tx = `${rk === 0 && ps.length > 1 && race.state !== 'countdown' ? '\u{1F451} ' : ''}${ORD(rk + 1)} ${p.name} \u00b7 ${p.wpm} WPM${p.done ? ' \u2713' : ''}`;
    g.font = '700 12px system-ui,sans-serif'; const tw = g.measureText(tx).width + 14, lx = Math.min(Math.max(4, tg.x - tw / 2), W - tw - 4), ly = Math.max(4, tg.top - 30);
    g.fillStyle = isMe ? '#f59e0b' : 'rgba(10,12,20,.78)'; g.beginPath(); g.roundRect(lx, ly, tw, 18, 9); g.fill();
    if (medal && !isMe) { g.strokeStyle = medal; g.lineWidth = 2; g.stroke(); }
    g.fillStyle = isMe ? '#1b1300' : '#fff'; g.fillText(tx, lx + 7, ly + 13);
  });
  /* live ranking ladder: rows slide up/down as places change */
  if (race.state !== 'countdown') {
    g.font = '700 12px system-ui,sans-serif';
    order.forEach((p, k) => {
      const c = cars[p.name]; c.hy = c.hy == null ? k * 24 : c.hy + (k * 24 - c.hy) * Math.min(1, dt * 7);
      const me_ = p.name === me.name, y = 12 + c.hy;
      g.fillStyle = me_ ? 'rgba(245,158,11,.92)' : 'rgba(10,12,20,.72)'; g.beginPath(); g.roundRect(12, y, 150, 21, 10); g.fill();
      g.fillStyle = MEDAL[k] || '#667'; g.beginPath(); g.arc(24, y + 10.5, 8, 0, 7); g.fill();
      g.fillStyle = '#10131a'; g.textAlign = 'center'; g.fillText(k + 1, 24, y + 15); g.textAlign = 'left';
      g.fillStyle = me_ ? '#1b1300' : '#fff'; g.fillText(p.name.slice(0, 12), 38, y + 15);
    });
  }
  parts = parts.filter(q => (q.life -= dt) > 0);
  parts.forEach(q => {
    const a = q.life / q.max;
    if (q.t === 'conf') { q.vy += 400 * dt; q.x += q.vx * dt; q.y += q.vy * dt; g.fillStyle = q.col; g.globalAlpha = Math.min(1, a * 2); g.fillRect(q.x, q.y, q.size, q.size * .6); }
    else { q.x += q.vx * dt; q.y += q.vy * dt; g.globalAlpha = a * .8; g.fillStyle = q.t === 'smoke' ? `rgba(${q.col},1)` : q.col; g.beginPath(); g.arc(q.x, q.y, q.size * (q.t === 'smoke' ? 2 - a : 1), 0, 7); g.fill(); }
    g.globalAlpha = 1;
  });
  g.restore();
  const sec = Math.ceil(race.left / 1000), go = race.state === 'running' && race.left > race.dur - 1500;
  if (race.state === 'countdown' || go) {
    const lit = go ? 3 : sec > 3 ? 0 : 4 - sec;
    g.fillStyle = 'rgba(8,10,16,.85)'; g.beginPath(); g.roundRect(W / 2 - 66, 14, 132, 44, 12); g.fill();
    for (let k = 0; k < 3; k++) { g.fillStyle = go ? '#22e06b' : k < lit ? '#ff2d3d' : '#3a1d22'; g.beginPath(); g.arc(W / 2 - 34 + k * 34, 36, 11, 0, 7); g.fill(); }
  }
}
requestAnimationFrame(frame);

/* ---------- garage: buy / sell / equip cars ---------- */
const paintOf = c => `hsl(${c.paint[0]},${c.paint[1]}%,${c.paint[2]}%)`;
const carOpts = c => ({ body: Cars.bodyOf(c), hk: c.hk, roof: c.roof, stripe: c.stripe, accent: c.accent, glow: c.glow, pulse: c.pulse, logo: c.logo, lc: c.lc || c.tc, rimH: !c.real && c.rim != null ? c.rim : null, caliper: c.tc });
let gFilter = 'all';
$$('#gfilter button').forEach(b => b.onclick = () => { gFilter = b.dataset.f; renderGarage(); });
function renderGarage() {
  $('#gCoins').textContent = (me.coins || 0).toLocaleString();
  $('#gtips').innerHTML = ECON.diff ? '<b>Earn coins faster:</b> Easy x' + ECON.diff.easy + ' · Medium x' + ECON.diff.medium + ' · Hard x' + ECON.diff.hard + ' &nbsp;|&nbsp; ' + Object.entries(ECON.dur).map(([m, x]) => m + ' min x' + x).join(' · ') + ' &nbsp;|&nbsp; vs computers x0.7 · win streak up to +25%' : '';
  const own = me.cars || ['starter'];
  $$('#gfilter button').forEach(b => b.classList.toggle('on', b.dataset.f === gFilter));
  $('#cars').innerHTML = Object.entries(CATALOG).sort((x, y) => x[1].price - y[1].price).filter(([, c]) => gFilter === 'all' || (gFilter === 'real') === !!c.real).map(([id, c], n) => {
    const has = own.includes(id), eq = me.car === id, need = c.price - (me.coins || 0);
    const btns = has ? (eq ? '<span class="pill">Equipped</span>' : `<button data-act="equip" data-id="${id}">Equip</button>`) + (id === 'starter' ? '' : `<button data-act="sell" data-id="${id}">Sell +${Math.floor(c.price * SELL)} 🪙</button>`)
      : `<button class="primary" data-act="buy" data-id="${id}" ${need > 0 ? 'disabled' : ''}>${need > 0 ? 'Need ' + need + ' more 🪙' : 'Buy ' + c.price + ' 🪙'}</button>`;
    return `<div class="carcard tier${c.tier}${eq ? ' eq' : ''}" style="--tc:${c.tc};animation-delay:${n * 70}ms"><canvas data-car="${id}" width="320" height="190"></canvas><div class="cm"><div><small class="brand">${esc(c.brand)} · TIER ${c.tier}${c.real ? ' · REAL' : ''}</small><b>${esc(c.name)}</b></div><span class="theme">${esc(c.theme)}</span></div><div class="cbtns">${btns}</div>${has ? '' : `<small class="mut">≈ ${Math.ceil(c.price / 200)} races of earnings</small>`}</div>`;
  }).join('');
}
$('#cars').onclick = e => {
  const b = e.target.closest('button[data-act]'); if (!b) return; const { act, id } = b.dataset;
  if (act === 'sell' && !confirm(`Sell ${CATALOG[id].name} for ${Math.floor(CATALOG[id].price * SELL)} coins?`)) return;
  send({ type: act, id });
};
function drawPodiumCars() {
  $$('#resPodium canvas.pcv').forEach(cv => {
    const c = CATALOG[cv.dataset.car] || CATALOG.starter; if (!c) return;
    const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
    Cars.side(x, cv.width / 2, cv.height - 8, 190, paintOf(c), { ...carOpts(c), time: 1 });
  });
}
let prevT = 0;
(function previewLoop(ts) { /* garage cards: realistic side-view cars on a lit turntable */
  requestAnimationFrame(previewLoop); if (view !== 'garage' || !window.Cars || ts - prevT < 33) return; prevT = ts;
  const tt = ts / 1000, list = [...$$('#cars canvas')].filter(c => { const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
  list.forEach(cv => {
    const c = CATALOG[cv.dataset.car || me.car || 'starter']; if (!c) return; const x = cv.getContext('2d'), W = cv.width, H = cv.height;
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0f1426'); bg.addColorStop(1, '#232838'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
    const sp = x.createRadialGradient(W / 2, H * .55, 5, W / 2, H * .55, W * .6); sp.addColorStop(0, c.tc + (c.tier > 4 ? '77' : '33')); sp.addColorStop(1, c.tc + '00'); x.fillStyle = sp; x.fillRect(0, 0, W, H); /* spotlight */
    x.fillStyle = '#2d3140'; x.beginPath(); x.ellipse(W / 2, H - 34, W * .44, 20, 0, 0, 7); x.fill(); x.strokeStyle = c.tc; x.globalAlpha = .5 + .3 * Math.sin(tt * 2); x.lineWidth = 2; x.stroke(); x.globalAlpha = 1; /* platform ring */
    Cars.side(x, W / 2, H - 40 + Math.sin(tt * 3) * .8, 236, paintOf(c), { ...carOpts(c), rot: tt * 2.2, time: tt, ph: (c.tier || 1) * 30 });
    for (let k = 0; k < c.tier * 2; k++) { const a = (tt * .35 + k * .37) % 1; x.globalAlpha = (1 - a) * .9; x.fillStyle = c.tc; x.fillRect(W * (.08 + .84 * ((k * .618) % 1)), H * (1 - a), 2.5 * (1 - a) + .8, 2.5 * (1 - a) + .8); } x.globalAlpha = 1; /* sparkles grow with tier */
    x.save(); x.transform(1, 0, -.4, 1, 0, 0); x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(((tt * 90 + c.tier * 40) % (W + 200)) - 100, 0, 36, H); x.restore(); /* light sweep */
    Cars.logo(x, c.logo, 30, 30, 17, c.lc || c.tc);
    x.fillStyle = c.tc; x.font = '700 12px system-ui,sans-serif'; x.fillText('★'.repeat(Math.ceil(c.tier / 2)), 54, 35);
  });
})(0);

/* ---------- boot ---------- */
HomeFX.init({ cat: () => CATALOG, me: () => me });
FX.typewriter($('#tagline'), ['Race other typists.', 'Faster, cleaner typing drives your car.', 'Type fast. Drift faster.', 'Every key is a gear shift.']);
FX.typewriter($('#heroLine'), ['Ready to drift?', 'A flawless sentence earns a BOOST.', 'Win races, earn coins, upgrade your garage.', 'Climb the ranks one keystroke at a time.'], ch => HomeFX.press(ch));
FX.typeHint($('#u'), ['Arjun_77', 'NitroZara', 'DriftKing', 'Kabir_GT', 'Tata_Fan']);
FX.carStrip($('#authCars'));
if (token) connect(); else show('auth');
