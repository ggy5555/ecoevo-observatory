import {MODEL_VERSION,MODEL_V2_DEFAULTS} from "../core/ecology-engine.js";
import {RNG_ALGORITHM,deriveSeed} from "../core/rng.js";
export function csvCell(v) {
  if(v===null||v===undefined)return "";
  let s=String(v);
  if(/^[=+\-@\t\r]/.test(s))s="'"+s;
  return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
const csv=rows=>rows.map(row=>row.map(csvCell).join(",")).join("\r\n")+"\r\n";
export const RUN_COLUMNS=["experiment_id","model_version","experiment_type","condition_id","condition_value",
  "replicate_index","seed","ticks_requested","ticks_completed","run_status","initial_population","final_population",
  "extinct","extinction_tick","initial_mean_speed_gene","final_mean_speed_gene","mean_population","mean_energy",
  "births","deaths_energy","deaths_age","deaths_predation","food_consumed"];
export const TIME_COLUMNS=["experiment_id","experiment_type","condition_id","replicate_index","seed","tick",
  "population","mean_speed_gene","mean_energy","births","deaths_total","deaths_predation","food_count"];
const fields=["experimentId","modelVersion","experimentType","conditionId","conditionValue","replicateIndex",
  "seed","ticksRequested","ticksCompleted","runStatus","initialPopulation","finalPopulation","extinct",
  "extinctionTick","initialMeanSpeedGene","finalMeanSpeedGene","meanPopulation","meanEnergy",
  "births","deathsEnergy","deathsAge","deathsPredation","foodConsumed"];
export function exportRunsCsv(result) {
  return csv([RUN_COLUMNS,...result.runs.map(run=>fields.map(k=>run.summary[k]))]);
}
export function exportTimeseriesCsv(result) {
  const rows=[TIME_COLUMNS];
  for(const run of result.runs)for(const s of run.samples){
    const x=run.summary;
    rows.push([x.experimentId,x.experimentType,x.conditionId,x.replicateIndex,x.seed,s.tick,
      s.population,s.meanSpeedGene,s.meanEnergy,s.births,s.deathsEnergy+s.deathsAge+s.deathsPredation,
      s.deathsPredation,s.foodCount]);
  }
  return csv(rows);
}
export function exportMetadata(result) {
  return JSON.stringify({schemaVersion:"1.0",modelVersion:MODEL_VERSION,
    experimentId:result.plan.experimentId,experimentType:"resource",hypothesis:result.plan.hypothesis,
    independentVariable:"foodSpawnProbability",conditions:result.plan.conditions,
    replicates:result.plan.replicates,ticks:result.plan.ticks,sampleInterval:result.plan.sampleInterval,
    baseSeed:result.plan.baseSeed,replicateSeeds:Array.from({length:result.plan.replicates},(_,i)=>
      deriveSeed(result.plan.baseSeed,"replicate:"+i)),rngAlgorithm:RNG_ALGORITHM,
    controlledParameters:{...MODEL_V2_DEFAULTS,predatorCount:0},
    completedRuns:result.runs.filter(r=>r.summary.runStatus==="completed"||r.summary.runStatus==="extinct_completed").length,
    excludedRuns:result.runs.filter(r=>r.summary.runStatus!=="completed"&&r.summary.runStatus!=="extinct_completed")
      .map(r=>({condition:r.summary.conditionId,seed:r.summary.seed,status:r.summary.runStatus})),
    experimentStatus:result.status,requestedRuns:result.totalRuns,recordedRuns:result.runs.length,
    createdAt:new Date().toISOString()},null,2);
}
