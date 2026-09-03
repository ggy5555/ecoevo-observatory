import { Agent } from "./agent.js";
import { Food } from "./food.js";
import { calculateStatistics } from "./statistics.js";
import { clamp, shuffle } from "./utils.js";

export const DEFAULT_CONFIG = Object.freeze({
  width: 800,
  height: 600,
  initialAgents: 30,
  initialFood: 50,
  maxFood: 80,
  foodEnergy: 25,
  foodSpawnRate: 0.25,
  initialEnergy: 50,
  reproductionThreshold: 100,
  maxAge: 1500,
  detectionRadius: 100,
  eatRadius: 6,
  wanderSpeed: 0.25,
  baseEnergyCost: 0.1,
  speedCost: 0.05,
});

export class Simulation {
  constructor(config = {}, rng = Math.random) {
    this.rng = rng;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.nextAgentId = 1;
    this.nextFoodId = 1;
    this.agents = [];
    this.foods = [];
    this.tick = 0;
    this.births = 0;
    this.deaths = 0;
    this.totalFoodEaten = 0;
    this.stats = null;
    this.reset();
  }

  randomPosition() {
    return {
      x: this.rng() * this.config.width,
      y: this.rng() * this.config.height,
    };
  }

  createInitialAgent() {
    const position = this.randomPosition();
    return new Agent({
      id: this.nextAgentId++,
      ...position,
      speedGene: this.rng(),
      energy: this.config.initialEnergy,
      birthTick: 0,
      rng: this.rng,
    });
  }

  createFood() {
    const position = this.randomPosition();
    return new Food({
      id: this.nextFoodId++,
      ...position,
      energyValue: this.config.foodEnergy,
    });
  }

  reset() {
    this.nextAgentId = 1;
    this.nextFoodId = 1;
    this.tick = 0;
    this.births = 0;
    this.deaths = 0;
    this.totalFoodEaten = 0;
    this.agents = Array.from(
      { length: this.config.initialAgents },
      () => this.createInitialAgent(),
    );
    this.foods = Array.from({ length: this.config.initialFood }, () => this.createFood());
    this.stats = calculateStatistics(this);
    return this.stats;
  }

  setFoodSpawnRate(value) {
    this.config.foodSpawnRate = clamp(Number(value), 0.15, 0.35);
  }

  updateTick() {
    const newborns = [];
    shuffle(this.agents, this.rng);

    for (const agent of this.agents) {
      if (!agent.alive) continue;

      agent.move(this.foods, this.config, this.rng);
      agent.spendMovementEnergy(this.config);

      if (agent.eatNearbyFood(this.foods, this.config)) {
        this.totalFoodEaten += 1;
      }

      if (agent.energy >= this.config.reproductionThreshold) {
        newborns.push(
          agent.reproduce({
            childId: this.nextAgentId++,
            tick: this.tick,
            world: this.config,
            rng: this.rng,
          }),
        );
        this.births += 1;
      }

      agent.age += 1;
      if (agent.energy <= 0 || agent.age >= this.config.maxAge) {
        agent.alive = false;
        this.deaths += 1;
      }
    }

    this.agents = this.agents.filter((agent) => agent.alive);
    this.agents.push(...newborns);

    if (this.foods.length < this.config.maxFood && this.rng() < this.config.foodSpawnRate) {
      this.foods.push(this.createFood());
    }

    this.stats = calculateStatistics(this);
    this.tick += 1;
    this.stats.tick = this.tick;
    return this.stats;
  }
}
