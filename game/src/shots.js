// JANJI — shots: deterministic scene setups for the entry screenshots.
// ?shot=start → title screen. ?shot=play → mid-climb in the dusk forest
// (level 5, wind, deaths on the counter). ?shot=dead → Ratna's line on
// the death screen. ?shot=end → the sunrise ending. No other effect:
// the game plays identically without a query string.
export function applyShot(api) {
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (!shot) return;
  const g = api.game;
  if (shot === 'start') {
    api.setMode('title');
  } else if (shot === 'play') {
    api.startLevel(4, false);
    g.mode = 'play';
    g.deaths = 7;
    // A safe standing spot between the two wind gusts, with a firefly
    // overhead and the checkpoint cairn in view.
    api.teleport(1200, 466);
    g.run.firesGot.add(0);
    g.run.vx = 0;
  } else if (shot === 'dead') {
    api.startLevel(1, false);
    g.mode = 'dead';
    g.deaths = 12;
    g.ratnaLine = 'Not yet. You promised.';
    g.run.dead = true;
    g.run.deadT = 0.1;
    g.shotHold = true; // hold the death screen for the screenshot
    api.teleport(320, 466);
  } else if (shot === 'end') {
    api.startLevel(11, false);
    g.mode = 'ending';
    g.deaths = 41;
    g.totalMs = 823000;
  }
}
