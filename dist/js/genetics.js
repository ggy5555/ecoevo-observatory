import { clamp, randomNormal } from "./utils.js";

export const GENETICS = Object.freeze({
  minGene: 0,
  maxGene: 1,
  minSpeed: 0.5,
  speedRange: 2.5,
  mutationProbability: 0.05,
  mutationSigma: 0.03,
});

export function geneToMaxSpeed(speedGene) {
  return GENETICS.minSpeed + clamp(speedGene, 0, 1) * GENETICS.speedRange;
}

export function inheritSpeedGene(parentGene, rng = Math.random) {
  if (rng() >= GENETICS.mutationProbability) return clamp(parentGene, 0, 1);
  const change = randomNormal(rng) * GENETICS.mutationSigma;
  return clamp(parentGene + change, 0, 1);
}
