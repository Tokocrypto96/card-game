// Mouse and keyboard input, read once per frame. The game loop polls `takeActions`
// for edge-triggered actions (confirm, pause, restart, mute, quit) and reads the
// pointer directly for card clicks, so a click and a key press can never double-fire.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_QUIT = 16;

/** Attach listeners to `canvas` and return the polling handle. */
export function createInput(canvas) {
  let actions = 0;
  let pointer = { x: -1, y: -1, clicked: false };
  let selectedIndex = -1;

  function onKeyDown(event) {
    if (event.repeat) return;
    if (event.key === 'Enter' || event.key === ' ') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.key === 'r' || event.key === 'R') {
      actions |= ACTION_RESTART;
    } else if (event.key === 'm' || event.key === 'M') {
      actions |= ACTION_MUTE;
    } else if (event.key === 'q' || event.key === 'Q') {
      actions |= ACTION_QUIT;
    } else if (event.key >= '1' && event.key <= '9') {
      selectedIndex = Number.parseInt(event.key, 10) - 1;
    }
  }

  function onPointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    pointer = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
      clicked: true,
    };
  }

  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    /** Actions queued since the last call; the queue is cleared by reading it. */
    takeActions() {
      const queued = actions;
      actions = 0;
      return queued;
    },
    /** The hand index chosen by pressing a number key, -1 when none; also cleared. */
    takeSelectedIndex() {
      const index = selectedIndex;
      selectedIndex = -1;
      return index;
    },
    /** The last pointer press in canvas pixels, and whether it is fresh. */
    takePointer() {
      const point = pointer;
      pointer = { x: -1, y: -1, clicked: false };
      return point;
    },
  };
}
