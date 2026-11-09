import {createWorld,updateTick,snapshot,MODEL_VERSION,MODEL_V2_DEFAULTS} from "../core/ecology-engine.js";
import {deriveSeed} from "../core/rng.js";
import {validatePlan} from "./validation.js";
export const COMPLETED_STATUSES=new Set(["completed","extinct_completed"]);
const yieldEventLoop=()=>new Promise(resolve=>setTimeout(resolve,0));
function summaryFor(world,plan,condition,index,seed,status){
  return {experimentId:plan.experimentId,modelVersion:MODEL_VERSION,experimentType:plan.experimentType,
    conditionId:(plan.experimentType==="predation"?"P-":"R-")+(plan.experimentType==="predation"?condition:condition.toFixed(2)),
    conditionValue:condition,replicateIndex:index,seed,ticksRequested:plan.ticks,ticksCompleted:world.tick,runStatus:status,
    initialPopulation:world.config.initialPrey,finalPopulation:world.stats.population,
    extinct:world.extinctionTick!==null,extinctionTick:world.extinctionTick,
    initialMeanSpeedGene:world.initialMeanSpeedGene,finalMeanSpeedGene:world.stats.meanSpeedGene,
    meanPopulation:world.tick?world.populationSum/world.tick:null,
    meanEnergy:world.energyMeanTicks?world.energyMeanSum/world.energyMeanTicks:null,
    births:world.births,deathsEnergy:world.deathsByCause.energy,deathsAge:world.deathsByCause.age,
    deathsPredation:world.deathsByCause.predation,foodConsumed:world.consumedFoodCount};
}
export async function runExperiment(rawPlan,{onProgress=()=>{},shouldCancel=()=>false,yieldEvery=250}={}){
  const result=validatePlan(rawPlan);
  if(!result.valid)throw new Error(result.errors.join(" "));
  const plan=result.plan,runs=[],predation=plan.experimentType==="predation";
  const totalRuns=plan.conditions.length*plan.replicates;
  const experimentId=plan.experimentId||"lab2-"+plan.baseSeed+"-"+plan.ticks;
  const fullPlan={...plan,experimentId};
  let completed=0;
  const started=Date.now();
  for(const condition of plan.conditions){
    for(let index=0;index<plan.replicates;index++){
      if(shouldCancel())return {status:"cancelled",runs,plan:fullPlan,finishedRuns:completed,totalRuns};
      const seed=deriveSeed(plan.baseSeed,"replicate:"+index);
      const overrides=predation?{predatorCount:condition,foodSpawnProbability:0.25}:{foodSpawnProbability:condition,predatorCount:0};
      const world=createWorld(overrides,seed),samples=[snapshot(world)];
      let status="completed";
      for(let step=1;step<=plan.ticks;step++){
        updateTick(world);
        if(step%plan.sampleInterval===0||step===plan.ticks)samples.push(snapshot(world));
        if(world.prey.length>2000){
          status="overflow";
          if(samples.at(-1).tick!==world.tick)samples.push(snapshot(world));
          break;
        }
        if(step%yieldEvery===0){
          if(shouldCancel())return {status:"cancelled",runs,plan:fullPlan,finishedRuns:completed,totalRuns};
          if(step%(yieldEvery*4)===0)onProgress({finishedRuns:completed,totalRuns,currentTick:step,
            percent:Math.round(100*(completed+step/plan.ticks)/totalRuns)});
          await yieldEventLoop();
        }
      }
      if(status==="completed"&&world.extinctionTick!==null)status="extinct_completed";
      runs.push({summary:summaryFor(world,fullPlan,condition,index,seed,status),samples,
        initialGenes:world.initialGenes,finalGenes:world.prey.map(p=>p.genotype.speedGene)});
      completed++;
      onProgress({finishedRuns:completed,totalRuns,currentTick:world.tick,percent:Math.round(100*completed/totalRuns)});
    }
  }
  return {status:"completed",runs,plan:fullPlan,finishedRuns:completed,totalRuns,elapsedMs:Date.now()-started,
    modelDefaults:{...MODEL_V2_DEFAULTS}};
}
