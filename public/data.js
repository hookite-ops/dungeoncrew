// 던전 크루 — 데이터: 픽셀 스프라이트, 영웅, 무기, 적
'use strict';
const TILE = 16;

// ---------- 픽셀 스프라이트 ----------
// rows: 문자열 배열, pal: 문자→색. '.'은 투명. 자동 외곽선(어두운 1px)을 덧씌운다.
function makeSprite(rows, pal, outline = '#14101c', scale = 1) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas');
  c.width = (w + 2) * scale; c.height = (h + 2) * scale;
  const g = c.getContext('2d');
  const filled = (x, y) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] && rows[y][x] !== '.';
  if (outline) {
    g.fillStyle = outline;
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      if (filled(x, y)) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))
        g.fillRect((x + 1) * scale, (y + 1) * scale, scale, scale);
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x];
    if (!ch || ch === '.') continue;
    g.fillStyle = pal[ch] || '#ff00ff';
    g.fillRect((x + 1) * scale, (y + 1) * scale, scale, scale);
  }
  return c;
}
// 흰색 실루엣(피격 번쩍임용)
function whiteOf(cv) {
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  const g = c.getContext('2d'); g.drawImage(cv, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---------- 영웅 ----------
const BODY = [
  '...BBBBBB...',
  '..BBBCCBBB..',
  '..BBBBBBBB..',
  '..KKKKKKKK..',
];
const LEGS_A = ['...LL..LL...', '...FF..FF...'];
const LEGS_B = ['..LL....LL..', '..FF....FF..'];
const LEGS_C = ['....LLLL....', '....FFFF....'];

const HEROES = [
  {
    id: 0, name: '브람', title: '철벽 수호자', hp: 7, armor: 6, energy: 180, speed: 66,
    skill: '수호 방벽', skillDesc: '4초 동안 무적 + 총알 반사', cd: 12, color: '#6f9cff',
    head: [
      '....HHHH....',
      '...HPPPPH...',
      '..HHHHHHHH..',
      '..HVVVVVVH..',
      '..HVEVVEVH..',
      '..HHHHHHHH..',
    ],
    pal: { H: '#5b7fd6', P: '#ff5d73', V: '#1d2240', E: '#8ff3ff', B: '#9fb6ee', C: '#ffd166', K: '#6b4a2e', L: '#3c4466', F: '#22263a' },
  },
  {
    id: 1, name: '키라', title: '그림자 사냥꾼', hp: 5, armor: 5, energy: 200, speed: 74,
    skill: '그림자 질주', skillDesc: '돌진하며 무적, 3초간 연사 2배', cd: 6, color: '#b77bff',
    head: [
      '....HHHH....',
      '...HHHHHH...',
      '..HHHHHHHH..',
      '..HHSSSSHH..',
      '..HSESSESH..',
      '..HHSMMSHH..',
    ],
    pal: { H: '#4a2f73', S: '#2a1f3a', E: '#ff5fd2', M: '#7a5aa6', B: '#6b4a9e', C: '#ff5fd2', K: '#2a1f3a', L: '#2e2440', F: '#16111f' },
  },
  {
    id: 2, name: '엘로', title: '별의 마법사', hp: 4, armor: 4, energy: 260, speed: 68,
    skill: '서리 폭발', skillDesc: '주변 적을 3초간 얼리고 탄을 지움', cd: 10, color: '#57e0c4',
    head: [
      '.....HH.....',
      '....HHYH....',
      '...HHHHHH...',
      '.HHHHHHHHHH.',
      '...SESSES...',
      '...SSSSSS...',
    ],
    pal: { H: '#2c6e8f', Y: '#ffe066', S: '#ffd9b8', E: '#2a2a3a', B: '#3b8fb5', C: '#ffe066', K: '#2c6e8f', L: '#25506a', F: '#173445' },
  },
  {
    id: 3, name: '핍', title: '꼬마 기계공', hp: 5, armor: 5, energy: 220, speed: 70,
    skill: '자동 포탑', skillDesc: '10초 동안 자동으로 쏘는 포탑 설치', cd: 14, color: '#ffb347',
    head: [
      '...HHHHHH...',
      '..HHHHHHHHH.',
      '..SSSSSSSS..',
      '..GGWGGGWG..',
      '..SSSSSSSS..',
      '...SSMMSS...',
    ],
    pal: { H: '#e0742d', S: '#ffd9b8', G: '#4a3a2a', W: '#9ff0ff', M: '#c4664a', B: '#d9a441', C: '#5a5a6a', K: '#5a3a24', L: '#4a4a5a', F: '#2a2a33' },
  },
];
function buildHeroSprites(h) {
  const frames = [LEGS_A, LEGS_B, LEGS_A, LEGS_C].map(l => makeSprite([...h.head, ...BODY, ...l], h.pal));
  return { frames, white: whiteOf(frames[0]) };
}

// ---------- 적 ----------
const ENEMY_ART = {
  slime: { rows: [
    '....GGGG....',
    '..GGGGGGGG..',
    '.GGWGGGGGGG.',
    '.GWGGGGGGGG.',
    'GGGEGGGGEGGG',
    'GGGEGGGGEGGG',
    'GGGGGGGGGGGG',
    'GGGGGMMGGGGG',
    '.DDDDDDDDDD.',
  ], pal: { G: '#6fd36a', W: '#d8ffd0', E: '#1a2a1a', M: '#2f6a2c', D: '#3f8f3c' } },
  goblin: { rows: [
    '.EE......EE.',
    '..EGGGGGGE..',
    '..GGGGGGGG..',
    '..GYGGGGYG..',
    '..GGGMMGGG..',
    '...GGGGGG...',
    '..BBBBBBBB..',
    '..BBBKKBBB..',
    '..BBBBBBBB..',
    '...LL..LL...',
  ], pal: { E: '#7cbf4a', G: '#8fd05a', Y: '#ffef5a', M: '#3a2a1a', B: '#8a5a3a', K: '#d9b04a', L: '#4a3a2a' } },
  mushroom: { rows: [
    '...RRRRRR...',
    '..RRWRRRWR..',
    '.RRRRRRRRRR.',
    'RRWRRRRRWRRR',
    'RRRRRRRRRRRR',
    '...SSSSSS...',
    '...SESSES...',
    '...SSSSSS...',
    '....SSSS....',
  ], pal: { R: '#d94a6a', W: '#ffe3ea', S: '#f2dcc2', E: '#3a2a2a' } },
  bat: { rows: [
    'W..........W',
    'WW..BBBB..WW',
    'WWWBBBBBBWWW',
    '.WWBEBBEBWW.',
    '..WBBBBBBW..',
    '....BMMB....',
  ], pal: { W: '#5a3a7a', B: '#7a5aa0', E: '#ff4a4a', M: '#e8e8e8' } },
  shaman: { rows: [
    '....RRRR....',
    '...RRRRRR...',
    '..EGGGGGGE..',
    '..GYGGGGYG..',
    '..GGGMMGGG..',
    '..PPPPPPPP..',
    '.PPPPKKPPPP.',
    '.PPPPPPPPPP.',
    '..PPPPPPPP..',
    '...LL..LL...',
  ], pal: { R: '#ff7a3a', E: '#7cbf4a', G: '#8fd05a', Y: '#ff5a5a', M: '#3a2a1a', P: '#7a3aa0', K: '#ffd166', L: '#3a2a4a' } },
  golem: { rows: [
    '...WWWWWW...',
    '..WWWWWWWW..',
    '.WWBWWWWBWW.',
    '.WWWWOOWWWW.',
    'WWWWWWWWWWWW',
    'WWSWWWWWWSWW',
    'WWWWWWWWWWWW',
    '.WWWWWWWWWW.',
    '..WW....WW..',
  ], pal: { W: '#e8f4ff', B: '#2a3a5a', O: '#ff9a3a', S: '#a9c4e0' } },
  wisp: { rows: [
    '.....CC.....',
    '....CWWC....',
    '...CWWWWC...',
    '..CWEWWEWC..',
    '..CWWWWWWC..',
    '...CWWWWC...',
    '....C..C....',
    '...C....C...',
  ], pal: { C: '#5ac8ff', W: '#d8f4ff', E: '#1a3a6a' } },
  skeleton: { rows: [
    '...BBBBBB...',
    '..BBBBBBBB..',
    '..BEEBBEEB..',
    '..BBBBBBBB..',
    '...BTTTTB...',
    '....BBBB....',
    '..B.BBBB.B..',
    '..B.B..B.B..',
    '....BBBB....',
    '...BB..BB...',
  ], pal: { B: '#e8e2d0', E: '#2a1a1a', T: '#9a9480' } },
  ghost: { rows: [
    '...WWWWWW...',
    '..WWWWWWWW..',
    '.WWEEWWEEWW.',
    '.WWEEWWEEWW.',
    '.WWWWWWWWWW.',
    '.WWWWOOWWWW.',
    '.WWWWWWWWWW.',
    '.WW.WWWW.WW.',
    '.W...WW...W.',
  ], pal: { W: '#c8d8ff', E: '#2a2a5a', O: '#5a5a9a' } },
  firemage: { rows: [
    '.....YY.....',
    '....RRRR....',
    '...RRRRRR...',
    '..RRRRRRRR..',
    '...SESSES...',
    '...SSSSSS...',
    '..RRRRRRRR..',
    '.RRRRYYRRRR.',
    '.RRRRRRRRRR.',
    '..RRRRRRRR..',
  ], pal: { Y: '#ffd23a', R: '#c43a2a', S: '#3a1a1a', E: '#ffcc33' } },
  boar: { rows: [
    '..BB....BB..',
    '.BBBBBBBBBB.',
    'BBBEBBBBEBBB',
    'BBBBBBBBBBBB',
    'WBBBNNNNBBBW',
    'WBBBNPPNBBBW',
    '.BBBBBBBBBB.',
    '..LL....LL..',
  ], pal: { B: '#8a4a3a', E: '#ffcc33', W: '#f2ead8', N: '#b06a5a', P: '#4a2a2a', L: '#4a2a2a' } },
  turret: { rows: [
    '....MMMM....',
    '...MRRRRM...',
    '..MRRERRRM..',
    '..MRRRRRRM..',
    '...MMMMMM...',
    '..SSSSSSSS..',
    '.SSSSSSSSSS.',
    '.SKSSSSSSKS.',
    '.SSSSSSSSSS.',
  ], pal: { M: '#4a4a5a', R: '#d94a3a', E: '#ffe08a', S: '#6a6a7a', K: '#ffaa33' } },
  imp: { rows: [
    '.H........H.',
    '.HRRRRRRRRH.',
    '..RRRRRRRR..',
    '..RYRRRRYR..',
    '..RRRTTRRR..',
    '...RRRRRR...',
    '..RRRRRRRR..',
    '...R....R...',
  ], pal: { H: '#3a1a1a', R: '#e0503a', Y: '#ffe33a', T: '#ffffff' } },
  // 보스
  kingslime: { rows: [
    '.....Y..Y..Y.....',
    '.....YYYYYYY.....',
    '.....YRYYYRY.....',
    '....GGGGGGGGG....',
    '..GGGGGGGGGGGGG..',
    '.GGWWGGGGGGGGGGG.',
    '.GWWGGGGGGGGGGGG.',
    'GGGGGEEGGGGEEGGGG',
    'GGGGGEEGGGGEEGGGG',
    'GGGGGGGGGGGGGGGGG',
    'GGGGGGGMMMMGGGGGG',
    'GGGGGGGGMMGGGGGGG',
    '.GGGGGGGGGGGGGGG.',
    '..DDDDDDDDDDDDD..',
  ], pal: { Y: '#ffd23a', R: '#ff4a6a', G: '#6fd36a', W: '#e0ffd8', E: '#1a2a1a', M: '#2f6a2c', D: '#3f8f3c' } },
  titan: { rows: [
    '....CC.....CC....',
    '....CWWWWWWWC....',
    '...WWWWWWWWWWW...',
    '...WBBWWWWWBBW...',
    '...WWWWWWWWWWW...',
    '....WWWOOOWWW....',
    '.CCWWWWWWWWWWWCC.',
    'CWWWWWWWWWWWWWWWC',
    'CWWSWWWWWWWWWSWWC',
    'CWWWWWWWCWWWWWWWC',
    '.WWW.WWWWWWW.WWW.',
    '.....WWW.WWW.....',
    '.....SSS.SSS.....',
  ], pal: { C: '#5ac8ff', W: '#dfeeff', B: '#1a3a6a', O: '#3a6aaa', S: '#9ab4d4' } },
  ignis: { rows: [
    '...Y....Y....Y...',
    '...YY..YYY..YY...',
    '....RRRRRRRRR....',
    '...RRRRRRRRRRR...',
    '...RREERRREERR...',
    '...RRRRRRRRRRR...',
    '....RRMMMMMRR....',
    '..KKRRRRRRRRRKK..',
    '.KKKRRRYYYRRRKKK.',
    'KK.KRRRRRRRRRK.KK',
    '...KRRRRRRRRRK...',
    '....RRR...RRR....',
    '....KKK...KKK....',
  ], pal: { Y: '#ffd23a', R: '#d9442a', E: '#fff2a8', M: '#5a1a12', K: '#3a2a2a' } },
};

// move: chase / keep / wander / swoop / charge / static
// atk: aim / spread / ring / spiral / burst / none
const ENEMIES = {
  slime:    { name: '슬라임', hp: 9,  spd: 30, r: 6, move: 'chase', contact: 1, atk: null, energy: 2 },
  goblin:   { name: '고블린 사수', hp: 10, spd: 34, r: 6, move: 'keep', atk: { type: 'aim', cd: 1.7, spd: 85, n: 1 }, energy: 2 },
  mushroom: { name: '독버섯', hp: 13, spd: 12, r: 6, move: 'wander', atk: { type: 'ring', cd: 2.8, spd: 62, n: 8, range: 140 }, energy: 2 },
  bat:      { name: '박쥐', hp: 6,  spd: 62, r: 5, move: 'swoop', contact: 1, atk: { type: 'aim', cd: 2.6, spd: 75, n: 1 }, energy: 1, fly: true },
  shaman:   { name: '고블린 주술사', hp: 18, spd: 30, r: 6, move: 'keep', atk: { type: 'spread', cd: 2.1, spd: 80, n: 3, spread: 0.5 }, energy: 3 },
  golem:    { name: '눈덩이 골렘', hp: 28, spd: 22, r: 8, move: 'chase', contact: 1, atk: { type: 'spread', cd: 2.4, spd: 70, n: 5, spread: 0.9 }, energy: 4 },
  wisp:     { name: '서리 정령', hp: 12, spd: 40, r: 6, move: 'wander', atk: { type: 'ring', cd: 1.9, spd: 70, n: 6, rot: true }, energy: 2, fly: true },
  skeleton: { name: '해골 궁수', hp: 14, spd: 36, r: 6, move: 'keep', atk: { type: 'aim', cd: 1.5, spd: 125, n: 1, arrow: true }, energy: 2 },
  ghost:    { name: '유령', hp: 13, spd: 46, r: 6, move: 'chase', contact: 1, atk: { type: 'spread', cd: 3.0, spd: 60, n: 3, spread: 0.6 }, energy: 2, fly: true },
  firemage: { name: '화염 술사', hp: 18, spd: 30, r: 6, move: 'keep', atk: { type: 'spiral', cd: 3.2, spd: 70, n: 14 }, energy: 3 },
  boar:     { name: '돌격 멧돼지', hp: 24, spd: 40, r: 7, move: 'charge', contact: 2, atk: null, energy: 3 },
  turret:   { name: '고대 포탑', hp: 32, spd: 0, r: 7, move: 'static', atk: { type: 'burst', cd: 1.9, spd: 95, n: 3 }, energy: 4 },
  imp:      { name: '임프', hp: 10, spd: 58, r: 5, move: 'chase', contact: 1, atk: { type: 'aim', cd: 1.9, spd: 95, n: 1 }, energy: 2 },
  kingslime:{ name: '젤리 킹', hp: 340, spd: 26, r: 14, move: 'boss', contact: 1, boss: 0, energy: 0 },
  titan:    { name: '서리 거인', hp: 460, spd: 24, r: 14, move: 'boss', contact: 1, boss: 1, energy: 0 },
  ignis:    { name: '화염 군주 이그니스', hp: 600, spd: 30, r: 14, move: 'boss', contact: 2, boss: 2, energy: 0 },
};

const BIOMES = [
  { name: '이끼 숲 던전', floor: ['#3b5a3a', '#41623f', '#365236'], wall: '#6a8f5a', wallTop: '#9cc47e', wallDark: '#24361f',
    enemies: ['slime', 'goblin', 'mushroom', 'bat', 'shaman'], boss: 'kingslime', fog: 'rgba(20,40,20,0.25)' },
  { name: '서리 동굴', floor: ['#3a4a66', '#3f5170', '#35445e'], wall: '#7a9ac4', wallTop: '#cfe6ff', wallDark: '#1f2a40',
    enemies: ['golem', 'wisp', 'skeleton', 'ghost', 'bat'], boss: 'titan', fog: 'rgba(20,30,60,0.25)' },
  { name: '용암 유적', floor: ['#4a3030', '#523434', '#432b2b'], wall: '#9a5a3a', wallTop: '#e0a060', wallDark: '#2a1414',
    enemies: ['firemage', 'boar', 'turret', 'imp', 'skeleton'], boss: 'ignis', fog: 'rgba(60,20,10,0.25)' },
];

// ---------- 무기 ----------
// shape: pistol smg rifle shotgun sniper launcher bow crossbow staff sword flamer gatling boomer
const RARITY = [
  { name: '일반', color: '#e8e8e8' }, { name: '고급', color: '#6fdc6a' }, { name: '희귀', color: '#5aa8ff' },
  { name: '영웅', color: '#c37bff' }, { name: '전설', color: '#ffa63a' },
];
const WEAPONS = [
  { id: 0,  name: '녹슨 권총',   r: 0, shape: 'pistol',   cost: 0, dmg: 3,  rate: 4.2, spread: 6,  n: 1, spd: 240, col: '#ffe08a', body: '#8a8a9a' },
  { id: 1,  name: '사냥용 산탄총', r: 1, shape: 'shotgun',  cost: 3, dmg: 3,  rate: 1.6, spread: 30, n: 5, spd: 230, col: '#ffd06a', body: '#7a5a3a', life: 0.5 },
  { id: 2,  name: '꼬마 기관단총', r: 1, shape: 'smg',      cost: 1, dmg: 2,  rate: 10,  spread: 14, n: 1, spd: 260, col: '#ffe08a', body: '#4a4a5a' },
  { id: 3,  name: '돌격소총',     r: 2, shape: 'rifle',    cost: 1, dmg: 3,  rate: 7,   spread: 6,  n: 1, spd: 300, col: '#fff0a0', body: '#5a6a4a' },
  { id: 4,  name: '레일건',       r: 3, shape: 'sniper',   cost: 6, dmg: 16, rate: 1.1, spread: 0,  n: 1, spd: 560, col: '#7ff6ff', body: '#3a5a8a', pierce: 9, trail: true },
  { id: 5,  name: '로켓 발사기',   r: 3, shape: 'launcher', cost: 8, dmg: 12, rate: 0.9, spread: 2,  n: 1, spd: 190, col: '#ff8a3a', body: '#4a6a3a', boom: 30, big: true },
  { id: 6,  name: '사냥꾼 쇠뇌',   r: 1, shape: 'crossbow', cost: 2, dmg: 7,  rate: 1.8, spread: 2,  n: 1, spd: 330, col: '#e8d8b0', body: '#7a5a3a', pierce: 3, arrow: true },
  { id: 7,  name: '번개 지팡이',   r: 2, shape: 'staff',    cost: 3, dmg: 4,  rate: 3,   spread: 8,  n: 1, spd: 250, col: '#a8e0ff', body: '#5a4a8a', bounce: 3 },
  { id: 8,  name: '화염 방사기',   r: 2, shape: 'flamer',   cost: 1, dmg: 1,  rate: 18,  spread: 20, n: 1, spd: 170, col: '#ff7a2a', body: '#8a3a2a', life: 0.38, burn: 1, flame: true },
  { id: 9,  name: '기사의 대검',   r: 1, shape: 'sword',    cost: 0, dmg: 8,  rate: 2.2, melee: { range: 26, arc: 1.9 }, col: '#e8f0ff', body: '#c0c8d8' },
  { id: 10, name: '서리 대포',     r: 2, shape: 'launcher', cost: 4, dmg: 6,  rate: 1.5, spread: 3,  n: 1, spd: 210, col: '#9fe8ff', body: '#4a7aaa', freeze: 1.4, big: true },
  { id: 11, name: '별가루 개틀링', r: 3, shape: 'gatling',  cost: 1, dmg: 3,  rate: 16,  spread: 12, n: 1, spd: 300, col: '#ffe86a', body: '#6a5a8a' },
  { id: 12, name: '바람 부메랑',   r: 2, shape: 'boomer',   cost: 2, dmg: 5,  rate: 1.7, spread: 0,  n: 1, spd: 230, col: '#b0ffb0', body: '#4aa05a', ret: true, pierce: 99, life: 1.1 },
  { id: 13, name: '벌집 발사기',   r: 3, shape: 'launcher', cost: 4, dmg: 4,  rate: 2,   spread: 40, n: 3, spd: 170, col: '#ffd23a', body: '#a0702a', homing: true, life: 1.6 },
  { id: 14, name: '광선검',       r: 3, shape: 'sword',    cost: 2, dmg: 12, rate: 3,   melee: { range: 30, arc: 2.3, wave: true }, col: '#6af0ff', body: '#2a2a3a' },
  { id: 15, name: '용의 숨결',     r: 4, shape: 'shotgun',  cost: 5, dmg: 5,  rate: 2.4, spread: 44, n: 7, spd: 240, col: '#ff5a2a', body: '#a02a2a', burn: 2, life: 0.6 },
  { id: 16, name: '은하 레이저',   r: 4, shape: 'rifle',    cost: 3, dmg: 5,  rate: 12,  spread: 3,  n: 1, spd: 600, col: '#ff6af0', body: '#3a2a6a', pierce: 2, trail: true },
  { id: 17, name: '쌍발 리볼버',   r: 1, shape: 'pistol',   cost: 1, dmg: 4,  rate: 3,   spread: 6,  n: 2, spd: 260, col: '#ffe08a', body: '#c09a5a' },
  { id: 18, name: '저격총',       r: 2, shape: 'sniper',   cost: 3, dmg: 13, rate: 1.0, spread: 0,  n: 1, spd: 520, col: '#ffffff', body: '#3a3a3a', pierce: 1 },
  { id: 19, name: '수류탄 발사기', r: 2, shape: 'launcher', cost: 5, dmg: 9,  rate: 1.2, spread: 4,  n: 1, spd: 170, col: '#8aff6a', body: '#4a5a3a', boom: 26, life: 0.7, fuse: true, big: true },
];
WEAPONS.forEach(w => { if (!w.life) w.life = w.melee ? 0 : 2.2; });
const TURRET_GUN = { id: 99, dmg: 3, spd: 280, spread: 6, n: 1, col: '#ffb347', life: 1.6 };

// 무기 그림 (오른쪽을 보는 기준, 원점=손잡이)
function drawWeaponSprite(w) {
  const c = document.createElement('canvas'); c.width = 30; c.height = 14;
  const g = c.getContext('2d');
  const B = w.body, D = shade(B, -0.35), L = shade(B, 0.3), A = w.col;
  const R = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  switch (w.shape) {
    case 'pistol': R(6, 4, 9, 3, B); R(6, 4, 9, 1, L); R(7, 7, 3, 4, D); R(14, 5, 2, 1, A); break;
    case 'smg': R(5, 4, 13, 3, B); R(5, 4, 13, 1, L); R(8, 7, 3, 4, D); R(12, 7, 2, 3, D); R(17, 5, 3, 1, D); break;
    case 'rifle': R(2, 5, 6, 3, D); R(7, 4, 13, 3, B); R(7, 4, 13, 1, L); R(19, 5, 6, 1, D); R(10, 7, 3, 4, D); R(14, 7, 2, 3, D); R(12, 3, 4, 1, A); break;
    case 'shotgun': R(2, 5, 6, 3, '#6a4a2a'); R(7, 4, 16, 2, B); R(7, 6, 14, 2, D); R(7, 4, 16, 1, L); R(10, 8, 3, 3, '#6a4a2a'); break;
    case 'sniper': R(1, 5, 6, 3, D); R(6, 5, 20, 2, B); R(6, 5, 20, 1, L); R(10, 2, 7, 2, D); R(11, 2, 2, 1, A); R(9, 7, 3, 4, D); R(25, 5, 4, 1, D); break;
    case 'launcher': R(3, 3, 19, 5, B); R(3, 3, 19, 1, L); R(20, 2, 4, 7, D); R(8, 8, 3, 4, D); R(5, 4, 3, 3, A); break;
    case 'bow': case 'crossbow': R(5, 5, 14, 2, B); R(16, 1, 2, 12, D); R(17, 1, 1, 12, L); R(8, 7, 3, 4, D); R(17, 6, 8, 1, A); break;
    case 'staff': R(2, 6, 18, 2, B); R(2, 6, 18, 1, L); R(19, 3, 5, 7, D); R(20, 4, 3, 5, A); R(21, 5, 1, 2, '#fff'); break;
    case 'sword': R(2, 6, 4, 2, '#5a3a2a'); R(5, 4, 2, 6, '#d9b04a'); R(7, 5, 13, 3, w.body); R(7, 5, 13, 1, '#ffffff'); R(20, 6, 1, 1, w.body); if (w.id === 14) { R(7, 5, 13, 3, A); R(7, 6, 13, 1, '#e8ffff'); } break;
    case 'flamer': R(2, 4, 16, 4, B); R(2, 4, 16, 1, L); R(4, 8, 6, 4, '#c0c0c0'); R(17, 5, 5, 2, D); R(21, 5, 2, 2, A); break;
    case 'gatling': R(3, 3, 9, 7, B); R(11, 4, 15, 1, D); R(11, 6, 15, 1, L); R(11, 8, 15, 1, D); R(25, 3, 2, 7, D); R(5, 10, 4, 3, D); R(5, 4, 3, 2, A); break;
    case 'boomer': g.fillStyle = B; g.fillRect(8, 2, 3, 10); g.fillRect(8, 2, 10, 3); g.fillStyle = L; g.fillRect(8, 2, 10, 1); break;
  }
  return c;
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}
