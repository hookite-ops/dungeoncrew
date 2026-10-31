// 던전 크루 — 게임 본체 (호스트 시뮬레이션 + 화면)
'use strict';

const ENEMY_KEYS = Object.keys(ENEMIES);
const G = {
  mode: 'menu', host: true, online: false, me: 1, name: '모험가',
  M: null, floor: null, L: 0, seed: 0,
  players: new Map(), enemies: new Map(), eb: [], pb: [], items: new Map(), fx: [], nums: [], turrets: [], pend: [],
  time: 0, eid: 1, bid: 1, iid: 1, queue: [], rm: [],
  camX: 0, camY: 0, shake: 0, flash: 0, banner: null, stats: { kills: 0, start: 0 },
  lobby: [], netAcc: 0, snapAcc: 0, posAcc: 0, over: false,
};
// 내 캐릭터의 로컬 상태 (에너지·무기·코인은 각자 관리)
const ME = { weapons: [0, -1], cur: 0, energy: 0, maxEnergy: 0, coins: 0, fireCd: 0, skillCd: 0, rapid: 0, dash: 0, dvx: 0, dvy: 0, lastHpAr: 0, aim: 0, autoTarget: null };

const getW = id => id === 99 ? TURRET_GUN : WEAPONS[id];

// ---------- 스프라이트 준비 ----------
let HERO_SPR, ENEMY_SPR = {}, WSPR = [], ISPR = {}, GLOW = {};
function buildSprites() {
  HERO_SPR = HEROES.map(buildHeroSprites);
  for (const k of ENEMY_KEYS) { const a = ENEMY_ART[k]; const img = makeSprite(a.rows, a.pal); ENEMY_SPR[k] = { img, white: whiteOf(img), scale: ENEMIES[k].boss !== undefined ? 2 : 1 }; }
  WSPR = WEAPONS.map(drawWeaponSprite);
  ISPR.chest = makeSprite(['.KKKKKKKKKK.', 'KBBBBBBBBBBK', 'KBLBBBBBBLBK', 'KYYYYGGYYYYK', 'KBBBBGGBBBBK', 'KBBBBBBBBBBK', 'KBLBBBBBBLBK', '.KKKKKKKKKK.'],
    { K: '#3a2416', B: '#9a6234', L: '#c48a4a', Y: '#d9b04a', G: '#ffe08a' });
  ISPR.bchest = makeSprite(['.KKKKKKKKKKKK.', 'KYYYYYYYYYYYYK', 'KYWYYYYYYYYWYK', 'KRRRRRGGRRRRRK', 'KYYYYYGGYYYYYK', 'KYYYYYYYYYYYYK', 'KYWYYYYYYYYWYK', 'KYYYYYYYYYYYYK', '.KKKKKKKKKKKK.'],
    { K: '#5a3a10', Y: '#ffcc33', W: '#fff4c0', R: '#d94a3a', G: '#ffffff' });
  ISPR.rchest = makeSprite(['.KKKKKKKK.', 'KBBBBBBBBK', 'KYYYGGYYYK', 'KBBBGGBBBK', 'KBBBBBBBBK', '.KKKKKKKK.'], { K: '#2a2a3a', B: '#5a7aa0', Y: '#9ab4d4', G: '#ffe08a' });
  ISPR.vend = makeSprite(['KKKKKKKKKKKK', 'KRRRRRRRRRRK', 'KRYYYYYYYYRK', 'KRYCCYYPPYRK', 'KRYCCYYPPYRK', 'KRYYYYYYYYRK', 'KRYGGYYBBYRK', 'KRYGGYYBBYRK', 'KRYYYYYYYYRK', 'KRRRRRRRRRRK', 'KRRDDDDDDRRK', 'KRRDDDDDDRRK', 'KRRRRRRRRRRK', 'KKKKKKKKKKKK'],
    { K: '#1a1420', R: '#c43a5a', Y: '#2a2438', C: '#6fdc6a', P: '#ffa63a', G: '#5aa8ff', B: '#c37bff', D: '#0a0810' });
  ISPR.hp = makeSprite(['..KK..', '..WW..', '.WRRW.', 'WRRRRW', 'WRSRRW', '.WWWW.'], { K: '#7a4a2a', W: '#e8e8f0', R: '#ff3a5a', S: '#ffb0c0' });
  ISPR.mp = makeSprite(['..KK..', '..WW..', '.WBBW.', 'WBBBBW', 'WBSBBW', '.WWWW.'], { K: '#7a4a2a', W: '#e8e8f0', B: '#3a8aff', S: '#b0d8ff' });
  ISPR.crate = makeSprite(['KKKKKKKKKKKKKK', 'KLLLLLLLLLLLLK', 'KBDBBBBBBBBDBK', 'KBBDBBBBBBDBBK', 'KBBBDBBBBDBBBK', 'KLLLLDLLDLLLLK', 'KBBBBBDDBBBBBK', 'KBBBBBDDBBBBBK', 'KLLLLDLLDLLLLK', 'KBBBDBBBBDBBBK', 'KBBDBBBBBBDBBK', 'KBDBBBBBBBBDBK', 'KLLLLLLLLLLLLK', 'KKKKKKKKKKKKKK'],
    { K: '#3a2416', L: '#c48a4a', B: '#9a6234', D: '#6a4224' }, null);
  ISPR.barrel = makeSprite(['..KKKKKKKK..', '.KRRRRRRRRK.', 'KRRWRRRRRRRK', 'KMMMMMMMMMMK', 'KRRRYYYYRRRK', 'KRRRYKKYRRRK', 'KRRRYYYYRRRK', 'KMMMMMMMMMMK', 'KRRRRRRRRRRK', '.KRRRRRRRRK.', '..KKKKKKKK..'],
    { K: '#2a1010', R: '#c43a2a', W: '#ff9a8a', M: '#5a5a6a', Y: '#ffd23a' }, null);
}
function glowSprite(col, r) {
  const k = col + r; if (GLOW[k]) return GLOW[k];
  const c = document.createElement('canvas'); c.width = c.height = r * 2;
  const g = c.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 0.55; g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
  return GLOW[k] = c;
}

// ---------- 게임 시작 / 층 ----------
function startGame(seed, playersList) {
  G.players.clear();
  playersList.forEach(pl => {
    const h = HEROES[pl.hero];
    G.players.set(pl.id, { id: pl.id, name: pl.name, hero: pl.hero, x: 0, y: 0, tx: 0, ty: 0, a: 0, hp: h.hp, mhp: h.hp, ar: h.armor, mar: h.armor,
      down: false, inv: 0, shield: 0, lastHit: -9, armorT: 0, rev: 0, w: 0, moving: false, anim: 0, face: 1, dashFx: 0 });
  });
  const mh = HEROES[G.players.get(G.me).hero];
  Object.assign(ME, { weapons: [0, -1], cur: 0, energy: mh.energy, maxEnergy: mh.energy, coins: 0, fireCd: 0, skillCd: 0, rapid: 0, dash: 0 });
  G.stats = { kills: 0, start: performance.now() };
  G.over = false;
  applyLevel(seed, 0);
  G.mode = 'play';
}
function applyLevel(seed, L) {
  G.seed = seed; G.L = L;
  G.M = genLevel(seed, L);
  G.floor = renderFloor(G.M);
  G.enemies.clear(); G.eb.length = 0; G.pb.length = 0; G.items.clear(); G.fx.length = 0; G.nums.length = 0; G.turrets.length = 0; G.pend.length = 0;
  const s = G.M.start;
  let k = 0;
  for (const p of G.players.values()) {
    p.x = p.tx = (s.cx + 0.5) * TILE + (k % 2 ? 14 : -14) * (k > 0 ? 1 : 0);
    p.y = p.ty = (s.cy + 0.5) * TILE + (k >= 2 ? 14 : 0);
    if (G.host) { if (p.down) { p.down = false; p.hp = 2; } p.ar = p.mar; p.inv = 1.5; }
    k++;
  }
  const me = G.players.get(G.me);
  G.camX = me.x; G.camY = me.y;
  const loop = Math.floor(L / 9);
  const sub = (L % 3) + 1, stage = Math.floor((L % 9) / 3) + 1;
  showBanner(`${stage}-${sub}  ${G.M.biome.name}`, loop > 0 ? `${loop + 1}회차 — 적이 더 강해졌어요` : (G.M.isBoss ? '이 층 끝에 보스가 기다려요' : ''));
  if (G.host) {
    addItem('vend', (s.x0 + 2) * TILE, (s.y0 + 1.2) * TILE);
    const cr = G.M.rooms.find(r => r.type === 'chest');
    if (cr) addItem('chest', (cr.cx + 0.5) * TILE, (cr.cy + 0.5) * TILE);
    const er = G.M.rooms.find(r => r.type === 'end');
    if (er) addItem('portal', (er.cx + 0.5) * TILE, (er.cy + 0.5) * TILE);
  }
  SFX.portal();
}
function showBanner(t, sub) { G.banner = { t, sub: sub || '', time: 3 }; }

// ---------- 호스트: 이벤트 큐 ----------
function emit(ev) { if (G.online) G.queue.push(ev); }
function toPlayer(id, ev) { ev.id = id; if (id === G.me) applyEvent(ev); else emit(ev); }

function addItem(k, x, y, extra) {
  const it = Object.assign({ i: G.iid++, k, x, y }, extra || {});
  G.items.set(it.i, it);
  emit({ k: 'ia', it });
  return it;
}
function delItem(i) { if (G.items.delete(i)) emit({ k: 'id', i }); }
function randWeapon() {
  const L = G.L, wts = [0, 40, 34 + L * 2, 16 + L * 2.5, 3 + L * 1.2];
  let tot = 0; for (const w of wts) tot += w;
  let r = Math.random() * tot, rar = 1;
  for (let i = 0; i < 5; i++) { if (r < wts[i]) { rar = i; break; } r -= wts[i]; }
  const pool = WEAPONS.filter(w => w.r === rar && w.id !== 0);
  return pick(pool.length ? pool : WEAPONS.slice(1)).id;
}

