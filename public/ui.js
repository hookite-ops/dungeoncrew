// 던전 크루 — 화면, 조작, 온라인 연결
'use strict';
const DEFAULT_SERVER = 'https://dungeoncrew-394173969859.asia-northeast3.run.app';
const $ = s => document.querySelector(s);

// ---------- 온라인 ----------
const Net = {
  ws: null, open: false, onMsg: null,
  serverUrl() {
    const saved = (UI.settings.server || '').trim();
    if (saved) return saved.replace(/\/+$/, '');
    if (/^https?:$/.test(location.protocol) && !/appassets\.androidplatform\.net/.test(location.host) && location.host) return location.origin;
    return DEFAULT_SERVER;
  },
  connect() {
    return new Promise((res, rej) => {
      if (this.ws && this.open) return res();
      const url = this.serverUrl().replace(/^http/, 'ws') + '/ws';
      let ws;
      try { ws = new WebSocket(url); } catch (e) { return rej(e); }
      this.ws = ws;
      const to = setTimeout(() => { if (!this.open) { try { ws.close(); } catch (e) {} rej(new Error('timeout')); } }, 9000);
      ws.onopen = () => { clearTimeout(to); this.open = true; this.send({ t: 'hello', name: G.name, v: 1 }); res(); };
      ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (this.onMsg) this.onMsg(m); };
      ws.onclose = () => { clearTimeout(to); const was = this.open; this.open = false; this.ws = null; if (was) onNetClosed(); else rej(new Error('closed')); };
      ws.onerror = () => {};
    });
  },
  send(o) { if (this.ws && this.open) this.ws.send(JSON.stringify(o)); },
  toHost(d) { this.send({ t: 'h', d }); },
  broadcast(d) { this.send({ t: 'b', d }); },
  close() { if (this.ws) { this.open = false; try { this.ws.close(); } catch (e) {} this.ws = null; } },
};

function onServerMsg(m) {
  switch (m.t) {
    case 'joined':
      G.me = m.you; G.host = m.host === m.you; G.online = true; G.roomCode = m.code;
      if (G.host) { G.lobby = [{ id: G.me, name: G.name, hero: UI.hero }]; }
      else Net.toHost({ t: 'hero', hero: UI.hero, name: G.name });
      UI.show('lobby'); UI.renderLobby();
      break;
    case 'peer+':
      if (G.host) { if (G.mode === 'play') return; if (!G.lobby.find(p => p.id === m.id)) G.lobby.push({ id: m.id, name: m.name, hero: 0 }); hostLobbySync(); UI.toast(`${m.name}님이 들어왔어요`); }
      break;
    case 'peer-':
      if (G.host) {
        const l = G.lobby.find(p => p.id === m.id);
        G.lobby = G.lobby.filter(p => p.id !== m.id);
        const pl = G.players.get(m.id);
        if (pl) G.players.delete(m.id);
        if (l || pl) UI.toast(`${(l || pl).name}님이 나갔어요`);
        if (G.mode !== 'play') hostLobbySync();
      }
      break;
    case 'list': UI.renderRoomList(m.rooms); break;
    case 'err': UI.toast(m.msg); break;
    case 'closed': Net.close(); UI.toast('방장이 나가서 방이 닫혔어요'); toMenu(); break;
    case 'm': {
      const d = m.d;
      if (G.host) {
        if (d.t === 'hero') { const p = G.lobby.find(p => p.id === m.from); if (p) { p.hero = d.hero; if (d.name) p.name = d.name; hostLobbySync(); } }
        else hostHandle(m.from, d);
        return;
      }
      switch (d.t) {
        case 'lobby': G.lobby = d.players; UI.renderLobby(); break;
        case 'start': UI.hideAll(); G.host = false; startGame(d.seed, d.players); UI.enterGame(); break;
        case 'q': for (const ev of d.l) applyEvent(ev); break;
        case 's': applySnap(d); break;
        case 'level': applyLevel(d.seed, d.L); break;
        case 'over': UI.showOver(d.st); break;
        case 'tolobby': G.mode = 'lobby'; UI.show('lobby'); UI.renderLobby(); break;
      }
    }
  }
}
function hostLobbySync() { Net.broadcast({ t: 'lobby', players: G.lobby }); UI.renderLobby(); }
function onNetClosed() { if (G.mode === 'play' || $('#scr-lobby').classList.contains('on')) { UI.toast('서버 연결이 끊겼어요'); toMenu(); } }
function toMenu() { G.mode = 'menu'; G.online = false; G.host = true; Net.close(); UI.leaveGame(); UI.show('menu'); }

