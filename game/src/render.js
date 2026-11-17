// PROMISE — render: everything is drawn in code, no image assets.
// Dawn palette per zone: deep indigo sky melting into gold at the
// horizon, layered hill silhouettes for parallax, a low sun that climbs
// higher with each zone. Darma is an old fisherman: straw hat, grey
// beard, satchel, and the small clay urn he carries against his chest.
import { VIEW_W, VIEW_H, ZONES, PLAYER_W, PLAYER_H } from './config.js';

function skyGradient(ctx, zone, progress) {
  const z = ZONES[zone];
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, z.sky[0]);
  g.addColorStop(0.55, z.sky[1]);
  g.addColorStop(1, z.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // The sun climbs as the level index grows.
  const sunY = 400 - progress * 260;
  const sunX = VIEW_W * 0.72;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 120);
  glow.addColorStop(0, 'rgba(255, 236, 170, 0.95)');
  glow.addColorStop(0.4, 'rgba(255, 200, 110, 0.45)');
  glow.addColorStop(1, 'rgba(255, 200, 110, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 130, sunY - 130, 260, 260);
  ctx.fillStyle = '#ffedbb';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
  // A few last stars, fading as the dawn comes on.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let i = 0; i < 46; i++) {
    const sx = (i * 137.5 + 31) % VIEW_W;
    const sy = (i * 89.3 + 17) % 170;
    const r = (i % 3) * 0.5 + 0.8;
    ctx.globalAlpha = 0.25 + ((i * 7) % 10) / 22;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function hills(ctx, camX, zone, color, amp, base, factor) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  for (let x = 0; x <= VIEW_W; x += 24) {
    const wx = x + camX * factor;
    const y = base - Math.sin(wx * 0.004) * amp - Math.sin(wx * 0.011 + 2) * amp * 0.4;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.closePath();
  ctx.fill();
}

function drawDarma(ctx, x, y, facing, runPhase, airborne, dead) {
  ctx.save();
  ctx.translate(x + PLAYER_W / 2, y + PLAYER_H);
  ctx.scale(facing, 1);
  if (dead) { ctx.rotate(Math.PI / 2); ctx.translate(0, 6); }
  const bob = airborne ? 0 : Math.sin(runPhase) * 2;
  // Legs: two old boots, stepping.
  ctx.fillStyle = '#3a2c22';
  const legSwing = airborne ? 6 : Math.sin(runPhase) * 5;
  ctx.fillRect(-7 + legSwing, -10 + bob, 6, 10);
  ctx.fillRect(1 - legSwing, -10 - bob, 6, 10);
  // Body: a worn indigo fisherman's coat.
  ctx.fillStyle = '#4a5a7a';
  ctx.fillRect(-9, -26 + bob, 18, 17);
  // The urn, held against his chest — the reason for the climb.
  ctx.fillStyle = '#b98a4e';
  ctx.beginPath();
  ctx.ellipse(4, -20 + bob, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a5f2e';
  ctx.fillRect(1, -28 + bob, 6, 3);
  // Head: grey beard, weathered skin.
  ctx.fillStyle = '#d9a986';
  ctx.fillRect(-6, -34 + bob, 12, 9);
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(-6, -28 + bob, 12, 5);
  // Straw hat.
  ctx.fillStyle = '#c9a35c';
  ctx.fillRect(-10, -36 + bob, 20, 3);
  ctx.fillRect(-6, -40 + bob, 12, 5);
  ctx.restore();
}

function drawSpikes(ctx, x, sy, w, revealed) {
  ctx.fillStyle = revealed === false ? '#6b5a44' : '#d8d8e0';
  const n = Math.max(1, Math.round(w / 14));
  const step = w / n;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * step, sy);
    ctx.lineTo(x + (i + 0.5) * step, sy - 14);
    ctx.lineTo(x + (i + 1) * step, sy);
    ctx.closePath();
    ctx.fill();
  }
  if (revealed === false) {
    // A hidden thorn looks like ordinary ground — until it isn't.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x, sy - 3, w, 3);
  }
}

