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
  { id: 'modern',        x0: 0,    y0: ROW, x1: 420,  y1: D,   floor: '#ebe6de' },
  { id: 'lobby',         x0: 420,  y0: ROW, x1: 880,  y1: D,   floor: '#f3eee6', name: 'Lobby' },
  { id: 'japanese',      x0: 880,  y0: ROW, x1: 1200, y1: D,   floor: '#e9dfcf' },
  { id: 'american',      x0: 1200, y0: ROW, x1: W,    y1: D,   floor: '#e7dac6' },
];
const roomById = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

// Doorways: [roomA, roomB, x, y, orientation]. 'h' = gap in a horizontal wall, 'v' = in a vertical wall.
const DOOR_W = 70;
const DOORS = [
  ['oldmasters', 'modern', 205, ROW, 'h'],
  ['impressionism', 'lobby', 775, ROW, 'h'],
  ['okeeffe', 'japanese', 1145, ROW, 'h'],
  ['oldmasters', 'impressionism', 400, 215, 'v'],
  ['impressionism', 'okeeffe', 1000, 215, 'v'],
  ['modern', 'lobby', 420, 655, 'v'],
  ['lobby', 'japanese', 880, 655, 'v'],
  ['japanese', 'american', 1200, 655, 'v'],
].map(([a, b, x, y, o]) => ({ a, b, x, y, o }));
const ENTRANCE = { x0: 600, x1: 700 };
const LOBBY_X = 650;   // middle of the lobby

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
for (const x of [420, 880, 1200]) vWall(x, ROW, D);

