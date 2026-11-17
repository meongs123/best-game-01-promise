# PROMISE — a promise before sunrise

A 2D rage platformer about an old fisherman keeping a promise.

**Darma, 78**, climbs Bukit Senja before dawn carrying the ashes of
Ratna, his wife, to the peak where they first met — so her ashes can
scatter at sunrise. Every time his old body fails, the promise pulls
him back: *"Not yet. You promised."*

Run, jump, and double-jump ("second wind") through 12 short levels in
3 zones — Kaki Bukit, Hutan Senja, Puncak — past thorns, falling
branches, headwinds, crumbling stone, and hidden traps. Traps are
fair: once a hidden thorn kills you, it stays revealed. Fireflies in
each level hold a memory of Ratna; collect them all to keep it whole.

- **Controls:** A / D or ← → to run · Space / W / ↑ to jump (again in
  the air for a second wind) · R retry · P pause · M mute
- **Rules:** reach the shrine at the end of each level. Spikes,
  branches, and long falls kill — respawn is instant at the last
  checkpoint. 12 levels, then the sunrise.
- **Tech:** plain static files, vanilla JS + Canvas, synthesized
  WebAudio (no audio files), no network, no libraries. Progress saves
  to localStorage.

Play: `node serve.ts`, then open http://localhost:8080

[![make.fun](https://img.shields.io/badge/make.fun-best--game--01-orange)](https://make.fun/bounty/best-game-01)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
