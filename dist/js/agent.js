import { geneToMaxSpeed, inheritSpeedGene } from "./genetics.js";
import { toroidalDelta, toroidalDistanceSquared, wrap } from "./utils.js";

export class Agent {
  constructor({
    id,
    x,
    y,
    speedGene,
    energy = 50,
    parentId = null,
    birthTick = 0,
    rng = Math.random,
  }) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.genotype = { speedGene };
    this.phenotype = { maxSpeed: geneToMaxSpeed(speedGene) };
    this.energy = energy;
    this.age = 0;
    this.alive = true;
    this.parentId = parentId;
    this.birthTick = birthTick;
    this.offspringCount = 0;
    this.foodEaten = 0;
    this.statistics = {
      totalDistance: 0,
      lifetimeEnergySpent: 0,
    };
    this.heading = rng() * Math.PI * 2;
    this.wanderTicksRemaining = 0;
    this.actualSpeed = 0;
  }

  findNearestFood(foods, world) {
    const radiusSquared = world.detectionRadius * world.detectionRadius;
    let target = null;
    let bestDistanceSquared = radiusSquared;

    for (const food of foods) {
      const distanceSquared = toroidalDistanceSquared(
        this,
        food,
        world.width,
        world.height,
      );
      if (distanceSquared <= bestDistanceSquared) {
        target = food;
        bestDistanceSquared = distanceSquared;
      }
    }
    return target;
  }

  move(foods, world, rng = Math.random) {
    const target = this.findNearestFood(foods, world);
    let dx;
    let dy;

    if (target) {
      dx = toroidalDelta(this.x, target.x, world.width);
      dy = toroidalDelta(this.y, target.y, world.height);
      this.heading = Math.atan2(dy, dx);
      this.actualSpeed = this.phenotype.maxSpeed;
    } else {
      if (this.wanderTicksRemaining <= 0) {
        this.heading += (rng() - 0.5) * 1.15;
        this.wanderTicksRemaining = 30 + Math.floor(rng() * 61);
      }
      this.wanderTicksRemaining -= 1;
      this.actualSpeed = world.wanderSpeed;
    }

    const distance = target ? Math.hypot(dx, dy) : Infinity;
    const step = Math.min(this.actualSpeed, distance);
    this.x = wrap(this.x + Math.cos(this.heading) * step, world.width);
    this.y = wrap(this.y + Math.sin(this.heading) * step, world.height);
    this.statistics.totalDistance += step;
    return step;
  }

  spendMovementEnergy(world) {
    const cost = world.baseEnergyCost + world.speedCost * this.actualSpeed ** 2;
    this.energy -= cost;
    this.statistics.lifetimeEnergySpent += cost;
    return cost;
  }

  eatNearbyFood(foods, world) {
    const eatRadiusSquared = world.eatRadius * world.eatRadius;
    let nearestIndex = -1;
    let nearestDistanceSquared = eatRadiusSquared;

    for (let index = 0; index < foods.length; index += 1) {
      const distanceSquared = toroidalDistanceSquared(
        this,
        foods[index],
        world.width,
        world.height,
      );
      if (distanceSquared <= nearestDistanceSquared) {
        nearestIndex = index;
        nearestDistanceSquared = distanceSquared;
      }
    }

    if (nearestIndex === -1) return null;
    const [food] = foods.splice(nearestIndex, 1);
    this.energy += food.energyValue;
    this.foodEaten += 1;
    return food;
  }

  reproduce({ childId, tick, world, rng = Math.random }) {
    const splitEnergy = this.energy / 2;
    this.energy = splitEnergy;
    this.offspringCount += 1;
    const offsetDistance = 5 + rng() * 5;
    const offsetAngle = rng() * Math.PI * 2;

    return new Agent({
      id: childId,
      x: wrap(this.x + Math.cos(offsetAngle) * offsetDistance, world.width),
      y: wrap(this.y + Math.sin(offsetAngle) * offsetDistance, world.height),
      speedGene: inheritSpeedGene(this.genotype.speedGene, rng),
      energy: splitEnergy,
      parentId: this.id,
      birthTick: tick,
      rng,
    });
  }
}