// ---------- 총알 ----------
function spawnShot(owner, w, x, y, a, s, auth) {
  const r = mulberry32(s);
  if (w.melee) {
    G.fx.push({ k: 'slash', x, y, a, r: w.melee.range, arc: w.melee.arc, col: w.col, t: 0, d: 0.18 });
    if (auth) meleeHit(owner, w, x, y, a);
    if (w.melee.wave) pushBullet(owner, { dmg: Math.ceil(w.dmg * 0.6), spd: 230, col: w.col, life: 0.6, pierce: 99, kind: 'wave' }, x, y, a, auth, 1);
    return;
  }
  const sp = (w.spread || 0) * Math.PI / 180;
  for (let i = 0; i < w.n; i++) {
    let ang = a + (w.n > 1 ? (i / (w.n - 1) - 0.5) * sp + (r() - 0.5) * sp * 0.2 : (r() - 0.5) * sp);
    const spd = w.n > 1 ? w.spd * (0.9 + r() * 0.2) : w.spd;
    const lifeMul = w.n > 1 ? 0.85 + r() * 0.3 : 1;
    pushBullet(owner, w, x, y, ang, auth, lifeMul, spd);
  }
}
function pushBullet(owner, w, x, y, ang, auth, lifeMul, spd) {
  spd = spd || w.spd;
  let kind = w.kind || 'p';
  if (w.arrow) kind = 'arrow'; else if (w.flame) kind = 'flame'; else if (w.trail) kind = 'laser'; else if (w.ret) kind = 'boomer';
  else if (w.homing) kind = 'bee'; else if (w.big) kind = 'rocket'; else if (w.freeze) kind = 'ice';
  G.pb.push({ x: x + Math.cos(ang) * 9, y: y + Math.sin(ang) * 9, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, ox: x, oy: y,
    dmg: w.dmg, owner, life: (w.life || 2) * (lifeMul || 1), age: 0, col: w.col, kind, auth,
    pierce: w.pierce || 0, bounce: w.bounce || 0, boom: w.boom || 0, homing: !!w.homing, ret: !!w.ret, fuse: !!w.fuse,
    freeze: w.freeze || 0, burn: w.burn || 0, r: w.big ? 3 : 2, hit: new Set(), trail: [] });
}
function meleeHit(owner, w, x, y, a) {
  const rr = w.melee.range, half = w.melee.arc / 2;
  for (const e of G.enemies.values()) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d > rr + e.r) continue;
    if (Math.abs(angDiff(Math.atan2(e.y - y, e.x - x), a)) > half && d > e.r + 4) continue;
    damageEnemy(e, w.dmg, owner, Math.atan2(e.y - y, e.x - x), 160);
  }
  // 적 총알 베기
  for (let i = G.eb.length - 1; i >= 0; i--) {
    const b = G.eb[i], d = Math.hypot(b.x - x, b.y - y);
    if (d < rr + 4 && Math.abs(angDiff(Math.atan2(b.y - y, b.x - x), a)) < half + 0.3) { G.rm.push(b.id); G.eb.splice(i, 1); G.fx.push({ k: 'spark', x: b.x, y: b.y, t: 0, d: 0.2, col: '#fff' }); }
  }
  for (const c of G.M.crates) if (c.alive && Math.hypot((c.x + 0.5) * TILE - x, (c.y + 0.5) * TILE - y) < rr + 8) hitCrate(c, 2);
}
function hitCrate(c, dmg) {
  c.hp -= dmg;
  if (c.hp > 0 || !c.alive) return;
  c.alive = false;
  const cx = (c.x + 0.5) * TILE, cy = (c.y + 0.5) * TILE;
  emit({ k: 'crate', i: c.i });
  crateFx(c);
  if (c.kind === 1) explode(cx, cy, 34, 14, -1);
  else if (Math.random() < 0.35) addItem(Math.random() < 0.7 ? 'en' : 'co', cx, cy, { v: 6 });
}
function crateFx(c) {
  const cx = (c.x + 0.5) * TILE, cy = (c.y + 0.5) * TILE;
  for (let i = 0; i < 8; i++) G.fx.push({ k: 'part', x: cx, y: cy, vx: rnd(-60, 60), vy: rnd(-80, 20), t: 0, d: rnd(0.3, 0.6), col: c.kind ? '#c43a2a' : '#9a6234', s: 2, g: 200 });
}
function explode(x, y, r, dmg, owner) {
  G.fx.push({ k: 'boom', x, y, r, t: 0, d: 0.4 });
  SFX.boom(); G.shake = Math.max(G.shake, 6);
  emit({ k: 'boom', x: x | 0, y: y | 0, r });
  if (!G.host) return;
  for (const e of G.enemies.values()) { const d = Math.hypot(e.x - x, e.y - y); if (d < r + e.r) damageEnemy(e, dmg, owner, Math.atan2(e.y - y, e.x - x), 200); }
  for (const c of G.M.crates) if (c.alive && Math.hypot((c.x + 0.5) * TILE - x, (c.y + 0.5) * TILE - y) < r + 6) hitCrate(c, 3);
}

