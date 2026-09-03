export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function wrap(value, size) {
  return ((value % size) + size) % size;
}

export function toroidalDelta(from, to, size) {
  let delta = to - from;
  if (delta > size / 2) delta -= size;
  if (delta < -size / 2) delta += size;
  return delta;
}

export function toroidalDistanceSquared(a, b, width, height) {
  const dx = toroidalDelta(a.x, b.x, width);
  const dy = toroidalDelta(a.y, b.y, height);
  return dx * dx + dy * dy;
}

export function shuffle(items, rng = Math.random) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

export function randomNormal(rng = Math.random) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
