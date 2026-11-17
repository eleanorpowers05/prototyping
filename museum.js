'use strict';

// ===== World layout (floor units). The view is a 3/4 bird's-eye: screenY = y * K - z =====
const K = 0.8;          // floor squash, gives the angled look
const H = 48;           // wall height
const T = 14;           // wall thickness
const W = 1600;
const D = 900;
const ROW = 420;        // y of the wall between the two rows of rooms

const ROOMS = [
  { id: 'oldmasters',    x0: 0,    y0: 0,   x1: 400,  y1: ROW, floor: '#e6d6bd' },
  { id: 'impressionism', x0: 400,  y0: 0,   x1: 1000, y1: ROW, floor: '#ecdfca' },
  { id: 'okeeffe',       x0: 1000, y0: 0,   x1: W,    y1: ROW, floor: '#efe3d2' },
  { id: 'modern',        x0: 0,    y0: ROW, x1: 560,  y1: D,   floor: '#ebe6de' },
  { id: 'lobby',         x0: 560,  y0: ROW, x1: 1000, y1: D,   floor: '#f3eee6', name: 'Lobby' },
  { id: 'japanese',      x0: 1000, y0: ROW, x1: 1300, y1: D,   floor: '#e9dfcf' },
  { id: 'american',      x0: 1300, y0: ROW, x1: W,    y1: D,   floor: '#e7dac6' },
];
const roomById = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

// Doorways: [roomA, roomB, x, y, orientation]. 'h' = gap in a horizontal wall, 'v' = in a vertical wall.
const DOOR_W = 70;
const DOORS = [
  ['oldmasters', 'modern', 205, ROW, 'h'],
  ['impressionism', 'lobby', 775, ROW, 'h'],
  ['okeeffe', 'japanese', 1145, ROW, 'h'],
  ['okeeffe', 'american', 1455, ROW, 'h'],
  ['oldmasters', 'impressionism', 400, 215, 'v'],
  ['impressionism', 'okeeffe', 1000, 215, 'v'],
  ['modern', 'lobby', 560, 655, 'v'],
  ['lobby', 'japanese', 1000, 655, 'v'],
  ['japanese', 'american', 1300, 655, 'v'],
].map(([a, b, x, y, o]) => ({ a, b, x, y, o }));
const ENTRANCE = { x0: 730, x1: 830 };

// ===== Walls and furniture (axis-aligned boxes: x, y, w, d on the floor, h tall) =====
const walls = [];
const gapsFor = (o, line) => DOORS.filter((d) => d.o === o && (o === 'h' ? d.y === line : d.x === line))
  .map((d) => (o === 'h' ? [d.x - DOOR_W / 2, d.x + DOOR_W / 2] : [d.y - DOOR_W / 2, d.y + DOOR_W / 2]))
  .sort((p, q) => p[0] - q[0]);
function hWall(y, x0, x1, gaps = gapsFor('h', y), h = H) {
  let x = x0;
  for (const [g0, g1] of gaps) { if (g0 > x) walls.push({ x, y: y - T / 2, w: g0 - x, d: T, h }); x = Math.max(x, g1); }
  if (x1 > x) walls.push({ x, y: y - T / 2, w: x1 - x, d: T, h });
}
function vWall(x, y0, y1, gaps = gapsFor('v', x), h = H) {
  let y = y0;
  for (const [g0, g1] of gaps) { if (g0 > y) walls.push({ x: x - T / 2, y, w: T, d: g0 - y, h }); y = Math.max(y, g1); }
  if (y1 > y) walls.push({ x: x - T / 2, y, w: T, d: y1 - y, h });
}
hWall(T / 2, 0, W, []);                                  // north
vWall(T / 2, 0, D, []);                                  // west
vWall(W - T / 2, 0, D, []);                              // east
hWall(D - T / 2, 0, W, [[ENTRANCE.x0, ENTRANCE.x1]], 12); // south: low, like a dollhouse cut-away
hWall(ROW, 0, W);                                        // middle
for (const x of [400, 1000]) vWall(x, 0, ROW);
for (const x of [560, 1000, 1300]) vWall(x, ROW, D);

