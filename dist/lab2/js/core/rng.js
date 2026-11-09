// Deterministic 32-bit random streams. All simulation randomness must use these streams.
export const RNG_ALGORITHM = "mulberry32+derived-streams";
export function normalizeSeed(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 0xffffffff || String(value).trim() === "") {
    throw new RangeError("시드는 0~4294967295 사이의 정수여야 합니다.");
  }
  return n >>> 0;
}
export function deriveSeed(base, tag) {
  let h = (normalizeSeed(base) ^ 0x811c9dc5) >>> 0;
  for (const char of String(tag)) {
    h = Math.imul(h ^ char.codePointAt(0), 0x01000193) >>> 0;
  }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return h >>> 0;
}
export function mulberry32(seed) {
  let state = normalizeSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function createStreams(seed) {
  const tags = ["initialPrey","initialFood","preyAction","foodSpawn","mutation","shuffle","predatorInitial","predatorAction"];
  return Object.fromEntries(tags.map(tag => [tag, mulberry32(deriveSeed(seed, tag))]));
}
export function shuffleSeeded(items, rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i+1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
export function normalRandom(rng) {
  let u = 0; while (u === 0) u = rng();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rng());
}
