// 던전 크루 — 멀티플레이 중계 서버 (방 코드, 최대 4명)
// 게임 계산은 방장(호스트) 폰이 하고, 서버는 메시지를 전달만 한다.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const PUB = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.apk': 'application/vnd.android.package-archive' };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, rooms: rooms.size, online: wss.clients.size })); }
  let file = path.normalize(path.join(PUB, url === '/' ? 'index.html' : url));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });
const rooms = new Map(); // code -> { code, host, players: Map(id -> ws), locked, pub }
let nextId = 1;
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  for (;;) { let c = ''; for (let i = 0; i < 4; i++) c += CODE_CH[Math.floor(Math.random() * CODE_CH.length)]; if (!rooms.has(c)) return c; }
}
const send = (ws, o) => { if (ws.readyState === 1) ws.send(typeof o === 'string' ? o : JSON.stringify(o)); };

function leave(ws) {
  const r = ws.room && rooms.get(ws.room);
  ws.room = null;
  if (!r) return;
  r.players.delete(ws.id);
  if (r.host === ws.id) {
    for (const p of r.players.values()) { send(p, { t: 'closed' }); p.room = null; }
    rooms.delete(r.code);
  } else {
    const h = r.players.get(r.host);
    if (h) send(h, { t: 'peer-', id: ws.id });
    if (!r.players.size) rooms.delete(r.code);
  }
}

wss.on('connection', ws => {
  ws.id = nextId++; ws.name = '모험가'; ws.alive = true; ws.room = null;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const r = ws.room && rooms.get(ws.room);
    switch (m.t) {
      case 'hello': ws.name = String(m.name || '모험가').slice(0, 10); break;
      case 'create': {
        leave(ws);
        const code = newCode();
        rooms.set(code, { code, host: ws.id, players: new Map([[ws.id, ws]]), locked: false, pub: m.pub !== false, created: Date.now() });
        ws.room = code;
        send(ws, { t: 'joined', code, host: ws.id, you: ws.id });
        break;
      }
      case 'join': {
        const room = rooms.get(String(m.code || '').toUpperCase());
        if (!room) return send(ws, { t: 'err', msg: '그런 방이 없어요. 코드를 다시 확인해 주세요' });
        if (room.locked) return send(ws, { t: 'err', msg: '이미 게임이 시작된 방이에요' });
        if (room.players.size >= 4) return send(ws, { t: 'err', msg: '방이 꽉 찼어요 (최대 4명)' });
        leave(ws);
        room.players.set(ws.id, ws); ws.room = room.code;
        send(ws, { t: 'joined', code: room.code, host: room.host, you: ws.id });
        const h = room.players.get(room.host);
        if (h) send(h, { t: 'peer+', id: ws.id, name: ws.name });
        break;
      }
      case 'list': {
        const list = [];
        for (const room of rooms.values()) {
          if (!room.pub || room.locked || room.players.size >= 4) continue;
          const h = room.players.get(room.host);
          list.push({ code: room.code, n: room.players.size, host: h ? h.name : '?' });
        }
        send(ws, { t: 'list', rooms: list.slice(0, 30) });
        break;
      }
      case 'leave': leave(ws); break;
      case 'lock': if (r && r.host === ws.id) r.locked = true; break;
      case 'unlock': if (r && r.host === ws.id) r.locked = false; break;
      case 'h': { // 참가자 → 방장
        if (!r || r.host === ws.id) return;
        const h = r.players.get(r.host);
        if (h) send(h, { t: 'm', from: ws.id, d: m.d });
        break;
      }
      case 'b': { // 방장 → 모두
        if (!r || r.host !== ws.id) return;
        const out = JSON.stringify({ t: 'm', from: ws.id, d: m.d });
        for (const p of r.players.values()) if (p !== ws) send(p, out);
        break;
      }
    }
  });
  ws.on('close', () => leave(ws));
  ws.on('error', () => {});
});

setInterval(() => {
  for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; try { ws.ping(); } catch (e) {} }
}, 20000);

server.listen(PORT, () => console.log('던전 크루 서버 실행 중 :' + PORT));
