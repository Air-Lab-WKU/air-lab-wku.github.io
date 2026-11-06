/* AIR Lab site behaviour. No dependencies. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const getJSON = (url, opts) => fetch(url, Object.assign({ cache: 'no-store' }, opts)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))));
  const fmt = (n) => Number(n).toLocaleString('en-US');
  // Links that come from data files: only web, mail and in-page links are allowed,
  // so an edited JSON file can never inject a javascript: URL.
  const safeUrl = (u) => { const s = String(u || '').trim(); return /^(https?:\/\/|mailto:|#)/i.test(s) ? s : ''; };

  /* Shared state: live wind and the selected domain drive the hero canvas */
  const state = { windDir: 225, windSpeed: 8, domain: 'weather' };

  /* ---------------- nav ---------------- */
  const nav = $('#nav'), toggle = $('#navToggle');
  const onScroll = () => nav.classList.toggle('solid', window.scrollY > 40 || nav.classList.contains('open'));
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggle.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
    document.body.style.overflow = open ? 'hidden' : '';
    onScroll();
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('#navLinks a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); toggle.focus(); } });
  const navMap = new Map($$('#navLinks a[href^="#"]').map((a) => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    navMap.forEach((a) => a.classList.remove('is-active'));
    const a = navMap.get(en.target.id); if (a) a.classList.add('is-active');
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['research', 'microgrid', 'news', 'publications', 'team', 'contact'].forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
  $('#year').textContent = new Date().getFullYear();

  /* ---------------- hero domains ---------------- */
  const DOMAINS = {
    weather: { word: 'weather.', proof: 'AirCast-SR sharpens 25 km forecasts to kilometer scale, and our AI beat physics models during Hurricane Beryl.', href: '#aircast-sr', link: 'How AirCast-SR works' },
    climate: { word: 'climate.', proof: 'AirCast-S2S reaches weeks 3 to 8, and our Earth system work contributed to the IPCC Sixth Assessment Report.', href: '#aircast-s2s', link: 'See AirCast-S2S' },
    energy: { word: 'energy.', proof: 'A $2 million resilient microgrid will keep the Disaster Science Operations Center running through outages.', href: '#microgrid', link: 'Inside the microgrid' },
    commodities: { word: 'commodities.', proof: 'We forecast U.S. natural gas prices, electricity and power demand, markets that rise and fall with the weather.', href: '#areas', link: 'Our research areas' },
    disasters: { word: 'disasters.', proof: 'Flood and wildfire digital twins let responders play out a disaster before it happens.', href: '#areas', link: 'Digital twins' },
    emergency: { word: 'response.', proof: 'We build decision tools with Kentucky Emergency Management and EM1 for the people who respond.', href: '#services', link: 'What we offer partners' }
  };
  (function domains() {
    const hero = $('.hero'), bar = $('#domains'), word = $('#heroWord');
    const proof = $('#proofText'), link = $('#proofLink');
    const keys = Object.keys(DOMAINS), DUR = 5200;
    let i = 0, timer = 0, manual = false, hovering = false;
    bar.style.setProperty('--dur', DUR + 'ms');
    function show(k, animate = true) {
      const d = DOMAINS[k]; i = keys.indexOf(k); state.domain = k; hero.dataset.domain = k;
      $$('button', bar).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.d === k)));
      const swap = () => { word.textContent = d.word; word.classList.remove('out'); if (animate) { word.classList.add('in'); setTimeout(() => word.classList.remove('in'), 650); } };
      if (animate && !reduceMotion) { word.classList.add('out'); setTimeout(swap, 330); } else swap();
      proof.textContent = d.proof; link.textContent = d.link; link.setAttribute('href', d.href);
    }
    function schedule() {
      clearTimeout(timer);
      if (manual || reduceMotion) return;
      timer = setTimeout(() => { if (!hovering && !document.hidden) show(keys[(i + 1) % keys.length]); schedule(); }, DUR);
    }
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-d]'); if (!b) return;
      manual = true; bar.classList.add('paused'); clearTimeout(timer); show(b.dataset.d);
    });
    bar.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const n = (i + (e.key === 'ArrowRight' ? 1 : keys.length - 1)) % keys.length;
      manual = true; bar.classList.add('paused'); show(keys[n]); $(`button[data-d="${keys[n]}"]`, bar).focus();
    });
    bar.addEventListener('mouseenter', () => { hovering = true; bar.classList.add('paused'); });
    bar.addEventListener('mouseleave', () => { hovering = false; if (!manual) { bar.classList.remove('paused'); show(keys[i], false); schedule(); } });
    show('weather', false); schedule();
  })();

  /* ---------------- live clock (Central time) ---------------- */
  const tick = () => { $('#clock').textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT'; };
  tick(); setInterval(tick, 15000);

  /* ---------------- live weather: Open-Meteo ---------------- */
  const WMO = { 0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Freezing fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers', 85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorm', 96: 'Storm with hail', 99: 'Storm with hail' };
  const compass = (d) => ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(d / 22.5) % 16];
  function drawSpark(temps, rain) {
    const svg = $('#spark'); if (!svg || !temps.length) return;
    const W = 220, H = 56, lo = Math.min(...temps), hi = Math.max(...temps), span = Math.max(hi - lo, 4);
    const x = (k) => (k / (temps.length - 1)) * W, y = (t) => 6 + (1 - (t - lo) / span) * (H - 20);
    const pts = temps.map((t, k) => `${x(k).toFixed(1)},${y(t).toFixed(1)}`);
    const bars = rain.map((p, k) => p > 0 ? `<rect class="sp-rain" x="${(x(k) - 2.5).toFixed(1)}" y="${(H - p / 100 * 14).toFixed(1)}" width="5" height="${(p / 100 * 14).toFixed(1)}" rx="1"/>` : '').join('');
    svg.innerHTML = `<defs><linearGradient id="spGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#F5B83D" stop-opacity=".35"/><stop offset="1" stop-color="#F5B83D" stop-opacity="0"/></linearGradient></defs>
      ${bars}<path class="sp-area" d="M0,${H - 14} L${pts.join(' L')} L${W},${H - 14} Z"/><polyline class="sp-line" points="${pts.join(' ')}"/>
      <circle class="sp-now" cx="${x(0)}" cy="${y(temps[0]).toFixed(1)}" r="3"/>`;
    const maxRain = Math.max(...rain);
    $('#sparkRange').innerHTML = `${Math.round(lo)}–${Math.round(hi)}°F<br/>rain ${maxRain}%`;
  }
  function loadWeather() {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=36.9685&longitude=-86.4808' +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code' +
      '&hourly=temperature_2m,precipitation_probability&forecast_hours=24' +
      '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FChicago';
    getJSON(url).then((d) => {
      const c = d.current;
      $('#wx-temp').textContent = Math.round(c.temperature_2m);
      $('#wx-cond').textContent = WMO[c.weather_code] || 'Current conditions';
      $('#wx-feel').textContent = `${Math.round(c.apparent_temperature)}°F`;
      $('#wx-wind').textContent = `${compass(c.wind_direction_10m)} ${Math.round(c.wind_speed_10m)} mph`;
      $('#wx-rh').textContent = `${Math.round(c.relative_humidity_2m)}%`;
      $('#wx-p').textContent = `${Math.round(c.surface_pressure)} hPa`;
      $('#wx-arrow').style.transform = `rotate(${c.wind_direction_10m}deg)`; // arrow points downwind
      state.windDir = c.wind_direction_10m; state.windSpeed = c.wind_speed_10m;
      if (d.hourly) drawSpark(d.hourly.temperature_2m.filter((v) => v != null), (d.hourly.precipitation_probability || []).map((v) => v || 0));
    }).catch(() => { $('#wx-cond').textContent = 'Live data unavailable'; });
  }
  loadWeather(); setInterval(loadWeather, 10 * 60 * 1000);

  /* ---------------- live alerts: National Weather Service ---------------- */
  function loadAlerts() {
    const cell = $('#alertsCell');
    getJSON('https://api.weather.gov/alerts/active?area=KY', { headers: { Accept: 'application/geo+json' } }).then((d) => {
      const feats = (d.features || []).map((f) => f.properties).filter((p) => p && p.status === 'Actual');
      const rank = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };
      feats.sort((a, b) => (rank[a.severity] ?? 5) - (rank[b.severity] ?? 5));
      $('#al-count').textContent = feats.length;
      cell.classList.toggle('has-alerts', feats.length > 0);
      cell.classList.toggle('has-severe', feats.some((p) => p.severity === 'Extreme' || p.severity === 'Severe'));
      if (!feats.length) { $('#al-top').textContent = 'No active alerts statewide'; return; }
      const events = [...new Set(feats.map((p) => p.event))];
      $('#al-top').textContent = events.slice(0, 2).join(' · ') + (events.length > 2 ? ` +${events.length - 2} more` : '');
      $('#al-top').title = events.join(', ');
    }).catch(() => { $('#al-count').textContent = '–'; $('#al-top').textContent = 'Unavailable right now'; });
  }
  loadAlerts(); setInterval(loadAlerts, 5 * 60 * 1000);

  /* ---------------- hero canvas: live wind field + DSOC radar ---------------- */
  (function heroCanvas() {
    const cv = $('#flow'); if (!cv) return;
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, parts = [], blips = [], running = false, raf = 0, t = 0, sweep = 0;
    let R = { x: 0, y: 0, r: 0 };
    const PAL = {
      weather: (p) => `rgba(150,205,245,${p})`,
      climate: (p, x) => { const k = x / w; return `rgba(${Math.round(90 + 165 * k)},${Math.round(150 - 40 * k)},${Math.round(240 - 170 * k)},${p})`; },
      energy: (p) => `rgba(245,184,61,${p})`,
      commodities: (p) => `rgba(91,227,154,${p})`,
      disasters: (p) => `rgba(255,90,115,${p})`,
      emergency: (p) => `rgba(94,216,240,${p})`
    };
    const ACCENT = { weather: '255,77,106', climate: '255,143,92', energy: '255,255,255', commodities: '245,184,61', disasters: '255,255,255', emergency: '255,77,106' };
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0A1119'; ctx.fillRect(0, 0, w, h);
      const narrow = w < 900;
      R = narrow ? { x: w * 0.82, y: h * 0.2, r: Math.min(w, h) * 0.42 } : { x: w * 0.74, y: h * 0.42, r: Math.min(w * 0.3, h * 0.42) };
      parts = Array.from({ length: Math.min(1700, Math.round((w * h) / 1000)) }, spawn);
      blips = Array.from({ length: 14 }, () => { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R.r * 0.92; return { a, x: R.x + Math.cos(a) * d, y: R.y + Math.sin(a) * d, life: 0 }; });
      if (reduceMotion) { for (let k = 0; k < 160; k++) step(false); }
    }
    function spawn() { return { x: Math.random() * w, y: Math.random() * h, age: Math.random() * 200, life: 120 + Math.random() * 180 }; }
    function field(x, y) {
      const to = ((state.windDir + 180) % 360) * Math.PI / 180;
      const s = 0.9 + Math.min(state.windSpeed, 30) / 25;
      const a = Math.sin(x * 0.0023 + t * 0.6) * Math.cos(y * 0.0031 - t * 0.4) * 1.6 + Math.sin((x + y) * 0.0011 - t * 0.3) * 0.9;
      // gentle cyclonic curl around the radar site
      const dx = x - R.x, dy = y - R.y, d2 = dx * dx + dy * dy, curl = Math.exp(-d2 / (R.r * R.r * 0.6)) * 0.9;
      const ang = to + a * 0.9;
      return [Math.sin(ang) * s - dy / Math.sqrt(d2 + 1) * curl, -Math.cos(ang) * s + dx / Math.sqrt(d2 + 1) * curl];
    }
    function radar() {
      ctx.save();
      ctx.strokeStyle = 'rgba(200,225,245,0.05)'; ctx.lineWidth = 1;
      for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.arc(R.x, R.y, R.r * k / 4, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(R.x - R.r, R.y); ctx.lineTo(R.x + R.r, R.y); ctx.moveTo(R.x, R.y - R.r); ctx.lineTo(R.x, R.y + R.r); ctx.stroke();
      // sweep: drawn each frame, the fading trail turns it into a wedge
      const acc = ACCENT[state.domain] || '255,77,106';
      const g = ctx.createLinearGradient(R.x, R.y, R.x + Math.cos(sweep) * R.r, R.y + Math.sin(sweep) * R.r);
      g.addColorStop(0, `rgba(${acc},0)`); g.addColorStop(1, `rgba(${acc},0.55)`);
      ctx.strokeStyle = g; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(R.x, R.y); ctx.lineTo(R.x + Math.cos(sweep) * R.r, R.y + Math.sin(sweep) * R.r); ctx.stroke();
      for (const b of blips) {
        let da = (sweep - b.a) % (Math.PI * 2); if (da < 0) da += Math.PI * 2;
        if (da < 0.06) b.life = 1;
        if (b.life > 0) { ctx.fillStyle = `rgba(${acc},${(b.life * 0.9).toFixed(2)})`; ctx.beginPath(); ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2); ctx.fill(); b.life -= 0.012; }
      }
      ctx.fillStyle = `rgba(${acc},0.9)`; ctx.beginPath(); ctx.arc(R.x, R.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function step(fade) {
      if (fade) { ctx.fillStyle = 'rgba(10,17,25,0.055)'; ctx.fillRect(0, 0, w, h); }
      const pal = PAL[state.domain] || PAL.weather;
      ctx.lineWidth = 1.3;
      for (const p of parts) {
        const [vx, vy] = field(p.x, p.y);
        const nx = p.x + vx * 1.6, ny = p.y + vy * 1.6;
        ctx.strokeStyle = p.life > 282 ? 'rgba(255,255,255,0.75)' : pal(0.28 + Math.min(Math.hypot(vx, vy), 2) * 0.12, p.x);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny; p.age++;
        if (p.age > p.life || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) Object.assign(p, spawn(), { age: 0 });
      }
      radar();
      t += 0.0025; sweep += 0.022;
    }
    function loop() { step(true); raf = requestAnimationFrame(loop); }
    const start = () => { if (!running && !reduceMotion) { running = true; loop(); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    resize();
    let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(resize, 150); });
    new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop())).observe(cv);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  })();

  /* ---------------- count-up stats ---------------- */
  function countUp(el) {
    const target = +el.dataset.count, suffix = el.dataset.suffix || '';
    if (!target || reduceMotion) { el.textContent = fmt(target) + suffix; return; }
    const t0 = performance.now(), D = 1400;
    const f = (now) => { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(target * e)) + suffix; if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  const statsIO = new IntersectionObserver((ens) => ens.forEach((en) => { if (en.isIntersecting) { statsIO.unobserve(en.target); countUp(en.target); } }), { threshold: 0.6 });
  $$('[data-count]').forEach((el) => statsIO.observe(el));

  /* ---------------- AirCast-SR compare ---------------- */
  (function srDemo() {
    const cv = $('#srCanvas'); if (!cv) return;
    const stage = cv.parentElement, ctx = cv.getContext('2d');
    const range = $('#srRange'), divider = $('#srDivider');
    const FW = 240, FH = 180, BLOCK = 20;
    const fine = document.createElement('canvas'); fine.width = FW; fine.height = FH;
    const coarse = document.createElement('canvas'); coarse.width = FW / BLOCK; coarse.height = FH / BLOCK;
    const stops = [[0, [10, 17, 25]], [.18, [18, 53, 74]], [.32, [30, 127, 110]], [.46, [77, 186, 90]], [.6, [232, 212, 77]], [.74, [242, 154, 58]], [.87, [224, 65, 47]], [1, [177, 11, 44]]];
    const cmap = (v) => {
      v = Math.max(0, Math.min(1, v));
      for (let k = 1; k < stops.length; k++) if (v <= stops[k][0]) { const [a, ca] = stops[k - 1], [b, cb] = stops[k], q = (v - a) / (b - a); return ca.map((c, j) => Math.round(c + (cb[j] - c) * q)); }
      return stops[stops.length - 1][1];
    };
    let pos = 0.5, dragging = false;
    function generate() {
      const G = 64, grid = new Float32Array(G * G).map(() => Math.random());
      const sm = (q) => q * q * (3 - 2 * q);
      const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi); const g = (i, j) => grid[((j & (G - 1)) * G) + (i & (G - 1))]; const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1); return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
      const fbm = (x, y) => { let v = 0, amp = 0.5, f = 1; for (let o = 0; o < 5; o++) { v += amp * vnoise(x * f, y * f); f *= 2.03; amp *= 0.5; } return v; };
      const cells = Array.from({ length: 7 }, () => ({ x: Math.random() * FW, y: Math.random() * FH, r: 8 + Math.random() * 18, a: 0.25 + Math.random() * 0.45 }));
      const ang = Math.random() * Math.PI, ca = Math.cos(ang), sa = Math.sin(ang), off = (Math.random() - 0.5) * 70;
      const vals = new Float32Array(FW * FH);
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
        const dx = x - FW / 2, dy = y - FH / 2, warp = (fbm(x / 40 + 7, y / 40) - 0.5) * 40;
        const across = dx * ca + dy * sa - off + warp;
        let v = Math.exp(-(across * across) / 260) * 0.75;
        for (const c of cells) { const ex = x - c.x, ey = y - c.y; v += c.a * Math.exp(-(ex * ex + ey * ey) / (c.r * c.r)); }
        const n = fbm(x / 22, y / 22);
        vals[y * FW + x] = v * (0.35 + 1.1 * n) + (n - 0.5) * 0.25;
      }
      const fimg = fine.getContext('2d').createImageData(FW, FH);
      vals.forEach((v, k) => { const [r, g, b] = cmap(v); fimg.data.set([r, g, b, 255], k * 4); });
      fine.getContext('2d').putImageData(fimg, 0, 0);
      const CW = coarse.width, CH = coarse.height, cimg = coarse.getContext('2d').createImageData(CW, CH);
      for (let by = 0; by < CH; by++) for (let bx = 0; bx < CW; bx++) {
        let s = 0; for (let y = 0; y < BLOCK; y++) for (let x = 0; x < BLOCK; x++) s += vals[(by * BLOCK + y) * FW + bx * BLOCK + x];
        const [r, g, b] = cmap(s / (BLOCK * BLOCK)); cimg.data.set([r, g, b, 255], (by * CW + bx) * 4);
      }
      coarse.getContext('2d').putImageData(cimg, 0, 0);
      draw();
    }
    function draw() {
      const W = cv.width, H = cv.height, sx = Math.round(W * pos);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(fine, 0, 0, W, H);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, sx, H); ctx.clip();
      ctx.imageSmoothingEnabled = false; ctx.drawImage(coarse, 0, 0, W, H);
      ctx.strokeStyle = 'rgba(10,17,25,.35)'; ctx.lineWidth = 1;
      const cw = W / coarse.width, ch = H / coarse.height;
      for (let x = cw; x < sx; x += cw) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); }
      for (let y = ch; y < H; y += ch) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(sx, y + .5); ctx.stroke(); }
      ctx.restore();
      divider.style.left = (pos * 100) + '%';
    }
    const setPos = (p) => { pos = Math.max(0.02, Math.min(0.98, p)); range.value = Math.round(pos * 100); draw(); };
    range.addEventListener('input', () => setPos(range.value / 100));
    const fromEvent = (e) => { const r = stage.getBoundingClientRect(); setPos((e.clientX - r.left) / r.width); };
    stage.addEventListener('pointerdown', (e) => { dragging = true; stage.setPointerCapture(e.pointerId); fromEvent(e); });
    stage.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
    stage.addEventListener('pointerup', () => { dragging = false; });
    stage.addEventListener('pointercancel', () => { dragging = false; });
    $('#srShuffle').addEventListener('click', generate);
    generate();
    if (!reduceMotion) {
      const io = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return; io.disconnect();
        const t0 = performance.now();
        const anim = (now) => { const k = Math.min(1, (now - t0) / 1600), e = 1 - Math.pow(1 - k, 4); if (!dragging) setPos(0.92 - 0.42 * e); if (k < 1) requestAnimationFrame(anim); };
        requestAnimationFrame(anim);
      }, { threshold: 0.5 });
      io.observe(stage);
    }
  })();

  /* ---------------- AirCast-S2S: coupled autoregressive rollout ----------------
     Three lanes (atmosphere, land, ocean) drawn as Hovmoller-style bands, x = forecast day,
     y = a latitude-like coordinate. The playhead advances one day per step, with coupling
     arrows exchanging information between components. Schematic only. */
  (function s2s() {
    const cv = $('#s2sCanvas'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const range = $('#s2sRange'), playBtn = $('#s2sPlay'), errSvg = $('#s2sErr');
    const DAYS = 42, ROWS = 14, GAP = 10;
    let day = 1, playing = !reduceMotion, mode = 'roll', timer = 0, hold = 0, visible = false, pulse = 0;
    const noise = Array.from({ length: 3 * DAYS * ROWS }, () => Math.random() * 2 - 1);
    const errNext = (d) => 0.08 + 0.95 * (1 - Math.exp(-d / 10)) + 0.006 * d;
    const errRoll = (d) => 0.08 + 0.66 * (1 - Math.exp(-d / 12));
    const CLIM = 0.8;

    function value(lane, d, r) {
      const ocean = 0.8 * Math.sin(2 * Math.PI * d / 70 + r * 0.22 + 0.6);
      const land = 0.7 * Math.sin(2 * Math.PI * d / 24 + r * 0.38 + 1.4) + 0.15 * ocean;
      let v;
      if (lane === 0) v = 0.55 * Math.sin(2 * Math.PI * d / 5.5 - r * 0.75) + 0.25 * Math.sin(d / 2.1 + r * 1.7) + 0.25 * land + 0.2 * ocean;
      else if (lane === 1) v = land;
      else v = ocean;
      // forecast error: what the training strategy has to hold back
      const e = (mode === 'next' ? errNext(d) : errRoll(d)) - 0.08;
      const share = lane === 0 ? 1 : lane === 1 ? 0.55 : 0.25;
      const n = noise[(lane * DAYS + (d - 1)) * ROWS + r];
      const k = mode === 'next' ? 1.35 : 0.55;
      v = v * (1 - Math.min(0.9, e * share * k * 0.8)) + n * e * share * k;
      return Math.max(-1, Math.min(1, v));
    }
    function color(v, a) {
      // diverging: cool blue for negative anomalies, warm red-orange for positive
      const t = Math.abs(v);
      const c = v < 0 ? [62, 143, 216] : [242, 110, 58];
      return `rgba(${c[0]},${c[1]},${c[2]},${(0.12 + 0.88 * t) * a})`;
    }
    function size() {
      const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    }
    let dims = size();
    function draw() {
      const { w, h } = dims, laneH = (h - GAP * 2) / 3, colW = w / DAYS, rowH = laneH / ROWS;
      ctx.clearRect(0, 0, w, h);
      for (let L = 0; L < 3; L++) {
        const y0 = L * (laneH + GAP);
        ctx.fillStyle = '#0E1823'; ctx.fillRect(0, y0, w, laneH);
        for (let d = 1; d <= DAYS; d++) {
          const a = d <= day ? 1 : 0.13;
          for (let r = 0; r < ROWS; r++) {
            ctx.fillStyle = color(value(L, d, r), a);
            ctx.fillRect((d - 1) * colW, y0 + r * rowH, Math.ceil(colW), Math.ceil(rowH));
          }
        }
        // week separators
        ctx.strokeStyle = 'rgba(10,17,25,.55)'; ctx.lineWidth = 1;
        for (let wk = 1; wk < 6; wk++) { const x = Math.round(wk * 7 * colW) + .5; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + laneH); ctx.stroke(); }
      }
      // playhead column and coupling exchange
      const x = (day - 0.5) * colW;
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.5;
      for (let L = 0; L < 3; L++) { const y0 = L * (laneH + GAP); ctx.strokeRect((day - 1) * colW + .75, y0 + .75, colW - 1.5, laneH - 1.5); }
      const glow = 0.55 + 0.45 * Math.sin(pulse);
      ctx.fillStyle = `rgba(255,255,255,${glow})`;
      for (let g = 0; g < 2; g++) {
        const yc = (g + 1) * laneH + g * GAP + GAP / 2;
        ctx.beginPath(); ctx.moveTo(x - 5, yc - 1); ctx.lineTo(x, yc - 5); ctx.lineTo(x + 5, yc - 1); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 5, yc + 1); ctx.lineTo(x, yc + 5); ctx.lineTo(x + 5, yc + 1); ctx.fill();
      }
    }
    function drawErr() {
      const W = 840, H = 150, X = (d) => ((d - 1) / (DAYS - 1)) * W, Y = (e) => H - 10 - e * 118;
      const path = (f) => Array.from({ length: DAYS }, (_, k) => `${k ? 'L' : 'M'}${X(k + 1).toFixed(1)},${Y(f(k + 1)).toFixed(1)}`).join(' ');
      const grid = [1, 2, 3, 4, 5].map((wk) => `<line class="e-grid" x1="${X(wk * 7 + 1)}" x2="${X(wk * 7 + 1)}" y1="0" y2="${H}"/>`).join('');
      const f = mode === 'next' ? errNext : errRoll;
      errSvg.innerHTML = `${grid}<line class="e-grid" x1="0" x2="${W}" y1="${H - 10}" y2="${H - 10}"/>
        <line class="e-clim" x1="0" x2="${W}" y1="${Y(CLIM)}" y2="${Y(CLIM)}"/>
        <path class="e-next${mode === 'roll' ? ' e-dim' : ''}" d="${path(errNext)}"/>
        <path class="e-roll${mode === 'next' ? ' e-dim' : ''}" d="${path(errRoll)}"/>
        <line class="e-cursor" x1="${X(day)}" x2="${X(day)}" y1="0" y2="${H - 10}"/>
        <circle class="e-dot" cx="${X(day)}" cy="${Y(f(day))}" r="4"/>`;
    }
    function readout() {
      $('#s2sDay').textContent = day <= 7 ? `Day ${day}` : `Day ${day} · week ${Math.ceil(day / 7)}`;
      const z = $('#s2sZone'), sub = day > 14;
      z.textContent = sub ? 'Subseasonal range' : 'Medium-range weather';
      z.classList.toggle('is-s2s', sub);
      range.value = day;
    }
    function render() { draw(); drawErr(); readout(); }
    function setPlaying(p) {
      playing = p; playBtn.setAttribute('aria-pressed', String(p));
      playBtn.querySelector('use').setAttribute('href', p ? '#i-pause' : '#i-play');
      playBtn.querySelector('span').textContent = p ? 'Pause rollout' : 'Play rollout';
    }
    playBtn.addEventListener('click', () => { if (!playing && day >= DAYS) day = 1; setPlaying(!playing); render(); });
    range.addEventListener('input', () => { setPlaying(false); day = +range.value; render(); });
    $$('.s2s-modes button').forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.mode; $$('.s2s-modes button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render();
    }));
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.2 }).observe(cv);
    let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { dims = size(); render(); }, 150); });
    let last = 0;
    const loop = (now) => {
      const dt = Math.min(100, now - (last || now)); last = now;
      if (visible && !document.hidden) {
        pulse += dt * 0.008;
        if (playing) {
          timer += dt;
          if (day >= DAYS) { hold += dt; if (hold > 1800) { hold = 0; day = 1; timer = 0; render(); } }
          else if (timer > 260) { timer = 0; day++; render(); }
          else draw();
        }
      }
      requestAnimationFrame(loop);
    };
    if (reduceMotion) { day = DAYS; setPlaying(false); }
    render();
    if (!reduceMotion) requestAnimationFrame(loop);
  })();

  /* ---------------- partner logos (optional files) ---------------- */
  $$('.partner-grid li').forEach((li) => {
    const slot = $('.p-logo', li), name = $('.p-name', li).textContent;
    const mono = () => { slot.classList.remove('has-img'); slot.textContent = li.dataset.mono || name.slice(0, 3); };
    if (li.dataset.logo) {
      const img = new Image(); img.alt = name + ' logo'; img.loading = 'lazy'; img.onerror = mono; img.src = li.dataset.logo;
      slot.classList.add('has-img'); slot.appendChild(img);
    } else mono();
  });

  /* ---------------- microgrid outage simulation ---------------- */
  (function microgrid() {
    const fig = $('#mgDiagram'), btn = $('#mgToggle'); if (!fig) return;
    const soc = $('#soc'), status = $('#mgStatus span'), dsoc = $('#dsocState'), label = btn.querySelector('span');
    let timer = 0, level = 50;
    btn.addEventListener('click', () => {
      const out = fig.dataset.state !== 'outage';
      fig.dataset.state = out ? 'outage' : 'normal';
      btn.setAttribute('aria-pressed', String(out));
      label.textContent = out ? 'Restore grid power' : 'Simulate an outage';
      status.textContent = out ? 'Islanded: solar, battery and generators' : 'Grid connected';
      dsoc.textContent = out ? 'online · on-site power' : 'online';
      clearInterval(timer);
      timer = setInterval(() => {
        level = out ? Math.max(14, level - 1.5) : Math.min(50, level + 2.5);
        soc.setAttribute('width', level);
        if ((out && level <= 14) || (!out && level >= 50)) clearInterval(timer);
      }, 220);
    });
  })();

  /* ---------------- auto-scrolling lists (news, publications) ----------------
     Slowly scrolls, loops to the top, pauses on hover, focus or touch, and has a
     pause button (WCAG 2.2.2). Reduced-motion visitors get the full list instead. */
  function autoScroll(vp, btn) {
    if (!vp) return { reset() {} };
    let hovering = false, paused = reduceMotion, last = 0, acc = 0, hold = 0;
    const sync = () => {
      if (!btn) return;
      btn.setAttribute('aria-pressed', String(paused));
      btn.setAttribute('aria-label', paused ? 'Resume scrolling' : 'Pause scrolling');
      btn.querySelector('use').setAttribute('href', paused ? '#i-play' : '#i-pause');
    };
    const atEnd = () => vp.scrollTop + vp.clientHeight >= vp.scrollHeight - 2;
    ['mouseenter', 'focusin', 'touchstart'].forEach((ev) => vp.addEventListener(ev, () => { hovering = true; }, { passive: true }));
    ['mouseleave', 'focusout'].forEach((ev) => vp.addEventListener(ev, () => { hovering = false; }));
    vp.addEventListener('touchend', () => setTimeout(() => { hovering = false; }, 2500), { passive: true });
    vp.addEventListener('scroll', () => vp.classList.toggle('at-end', atEnd()), { passive: true });
    if (btn) btn.addEventListener('click', () => { paused = !paused; sync(); });
    sync();
    let visible = false;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(vp);
    const frame = (now) => {
      const dt = Math.min(64, now - (last || now)); last = now;
      if (visible && !hovering && !paused && !document.hidden && vp.scrollHeight > vp.clientHeight + 4) {
        if (hold > 0) hold -= dt;
        else if (atEnd()) { hold = 2200; setTimeout(() => vp.scrollTo({ top: 0, behavior: 'smooth' }), 1800); }
        else { acc += dt * 0.028; if (acc >= 1) { const px = Math.floor(acc); vp.scrollTop += px; acc -= px; } }
      }
      requestAnimationFrame(frame);
    };
    if (!reduceMotion) requestAnimationFrame(frame);
    return { reset() { vp.scrollTop = 0; hold = 1200; } };
  }

  /* ---------------- Scholar stats ---------------- */
  getJSON('data/scholar-stats.json').then((s) => {
    const set = (id, v) => { const el = document.getElementById(id); if (el && typeof v === 'number') { el.dataset.count = v; el.textContent = fmt(v); } };
    set('stat-cites', s.citedby); set('stat-h', s.hindex); set('stat-pubs', s.num_publications);
    if (s.citedby && s.num_publications) $('#pubSummary').textContent = `The newest work from ${fmt(s.num_publications)} publications and ${fmt(s.citedby)} citations, refreshed automatically from Google Scholar.`;
    if (s.last_updated) $('#pubUpdated').textContent = 'Auto-updated from Google Scholar · last refresh ' + new Date(s.last_updated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }).catch(() => {});

  /* ---------------- Publications ---------------- */
  (function pubs() {
    const list = $('#pubList'), search = $('#pubSearch'), empty = $('#pubEmpty');
    const scroller = autoScroll($('#pubViewport'), $('#pubPause'));
    let entries = [];
    const hl = (text, q) => { const safe = esc(text); if (!q) return safe; const re = new RegExp('(' + esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'); return safe.replace(re, '<mark>$1</mark>'); };
    const render = () => {
      const q = search.value.trim();
      const shown = entries.filter((p) => !q || (p.title + ' ' + p.citation).toLowerCase().includes(q.toLowerCase()));
      empty.hidden = shown.length > 0;
      list.innerHTML = shown.map((p) => {
        const href = safeUrl(p.url) || `https://scholar.google.com/scholar?q=${encodeURIComponent('"' + p.title + '"')}`;
        const badge = p.badge && p.badge !== 'Journal' ? `<span class="pub-badge">${esc(p.badge)}</span>` : '';
        const n = p.num_citations ?? 0;
        return `<li class="pub">
          <span class="pub-year mono">${esc(p.year)}</span>
          <div><h3><a href="${esc(href)}" target="_blank" rel="noopener">${hl(p.title, q)}</a>${badge}</h3><p>${hl(p.citation, q)}</p></div>
          <span class="pub-cites mono"><b>${esc(n)}</b>${n === 1 ? 'citation' : 'citations'}</span>
        </li>`;
      }).join('');
      scroller.reset();
    };
    getJSON('data/publications.json').then((d) => { entries = Array.isArray(d.entries) ? d.entries : []; if (entries.length) render(); }).catch(() => {});
    search.addEventListener('input', render);
  })();

  /* ---------------- News ---------------- */
  (function news() {
    const list = $('#newsList'), filters = $('#newsFilters');
    const scroller = autoScroll($('#newsViewport'), $('#newsPause'));
    let items = [], tag = 'All';
    const recent = (iso) => { const d = new Date(iso); return !isNaN(d) && (Date.now() - d.getTime()) / 864e5 <= 21; };
    const linksOf = (it) => (Array.isArray(it.links) && it.links.length ? it.links : it.link ? [{ url: it.link, label: it.link_label || 'Read more' }] : [])
      .map((l) => ({ url: safeUrl(l && l.url), label: String((l && l.label) || 'Read more') })).filter((l) => l.url);
    function render() {
      list.innerHTML = items.filter((it) => tag === 'All' || it.tag === tag).map((it) => `
        <li class="news-item${recent(it.date) ? ' is-new' : ''}">
          <time datetime="${esc(it.date)}">${esc(it.display_date || it.date)}</time>
          <div>
            <span class="tag${it.tag === 'Grant' ? ' tag-grant' : ''}">${esc(it.tag || 'News')}</span>
            <h3>${esc(it.title)}</h3>
            <p>${esc(it.desc)}</p>
            ${linksOf(it).length ? `<div class="news-links">${linksOf(it).map((l) => {
              const ext = /^https?:\/\//.test(l.url);
              return `<a class="link" href="${esc(l.url)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label.replace(/\s*→\s*$/, ''))}${ext ? ' <svg class="ic"><use href="#i-ext"/></svg>' : ''}</a>`;
            }).join('')}</div>` : ''}
          </div>
        </li>`).join('');
      scroller.reset();
    }
    getJSON('data/news.json').then((d) => {
      items = (d.entries || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
      const tags = ['All', ...new Set(items.map((i) => i.tag).filter(Boolean))];
      filters.innerHTML = tags.map((t) => `<button type="button" class="chip" aria-pressed="${t === 'All'}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
      filters.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-tag]'); if (!b) return;
        tag = b.dataset.tag; $$('button', filters).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render();
      });
      render();
    }).catch(() => {});
  })();

  /* ---------------- Contact: compose an email ---------------- */
  (function contact() {
    const form = $('#contactForm'), err = $('#formError'); if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = form.elements, bad = [];
      [f.name, f.email, f.message].forEach((el) => el.removeAttribute('aria-invalid'));
      if (!f.name.value.trim()) bad.push([f.name, 'your name']);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) bad.push([f.email, 'an email address we can reply to']);
      if (!f.message.value.trim()) bad.push([f.message, 'a message']);
      if (bad.length) { bad.forEach(([el]) => el.setAttribute('aria-invalid', 'true')); const parts = bad.map((b) => b[1]); err.textContent = 'Add ' + (parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0]) + ' before opening your email.'; err.hidden = false; bad[0][0].focus(); return; }
      err.hidden = true;
      const subject = `[AIR Lab] ${f.topic.value} · ${f.name.value.trim()}`;
      const body = `${f.message.value.trim()}\n\n${f.name.value.trim()}\n${f.email.value.trim()}`;
      window.location.href = `mailto:manmeet.singh@wku.edu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  })();
})();
