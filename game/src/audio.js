// JANJI — audio: everything is synthesized with WebAudio, no files.
// A soft pentatonic pad drifts under the climb; jumps, deaths,
// checkpoints, fireflies and the sunrise each get their own small sound.
// Audio starts on the first user gesture (browser autoplay rule).
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let step = 0;

  // A-minor pentatonic, low and slow: dawn music, not a march.
  const SCALE = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0];

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.12;
      musicGain.connect(master);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function pad(freq, dur) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.5, t0 + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function startMusic() {
    if (!ctx || musicTimer) return;
    const tick = () => {
      const root = SCALE[step % SCALE.length];
      pad(root, 3.2);
      if (step % 3 === 1) pad(root * 1.5, 3.2);
      if (step % 4 === 3) pad(root * 2, 2.4);
      step += 1;
    };
    tick();
    musicTimer = window.setInterval(tick, 1600);
  }

  return {
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
      startMusic();
    },
    jump() { tone(300, 0.16, 'triangle', 0.25, 0, 520); },
    doubleJump() { tone(420, 0.18, 'triangle', 0.28, 0, 760); },
    land() { tone(140, 0.08, 'sine', 0.18, 0, 90); },
    // Death: a short falling sigh, then a soft heartbeat that says "again".
    death() {
      tone(320, 0.35, 'sawtooth', 0.16, 0, 70);
      tone(180, 0.3, 'sine', 0.3, 0.28, 110);
      tone(180, 0.3, 'sine', 0.22, 0.55, 110);
    },
    checkpoint() { tone(523, 0.14, 'sine', 0.3); tone(784, 0.22, 'sine', 0.3, 0.1); },
    firefly() { tone(880, 0.12, 'sine', 0.22); tone(1318, 0.2, 'sine', 0.2, 0.08); },
    levelClear() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.25, i * 0.11));
    },
    sunrise() {
      [261, 329, 392, 523, 659, 784].forEach((f, i) => tone(f, 0.9, 'sine', 0.2, i * 0.16));
    },
    crumble() { tone(200, 0.2, 'square', 0.08, 0, 90); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; },
  };
}
