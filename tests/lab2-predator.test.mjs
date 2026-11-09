import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,updateTick,distanceSquared,MODEL_V2_DEFAULTS} from "../dist/lab2/js/core/ecology-engine.js";
import {PREDATION_PLAN,DEFAULT_PLAN,validatePlan} from "../dist/lab2/js/experiments/validation.js";
import {runExperiment} from "../dist/lab2/js/experiments/runner.js";
import {aggregate} from "../dist/lab2/js/experiments/aggregation.js";
import {exportMetadata,exportRunsCsv} from "../dist/lab2/js/experiments/export.js";

test("predation modes and integer conditions validate without weakening resource limits",()=>{
  assert.equal(validatePlan(PREDATION_PLAN).valid,true);
  assert.equal(validatePlan({...PREDATION_PLAN,conditions:[0,7.2]}).valid,false);
  assert.equal(validatePlan({...PREDATION_PLAN,conditions:[0,51]}).valid,false);
  assert.equal(validatePlan({...DEFAULT_PLAN,conditions:[1,4]}).valid,false);
});
test("initial prey and food match across predator densities",()=>{
  const a=createWorld({predatorCount:0},123),b=createWorld({predatorCount:10},123);
  assert.deepEqual(a.prey,b.prey);assert.deepEqual(a.food,b.food);
  assert.equal(b.predators.length,10);
});
test("predators chase and cannot double-capture same prey",()=>{
  const w=createWorld({initialPrey:1,initialFood:0,foodSpawnProbability:0,predatorCount:2},8);
  const p=w.prey[0];w.predators[0].x=p.x;w.predators[0].y=p.y;
  w.predators[1].x=p.x;w.predators[1].y=p.y;
  updateTick(w);
  assert.equal(w.deathsByCause.predation,1);
  assert.equal(w.prey.length,0);
  assert.equal(w.predators.reduce((n,p)=>n+p.captureCount,0),1);
});
test("prey flee within range and spend energy for movement",()=>{
  const w=createWorld({initialPrey:1,initialFood:0,foodSpawnProbability:0,predatorCount:1},13);
  const p=w.prey[0],t=w.predators[0];
  t.x=(p.x+20)%w.config.width;t.y=p.y;
  const before=distanceSquared(p,t,w.config),energy=p.energy;
  updateTick(w);
  const after=distanceSquared(w.prey[0],t,w.config);
  assert.ok(w.prey.length===1);
  assert.ok(w.prey[0].actualDistanceMoved>0);
  assert.ok(w.prey[0].energy<energy);
  assert.ok(after>before);
});
test("predator runs reproduce from same seeds, aggregate predation deaths and export mode", {timeout:60000},async()=>{
  const plan={...PREDATION_PLAN,conditions:[0,2],replicates:1,ticks:500,experimentId:"pred-test"};
  const a=await runExperiment(plan,{yieldEvery:1000}),b=await runExperiment(plan,{yieldEvery:1000});
  assert.deepEqual(a.runs,b.runs);
  assert.equal(a.runs[0].summary.seed,a.runs[1].summary.seed);
  assert.deepEqual(a.runs[0].initialGenes,a.runs[1].initialGenes);
  assert.equal(a.runs[0].summary.deathsPredation,0);
  assert.equal(a.runs[1].summary.experimentType,"predation");
  assert.equal(aggregate(a).groups.length,2);
  assert.equal(JSON.parse(exportMetadata(a)).independentVariable,"predatorCount");
  assert.match(exportRunsCsv(a),/deaths_predation/);
});
test("zero predators preserve P0 deterministic ecological result",()=>{
  const a=createWorld({},123),b=createWorld({predatorCount:0},123);
  for(let i=0;i<100;i++){updateTick(a);updateTick(b);}
  assert.deepEqual(a.stats,b.stats);
});
