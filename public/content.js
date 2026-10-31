// 던전 크루 — 추가 컨텐츠: 새 무기·적·버프·소품 그림
'use strict';

// ---------- 새 적 ----------
Object.assign(ENEMY_ART, {
  mimic: { rows: [
    '.KKKKKKKKKK.',
    'KBBBBBBBBBBK',
    'KBWBWBWBWBBK',
    'KRRRRRRRRRRK',
    'KRWRWRWRWRRK',
    'KBBBEBBEBBBK',
    'KBBBBBBBBBBK',
    '.KKKKKKKKKK.',
  ], pal: { K: '#3a2416', B: '#9a6234', W: '#ffffff', R: '#8a1a2a', E: '#ffe033' } },
  vine: { rows: [
    '....LLLL....',
    '...LRRRRL...',
    '..LRRWRRRL..',
    '..LRRRRRRL..',
    '...LRMMRL...',
    '....LRRL....',
    '.....GG.....',
    '..GG.GG.GG..',
    '...GGGGGG...',
    '....GGGG....',
    '...DDDDDD...',
  ], pal: { L: '#2f6a2c', R: '#e04a8a', W: '#ffd0e8', M: '#5a1a3a', G: '#4fa04a', D: '#3a2a1a' } },
  frostknight: { rows: [
    '....CCCC....',
    '...CWWWWC...',
    '..CWBBBBWC..',
    '..CWBEEBWC..',
    '..CWWWWWWC..',
    '.SSCCCCCCSS.',
    'SSWWWWWWWWSS',
    '.SWWCWWCWWS.',
    '..WWWWWWWW..',
    '..WW....WW..',
    '..CC....CC..',
  ], pal: { C: '#5ac8ff', W: '#cfe6ff', B: '#1a2a4a', E: '#ff5a5a', S: '#8ab0d0' } },
  lavaslime: { rows: [
    '....RRRR....',
    '..RRYYRRRR..',
    '.RRYYRRRRRR.',
    '.RRRRRRRRRR.',
    'RRREKRRKERRR',
    'RRRRRRRRRRRR',
    'RRRRRMMRRRRR',
    '.DDDDDDDDDD.',
  ], pal: { E: '#fff2a0', K: '#2a0a0a', R: '#e0502a', Y: '#ffcc33', M: '#5a1a0a', D: '#a02a1a' } },
});
Object.assign(ENEMIES, {
  mimic:       { name: '미믹', hp: 34, spd: 58, r: 7, move: 'chase', contact: 2, atk: { type: 'spread', cd: 1.8, spd: 90, n: 5, spread: 0.7 }, energy: 4, coins: 8 },
  vine:        { name: '식인 덩굴', hp: 16, spd: 0, r: 6, move: 'static', atk: { type: 'burst', cd: 2.2, spd: 100, n: 3 }, energy: 2 },
  frostknight: { name: '서리 기사', hp: 22, spd: 32, r: 7, move: 'chase', contact: 1, atk: { type: 'spread', cd: 2.0, spd: 85, n: 3, spread: 0.35 }, energy: 3 },
  lavaslime:   { name: '용암 슬라임', hp: 14, spd: 34, r: 6, move: 'chase', contact: 1, atk: null, energy: 2, deathRing: 8 },
});
BIOMES[0].enemies.push('vine');
BIOMES[1].enemies.push('frostknight');
BIOMES[2].enemies.push('lavaslime');

