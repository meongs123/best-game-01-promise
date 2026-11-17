// JANJI — levels: 12 short rage-platformer levels in 3 zones.
// Coordinates are pixels. Ground top is y=500; the canvas is 540 tall.
// Jump envelope (from config.js): single jump rises ~108px and crosses
// ~180px at full run; double jump rises ~190px and crosses ~300px.
// Every gap and rise below stays inside the single-jump envelope
// unless the level teaches the double jump (level 3) or the climb
// uses short 60px steps. tools/check-levels.mjs verifies reachability.
//
// plats: [x, y, w, h, kind] kind 'solid' | 'crumble' (falls 0.6s after
//   the player stands on it, respawns with the level)
// spikes: [x, surfaceY, w] — triangles 14px tall on a surface
// hidden: like spikes, but drawn as plain ground until they kill once,
//   then they stay revealed (fairness: never the same trap twice blind)
// fires: [x, y] fireflies = memories of Ratna, optional per level
// rocks: [x, y] spawners — a branch falls when the player comes near
// wind: [x, y, w, h, dir, strength] — pushes the player sideways
// movers: [x, y, w, range, speed] — platforms sliding horizontally
import { LEVEL_NAMES, LEVEL_INTROS, MEMORY_LINES } from './config.js';

function level(zone, width, start, check, goal, plats, extra = {}) {
  return {
    zone, width, start, check, goal, plats,
    spikes: extra.spikes || [],
    hidden: extra.hidden || [],
    fires: extra.fires || [],
    rocks: extra.rocks || [],
    wind: extra.wind || [],
    movers: extra.movers || [],
  };
}

