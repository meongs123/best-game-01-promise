// PROMISE — input: keyboard state with edge detection.
// Keys: A/D or Left/Right to move, Space/W/Up to jump (held for higher
// jumps, released to cut), R to retry the level, M to mute, Enter to
// confirm, Esc/P to pause. Touch: left/right halves move, tap jumps.
export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const codeOf = (e) => e.code;

  function onDown(e) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(codeOf(e));
    held.add(codeOf(e));
  }
  function onUp(e) {
    held.delete(codeOf(e));
  }
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', () => held.clear());

  // Touch: left half = move left, right half = move right, quick tap = jump.
  let touchX = null;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    touchX = t.clientX;
    pressed.add('Space');
    held.add('Space');
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    held.delete('Space');
    touchX = null;
  }, { passive: false });

  const api = {
    left() {
      return held.has('ArrowLeft') || held.has('KeyA') || (touchX !== null && touchX < window.innerWidth / 3);
    },
    right() {
      return held.has('ArrowRight') || held.has('KeyD') || (touchX !== null && touchX > (window.innerWidth * 2) / 3);
    },
    jumpHeld() {
      return held.has('Space') || held.has('ArrowUp') || held.has('KeyW');
    },
    jumpPressed() {
      return pressed.has('Space') || pressed.has('ArrowUp') || pressed.has('KeyW');
    },
    confirmPressed() {
      return pressed.has('Enter') || pressed.has('Space');
    },
    retryPressed() {
      return pressed.has('KeyR');
    },
    mutePressed() {
      return pressed.has('KeyM');
    },
    pausePressed() {
      return pressed.has('Escape') || pressed.has('KeyP');
    },
    // Test hook: pretend a key is pressed / held without a real keyboard.
    testPress(code) { pressed.add(code); held.add(code); },
    testRelease(code) { held.delete(code); },
    endFrame() { pressed.clear(); },
  };
  return api;
}
