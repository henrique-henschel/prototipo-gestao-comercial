/**
 * Gerador pseudoaleatório de semente fixa (mulberry32): a mesma semente gera
 * sempre a mesma sequência, então os dados de exemplo e os testes são estáveis.
 * @param {number} seed
 */
export function createRandom(seed) {
  let state = seed >>> 0;

  /** @returns {number} entre 0 (inclusive) e 1 (exclusive) */
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    /** Inteiro entre `min` e `max`, inclusive. */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    /** Verdadeiro com probabilidade `p`. */
    chance: (p) => next() < p,
    /** @template T @param {T[]} list @returns {T} */
    pick: (list) => list[Math.floor(next() * list.length)],
    /**
     * Escolha ponderada.
     * @template T @param {[T, number][]} entries pares [valor, peso] @returns {T}
     */
    weighted(entries) {
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = next() * total;
      for (const [value, weight] of entries) {
        roll -= weight;
        if (roll < 0) return value;
      }
      return entries[entries.length - 1][0];
    },
  };
}
