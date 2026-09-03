import test from "node:test";
import assert from "node:assert/strict";

import { geneToMaxSpeed } from "../dist/js/genetics.js";
import { DEFAULT_CONFIG, Simulation } from "../dist/js/simulation.js";
import { toroidalDelta, toroidalDistanceSquared } from "../dist/js/utils.js";

test("speedGene maps from 0–1 to 0.5–3.0 px/tick", () => {
  assert.equal(geneToMaxSpeed(0), 0.5);
  assert.equal(geneToMaxSpeed(0.5), 1.75);
  assert.equal(geneToMaxSpeed(1), 3);
});

test("toroidal geometry uses the short path across an edge", () => {
  assert.equal(toroidalDelta(795, 5, 800), 10);
  assert.equal(
    toroidalDistanceSquared({ x: 795, y: 100 }, { x: 5, y: 100 }, 800, 600),
    100,
  );
});

test("MVP reset creates exactly 30 agents and 50 food items", () => {
  const simulation = new Simulation({}, () => 0.5);
  assert.equal(simulation.agents.length, DEFAULT_CONFIG.initialAgents);
  assert.equal(simulation.foods.length, DEFAULT_CONFIG.initialFood);
  assert.equal(simulation.stats.population, 30);
  assert.equal(simulation.stats.currentFood, 50);
});

test("movement energy cost uses the speed actually used in the tick", () => {
  const simulation = new Simulation({ initialAgents: 1, initialFood: 0, foodSpawnRate: 0 }, () => 0.5);
  const agent = simulation.agents[0];
  const before = agent.energy;
  simulation.updateTick();
  const expected = DEFAULT_CONFIG.baseEnergyCost + DEFAULT_CONFIG.speedCost * DEFAULT_CONFIG.wanderSpeed ** 2;
  assert.ok(Math.abs(agent.energy - (before - expected)) < 1e-12);
});

test("an agent above the threshold produces one child and splits energy", () => {
  const simulation = new Simulation({ initialAgents: 1, initialFood: 0, foodSpawnRate: 0 }, () => 0.5);
  simulation.agents[0].energy = 120;
  simulation.updateTick();
  assert.equal(simulation.agents.length, 2);
  assert.equal(simulation.births, 1);
  assert.equal(simulation.agents[0].energy, simulation.agents[1].energy);
  assert.equal(simulation.agents[1].parentId, simulation.agents[0].id);
});

test("agents die when energy is depleted", () => {
  const simulation = new Simulation({ initialAgents: 1, initialFood: 0, foodSpawnRate: 0 }, () => 0.5);
  simulation.agents[0].energy = 0.01;
  simulation.updateTick();
  assert.equal(simulation.agents.length, 0);
  assert.equal(simulation.deaths, 1);
});
