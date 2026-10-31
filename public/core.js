// 던전 크루 — 공용 도구, 소리, 던전 생성
'use strict';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];

// ---------- 소리 (8비트 합성음) ----------
const SFX = (() => {
  let ac = null, master = null, on = true, last = {};
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.35; master.connect(ac.destination); } catch (e) { ac = null; }
  }
  function tone(type, f0, f1, dur, vol = 0.3, delay = 0) {
    if (!ac || !on) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  let noiseBuf = null;
  function noise(dur, vol = 0.3, f = 1200, delay = 0) {
    if (!ac || !on) return;
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = ac.currentTime + delay, s = ac.createBufferSource(), g = ac.createGain(), fl = ac.createBiquadFilter();
    s.buffer = noiseBuf; fl.type = 'lowpass'; fl.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  function lim(k, ms) { const n = performance.now(); if (last[k] && n - last[k] < ms) return false; last[k] = n; return true; }
  return {
    init, set on(v) { on = v; }, get on() { return on; },
    shoot(w) {
      if (!lim('sh', 45)) return;
      if (w.melee) { noise(0.12, 0.25, 3000); tone('triangle', 500, 150, 0.1, 0.12); return; }
      if (w.flame) { noise(0.08, 0.12, 900); return; }
      if (w.big) { noise(0.25, 0.3, 700); tone('square', 180, 60, 0.2, 0.15); return; }
      if (w.shape === 'sniper' || w.trail) { tone('sawtooth', 1400, 200, 0.18, 0.15); noise(0.1, 0.15, 4000); return; }
      if (w.shape === 'shotgun') { noise(0.2, 0.35, 1600); return; }
      tone('square', 900 - w.dmg * 30, 220, 0.07, 0.12);
    },
    hit() { if (lim('hit', 40)) tone('square', 300, 120, 0.05, 0.1); },
    kill() { if (lim('kill', 50)) { noise(0.15, 0.2, 2000); tone('square', 400, 80, 0.15, 0.12); } },
    hurt() { tone('sawtooth', 300, 60, 0.3, 0.3); noise(0.2, 0.25, 800); },
    coin() { if (lim('coin', 60)) { tone('square', 988, 988, 0.05, 0.1); tone('square', 1319, 1319, 0.12, 0.1, 0.05); } },
    energy() { if (lim('en', 50)) tone('sine', 700, 1400, 0.08, 0.12); },
    pick() { tone('square', 523, 523, 0.06, 0.15); tone('square', 784, 784, 0.1, 0.15, 0.06); },
    door() { noise(0.25, 0.25, 500); tone('square', 120, 80, 0.25, 0.15); },
    boom() { noise(0.5, 0.45, 600); tone('sine', 120, 30, 0.4, 0.3); },
    skill() { tone('square', 300, 1200, 0.25, 0.15); tone('triangle', 600, 1800, 0.3, 0.12, 0.05); },
    portal() { for (let i = 0; i < 5; i++) tone('sine', 400 + i * 150, 800 + i * 200, 0.2, 0.1, i * 0.06); },
    chest() { tone('square', 392, 392, 0.08, 0.15); tone('square', 523, 523, 0.08, 0.15, 0.08); tone('square', 659, 659, 0.08, 0.15, 0.16); tone('square', 1046, 1046, 0.2, 0.15, 0.24); },
    spawn() { if (lim('sp', 120)) tone('sine', 200, 600, 0.3, 0.08); },
    eshoot() { if (lim('es', 70)) tone('triangle', 500, 300, 0.06, 0.06); },
    revive() { tone('sine', 523, 1046, 0.4, 0.15); },
    boss() { tone('sawtooth', 110, 55, 1.2, 0.25); noise(1, 0.2, 300); },
  };
})();