const furniture = [];
for (const r of ROOMS) {
  if (r.id === 'lobby') continue;
  const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2 + 20;
  const bw = Math.min(110, (r.x1 - r.x0) * 0.35);
  furniture.push({ kind: 'bench', x: cx - bw / 2, y: cy - 7, w: bw, d: 14, h: 9 });
}
furniture.push({ kind: 'desk', x: 735, y: 600, w: 90, d: 26, h: 18 });
const plants = [
  { x: 590, y: 860 }, { x: 970, y: 860 }, { x: 590, y: 460 }, { x: 970, y: 460 },
  { x: 30, y: 870 }, { x: 1570, y: 870 }, { x: 1570, y: 40 }, { x: 30, y: 40 },
].map((p) => ({ ...p, r: 9 }));
const solids = [...walls, ...furniture];

// ===== Projection and camera =====
const canvas = document.getElementById('museum');
const ctx = canvas.getContext('2d');
let dpr = 1, cw = 0, ch = 0;
const cam = { s: 1, ox: 0, oy: 0 };
let baseCam = { ...cam };
const sy = (y, z = 0) => y * K - z;

function fitCamera() {
  const top = -H - 4, bottom = D * K + 6;
  const padX = 24, padTop = cw < 700 ? 90 : 76, padBottom = 34;
  const s = Math.min((cw - padX * 2) / W, (ch - padTop - padBottom) / (bottom - top));
  return { s, ox: (cw - W * s) / 2, oy: padTop + ((ch - padTop - padBottom) - (bottom - top) * s) / 2 - top * s };
}
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cw = window.innerWidth; ch = window.innerHeight;
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  baseCam = fitCamera();
  if (!zoom.active) Object.assign(cam, baseCam);
  else Object.assign(cam, zoomTarget(zoom.painting));
}
const toProj = (mx, my) => ({ px: (mx - cam.ox) / cam.s, py: (my - cam.oy) / cam.s });

