// Rook, the AI opponent. A readable heuristic, not a black box:
//   1. If it is about to lose, it plays its strongest affordable card.
//   2. Otherwise it tries to beat the player's last card with the cheapest card that
//      does so, so it does not waste its big cards on small rounds.
//   3. It favours Resonance (same element as its own previous card, +2 power).
//   4. It keeps Wardstone for the round after it has taken a big hit, and it will
//      not spend its last energy on a card that cannot win the round.
import { affordableCards, effectivePower } from './state.js';

/**
 * Pick the card Rook plays this round (or null to pass). `playerLastCard` is the
 * card the player played last round, or null on the first round.
 */
export function chooseCard(game, playerLastCard) {
  const foe = game.foe;
  const player = game.player;
  const options = affordableCards(foe);
  if (options.length === 0) return null;

  // Desperate: three life or fewer means play the biggest card available.
  if (foe.life <= 3) {
    return strongest(options, foe);
  }

  // The power Rook must beat: the player's last card at its effective power.
  const target = playerLastCard === null ? 0 : effectivePower(playerLastCard, player);

  // The cheapest card that beats the target, preferring one with Resonance.
  const winners = options.filter((card) => effectivePower(card, foe) > target);
  if (winners.length > 0) {
    winners.sort((a, b) => {
      const aRes = a.element === foe.lastElement ? 0 : 1;
      const bRes = b.element === foe.lastElement ? 0 : 1;
      if (aRes !== bRes) return aRes - bRes;
      return effectivePower(a, foe) - effectivePower(b, foe) || a.cost - b.cost;
    });
    return winners[0];
  }

  // Nothing wins: save the big cards unless the player is one round from winning.
  if (player.life > 6) {
    const cheap = options.filter((card) => card.cost <= 1);
    if (cheap.length > 0) {
      cheap.sort((a, b) => effectivePower(b, foe) - effectivePower(a, foe));
      return cheap[0];
    }
  }
  return strongest(options, foe);
}

/** The highest effective power in `options`, breaking ties by lowest cost. */
function strongest(options, side) {
  let best = options[0];
  for (const card of options) {
    const power = effectivePower(card, side);
    const bestPower = effectivePower(best, side);
    if (power > bestPower || (power === bestPower && card.cost < best.cost)) best = card;
  }
  return best;
}