// ---------- 던전 생성 ----------
// 타일: 0 = 벽/빈공간, 1 = 바닥, 2 = 닫힌 문
const CELL = 30, GRID = 5;
function genLevel(seed, L) {
  const rng = mulberry32(seed);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const biomeIdx = Math.floor(L / 3) % 3, biome = BIOMES[biomeIdx];
  const isBoss = L % 3 === 2;
  const nBattle = 4 + (L % 3 === 1 ? 1 : 0) + (L >= 9 ? 1 : 0);

  // 1) 방 배치 (격자 위 랜덤 경로)
  let cells, links;
  for (let tries = 0; tries < 200; tries++) {
    cells = new Map(); links = [];
    const key = (x, y) => x + ',' + y;
    let x = 2, y = 2; cells.set(key(x, y), { cx: x, cy: y, type: 'start' });
    const path = [[x, y]];
    let ok = true;
    for (let i = 0; i < nBattle + 1; i++) {
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy])
        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < GRID && ny < GRID && !cells.has(key(nx, ny)));
      if (!opts.length) { ok = false; break; }
      const [nx, ny] = opts[Math.floor(rng() * opts.length)];
      cells.set(key(nx, ny), { cx: nx, cy: ny, type: i === nBattle ? (isBoss ? 'boss' : 'end') : 'battle' });
      links.push([key(x, y), key(nx, ny)]);
      x = nx; y = ny; path.push([x, y]);
    }
    if (!ok) continue;
    // 보물방 곁가지
    const cands = [];
    for (let i = 1; i < path.length - 1; i++) {
      const [px, py] = path[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy;
        if (nx >= 0 && ny >= 0 && nx < GRID && ny < GRID && !cells.has(key(nx, ny))) cands.push([px, py, nx, ny]);
      }
    }
    if (!cands.length) continue;
    const [px, py, nx, ny] = cands[Math.floor(rng() * cands.length)];
    cells.set(key(nx, ny), { cx: nx, cy: ny, type: 'chest' });
    links.push([key(px, py), key(nx, ny)]);
    break;
  }

  const W = CELL * GRID, H = CELL * GRID;
  const tiles = new Uint8Array(W * H);
  const rooms = [];
  const idx = {};
  for (const [k, c] of cells) {
    let w, h;
    if (c.type === 'battle') { w = 15 + 2 * ri(0, 3); h = 13 + 2 * ri(0, 3); }
    else if (c.type === 'boss') { w = 25; h = 21; }
    else { w = 11; h = 11; }
    const cx = c.cx * CELL + 15, cy = c.cy * CELL + 15;
    const r = { i: rooms.length, type: c.type, gx: c.cx, gy: c.cy, cx, cy, x0: cx - (w - 1) / 2, y0: cy - (h - 1) / 2, x1: cx + (w - 1) / 2, y1: cy + (h - 1) / 2,
      doors: [], state: c.type === 'battle' || c.type === 'boss' ? 'idle' : 'clear', seen: c.type === 'start' };
    for (let yy = r.y0; yy <= r.y1; yy++) for (let xx = r.x0; xx <= r.x1; xx++) tiles[yy * W + xx] = 1;
    idx[k] = r; rooms.push(r);
  }
  const corridors = [];
  for (const [ka, kb] of links) {
    let A = idx[ka], B = idx[kb];
    if (A.gy === B.gy) {
      if (A.gx > B.gx) [A, B] = [B, A];
      const y = A.cy;
      for (let xx = A.x1 + 1; xx <= B.x0 - 1; xx++) for (let yy = y - 1; yy <= y + 1; yy++) tiles[yy * W + xx] = 1;
      for (let yy = y - 1; yy <= y + 1; yy++) { A.doors.push([A.x1 + 1, yy]); B.doors.push([B.x0 - 1, yy]); }
      corridors.push({ x0: A.x1 + 1, y0: y - 1, x1: B.x0 - 1, y1: y + 1, a: A.i, b: B.i });
    } else {
      if (A.gy > B.gy) [A, B] = [B, A];
      const x = A.cx;
      for (let yy = A.y1 + 1; yy <= B.y0 - 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) tiles[yy * W + xx] = 1;
      for (let xx = x - 1; xx <= x + 1; xx++) { A.doors.push([xx, A.y1 + 1]); B.doors.push([xx, B.y0 - 1]); }
      corridors.push({ x0: x - 1, y0: A.y1 + 1, x1: x + 1, y1: B.y0 - 1, a: A.i, b: B.i });
    }
  }

  // 2) 엄폐물 (기둥, 상자)
  const crates = [];
  for (const r of rooms) {
    if (r.type !== 'battle') continue;
    const pat = ri(0, 4);
    const block = (x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) tiles[yy * W + xx] = 0; };
    const qx = Math.floor((r.x1 - r.x0) / 4), qy = Math.floor((r.y1 - r.y0) / 4);
    if (pat === 0) { block(r.x0 + qx, r.y0 + qy, 2, 2); block(r.x1 - qx - 1, r.y0 + qy, 2, 2); block(r.x0 + qx, r.y1 - qy - 1, 2, 2); block(r.x1 - qx - 1, r.y1 - qy - 1, 2, 2); }
    else if (pat === 1) { block(r.cx - 1, r.cy - 1, 3, 3); }
    else if (pat === 2) { block(r.cx - 3, r.y0 + qy, 7, 1); block(r.cx - 3, r.y1 - qy, 7, 1); }
    else if (pat === 3) { block(r.x0 + qx, r.cy - 2, 1, 5); block(r.x1 - qx, r.cy - 2, 1, 5); }
    // 상자 묶음
    const nc = ri(2, 4);
    for (let i = 0; i < nc; i++) {
      const bx = ri(r.x0 + 3, r.x1 - 3), by = ri(r.y0 + 3, r.y1 - 3);
      for (let k = 0; k < ri(1, 3); k++) {
        const x = bx + ri(-1, 1), y = by + ri(-1, 1);
        if (tiles[y * W + x] !== 1 || crates.some(c => c.x === x && c.y === y)) continue;
        if (Math.abs(x - r.cx) <= 1 && Math.abs(y - r.cy) <= 1) continue;
        crates.push({ i: crates.length, x, y, hp: 3, alive: true, kind: rng() < 0.25 ? 1 : 0 });
      }
    }
  }
  const crateAt = new Map();
  crates.forEach(c => crateAt.set(c.y * W + c.x, c));

  // 바닥 장식 시드
  const deco = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) deco[i] = Math.floor(rng() * 256);

  return { seed, L, W, H, tiles, rooms, corridors, crates, crateAt, deco, biome, biomeIdx, isBoss,
    start: rooms.find(r => r.type === 'start') };
}