// ===== Artworks =====
let galleries = [];
const paintings = [];
const shortTitle = (t) => (t.length > 60 ? t.replace(/,\s*from the series.*$/i, '').replace(/\s*\(.*$/, '') : t);

function hangPaintings() {
  for (const g of galleries) {
    const room = roomById[g.id];
    if (!room) continue;
    const faceY = room.y0 === 0 ? T : ROW + T / 2;      // the south-facing side of the room's north wall
    const margin = 34;
    // Usable stretches of wall between doorways.
    let segs = [[room.x0 + margin, room.x1 - margin]];
    for (const [g0, g1] of gapsFor('h', room.y0 === 0 ? -1 : ROW)) {
      segs = segs.flatMap(([a, b]) => (g1 <= a || g0 >= b ? [[a, b]] : [[a, g0 - 12], [g1 + 12, b]].filter(([p, q]) => q - p > 20)));
    }
    const items = g.works.map((w) => {
      const h = Math.min(H - 14, 26 * w.scale);
      return { w, h, width: h * w.aspect };
    });
    const total = items.reduce((n, i) => n + i.width, 0);
    const avail = segs.reduce((n, [a, b]) => n + (b - a), 0);
    const gap = Math.max(10, (avail - total) / (items.length + 1));
    let si = 0, x = segs[0][0] + gap;
    for (const it of items) {
      while (si < segs.length && x + it.width > segs[si][1]) { si++; if (segs[si]) x = segs[si][0] + gap / 2; }
      if (si >= segs.length) { si = segs.length - 1; x = segs[si][1] - it.width; }
      const zc = H * 0.54;
      const p = {
        ...it.w, gallery: g, room, faceY,
        x0: x, x1: x + it.width, zTop: zc + it.h / 2, zBot: zc - it.h / 2,
        cx: x + it.width / 2, display: shortTitle(it.w.title),
        pixel: null,
      };
      // Miniatures are drawn as pixel art: one "pixel" is about 2.5 floor units.
      const cols = Math.max(6, Math.round(it.width / 2.5)), rows = Math.max(6, Math.round(it.h / 2.5));
      const tiny = loadImage(p.lqip, (img) => { if (!p.pixel) p.pixel = pixelate(img, cols, rows); });
      if (tiny && tiny.complete && tiny.naturalWidth) p.pixel = pixelate(tiny, cols, rows);
      loadImage(`images/${p.id}.jpg`, (img) => { p.pixel = pixelate(img, cols, rows); });
      paintings.push(p);
      x += it.width + gap;
    }
  }
}
function loadImage(src, onload) {
  if (!src) return null;
  const img = new Image();
  if (onload) img.onload = () => onload(img);
  img.src = src;
  return img;
}
// Shrink an image to a small grid (averaging in steps for cleaner colors) for blocky pixel art.
function pixelate(img, cols, rows) {
  let src = img, w = img.naturalWidth, h = img.naturalHeight;
  while (w / 2 > cols * 2 && h / 2 > rows * 2) {
    w = Math.round(w / 2); h = Math.round(h / 2);
    const step = document.createElement('canvas');
    step.width = w; step.height = h;
    const sctx = step.getContext('2d');
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(src, 0, 0, w, h);
    src = step;
  }
  const out = document.createElement('canvas');
  out.width = cols; out.height = rows;
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(src, 0, 0, cols, rows);
  return out;
}
const paintingRect = (p) => ({ x0: p.x0, x1: p.x1, y0: sy(p.faceY, p.zTop), y1: sy(p.faceY, p.zBot) });

// ===== Visitors =====
const BODY = ['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f', '#6d6875', '#b5838d', '#457b9d', '#e5989b', '#2a9d8f', '#264653', '#9c6644', '#8d99ae', '#d4a373', '#577590'];
const SKIN = ['#f3d9c4', '#e8c4a2', '#c99572', '#9a6646', '#6b4428'];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const PERSON_R = 5;
const people = [];
const roomAt = (x, y) => ROOMS.find((r) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1) || null;

function randomSpot(room) {
  const m = 28;
  for (let i = 0; i < 20; i++) {
    const x = rand(room.x0 + m, room.x1 - m), y = rand(room.y0 + m + (room.y0 === 0 ? 10 : 6), room.y1 - m);
    if (!hitsSolid(x, y, PERSON_R + 4)) return { x, y };
  }
  return { x: (room.x0 + room.x1) / 2, y: (room.y0 + room.y1) / 2 - 40 };
}
function viewingSpot(room) {
  const options = paintings.filter((p) => p.room === room);
  if (!options.length) return randomSpot(room);
  const p = pick(options);
  return { x: p.cx + rand(-0.4, 0.4) * (p.x1 - p.x0) + rand(-8, 8), y: p.faceY + rand(28, 70), facing: p };
}
function planNext(v) {
  const room = roomAt(v.x, v.y);
  v.path = [];
  if (!room) { v.path.push({ x: 780, y: 760 }); return; }
  const doors = DOORS.filter((d) => d.a === room.id || d.b === room.id);
  if (doors.length && Math.random() < 0.28) {
    const d = pick(doors);
    const next = roomById[d.a === room.id ? d.b : d.a];
    const inward = (r) => (d.o === 'h' ? { x: d.x, y: d.y + (r.y0 < d.y ? -26 : 26) } : { x: d.x + (r.x0 < d.x ? -26 : 26), y: d.y });
    v.path.push(inward(room), { x: d.x, y: d.y }, inward(next));
    const dest = next.id === 'lobby' || Math.random() < 0.35 ? randomSpot(next) : viewingSpot(next);
    v.path.push(dest);
  } else {
    v.path.push(room.id === 'lobby' || Math.random() < 0.35 ? randomSpot(room) : viewingSpot(room));
  }
}
function spawnPeople(n) {
  const rooms = ROOMS;
  for (let i = 0; i < n; i++) {
    const room = rooms[i % rooms.length];
    const s = Math.random() < 0.5 ? viewingSpot(room) : randomSpot(room);
    people.push({
      x: s.x, y: s.y, vx: 0, vy: 0, path: [], wait: rand(0, 6), speed: rand(16, 28), phase: rand(0, 6),
      body: pick(BODY), skin: pick(SKIN), size: rand(0.9, 1.1),
    });
  }
}

function hitsSolid(x, y, r) {
  return solids.some((b) => x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.d) ||
    plants.some((p) => Math.hypot(x - p.x, y - p.y) < r + p.r);
}
function collide(v) {
  for (const b of solids) {
    const nx = Math.max(b.x, Math.min(v.x, b.x + b.w)), ny = Math.max(b.y, Math.min(v.y, b.y + b.d));
    const dx = v.x - nx, dy = v.y - ny, dist = Math.hypot(dx, dy);
    if (dist < PERSON_R) {
      if (dist > 0.001) { v.x = nx + (dx / dist) * PERSON_R; v.y = ny + (dy / dist) * PERSON_R; }
      else { // center inside the box: push out the short way
        const left = v.x - b.x, right = b.x + b.w - v.x, up = v.y - b.y, down = b.y + b.d - v.y;
        const m = Math.min(left, right, up, down);
        if (m === left) v.x = b.x - PERSON_R; else if (m === right) v.x = b.x + b.w + PERSON_R;
        else if (m === up) v.y = b.y - PERSON_R; else v.y = b.y + b.d + PERSON_R;
      }
    }
  }
  for (const p of plants) {
    const dx = v.x - p.x, dy = v.y - p.y, dist = Math.hypot(dx, dy), min = p.r + PERSON_R;
    if (dist < min && dist > 0.001) { v.x = p.x + (dx / dist) * min; v.y = p.y + (dy / dist) * min; }
  }
  v.x = Math.max(T + PERSON_R, Math.min(W - T - PERSON_R, v.x));
  v.y = Math.max(T + PERSON_R, Math.min(D - T - PERSON_R, v.y));
}

let mouse = null;       // floor position of the cursor
const REPEL_R = 62;
function updatePeople(dt) {
  for (const v of people) {
    let ax = 0, ay = 0;
    const startRoom = roomAt(v.x, v.y);

    if (v.wait > 0) {
      v.wait -= dt;
      if (v.wait <= 0) planNext(v);
    } else if (v.path.length) {
      const t = v.path[0];
      const dx = t.x - v.x, dy = t.y - v.y, dist = Math.hypot(dx, dy);
      if (dist < 6) {
        v.path.shift();
        if (!v.path.length) v.wait = rand(2, 9);
      } else {
        ax += (dx / dist) * v.speed * 3 - v.vx * 3;
        ay += (dy / dist) * v.speed * 3 - v.vy * 3;
      }
    } else {
      planNext(v);
    }
    if (v.wait > 0 || !v.path.length) { ax -= v.vx * 4; ay -= v.vy * 4; }

    // Keep a little personal space.
    for (const o of people) {
      if (o === v) continue;
      const dx = v.x - o.x, dy = v.y - o.y, d2 = dx * dx + dy * dy;
      if (d2 < 196 && d2 > 0.01) { const d = Math.sqrt(d2); ax += (dx / d) * (14 - d) * 9; ay += (dy / d) * (14 - d) * 9; }
    }

    // Scatter away from the cursor.
    let fleeing = false;
    if (mouse) {
      const dx = v.x - mouse.x, dy = v.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < REPEL_R) {
        const f = (1 - d / REPEL_R) ** 1.5 * 1400;
        const ux = d > 0.01 ? dx / d : rand(-1, 1), uy = d > 0.01 ? dy / d : rand(-1, 1);
        ax += ux * f; ay += uy * f;
        fleeing = true;
      }
    }

    v.vx += ax * dt; v.vy += ay * dt;
    const max = fleeing ? 120 : v.speed * 1.3;
    const sp = Math.hypot(v.vx, v.vy);
    if (sp > max) { v.vx *= max / sp; v.vy *= max / sp; }
    v.x += v.vx * dt; v.y += v.vy * dt;
    collide(v);

    // Pushed into a different room? Make a fresh plan from where they ended up.
    const endRoom = roomAt(v.x, v.y);
    if (fleeing && endRoom !== startRoom) { v.path = []; v.wait = rand(0.5, 2); }
    if (fleeing && v.wait > 0) v.wait = Math.max(v.wait, 1);
    v.moving = Math.hypot(v.vx, v.vy) > 4;
    if (v.moving) v.phase += dt * (8 + Math.hypot(v.vx, v.vy) * 0.15);
  }
}