function updateBullets(dt) {
  const M = G.M;
  for (let i = G.pb.length - 1; i >= 0; i--) {
    const b = G.pb[i];
    b.age += dt;
    if (b.homing && b.age > 0.15) {
      let best = null, bd = 130 * 130;
      for (const e of G.enemies.values()) { const d = dist2(b.x, b.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
      if (best) { const want = Math.atan2(best.y - b.y, best.x - b.x), cur = Math.atan2(b.vy, b.vx), sp = Math.hypot(b.vx, b.vy); const na = cur + clamp(angDiff(want, cur), -5 * dt, 5 * dt); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
    }
    if (b.ret && b.age > b.life * 0.45) {
      const o = G.players.get(b.owner); if (o) { const a = Math.atan2(o.y - b.y, o.x - b.x), sp = 260; b.vx += (Math.cos(a) * sp - b.vx) * dt * 6; b.vy += (Math.sin(a) * sp - b.vy) * dt * 6; if (b.age > b.life * 0.6 && Math.hypot(o.x - b.x, o.y - b.y) < 8) { G.pb.splice(i, 1); continue; } }
    }
    if (b.fuse) { b.vx *= 1 - dt * 2.2; b.vy *= 1 - dt * 2.2; }
    if (b.kind === 'laser' || b.kind === 'rocket' || b.kind === 'bee') { b.trail.push(b.x, b.y); if (b.trail.length > 12) b.trail.splice(0, 2); }
    const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
    let dead = false;
    if (solidPx(M, nx, ny)) {
      const tx = Math.floor(nx / TILE), ty = Math.floor(ny / TILE);
      const c = M.crateAt.get(ty * M.W + tx);
      if (c && c.alive && b.auth) hitCrate(c, b.dmg >= 8 ? 3 : 1);
      if (b.ret) { b.age = Math.max(b.age, b.life * 0.5); b.vx *= -0.5; b.vy *= -0.5; }
      else if (b.bounce > 0) {
        b.bounce--;
        if (solidPx(M, nx, b.y)) b.vx = -b.vx;
        if (solidPx(M, b.x, ny)) b.vy = -b.vy;
      } else dead = true;
    } else { b.x = nx; b.y = ny; }
    if (b.age >= b.life) dead = true;
    if (!dead) {
      for (const e of G.enemies.values()) {
        if (Math.abs(e.x - b.x) > 20 || Math.abs(e.y - b.y) > 20) continue;
        const er = e.r + b.r;
        if (dist2(e.x, e.y, b.x, b.y) > er * er) continue;
        if (b.hit.has(e.id)) continue;
        b.hit.add(e.id);
        if (b.auth) damageEnemy(e, b.dmg, b.owner, Math.atan2(b.vy, b.vx), b.boom ? 40 : 70, b);
        if (b.pierce > 0) { b.pierce--; continue; }
        dead = true; break;
      }
    }
    if (dead) {
      if (b.boom) { if (b.auth) explode(b.x, b.y, b.boom, b.dmg, b.owner); else G.fx.push({ k: 'boom', x: b.x, y: b.y, r: b.boom, t: 0, d: 0.4 }); }
      else G.fx.push({ k: 'spark', x: b.x, y: b.y, t: 0, d: 0.15, col: b.col });
      G.pb.splice(i, 1);
    }
  }
  // 적 총알
  for (let i = G.eb.length - 1; i >= 0; i--) {
    const b = G.eb[i];
    b.age += dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.acc) { b.vx *= 1 + b.acc * dt; b.vy *= 1 + b.acc * dt; }
    if (solidPx(M, b.x, b.y, b.k === 4) || b.age > 6) {
      G.fx.push({ k: 'spark', x: b.x, y: b.y, t: 0, d: 0.15, col: EB_COL[b.k][0] });
      G.eb.splice(i, 1); continue;
    }
    if (!G.host) continue;
    for (const p of G.players.values()) {
      if (p.down) continue;
      const d2 = dist2(p.x, p.y, b.x, b.y);
      if (p.shield > 0 && d2 < 18 * 18) { // 반사
        G.rm.push(b.id); G.eb.splice(i, 1);
        const a = Math.atan2(b.y - p.y, b.x - p.x);
        pushBullet(p.id, { dmg: 4, spd: 220, col: '#8ff3ff', life: 1.5 }, b.x, b.y, a, true);
        emit({ k: 'rf', x: b.x | 0, y: b.y | 0, a: +a.toFixed(2), o: p.id });
        break;
      }
      if (d2 < (3.5 + b.r) * (3.5 + b.r)) {
        if (damagePlayer(p, b.dmg || 1)) { G.rm.push(b.id); G.eb.splice(i, 1); G.fx.push({ k: 'spark', x: b.x, y: b.y, t: 0, d: 0.2, col: '#ff4a4a' }); }
        break;
      }
    }
  }
}
const EB_COL = [['#ff6a3a', '#ffe0a0'], ['#e8e2d0', '#ffffff'], ['#5ac8ff', '#e0f8ff'], ['#ff9a1a', '#fff2a0'], ['#c37bff', '#f0dcff'], ['#6fd36a', '#e0ffd8']];
function hostEB(x, y, ang, spd, k, r, acc) {
  const b = { id: G.bid++, x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, k: k || 0, r: r || 3, age: 0, dmg: 1, acc: acc || 0 };
  G.eb.push(b);
  if (G.online) G.queue.push({ k: 'eb', b: [b.id, +x.toFixed(1), +y.toFixed(1), +b.vx.toFixed(1), +b.vy.toFixed(1), b.k, b.r, b.acc] });
}

// ---------- 피해 ----------
function damageEnemy(e, dmg, owner, ang, kb, b) {
  if (e.hp <= 0) return;
  let crit = Math.random() < 0.12;
  if (crit) dmg *= 2;
  e.hp -= dmg; e.flash = 0.08;
  const bossy = e.def.boss !== undefined;
  if (!bossy && e.def.move !== 'static') { e.kx += Math.cos(ang) * kb; e.ky += Math.sin(ang) * kb; }
  if (b && b.freeze) e.frozen = Math.max(e.frozen, bossy ? b.freeze * 0.3 : b.freeze);
  if (b && b.burn) e.burnT = 2;
  G.nums.push({ x: e.x + rnd(-4, 4), y: e.y - e.r - 2, v: Math.round(dmg), t: 0, crit });
  SFX.hit();
  if (e.hp <= 0) killEnemy(e, owner);
}
function killEnemy(e, owner) {
  G.enemies.delete(e.id);
  G.stats.kills++;
  deathFx(e.x, e.y, e.type);
  emit({ k: 'kl', x: e.x | 0, y: e.y | 0, t: e.ti });
  const def = e.def;
  for (let i = 0; i < (def.energy || 0); i++) addItem('en', e.x + rnd(-6, 6), e.y + rnd(-6, 6), { v: 5 });
  if (Math.random() < 0.55) addItem('co', e.x + rnd(-5, 5), e.y + rnd(-5, 5));
  if (Math.random() < 0.025) addItem(Math.random() < 0.5 ? 'hp' : 'mp', e.x, e.y);
  if (def.boss !== undefined) {
    G.boss = null;
    for (let i = G.eb.length - 1; i >= 0; i--) G.rm.push(G.eb[i].id);
    G.eb.length = 0;
    for (const o of [...G.enemies.values()]) killEnemy(o, -1);
  }
}
function deathFx(x, y, type) {
  const big = ENEMIES[type] && ENEMIES[type].boss !== undefined;
  const pal = ENEMY_ART[type] ? Object.values(ENEMY_ART[type].pal) : ['#fff'];
  for (let i = 0; i < (big ? 50 : 12); i++) G.fx.push({ k: 'part', x, y, vx: rnd(-90, 90) * (big ? 1.6 : 1), vy: rnd(-110, 30) * (big ? 1.6 : 1), t: 0, d: rnd(0.3, 0.7) * (big ? 1.8 : 1), col: pick(pal), s: big ? 3 : 2, g: 260 });
  G.fx.push({ k: 'ring', x, y, r: big ? 60 : 14, t: 0, d: 0.3, col: '#ffffff' });
  SFX.kill();
  if (big) { SFX.boom(); G.shake = 14; G.flash = 0.5; }
}
function damagePlayer(p, dmg) {
  if (p.down || p.inv > 0 || p.shield > 0) return false;
  if (p.ar > 0) { const a = Math.min(p.ar, dmg); p.ar -= a; dmg -= a; }
  p.hp -= dmg;
  p.inv = 0.8; p.lastHit = G.time; p.armorT = 0;
  if (p.hp <= 0) { p.hp = 0; p.down = true; p.rev = 0; emit({ k: 'down', id: p.id }); if (p.id !== G.me) UI.toast(`${p.name}님이 쓰러졌어요! 옆에 서서 살려주세요`); }
  return true;
}

// ---------- 호스트: 클라이언트 요청 처리 ----------
function act(msg) { if (G.host) hostHandle(G.me, msg); else Net.toHost(msg); }
function hostHandle(id, m) {
  const p = G.players.get(id);
  if (G.mode !== 'play' || !p) return;
  switch (m.t) {
    case 'pos': if (id !== G.me) { p.x = m.x; p.y = m.y; } p.a = m.a; p.w = m.w; p.moving = !!m.m; break;
    case 'sh': {
      const w = getW(m.w); if (!w || p.down) return;
      if (id !== G.me) spawnShot(id, w, m.x, m.y, m.a, m.s, true);
      emit({ k: 'sh', id, w: m.w, x: m.x, y: m.y, a: m.a, s: m.s });
      break;
    }
    case 'sk': {
      if (p.down) return;
      const h = p.hero;
      if (h === 0) p.shield = 4;
      else if (h === 1) p.inv = Math.max(p.inv, 0.55);
      else if (h === 2) {
        for (const e of G.enemies.values()) if (Math.hypot(e.x - p.x, e.y - p.y) < 95) { e.frozen = e.def.boss !== undefined ? 1 : 3; damageEnemy(e, 6, id, 0, 0); }
        for (let i = G.eb.length - 1; i >= 0; i--) { const b = G.eb[i]; if (Math.hypot(b.x - p.x, b.y - p.y) < 95) { G.rm.push(b.id); G.eb.splice(i, 1); } }
      } else if (h === 3) G.turrets.push({ x: m.x, y: m.y + 4, t: 10, owner: id, cd: 0, a: 0 });
      skillFx(id, h, p.x, p.y);
      emit({ k: 'skfx', id, h, x: p.x | 0, y: p.y | 0 });
      break;
    }
    case 'pk': {
      const it = G.items.get(m.i);
      if (!it || it.k !== 'wpn' || Math.hypot(it.x - p.x, it.y - p.y) > 34) return;
      delItem(it.i);
      if (m.drop >= 0) addItem('wpn', p.x, p.y + 6, { w: m.drop });
      toPlayer(id, { k: 'got', w: it.w, slot: m.slot });
      break;
    }
    case 'use': {
      const it = G.items.get(m.i);
      if (!it || Math.hypot(it.x - p.x, it.y - p.y) > 40) return;
      if (it.k === 'chest') { delItem(it.i); addItem('wpn', it.x, it.y, { w: randWeapon() }); chestFx(it.x, it.y); emit({ k: 'chestfx', x: it.x, y: it.y }); }
      else if (it.k === 'rchest') { delItem(it.i); for (let i = 0; i < 4; i++) addItem('en', it.x + rnd(-8, 8), it.y + rnd(-8, 8), { v: 6 }); for (let i = 0; i < 3; i++) addItem('co', it.x + rnd(-8, 8), it.y + rnd(-8, 8)); addItem(Math.random() < 0.5 ? 'hp' : 'mp', it.x, it.y + 6); chestFx(it.x, it.y); emit({ k: 'chestfx', x: it.x, y: it.y }); }
      else if (it.k === 'bchest') { delItem(it.i); addItem('wpn', it.x - 14, it.y, { w: randWeapon() }); addItem('wpn', it.x + 14, it.y, { w: randWeapon() }); for (let i = 0; i < 10; i++) addItem('co', it.x + rnd(-14, 14), it.y + rnd(-10, 10)); addItem('hp', it.x, it.y + 10); chestFx(it.x, it.y); emit({ k: 'chestfx', x: it.x, y: it.y }); }
      else if (it.k === 'vend') { addItem('wpn', it.x + rnd(-8, 8), it.y + 18, { w: randWeapon() }); chestFx(it.x, it.y + 10); emit({ k: 'chestfx', x: it.x, y: it.y + 10 }); }
      else if (it.k === 'portal') nextLevel();
      break;
    }
  }
}
function chestFx(x, y) {
  SFX.chest();
  for (let i = 0; i < 20; i++) G.fx.push({ k: 'part', x, y, vx: rnd(-70, 70), vy: rnd(-120, -20), t: 0, d: rnd(0.4, 0.8), col: pick(['#ffe08a', '#ffffff', '#ffd23a']), s: 2, g: 200 });
}
function skillFx(id, h, x, y) {
  SFX.skill();
  const p = G.players.get(id);
  if (h === 2) { G.fx.push({ k: 'ring', x, y, r: 95, t: 0, d: 0.45, col: '#9fe8ff' }); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; G.fx.push({ k: 'part', x, y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, t: 0, d: 0.5, col: '#d8f4ff', s: 2, g: 0 }); } }
  if (h === 1 && p) p.dashFx = 0.3;
}
function nextLevel() {
  const L = G.L + 1, seed = (Math.random() * 1e9) | 0;
  flushNet();
  if (G.online) Net.broadcast({ t: 'level', seed, L });
  applyLevel(seed, L);
}

// ---------- 호스트: 방·적 ----------
function hostUpdate(dt) {
  const M = G.M, alive = [...G.players.values()].filter(p => !p.down);
  const np = G.players.size;
  // 방 진입
  for (const r of M.rooms) {
    if (r.state !== 'idle') continue;
    const trig = alive.find(p => { const rr = roomAtPx(M, p.x, p.y, 1); return rr === r; });
    if (!trig) continue;
    r.state = 'fight'; setDoors(M, r, true); emit({ k: 'room', i: r.i, s: 'fight' }); SFX.door();
    for (const p of G.players.values()) if (roomAtPx(M, p.x, p.y) !== r) {
      const x = trig.x + rnd(-8, 8), y = trig.y + rnd(-8, 8);
      if (p.id === G.me) { p.x = x; p.y = y; } else toPlayer(p.id, { k: 'tp', x, y });
      p.x = x; p.y = y;
    }
    r.wave = 0; r.waves = r.type === 'boss' ? 1 : (2 + (Math.random() < 0.45 ? 1 : 0) + (G.L >= 9 ? 1 : 0));
    spawnWave(r);
  }
  // 대기 중 소환
  for (let i = G.pend.length - 1; i >= 0; i--) {
    const s = G.pend[i]; s.t -= dt;
    if (s.t <= 0) { makeEnemy(s.type, s.x, s.y, s.room); G.pend.splice(i, 1); }
  }
  // 전투 진행
  for (const r of M.rooms) {
    if (r.state !== 'fight') continue;
    let any = G.pend.some(s => s.room === r.i);
    if (!any) for (const e of G.enemies.values()) if (e.room === r.i) { any = true; break; }
    if (any) continue;
    r.wave++;
    if (r.wave < r.waves) spawnWave(r); else clearRoom(r);
  }
  // 적
  for (const e of G.enemies.values()) updateEnemy(e, dt, alive);
  // 적끼리 밀어내기
  const arr = [...G.enemies.values()];
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
    const a = arr[i], b = arr[j], rr = a.r + b.r, d2 = dist2(a.x, a.y, b.x, b.y);
    if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2), push = (rr - d) / 2, nx = (b.x - a.x) / d, ny = (b.y - a.y) / d; if (!a.def.boss && a.def.move !== 'static') moveCircle(M, a, -nx * push, -ny * push, a.r); if (!b.def.boss && b.def.move !== 'static') moveCircle(M, b, nx * push, ny * push, b.r); }
  }
  // 포탑
  for (let i = G.turrets.length - 1; i >= 0; i--) {
    const t = G.turrets[i]; t.t -= dt; t.cd -= dt;
    if (t.t <= 0) { G.turrets.splice(i, 1); continue; }
    let best = null, bd = 170 * 170;
    for (const e of G.enemies.values()) { const d = dist2(t.x, t.y, e.x, e.y); if (d < bd && lineOfSight(M, t.x, t.y, e.x, e.y)) { bd = d; best = e; } }
    if (best) { t.a = Math.atan2(best.y - t.y, best.x - t.x); if (t.cd <= 0) { t.cd = 0.3; const s = (Math.random() * 1e9) | 0; spawnShot(t.owner, TURRET_GUN, t.x, t.y - 4, t.a, s, true); emit({ k: 'sh', id: -1, w: 99, x: t.x, y: t.y - 4, a: +t.a.toFixed(3), s }); } }
  }
  // 플레이어 (갑옷 회복, 부활)
  for (const p of G.players.values()) {
    p.inv = Math.max(0, p.inv - dt); p.shield = Math.max(0, p.shield - dt);
    if (!p.down && p.ar < p.mar && G.time - p.lastHit > 3.5) { p.armorT += dt; if (p.armorT > 1) { p.armorT = 0; p.ar++; } }
    if (p.down) {
      const helper = alive.find(q => q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 22);
      if (helper) { p.rev += dt / 1.8; if (p.rev >= 1) { p.down = false; p.hp = Math.max(2, Math.ceil(p.mhp / 2)); p.inv = 2; p.rev = 0; emit({ k: 'revive', id: p.id }); SFX.revive(); } }
      else p.rev = Math.max(0, p.rev - dt * 0.3);
    }
  }
  if (np > 0 && alive.length === 0 && !G.over) gameOver();
  // 아이템 줍기
  for (const it of G.items.values()) {
    if (it.k !== 'en' && it.k !== 'co' && it.k !== 'hp' && it.k !== 'mp') continue;
    let best = null, bd = 1e9;
    for (const p of alive) { const d = Math.hypot(p.x - it.x, p.y - it.y); if (d < bd) { bd = d; best = p; } }
    if (!best) continue;
    const mag = (it.k === 'en' || it.k === 'co') ? 40 : 0;
    if (bd < mag && bd > 1) { const s = Math.min(bd, 150 * dt); it.x += (best.x - it.x) / bd * s; it.y += (best.y - it.y) / bd * s; }
    if (bd < 9) {
      delItem(it.i);
      if (it.k === 'en') toPlayer(best.id, { k: 'gain', en: it.v || 5 });
      else if (it.k === 'co') toPlayer(best.id, { k: 'gain', co: 1 });
      else if (it.k === 'mp') toPlayer(best.id, { k: 'gain', en: 80, fx: 'mp' });
      else if (it.k === 'hp') { best.hp = Math.min(best.mhp, best.hp + 2); toPlayer(best.id, { k: 'gain', fx: 'hp' }); }
    }
  }
}
function spawnWave(r) {
  const np = G.players.size, list = [];
  if (r.type === 'boss') {
    const t = G.M.biome.boss;
    G.pend.push({ t: 1.4, type: t, x: (r.cx + 0.5) * TILE, y: (r.cy - 3) * TILE, room: r.i });
    list.push([(r.cx + 0.5) * TILE, (r.cy - 3) * TILE, 1]);
    const ev = { k: 'banner', t: ENEMIES[t].name, s: '보스 등장!' };
    applyEvent(ev); emit(ev);
  } else {
    const n = Math.min(14, Math.floor((3 + G.L * 0.35 + Math.random() * 2.5) * (1 + 0.4 * (np - 1))));
    const pool = G.M.biome.enemies;
    let guard = 0;
    while (list.length < n && guard++ < 300) {
      const tx = r.x0 + 1 + Math.floor(Math.random() * (r.x1 - r.x0 - 1)), ty = r.y0 + 1 + Math.floor(Math.random() * (r.y1 - r.y0 - 1));
      if (solidTile(G.M, tx, ty)) continue;
      const x = (tx + 0.5) * TILE, y = (ty + 0.5) * TILE;
      if ([...G.players.values()].some(p => Math.hypot(p.x - x, p.y - y) < 56)) continue;
      if (list.some(([lx, ly]) => Math.hypot(lx - x, ly - y) < 14)) continue;
      let type = pick(pool);
      if (type === 'shaman' && Math.random() < 0.5) type = pool[0];
      G.pend.push({ t: 0.9, type, x, y, room: r.i });
      list.push([x | 0, y | 0, 0]);
    }
  }
  spawnMarks(list); emit({ k: 'sp', l: list });
}
function spawnMarks(list) { SFX.spawn(); for (const [x, y, big] of list) G.fx.push({ k: 'mark', x, y, t: 0, d: big ? 1.4 : 0.9, big }); }
function clearRoom(r) {
  r.state = 'clear'; setDoors(G.M, r, false); emit({ k: 'room', i: r.i, s: 'clear' }); SFX.door();
  const cx = (r.cx + 0.5) * TILE, cy = (r.cy + 0.5) * TILE;
  if (r.type === 'boss') {
    addItem('portal', cx, cy + 20);
    addItem('bchest', cx, cy - 10);
    const ev = { k: 'banner', t: '보스 처치!', s: '포탈을 타고 다음 층으로' }; applyEvent(ev); emit(ev);
  } else {
    for (let i = 0; i < 3; i++) addItem('en', cx + rnd(-10, 10), cy + rnd(-10, 10), { v: 6 });
    if (Math.random() < 0.32) addItem('rchest', cx, cy);
  }
}
function makeEnemy(type, x, y, room) {
  const def = ENEMIES[type], np = G.players.size;
  const mult = (1 + 0.14 * G.L) * (def.boss !== undefined ? 1 + 0.6 * (np - 1) : 1);
  const e = { id: G.eid++, type, ti: ENEMY_KEYS.indexOf(type), def, x, y, r: def.r, hp: Math.round(def.hp * mult), mhp: 0, room,
    cd: rnd(0.8, 2.2), kx: 0, ky: 0, frozen: 0, burnT: 0, burnAcc: 0, flash: 0, face: 1, st: 0, stT: rnd(1, 2), dir: rnd(0, 6.28), windup: 0, air: 0, spiral: null, bossT: 2, phase: 0, seq: [] };
  e.mhp = e.hp;
  G.enemies.set(e.id, e);
  if (def.boss !== undefined) { G.boss = e.id; SFX.boss(); G.shake = 8; }
  return e;
}
function nearestPlayer(e, alive) {
  let best = null, bd = 1e9;
  for (const p of alive) { const d = dist2(p.x, p.y, e.x, e.y); if (d < bd) { bd = d; best = p; } }
  return best;
}
function updateEnemy(e, dt, alive) {
  const M = G.M, def = e.def;
  e.flash = Math.max(0, e.flash - dt);
  if (e.burnT > 0) { e.burnT -= dt; e.burnAcc += dt; if (e.burnAcc > 0.5) { e.burnAcc = 0; damageEnemy(e, 1, -1, 0, 0); if (e.hp <= 0) return; G.fx.push({ k: 'part', x: e.x + rnd(-4, 4), y: e.y - 4, vx: 0, vy: -30, t: 0, d: 0.4, col: '#ff7a2a', s: 2, g: 0 }); } }
  // 넉백
  if (Math.abs(e.kx) + Math.abs(e.ky) > 1) { moveCircle(M, e, e.kx * dt, e.ky * dt, e.r); e.kx *= 1 - dt * 9; e.ky *= 1 - dt * 9; }
  if (e.frozen > 0) { e.frozen -= dt; return; }
  const tgt = nearestPlayer(e, alive);
  if (!tgt) return;
  const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
  e.face = dx < 0 ? -1 : 1;
  if (def.boss !== undefined) { updateBoss(e, dt, tgt, alive, d, ang); return; }
  const spd = def.spd;
  let mx = 0, my = 0;
  e.stT -= dt;
  e.losT = (e.losT || 0) - dt;
  if (e.losT <= 0) { e.losT = 0.25; e.los = lineOfSight(M, e.x, e.y, tgt.x, tgt.y); e.noLos = e.los ? 0 : (e.noLos || 0) + 0.25; }
  let move = def.move;
  if (!e.los && e.noLos > 0.8 && (move === 'keep' || move === 'wander' || move === 'swoop')) move = 'chase';
  switch (move) {
    case 'chase': mx = dx / d; my = dy / d; if (e.stT < 0) { e.stT = rnd(0.5, 1.2); e.dir = rnd(-0.6, 0.6); } { const c = Math.cos(e.dir), s = Math.sin(e.dir); const tx = mx * c - my * s; my = mx * s + my * c; mx = tx; } break;
    case 'keep': {
      if (e.stT < 0) { e.stT = rnd(1, 2); e.dir = Math.random() < 0.5 ? 1 : -1; }
      if (d > 120) { mx = dx / d; my = dy / d; } else if (d < 70) { mx = -dx / d; my = -dy / d; } else { mx = -dy / d * e.dir * 0.8; my = dx / d * e.dir * 0.8; }
      break;
    }
    case 'wander': if (e.stT < 0) { e.stT = rnd(1.2, 2.6); e.dir = rnd(0, 6.28); } mx = Math.cos(e.dir) * 0.6; my = Math.sin(e.dir) * 0.6; break;
    case 'swoop': { const s = Math.sin(G.time * 4 + e.id); mx = dx / d + (-dy / d) * s * 1.2; my = dy / d + (dx / d) * s * 1.2; const l = Math.hypot(mx, my) || 1; mx /= l; my /= l; break; }
    case 'charge': {
      if (e.st === 0) { mx = dx / d * 0.45; my = dy / d * 0.45; e.cd -= dt; if (e.cd <= 0 && d < 170) { e.st = 1; e.windup = 0.6; e.dir = ang; } }
      else if (e.st === 1) { e.windup -= dt; if (e.windup <= 0) { e.st = 2; e.windup = 0.55; } }
      else if (e.st === 2) { e.windup -= dt; const hit = moveCircle(M, e, Math.cos(e.dir) * 175 * dt, Math.sin(e.dir) * 175 * dt, e.r); if (Math.random() < 0.5) G.fx.push({ k: 'part', x: e.x, y: e.y + 4, vx: 0, vy: -10, t: 0, d: 0.3, col: '#c8b090', s: 2, g: 0 }); if (e.windup <= 0 || hit) { e.st = 0; e.cd = rnd(1.4, 2.2); if (hit) G.shake = Math.max(G.shake, 2); } }
      break;
    }
  }
  if (mx || my) {
    const blocked = moveCircle(M, e, mx * spd * dt, my * spd * dt, e.r);
    if (blocked && def.move !== 'charge' && e.stT < 0.3) { e.stT = rnd(0.6, 1); e.dir = (Math.random() < 0.5 ? -1 : 1) * rnd(1.2, 1.7); }
  }
  // 몸통 박치기
  if (def.contact && d < e.r + 5) damagePlayer(tgt, def.contact);
  // 공격
  const atk = def.atk;
  if (e.spiral) { e.spiral.t -= dt; while (e.spiral && e.spiral.t <= 0) { e.spiral.t += 0.07; hostEB(e.x, e.y, e.spiral.a, atk.spd, 3); e.spiral.a += 0.45; if (--e.spiral.n <= 0) e.spiral = null; } }
  if (e.burst) { e.burst.t -= dt; if (e.burst.t <= 0) { e.burst.t = 0.13; hostEB(e.x, e.y, Math.atan2(tgt.y - e.y, tgt.x - e.x), atk.spd, 0); if (--e.burst.n <= 0) e.burst = null; } }
  if (!atk) return;
  e.cd -= dt;
  if (e.cd > 0 || d > 260) return;
  if (atk.range && d > atk.range) return;
  if (!e.los) { e.cd = 0.3; return; }
  e.cd = atk.cd * rnd(0.8, 1.25) / (1 + G.L * 0.03);
  const k = atk.arrow ? 1 : (G.M.biomeIdx === 1 ? 2 : G.M.biomeIdx === 2 ? 3 : (e.type === 'slime' || e.type === 'mushroom') ? 5 : e.type === 'shaman' || e.type === 'ghost' ? 4 : 0);
  switch (atk.type) {
    case 'aim': for (let i = 0; i < atk.n; i++) hostEB(e.x, e.y, ang + (i - (atk.n - 1) / 2) * 0.15, atk.spd, k, atk.arrow ? 2 : 3); break;
    case 'spread': for (let i = 0; i < atk.n; i++) hostEB(e.x, e.y, ang + (i / (atk.n - 1) - 0.5) * atk.spread * 2, atk.spd, k); break;
    case 'ring': { e.rot = (e.rot || 0) + 0.35; for (let i = 0; i < atk.n; i++) hostEB(e.x, e.y, (atk.rot ? e.rot : 0) + i / atk.n * Math.PI * 2, atk.spd, k); break; }
    case 'spiral': e.spiral = { a: ang, n: atk.n, t: 0 }; break;
    case 'burst': e.burst = { n: atk.n, t: 0 }; break;
  }
  SFX.eshoot();
}

