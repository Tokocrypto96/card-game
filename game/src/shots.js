// The screenshot scenes behind ?shot=title|play|win|loss. Each one stages a real
// game state through the same state functions the live game uses, with a fixed seed,
// so the frame is what a short game really looks like and the same seed always
// gives the same frame.
import { chooseCard } from './ai.js';
import { createGame, playCards, resolveRound, clearTable, affordableCards } from './state.js';
import { createRandom } from './random.js';
import { SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';

/** The player's autopilot: the cheapest card that can win, else the weakest card. */
function autopilotPick(game) {
  const options = affordableCards(game.player);
  if (options.length === 0) return null;
  const foeLast = game.lastRound?.foeCard ?? null;
  const target = foeLast === null ? 0 : foeLast.power;
  const winners = options.filter((card) => card.power > target);
  const pool = winners.length > 0 ? winners : options;
  pool.sort((a, b) => a.power - b.power || a.cost - b.cost);
  return pool[0];
}

/** Play `rounds` of the duel with both sides on autopilot. */
function playRounds(game, rounds) {
  for (let i = 0; i < rounds; i += 1) {
    const playerCard = autopilotPick(game);
    const foeCard = chooseCard(game, game.lastRound?.playerCard ?? null);
    playCards(game, playerCard, foeCard);
    resolveRound(game);
    if (game.outcome !== 'play') break;
    clearTable(game);
  }
}

/**
 * Set `game` to the named scene (title, play, win or loss) and return the screen
 * to draw over it and the best score to show.
 */
export function stageShot(name, seed) {
  const game = createGame(createRandom(seed));
  if (name === 'win') {
    // A real winning round: Rook down to 3 life, the player drops Pyre Drake.
    playRounds(game, 2);
    game.foe.life = 3;
    const drake = game.player.hand.find((card) => card.id === 'pyre-drake')
      ?? { id: 'pyre-drake', uid: 'pyre-drake-shot', name: 'Pyre Drake', element: 'flame', power: 7, cost: 3, effect: null };
    if (!game.player.hand.includes(drake)) game.player.hand.push(drake);
    game.player.energy = 6;
    // Rook answers with its weakest plain card (never a Wardstone), so the Drake wins for real.
    const weak = affordableCards(game.foe)
      .filter((card) => card.effect !== 'ward')
      .sort((a, b) => a.power - b.power)[0] ?? null;
    playCards(game, drake, weak);
    resolveRound(game);
    return { game, screen: game.outcome === 'won' ? SCREEN_WON : SCREEN_PLAY, best: game.player.score };
  }
  if (name === 'loss') {
    // A real losing round: the player down to 2 life, Rook drops Granite Titan.
    playRounds(game, 2);
    game.player.life = 2;
    const titan = game.foe.hand.find((card) => card.id === 'granite-titan')
      ?? { id: 'granite-titan', uid: 'granite-titan-shot', name: 'Granite Titan', element: 'stone', power: 8, cost: 3, effect: null };
    if (!game.foe.hand.includes(titan)) game.foe.hand.push(titan);
    game.foe.energy = 6;
    // The player answers with the weakest plain card (never Wardstone, never a
    // healer), so the Titan's 8 power lands for real.
    const plain = affordableCards(game.player)
      .filter((card) => card.effect !== 'ward' && card.effect !== 'heal')
      .sort((a, b) => a.power - b.power)[0] ?? null;
    playCards(game, plain, titan);
    resolveRound(game);
    return { game, screen: game.outcome === 'lost' ? SCREEN_LOST : SCREEN_PLAY, best: game.player.score };
  }
  if (name === 'play') {
    // Mid-duel: five rounds in, the sixth round resolved with its cards still on
    // the table, so the verdict line matches the cards shown.
    playRounds(game, 5);
    const playerCard = autopilotPick(game);
    const foeCard = chooseCard(game, game.lastRound?.playerCard ?? null);
    playCards(game, playerCard, foeCard);
    resolveRound(game);
    return { game, screen: SCREEN_PLAY, best: game.player.score };
  }
  // Title: a fresh deck, nothing played yet.
  return { game, screen: SCREEN_TITLE, best: 0 };
}