// 맵 질의
function tileAt(M, tx, ty) { if (tx < 0 || ty < 0 || tx >= M.W || ty >= M.H) return 0; return M.tiles[ty * M.W + tx]; }
function solidTile(M, tx, ty) {
  if (tileAt(M, tx, ty) !== 1) return true;
  const c = M.crateAt.get(ty * M.W + tx);
  return !!(c && c.alive);
}
function solidPx(M, x, y, ignoreCrates) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  return ignoreCrates ? tileAt(M, tx, ty) !== 1 : solidTile(M, tx, ty);
}
function circleHits(M, x, y, r) {
  const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!solidTile(M, tx, ty)) continue;
    const nx = clamp(x, tx * TILE, tx * TILE + TILE), ny = clamp(y, ty * TILE, ty * TILE + TILE);
    if (dist2(x, y, nx, ny) < r * r) return true;
  }
  return false;
}
function moveCircle(M, e, dx, dy, r) {
  const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 3) || 1;
  const sx = dx / steps, sy = dy / steps;
  let bx = false, by = false;
  for (let i = 0; i < steps; i++) {
    if (!bx) { e.x += sx; if (circleHits(M, e.x, e.y, r)) { e.x -= sx; bx = true; } }
    if (!by) { e.y += sy; if (circleHits(M, e.x, e.y, r)) { e.y -= sy; by = true; } }
  }
  return bx || by;
}
function lineOfSight(M, ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 6);
  for (let i = 1; i < n; i++) { const t = i / n; if (solidPx(M, ax + (bx - ax) * t, ay + (by - ay) * t, true)) return false; }
  return true;
}
function roomAtPx(M, x, y, shrink = 0) {
  const tx = x / TILE, ty = y / TILE;
  for (const r of M.rooms) if (tx >= r.x0 + shrink && tx < r.x1 + 1 - shrink && ty >= r.y0 + shrink && ty < r.y1 + 1 - shrink) return r;
  return null;
}
function setDoors(M, r, closed) { for (const [x, y] of r.doors) M.tiles[y * M.W + x] = closed ? 2 : 1; }