// ---------- 보스 패턴 ----------
function updateBoss(e, dt, tgt, alive, d, ang) {
  const M = G.M, rage = e.hp < e.mhp * 0.5 ? 1.35 : 1;
  const k = [5, 2, 3][e.def.boss];
  // 진행 중인 연속 공격
  for (let i = e.seq.length - 1; i >= 0; i--) { const s = e.seq[i]; s.t -= dt; if (s.t <= 0) { s.fn(); e.seq.splice(i, 1); } }
  const after = (t, fn) => e.seq.push({ t, fn });
  if (e.air > 0) { // 점프 중
    e.air -= dt;
    e.x += (e.jx - e.x) * Math.min(1, dt * 4); e.y += (e.jy - e.y) * Math.min(1, dt * 4);
    if (e.air <= 0) { G.shake = 10; for (let i = 0; i < 20; i++) hostEB(e.x, e.y, i / 20 * Math.PI * 2, 70, k, 4); explodeVisual(e.x, e.y + 8); for (const p of alive) if (Math.hypot(p.x - e.x, p.y - e.y) < 28) damagePlayer(p, 2); }
    return;
  }
  if (e.dashT > 0) {
    e.dashT -= dt;
    const hit = moveCircle(M, e, Math.cos(e.dir) * 190 * dt, Math.sin(e.dir) * 190 * dt, e.r);
    if (Math.random() < 0.4) hostEB(e.x, e.y, e.dir + Math.PI + rnd(-0.6, 0.6), 40, k);
    if (hit || e.dashT <= 0) { e.dashT = 0; if (hit) { G.shake = 8; for (let i = 0; i < 12; i++) hostEB(e.x, e.y, i / 12 * Math.PI * 2, 80, k); } }
    for (const p of alive) if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 5) damagePlayer(p, e.def.contact);
    return;
  }
  // 느리게 따라가기
  if (d > 60) moveCircle(M, e, Math.cos(ang) * e.def.spd * dt, Math.sin(ang) * e.def.spd * dt, e.r);
  for (const p of alive) if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 5) damagePlayer(p, e.def.contact);
  e.bossT -= dt * rage;
  if (e.bossT > 0) return;
  const P = e.phase++ % 4;
  if (e.def.boss === 0) { // 젤리 킹
    if (P === 0) { for (let w = 0; w < 3; w++) after(w * 0.4, () => { const off = Math.random(); for (let i = 0; i < 16; i++) hostEB(e.x, e.y, off + i / 16 * Math.PI * 2, 75, k, 4); }); e.bossT = 2.6; }
    else if (P === 1) { e.air = 0.9; e.jx = tgt.x; e.jy = tgt.y; e.bossT = 2.4; }
    else if (P === 2) { for (let i = 0; i < 3; i++) { const sx = e.x + rnd(-30, 30), sy = e.y + rnd(-20, 20); if (!circleHits(M, sx, sy, 6)) makeEnemy('slime', sx, sy, e.room); } e.bossT = 2; }
    else { for (let w = 0; w < 2; w++) after(w * 0.45, () => { const a = Math.atan2(tgt.y - e.y, tgt.x - e.x); for (let i = 0; i < 7; i++) hostEB(e.x, e.y, a + (i / 6 - 0.5) * 1.1, 95, k, 3); }); e.bossT = 2.2; }
  } else if (e.def.boss === 1) { // 서리 거인
    if (P === 0) { for (let i = 0; i < 40; i++) after(i * 0.06, () => { const a = G.time * 3; hostEB(e.x, e.y, a, 80, k); hostEB(e.x, e.y, a + Math.PI, 80, k); }); e.bossT = 3; }
    else if (P === 1) { for (let w = 0; w < 4; w++) after(w * 0.35, () => { const a = Math.atan2(tgt.y - e.y, tgt.x - e.x); for (let i = 0; i < 5; i++) hostEB(e.x, e.y, a + (i / 4 - 0.5) * 0.7, 110, k, 3); }); e.bossT = 2.4; }
    else if (P === 2) { const gap = Math.random() * 6.28; for (let r = 0; r < 2; r++) after(r * 0.6, () => { for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; if (Math.abs(angDiff(a, gap + r)) < 0.45) continue; hostEB(e.x, e.y, a, 65, k, 4); } }); e.bossT = 2.6; }
    else { e.dir = ang; e.dashT = 0.9; e.bossT = 2.2; }
  } else { // 이그니스
    if (P === 0) { for (let i = 0; i < 50; i++) after(i * 0.06, () => { const a = G.time * 2.4; for (let q = 0; q < 4; q++) hostEB(e.x, e.y, a + q * Math.PI / 2, 75, k); }); e.bossT = 3.4; }
    else if (P === 1) { for (let i = 0; i < 2 + (rage > 1 ? 1 : 0); i++) { const sx = e.x + rnd(-36, 36), sy = e.y + rnd(-24, 24); if (!circleHits(M, sx, sy, 6)) makeEnemy('imp', sx, sy, e.room); } for (let i = 0; i < 18; i++) hostEB(e.x, e.y, i / 18 * Math.PI * 2, 60, k, 4); e.bossT = 2.2; }
    else if (P === 2) { for (let w = 0; w < 3; w++) after(w * 0.5, () => { const off = w % 2 ? Math.PI / 20 : 0; for (let i = 0; i < 20; i++) hostEB(e.x, e.y, off + i / 20 * Math.PI * 2, 85, k, 3, -0.15); }); e.bossT = 2.6; }
    else { e.dir = ang; e.dashT = 1; after(1.1, () => { const a = Math.atan2(tgt.y - e.y, tgt.x - e.x); for (let i = 0; i < 9; i++) hostEB(e.x, e.y, a + (i / 8 - 0.5) * 1.3, 100, k, 3); }); e.bossT = 2.8; }
  }
  SFX.eshoot();
}
function explodeVisual(x, y) { G.fx.push({ k: 'boom', x, y, r: 26, t: 0, d: 0.35 }); emit({ k: 'boom', x: x | 0, y: y | 0, r: 26 }); SFX.boom(); }

