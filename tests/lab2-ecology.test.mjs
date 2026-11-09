import test from "node:test";import assert from "node:assert/strict";
import {createWorld,updateTick,geneToSpeed,toroidalDelta,distanceSquared,MODEL_V2_DEFAULTS} from "../dist/lab2/js/core/ecology-engine.js";
test("gene mapping and toroidal geometry",()=>{
  assert.equal(geneToSpeed(0),0.5);assert.equal(geneToSpeed(.5),1.75);assert.equal(geneToSpeed(1),3);
  assert.equal(toroidalDelta(795,5,800),10);
  assert.equal(distanceSquared({x:795,y:100},{x:5,y:100},MODEL_V2_DEFAULTS),100);
});
test("identical seeds match initial prey positions, genes and food across resource conditions",()=>{
  const a=createWorld({foodSpawnProbability:.15},404),b=createWorld({foodSpawnProbability:.35},404);
  const f=x=>({x:x.x,y:x.y,g:x.genotype.speedGene});
  assert.deepEqual(a.prey.map(f),b.prey.map(f));
  assert.deepEqual(a.food,b.food);
});
test("actual movement cost uses actual step and food is consumed exactly once",()=>{
  const w=createWorld({initialPrey:1,initialFood:0,foodSpawnProbability:0},100);
  const p=w.prey[0],before=p.energy;
  w.food.push({id:101,x:p.x,y:p.y,energyValue:25});
  updateTick(w);
  assert.equal(w.consumedFoodCount,1);assert.equal(w.food.length,0);
  assert.ok(Math.abs(w.prey[0].energy-(before-.1+25))<1e-8);
  assert.equal(w.prey[0].actualDistanceMoved,0);
});
test("wander energy cost is proportional to actual wander distance",()=>{
  const w=createWorld({initialPrey:1,initialFood:0,foodSpawnProbability:0},100),before=w.prey[0].energy;
  updateTick(w);
  assert.ok(Math.abs(w.prey[0].energy-(before-.1-.05*.25**2))<1e-9);
});
test("reproduction splits energy and newborn inherits genotype with mutation disabled",()=>{
  const w=createWorld({initialPrey:1,initialFood:0,foodSpawnProbability:0,mutationProbability:0},77);
  w.prey[0].energy=120;const initialGene=w.prey[0].genotype.speedGene;
  updateTick(w);
  assert.equal(w.births,1);assert.equal(w.prey.length,2);
  const parent=w.prey.find(p=>p.parentId===null),child=w.prey.find(p=>p.parentId!==null);
  assert.equal(parent.energy,child.energy);assert.equal(child.genotype.speedGene,initialGene);
  assert.equal(child.age,0);
});
test("extinction is a valid result with null mean gene and single death cause",()=>{
  const w=createWorld({initialPrey:1,initialFood:0,foodSpawnProbability:0,initialEnergy:0.01},22);
  updateTick(w);
  assert.equal(w.prey.length,0);assert.equal(w.stats.meanSpeedGene,null);
  assert.equal(w.extinctionTick,1);assert.equal(w.deathsByCause.energy,1);
  assert.equal(w.deathsByCause.age,0);assert.equal(w.deathsByCause.predation,0);
});
test("fixed seed simulation is deterministic",()=>{
  const first=createWorld({},2026),second=createWorld({},2026);
  for(let i=0;i<250;i++){updateTick(first);updateTick(second);}
  assert.deepEqual(first.stats,second.stats);assert.deepEqual(first.prey,second.prey);
});
