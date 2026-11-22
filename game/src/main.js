// Boot and the one loop: input is read every frame, the duel advances one round at
// a time, and the renderer paints what is there. The game moves between five
// screens: title, play, paused, won and lost.
//
// ?seed=N fixes the deal. ?shot=title|play|win|loss (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY } from './config.js';
import { createRandom } from './random.js';
import { createGame, playCards, resolveRound, clearTable, canAfford } from './state.js';
import { chooseCard } from './ai.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_QUIT, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, handBoxes, SCREEN_LOST, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON, VIEW_HEIGHT, VIEW_WIDTH } from './render.js';
import { stageShot } from './shots.js';
import { isMuted, sounds, toggleMute, unlockAudio } from './audio.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const staged = stageShot(name, seed);
  let painted = 0;
  function paint() {
    renderer.draw(staged.game, staged.screen, { best: staged.best, reveal: 1 });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let game = createGame(createRandom(seed));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let selectedIndex = -1;
  let revealStart = 0;
  let flashStart = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    game = createGame(createRandom(Math.floor(Math.random() * 4294967296)));
    selectedIndex = -1;
    revealStart = 0;
    flashStart = 0;
    screen = SCREEN_PLAY;
    announce('Duel started. Choose a card — click it, or press 1 to 5.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WON : SCREEN_LOST;
    if (game.player.score > best) {
      best = game.player.score;
      saveBest(best);
    }
    if (won) sounds.win();
    else sounds.lose();
    announce(won
      ? `Victory. Final score ${game.player.score}. Best ${best}.`
      : `Defeat. Final score ${game.player.score}. Best ${best}.`);
  }

  /** The player commits a card; Rook answers and the round resolves. */
  function playRound(playerCard) {
    if (!canAfford(game.player, playerCard)) return;
    unlockAudio();
    sounds.play();
    const foeCard = chooseCard(game, game.lastRound?.playerCard ?? null);
    playCards(game, playerCard, foeCard);
    const summary = resolveRound(game);
    revealStart = performance.now();
    if (summary.winner === 'foe' && summary.damageToPlayer > 0) flashStart = performance.now();
    if (summary.winner === 'player' && summary.damageToFoe > 0 && playerCard.effect === 'heal') sounds.heal();
    else if (summary.winner === 'foe' && summary.damageToPlayer > 0) sounds.hit();
    selectedIndex = -1;
    announce(summary.winner === 'player'
      ? `You win round ${summary.round}. Rook takes ${summary.damageToFoe} damage.`
      : summary.winner === 'foe'
        ? `Rook wins round ${summary.round}. You take ${summary.damageToPlayer} damage.`
        : `Round ${summary.round} is a tie.`);
  }

  function handlePointer() {
    const pointer = input.takePointer();
    if (!pointer.clicked) return;
    unlockAudio();
    if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY || game.table.player !== null) return;
    const boxes = handBoxes(game.player.hand);
    for (const box of boxes) {
      if (pointer.x >= box.x && pointer.x <= box.x + box.width
        && pointer.y >= box.y && pointer.y <= box.y + box.height) {
        // A click on the already-selected card plays it; otherwise it selects it.
        if (box.index === selectedIndex) playRound(game.player.hand[box.index]);
        else {
          selectedIndex = box.index;
          sounds.select();
        }
        break;
      }
    }
  }

  function handleKeys() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART) {
      startGame();
      return;
    }
    if (actions & ACTION_QUIT && screen === SCREEN_PLAY) {
      screen = SCREEN_TITLE;
      announce('Back to the title screen.');
      return;
    }
    if (actions & ACTION_CONFIRM) {
      unlockAudio();
      if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) startGame();
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (screen === SCREEN_PLAY && selectedIndex >= 0) {
        playRound(game.player.hand[selectedIndex]);
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    const keyIndex = input.takeSelectedIndex();
    if (screen === SCREEN_PLAY && keyIndex >= 0 && keyIndex < game.player.hand.length) {
      if (selectedIndex === keyIndex) playRound(game.player.hand[keyIndex]);
      else {
        selectedIndex = keyIndex;
        sounds.select();
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    handleKeys();
    handlePointer();
    // After the reveal, clear the table so the next round starts clean.
    if (screen === SCREEN_PLAY && game.table.player !== null && now - revealStart > 1600) {
      clearTable(game);
      if (game.outcome === 'won') endGame(true);
      else if (game.outcome === 'lost') endGame(false);
    }
    const reveal = game.table.player === null ? 1 : Math.min(1, (now - revealStart) / 350);
    const flash = flashStart > 0 ? Math.max(0, 1 - (now - flashStart) / 500) : 0;
    renderer.draw(game, screen, { best, selectedIndex, reveal, flash });
  }

  announce('Ember Sigils. Press Enter or click to start the duel.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