// ---------- 조작 ----------
const Input = (() => {
  const keys = {};
  let joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, fireId = null, fireDown = false, firePressed = false;
  let mouseAim = null, mouseFire = false, usingMouse = false;
  const st = { mx: 0, my: 0, fire: false, firePressed: false, aim: null };
  function joyR() { return Math.min(innerWidth, innerHeight) * 0.13; }
  function init() {
    const layer = $('#touch');
    layer.addEventListener('pointerdown', e => {
      SFX.init();
      if (e.pointerType === 'mouse') { usingMouse = true; mouseFire = true; return; }
      if (e.clientX < innerWidth * 0.48 && joy.id === null) {
        joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = 0; joy.y = 0;
        layer.setPointerCapture(e.pointerId); showJoy(true);
      }
    });
    layer.addEventListener('pointermove', e => {
      if (e.pointerType === 'mouse') { mouseAim = [e.clientX, e.clientY]; return; }
      if (e.pointerId !== joy.id) return;
      const R = joyR(); let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const l = Math.hypot(dx, dy);
      if (l > R) { joy.ox += dx - dx / l * R; joy.oy += dy - dy / l * R; dx = dx / l * R; dy = dy / l * R; }
      joy.x = dx / R; joy.y = dy / R; showJoy(true);
    });
    const end = e => { if (e.pointerType === 'mouse') { mouseFire = false; return; } if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; showJoy(false); } };
    layer.addEventListener('pointerup', end); layer.addEventListener('pointercancel', end);
    const fb = $('#btn-fire');
    fb.addEventListener('pointerdown', e => { e.preventDefault(); SFX.init(); fireId = e.pointerId; fireDown = true; firePressed = true; fb.setPointerCapture(e.pointerId); fb.classList.add('down'); });
    const fend = e => { if (e.pointerId === fireId) { fireId = null; fireDown = false; fb.classList.remove('down'); } };
    fb.addEventListener('pointerup', fend); fb.addEventListener('pointercancel', fend);
    const tap = (sel, fn) => $(sel).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); SFX.init(); fn(); });
    tap('#btn-skill', useSkill); tap('#btn-swap', swapWeapon); tap('#btn-use', interact); tap('#btn-pause', () => UI.pause(true));
    addEventListener('keydown', e => {
      keys[e.code] = true;
      if (G.mode !== 'play') return;
      if (e.code === 'Space') { useSkill(); e.preventDefault(); }
      if (e.code === 'KeyQ') swapWeapon();
      if (e.code === 'KeyE' || e.code === 'KeyF') interact();
      if (e.code === 'Escape') UI.pause(!$('#pause').classList.contains('on'));
      if (e.code === 'KeyJ' || e.code === 'KeyK') { fireDown = true; firePressed = true; }
    });
    addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'KeyJ' || e.code === 'KeyK') fireDown = false; });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; fireDown = false; mouseFire = false; });
  }
  function showJoy(on) {
    const b = $('#joy'), k = $('#joy-knob'), R = joyR();
    b.style.width = b.style.height = R * 2 + 'px';
    if (joy.id !== null) { b.style.left = joy.ox - R + 'px'; b.style.top = joy.oy - R + 'px'; }
    else { b.style.left = innerWidth * 0.15 - R + 'px'; b.style.top = innerHeight * 0.7 - R + 'px'; }
    k.style.transform = `translate(${joy.x * R}px, ${joy.y * R}px)`;
    b.classList.toggle('active', on);
  }
  return {
    init, showJoy,
    state() {
      let mx = joy.x, my = joy.y;
      if (joy.id === null) {
        mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
        my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
      }
      const l = Math.hypot(mx, my);
      if (l > 1) { mx /= l; my /= l; }
      if (l < 0.15) { mx = 0; my = 0; }
      st.mx = mx; st.my = my;
      st.fire = fireDown || mouseFire; st.firePressed = firePressed || (mouseFire && !st._mf); st._mf = mouseFire; firePressed = false;
      st.aim = null;
      if (usingMouse && mouseAim && G.mode === 'play') {
        const p = G.players.get(G.me);
        if (p) { const sc = UI.scale / UI.dpr; const px = (p.x - G.camX + VW / 2) * sc, py = (p.y - 6 - G.camY + VH / 2) * sc; st.aim = Math.atan2(mouseAim[1] - py, mouseAim[0] - px); }
      }
      return st;
    },
  };
})();