export function render(ctx, game) {
  const { run, levelIndex, mode } = game;
  const L = run.level;
  const zone = ZONES[L.zone];
  const camX = game.camX;
  const progress = levelIndex / 11;

  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  skyGradient(ctx, L.zone, progress);
  hills(ctx, camX, L.zone, 'rgba(40, 32, 66, 0.55)', 46, 470, 0.25);
  hills(ctx, camX, L.zone, 'rgba(52, 40, 70, 0.75)', 30, 500, 0.5);

  ctx.save();
  if (run.shake > 0) ctx.translate((Math.random() - 0.5) * run.shake, (Math.random() - 0.5) * run.shake);
  ctx.translate(-camX, 0);

  // Pine silhouettes rooted on the wide valley floors.
  ctx.fillStyle = 'rgba(24, 30, 46, 0.65)';
  for (const [x, y, w, h] of L.plats) {
    if (y !== 500 || w < 260) continue;
    for (let px = x + 90; px < x + w - 60; px += 260) {
      const ph = 46 + ((px * 13) % 22);
      ctx.beginPath();
      ctx.moveTo(px, y - ph);
      ctx.lineTo(px - 13, y - ph * 0.45);
      ctx.lineTo(px - 6, y - ph * 0.45);
      ctx.lineTo(px - 16, y);
      ctx.lineTo(px + 16, y);
      ctx.lineTo(px + 6, y - ph * 0.45);
      ctx.lineTo(px + 13, y - ph * 0.45);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Wind gusts, drawn as drifting streaks.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  for (const [x, y, w, h, dir] of L.wind) {
    for (let i = 0; i < 4; i++) {
      const t = ((game.now * 0.4 + i * 0.37) % 1);
      const sx = x + (dir > 0 ? t * w : (1 - t) * w);
      const sy = y + ((i * 53) % h);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + dir * 34, sy);
      ctx.stroke();
    }
  }

  // Platforms.
  for (let i = 0; i < L.plats.length; i++) {
    const [x, y, w, h, kind] = L.plats[i];
    if (kind === 'crumble') {
      const c = run.crumble.get(i);
      if (c && c.gone) continue;
      ctx.fillStyle = c ? '#8a6a4a' : '#7a5c40';
      ctx.globalAlpha = c ? Math.max(0.35, 1 - c.t) : 1;
    } else {
      ctx.fillStyle = zone.ground;
    }
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255, 220, 150, 0.25)';
    ctx.fillRect(x, y, w, 5);
    ctx.globalAlpha = 1;
    if (kind === 'crumble') {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, y + 3); ctx.lineTo(x + w * 0.35, y + h - 3);
      ctx.moveTo(x + w * 0.65, y + 3); ctx.lineTo(x + w * 0.6, y + h - 3);
      ctx.stroke();
    }
  }

  // Moving platforms.
  for (const m of run.movers) {
    ctx.fillStyle = '#6a4a6e';
    ctx.fillRect(m.x, m.y, m.w, 16);
    ctx.fillStyle = 'rgba(255, 220, 150, 0.3)';
    ctx.fillRect(m.x, m.y, m.w, 4);
  }

  // Spikes — visible ones, and hidden ones only after they are revealed.
  for (const [x, sy, w] of L.spikes) drawSpikes(ctx, x, sy, w, true);
  L.hidden.forEach(([x, sy, w], i) => {
    if (run.revealed.has(i)) drawSpikes(ctx, x, sy, w, true);
    else drawSpikes(ctx, x, sy, w, false);
  });

  // Falling branches.
  for (const r of run.rocks) {
    if (!r.active && r.spent) continue;
    ctx.fillStyle = '#5a3a22';
    ctx.save();
    ctx.translate(r.x + 13, r.y + 13);
    ctx.rotate(r.active ? r.y * 0.02 : 0.4);
    ctx.fillRect(-14, -4, 28, 8);
    ctx.fillStyle = '#3d5a2e';
    ctx.fillRect(4, -10, 12, 8);
    ctx.restore();
  }

  // Fireflies: warm dots with a soft halo, bobbing gently.
  for (let i = 0; i < L.fires.length; i++) {
    if (run.firesGot.has(i)) continue;
    const [fx, fy] = L.fires[i];
    const bob = Math.sin(game.now * 2 + i * 1.7) * 5;
    const glow = ctx.createRadialGradient(fx, fy + bob, 1, fx, fy + bob, 16);
    glow.addColorStop(0, 'rgba(255, 240, 150, 0.9)');
    glow.addColorStop(1, 'rgba(255, 240, 150, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(fx - 16, fy + bob - 16, 32, 32);
    ctx.fillStyle = '#fff3a0';
    ctx.beginPath();
    ctx.arc(fx, fy + bob, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Checkpoint: a small stone cairn with a ribbon.
  {
    const [cx, cy] = L.check;
    ctx.fillStyle = '#8a8a96';
    ctx.fillRect(cx - 12, cy - 8, 24, 8);
    ctx.fillRect(cx - 9, cy - 16, 18, 8);
    ctx.fillRect(cx - 5, cy - 23, 10, 7);
    ctx.fillStyle = run.checkpoint ? '#ffd98a' : '#b8b8c4';
    ctx.fillRect(cx + 2, cy - 34, 2, 12);
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy - 34);
    ctx.lineTo(cx + 18, cy - 30);
    ctx.lineTo(cx + 4, cy - 26);
    ctx.closePath();
    ctx.fill();
  }

  // Goal: the summit shrine — a stone arch with a small flag.
  {
    const [gx, gy] = L.goal;
    ctx.fillStyle = '#9a9aa8';
    ctx.fillRect(gx - 18, gy - 70, 8, 70);
    ctx.fillRect(gx + 10, gy - 70, 8, 70);
    ctx.fillRect(gx - 22, gy - 78, 44, 10);
    ctx.fillStyle = '#e8b64a';
    ctx.beginPath();
    ctx.arc(gx, gy - 88, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Particles (death burst, firefly sparkle, landing dust).
  for (const p of run.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;

  // Darma himself.
  if (!run.dead || run.deadT < 0.3) {
    drawDarma(ctx, run.px, run.py, run.facing, game.now * 10, !run.onGround, run.dead);
  }

  ctx.restore();

  // --- HUD, drawn in screen space ---
  ctx.fillStyle = 'rgba(20, 16, 40, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, 44);
  ctx.fillStyle = '#f5e9c8';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`PROMISE  ·  ${levelIndex + 1}. ${game.levelName}`, 14, 28);
  ctx.textAlign = 'right';
  ctx.font = '15px Georgia, serif';
  const mm = Math.floor(run.time / 60);
  const ss = Math.floor(run.time % 60).toString().padStart(2, '0');
  ctx.fillText(`Deaths ${game.deaths}   ${mm}:${ss}   ✦ ${run.firesGot.size}/${L.fires.length}   M mute`, VIEW_W - 14, 27);
  ctx.textAlign = 'left';

  if (game.bark) {
    ctx.fillStyle = 'rgba(20, 16, 40, 0.7)';
    const w = ctx.measureText(game.bark).width + 28;
    ctx.fillRect((VIEW_W - w) / 2, 56, w, 30);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'italic 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.bark, VIEW_W / 2, 76);
    ctx.textAlign = 'left';
  }

  if (game.hint) {
    ctx.fillStyle = 'rgba(20, 16, 40, 0.6)';
    const w = ctx.measureText(game.hint).width + 24;
    ctx.fillRect((VIEW_W - w) / 2, VIEW_H - 44, w, 28);
    ctx.fillStyle = '#e8e0c8';
    ctx.font = '14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.hint, VIEW_W / 2, VIEW_H - 25);
    ctx.textAlign = 'left';
  }

  // Death overlay: Ratna speaks, one line, then the climb resumes.
  if (mode === 'dead') {
    ctx.fillStyle = 'rgba(16, 10, 30, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'italic 26px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`\u201c${game.ratnaLine}\u201d`, VIEW_W / 2, VIEW_H / 2 - 10);
    ctx.fillStyle = '#c8bdd8';
    ctx.font = '15px Georgia, serif';
    ctx.fillText('— Ratna', VIEW_W / 2, VIEW_H / 2 + 24);
    ctx.textAlign = 'left';
  }
}
