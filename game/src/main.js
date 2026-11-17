// JANJI — main: the game loop, screens, story, and save.
// Modes: title → card (zone story) → play ⇄ dead → levelClear → …
// → ending (after level 12) → title. Progress (unlocked level, total
// deaths, best clear time) lives in localStorage; the climb itself is
// always local, always offline, always just you and the hill.
import { VIEW_W, VIEW_H, RATNA_LINES, DARMA_BARKS, ZONES, RESPAWN_MS, LEVEL_COUNT } from './config.js';
import { LEVELS, levelMeta } from './levels.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRun, step, resetToCheckpoint } from './physics.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

const SAVE_KEY = 'janji-save-v1';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const input = createInput(canvas);
const audio = createAudio();

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return { unlocked: s.unlocked || 0, totalDeaths: s.totalDeaths || 0, bestMs: s.bestMs || null };
  } catch { return { unlocked: 0, totalDeaths: 0, bestMs: null }; }
}
function storeSave(s) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

const save = loadSave();
const game = {
  mode: 'title',
  levelIndex: 0,
  levelName: '',
  run: createRun(LEVELS[0]),
  deaths: 0,
  deathsThisLevel: 0,
  levelTime: 0,
  totalMs: 0,
  camX: 0,
  now: 0,
  bark: null, barkT: 0,
  hint: null, hintT: 0,
  ratnaLine: '',
  ratnaIdx: 0,
  clearMs: 0,
  showMemory: false,
  paused: false,
  muted: false,
  cardT: 0,
  runStart: 0,
};

function showBark(text, seconds) {
  game.bark = text; game.barkT = seconds;
}
function showHint(text, seconds) {
  game.hint = text; game.hintT = seconds;
}

function startLevel(i, fromCard = true) {
  game.levelIndex = i;
  game.levelName = levelMeta(i).name;
  game.run = createRun(LEVELS[i]);
  game.deathsThisLevel = 0;
  game.levelTime = 0;
  game.camX = 0;
  game.showMemory = false;
  const meta = levelMeta(i);
  showHint(meta.intro, 7);
  if (fromCard && (i === 0 || LEVELS[i].zone !== LEVELS[i - 1].zone)) {
    game.mode = 'card';
    game.cardT = 0;
  } else {
    game.mode = 'play';
  }
}

function startRun() {
  game.totalMs = 0;
  game.deaths = 0;
  startLevel(save.unlocked >= 0 ? 0 : 0);
}

function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 160;
    game.run.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
      t: 0, life: 0.5 + Math.random() * 0.4, color,
    });
  }
}

function handleEvents(events) {
  for (const e of events) {
    if (e === 'jump') audio.jump();
    else if (e === 'double') { audio.doubleJump(); burst(game.run.px + 11, game.run.py + 34, '#ffe9a8', 8); }
    else if (e === 'land') audio.land();
    else if (e === 'crumble') audio.crumble();
    else if (e === 'checkpoint') {
      audio.checkpoint();
      showBark(DARMA_BARKS[Math.floor(Math.random() * DARMA_BARKS.length)], 2.5);
    } else if (e.startsWith('firefly:')) {
      audio.firefly();
      const L = game.run.level;
      burst(L.fires[Number(e.split(':')[1])][0], L.fires[Number(e.split(':')[1])][1], '#fff3a0', 10);
      if (game.run.firesGot.size === L.fires.length) {
        game.showMemory = true;
        showBark(levelMeta(game.levelIndex).memory, 5);
      }
    } else if (e === 'levelClear' || e === 'goal') {
      // handled below via goal check
    } else if (e.startsWith('die:')) {
      game.deaths += 1;
      game.deathsThisLevel += 1;
      game.mode = 'dead';
      game.ratnaLine = RATNA_LINES[game.ratnaIdx % RATNA_LINES.length];
      game.ratnaIdx += 1;
      game.run.shake = 10;
      audio.death();
      burst(game.run.px + 11, game.run.py + 17, '#e8b64a', 22);
      burst(game.run.px + 11, game.run.py + 17, '#c65a7a', 12);
    }
  }
  // Goal is checked after events so the clear fanfare plays once.
  if (events.includes('goal') && game.mode === 'play') {
    audio.levelClear();
    game.clearMs = game.levelTime;
    game.mode = 'levelClear';
    game.clearT = 0;
  }
}