// ===== Drawing =====
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawFloor() {
  for (const r of ROOMS) {
    ctx.fillStyle = r.floor;
    ctx.fillRect(r.x0, sy(r.y0), r.x1 - r.x0, (r.y1 - r.y0) * K);
    ctx.strokeStyle = 'rgba(90, 60, 30, .07)'; ctx.lineWidth = 1;
    ctx.beginPath();
    if (r.id === 'lobby') {
      for (let x = r.x0; x < r.x1; x += 40) { ctx.moveTo(x, sy(r.y0)); ctx.lineTo(x, sy(r.y1)); }
      for (let y = r.y0; y < r.y1; y += 40) { ctx.moveTo(r.x0, sy(y)); ctx.lineTo(r.x1, sy(y)); }
    } else {
      for (let y = r.y0 + 22; y < r.y1; y += 22) { ctx.moveTo(r.x0, sy(y)); ctx.lineTo(r.x1, sy(y)); }
    }
    ctx.stroke();
  }
  // Doormat at the entrance
  ctx.fillStyle = '#c9b79c';
  ctx.fillRect(ENTRANCE.x0 + 8, sy(D - 40), ENTRANCE.x1 - ENTRANCE.x0 - 16, 26 * K);
  // Soft shadows cast south of horizontal walls
  for (const b of walls) {
    if (b.w <= b.d || b.h < 20) continue;
    const y = sy(b.y + b.d);
    const g = ctx.createLinearGradient(0, y, 0, y + 14);
    g.addColorStop(0, 'rgba(60, 40, 20, .13)'); g.addColorStop(1, 'rgba(60, 40, 20, 0)');
    ctx.fillStyle = g; ctx.fillRect(b.x, y, b.w, 14);
  }
  // Room names on the floor
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(70, 50, 30, .38)';
  for (const r of ROOMS) {
    const name = r.name || galleries.find((g) => g.id === r.id)?.name;
    if (!name) continue;
    const y = r.id === 'lobby' ? r.y1 - 90 : (r.y0 + r.y1) / 2 + 62;
    drawSpaced(name.toUpperCase(), (r.x0 + r.x1) / 2, sy(y), 2);
  }
}
function drawSpaced(text, x, y, spacing) {
  const widths = [...text].map((c) => ctx.measureText(c).width + spacing);
  let cx = x - (widths.reduce((a, b) => a + b, 0) - spacing) / 2;
  ctx.textAlign = 'left';
  [...text].forEach((c, i) => { ctx.fillText(c, cx, y); cx += widths[i]; });
  ctx.textAlign = 'center';
}
function drawBox(b, top, face, edge) {
  const yTop = sy(b.y, b.h), yFront = sy(b.y + b.d, b.h), yBase = sy(b.y + b.d);
  ctx.fillStyle = face; ctx.fillRect(b.x, yFront, b.w, yBase - yFront);
  ctx.fillStyle = top; ctx.fillRect(b.x, yTop, b.w, yFront - yTop);
  ctx.strokeStyle = edge; ctx.lineWidth = 0.6;
  ctx.strokeRect(b.x, yTop, b.w, yBase - yTop);
  ctx.beginPath(); ctx.moveTo(b.x, yFront); ctx.lineTo(b.x + b.w, yFront); ctx.stroke();
}
function drawWall(b) {
  drawBox(b, '#fffdf8', '#f1eadf', 'rgba(120, 100, 80, .35)');
  // The lobby sign on the middle wall
  if (b.y + b.d === ROW + T / 2 && b.x <= 880 && b.x + b.w >= 880 && b.x >= 560) {
    ctx.fillStyle = 'rgba(60, 45, 35, .7)'; ctx.font = '600 8px Georgia, serif';
    drawSpaced('THE MINIATURE MUSEUM', 890, sy(b.y + b.d, H * 0.55), 1.4);
  }
}
function drawPainting(p, hovered) {
  const r = paintingRect(p);
  const w = r.x1 - r.x0, h = r.y1 - r.y0, f = 1.6;
  // little gallery light on the wall
  const g = ctx.createRadialGradient(p.cx, r.y0 - 2, 1, p.cx, r.y0 + h / 2, w * 0.9 + 10);
  g.addColorStop(0, 'rgba(255, 248, 225, .9)'); g.addColorStop(1, 'rgba(255, 248, 225, 0)');
  ctx.fillStyle = g; ctx.fillRect(r.x0 - w * 0.5 - 6, sy(p.faceY, H - 2), w * 2 + 12, sy(p.faceY, 2) - sy(p.faceY, H - 2));
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, .28)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1.5;
  ctx.fillStyle = hovered ? '#b5543c' : '#3a2e25';
  ctx.fillRect(r.x0 - f, r.y0 - f, w + f * 2, h + f * 2);
  ctx.restore();
  if (p.pixel) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(p.pixel, r.x0, r.y0, w, h);
    ctx.imageSmoothingEnabled = true;
  } else { ctx.fillStyle = '#cbbfae'; ctx.fillRect(r.x0, r.y0, w, h); }
  if (hovered) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.strokeRect(r.x0 - f - 1.2, r.y0 - f - 1.2, w + f * 2 + 2.4, h + f * 2 + 2.4); }
}
function drawFurniture(b) {
  if (b.kind === 'bench') drawBox(b, '#b08a64', '#8f6c4c', 'rgba(60, 40, 20, .4)');
  else drawBox(b, '#f8f4ec', '#d9cfbf', 'rgba(60, 40, 20, .35)');
}
function drawPlant(p) {
  const y = sy(p.y);
  ctx.fillStyle = 'rgba(40, 30, 20, .15)'; ctx.beginPath(); ctx.ellipse(p.x, y, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b86f4c'; roundRect(p.x - 5, y - 9, 10, 9, 2); ctx.fill();
  ctx.fillStyle = '#6a9a6b';
  for (const [dx, dy, r] of [[-4, -15, 6], [4, -16, 6], [0, -21, 6.5]]) { ctx.beginPath(); ctx.arc(p.x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill(); }
}
function drawPerson(v) {
  const x = v.x, y = sy(v.y), s = v.size;
  const bob = v.moving ? Math.abs(Math.sin(v.phase)) * 1.3 : 0;
  ctx.fillStyle = 'rgba(40, 30, 20, .17)';
  ctx.beginPath(); ctx.ellipse(x, y, 5.5 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = v.body; roundRect(x - 3.8 * s, y - (11 + bob) * s, 7.6 * s, 10 * s, 3.6 * s); ctx.fill();
  ctx.fillStyle = v.skin; ctx.beginPath(); ctx.arc(x, y - (14.6 + bob) * s, 3.4 * s, 0, Math.PI * 2); ctx.fill();
}

let hovered = null;
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#e9e2d6'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr * cam.s, 0, 0, dpr * cam.s, dpr * cam.ox, dpr * cam.oy);

  // Building shadow
  ctx.fillStyle = 'rgba(80, 60, 40, .12)'; ctx.fillRect(6, sy(0) + 8, W, D * K + 4);
  drawFloor();

  // Painter's algorithm: draw everything from back (north) to front (south).
  const list = [];
  for (const b of walls) list.push([b.y + b.d, 0, () => drawWall(b)]);
  for (const p of paintings) list.push([p.faceY, 1, () => drawPainting(p, p === hovered)]);
  for (const b of furniture) list.push([b.y + b.d, 0, () => drawFurniture(b)]);
  for (const p of plants) list.push([p.y, 2, () => drawPlant(p)]);
  for (const v of people) list.push([v.y, 2, () => drawPerson(v)]);
  list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, , fn] of list) fn();
}

