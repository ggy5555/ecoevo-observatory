import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {createWorld,updateTick,MODEL_VERSION} from "../dist/lab2/js/core/ecology-engine.js";
import {PREDATION_PLAN} from "../dist/lab2/js/experiments/validation.js";
import {runExperiment} from "../dist/lab2/js/experiments/runner.js";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("P1 pages contain real controls and link to existing Observatory",()=>{
  const obs=read("dist/lab2/observe.html"),exp=read("dist/lab2/experiment.html"),home=read("dist/lab2/index.html");
  for(const id of ["observeCanvas","observeToggle","observeStep","observeReset","obsInspector","observePredators","obsGeneChart"])
    assert.match(obs,new RegExp('id="'+id+'"'));
  for(const id of ["experimentType","pairedTable","historySelect","saveHistory"])
    assert.match(exp,new RegExp('id="'+id+'"'));
  assert.match(home,/mode=predation/);
  assert.match(home,/observe.html/);
  assert.match(read("dist/index.html"),/href="\.\/lab2\/"/);
});

test("P1 UI source files pass JavaScript syntax checks",()=>{
  for(const path of ["dist/lab2/js/pages/observe-page.js","dist/lab2/js/pages/experiment-page.js","dist/lab2/js/ui/storage.js"]){
    const result=spawnSync(process.execPath,["--check",new URL("../"+path,import.meta.url).pathname],{encoding:"utf8"});
    assert.equal(result.status,0,path+" "+result.stderr);
  }
});

test("energy-related death stays in bounded inspector death record",()=>{
  const w=createWorld({initialPrey:1,initialFood:0,foodSpawnProbability:0,initialEnergy:0.01},9);
  const id=w.prey[0].id;updateTick(w);
  assert.equal(w.recentDeaths[0].id,id);
  assert.equal(w.recentDeaths[0].deathCause,"energy");
  assert.match(MODEL_VERSION,/2\.1\.0$/);
});

test("two-seed predation pilot runs all four preset densities", {timeout:90000},async()=>{
  const plan={...PREDATION_PLAN,replicates:2,ticks:500,experimentId:"predation-pilot"};
  const result=await runExperiment(plan,{yieldEvery:1000});
  assert.equal(result.status,"completed");
  assert.equal(result.runs.length,8);
  const summary=plan.conditions.map(count=>{const runs=result.runs.filter(r=>r.summary.conditionValue===count);
    return {predators:count,extinct:runs.filter(r=>r.summary.extinct).length,
      predationDeaths:runs.reduce((sum,r)=>sum+r.summary.deathsPredation,0)};
  });
  console.info("P1 pilot, 2 seeds × 500 ticks (exploratory):",JSON.stringify(summary));
  assert.equal(summary[0].predationDeaths,0);
});