function gameOver() {
  G.over = true;
  const st = { L: G.L, kills: G.stats.kills, time: Math.round((performance.now() - G.stats.start) / 1000) };
  if (G.online) { flushNet(); Net.broadcast({ t: 'over', st }); }
  UI.showOver(st);
}

// ---------- 클라이언트: 이벤트 적용 ----------
function applyEvent(ev) {
  const M = G.M;
  switch (ev.k) {
    case 'sh': if (ev.id !== G.me) { const w = getW(ev.w); spawnShot(ev.id, w, ev.x, ev.y, ev.a, ev.s, false); } break;
    case 'eb': { const [id, x, y, vx, vy, k, r, acc] = ev.b; G.eb.push({ id, x, y, vx, vy, k, r, acc, age: 0 }); break; }
    case 'rm': { const s = new Set(ev.l); for (let i = G.eb.length - 1; i >= 0; i--) if (s.has(G.eb[i].id)) G.eb.splice(i, 1); break; }
    case 'room': { const r = M.rooms[ev.i]; r.state = ev.s; setDoors(M, r, ev.s === 'fight'); SFX.door(); break; }
    case 'sp': spawnMarks(ev.l); break;
    case 'ia': G.items.set(ev.it.i, ev.it); break;
    case 'id': G.items.delete(ev.i); break;
    case 'crate': { const c = M.crates[ev.i]; if (c && c.alive) { c.alive = false; crateFx(c); } break; }
    case 'boom': G.fx.push({ k: 'boom', x: ev.x, y: ev.y, r: ev.r, t: 0, d: 0.4 }); SFX.boom(); G.shake = Math.max(G.shake, 5); break;
    case 'kl': deathFx(ev.x, ev.y, ENEMY_KEYS[ev.t]); G.stats.kills++; break;
    case 'skfx': if (!G.host && ev.id !== G.me) skillFx(ev.id, ev.h, ev.x, ev.y); break;
    case 'chestfx': chestFx(ev.x, ev.y); break;
    case 'rf': pushBullet(ev.o, { dmg: 0, spd: 220, col: '#8ff3ff', life: 1.5 }, ev.x, ev.y, ev.a, false); break;
    case 'banner': showBanner(ev.t, ev.s); if (ev.s === '보스 등장!') SFX.boss(); break;
    case 'revive': { const p = G.players.get(ev.id); if (p) G.fx.push({ k: 'ring', x: p.x, y: p.y, r: 24, t: 0, d: 0.5, col: '#6fdc6a' }); SFX.revive(); break; }
    case 'down': if (ev.id !== G.me) UI.toast(`${(G.players.get(ev.id) || {}).name || '동료'}님이 쓰러졌어요! 옆에 서서 살려주세요`); break;
    // 나에게 온 것
    case 'gain': if (ev.id !== G.me) break;
      if (ev.en) { ME.energy = Math.min(ME.maxEnergy, ME.energy + ev.en); SFX.energy(); }
      if (ev.co) { ME.coins += ev.co; SFX.coin(); }
      if (ev.fx === 'hp') { SFX.pick(); const p = G.players.get(G.me); G.nums.push({ x: p.x, y: p.y - 14, v: '+체력', t: 0, col: '#ff6a8a' }); }
      if (ev.fx === 'mp') { SFX.pick(); const p = G.players.get(G.me); G.nums.push({ x: p.x, y: p.y - 14, v: '+에너지', t: 0, col: '#6ab4ff' }); }
      break;
    case 'got': if (ev.id !== G.me) break; giveWeapon(ev.w, ev.slot); break;
    case 'tp': if (ev.id !== G.me) break; { const p = G.players.get(G.me); p.x = ev.x; p.y = ev.y; } break;
  }
}
function giveWeapon(w, slot) {
  if (slot !== 0 && slot !== 1) slot = ME.weapons[1] < 0 ? 1 : ME.cur;
  ME.weapons[slot] = w; ME.cur = slot;
  SFX.pick();
  UI.toast(`${WEAPONS[w].name} 획득 (${RARITY[WEAPONS[w].r].name})`);
}
function applySnap(s) {
  const seen = new Set();
  for (const a of s.p) {
    const [id, x, y, ang, hp, mhp, ar, mar, f, w, rev] = a;
    const p = G.players.get(id); if (!p) continue;
    if (id !== G.me) { p.tx = x; p.ty = y; p.a = ang / 100; p.w = w; p.moving = !!(f & 16); }
    p.hp = hp; p.mhp = mhp; p.ar = ar; p.mar = mar; p.down = !!(f & 1); p.inv = f & 2 ? 0.2 : 0; p.shield = f & 4 ? 1 : 0; p.rev = rev / 100;
  }
  for (const a of s.e) {
    const [id, ti, x, y, hp, mhp, f] = a;
    seen.add(id);
    let e = G.enemies.get(id);
    const type = ENEMY_KEYS[ti];
    if (!e) { e = { id, type, ti, def: ENEMIES[type], x, y, tx: x, ty: y, r: ENEMIES[type].r, hp, mhp, flash: 0, frozen: 0, face: 1, windup: 0, air: 0 }; G.enemies.set(id, e); if (e.def.boss !== undefined) G.boss = id; }
    if (hp < e.hp) G.nums.push({ x: e.x + rnd(-4, 4), y: e.y - e.r - 2, v: e.hp - hp, t: 0 });
    e.tx = x; e.ty = y; e.hp = hp; e.mhp = mhp;
    if (f & 1) e.flash = 0.08;
    e.frozen = f & 2 ? 1 : 0; e.face = f & 4 ? -1 : 1; e.windup = f & 8 ? 1 : 0; e.air = f & 16 ? 1 : 0;
  }
  for (const id of [...G.enemies.keys()]) if (!seen.has(id)) { G.enemies.delete(id); if (G.boss === id) G.boss = null; }
  G.turrets = (s.tu || []).map(([x, y, a]) => ({ x, y, a: a / 100 }));
}
function makeSnap() {
  const p = [], e = [];
  for (const q of G.players.values()) p.push([q.id, q.x | 0, q.y | 0, Math.round(q.a * 100), q.hp, q.mhp, q.ar, q.mar, (q.down ? 1 : 0) | (q.inv > 0 ? 2 : 0) | (q.shield > 0 ? 4 : 0) | (q.moving ? 16 : 0), q.w, Math.round(q.rev * 100)]);
  for (const q of G.enemies.values()) e.push([q.id, q.ti, Math.round(q.x), Math.round(q.y), Math.ceil(q.hp), q.mhp, (q.flash > 0 ? 1 : 0) | (q.frozen > 0 ? 2 : 0) | (q.face < 0 ? 4 : 0) | ((q.def.move === 'charge' && q.st === 1) ? 8 : 0) | (q.air > 0 ? 16 : 0)]);
  return { t: 's', p, e, tu: G.turrets.map(t => [t.x | 0, t.y | 0, Math.round(t.a * 100)]) };
}
function flushNet() {
  if (!G.online || !G.host) return;
  if (G.rm.length) { G.queue.push({ k: 'rm', l: G.rm }); G.rm = []; }
  if (G.queue.length) { Net.broadcast({ t: 'q', l: G.queue }); G.queue = []; }
}