// ===== Zooming into a painting =====
const zoom = { active: false, painting: null, anim: null };
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function zoomTarget(p) {
  const r = paintingRect(p);
  const s = Math.min((cw * 0.55) / (r.x1 - r.x0), (ch * 0.55) / (r.y1 - r.y0));
  return { s, ox: cw / 2 - ((r.x0 + r.x1) / 2) * s, oy: ch / 2 - ((r.y0 + r.y1) / 2) * s };
}
function animateCamera(to, ms, done) {
  const from = { ...cam }, start = performance.now();
  zoom.anim = { step(now) {
    const t = Math.min(1, (now - start) / ms);
    const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    // interpolate the scale on a log curve so the zoom feels even
    const s = Math.exp(Math.log(from.s) + (Math.log(to.s) - Math.log(from.s)) * e);
    // keep the target point moving smoothly in screen space
    const fx = (cw / 2 - from.ox) / from.s, fy = (ch / 2 - from.oy) / from.s;
    const tx = (cw / 2 - to.ox) / to.s, ty = (ch / 2 - to.oy) / to.s;
    const cx = fx + (tx - fx) * e, cy = fy + (ty - fy) * e;
    cam.s = s; cam.ox = cw / 2 - cx * s; cam.oy = ch / 2 - cy * s;
    if (t >= 1) { zoom.anim = null; Object.assign(cam, to); done && done(); }
  } };
}
function openPainting(p) {
  hideTooltip();
  if (zoom.active && zoom.painting === p) return;
  const already = zoom.active;
  zoom.active = true; zoom.painting = p;
  if (already || reduceMotion) { Object.assign(cam, zoomTarget(p)); showViewer(p); return; }
  animateCamera(zoomTarget(p), 1000, () => showViewer(p));
}
function closePainting() {
  if (!zoom.active) return;
  const viewer = document.getElementById('viewer');
  viewer.classList.remove('show');
  setTimeout(() => { viewer.hidden = true; }, reduceMotion ? 0 : 300);
  const back = () => { zoom.active = false; zoom.painting = null; };
  if (reduceMotion) { Object.assign(cam, baseCam); back(); } else animateCamera(baseCam, 900, back);
  if (zoom.opener) { zoom.opener.focus(); zoom.opener = null; }
}