const furniture = [];
for (const r of ROOMS) {
  if (r.id === 'lobby') continue;
  const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2 + 20;
  const bw = Math.min(110, (r.x1 - r.x0) * 0.35);
  furniture.push({ kind: 'bench', x: cx - bw / 2, y: cy - 7, w: bw, d: 14, h: 9 });
}
furniture.push({ kind: 'plaque', x: LOBBY_X - 100, y: 566, w: 200, d: 26, h: 24 });
const PEDESTAL = { kind: 'pedestal', x: LOBBY_X - 11, y: 690, w: 22, d: 22, h: 14 };
furniture.push(PEDESTAL);
const plants = [
  { x: 450, y: 860 }, { x: 850, y: 860 }, { x: 450, y: 460 }, { x: 850, y: 460 },
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
    // Split the paintings across the wall stretches (trying every order and split) and keep the
    // arrangement that lets them stay biggest, leaving at least MIN_GAP around each.
    const MIN_GAP = 8;
    const base = g.works.map((w) => {
      const h = Math.min(H - 14, 26 * w.scale);
      return { w, h, width: h * w.aspect };
    });
    let best = { fit: -1, groups: null };
    const tryGroups = (groups) => {
      let fit = 1;
      groups.forEach((list, si) => {
        if (!list.length) return;
        const room = segs[si][1] - segs[si][0] - MIN_GAP * (list.length + 1);
        fit = Math.min(fit, room / list.reduce((n, it) => n + it.width, 0));
      });
      if (fit > best.fit + 1e-6) best = { fit, groups };
    };
    const splits = (list, s) => (s === 1 ? [[list]] :
      Array.from({ length: list.length + 1 }, (_, i) => splits(list.slice(i), s - 1).map((rest) => [list.slice(0, i), ...rest])).flat());
    const perms = (list) => (list.length <= 1 ? [list] : list.flatMap((x, i) => perms([...list.slice(0, i), ...list.slice(i + 1)]).map((p) => [x, ...p])));
    for (const order of base.length <= 6 ? perms(base) : [base]) for (const groups of splits(order, segs.length)) tryGroups(groups);
    const fit = Math.max(0.2, best.fit);
    const groups = best.groups.map((list) => list.map((it) => ({ ...it, h: it.h * fit, width: it.width * fit })));
    // Space each stretch's paintings evenly.
    const placed = [];
    groups.forEach((list, si) => {
      const [a, b] = segs[si];
      const gap = (b - a - list.reduce((n, it) => n + it.width, 0)) / (list.length + 1);
      let x = a + gap;
      for (const it of list) { placed.push({ it, x }); x += it.width + gap; }
    });
    for (const { it, x } of placed) {
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
      loadImage(p.image, (img) => { p.pixel = pixelate(img, cols, rows); });
      paintings.push(p);
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
// A point just inside room r next to door d, so walkers line up before passing through.
const inward = (d, r) => (d.o === 'h' ? { x: d.x, y: d.y + (r.y0 < d.y ? -26 : 26) } : { x: d.x + (r.x0 < d.x ? -26 : 26), y: d.y });
function planNext(v) {
  const room = roomAt(v.x, v.y);
  v.path = [];
  if (v.guard) {                        // guards return to their post and stand there
    if (Math.hypot(v.x - v.post.x, v.y - v.post.y) > 8) v.path = legTo(room || roomById.lobby, roomAt(v.post.x, v.post.y), v.post);
    else v.wait = rand(8, 20);
    return;
  }
  if (!room) { v.path.push({ x: LOBBY_X, y: 760 }); return; }
  const doors = DOORS.filter((d) => d.a === room.id || d.b === room.id);
  if (doors.length && Math.random() < 0.28) {
    const d = pick(doors);
    const next = roomById[d.a === room.id ? d.b : d.a];
    v.path.push(inward(d, room), { x: d.x, y: d.y }, inward(d, next));
    const dest = v.guard || next.id === 'lobby' || Math.random() < 0.35 ? randomSpot(next) : viewingSpot(next);
    v.path.push(dest);
  } else {
    v.path.push(v.guard || room.id === 'lobby' || Math.random() < 0.35 ? randomSpot(room) : viewingSpot(room));
  }
}
// Guards stand beside doorways: [roomA, roomB, which room's side to stand on]. Plus one at the entrance.
const GUARD_DOORS = [['impressionism', 'lobby', 'lobby'], ['impressionism', 'okeeffe', 'impressionism'],
  ['modern', 'lobby', 'modern'], ['japanese', 'american', 'american']];
function guardPosts() {
  const posts = GUARD_DOORS.map(([a, b, side]) => {
    const d = DOORS.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    const r = roomById[side];
    if (d.o === 'h') return { x: d.x + DOOR_W / 2 + 11, y: d.y + (r.y0 < d.y ? -16 : 16) };
    return { x: d.x + (r.x0 < d.x ? -16 : 16), y: d.y - DOOR_W / 2 - 11 };
  });
  posts.push({ x: ENTRANCE.x1 + 14, y: D - 30 });
  return posts;
}
function spawnGuards() {
  for (const post of guardPosts()) {
    people.push({
      x: post.x, y: post.y, vx: 0, vy: 0, path: [], wait: rand(2, 8), speed: rand(38, 44), phase: rand(0, 6),
      body: '#27324a', skin: pick(SKIN), size: 1.08, guard: true, post,
    });
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

// If furniture blocks the straight line to a target, return a corner to walk around it.
function segHitsBox(ax, ay, bx, by, b, m) {
  const x0 = b.x - m, x1 = b.x + b.w + m, y0 = b.y - m, y1 = b.y + b.d + m;
  const dx = bx - ax, dy = by - ay;
  let t0 = 0, t1 = 1;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  return clip(-dx, ax - x0) && clip(dx, x1 - ax) && clip(-dy, ay - y0) && clip(dy, y1 - ay) && t0 <= t1;
}
function detour(from, to) {
  for (const b of furniture) {
    if (!segHitsBox(from.x, from.y, to.x, to.y, b, PERSON_R)) continue;
    const m = PERSON_R + 8;
    let best = null, bestLen = Infinity;
    for (const [cx, cy] of [[b.x - m, b.y - m], [b.x + b.w + m, b.y - m], [b.x - m, b.y + b.d + m], [b.x + b.w + m, b.y + b.d + m]]) {
      const len = Math.hypot(cx - from.x, cy - from.y) + Math.hypot(to.x - cx, to.y - cy);
      const clear = !segHitsBox(from.x, from.y, cx, cy, b, PERSON_R - 2);
      if (len + (clear ? 0 : 1000) < bestLen) { bestLen = len + (clear ? 0 : 1000); best = { x: cx, y: cy, around: true }; }
    }
    return best;
  }
  return null;
}
// Next point to walk toward, inserting a detour around furniture when needed.
function nextStep(walker) {
  const t = walker.path[0];
  if (t && !t.around) { const d = detour(walker, t); if (d) walker.path.unshift(d); }
  return walker.path[0];
}

let mouse = null;       // floor position of the cursor
let flashCooldown = 4;  // seconds until someone may take another flash photo
const flashes = [];
const FLASH_TIME = 0.45;
function takePhoto(v) {
  const room = roomAt(v.x, v.y);
  flashes.push({ x: v.x, y: v.y, painting: v.photo.painting, t: 0 });
  // The nearest guard in the room walks over to have a word.
  const guard = people.filter((g) => g.guard && !g.chasing)
    .sort((a, b) => Math.hypot(a.x - v.x, a.y - v.y) - Math.hypot(b.x - v.x, b.y - v.y))[0];
  if (guard && room) {
    guard.path = legTo(roomAt(guard.x, guard.y) || roomById.lobby, room, { x: v.x + (guard.x < v.x ? -15 : 15), y: v.y + 4 });
    guard.wait = 0;
    guard.scold = true;
  }
}
const REPEL_R = 62;
function updatePeople(dt) {
  flashCooldown -= dt;
  for (const v of people) {
    let ax = 0, ay = 0;
    if (v.say && (v.say.t -= dt) <= 0) v.say = null;
    const startRoom = roomAt(v.x, v.y);

    if (v.wait > 0) {
      v.wait -= dt;
      if (v.wait <= 0) planNext(v);
    } else if (v.path.length) {
      const t = nextStep(v);
      const dx = t.x - v.x, dy = t.y - v.y, dist = Math.hypot(dx, dy);
      if (dist < 6) {
        v.path.shift();
        if (!v.path.length) {
          v.wait = v.guard ? (v.chasing ? 0 : rand(6, 14)) : rand(2, 9);
          if (v.scold) { v.scold = false; v.say = { text: 'No flash!', t: 2.4 }; v.wait = 3; }  // then planNext walks them back
          // Now and then, someone looking at a painting takes a flash photo.
          if (!v.guard && t.facing && flashCooldown <= 0 && Math.random() < 0.3) {
            v.photo = { t: 0, painting: t.facing, fired: false };
            v.wait = Math.max(v.wait, 4.5);
            flashCooldown = rand(7, 13);
          }
        }
      } else {
        const pace = v.chasing ? 135 : v.scold ? 110 : v.speed;   // guards hurry when chasing or scolding
        ax += (dx / dist) * pace * 3 - v.vx * 3;
        ay += (dy / dist) * pace * 3 - v.vy * 3;
      }
    } else {
      planNext(v);
    }
    if (v.wait > 0 || !v.path.length) { ax -= v.vx * 4; ay -= v.vy * 4; }

    if (v.photo) {
      v.photo.t += dt;
      if (!v.photo.fired && v.photo.t >= 1) { v.photo.fired = true; takePhoto(v); }
      if (v.photo.t > 1.7) v.photo = null;
    }

    // Guards chase the runaway statue, through the galleries, until it's back on its pedestal.
    if (v.guard) {
      if (statue.state === 'run') {
        v.chasing = true; v.scold = false;
        if (statue.catchable && statue.runT > 4 && Math.hypot(statue.x - v.x, statue.y - v.y) < 15) arrestStatue(v);
        v.chaseT = (v.chaseT || 0) - dt;
        if (v.chaseT <= 0) {
          v.chaseT = 0.35;
          const target = roomAt(statue.x, statue.y) || roomById.lobby;
          v.path = legTo(startRoom || roomById.lobby, target, { x: statue.x, y: statue.y });
          v.wait = 0;
        }
      } else if (v.chasing) {
        v.chasing = false;              // the statue is home or caught: back to the post
        v.path = []; v.wait = rand(0.6, 1.8);
      }
    }

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
        const f = (1 - d / REPEL_R) ** 1.5 * 1400 * (v.guard ? (v.chasing ? 0.25 : 0.7) : 1);
        const ux = d > 0.01 ? dx / d : rand(-1, 1), uy = d > 0.01 ? dy / d : rand(-1, 1);
        ax += ux * f; ay += uy * f;
        fleeing = true;
      }
    }

    if (statue.state === 'run' && !v.guard) {
      const dx = v.x - statue.x, dy = v.y - statue.y, d = Math.hypot(dx, dy);
      const R = 75;   // visitors jump out of the statue's way
      if (d < R && d > 0.01) { const f = (1 - d / R) ** 1.2 * 1500; ax += (dx / d) * f; ay += (dy / d) * f; fleeing = true; }
    }

    v.vx += ax * dt; v.vy += ay * dt;
    if (fleeing) v.photo = null;
    const max = v.chasing ? 135 : fleeing ? 120 : v.scold ? 110 : v.speed * 1.3;
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

// ===== The lobby statue: click it and it hops down, runs off, then sneaks back =====
const STATUE_HOME = { x: PEDESTAL.x + PEDESTAL.w / 2, y: PEDESTAL.y + PEDESTAL.d / 2 };
const STATUE_LANDING = { x: STATUE_HOME.x, y: PEDESTAL.y + PEDESTAL.d + 10 };
const statue = { ...STATUE_HOME, z: PEDESTAL.h, state: 'still', path: [], vx: 0, vy: 0, phase: 0, hop: null };

function roomRoute(fromId, toId) {          // shortest list of doors between two rooms
  const prev = { [fromId]: null }, queue = [fromId];
  while (queue.length) {
    const id = queue.shift();
    if (id === toId) break;
    for (const d of DOORS) {
      const next = d.a === id ? d.b : d.b === id ? d.a : null;
      if (next && !(next in prev)) { prev[next] = { id, d }; queue.push(next); }
    }
  }
  const doors = [];
  for (let id = toId; prev[id]; id = prev[id].id) doors.unshift(prev[id].d);
  return doors;
}
function legTo(fromRoom, toRoom, dest) {
  const pts = [];
  let cur = fromRoom;
  for (const d of roomRoute(fromRoom.id, toRoom.id)) {
    const next = roomById[d.a === cur.id ? d.b : d.a];
    pts.push(inward(d, cur), { x: d.x, y: d.y }, inward(d, next));
    cur = next;
  }
  pts.push(dest);
  return pts;
}
function planEscape() {
  // Dash through two other galleries, then come home.
  const here = roomAt(statue.x, statue.y) || roomById.lobby;
  const others = ROOMS.filter((r) => r.id !== 'lobby' && r !== here);
  const r1 = pick(others), r2 = pick(others.filter((r) => r !== r1));
  const s1 = randomSpot(r1), s2 = randomSpot(r2);
  statue.path = [...legTo(here, r1, s1), ...legTo(r1, r2, s2), ...legTo(r2, roomById.lobby, STATUE_LANDING)];
}
function startHop(from, to, then) {
  statue.hop = { from, to, t: 0, dur: 0.45, then };
  statue.state = 'hop';
}
function kickStatue() {
  if (statue.state === 'still') {
    statue.catchable = Math.random() < 0.4;   // some runs end in an arrest
    startHop({ ...STATUE_HOME, z: PEDESTAL.h }, { ...STATUE_LANDING, z: 0 }, () => { statue.state = 'run'; statue.runT = 0; planEscape(); });
  } else if (statue.state === 'run') {
    planEscape();                            // clicked again mid-run: off it goes somewhere else
  }
}
// Caught! The statue shatters into marble chunks, which fade away before it reappears on its pedestal.
const shards = [];
function arrestStatue(guard) {
  guard.say = { text: 'Gotcha!', t: 2.2 };
  guard.chasing = false; guard.path = []; guard.wait = 2;
  const sprite = statueSprite('run', Math.floor(statue.phase / 1.6) % 4, false);
  const px = sprite.getContext('2d').getImageData(0, 0, SPR_W, SPR_H).data;
  // one chunk per 2x2 block of the sprite
  for (let y = 0; y < SPR_H; y += 2) for (let x = 0; x < SPR_W; x += 2) {
    const i = (y * SPR_W + x) * 4;
    if (px[i + 3] < 200) continue;
    const ox = (x - SPR_W / 2) * STATUE_PX;
    shards.push({
      x: statue.x + ox, y: statue.y + rand(-2, 2), z: (SPR_H - y) * STATUE_PX,
      vx: ox * rand(3, 6) + rand(-25, 25), vy: rand(-40, 40), vz: rand(30, 110),
      color: `rgb(${px[i]}, ${px[i + 1]}, ${px[i + 2]})`, size: STATUE_PX * rand(1.6, 2.4),
    });
  }
  statue.state = 'broken';
  statue.brokenT = 0;
  statue.vx = statue.vy = 0;
}
function updateBroken(dt) {
  statue.brokenT += dt;
  for (const p of shards) {
    p.vz -= 320 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.z <= 0) { p.z = 0; p.vz *= -0.35; p.vx *= 0.55; p.vy *= 0.55; }
  }
  if (statue.brokenT > 4) {                 // pieces are gone: back on the pedestal
    shards.length = 0;
    Object.assign(statue, { ...STATUE_HOME, z: PEDESTAL.h, state: 'still', path: [], appear: 0.6 });
  }
}
function drawShards() {
  if (!shards.length) return;
  ctx.globalAlpha = Math.max(0, Math.min(1, 4 - statue.brokenT));   // fade during the last second
  for (const p of shards) {
    const x = p.x, y = sy(p.y);
    ctx.fillStyle = 'rgba(40, 30, 20, .12)'; ctx.fillRect(x - p.size / 2, y - p.size * 0.25, p.size, p.size * 0.5);
    ctx.fillStyle = p.color; ctx.fillRect(x - p.size / 2, y - p.z - p.size, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}
function updateStatue(dt) {
  if (statue.appear > 0) statue.appear = Math.max(0, statue.appear - dt);
  if (statue.state === 'broken') return updateBroken(dt);
  if (statue.state === 'hop') {
    const h = statue.hop;
    h.t = Math.min(1, h.t + dt / h.dur);
    statue.x = h.from.x + (h.to.x - h.from.x) * h.t;
    statue.y = h.from.y + (h.to.y - h.from.y) * h.t;
    statue.z = h.from.z + (h.to.z - h.from.z) * h.t + Math.sin(h.t * Math.PI) * 16;
    if (h.t >= 1) { statue.hop = null; h.then(); }
    return;
  }
  if (statue.state !== 'run') return;
  statue.runT += dt;
  let ax = 0, ay = 0;
  const t = nextStep(statue);
  // Safety net: if it's barely moving toward a waypoint, give up on that waypoint.
  statue.slowT = Math.hypot(statue.vx, statue.vy) < 15 ? (statue.slowT || 0) + dt : 0;
  if (t && statue.slowT > 1.2) { statue.path.shift(); statue.slowT = 0; }
  if (t) {
    const dx = t.x - statue.x, dy = t.y - statue.y, dist = Math.hypot(dx, dy);
    if (dist < 8) statue.path.shift();
    else { ax += (dx / dist) * 900 - statue.vx * 6; ay += (dy / dist) * 900 - statue.vy * 6; }
  } else if (Math.hypot(statue.x - STATUE_LANDING.x, statue.y - STATUE_LANDING.y) < 10) {
    statue.vx = statue.vy = 0;
    startHop({ x: statue.x, y: statue.y, z: 0 }, { ...STATUE_HOME, z: PEDESTAL.h }, () => { statue.state = 'still'; });
    return;
  } else {
    statue.path = legTo(roomAt(statue.x, statue.y) || roomById.lobby, roomById.lobby, STATUE_LANDING);
  }
  // It's shy of the cursor too.
  if (mouse) {
    const dx = statue.x - mouse.x, dy = statue.y - mouse.y, d = Math.hypot(dx, dy);
    if (d < 50 && d > 0.01) { ax += (dx / d) * 2500 * (1 - d / 50); ay += (dy / d) * 2500 * (1 - d / 50); }
  }
  const before = roomAt(statue.x, statue.y);
  statue.vx += ax * dt; statue.vy += ay * dt;
  const sp = Math.hypot(statue.vx, statue.vy), max = statue.catchable ? 110 : 140;
  if (sp > max) { statue.vx *= max / sp; statue.vy *= max / sp; }
  statue.x += statue.vx * dt; statue.y += statue.vy * dt;
  collide(statue);
  const after = roomAt(statue.x, statue.y);
  if (after && after !== before) {
    // Knocked off course into another room? Head home from here.
    const expected = statue.path.find((p) => roomAt(p.x, p.y));
    if (expected && roomAt(expected.x, expected.y) !== after && !DOORS.some((d) => Math.hypot(d.x - statue.x, d.y - statue.y) < 50)) {
      statue.path = legTo(after, roomById.lobby, STATUE_LANDING);
    }
  }
  statue.phase += dt * 16;
}
// The statue is pixel art: drawn with simple shapes on a tiny grid, then given hard edges and an outline.
const STATUE_PX = 1.55;             // floor units per sprite pixel
const SPR_W = 14, SPR_H = 23;
const spriteCache = new Map();
function statueSprite(pose, frame, hot) {
  const key = `${pose}-${frame}-${hot}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const c = document.createElement('canvas');
  c.width = SPR_W; c.height = SPR_H;
  const g = c.getContext('2d');
  const marble = '#f5f1e9', shade = '#c8bead';
  const cap = (x, y, w, h, fill) => { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, Math.min(w, h) / 2); g.fill(); };
  const head = (x, y) => { g.fillStyle = marble; g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill(); };
  if (pose === 'still') {             // thoughtful pose: one arm at its side, one hand raised to the chin
    cap(3.6, 9.4, 6.8, 11, marble);
    cap(1.4, 10, 2.4, 8, shade);
    cap(10.2, 6.4, 2.4, 6.8, shade);
    head(7.3, 4.6);
  } else {                            // running: arms and legs swing in four frames
    const sw = [-2, 0, 2, 0][frame];
    cap(4.4, 17.5, 2.4, frame === 0 ? 5 : 3.4, shade);
    cap(7.4, 17.5, 2.4, frame === 2 ? 5 : 3.4, shade);
    cap(3.6, 9.4, 6.8, 9, marble);
    cap(1.2, 10 + sw, 2.4, 6.5, shade);
    cap(10.4, 10 - sw, 2.4, 6.5, shade);
    head(7, 4.6);
  }
  g.globalCompositeOperation = 'source-atop';      // soft shading down the right side
  g.fillStyle = 'rgba(150, 140, 125, .3)';
  g.fillRect(8.4, 0, SPR_W, SPR_H);
  g.globalCompositeOperation = 'source-over';
  const img = g.getImageData(0, 0, SPR_W, SPR_H), d = img.data;
  const solid = new Uint8Array(SPR_W * SPR_H);
  for (let i = 0; i < solid.length; i++) { solid[i] = d[i * 4 + 3] >= 110 ? 1 : 0; d[i * 4 + 3] = solid[i] ? 255 : 0; }
  const edge = hot ? [181, 84, 60] : [148, 138, 122];
  for (let y = 0; y < SPR_H; y++) for (let x = 0; x < SPR_W; x++) {
    const i = y * SPR_W + x;
    if (solid[i]) continue;
    const near = (x > 0 && solid[i - 1]) || (x < SPR_W - 1 && solid[i + 1]) || (y > 0 && solid[i - SPR_W]) || (y < SPR_H - 1 && solid[i + SPR_W]);
    if (near) { d[i * 4] = edge[0]; d[i * 4 + 1] = edge[1]; d[i * 4 + 2] = edge[2]; d[i * 4 + 3] = 235; }
  }
  g.putImageData(img, 0, 0);
  spriteCache.set(key, c);
  return c;
}
function statueRect() {
  const base = sy(statue.y) - statue.z;
  return { x0: statue.x - (SPR_W * STATUE_PX) / 2, x1: statue.x + (SPR_W * STATUE_PX) / 2, y0: base - SPR_H * STATUE_PX, y1: base + 3 };
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
function drawStatue() {
  const x = statue.x, floorY = sy(statue.y);
  if (statue.state === 'broken') return;
  const running = statue.state === 'run';
  const bob = statue.state === 'run' ? Math.abs(Math.sin(statue.phase)) * 2 : 0;
  const base = floorY - statue.z - bob;
  // shadow: on the pedestal top when standing there, on the floor otherwise
  const shadowY = statue.state === 'still' ? floorY - PEDESTAL.h : floorY;
  ctx.fillStyle = 'rgba(40, 30, 20, .18)';
  ctx.beginPath(); ctx.ellipse(x, shadowY, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  const frame = running ? Math.floor(statue.phase / 1.6) % 4 : 0;
  const sprite = statueSprite(running ? 'run' : 'still', frame, statueHovered);
  const w = SPR_W * STATUE_PX, h = SPR_H * STATUE_PX;
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1 - (statue.appear || 0) / 0.6;      // fades in when it reappears
  ctx.drawImage(sprite, x - w / 2, base - h + STATUE_PX * (running ? 1 : 2.5), w, h);
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = true;
}
function drawFurniture(b) {
  if (b.kind === 'pedestal') return drawBox(b, '#f1ede6', '#d6cfc3', 'rgba(60, 40, 20, .35)');
  if (b.kind === 'plaque') {
    drawBox(b, '#fdfbf6', '#ece5d9', 'rgba(60, 40, 20, .35)');
    // the museum's name engraved on the front, sized to fit
    const yFront = sy(b.y + b.d, b.h), yBase = sy(b.y + b.d);
    let size = 20;
    do { ctx.font = `${size}px Pixelta, Georgia, serif`; size -= 0.25; }
    while (ctx.measureText('The Miniature Museum').width + 20 * 0.6 > b.w - 18 && size > 4);
    ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(70, 52, 38, .85)';
    drawSpaced('The Miniature Museum', b.x + b.w / 2, (yFront + yBase) / 2 + 1, 0.6);
    return;
  }
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
  const hy = y - (14.6 + bob) * s;
  ctx.fillStyle = v.skin; ctx.beginPath(); ctx.arc(x, hy, 3.4 * s, 0, Math.PI * 2); ctx.fill();
  if (v.guard) {
    ctx.fillStyle = '#1a2236';
    ctx.beginPath(); ctx.arc(x, hy - 0.6 * s, 3.5 * s, Math.PI, 0); ctx.fill();   // cap
    ctx.fillRect(x - 4.4 * s, hy - 0.9 * s, 8.8 * s, 1.3 * s);                     // brim
    ctx.fillStyle = '#e9c46a'; ctx.fillRect(x - 2.4 * s, y - 8.6 * s, 1.4 * s, 1.4 * s); // badge
  }
  if (v.photo && v.photo.t < 1.7) {                                                // camera held up
    ctx.fillStyle = v.skin;
    ctx.fillRect(x - 3.6 * s, hy - 3.5 * s, 1.4 * s, 4 * s); ctx.fillRect(x + 2.2 * s, hy - 3.5 * s, 1.4 * s, 4 * s);
    ctx.fillStyle = '#2b2b2b'; roundRect(x - 3 * s, hy - 6.6 * s, 6 * s, 3.4 * s, 0.8 * s); ctx.fill();
    ctx.fillStyle = '#9aa0a6'; ctx.fillRect(x + 1 * s, hy - 7.4 * s, 1.6 * s, 0.9 * s);
  }
}
function drawOverlays() {
  drawShards();
  // Camera flashes: a burst of light at the camera and on the painting.
  for (const f of flashes) {
    const a = Math.max(0, 1 - f.t / FLASH_TIME) ** 0.7;
    const cx = f.x, cy = sy(f.y) - 22, R = 55;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, `rgba(255, 255, 255, ${a})`); g.addColorStop(0.25, `rgba(255, 253, 240, ${0.7 * a})`); g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    if (f.painting) {
      const r = paintingRect(f.painting);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * a})`;
      ctx.fillRect(r.x0 - 2, r.y0 - 2, r.x1 - r.x0 + 4, r.y1 - r.y0 + 4);
    }
  }
  // Guards' speech bubbles
  ctx.font = '700 9px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  for (const v of people) {
    if (!v.say) continue;
    const x = v.x, y = sy(v.y) - 32, w = ctx.measureText(v.say.text).width + 12;
    ctx.globalAlpha = Math.min(1, v.say.t * 3);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(40, 30, 20, .35)'; ctx.lineWidth = 0.6;
    roundRect(x - w / 2, y - 7.5, w, 15, 6); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 3, y + 7.4); ctx.lineTo(x, y + 11.5); ctx.lineTo(x + 3, y + 7.4); ctx.fill();
    ctx.fillStyle = '#b5543c'; ctx.fillText(v.say.text, x, y + 0.3);
    ctx.globalAlpha = 1;
  }
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
  list.push([statue.state === 'run' ? statue.y : Math.max(statue.y, PEDESTAL.y + PEDESTAL.d) + 0.1, 3, drawStatue]);
  list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, , fn] of list) fn();
  drawOverlays();
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
  $('v-room').textContent = [p.gallery.name, p.note || (p.featured ? '' : 'Also in the collection')].filter(Boolean).join(' · ');
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
  $('v-link').href = p.link;
  $('v-link').textContent = p.linkLabel || 'View on artic.edu ↗';
  const img = $('v-img');
  img.classList.remove('loaded');
  img.alt = `${p.display} by ${p.artist || 'unknown artist'}`;
  img.onload = () => img.classList.add('loaded');
  img.onerror = () => {
    $('v-art').title = "The full-size image couldn't load. Try the artic.edu link.";
  };
  $('v-art').title = '';
  $('v-art').style.backgroundImage = p.lqip ? `url("${p.lqip}")` : '';
  img.src = p.image || '';
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
let statueHovered = false;
function statueAt(mx, my) {
  const { px, py } = toProj(mx, my), r = statueRect();
  return px >= r.x0 && px <= r.x1 && py >= r.y0 && py <= r.y1;
}
let hintTimer = null;
function onMove(e) {
  if (zoom.active) return;
  const { px, py } = toProj(e.clientX, e.clientY);
  mouse = { x: px, y: py / K };
  hovered = paintingAt(e.clientX, e.clientY);
  statueHovered = !hovered && statueAt(e.clientX, e.clientY);
  canvas.style.cursor = hovered || statueHovered ? 'pointer' : 'default';
  if (statueHovered && e.pointerType !== 'touch') {
    tooltip.replaceChildren('Marble statue', Object.assign(document.createElement('span'), { textContent: 'Click me' }));
    const r = statueRect();
    tooltip.style.left = `${cam.ox + statue.x * cam.s}px`;
    tooltip.style.top = `${cam.oy + r.y0 * cam.s}px`;
    tooltip.hidden = false;
    return;
  }
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
canvas.addEventListener('pointerleave', () => { mouse = null; hovered = null; statueHovered = false; hideTooltip(); });
canvas.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') setTimeout(() => { mouse = null; }, 400); });
canvas.addEventListener('click', (e) => {
  if (zoom.active) return;
  const p = paintingAt(e.clientX, e.clientY);
  if (p) openPainting(p);
  else if (statueAt(e.clientX, e.clientY)) { kickStatue(); statueHovered = false; hideTooltip(); }
});

// ===== Main loop =====
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (zoom.anim) zoom.anim.step(now);
  updatePeople(dt);
  updateStatue(dt);
  for (const f of flashes) f.t += dt;
  while (flashes.length && flashes[0].t > FLASH_TIME) flashes.shift();
  draw();
  requestAnimationFrame(frame);
}

async function start() {
  resize();
  try { await document.fonts.load('20px Pixelta'); } catch { /* falls back to Georgia */ }
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
  spawnGuards();
  requestAnimationFrame(frame);
}
start();
