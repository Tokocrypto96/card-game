// Synthesised sound: every effect is an oscillator (or two) through the Web Audio
// API, so the game ships no audio files at all. Sound starts only after the first
// user gesture, as browsers require, and M mutes it.
let audioContext = null;
let muted = false;

function context() {
  if (audioContext === null) {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

/** Unlock audio from a user gesture (click or key press). */
export function unlockAudio() {
  context();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

/** One short tone: frequency in Hz, length in seconds, shape and volume. */
function tone(frequency, seconds, type = 'sine', volume = 0.12, when = 0) {
  if (muted) return;
  const ctx = context();
  if (ctx === null) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + when;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + seconds + 0.05);
}

/** A tone that slides from one frequency to another (a whoosh or a zap). */
function slide(from, to, seconds, type = 'triangle', volume = 0.1) {
  if (muted) return;
  const ctx = context();
  if (ctx === null) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + seconds + 0.05);
}

export const sounds = {
  click() { tone(660, 0.06, 'sine', 0.08); },
  select() { tone(520, 0.08, 'triangle', 0.1); tone(780, 0.08, 'triangle', 0.08, 0.05); },
  play() { slide(220, 880, 0.18, 'triangle', 0.12); },
  hit() { slide(320, 70, 0.25, 'sawtooth', 0.12); },
  heal() { tone(523, 0.12, 'sine', 0.09); tone(659, 0.12, 'sine', 0.09, 0.09); tone(784, 0.18, 'sine', 0.09, 0.18); },
  win() {
    [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, 0.22, 'triangle', 0.12, index * 0.12));
  },
  lose() {
    [392, 330, 262, 196].forEach((frequency, index) => tone(frequency, 0.25, 'sine', 0.1, index * 0.14));
  },
};
