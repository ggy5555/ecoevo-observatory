import test from "node:test";import assert from "node:assert/strict";
import {DEFAULT_PLAN,validatePlan} from "../dist/lab2/js/experiments/validation.js";
import {runExperiment} from "../dist/lab2/js/experiments/runner.js";
test("default plan has 30 runs and 90,000 simulated ticks",()=>{
  const r=validatePlan(DEFAULT_PLAN);assert.equal(r.valid,true);assert.equal(r.work,90000);
});
test("invalid and duplicate conditions, bad seeds and work over budget fail validation",()=>{
  assert.equal(validatePlan({...DEFAULT_PLAN,conditions:[.2,.2]}).valid,false);
  assert.equal(validatePlan({...DEFAULT_PLAN,baseSeed:"bad"}).valid,false);
  assert.equal(validatePlan({...DEFAULT_PLAN,replicates:50,ticks:20000}).valid,false);
});
test("repeat runs same initial seed and complete sample timeline",async()=>{
  const plan={...DEFAULT_PLAN,conditions:[.15,.35],replicates:1,ticks:500,experimentId:"test-repro"};
  const a=await runExperiment(plan,{yieldEvery:1000}),b=await runExperiment(plan,{yieldEvery:1000});
  assert.equal(a.runs.length,2);assert.deepEqual(a.runs,b.runs);
  assert.equal(a.runs[0].summary.seed,a.runs[1].summary.seed);
  assert.deepEqual(a.runs[0].initialGenes,a.runs[1].initialGenes);
  assert.equal(a.runs[0].samples[0].tick,0);
  assert.equal(a.runs[0].samples.at(-1).tick,500);
  assert.equal(a.status,"completed");
});
test("runner cancellation excludes in-progress run from complete results",async()=>{
  let checks=0;const plan={...DEFAULT_PLAN,conditions:[.15,.35],replicates:2,ticks:500};
  const result=await runExperiment(plan,{yieldEvery:10,shouldCancel:()=>++checks>3});
  assert.equal(result.status,"cancelled");assert.ok(result.runs.length<4);
});