// ---------- 내 캐릭터 ----------
function localUpdate(dt) {
  const p = G.players.get(G.me);
  if (!p) return;
  const h = HEROES[p.hero];
  ME.fireCd -= dt; ME.skillCd = Math.max(0, ME.skillCd - dt); ME.rapid = Math.max(0, ME.rapid - dt);
  const inp = Input.state();
  let mx = inp.mx, my = inp.my;
  p.moving = false;
  if (!p.down) {
    if (ME.dash > 0) {
      ME.dash -= dt; moveCircle(G.M, p, ME.dvx * dt, ME.dvy * dt, 5);
      if (Math.random() < 0.8) G.fx.push({ k: 'ghost', x: p.x, y: p.y, hero: p.hero, face: p.face, t: 0, d: 0.25 });
    } else if (mx || my) {
      moveCircle(G.M, p, mx * h.speed * dt, my * h.speed * dt, 5);
      p.moving = true;
    }
  }
  // 조준: 자동 조준
  let target = null, bd = 230 * 230;
  for (const e of G.enemies.values()) {
    const d = dist2(e.x, e.y, p.x, p.y);
    if (d < bd && lineOfSight(G.M, p.x, p.y, e.x, e.y)) { bd = d; target = e; }
  }
  ME.autoTarget = target;
  if (inp.aim !== null) p.a = inp.aim;
  else if (target) p.a = Math.atan2(target.y - p.y, target.x - p.x);
  else if (mx || my) p.a = Math.atan2(my, mx);
  p.face = Math.cos(p.a) < 0 ? -1 : 1;
  const wid = ME.weapons[ME.cur], w = WEAPONS[wid];
  p.w = wid;
  const wantFire = inp.fire || (UI.settings.autofire && target && !p.down);
  if (wantFire && !p.down && ME.fireCd <= 0) {
    if (ME.energy >= w.cost) {
      ME.energy -= w.cost;
      ME.fireCd = 1 / (w.rate * (ME.rapid > 0 ? 2 : 1));
      const s = (Math.random() * 1e9) | 0;
      const hx = p.x + p.face * 2, hy = p.y + 1;
      spawnShot(G.me, w, hx, hy, p.a, s, G.host);
      act({ t: 'sh', w: wid, x: +hx.toFixed(1), y: +hy.toFixed(1), a: +p.a.toFixed(3), s });
      SFX.shoot(w);
      if (!w.melee) { G.fx.push({ k: 'muzzle', x: hx + Math.cos(p.a) * 11, y: hy + Math.sin(p.a) * 11, t: 0, d: 0.06, col: w.col }); G.shake = Math.max(G.shake, w.big ? 3 : w.dmg > 10 ? 2.5 : 0.6); }
      ME.recoil = 2;
    } else if (inp.firePressed) { UI.toast('에너지가 부족해요! 권총(0 소모)으로 바꿔 보세요'); }
  }
  ME.recoil = Math.max(0, (ME.recoil || 0) - dt * 20);
  // 위치 보내기
  if (!G.host) {
    G.posAcc += dt;
    if (G.posAcc > 0.05) { G.posAcc = 0; Net.toHost({ t: 'pos', x: +p.x.toFixed(1), y: +p.y.toFixed(1), a: +p.a.toFixed(2), w: wid, m: p.moving ? 1 : 0 }); }
  }
  // 피격 느낌
  const hpar = p.hp + p.ar;
  if (ME.lastHpAr >= 0 && hpar < ME.lastHpAr) { G.shake = Math.max(G.shake, 5); G.flash = 0.25; SFX.hurt(); if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) {} }
  ME.lastHpAr = hpar;
  // 방 발견 (미니맵)
  const r = roomAtPx(G.M, p.x, p.y);
  if (r) r.seen = true;
}
function useSkill() {
  const p = G.players.get(G.me);
  if (!p || p.down || ME.skillCd > 0 || G.mode !== 'play') return;
  const h = HEROES[p.hero];
  ME.skillCd = h.cd;
  if (p.hero === 1) {
    const inp = Input.state();
    let dx = inp.mx, dy = inp.my; if (!dx && !dy) { dx = Math.cos(p.a); dy = Math.sin(p.a); }
    const l = Math.hypot(dx, dy) || 1; ME.dash = 0.2; ME.dvx = dx / l * 330; ME.dvy = dy / l * 330; ME.rapid = 3;
  }
  act({ t: 'sk', x: +p.x.toFixed(1), y: +p.y.toFixed(1) });
  if (!G.host) skillFx(G.me, p.hero, p.x, p.y);
}
function swapWeapon() { if (ME.weapons[1] < 0) return; ME.cur = 1 - ME.cur; SFX.pick(); }
function nearInteract() {
  const p = G.players.get(G.me); if (!p || p.down) return null;
  let best = null, bd = 26;
  for (const it of G.items.values()) {
    if (!['wpn', 'chest', 'rchest', 'bchest', 'vend', 'portal'].includes(it.k)) continue;
    const d = Math.hypot(it.x - p.x, it.y - p.y) - (it.k === 'portal' || it.k === 'vend' ? 6 : 0);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}
const VEND_COST = 20;
function interact() {
  const it = nearInteract(); if (!it) return;
  if (it.k === 'wpn') {
    const slot = ME.weapons[1] < 0 ? 1 : ME.cur;
    const drop = ME.weapons[1] < 0 ? -1 : ME.weapons[slot];
    act({ t: 'pk', i: it.i, drop, slot });
  } else if (it.k === 'vend') {
    if (ME.coins < VEND_COST) { UI.toast(`코인이 ${VEND_COST}개 필요해요 (지금 ${ME.coins}개)`); return; }
    ME.coins -= VEND_COST; act({ t: 'use', i: it.i });
  } else act({ t: 'use', i: it.i });
}

// ---------- 매 프레임 ----------
function update(dt) {
  if (G.mode !== 'play') return;
  G.time += dt;
  localUpdate(dt);
  if (G.host) hostUpdate(dt);
  else {
    // 다른 플레이어·적 부드럽게
    const k = Math.min(1, dt * 12);
    for (const p of G.players.values()) if (p.id !== G.me) { p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.face = Math.cos(p.a) < 0 ? -1 : 1; }
    for (const e of G.enemies.values()) { e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; e.flash = Math.max(0, e.flash - dt); }
    // 아이템 자석 연출
    const me = G.players.get(G.me);
    for (const it of G.items.values()) if ((it.k === 'en' || it.k === 'co') && me && !me.down) { const d = Math.hypot(me.x - it.x, me.y - it.y); if (d < 40 && d > 2) { const s = Math.min(d, 150 * dt); it.x += (me.x - it.x) / d * s; it.y += (me.y - it.y) / d * s; } }
  }
  updateBullets(dt);
  for (const p of G.players.values()) { p.anim += dt * (p.moving ? 10 : 0); p.dashFx = Math.max(0, (p.dashFx || 0) - dt); if (G.host) {} }
  // 효과
  for (let i = G.fx.length - 1; i >= 0; i--) { const f = G.fx[i]; f.t += dt; if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.g || 0) * dt; f.vx *= 1 - dt * 2; } if (f.t >= f.d) G.fx.splice(i, 1); }
  for (let i = G.nums.length - 1; i >= 0; i--) { const n = G.nums[i]; n.t += dt; n.y -= 20 * dt; if (n.t > 0.7) G.nums.splice(i, 1); }
  if (G.fx.length > 700) G.fx.splice(0, G.fx.length - 700);
  G.shake = Math.max(0, G.shake - dt * 25); G.flash = Math.max(0, G.flash - dt);
  if (G.banner) { G.banner.time -= dt; if (G.banner.time <= 0) G.banner = null; }
  // 네트워크
  if (G.online && G.host) {
    G.netAcc += dt; G.snapAcc += dt;
    if (G.netAcc >= 0.033) { G.netAcc = 0; flushNet(); }
    if (G.snapAcc >= 0.066) { G.snapAcc = 0; Net.broadcast(makeSnap()); }
  }
}