export const LEVELS = [
  // 1 — First Steps. Flat, two small pits, one spike strip to hop.
  level(0, 2000, [60, 466], [1050, 466], [1900, 466], [
    [0, 500, 560, 40], [660, 500, 440, 40], [1180, 500, 320, 40],
    [1600, 500, 400, 40], [1300, 420, 120, 20],
  ], {
    spikes: [[900, 500, 40]],
    fires: [[700, 440], [1360, 360], [1700, 440]],
  }),
  // 2 — Thorns at Dawn. Spike strips on flat ground, three pits.
  level(0, 2300, [60, 466], [950, 466], [2200, 466], [
    [0, 500, 500, 40], [580, 500, 420, 40], [1080, 500, 420, 40],
    [1580, 500, 720, 40],
  ], {
    spikes: [[300, 500, 60], [700, 500, 60], [1250, 500, 60], [1700, 500, 80]],
    fires: [[540, 420], [1050, 420], [1900, 420]],
  }),
  // 3 — Second Wind. A low wall (single jump), then a tall wall that
  // needs the double jump. This is where the game teaches it.
  level(0, 2200, [60, 466], [760, 466], [2100, 466], [
    [0, 500, 600, 40], [600, 420, 120, 80], [720, 500, 300, 40],
    [1020, 350, 120, 150], [1140, 350, 200, 20], [1340, 500, 860, 40],
  ], {
    spikes: [[800, 500, 40], [1500, 500, 60]],
    fires: [[660, 360], [1200, 290], [1800, 420]],
  }),
  // 4 — The Old Path. Crumbling stones over a long pit, then a spike
  // you can see — and one you cannot, until it teaches you.
  level(0, 2400, [60, 466], [1250, 466], [2300, 466], [
    [0, 500, 600, 40],
    [640, 470, 100, 16, 'crumble'], [780, 440, 100, 16, 'crumble'],
    [920, 470, 100, 16, 'crumble'], [1060, 440, 100, 16, 'crumble'],
    [1200, 500, 1200, 40],
  ], {
    spikes: [[1350, 500, 40]],
    hidden: [[1650, 500, 40]],
    fires: [[830, 380], [1450, 420], [2100, 420]],
  }),
  // 5 — Wind in the Pines. Headwind over three pits.
  level(1, 2500, [60, 466], [1000, 466], [2400, 466], [
    [0, 500, 560, 40], [660, 500, 380, 40], [1140, 500, 380, 40],
    [1620, 500, 880, 40],
  ], {
    wind: [[600, 300, 500, 240, -1, 320], [1500, 300, 500, 240, -1, 320]],
    spikes: [[800, 500, 40], [1300, 500, 40]],
    fires: [[610, 420], [1200, 420], [2000, 420]],
  }),
  // 6 — Falling Branches. One long road; branches drop where you walk.
  level(1, 2500, [60, 466], [1250, 466], [2400, 466], [
    [0, 500, 2500, 40],
  ], {
    rocks: [[700, 120], [1300, 120], [1900, 120]],
    spikes: [[900, 500, 60], [1600, 500, 60], [2100, 500, 60]],
    fires: [[650, 420], [1250, 420], [1850, 420]],
  }),
  // 7 — The Hollow. Ride two swaying platforms across the hollow.
  level(1, 2600, [60, 466], [1560, 466], [2500, 466], [
    [0, 500, 700, 40], [1500, 500, 1100, 40],
  ], {
    movers: [[760, 460, 110, 240, 60], [1120, 420, 110, 240, 60]],
    wind: [[700, 300, 800, 240, -1, 160]],
    spikes: [[1700, 500, 60], [2200, 500, 60]],
    fires: [[830, 400], [1200, 360], [2000, 420]],
  }),
  // 8 — Dusk Deepens. Crumble, wind, spikes, and a hidden thorn.
  level(1, 2600, [60, 466], [1250, 466], [2500, 466], [
    [0, 500, 500, 40], [580, 500, 360, 40],
    [1020, 460, 140, 20, 'crumble'], [1220, 500, 380, 40],
    [1680, 440, 120, 20], [1880, 500, 720, 40],
  ], {
    wind: [[1000, 300, 700, 240, 1, 260]],
    spikes: [[700, 500, 40], [1400, 500, 60]],
    hidden: [[2000, 500, 40]],
    fires: [[1100, 400], [1750, 380], [2300, 420]],
  }),
  // 9 — Loose Stone. A 60px-step climb; one step crumbles.
  level(2, 2400, [60, 466], [980, 226], [2300, 166], [
    [0, 500, 400, 40], [460, 440, 120, 20], [620, 380, 120, 20],
    [780, 320, 120, 20, 'crumble'], [940, 260, 120, 20],
    [1100, 200, 140, 20], [1300, 200, 1100, 40],
  ], {
    wind: [[900, 100, 600, 240, -1, 200]],
    spikes: [[1600, 200, 60], [2000, 200, 60]],
    fires: [[520, 380], [840, 260], [1500, 140]],
  }),
  // 10 — The Gust. Alternating gusts over a chain of small ledges.
  level(2, 2600, [60, 466], [1180, 466], [2500, 466], [
    [0, 500, 420, 40], [500, 460, 110, 20], [660, 420, 110, 20],
    [820, 460, 110, 20], [980, 420, 110, 20], [1140, 500, 420, 40],
    [1640, 440, 110, 20], [1830, 380, 110, 20], [2020, 440, 110, 20],
    [2210, 500, 390, 40],
  ], {
    wind: [
      [420, 250, 700, 260, -1, 380], [1140, 250, 500, 260, 1, 380],
      [1640, 250, 600, 260, -1, 380],
    ],
    rocks: [[900, 100], [1750, 100]],
    spikes: [[1250, 500, 60], [2350, 500, 60]],
    fires: [[560, 400], [1200, 440], [1900, 320]],
  }),
  // 11 — Almost There. Everything the hill has, at once.
  level(2, 2800, [60, 466], [1450, 466], [2700, 466], [
    [0, 500, 440, 40], [520, 460, 100, 20, 'crumble'],
    [680, 420, 100, 20], [840, 500, 300, 40], [1220, 440, 120, 20],
    [1420, 500, 300, 40], [1800, 460, 110, 20, 'crumble'],
    [1990, 420, 110, 20], [2180, 500, 620, 40],
  ], {
    wind: [[1200, 300, 600, 240, 1, 300]],
    rocks: [[900, 120], [2300, 120]],
    spikes: [[950, 500, 60], [1500, 500, 60], [2400, 500, 80]],
    hidden: [[2600, 500, 40]],
    fires: [[580, 400], [1300, 380], [2250, 440]],
  }),
  // 12 — Sunrise Peak. The last climb. The sun is already rising.
  level(2, 2600, [60, 466], [1000, 226], [2450, 106], [
    [0, 500, 420, 40], [480, 440, 120, 20], [640, 380, 120, 20],
    [800, 320, 120, 20, 'crumble'], [960, 260, 120, 20],
    [1120, 200, 120, 20], [1280, 140, 140, 20], [1420, 140, 1180, 40],
  ], {
    wind: [[800, 0, 900, 200, -1, 180]],
    spikes: [[1700, 140, 60]],
    fires: [[540, 380], [1020, 200], [1800, 80]],
  }),
];

export function levelMeta(i) {
  return {
    index: i,
    name: LEVEL_NAMES[i],
    intro: LEVEL_INTROS[i],
    memory: MEMORY_LINES[i],
    zone: LEVELS[i].zone,
  };
}