// ---------- 화면 ----------
const UI = {
  hero: 0, scale: 2, dpr: 1, settings: { autofire: false, sound: true, server: '' },
  init() {
    try { Object.assign(this.settings, JSON.parse(localStorage.getItem('dc_settings') || '{}')); } catch (e) {}
    try { G.name = localStorage.getItem('dc_name') || ('모험가' + Math.floor(Math.random() * 900 + 100)); this.hero = +(localStorage.getItem('dc_hero') || 0); } catch (e) {}
    SFX.on = this.settings.sound;
    $('#name').value = G.name;
    $('#name').addEventListener('change', () => { G.name = $('#name').value.trim().slice(0, 10) || G.name; $('#name').value = G.name; this.save(); });
    // 메뉴 장식 영웅들
    const row = $('#menu-heroes');
    HERO_SPR.forEach(s => { const c = document.createElement('canvas'); c.width = s.frames[0].width; c.height = s.frames[0].height; c.getContext('2d').drawImage(s.frames[0], 0, 0); row.appendChild(c); });
    const on = (id, fn) => $(id).addEventListener('click', () => { SFX.init(); fn(); });
    on('#b-solo', () => { G.online = false; G.host = true; G.me = 1; G.lobby = [{ id: 1, name: G.name, hero: this.hero }]; this.show('lobby'); this.renderLobby(); });
    on('#b-create', () => this.goOnline(() => Net.send({ t: 'create', pub: true })));
    on('#b-join', () => { this.show('join'); $('#code').value = ''; this.refreshList(); });
    on('#b-settings', () => { this.show('settings'); this.fillSettings(); });
    on('#b-join-go', () => { const c = $('#code').value.trim().toUpperCase(); if (c.length < 4) return this.toast('방 코드 4자리를 넣어 주세요'); this.goOnline(() => Net.send({ t: 'join', code: c })); });
    on('#b-refresh', () => this.refreshList());
    on('#b-join-back', () => { Net.close(); this.show('menu'); });
    on('#b-set-back', () => { this.readSettings(); this.show('menu'); });
    on('#b-lobby-back', () => { Net.close(); G.online = false; this.show('menu'); });
    on('#b-start', () => this.startFromLobby());
    on('#b-resume', () => this.pause(false));
    on('#b-quit', () => { this.pause(false); toMenu(); });
    on('#b-again', () => { $('#over').classList.remove('on'); if (G.online) { G.mode = 'lobby'; Net.send({ t: 'unlock' }); Net.broadcast({ t: 'tolobby' }); this.show('lobby'); this.renderLobby(); } else { G.mode = 'lobby'; this.show('lobby'); this.renderLobby(); } });
    on('#b-over-menu', () => { $('#over').classList.remove('on'); toMenu(); });
    $('#t-autofire').addEventListener('change', e => { this.settings.autofire = e.target.checked; this.save(); });
    $('#t-sound').addEventListener('change', e => { this.settings.sound = e.target.checked; SFX.on = e.target.checked; this.save(); });
    $('#code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); });
    this.buildHeroCards();
    this.show('menu');
  },
  save() { try { localStorage.setItem('dc_settings', JSON.stringify(this.settings)); localStorage.setItem('dc_name', G.name); localStorage.setItem('dc_hero', this.hero); } catch (e) {} },
  async goOnline(after) {
    this.toast('서버에 연결하는 중…');
    Net.onMsg = onServerMsg;
    try { await Net.connect(); after(); }
    catch (e) { this.toast('서버에 연결하지 못했어요. 인터넷을 확인하거나 설정에서 서버 주소를 확인해 주세요'); }
  },
  async refreshList() {
    $('#room-list').innerHTML = '<div class="dim">불러오는 중…</div>';
    Net.onMsg = onServerMsg;
    try { await Net.connect(); Net.send({ t: 'list' }); }
    catch (e) { $('#room-list').innerHTML = '<div class="dim">서버에 연결하지 못했어요</div>'; }
  },
  renderRoomList(rooms) {
    const el = $('#room-list');
    if (!rooms.length) { el.innerHTML = '<div class="dim">열린 방이 없어요. 방을 만들어 친구를 불러 보세요!</div>'; return; }
    el.innerHTML = '';
    rooms.forEach(r => {
      const b = document.createElement('button'); b.className = 'room';
      b.innerHTML = `<b>${r.code}</b><span>${esc(r.host)}님의 방</span><em>${r.n}/4</em>`;
      b.onclick = () => { SFX.init(); Net.send({ t: 'join', code: r.code }); };
      el.appendChild(b);
    });
  },
  fillSettings() { $('#t-autofire').checked = this.settings.autofire; $('#t-sound').checked = this.settings.sound; $('#server').value = this.settings.server || ''; $('#server').placeholder = DEFAULT_SERVER; },
  readSettings() { this.settings.server = $('#server').value.trim(); this.save(); },
  show(name) {
    document.querySelectorAll('.scr').forEach(s => s.classList.remove('on'));
    if (name) $('#scr-' + name).classList.add('on');
    if (name) G.mode = name === 'lobby' ? 'lobby' : 'menu';
  },
  hideAll() { document.querySelectorAll('.scr').forEach(s => s.classList.remove('on')); },
  buildHeroCards() {
    const box = $('#hero-cards'); box.innerHTML = '';
    HEROES.forEach((h, i) => {
      const c = document.createElement('button'); c.className = 'hero'; c.dataset.i = i;
      const cv = document.createElement('canvas'); const f = HERO_SPR[i].frames[0]; cv.width = f.width; cv.height = f.height; cv.getContext('2d').drawImage(f, 0, 0);
      const bar = (lbl, v, max, col) => `<div class="stat"><span>${lbl}</span><i style="--w:${v / max * 100}%;--c:${col}"></i></div>`;
      c.appendChild(cv);
      c.insertAdjacentHTML('beforeend', `<div class="hn" style="color:${h.color}">${h.name}</div><div class="ht">${h.title}</div>
        ${bar('체력', h.hp, 7, '#ff5a6a')}${bar('갑옷', h.armor, 7, '#b8c0d0')}${bar('에너지', h.energy, 260, '#5aa8ff')}
        <div class="hs">★ ${h.skill}<small>${h.skillDesc}</small></div>`);
      c.onclick = () => { SFX.init(); SFX.pick(); this.hero = i; this.save(); this.renderLobby(); if (G.online && !G.host) Net.toHost({ t: 'hero', hero: i, name: G.name }); else { const me = G.lobby.find(p => p.id === G.me); if (me) me.hero = i; if (G.online) hostLobbySync(); } };
      box.appendChild(c);
    });
  },
  renderLobby() {
    document.querySelectorAll('.hero').forEach(c => c.classList.toggle('sel', +c.dataset.i === this.hero));
    $('#lobby-code').textContent = G.online ? G.roomCode : '';
    $('#lobby-code-box').style.display = G.online ? '' : 'none';
    const pl = $('#lobby-players'); pl.innerHTML = '';
    const list = G.online ? G.lobby : [{ id: G.me, name: G.name, hero: this.hero }];
    for (let i = 0; i < (G.online ? 4 : 1); i++) {
      const p = list[i], d = document.createElement('div'); d.className = 'slot' + (p ? '' : ' empty');
      if (p) {
        const f = HERO_SPR[p.hero].frames[0], cv = document.createElement('canvas'); cv.width = f.width; cv.height = f.height; cv.getContext('2d').drawImage(f, 0, 0);
        d.appendChild(cv); d.insertAdjacentHTML('beforeend', `<span>${esc(p.name)}${p.id === G.me ? ' (나)' : ''}${i === 0 && G.online ? ' 👑' : ''}</span>`);
      } else d.innerHTML = '<span>빈 자리</span>';
      pl.appendChild(d);
    }
    const sb = $('#b-start');
    if (G.online && !G.host) { sb.disabled = true; sb.textContent = '방장이 시작하길 기다리는 중…'; }
    else { sb.disabled = false; sb.textContent = G.online ? `출발! (${G.lobby.length}명)` : '출발!'; }
  },
  startFromLobby() {
    const seed = (Math.random() * 1e9) | 0;
    if (G.online) {
      if (!G.host) return;
      const me = G.lobby.find(p => p.id === G.me); if (me) { me.hero = this.hero; me.name = G.name; }
      G.queue = []; G.rm = [];
      Net.send({ t: 'lock' });
      Net.broadcast({ t: 'start', seed, players: G.lobby });
      startGame(seed, G.lobby);
    } else startGame(seed, [{ id: 1, name: G.name, hero: this.hero }]);
    this.hideAll(); this.enterGame();
  },
  enterGame() {
    G.mode = 'play';
    $('#hud').classList.add('on'); $('#touch').classList.add('on');
    const h = HEROES[G.players.get(G.me).hero];
    $('#skill-name').textContent = h.skill;
    $('#btn-skill').style.setProperty('--c', h.color);
    Input.showJoy(false);
    ME.lastHpAr = 999;
  },
  leaveGame() { $('#hud').classList.remove('on'); $('#touch').classList.remove('on'); $('#pause').classList.remove('on'); $('#over').classList.remove('on'); },
  pause(on) {
    $('#pause').classList.toggle('on', on);
    $('#t-autofire2').checked = this.settings.autofire;
    G.paused = on && !G.online;
  },
  showOver(st) {
    G.over = true;
    $('#over-stats').innerHTML = `도달한 층 <b>${Math.floor((st.L % 9) / 3) + 1}-${(st.L % 3) + 1}${st.L >= 9 ? ` (${Math.floor(st.L / 9) + 1}회차)` : ''}</b><br>처치한 적 <b>${st.kills}</b><br>플레이 시간 <b>${Math.floor(st.time / 60)}분 ${st.time % 60}초</b>`;
    $('#b-again').style.display = (!G.online || G.host) ? '' : 'none';
    $('#over-wait').style.display = (G.online && !G.host) ? '' : 'none';
    setTimeout(() => $('#over').classList.add('on'), 900);
  },
  toast(t) {
    const el = $('#toast'); el.textContent = t; el.classList.add('on');
    clearTimeout(this._tt); this._tt = setTimeout(() => el.classList.remove('on'), 2400);
  },
  // 매 프레임 HUD
  hud() {
    const p = G.players.get(G.me); if (!p) return;
    const set = (id, v, max) => { $(id + ' i').style.width = (max ? Math.max(0, v / max) * 100 : 0) + '%'; $(id + ' b').textContent = `${Math.max(0, Math.ceil(v))}/${max}`; };
    set('#bar-hp', p.hp, p.mhp); set('#bar-ar', p.ar, p.mar); set('#bar-en', ME.energy, ME.maxEnergy);
    $('#coins').textContent = ME.coins;
    const L = G.L; $('#lvl').textContent = `${Math.floor((L % 9) / 3) + 1}-${(L % 3) + 1}`;
    // 무기
    const w = WEAPONS[ME.weapons[ME.cur]];
    if (this._w !== ME.weapons[ME.cur]) { this._w = ME.weapons[ME.cur]; drawIcon($('#fire-icon'), this._w); $('#fire-cost').textContent = w.cost ? '⚡' + w.cost : '∞'; $('#fire-name').textContent = w.name; $('#fire-name').style.color = RARITY[w.r].color; }
    const ow = ME.weapons[1 - ME.cur];
    if (this._ow !== ow) { this._ow = ow; drawIcon($('#swap-icon'), ow); $('#btn-swap').classList.toggle('none', ow < 0); }
    // 스킬
    const h = HEROES[p.hero], k = ME.skillCd / h.cd;
    $('#btn-skill').style.setProperty('--k', (k * 360) + 'deg');
    $('#btn-skill').classList.toggle('ready', k <= 0);
    // 상호작용
    const it = nearInteract(), ub = $('#btn-use');
    if (it) {
      const lbl = { wpn: '줍기', chest: '상자 열기', rchest: '상자 열기', bchest: '보물 열기', vend: `뽑기 🪙${VEND_COST}`, portal: '다음 층' }[it.k];
      if (ub.textContent !== lbl) ub.textContent = lbl;
      ub.classList.add('on');
    } else ub.classList.remove('on');
    // 동료
    const tm = $('#team'); let html = '';
    for (const q of G.players.values()) if (q.id !== G.me) html += `<div class="mate${q.down ? ' down' : ''}"><span style="color:${HEROES[q.hero].color}">${esc(q.name)}</span><i style="width:${q.hp / q.mhp * 100}%"></i></div>`;
    if (tm._h !== html) { tm.innerHTML = html; tm._h = html; }
    // 보스
    const boss = G.boss && G.enemies.get(G.boss);
    $('#boss').classList.toggle('on', !!boss);
    if (boss) { $('#boss i').style.width = Math.max(0, boss.hp / boss.mhp * 100) + '%'; $('#boss b').textContent = boss.def.name; }
    // 배너
    const bn = $('#banner');
    if (G.banner) { bn.classList.add('on'); if (bn._t !== G.banner.t) { bn._t = G.banner.t; $('#banner-t').textContent = G.banner.t; $('#banner-s').textContent = G.banner.sub; } }
    else { bn.classList.remove('on'); bn._t = null; }
    $('#down-msg').classList.toggle('on', p.down && !G.over);
    this.minimap();
  },
  minimap() {
    const c = $('#minimap'), g = c.getContext('2d'), M = G.M; if (!M) return;
    const W = c.width, H = c.height; g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(8,6,14,0.7)'; g.fillRect(0, 0, W, H);
    const me = G.players.get(G.me);
    const s = 0.9, ox = W / 2 - (me.x / TILE) * s, oy = H / 2 - (me.y / TILE) * s;
    g.fillStyle = 'rgba(200,190,230,0.5)';
    for (const co of M.corridors) if (M.rooms[co.a].seen || M.rooms[co.b].seen) g.fillRect(ox + co.x0 * s, oy + co.y0 * s, (co.x1 - co.x0 + 1) * s, (co.y1 - co.y0 + 1) * s);
    for (const r of M.rooms) {
      if (!r.seen) continue;
      g.fillStyle = r.state === 'fight' ? '#ff6a6a' : r.type === 'boss' ? '#a03a4a' : '#d8d0f0';
      g.fillRect(ox + r.x0 * s, oy + r.y0 * s, (r.x1 - r.x0 + 1) * s, (r.y1 - r.y0 + 1) * s);
      const ic = r.type === 'chest' ? '#ffd23a' : r.type === 'end' ? '#c37bff' : r.type === 'boss' ? '#ff2a4a' : null;
      if (ic) { g.fillStyle = ic; g.fillRect(ox + r.cx * s - 2, oy + r.cy * s - 2, 4, 4); }
    }
    for (const q of G.players.values()) { g.fillStyle = q.id === G.me ? '#ffe08a' : HEROES[q.hero].color; g.fillRect(ox + q.x / TILE * s - 1.5, oy + q.y / TILE * s - 1.5, 3, 3); }
  },
};
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function drawIcon(cv, wid) {
  const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
  if (wid < 0 || wid === undefined) return;
  g.imageSmoothingEnabled = false;
  const img = WSPR[wid];
  if (!img._bb) { const d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data; let x0 = 99, y0 = 99, x1 = 0, y1 = 0; for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (d[(y * img.width + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } img._bb = [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; }
  const [bx, by, bw, bh] = img._bb, s = Math.max(1, Math.floor(Math.min(cv.width / bw, cv.height / bh)));
  g.drawImage(img, bx, by, bw, bh, Math.round((cv.width - bw * s) / 2), Math.round((cv.height - bh * s) / 2), bw * s, bh * s);
}

// ---------- 시작 ----------
let cv, ctx, lc, lctx, lastT = 0;
function resize() {
  UI.dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.floor(innerWidth * UI.dpr); cv.height = Math.floor(innerHeight * UI.dpr);
  VH = 225; UI.scale = cv.height / VH; VW = Math.ceil(cv.width / UI.scale);
  lc.width = VW; lc.height = VH;
  lctx.imageSmoothingEnabled = false;
  render.vig = null;
  Input.showJoy(false);
}
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
  if (G.mode === 'play' && !G.paused) { update(dt); }
  if (G.mode === 'play') { render(ctx, lc, lctx, UI.scale); UI.hud(); }
  else menuBg(dt);
}
let menuT = 0;
function menuBg(dt) {
  menuT += dt;
  ctx.fillStyle = '#120e1c'; ctx.fillRect(0, 0, cv.width, cv.height);
  const s = UI.scale * 0.9;
  ctx.fillStyle = '#1c1630';
  for (let y = 0; y < cv.height / (16 * s) + 1; y++) for (let x = 0; x < cv.width / (16 * s) + 1; x++) if ((x + y) % 2) ctx.fillRect(x * 16 * s - (menuT * 10 * s) % (32 * s), y * 16 * s, 16 * s, 16 * s);
}
window.addEventListener('load', () => {
  cv = $('#cv'); ctx = cv.getContext('2d');
  lc = document.createElement('canvas'); lctx = lc.getContext('2d');
  buildSprites();
  UI.init(); Input.init();
  resize(); addEventListener('resize', resize);
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play' && !G.online) UI.pause(true); });
  document.addEventListener('contextmenu', e => e.preventDefault());
  $('#t-autofire2').addEventListener('change', e => { UI.settings.autofire = e.target.checked; UI.save(); });
});
