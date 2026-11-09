import test from "node:test";
import assert from "node:assert/strict";
import {DEFAULT_PLAN} from "../dist/lab2/js/experiments/validation.js";
import {runExperiment} from "../dist/lab2/js/experiments/runner.js";
import {aggregate} from "../dist/lab2/js/experiments/aggregation.js";

test("default 3 x 10 x 3000 produces 30 real runs and complete sample timelines", {timeout:150000}, async()=>{
  const result=await runExperiment({...DEFAULT_PLAN,experimentId:"p0-default-smoke"}, {yieldEvery:500});
  assert.equal(result.status,"completed");
  assert.equal(result.runs.length,30);
  const analysis=aggregate(result);
  assert.equal(analysis.groups.length,3);
  for(const group of analysis.groups) assert.equal(group.completeRuns,10);
  for(const run of result.runs) {
    assert.equal(run.summary.ticksCompleted,3000);
    assert.equal(run.samples[0].tick,0);
    assert.equal(run.samples.at(-1).tick,3000);
    assert.equal(run.samples.length,61);
    assert.ok(["completed","extinct_completed"].includes(run.summary.runStatus));
  }
});

test("ES module worker receives START, reports PROGRESS and returns a real RESULT", {timeout:30000}, async()=>{
  const messages=[];
  globalThis.self={postMessage(message){messages.push(message);}};
  await import("../dist/lab2/js/workers/experiment.worker.js");
  const plan={...DEFAULT_PLAN,conditions:[0.15,0.35],replicates:1,ticks:500,experimentId:"worker-test"};
  await globalThis.self.onmessage({data:{type:"START",jobId:"test-job",plan}});
  const progress=messages.filter(x=>x.type==="PROGRESS");
  const terminal=messages.at(-1);
  assert.ok(progress.length>=1);
  assert.ok(progress.every(m=>m.jobId==="test-job"&&m.percent>=0&&m.percent<=100));
  assert.equal(terminal.type,"RESULT");
  assert.equal(terminal.result.runs.length,2);
  assert.equal(terminal.result.finishedRuns,2);
  delete globalThis.self;
});