// ---------- 그리기 ----------
let VW = 480, VH = 270;
function render(ctx, lc, lctx, scale) {
  const M = G.M, me = G.players.get(G.me);
  if (!M || !me) return;
  // 카메라
  const lead = 16;
  const tx = me.x + Math.cos(me.a) * lead, ty = me.y + Math.sin(me.a) * lead;
  G.camX += (tx - G.camX) * 0.12; G.camY += (ty - G.camY) * 0.12;
  const sx = G.shake ? rnd(-G.shake, G.shake) * 0.5 : 0, sy = G.shake ? rnd(-G.shake, G.shake) * 0.5 : 0;
  const cx = Math.round(G.camX - VW / 2 + sx), cy = Math.round(G.camY - VH / 2 + sy);
  const g = lctx;
  g.fillStyle = '#0b0910'; g.fillRect(0, 0, VW, VH);
  g.drawImage(G.floor, cx, cy, VW, VH, 0, 0, VW, VH);
  g.save(); g.translate(-cx, -cy);
  const inView = (x, y, m = 40) => x > cx - m && x < cx + VW + m && y > cy - m && y < cy + VH + m;
  // 문
  for (const r of M.rooms) if (r.state === 'fight') for (const [x, y] of r.doors) {
    const px = x * TILE, py = y * TILE; if (!inView(px, py)) continue;
    g.fillStyle = '#2a2430'; g.fillRect(px, py, TILE, TILE);
    g.fillStyle = '#ff5a5a'; for (let i = 2; i < 16; i += 5) g.fillRect(px + i, py + 1, 2, 14);
    g.fillStyle = 'rgba(255,90,90,0.25)'; g.fillRect(px, py, TILE, TILE);
  }
  // 아이템
  for (const it of G.items.values()) { if (inView(it.x, it.y)) drawItem(g, it); }
  // 상자
  for (const c of M.crates) if (c.alive) { const px = c.x * TILE, py = c.y * TILE; if (!inView(px, py)) continue; g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(px + 1, py + 12, 15, 4); g.drawImage(c.kind ? ISPR.barrel : ISPR.crate, px + (c.kind ? 1 : 0), py - 2); }
  // 소환 표시
  for (const f of G.fx) if (f.k === 'mark') drawMark(g, f);
  // 그릴 것들 (y 정렬)
  const ds = [];
  for (const p of G.players.values()) ds.push({ y: p.y, f: () => drawPlayer(g, p) });
  for (const e of G.enemies.values()) if (inView(e.x, e.y)) ds.push({ y: e.y + (e.def.boss !== undefined ? 6 : 0), f: () => drawEnemy(g, e) });
  for (const t of G.turrets) ds.push({ y: t.y, f: () => drawTurret(g, t) });
  for (const f of G.fx) if (f.k === 'ghost') ds.push({ y: f.y - 1, f: () => { g.globalAlpha = 0.4 * (1 - f.t / f.d); drawHeroAt(g, f.hero, f.x, f.y, f.face, 0, false); g.globalAlpha = 1; } });
  ds.sort((a, b) => a.y - b.y);
  for (const d of ds) d.f();
  // 총알
  g.globalCompositeOperation = 'lighter';
  for (const b of G.pb) if (inView(b.x, b.y, 10)) { const gl = glowSprite(b.col, b.kind === 'rocket' ? 12 : 8); g.drawImage(gl, b.x - gl.width / 2, b.y - gl.height / 2); }
  for (const b of G.eb) if (inView(b.x, b.y, 10)) { const gl = glowSprite(EB_COL[b.k][0], 9); g.drawImage(gl, b.x - 9, b.y - 9); }
  g.globalCompositeOperation = 'source-over';
  for (const b of G.pb) if (inView(b.x, b.y, 10)) drawPBullet(g, b);
  for (const b of G.eb) if (inView(b.x, b.y, 10)) drawEBullet(g, b);
  // 효과
  for (const f of G.fx) drawFx(g, f);
  g.restore();
  // 분위기: 가장자리 어둡게
  if (!render.vig || render.vig.w !== VW || render.vig.h !== VH) {
    const c = document.createElement('canvas'); c.width = VW; c.height = VH; const vg = c.getContext('2d');
    const gr = vg.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.65);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.55)');
    vg.fillStyle = gr; vg.fillRect(0, 0, VW, VH); render.vig = { c, w: VW, h: VH };
  }
  g.drawImage(render.vig.c, 0, 0);
  if (G.flash > 0) { g.fillStyle = `rgba(255,40,60,${G.flash * 0.6})`; g.fillRect(0, 0, VW, VH); }
  // 화면에 확대
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(lc, 0, 0, VW, VH, 0, 0, VW * scale, VH * scale);
  // 고해상도 글자: 이름, 피해 숫자, 아이템 이름
  const ws = (x, y) => [(x - cx) * scale, (y - cy) * scale];
  ctx.textAlign = 'center';
  ctx.font = `${Math.round(scale * 4.2)}px Galmuri11, monospace`;
  for (const p of G.players.values()) {
    if (p.id === G.me && G.players.size === 1) continue;
    const [x, y] = ws(p.x, p.y - 20);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(p.name, x + 1, y + 1);
    ctx.fillStyle = p.id === G.me ? '#ffe08a' : HEROES[p.hero].color; ctx.fillText(p.name, x, y);
    if (p.down) { ctx.fillStyle = '#ff6a6a'; ctx.fillText(p.id === G.me ? '쓰러짐' : '살려주세요!', x, y - scale * 5); }
  }
  ctx.font = `bold ${Math.round(scale * 5)}px Galmuri11, monospace`;
  for (const n of G.nums) {
    const [x, y] = ws(n.x, n.y); ctx.globalAlpha = 1 - Math.max(0, n.t - 0.4) / 0.3;
    ctx.fillStyle = '#000'; ctx.fillText(n.v, x + 1, y + 1);
    ctx.fillStyle = n.col || (n.crit ? '#ffd23a' : '#ffffff'); ctx.fillText(n.v, x, y);
  }
  ctx.globalAlpha = 1;
  const near = nearInteract();
  if (near && near.k === 'wpn') {
    const w = WEAPONS[near.w], [x, y] = ws(near.x, near.y - 12);
    ctx.font = `${Math.round(scale * 4.2)}px Galmuri11, monospace`;
    const txt = `${w.name}  ⚡${w.cost}  공격 ${w.dmg}${w.n > 1 ? '×' + w.n : ''}`;
    const tw = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(10,8,16,0.85)'; ctx.fillRect(x - tw / 2 - 8, y - scale * 5, tw + 16, scale * 7);
    ctx.fillStyle = RARITY[w.r].color; ctx.fillText(txt, x, y);
  }
}
function drawHeroAt(g, hero, x, y, face, anim, white) {
  const S = HERO_SPR[hero], fr = S.frames[Math.floor(anim) % 4];
  const img = white ? S.white : fr;
  const bob = Math.floor(anim) % 2 ? -1 : 0;
  g.save(); g.translate(Math.round(x), Math.round(y + bob));
  if (face < 0) g.scale(-1, 1);
  g.drawImage(img, -img.width / 2, -img.height + 4);
  g.restore();
}
function drawPlayer(g, p) {
  const x = p.x, y = p.y;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y + 3, 6, 2.5, 0, 0, 6.29); g.fill();
  if (p.down) {
    g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(Math.PI / 2 * p.face); g.globalAlpha = 0.7;
    const img = HERO_SPR[p.hero].frames[0]; g.drawImage(img, -img.width / 2, -img.height / 2); g.restore(); g.globalAlpha = 1;
    if (p.rev > 0) { g.strokeStyle = '#6fdc6a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 10, 8, -Math.PI / 2, -Math.PI / 2 + p.rev * Math.PI * 2); g.stroke(); }
    return;
  }
  const blink = p.inv > 0 && p.shield <= 0 && Math.floor(G.time * 20) % 2 === 0;
  if (blink) g.globalAlpha = 0.45;
  const aimLeft = Math.cos(p.a) < 0;
  const wImg = WSPR[p.w] || WSPR[0];
  const rec = p.id === G.me ? (ME.recoil || 0) : 0;
  const behind = Math.sin(p.a) < -0.3;
  const drawW = () => {
    g.save(); g.translate(Math.round(x + (aimLeft ? -2 : 2)), Math.round(y - 3));
    const w = WEAPONS[p.w];
    let ang = p.a;
    if (w && w.melee) { const sl = G.fx.find(f => f.k === 'slash' && Math.hypot(f.x - x, f.y - y) < 6 && f.t < f.d); if (sl) ang = p.a + (sl.t / sl.d - 0.5) * w.melee.arc * (aimLeft ? -1 : 1); }
    g.rotate(ang); if (aimLeft) g.scale(1, -1);
    g.drawImage(wImg, -6 - rec, -7);
    g.restore();
  };
  if (behind) drawW();
  drawHeroAt(g, p.hero, x, y, p.face, p.moving ? p.anim : 0, false);
  if (!behind) drawW();
  g.globalAlpha = 1;
  if (p.shield > 0) {
    g.strokeStyle = 'rgba(143,243,255,0.9)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y - 6, 16 + Math.sin(G.time * 10), 0, 6.29); g.stroke();
    g.fillStyle = 'rgba(143,243,255,0.15)'; g.fill();
  }
  if (p.id === G.me && ME.autoTarget && G.enemies.has(ME.autoTarget.id)) {
    const e = ME.autoTarget; g.strokeStyle = '#ff5a5a'; g.lineWidth = 1;
    const s = e.r + 4 + Math.sin(G.time * 8); g.beginPath();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + G.time * 2; g.moveTo(e.x + Math.cos(a) * s, e.y - 4 + Math.sin(a) * s); g.lineTo(e.x + Math.cos(a) * (s - 3), e.y - 4 + Math.sin(a) * (s - 3)); }
    g.stroke();
  }
}
function drawEnemy(g, e) {
  const S = ENEMY_SPR[e.type], sc = S.scale, img = e.flash > 0 ? S.white : S.img;
  const fly = e.def.fly ? Math.sin(G.time * 6 + e.id) * 2 - 3 : 0;
  const air = e.air > 0 ? -18 : 0;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(e.x, e.y + 3, e.r * 0.9, e.r * 0.35, 0, 0, 6.29); g.fill();
  let jig = e.windup > 0 ? rnd(-1, 1) : 0;
  const squash = e.def.move === 'chase' && e.type === 'slime' ? 1 + Math.sin(G.time * 10 + e.id) * 0.08 : 1;
  g.save(); g.translate(Math.round(e.x + jig), Math.round(e.y + fly + air));
  if (e.face < 0) g.scale(-1, 1);
  g.scale(sc * (2 - squash), sc * squash);
  g.drawImage(img, -img.width / 2, -img.height + 3);
  g.restore();
  if (e.frozen > 0) { g.fillStyle = 'rgba(150,220,255,0.45)'; g.fillRect(e.x - e.r - 1, e.y - img.height * sc + 3 + fly, e.r * 2 + 2, img.height * sc - 2); }
  if (e.windup > 0) { g.fillStyle = '#ff3a3a'; g.fillRect(e.x - 1, e.y - img.height * sc - 4, 2, 4); }
  if (e.def.boss === undefined && e.hp < e.mhp) { const w = 14; g.fillStyle = '#1a1020'; g.fillRect(e.x - w / 2, e.y + 6, w, 2); g.fillStyle = '#ff4a5a'; g.fillRect(e.x - w / 2, e.y + 6, w * Math.max(0, e.hp / e.mhp), 2); }
}
function drawTurret(g, t) {
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(t.x - 6, t.y + 1, 12, 3);
  g.fillStyle = '#5a5a6a'; g.fillRect(t.x - 5, t.y - 4, 10, 6); g.fillStyle = '#ffb347'; g.fillRect(t.x - 5, t.y - 4, 10, 1);
  g.save(); g.translate(t.x, t.y - 6); g.rotate(t.a); g.fillStyle = '#3a3a4a'; g.fillRect(-2, -2, 10, 4); g.fillStyle = '#ffb347'; g.fillRect(6, -1, 3, 2); g.restore();
  g.fillStyle = '#7fe7ff'; g.fillRect(t.x - 1, t.y - 8, 2, 2);
}
function drawItem(g, it) {
  const t = G.time, bob = Math.sin(t * 4 + it.i) * 1.5;
  switch (it.k) {
    case 'en': { g.globalCompositeOperation = 'lighter'; const gl = glowSprite('#3a8aff', 7); g.drawImage(gl, it.x - 7, it.y - 7 + bob); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#8ac8ff'; g.fillRect(it.x - 1, it.y - 2 + bob, 2, 4); g.fillRect(it.x - 2, it.y - 1 + bob, 4, 2); break; }
    case 'co': { const w = Math.abs(Math.cos(t * 5 + it.i)) * 3 + 1; g.fillStyle = '#b8860b'; g.fillRect(it.x - w / 2 - 0.5, it.y - 3 + bob, w + 1, 6); g.fillStyle = '#ffd23a'; g.fillRect(it.x - w / 2, it.y - 2.5 + bob, w, 5); break; }
    case 'hp': case 'mp': g.drawImage(ISPR[it.k], it.x - 4, it.y - 6 + bob); break;
    case 'wpn': {
      const w = WEAPONS[it.w];
      g.globalCompositeOperation = 'lighter'; const gl = glowSprite(RARITY[w.r].color, 14); g.drawImage(gl, it.x - 14, it.y - 14); g.globalCompositeOperation = 'source-over';
      g.save(); g.translate(it.x, it.y + bob); g.rotate(-0.4); g.drawImage(WSPR[it.w], -12, -7); g.restore();
      break;
    }
    case 'chest': case 'rchest': case 'bchest': { const img = ISPR[it.k]; g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(it.x - img.width / 2 + 1, it.y + 2, img.width - 2, 3); g.drawImage(img, it.x - img.width / 2, it.y - img.height + 4); if (it.k === 'bchest') { g.globalCompositeOperation = 'lighter'; const gl = glowSprite('#ffcc33', 18); g.drawImage(gl, it.x - 18, it.y - 22); g.globalCompositeOperation = 'source-over'; } break; }
    case 'vend': { const img = ISPR.vend; g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(it.x - 7, it.y + 2, 14, 3); g.drawImage(img, it.x - img.width / 2, it.y - img.height + 4); g.fillStyle = Math.floor(t * 3) % 2 ? '#ffd23a' : '#ff6a3a'; g.fillRect(it.x - 4, it.y - 14, 8, 1); break; }
    case 'portal': {
      for (let i = 0; i < 4; i++) { g.strokeStyle = ['#c37bff', '#5aa8ff', '#9fe8ff', '#ffffff'][i]; g.lineWidth = 2; g.beginPath(); g.ellipse(it.x, it.y, 13 - i * 3 + Math.sin(t * 5 + i) * 1, 7 - i * 1.5, 0, t * (2 + i) % 6.28, t * (2 + i) % 6.28 + 4.5); g.stroke(); }
      g.globalCompositeOperation = 'lighter'; const gl = glowSprite('#9f6aff', 22); g.drawImage(gl, it.x - 22, it.y - 22); g.globalCompositeOperation = 'source-over';
      if (Math.random() < 0.3) G.fx.push({ k: 'part', x: it.x + rnd(-10, 10), y: it.y + rnd(-4, 4), vx: 0, vy: -25, t: 0, d: 0.6, col: '#c37bff', s: 1, g: 0 });
      break;
    }
  }
}
function drawMark(g, f) {
  const k = f.t / f.d, r = (f.big ? 22 : 8) * (0.5 + k * 0.5);
  g.strokeStyle = `rgba(255,80,120,${0.9 - k * 0.3})`; g.lineWidth = 1;
  g.beginPath(); g.ellipse(f.x, f.y + 2, r, r * 0.45, 0, 0, 6.29); g.stroke();
  g.save(); g.translate(f.x, f.y + 2); g.scale(1, 0.45); g.rotate(G.time * 4);
  g.fillStyle = 'rgba(255,80,120,0.5)'; for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.fillRect(r * 0.4, -1, r * 0.5, 2); } g.restore();
}
function drawPBullet(g, b) {
  const a = Math.atan2(b.vy, b.vx);
  if (b.trail && b.trail.length > 2) { g.strokeStyle = b.col; g.globalAlpha = 0.5; g.lineWidth = b.kind === 'rocket' ? 2 : 1; g.beginPath(); g.moveTo(b.trail[0], b.trail[1]); for (let i = 2; i < b.trail.length; i += 2) g.lineTo(b.trail[i], b.trail[i + 1]); g.lineTo(b.x, b.y); g.stroke(); g.globalAlpha = 1; }
  g.save(); g.translate(b.x, b.y); g.rotate(a);
  switch (b.kind) {
    case 'arrow': g.fillStyle = '#7a5a3a'; g.fillRect(-6, -0.5, 9, 1); g.fillStyle = b.col; g.fillRect(2, -1, 3, 2); g.fillStyle = '#fff'; g.fillRect(-6, -1.5, 2, 1); g.fillRect(-6, 0.5, 2, 1); break;
    case 'flame': { const k = b.age / b.life, s = 2 + k * 5; g.globalAlpha = 1 - k * 0.8; g.fillStyle = k < 0.3 ? '#fff2a0' : k < 0.6 ? '#ff9a2a' : '#c43a2a'; g.fillRect(-s / 2, -s / 2, s, s); g.globalAlpha = 1; break; }
    case 'laser': g.fillStyle = b.col; g.fillRect(-7, -1, 12, 2); g.fillStyle = '#fff'; g.fillRect(-5, -0.5, 9, 1); break;
    case 'rocket': g.fillStyle = '#d8d8e0'; g.fillRect(-4, -2, 7, 4); g.fillStyle = b.col; g.fillRect(3, -1.5, 2, 3); g.fillStyle = '#ffe08a'; g.fillRect(-6, -1, 2, 2); break;
    case 'ice': g.fillStyle = '#d8f8ff'; g.fillRect(-3, -3, 6, 6); g.fillStyle = b.col; g.fillRect(-2, -2, 4, 4); break;
    case 'boomer': g.rotate(b.age * 20); g.fillStyle = b.col; g.fillRect(-1, -5, 2, 10); g.fillRect(-5, -1, 10, 2); break;
    case 'bee': g.fillStyle = '#ffd23a'; g.fillRect(-2, -1.5, 4, 3); g.fillStyle = '#2a2a2a'; g.fillRect(-1, -1.5, 1, 3); g.fillStyle = '#fff'; g.fillRect(-1, -3, 2, 1); break;
    case 'wave': g.strokeStyle = b.col; g.lineWidth = 2; g.beginPath(); g.arc(-6, 0, 10, -1, 1); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.arc(-6, 0, 10, -0.8, 0.8); g.stroke(); break;
    default: g.fillStyle = b.col; g.fillRect(-3, -1, 5, 2); g.fillStyle = '#fff'; g.fillRect(-1, -0.5, 2, 1);
  }
  g.restore();
}
function drawEBullet(g, b) {
  const [c1, c2] = EB_COL[b.k];
  if (b.k === 1) { const a = Math.atan2(b.vy, b.vx); g.save(); g.translate(b.x, b.y); g.rotate(a); g.fillStyle = '#e8e2d0'; g.fillRect(-5, -0.5, 8, 1); g.fillStyle = '#ff4a4a'; g.fillRect(2, -1, 3, 2); g.restore(); return; }
  const r = b.r;
  g.fillStyle = c1; g.beginPath(); g.arc(b.x, b.y, r, 0, 6.29); g.fill();
  g.fillStyle = c2; g.beginPath(); g.arc(b.x, b.y, r * 0.5, 0, 6.29); g.fill();
}
function drawFx(g, f) {
  const k = f.t / f.d;
  switch (f.k) {
    case 'part': g.globalAlpha = 1 - k; g.fillStyle = f.col; g.fillRect(f.x - f.s / 2, f.y - f.s / 2, f.s, f.s); g.globalAlpha = 1; break;
    case 'spark': g.fillStyle = f.col; const s = 4 * (1 - k); g.fillRect(f.x - s / 2, f.y - 0.5, s, 1); g.fillRect(f.x - 0.5, f.y - s / 2, 1, s); break;
    case 'ring': g.strokeStyle = f.col; g.globalAlpha = 1 - k; g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y - 4, f.r * k, 0, 6.29); g.stroke(); g.globalAlpha = 1; break;
    case 'boom': {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(255,${180 - k * 120},60,${1 - k})`; g.beginPath(); g.arc(f.x, f.y, f.r * (0.4 + k * 0.6), 0, 6.29); g.fill();
      g.fillStyle = `rgba(255,255,200,${(1 - k) * 0.9})`; g.beginPath(); g.arc(f.x, f.y, f.r * 0.4 * (1 - k), 0, 6.29); g.fill();
      g.globalCompositeOperation = 'source-over';
      if (f.t < 0.02 && !f.done) { f.done = true; for (let i = 0; i < 14; i++) G.fx.push({ k: 'part', x: f.x, y: f.y, vx: rnd(-120, 120), vy: rnd(-120, 120), t: 0, d: rnd(0.3, 0.6), col: pick(['#ffd23a', '#ff7a2a', '#5a5a5a']), s: 2, g: 0 }); }
      break;
    }
    case 'slash': {
      g.strokeStyle = f.col; g.globalAlpha = 1 - k; g.lineWidth = 3;
      const a0 = f.a - f.arc / 2, a1 = f.a - f.arc / 2 + f.arc * Math.min(1, k * 2.2);
      g.beginPath(); g.arc(f.x, f.y - 3, f.r * 0.85, a0, a1); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.arc(f.x, f.y - 3, f.r * 0.85 - 2, a0, a1); g.stroke();
      g.globalAlpha = 1; break;
    }
    case 'muzzle': g.globalCompositeOperation = 'lighter'; { const gl = glowSprite(f.col, 9); g.drawImage(gl, f.x - 9, f.y - 9); } g.fillStyle = '#fff'; g.fillRect(f.x - 1.5, f.y - 1.5, 3, 3); g.globalCompositeOperation = 'source-over'; break;
  }
}