// 바닥 그림 미리 그리기
function renderFloor(M) {
  const c = document.createElement('canvas'); c.width = M.W * TILE; c.height = M.H * TILE;
  const g = c.getContext('2d');
  const B = M.biome;
  g.fillStyle = '#0b0910'; g.fillRect(0, 0, c.width, c.height);
  const isFloor = (x, y) => tileAt(M, x, y) !== 0;
  for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) {
    const px = x * TILE, py = y * TILE, d = M.deco[y * M.W + x];
    if (isFloor(x, y)) {
      g.fillStyle = B.floor[((x + y) & 1) ? 0 : 1]; g.fillRect(px, py, TILE, TILE);
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(px, py + TILE - 1, TILE, 1); g.fillRect(px + TILE - 1, py, 1, TILE);
      if (d < 40) { g.fillStyle = B.floor[2]; g.fillRect(px + (d % 12), py + ((d >> 3) % 12), 3, 2); }
      if (d > 248) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(px + 4, py + 5, 2, 2); g.fillRect(px + 9, py + 10, 2, 1); }
      if (M.biomeIdx === 0 && d > 236 && d <= 248) { g.fillStyle = '#5f8f4a'; g.fillRect(px + 6, py + 8, 1, 3); g.fillRect(px + 8, py + 7, 1, 4); g.fillRect(px + 10, py + 9, 1, 2); }
      if (M.biomeIdx === 2 && d > 240 && d <= 248) { g.fillStyle = '#ff6a2a'; g.fillRect(px + 3, py + 11, 6, 1); g.fillRect(px + 8, py + 10, 3, 1); }
      // 벽 아래 그림자
      if (!isFloor(x, y - 1)) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(px, py, TILE, 5); }
    } else {
      let near = false;
      for (let yy = -1; yy <= 1 && !near; yy++) for (let xx = -1; xx <= 1; xx++) if (isFloor(x + xx, y + yy)) { near = true; break; }
      if (!near) continue;
      g.fillStyle = B.wallTop; g.fillRect(px, py, TILE, TILE);
      g.fillStyle = shade(B.wallTop, -0.15); g.fillRect(px, py + TILE - 2, TILE, 2);
      if (!isFloor(x - 1, y)) {} else { g.fillStyle = shade(B.wallTop, -0.25); g.fillRect(px, py, 1, TILE); }
      if (isFloor(x + 1, y)) { g.fillStyle = shade(B.wallTop, -0.25); g.fillRect(px + TILE - 1, py, 1, TILE); }
      if (isFloor(x, y + 1)) { // 앞면
        g.fillStyle = B.wall; g.fillRect(px, py + 6, TILE, 10);
        g.fillStyle = shade(B.wall, -0.3); g.fillRect(px, py + 10, TILE, 1); g.fillRect(px + ((x & 1) ? 4 : 11), py + 6, 1, 4); g.fillRect(px + ((x & 1) ? 10 : 2), py + 11, 1, 5);
        g.fillStyle = shade(B.wall, 0.25); g.fillRect(px, py + 6, TILE, 1);
        if (d < 18) { g.fillStyle = M.biomeIdx === 1 ? '#bfe8ff' : M.biomeIdx === 2 ? '#ff7a2a' : '#7fbf5a'; g.fillRect(px + 6, py + 7, 3, 3); }
      }
    }
  }
  return c;
}