// ===== Viewer panel =====
const $ = (id) => document.getElementById(id);
function showViewer(p) {
  const viewer = $('viewer');
  $('v-room').textContent = p.featured ? p.gallery.name : `${p.gallery.name} · Also in the collection`;
  $('v-title').textContent = p.display;
  $('v-fulltitle').textContent = p.display !== p.title ? p.title : '';
  $('v-artist').textContent = p.artistDisplay || p.artist || '';
  const facts = [['Date', p.date], ['Medium', p.medium], ['Size', p.dimensions], ['Credit', p.credit]].filter(([, v]) => v);
  $('v-facts').replaceChildren(...facts.flatMap(([k, v]) => {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    return [dt, dd];
  }));
  $('v-desc').replaceChildren(...(p.description || 'No description available.').split(/\n\n+/).map((t) => {
    const el = document.createElement('p'); el.textContent = t; return el;
  }));
  $('v-link').href = `https://www.artic.edu/artworks/${p.id}`;
  const img = $('v-img');
  img.classList.remove('loaded');
  img.alt = `${p.display} by ${p.artist || 'unknown artist'}`;
  img.onload = () => img.classList.add('loaded');
  img.onerror = () => {
    $('v-art').title = "The full-size image couldn't load. Try the artic.edu link.";
  };
  $('v-art').title = '';
  $('v-art').style.backgroundImage = p.lqip ? `url("${p.lqip}")` : '';
  img.src = p.imageId ? `images/${p.id}.jpg` : '';
  viewer.hidden = false;
  viewer.scrollTop = 0;
  requestAnimationFrame(() => viewer.classList.add('show'));
  $('v-back').focus();
}
function step(dir) {
  if (!zoom.painting) return;
  const i = paintings.indexOf(zoom.painting);
  const next = paintings[(i + dir + paintings.length) % paintings.length];
  zoom.painting = next;
  Object.assign(cam, zoomTarget(next));
  showViewer(next);
}
$('v-back').addEventListener('click', closePainting);
$('v-prev').addEventListener('click', () => step(-1));
$('v-next').addEventListener('click', () => step(1));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (zoom.active) closePainting(); else toggleGuide(false); }
  if (zoom.active && !$('viewer').hidden) {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  }
});