function update(dt) {
  game.now += dt;
  if (game.barkT > 0) { game.barkT -= dt; if (game.barkT <= 0) game.bark = null; }
  if (game.hintT > 0) { game.hintT -= dt; if (game.hintT <= 0) game.hint = null; }
  game.run.shake = Math.max(0, game.run.shake - dt * 30);
  for (const p of game.run.particles) {
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt;
  }
  game.run.particles = game.run.particles.filter((p) => p.t < p.life);

  if (game.mode === 'title') {
    if (input.confirmPressed()) { audio.unlock(); startRun(); }
    return;
  }
  if (game.mode === 'card') {
    game.cardT += dt;
    if (input.confirmPressed() || game.cardT > 6) game.mode = 'play';
    return;
  }
  if (game.mode === 'levelClear') {
    game.clearT += dt;
    // A confirm pressed during the short fanfare lockout is queued,
    // not swallowed — the player should never have to press twice.
    if (input.confirmPressed()) game.clearQueued = true;
    if (game.clearQueued && game.clearT > 0.4) {
      game.clearQueued = false;
      const next = game.levelIndex + 1;
      if (next >= LEVEL_COUNT) {
        game.mode = 'ending';
        audio.sunrise();
        save.unlocked = LEVEL_COUNT - 1;
        if (!save.bestMs || game.totalMs < save.bestMs) save.bestMs = game.totalMs;
        save.totalDeaths = (save.totalDeaths || 0) + game.deaths;
        storeSave(save);
      } else {
        save.unlocked = Math.max(save.unlocked, next);
        storeSave(save);
        startLevel(next);
      }
    }
    return;
  }
  if (game.mode === 'ending') {
    if (input.confirmPressed()) { game.mode = 'title'; }
    return;
  }
  if (game.mode === 'dead') {
    // The physics step is not called while dead, so the respawn clock
    // ticks here. 350ms later Darma is back on his feet — "Not yet."
    // (shotHold freezes the screen for the death screenshot.)
    if (!game.shotHold) game.run.deadT += dt;
    if (game.run.deadT * 1000 >= RESPAWN_MS) {
      resetToCheckpoint(game.run);
      game.mode = 'play';
    }
    return;
  }
  // play
  if (input.pausePressed()) { game.paused = !game.paused; }
  if (input.mutePressed()) { game.muted = audio.toggleMute(); }
  if (game.paused) return;
  if (input.retryPressed()) {
    game.deaths += 1;
    game.run = createRun(LEVELS[game.levelIndex]);
    return;
  }
  game.levelTime += dt;
  game.totalMs += dt * 1000;
  const events = step(game.run, input, dt);
  handleEvents(events);
  // Camera follows Darma, clamped to the level.
  const target = Math.max(0, Math.min(
    game.run.level.width - VIEW_W,
    game.run.px + 11 - VIEW_W * 0.42,
  ));
  game.camX += (target - game.camX) * Math.min(1, dt * 8);
}

