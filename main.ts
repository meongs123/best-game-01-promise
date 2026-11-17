// PROMISE — a promise before sunrise (best-game-01 entry, Node 22, standard library only).
// The game is this directory's game/ folder: plain static files a desktop browser loads
// offline (game/index.html and its ES modules, no library and no network request), and the
// program hands it in. It copies game/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json, the summary the judge reads, with the vendored make.fun
// library. The game itself: a 2D rage platformer about Darma, 78, a retired fisherman who
// climbs Bukit Senja before dawn carrying his late wife Ratna's ashes to scatter at sunrise
// where they first met. 12 levels in 3 zones, double jump as a second wind, fireflies that
// carry Ratna's memories, and a respawn line that keeps the promise alive: "Belum. Aku
// sudah berjanji." Put your 3 or 4 PNG or JPEG screenshots in screenshots/ (the first by
// name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Build summary on stdout (does not touch dossier.json): which entry was handed in and
// how big its dossier is, so a local run shows at a glance that the handoff is complete.
console.log(
  `PROMISE handed in: ${join(out, 'dossier.json')} (${statSync(join(out, 'dossier.json')).size} bytes)`,
);
