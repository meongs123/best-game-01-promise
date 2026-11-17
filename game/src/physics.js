// PROMISE — physics: the player controller and every hazard.
// Pure movement math over level data (imports only config.js), so the
// same step can be driven by the browser loop, the test hooks, and the
// headless reachability checker. No DOM, no audio, no drawing here.
//
// Feel targets: coyote time 0.09s, jump buffer 0.12s, variable jump
// height (release cuts the rise), snappy acceleration, instant respawn.
// Single jump: ~108px high, ~180px across at full run.
// Double jump ("second wind"): +~82px, ~+120px across.
import {
  GRAVITY, RUN_SPEED, RUN_ACCEL, AIR_ACCEL, JUMP_VEL, DOUBLE_JUMP_VEL,
  MAX_FALL, COYOTE_TIME, JUMP_BUFFER, JUMP_CUT, PLAYER_W, PLAYER_H,
} from './config.js';

export function createRun(level) {
  return {
    level,
    px: level.start[0], py: level.start[1],
    vx: 0, vy: 0,
    facing: 1, onGround: false, jumpsUsed: 0,
    coyote: 0, buffer: 0, prevJumpHeld: false,
    checkpoint: null, firesGot: new Set(), revealed: new Set(),
    crumble: new Map(), // plat index -> { t, gone }
    rocks: level.rocks.map(([x, y]) => ({ x, y, vy: 0, active: false, spent: false })),
    movers: level.movers.map(([x, y, w, range, speed]) => ({ x, y, w, range, speed, t: 0, dx: 0 })),
    dead: false, deadCause: null, deadT: 0,
    time: 0, shake: 0, particles: [],
    windNow: 0,
  };
}

export function resetToCheckpoint(run) {
  const spot = run.checkpoint || run.level.start;
  run.px = spot[0]; run.py = spot[1];
  run.vx = 0; run.vy = 0;
  run.jumpsUsed = 0; run.coyote = 0; run.buffer = 0;
  run.dead = false; run.deadCause = null; run.deadT = 0;
  run.crumble.clear();
  run.rocks.forEach((r, i) => {
    r.x = run.level.rocks[i][0]; r.y = run.level.rocks[i][1];
    r.vy = 0; r.active = false; r.spent = false;
  });
  run.movers.forEach((m, i) => { m.t = 0; m.x = run.level.movers[i][0]; m.dx = 0; });
  run.particles.length = 0;
}

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function solidPlats(run) {
  const out = [];
  run.level.plats.forEach((p, i) => {
    if (p[4] === 'crumble') {
      const c = run.crumble.get(i);
      if (c && c.gone) return;
    }
    out.push({ x: p[0], y: p[1], w: p[2], h: p[3], kind: p[4] || 'solid', index: i });
  });
  run.movers.forEach((m) => out.push({ x: m.x, y: m.y, w: m.w, h: 16, kind: 'mover' }));
  return out;
}

