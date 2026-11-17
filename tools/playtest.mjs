// PROMISE — headless playtest via Chrome DevTools Protocol (dev tool).
// Drives the real game in headless Chrome: title → card → play, run,
// jump (measures apex), spike death → Ratna line → fast respawn,
// goal → level clear → level 2. Captures console errors and screenshots.
// Run: node tools/playtest.mjs  (expects serve.ts on :8901 and Chrome
// headless-shell with --remote-debugging-port=9222 already running)
import { writeFileSync } from 'node:fs';

const PORT = 9222;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page');
if (!page) throw new Error('no page target');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.onopen = r);
let id = 0;
const pending = new Map();
const errors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXCEPTION: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 300));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('CONSOLE: ' + m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300));
  if (m.method === 'Network.loadingFailed') errors.push('NETFAIL: ' + m.params.errorText);
};
function send(method, params = {}) {
  return new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
}
async function key(type, code, keyName) {
  await send('Input.dispatchKeyEvent', { type, code, key: keyName, windowsVirtualKeyCode: 0 });
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`/tmp/promise-test-${name}.png`, Buffer.from(r.result.data, 'base64'));
}
const state = async () => JSON.parse(await evalJs('window.render_game_to_text()'));

await send('Runtime.enable');
await send('Page.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 540, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:8901/' });
await sleep(1500);

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`); };

let s = await state();
check('title screen', s.mode === 'title', JSON.stringify(s));
await shot('title');
await key('keyDown', 'Enter', 'Enter'); await sleep(120); await key('keyUp', 'Enter', 'Enter');
await sleep(300);
s = await state();
check('story card after Enter', s.mode === 'card', s.mode);
await key('keyDown', 'Enter', 'Enter'); await sleep(120); await key('keyUp', 'Enter', 'Enter');
await sleep(300);
s = await state();
check('play mode', s.mode === 'play', s.mode);
const x0 = s.player.x;
// run right for 1.2s
await key('keyDown', 'KeyD', 'd');
await sleep(1200);
await key('keyUp', 'KeyD', 'd');
s = await state();
check('runs right', s.player.x > x0 + 150, `x ${x0} -> ${s.player.x}`);
// jump: measure apex while running
await key('keyDown', 'KeyD', 'd');
await key('keyDown', 'Space', ' ');
let minY = 9999;
for (let i = 0; i < 14; i++) { const t = await state(); minY = Math.min(minY, t.player.y); await sleep(50); }
await key('keyUp', 'Space', ' ');
await key('keyUp', 'KeyD', 'd');
s = await state();
check('jump apex ~108px (single)', minY <= 466 - 80 && minY >= 466 - 130, `apex y=${minY} (ground 466)`);
await shot('play');
// double jump: jump from ground, then jump again mid-air
await evalJs(`window.__PROMISE__.teleport(200, 466)`);
await sleep(200);
await key('keyDown', 'Space', ' ');
await sleep(250);
await key('keyUp', 'Space', ' ');
await key('keyDown', 'Space', ' ');
let minY2 = 9999;
for (let i = 0; i < 14; i++) { const t = await state(); minY2 = Math.min(minY2, t.player.y); await sleep(50); }
await key('keyUp', 'Space', ' ');
check('double jump higher than single', minY2 < minY - 30, `double apex y=${minY2} vs single ${minY}`);
// spike death: teleport onto the L1 spike strip at x=900; poll fast,
// the respawn comes 350ms after the death screen appears
await evalJs(`window.__PROMISE__.teleport(905, 466)`);
await sleep(150);
s = await state();
check('spike kills', s.mode === 'dead' && s.ratnaLine.length > 5, `${s.mode} "${s.ratnaLine}"`);
await shot('dead');
await sleep(600);
s = await state();
check('respawn <0.5s after death overlay', s.mode === 'play', `${s.mode} deaths=${s.deaths}`);
check('death counted', s.deaths >= 1, `deaths=${s.deaths}`);
// firefly: teleport onto one
await evalJs(`window.__PROMISE__.teleport(690, 430)`);
await sleep(400);
s = await state();
check('firefly collected', s.fireflies.startsWith('1/'), s.fireflies);
// checkpoint: teleport onto it and confirm it catches
await evalJs(`window.__PROMISE__.teleport(1050, 466)`);
await sleep(300);
s = await state();
check('checkpoint catches', s.checkpoint === true, `checkpoint=${s.checkpoint}`);
// goal: teleport to the shrine
await evalJs(`window.__PROMISE__.teleport(1900, 466)`);
await sleep(400);
s = await state();
check('goal -> level clear', s.mode === 'levelClear', s.mode);
await shot('clear');
await key('keyDown', 'Enter', 'Enter'); await sleep(120); await key('keyUp', 'Enter', 'Enter');
await sleep(400);
s = await state();
check('level 2 starts (same zone, no card)', s.mode === 'play' && s.level === 2, `${s.mode} level ${s.level}`);
await shot('level2');
// hidden trap fairness: level 4 hidden spike reveals after killing once
await evalJs(`window.__PROMISE__.startLevel(3, false); window.__PROMISE__.game.mode='play'; window.__PROMISE__.teleport(1655, 466)`);
await sleep(150);
s = await state();
check('hidden spike kills first time', s.mode === 'dead', s.mode);
await sleep(600);
const revealed = await evalJs(`window.__PROMISE__.game.run.revealed.size`);
check('hidden spike stays revealed after death', revealed === 1, `revealed=${revealed}`);

console.log('---');
console.log('console/network errors:', errors.length ? errors : 'none');
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `PLAYTEST FAILED: ${failed.length} checks` : 'PLAYTEST ALL PASS');
ws.close();
process.exit(failed.length || errors.length ? 1 : 0);
