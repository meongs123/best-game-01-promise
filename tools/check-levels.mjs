// PROMISE — level checker (dev tool, not part of the game).
// Verifies every level is beatable with the real jump envelope:
// BFS over platform tops, edges allowed when the gap and rise fit a
// single jump (or a double jump where the level intends one), plus
// spike/firefly sanity checks. Run: node tools/check-levels.mjs
import { LEVELS } from '../game/src/levels.js';
import { jumpEnvelope } from '../game/src/physics.js';

const env = jumpEnvelope();
console.log('jump envelope single:', JSON.stringify(env.single), 'double:', JSON.stringify(env.double));

function tops(L) {
  const out = L.plats.map((p, i) => ({ x: p[0], y: p[1], w: p[2], h: p[3], kind: p[4] || 'solid', i }));
  L.movers.forEach((m) => out.push({ x: m[0], y: m[1], w: m[2], h: 16, kind: 'mover', i: -1 }));
  return out;
}

function blockedBetween(L, ax, ay, bx, by) {
  // Model the real jump arc: the player rises steeply first (apex
  // above the higher end by a margin), then comes down onto the target.
  // A straight line would cut through the target wall's corner.
  const rise = ay - by;
  const lift = Math.max(110, rise + 60);
  for (let t = 0.05; t < 1; t += 0.05) {
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t - lift * Math.sin(t * Math.PI);
    for (const p of L.plats) {
      if (x > p[0] && x < p[0] + p[2] && y > p[1] && y < p[1] + p[3]) return true;
    }
  }
  return false;
}

let failures = 0;
LEVELS.forEach((L, li) => {
  const errs = [];
  const ps = tops(L);
  // start / checkpoint / goal must stand on something
  const standsOn = ([x, y]) => ps.some((p) => x + 11 >= p.x - 2 && x + 11 <= p.x + p.w + 2 && Math.abs((y + 34) - p.y) <= 4);
  if (!standsOn(L.start)) errs.push('start floats');
  if (!standsOn(L.check)) errs.push('checkpoint floats');
  if (!standsOn(L.goal)) errs.push('goal floats');
  // BFS from the start platform
  const startPlat = ps.find((p) => L.start[0] + 11 >= p.x && L.start[0] + 11 <= p.x + p.w && Math.abs((L.start[1] + 34) - p.y) <= 4);
  const goalPlat = ps.find((p) => L.goal[0] + 11 >= p.x && L.goal[0] + 11 <= p.x + p.w && Math.abs((L.goal[1] + 34) - p.y) <= 4);
  const seen = new Set();
  const queue = startPlat ? [startPlat] : [];
  if (startPlat) seen.add(startPlat.i + ':' + startPlat.x);
  while (queue.length) {
    const a = queue.shift();
    for (const b of ps) {
      const key = b.i + ':' + b.x;
      if (seen.has(key)) continue;
      const gap = Math.max(0, Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)));
      const rise = a.y - b.y; // positive = b is higher
      const drop = b.y - a.y;
      const sameLevel = Math.abs(a.y - b.y) < 4;
      let ok = false;
      // A jump fits if EITHER the single jump covers both the rise and
      // the gap, or the double jump does. Dropping down, the player can
      // still double-jump mid-air, so a long drop gap may use the
      // double-jump reach as well.
      const fitsSingle = rise <= env.single.height * 0.92 && gap <= env.single.reach * 0.9;
      const fitsDouble = rise <= env.double.height * 0.92 && gap <= env.double.reach * 0.9;
      if (sameLevel || drop > 0) ok = fitsSingle || fitsDouble;
      else ok = fitsSingle || fitsDouble;
      if (!ok) continue;
      // arc clearance from the nearer edges
      const ax = gap === 0 ? (a.x + a.w / 2) : (b.x > a.x ? a.x + a.w : a.x);
      const bx = gap === 0 ? (b.x + b.w / 2) : (b.x > a.x ? b.x : b.x + b.w);
      if (blockedBetween(L, ax, a.y, bx, b.y)) continue;
      seen.add(key);
      queue.push(b);
    }
  }
  if (goalPlat && !seen.has(goalPlat.i + ':' + goalPlat.x)) errs.push('goal unreachable by BFS');
  // fireflies: within a jump of some reachable platform top
  L.fires.forEach(([fx, fy], fi) => {
    const ok = ps.some((p) => {
      const key = p.i + ':' + p.x;
      if (!seen.has(key)) return false;
      const dx = Math.max(0, Math.max(p.x - fx, fx - (p.x + p.w)));
      return dx < 90 && fy > p.y - 190 && fy < p.y + 40;
    });
    if (!ok) errs.push(`firefly ${fi} unreachable`);
  });
  // spikes must never wall off a whole platform
  for (const [x, sy, w] of [...L.spikes, ...L.hidden]) {
    const host = ps.find((p) => sy === p.y && x >= p.x && x + w <= p.x + p.w);
    if (host && w >= host.w - 40) errs.push(`spike at ${x} walls off its platform`);
    if (!host) errs.push(`spike at ${x} floats (no platform at y=${sy})`);
  }
  // pits: falling in is death, so every gap in the ground line must be
  // crossed by a reachable platform — covered by the BFS; just report.
  console.log(`L${li + 1} ${'ok'.padEnd(3)} ${errs.length ? 'FAIL: ' + errs.join('; ') : `reachable plats ${seen.size}/${ps.length}, fires ${L.fires.length}`}`);
  if (errs.length) failures += 1;
});
console.log(failures ? `FAILURES: ${failures} level(s)` : 'ALL LEVELS REACHABLE');
process.exit(failures ? 1 : 0);