// One fixed step (dt seconds). Returns an array of event strings the
// game layer turns into sound, particles, and screen state.
export function step(run, input, dt) {
  const events = [];
  const L = run.level;
  if (run.dead) {
    run.deadT += dt;
    return events;
  }
  run.time += dt;

  // --- movers slide first; a standing player rides them ---
  const plats = solidPlats(run);
  let standingOn = null;
  run.movers.forEach((m) => {
    const oldX = m.x;
    m.t += dt;
    m.x = L.movers[run.movers.indexOf(m)][0] + (Math.sin(m.t * m.speed * 0.02) * 0.5 + 0.5) * m.range;
    m.dx = m.x - oldX;
  });

  // --- horizontal input ---
  const accel = run.onGround ? RUN_ACCEL : AIR_ACCEL;
  if (input.left()) { run.vx -= accel * dt; run.facing = -1; }
  if (input.right()) { run.vx += accel * dt; run.facing = 1; }
  if (!input.left() && !input.right()) {
    const dec = (run.onGround ? RUN_ACCEL : AIR_ACCEL * 0.4) * dt;
    run.vx = Math.abs(run.vx) <= dec ? 0 : run.vx - Math.sign(run.vx) * dec;
  }
  run.vx = Math.max(-RUN_SPEED, Math.min(RUN_SPEED, run.vx));

  // --- wind pushes sideways while the player is inside a gust ---
  run.windNow = 0;
  for (const [x, y, w, h, dir, str] of L.wind) {
    const cx = run.px + PLAYER_W / 2, cy = run.py + PLAYER_H / 2;
    if (cx > x && cx < x + w && cy > y && cy < y + h) {
      run.vx += dir * str * dt;
      run.vx = Math.max(-RUN_SPEED - 60, Math.min(RUN_SPEED + 60, run.vx));
      run.windNow = dir;
    }
  }

  // --- jumping: buffer + coyote + one double jump ("second wind") ---
  if (input.jumpPressed()) run.buffer = JUMP_BUFFER;
  else run.buffer = Math.max(0, run.buffer - dt);
  if (run.onGround) { run.coyote = COYOTE_TIME; run.jumpsUsed = 0; }
  else run.coyote = Math.max(0, run.coyote - dt);
  if (run.buffer > 0) {
    if (run.onGround || run.coyote > 0) {
      run.vy = JUMP_VEL; run.jumpsUsed = 1;
      run.onGround = false; run.coyote = 0; run.buffer = 0;
      events.push('jump');
    } else if (run.jumpsUsed === 1) {
      run.vy = DOUBLE_JUMP_VEL; run.jumpsUsed = 2; run.buffer = 0;
      events.push('double');
    }
  }
  // Release the jump button early to cut the rise short.
  if (!input.jumpHeld() && run.prevJumpHeld && run.vy < 0) run.vy *= JUMP_CUT;
  run.prevJumpHeld = input.jumpHeld();

  // --- gravity + integrate ---
  run.vy = Math.min(MAX_FALL, run.vy + GRAVITY * dt);
  run.px += run.vx * dt;
  run.py += run.vy * dt;

  // --- ride the mover the player stands on ---
  if (standingOn) run.px += standingOn.dx;

  // --- collide: X axis, then Y axis ---
  const wasGround = run.onGround;
  run.onGround = false;
  for (const p of plats) {
    if (overlap(run.px, run.py, PLAYER_W, PLAYER_H, p.x, p.y, p.w, p.h)) {
      if (run.vx > 0 && run.px + PLAYER_W - p.x < 18) run.px = p.x - PLAYER_W;
      else if (run.vx < 0 && p.x + p.w - run.px < 18) run.px = p.x + p.w;
    }
  }
  for (const p of plats) {
    if (overlap(run.px, run.py, PLAYER_W, PLAYER_H, p.x, p.y, p.w, p.h)) {
      if (run.vy >= 0 && run.py + PLAYER_H - p.y < 26) {
        run.py = p.y - PLAYER_H;
        run.vy = 0; run.onGround = true;
        if (p.kind === 'mover') run.px += p.dx || 0;
        if (p.kind === 'crumble' && !run.crumble.get(p.index)) {
          run.crumble.set(p.index, { t: 0, gone: false });
          events.push('crumble');
        }
        if (!wasGround) events.push('land');
      } else if (run.vy < 0 && p.y + p.h - run.py < 26) {
        run.py = p.y + p.h; run.vy = 0;
      }
    }
  }
  // Standing on a mover carries the player along.
  for (const m of run.movers) {
    if (run.onGround && Math.abs((run.py + PLAYER_H) - m.y) < 2 &&
      run.px + PLAYER_W > m.x && run.px < m.x + m.w) run.px += m.dx;
  }

  // --- crumbling stones give way 0.6s after being stood on ---
  run.crumble.forEach((c, i) => {
    if (!c.gone) {
      c.t += dt;
      if (c.t > 0.6) { c.gone = true; events.push('crumbleFall'); }
    }
  });

  // --- falling branches ---
  for (const r of run.rocks) {
    if (!r.active && !r.spent && Math.abs(run.px - r.x) < 260 && run.py < 420) {
      r.active = true; events.push('rockFall');
    }
    if (r.active) {
      r.vy = Math.min(900, r.vy + 1400 * dt);
      r.y += r.vy * dt;
      let hit = r.y > 520;
      if (!hit) {
        for (const p of plats) {
          if (overlap(r.x, r.y, 26, 26, p.x, p.y, p.w, p.h)) { hit = true; break; }
        }
      }
      if (hit) { r.active = false; r.spent = true; events.push('rockShatter'); }
    }
  }

  // --- hazards kill ---
  const die = (cause) => {
    if (!run.dead) { run.dead = true; run.deadCause = cause; run.deadT = 0; events.push('die:' + cause); }
  };
  for (const [x, sy, w] of L.spikes) {
    if (overlap(run.px + 3, run.py + 6, PLAYER_W - 6, PLAYER_H - 6, x, sy - 13, w, 13)) die('spike');
  }
  L.hidden.forEach(([x, sy, w], i) => {
    if (overlap(run.px + 3, run.py + 6, PLAYER_W - 6, PLAYER_H - 6, x, sy - 13, w, 13)) {
      run.revealed.add(i);
      die('hidden');
    }
  });
  for (const r of run.rocks) {
    if (r.active && overlap(run.px + 3, run.py + 3, PLAYER_W - 6, PLAYER_H - 6, r.x, r.y, 26, 26)) die('rock');
  }
  if (run.py > 620) die('fell');

  // --- checkpoint (rect extends 2px below the player's feet: an exact
  // edge touch is still a touch — a shrine you stand on must count) ---
  if (!run.checkpoint) {
    const [cx, cy] = L.check;
    if (overlap(run.px, run.py, PLAYER_W, PLAYER_H, cx - 20, cy - 62, 40, 64)) {
      run.checkpoint = L.check;
      events.push('checkpoint');
    }
  }

  // --- fireflies (memories) ---
  L.fires.forEach(([fx, fy], i) => {
    if (!run.firesGot.has(i)) {
      const cx = run.px + PLAYER_W / 2, cy = run.py + PLAYER_H / 2;
      if (Math.hypot(cx - fx, cy - fy) < 30) {
        run.firesGot.add(i);
        events.push('firefly:' + i);
      }
    }
  });

  // --- goal: the summit shrine (same 2px edge grace as the checkpoint) ---
  const [gx, gy] = L.goal;
  if (overlap(run.px, run.py, PLAYER_W, PLAYER_H, gx - 18, gy - 72, 44, 74)) events.push('goal');

  return events;
}

// Jump envelope, shared by the level checker: from a standing start,
// how high / far can one jump and a double jump carry the player?
export function jumpEnvelope() {
  const t1 = (-JUMP_VEL * 2) / GRAVITY;
  const apex1 = (JUMP_VEL * JUMP_VEL) / (2 * GRAVITY);
  const t2 = (-DOUBLE_JUMP_VEL * 2) / GRAVITY;
  const apex2 = apex1 + (DOUBLE_JUMP_VEL * DOUBLE_JUMP_VEL) / (2 * GRAVITY);
  return {
    single: { height: apex1, reach: RUN_SPEED * t1, airtime: t1 },
    double: { height: apex2, reach: RUN_SPEED * (t1 + t2), airtime: t1 + t2 },
  };
}
