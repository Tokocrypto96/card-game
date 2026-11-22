// The card pool of Ember Sigils: four original sigil elements, twelve original cards.
// Every card has a name, an element, a power, an energy cost and at most one effect:
//   ward  — blocks all damage this round (power 0 by design)
//   heal  — restores 2 life to its owner after the round resolves
//   surge — grants its owner +1 energy next round
// A deck is two copies of each card (24 cards), shuffled with the game's seed.
import { shuffleInPlace } from './random.js';

export const ELEMENTS = {
  flame: { name: 'Flame', color: '#ff7a3c', dark: '#c2410c', glyph: 'flame' },
  tide: { name: 'Tide', color: '#38bdf8', dark: '#0369a1', glyph: 'tide' },
  leaf: { name: 'Leaf', color: '#4ade80', dark: '#15803d', glyph: 'leaf' },
  stone: { name: 'Stone', color: '#cbd5e1', dark: '#64748b', glyph: 'stone' },
};

export const CARD_POOL = [
  { id: 'cinder-fox', name: 'Cinder Fox', element: 'flame', power: 3, cost: 1, effect: null },
  { id: 'ember-imp', name: 'Ember Imp', element: 'flame', power: 5, cost: 2, effect: null },
  { id: 'pyre-drake', name: 'Pyre Drake', element: 'flame', power: 7, cost: 3, effect: null },
  { id: 'mist-eel', name: 'Mist Eel', element: 'tide', power: 2, cost: 1, effect: null },
  { id: 'tide-serpent', name: 'Tide Serpent', element: 'tide', power: 4, cost: 2, effect: null },
  { id: 'tidecaller', name: 'Tidecaller', element: 'tide', power: 4, cost: 2, effect: 'heal' },
  { id: 'sproutling', name: 'Sproutling', element: 'leaf', power: 1, cost: 1, effect: null },
  { id: 'vine-wolf', name: 'Vine Wolf', element: 'leaf', power: 4, cost: 1, effect: null },
  { id: 'thornbloom', name: 'Thornbloom', element: 'leaf', power: 5, cost: 2, effect: 'surge' },
  { id: 'pebble-knight', name: 'Pebble Knight', element: 'stone', power: 3, cost: 1, effect: null },
  { id: 'wardstone', name: 'Wardstone', element: 'stone', power: 0, cost: 1, effect: 'ward' },
  { id: 'granite-titan', name: 'Granite Titan', element: 'stone', power: 8, cost: 3, effect: null },
];

export const DECK_SIZE = 24;
export const HAND_SIZE = 5;

/** Build a fresh 24-card deck (two copies of each pool card) and shuffle it. */
export function buildDeck(random) {
  const deck = [];
  for (const card of CARD_POOL) {
    deck.push({ ...card, uid: `${card.id}-a` });
    deck.push({ ...card, uid: `${card.id}-b` });
  }
  return shuffleInPlace(deck, random);
}

/** Draw up to `count` cards from the front of `deck` (mutates the deck). */
export function drawCards(deck, count) {
  const drawn = [];
  while (drawn.length < count && deck.length > 0) drawn.push(deck.shift());
  return drawn;
}

/** A short human-readable label for a card's effect, or '' when it has none. */
export function effectLabel(effect) {
  if (effect === 'ward') return 'Ward: blocks all damage';
  if (effect === 'heal') return 'Heal: +2 life';
  if (effect === 'surge') return 'Surge: +1 energy';
  return '';
}