// ===== Guide =====
function buildGuide() {
  const nav = $('guide');
  for (const g of galleries) {
    const h = document.createElement('h3'); h.textContent = g.name; nav.append(h);
    for (const p of paintings.filter((x) => x.gallery === g)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.append(p.display + ' ');
      const s = document.createElement('span'); s.textContent = p.artist || ''; b.append(s);
      b.addEventListener('click', () => { toggleGuide(false); zoom.opener = $('guide-btn'); openPainting(p); });
      nav.append(b);
    }
  }
}
function toggleGuide(force) {
  const nav = $('guide'), open = force ?? nav.hidden;
  nav.hidden = !open;
  $('guide-btn').setAttribute('aria-expanded', String(open));
}
$('guide-btn').addEventListener('click', () => toggleGuide());

// ===== Pointer =====
const tooltip = $('tooltip');
function hideTooltip() { tooltip.hidden = true; }
function paintingAt(mx, my) {
  const { px, py } = toProj(mx, my);
  return paintings.find((p) => { const r = paintingRect(p); return px >= r.x0 - 3 && px <= r.x1 + 3 && py >= r.y0 - 3 && py <= r.y1 + 3; }) || null;
}
let hintTimer = null;
function onMove(e) {
  if (zoom.active) return;
  const { px, py } = toProj(e.clientX, e.clientY);
  mouse = { x: px, y: py / K };
  hovered = paintingAt(e.clientX, e.clientY);
  canvas.style.cursor = hovered ? 'pointer' : 'default';
  if (hovered && e.pointerType !== 'touch') {
    tooltip.replaceChildren(hovered.display, Object.assign(document.createElement('span'), { textContent: hovered.artist || '' }));
    const r = paintingRect(hovered);
    tooltip.style.left = `${cam.ox + ((r.x0 + r.x1) / 2) * cam.s}px`;
    tooltip.style.top = `${cam.oy + r.y0 * cam.s}px`;
    tooltip.hidden = false;
  } else hideTooltip();
  if (!hintTimer) hintTimer = setTimeout(() => { $('hint').style.opacity = '0.55'; }, 6000);
}
canvas.addEventListener('pointermove', onMove);
canvas.addEventListener('pointerdown', onMove);
canvas.addEventListener('pointerleave', () => { mouse = null; hovered = null; hideTooltip(); });
canvas.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') setTimeout(() => { mouse = null; }, 400); });
canvas.addEventListener('click', (e) => {
  if (zoom.active) return;
  const p = paintingAt(e.clientX, e.clientY);
  if (p) openPainting(p);
});

// ===== Main loop =====
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (zoom.anim) zoom.anim.step(now);
  updatePeople(dt);
  draw();
  requestAnimationFrame(frame);
}

async function start() {
  resize();
  window.addEventListener('resize', resize);
  try {
    const data = await (await fetch('data/artworks.json')).json();
    galleries = data.galleries;
  } catch {
    $('hint').textContent = "Couldn't load the artworks. Try refreshing.";
  }
  hangPaintings();
  buildGuide();
  spawnPeople(cw < 700 ? 45 : 75);
  requestAnimationFrame(frame);
}
start();