function drawOverlay() {
  if (game.mode === 'title') {
    ctx.fillStyle = 'rgba(16, 10, 30, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f7c873';
    ctx.font = 'bold 84px Georgia, serif';
    ctx.fillText('JANJI', VIEW_W / 2, 200);
    ctx.fillStyle = '#f5e9c8';
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillText('a promise before sunrise', VIEW_W / 2, 240);
    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = '#d8cdb2';
    ctx.fillText('Darma, 78, climbs Bukit Senja before dawn —', VIEW_W / 2, 300);
    ctx.fillText('carrying the ashes of Ratna, his wife, to the peak', VIEW_W / 2, 324);
    ctx.fillText('where they first met. Every fall, his promise pulls him back.', VIEW_W / 2, 348);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillText('Press ENTER to begin the climb', VIEW_W / 2, 410);
    ctx.font = '14px Georgia, serif';
    ctx.fillStyle = '#b8aec8';
    ctx.fillText('A / D or ← → to run · Space / W / ↑ to jump · jump again in the air for a second wind', VIEW_W / 2, 448);
    ctx.fillText('R retry level · P pause · M mute · 12 levels · 3 zones · fireflies hold her memories', VIEW_W / 2, 470);
    if (save.unlocked > 0 || save.totalDeaths > 0) {
      ctx.fillText(`Progress saved: reached level ${save.unlocked + 1} · ${save.totalDeaths} deaths in past climbs`, VIEW_W / 2, 500);
    }
    ctx.textAlign = 'left';
    return;
  }
  if (game.mode === 'card') {
    const z = ZONES[LEVELS[game.levelIndex].zone];
    ctx.fillStyle = 'rgba(16, 10, 30, 0.82)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f7c873';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(z.name.toUpperCase(), VIEW_W / 2, 210);
    ctx.fillStyle = '#d8cdb2';
    ctx.font = 'italic 19px Georgia, serif';
    ctx.fillText(z.english, VIEW_W / 2, 244);
    ctx.fillStyle = '#f5e9c8';
    ctx.font = '18px Georgia, serif';
    wrapText(z.card, VIEW_W / 2, 300, 640, 28);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '15px Georgia, serif';
    ctx.fillText('Press ENTER to keep climbing', VIEW_W / 2, 400);
    ctx.textAlign = 'left';
    return;
  }
  if (game.mode === 'levelClear') {
    ctx.fillStyle = 'rgba(16, 10, 30, 0.62)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(`${game.levelIndex + 1}. ${game.levelName} — done`, VIEW_W / 2, 200);
    ctx.fillStyle = '#f5e9c8';
    ctx.font = '18px Georgia, serif';
    ctx.fillText(`Time ${fmtTime(game.clearMs)} · Deaths this level ${game.deathsThisLevel} · Fireflies ${game.run.firesGot.size}/${game.run.level.fires.length}`, VIEW_W / 2, 246);
    if (game.showMemory) {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'italic 18px Georgia, serif';
      wrapText(`\u201c${levelMeta(game.levelIndex).memory}\u201d`, VIEW_W / 2, 300, 640, 28);
      ctx.fillStyle = '#d8cdb2';
      ctx.font = '14px Georgia, serif';
      ctx.fillText('— a memory of Ratna, kept whole', VIEW_W / 2, 356);
    }
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillText(game.levelIndex + 1 >= LEVEL_COUNT ? 'Press ENTER — the sunrise is waiting' : 'Press ENTER for the next climb', VIEW_W / 2, 420);
    ctx.textAlign = 'left';
    return;
  }
  if (game.mode === 'ending') {
    // The sunrise itself, opaque — no climb geometry shows through.
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#241a3d');
    g.addColorStop(0.55, '#c65a7a');
    g.addColorStop(1, '#ffd98a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const glow = ctx.createRadialGradient(VIEW_W / 2, 480, 10, VIEW_W / 2, 480, 200);
    glow.addColorStop(0, 'rgba(255, 240, 190, 0.95)');
    glow.addColorStop(1, 'rgba(255, 240, 190, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(VIEW_W / 2 - 200, 280, 400, 400);
    ctx.fillStyle = '#ffedbb';
    ctx.beginPath();
    ctx.arc(VIEW_W / 2, 480, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffedbb';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText('THE PROMISE IS KEPT', VIEW_W / 2, 150);
    ctx.fillStyle = '#f5e9c8';
    ctx.font = 'italic 19px Georgia, serif';
    wrapText('The sun rises. The ashes scatter on the wind. Darma sits down beside the memory of her — and finally, peacefully, rests.', VIEW_W / 2, 220, 660, 30);
    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = '#d8cdb2';
    const total = fmtTime(game.totalMs / 1000);
    ctx.fillText(`The climb took ${total} and ${game.deaths} falls. Every one of them was worth it.`, VIEW_W / 2, 330);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillText('Press ENTER to return to the foot of the hill', VIEW_W / 2, 400);
    ctx.textAlign = 'left';
    return;
  }
  if (game.paused && game.mode === 'play') {
    ctx.fillStyle = 'rgba(16, 10, 30, 0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5e9c8';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillText('Paused — the dawn waits', VIEW_W / 2, VIEW_H / 2);
    ctx.font = '15px Georgia, serif';
    ctx.fillText('P / Esc to resume · R to retry the level', VIEW_W / 2, VIEW_H / 2 + 34);
    ctx.textAlign = 'left';
  }
}

function wrapText(text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = w;
      yy += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, cx, yy);
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// --- main loop: fixed 60Hz steps, decoupled from frame rate ---
let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= 1 / 60) {
    update(1 / 60);
    acc -= 1 / 60;
  }
  render(ctx, game);
  drawOverlay();
  input.endFrame();
  requestAnimationFrame(frame);
}

// --- test + screenshot hooks (also the develop-web-game contract) ---
window.__JANJI__ = {
  game, startLevel, startRun, LEVELS,
  setMode(m) { game.mode = m; },
  teleport(x, y) { game.run.px = x; game.run.py = y; game.run.vx = 0; game.run.vy = 0; },
};
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) { update(1 / 60); input.endFrame(); }
  render(ctx, game);
  drawOverlay();
};
window.render_game_to_text = () => JSON.stringify({
  mode: game.mode,
  level: game.levelIndex + 1,
  name: game.levelName,
  player: { x: Math.round(game.run.px), y: Math.round(game.run.py), vx: Math.round(game.run.vx), vy: Math.round(game.run.vy), onGround: game.run.onGround },
  deaths: game.deaths,
  time: Math.round(game.run.time * 10) / 10,
  fireflies: `${game.run.firesGot.size}/${game.run.level.fires.length}`,
  checkpoint: !!game.run.checkpoint,
  ratnaLine: game.ratnaLine,
});

startLevel(0);
game.mode = 'title'; // the climb starts at the title screen, not the card
applyShot(window.__JANJI__);
requestAnimationFrame(frame);