// ---------- 새 무기 ----------
WEAPONS.push(
  { id: 20, name: '그림자 쌍검',   r: 1, shape: 'dual',    cost: 0, dmg: 4,  rate: 4.5, melee: { range: 22, arc: 2.6 }, col: '#d8c8ff', body: '#9a8ac0' },
  { id: 21, name: '전쟁 망치',     r: 2, shape: 'hammer',  cost: 2, dmg: 14, rate: 1.1, melee: { range: 28, arc: 1.6, quake: 30 }, col: '#ffd06a', body: '#8a8a9a' },
  { id: 22, name: '천둥 창',       r: 2, shape: 'spear',   cost: 1, dmg: 10, rate: 2,   melee: { range: 42, arc: 0.7 }, col: '#a8e0ff', body: '#c0c8d8' },
  { id: 23, name: '마술사의 카드', r: 1, shape: 'cards',   cost: 1, dmg: 4,  rate: 2.6, spread: 24, n: 3, spd: 280, col: '#ff6a8a', body: '#f0f0f0', pierce: 1, kind: 'card' },
  { id: 24, name: '미니건',        r: 3, shape: 'gatling', cost: 1, dmg: 2,  rate: 22,  spread: 16, n: 1, spd: 320, col: '#ffe08a', body: '#4a4a5a' },
  { id: 25, name: '산성 분사기',   r: 2, shape: 'acid',    cost: 2, dmg: 3,  rate: 3,   spread: 6,  n: 1, spd: 160, col: '#9aff4a', body: '#4a7a3a', poison: 3, boom: 18, kind: 'acid', life: 1.4 },
  { id: 26, name: '폭죽 발사기',   r: 3, shape: 'launcher',cost: 5, dmg: 6,  rate: 1.3, spread: 3,  n: 1, spd: 200, col: '#ff6af0', body: '#a03a8a', split: 10, life: 0.55, big: true },
  { id: 27, name: '엘프의 장궁',   r: 2, shape: 'bow',     cost: 1, dmg: 9,  rate: 1.6, spread: 1,  n: 1, spd: 380, col: '#e8ffd0', body: '#6a8a3a', pierce: 2, arrow: true },
  { id: 28, name: '별빛 지팡이',   r: 3, shape: 'staff',   cost: 2, dmg: 5,  rate: 2.6, spread: 30, n: 2, spd: 200, col: '#fff6a0', body: '#3a3a8a', homing: true, life: 1.6, kind: 'star' },
  { id: 29, name: '천벌의 망치',   r: 4, shape: 'hammer',  cost: 3, dmg: 22, rate: 1.4, melee: { range: 32, arc: 2, quake: 44, wave: true }, col: '#ffe86a', body: '#d9b04a' },
  { id: 30, name: '혼돈의 지팡이', r: 4, shape: 'staff',   cost: 4, dmg: 5,  rate: 2.2, spread: 50, n: 5, spd: 240, col: '#ff6af0', body: '#5a1a6a', bounce: 2 },
);
WEAPONS.forEach(w => { if (!w.life) w.life = w.melee ? 0 : 2.2; });

const _drawWeaponBase = drawWeaponSprite;
drawWeaponSprite = function (w) {
  if (!['dual', 'hammer', 'spear', 'cards', 'acid', 'bow'].includes(w.shape)) return _drawWeaponBase(w);
  const c = document.createElement('canvas'); c.width = 30; c.height = 14;
  const g = c.getContext('2d');
  const B = w.body, D = shade(B, -0.35), L = shade(B, 0.3), A = w.col;
  const R = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  switch (w.shape) {
    case 'dual': R(2, 4, 3, 2, '#3a2a4a'); R(5, 3, 1, 4, A); R(6, 4, 10, 2, B); R(6, 4, 10, 1, '#fff'); R(2, 8, 3, 2, '#3a2a4a'); R(5, 7, 1, 4, A); R(6, 8, 9, 2, B); R(6, 8, 9, 1, '#fff'); break;
    case 'hammer': R(1, 6, 15, 2, '#6a4a2a'); R(15, 1, 8, 12, B); R(15, 1, 8, 2, L); R(15, 11, 8, 2, D); R(17, 5, 4, 4, A); break;
    case 'spear': R(0, 6, 20, 2, '#7a5a3a'); R(19, 5, 2, 4, A); R(21, 4, 6, 6, B); R(27, 5, 2, 4, B); R(28, 6, 1, 2, '#fff'); R(22, 5, 5, 1, '#fff'); break;
    case 'cards': R(6, 2, 7, 10, '#f0f0f0'); R(7, 3, 5, 8, A); R(9, 5, 2, 4, '#fff'); R(10, 3, 7, 10, '#e8e8f0'); R(11, 4, 5, 8, '#3a3a5a'); R(13, 6, 2, 4, '#ffd23a'); break;
    case 'acid': R(2, 4, 14, 4, B); R(2, 4, 14, 1, L); R(5, 8, 7, 5, '#c0c0c0'); R(6, 9, 5, 3, A); R(15, 5, 6, 2, D); R(20, 5, 2, 2, A); break;
    case 'bow': g.fillStyle = B; for (let i = 0; i < 12; i++) { const x = 14 + Math.round(Math.sin(i / 11 * Math.PI) * 5); g.fillRect(x, 1 + i, 2, 1); } R(14, 1, 1, 12, '#e8e8e8'); R(4, 6, 12, 1, '#c8a878'); R(15, 5, 3, 3, A); R(9, 5, 3, 3, D); break;
  }
  return c;
};

// ---------- 버프 ----------
const BUFFS = [
  { id: 'dmg',    name: '날카로운 탄환', desc: '주는 피해 +20%', icon: '⚔' },
  { id: 'crit',   name: '치명타 장인',   desc: '치명타 확률 +15%', icon: '✦' },
  { id: 'spd',    name: '바람의 신발',   desc: '이동 속도 +15%', icon: '»' },
  { id: 'hp',     name: '단단한 몸',     desc: '최대 체력 +2', icon: '♥', host: true },
  { id: 'ar',     name: '강철 갑옷',     desc: '최대 갑옷 +2', icon: '◆', host: true },
  { id: 'en',     name: '마나의 샘',     desc: '최대 에너지 +60, 가득 채움', icon: '⚡' },
  { id: 'cost',   name: '절약 정신',     desc: '에너지 소모 -30%', icon: '♻' },
  { id: 'rate',   name: '빠른 손',       desc: '연사 속도 +15%', icon: '↯' },
  { id: 'cd',     name: '깊은 집중',     desc: '스킬 쿨타임 -25%', icon: '◷' },
  { id: 'leech',  name: '생명 흡수',     desc: '적 처치 시 8% 확률로 체력 1', icon: '✚', host: true },
  { id: 'coin',   name: '황금 손',       desc: '코인 2배로 획득', icon: '●' },
  { id: 'pierce', name: '관통탄',        desc: '총알이 적을 1명 더 뚫음', icon: '➹' },
];
const BUFF_BY = Object.fromEntries(BUFFS.map(b => [b.id, b]));

