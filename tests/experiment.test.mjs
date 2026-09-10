import test from "node:test";
import assert from "node:assert/strict";

import {
  addExperimentSample,
  cloneExperimentRun,
  createExperimentRun,
  describeExperimentComparison,
  experimentRunsToCsv,
  finalizeExperimentRun,
  isUsableExperimentRun,
} from "../dist/js/experiment.js";

function stats(tick, overrides = {}) {
  return {
    tick,
    population: 30,
    meanSpeedGene: 0.5,
    births: 0,
    deaths: 0,
    currentFood: 50,
    ...overrides,
  };
}

test("experiment recorder samples every 10 ticks", () => {
  const run = createExperimentRun(0.25, stats(0));
  assert.equal(addExperimentSample(run, stats(9)), false);
  assert.equal(addExperimentSample(run, stats(10)), true);
  assert.deepEqual(run.samples.map((sample) => sample.tick), [0, 10]);
});

test("finalizing captures the exact last tick", () => {
  const run = createExperimentRun(0.25, stats(0));
  finalizeExperimentRun(run, stats(7, { population: 28 }));
  assert.equal(run.endedTick, 7);
  assert.equal(run.samples.at(-1).population, 28);
  assert.equal(isUsableExperimentRun(run), true);
});

test("saved experiment slots are independent copies", () => {
  const run = createExperimentRun(0.25, stats(0));
  finalizeExperimentRun(run, stats(10));
  const copy = cloneExperimentRun(run);
  run.samples[0].population = 999;
  assert.equal(copy.samples[0].population, 30);
});

test("comparison summary reports both conditions without claiming causation", () => {
  const runA = createExperimentRun(0.15, stats(0));
  const runB = createExperimentRun(0.35, stats(0));
  finalizeExperimentRun(runA, stats(100, { population: 20, deaths: 10, meanSpeedGene: 0.54 }));
  finalizeExperimentRun(runB, stats(100, { population: 35, births: 5, meanSpeedGene: 0.48 }));
  const summary = describeExperimentComparison(runA, runB);
  assert.match(summary, /B가 15마리 더 많았습니다/);
  assert.match(summary, /여러 번 반복/);
});

test("CSV export includes A and B measurements", () => {
  const runA = createExperimentRun(0.15, stats(0, { births: 12, deaths: 4 }));
  const runB = createExperimentRun(0.35, stats(0));
  finalizeExperimentRun(runA, stats(10, { births: 14, deaths: 5 }));
  finalizeExperimentRun(runB, stats(20));
  const csv = experimentRunsToCsv({ A: runA, B: runB });
  assert.match(csv, /^slot,food_spawn_rate/);
  assert.match(csv, /A,0.15/);
  assert.match(csv, /B,0.35/);
  assert.match(csv, /A,0.15,10,10,30,0.500000,2,1,50/);
});
