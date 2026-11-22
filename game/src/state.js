// The duel state: two fighters, their decks, hands, life, energy and score, plus the
// one rule that makes the game worth playing twice: Resonance. Playing a card whose
// element matches your own previous round's card adds +2 power to it. A round is won
// by the higher effective power; the loser takes the difference as damage.
import { buildDeck, drawCards, HAND_SIZE } from './deck.js';
import { shuffleInPlace } from './random.js';

export const START_LIFE = 20;
export const START_ENERGY = 3;
export const MAX_ENERGY = 6;
export const MAX_LIFE = 20;
export const RESONANCE_BONUS = 2;
export const HEAL_AMOUNT = 2;
export const ROUND_WIN_SCORE = 10;

/** A fresh duel. `random` deals both decks; hands start at five cards. */
export function createGame(random) {
  const playerDeck = buildDeck(random);
  const foeDeck = buildDeck(random);
  return {
    random,
    round: 1,
    player: {
      name: 'You', life: START_LIFE, energy: START_ENERGY,
      deck: playerDeck, hand: drawCards(playerDeck, HAND_SIZE),
      discard: [], lastElement: null, surgeNext: false, score: 0,
    },
    foe: {
      name: 'Rook', life: START_LIFE, energy: START_ENERGY,
      deck: foeDeck, hand: drawCards(foeDeck, HAND_SIZE),
      discard: [], lastElement: null, surgeNext: false, score: 0,
    },
    // The cards currently on the table, null outside a reveal.
    table: { player: null, foe: null },
    // The last resolved round, for the message line and the float text.
    lastRound: null,
    // 'play' | 'won' | 'lost' — the duel ends when a life total hits zero.
    outcome: 'play',
  };
}

/** Effective power of `card` for `side`, including the Resonance bonus. */
export function effectivePower(card, side) {
  if (!card) return 0;
  const resonance = side.lastElement !== null && card.element === side.lastElement;
  return card.power + (resonance ? RESONANCE_BONUS : 0);
}

/** Whether `side` can afford to play `card` right now. */
export function canAfford(side, card) {
  return card !== null && card.cost <= side.energy;
}

/** The cards in `side`'s hand that are affordable this round. */
export function affordableCards(side) {
  return side.hand.filter((card) => canAfford(side, card));
}

/**
 * Resolve one round. Both sides have already chosen (or passed with null). The
 * winner scores, the loser takes damage, effects apply, then both sides draw and
 * gain energy. Returns a summary the renderer announces.
 */
export function resolveRound(game) {
  const playerCard = game.table.player;
  const foeCard = game.table.foe;
  const player = game.player;
  const foe = game.foe;

  const playerPower = effectivePower(playerCard, player);
  const foePower = effectivePower(foeCard, foe);
  const playerWard = playerCard !== null && playerCard.effect === 'ward';
  const foeWard = foeCard !== null && foeCard.effect === 'ward';

  let damageToFoe = 0;
  let damageToPlayer = 0;
  let winner = 'tie';
  if (playerPower > foePower) {
    winner = 'player';
    damageToFoe = foeWard ? 0 : playerPower - foePower;
  } else if (foePower > playerPower) {
    winner = 'foe';
    damageToPlayer = playerWard ? 0 : foePower - playerPower;
  }

  foe.life = Math.max(0, foe.life - damageToFoe);
  player.life = Math.max(0, player.life - damageToPlayer);

  // Effects fire after damage: heal restores life, surge banks energy for next round.
  if (playerCard !== null && playerCard.effect === 'heal') {
    player.life = Math.min(MAX_LIFE, player.life + HEAL_AMOUNT);
  }
  if (foeCard !== null && foeCard.effect === 'heal') {
    foe.life = Math.min(MAX_LIFE, foe.life + HEAL_AMOUNT);
  }
  if (playerCard !== null && playerCard.effect === 'surge') player.surgeNext = true;
  if (foeCard !== null && foeCard.effect === 'surge') foe.surgeNext = true;

  if (winner === 'player') player.score += ROUND_WIN_SCORE + damageToFoe;
  if (winner === 'foe') foe.score += ROUND_WIN_SCORE + damageToPlayer;

  const playerResonance =
    playerCard !== null && player.lastElement !== null && playerCard.element === player.lastElement;
  const foeResonance =
    foeCard !== null && foe.lastElement !== null && foeCard.element === foe.lastElement;

  if (playerCard !== null) player.lastElement = playerCard.element;
  if (foeCard !== null) foe.lastElement = foeCard.element;

  game.lastRound = {
    round: game.round,
    playerCard, foeCard, playerPower, foePower,
    damageToFoe, damageToPlayer, winner,
    playerResonance, foeResonance,
  };

  for (const side of [player, foe]) {
    if (side.deck.length === 0 && side.discard.length > 0) {
      side.deck = shuffleInPlace(side.discard, game.random);
      side.discard = [];
    }
  }

  game.round += 1;
  for (const side of [player, foe]) {
    side.energy = Math.min(MAX_ENERGY, side.energy + 1 + (side.surgeNext ? 1 : 0));
    side.surgeNext = false;
    side.hand.push(...drawCards(side.deck, 1));
  }

  if (foe.life <= 0 && player.life <= 0) game.outcome = player.score >= foe.score ? 'won' : 'lost';
  else if (foe.life <= 0) game.outcome = 'won';
  else if (player.life <= 0) game.outcome = 'lost';
  return game.lastRound;
}

/** Move the chosen cards from hand to the table and pay their energy cost. */
export function playCards(game, playerCard, foeCard) {
  game.table.player = playerCard;
  game.table.foe = foeCard;
  if (playerCard !== null) {
    game.player.hand = game.player.hand.filter((c) => c.uid !== playerCard.uid);
    game.player.energy -= playerCard.cost;
    game.player.discard.push(playerCard);
  }
  if (foeCard !== null) {
    game.foe.hand = game.foe.hand.filter((c) => c.uid !== foeCard.uid);
    game.foe.energy -= foeCard.cost;
    game.foe.discard.push(foeCard);
  }
}

/** Clear the table after the reveal so the next round starts clean. */
export function clearTable(game) {
  game.table.player = null;
  game.table.foe = null;
}