// ---------- 소품 그림 ----------
function buildPropSprites() {
  const S = {};
  S.merchant = makeSprite([
    '..K........K..',
    '..KK......KK..',
    '..KOKKKKKKOK..',
    '..KOOOOOOOOK..',
    '..KOEOOOOEOK..',
    '..KOOONNOOOK..',
    '...KOOWWOOK...',
    '..HHHHHHHHHH..',
    '.HHHHGGGGHHHH.',
    '.HHHGGYYGGHHH.',
    '.HHHHGGGGHHHH.',
    '..HHHHHHHHHH..',
    '..HH......HH..',
  ], { K: '#2a1a10', O: '#f0a050', E: '#2a2a2a', N: '#ff8a9a', W: '#ffffff', H: '#5a3a8a', G: '#7a5aa0', Y: '#ffd23a' });
  S.furnace = makeSprite([
    '....SSSSSSSSSSSS....',
    '...SDDDDDDDDDDDDS...',
    '..SDSSDSSDSSDSSDDS..',
    '..SDDDDDDDDDDDDDDS..',
    '.SSDSSDSSDSSDSSDSSS.',
    '.SDDDDDDDDDDDDDDDDS.',
    '.SDSSDS......SDSSDS.',
    '.SDDDD........DDDDS.',
    '.SDSS..........SSDS.',
    '.SDDD..........DDDS.',
    '.SDSS..........SSDS.',
    '.SDDDKKKKKKKKKKDDDS.',
    'SSSSSSSSSSSSSSSSSSSS',
    'SMMMMMMMMMMMMMMMMMMS',
    'SSSSSSSSSSSSSSSSSSSS',
  ], { S: '#6a6a7a', D: '#3a3a4a', K: '#2a1a10', M: '#8a5a3a' });
  S.anvil = makeSprite(['KKKKKKKKKK..', '.KKKKKKKKKKK', '...KKKKK....', '....KKK.....', '...KKKKK....', '..KKKKKKK...'], { K: '#7a7a8a' });
  S.statue = makeSprite([
    '....SSSS....',
    '...SSSSSS...',
    '...SDDDDS...',
    '...SD..DS...',
    '....SSSS....',
    '..SSSSSSSS..',
    '.SSSSSSSSSS.',
    '.SS.SSSS.SS.',
    '....SSSS....',
    '....SSSS....',
    '...SSSSSS...',
    '..PPPPPPPP..',
    '..PDDDDDDP..',
    '..PPPPPPPP..',
  ], { S: '#b8b0c8', D: '#5a5470', P: '#7a7090' });
  S.pot = makeSprite(['..KKKK..', '...KK...', '..BBBB..', '.BBLBBB.', 'BBLBBBBB', 'BBBBBBBB', '.BBBBBB.', '..BBBB..'], { B: '#b0603a', L: '#e09060', K: '#6a3a20' }, '#2a140a');
  S.potIce = makeSprite(['..KKKK..', '...KK...', '..BBBB..', '.BBLBBB.', 'BBLBBBBB', 'BBBBBBBB', '.BBBBBB.', '..BBBB..'], { B: '#6a8ab0', L: '#c0d8f0', K: '#3a4a6a' }, '#141a2a');
  const chestRows = ['.KKKKKKKKKK.', 'KBBBBBBBBBBK', 'KBLBBBBBBLBK', 'KYYYYGGYYYYK', 'KBBBBGGBBBBK', 'KBBBBBBBBBBK', 'KBLBBBBBBLBK', '.KKKKKKKKKK.'];
  S.schest = makeSprite(chestRows, { K: '#2a2a3a', B: '#8a9ab0', L: '#c0cce0', Y: '#e8f0ff', G: '#5aa8ff' });
  S.gchest = makeSprite(chestRows, { K: '#5a3a10', B: '#e0a83a', L: '#ffe08a', Y: '#fff4c0', G: '#d94a3a' });
  return S;
}
function darkOf(cv) {
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  const g = c.getContext('2d'); g.drawImage(cv, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(20,10,20,0.55)'; g.fillRect(0, 0, c.width, c.height);
  return c;
}
function tintOf(cv, col) {
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  const g = c.getContext('2d'); g.drawImage(cv, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  return c;
}
