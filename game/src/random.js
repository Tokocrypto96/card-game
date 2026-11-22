// A small deterministic random source (mulberry32) so a seed always deals the same
// hands. The live game seeds from the clock; ?seed=N pins it for screenshots.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle that draws only from `random`, so it is reproducible. */
export function shuffleInPlace(list, random) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

/** An integer in [min, max] drawn from `random`. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}
