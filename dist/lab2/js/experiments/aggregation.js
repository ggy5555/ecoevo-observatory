import {COMPLETED_STATUSES} from "./runner.js";
export const mean=values=>values.length?values.reduce((s,v)=>s+v,0)/values.length:null;
export function sampleSD(values) {
  if(values.length<2)return null;
  const m=mean(values);
  return Math.sqrt(values.reduce((s,v)=>s+(v-m)**2,0)/(values.length-1));
}
export function percentile(values,p) {
  if(!values.length)return null;
  const a=values.slice().sort((x,y)=>x-y),i=(a.length-1)*p/100,lo=Math.floor(i),hi=Math.ceil(i);
  return a[lo]+(a[hi]-a[lo])*(i-lo);
}
export function aggregate(result) {
  const groups=result.plan.conditions.map(condition=>{
    const selected=result.runs.filter(run=>run.summary.conditionValue===condition);
    const complete=selected.filter(run=>COMPLETED_STATUSES.has(run.summary.runStatus));
    const alive=complete.filter(run=>run.summary.finalMeanSpeedGene!==null);
    const pop=complete.map(run=>run.summary.finalPopulation);
    const seriesTicks=[...new Set(complete.flatMap(run=>run.samples.map(s=>s.tick)))].sort((a,b)=>a-b);
    const series=seriesTicks.map(tick=>{
      const at=complete.map(run=>run.samples.find(s=>s.tick===tick)).filter(Boolean);
      const population=at.map(s=>s.population);
      const genes=at.map(s=>s.meanSpeedGene).filter(v=>v!==null);
      return {tick,n:at.length,populationMean:mean(population),popLow:percentile(population,10),
        popHigh:percentile(population,90),geneMean:mean(genes),geneN:genes.length};
    });
    return {condition,label:result.plan.experimentType==="predation"?String(condition):condition.toFixed(2),completeRuns:complete.length,
      excludedRuns:selected.length-complete.length,
      extinctCount:complete.filter(run=>run.summary.extinct).length,
      extinctionRate:complete.length?complete.filter(run=>run.summary.extinct).length/complete.length:null,
      finalPopulationMean:mean(pop),finalPopulationSD:sampleSD(pop),
      finalGeneMean:mean(alive.map(run=>run.summary.finalMeanSpeedGene)),
      survivorCount:alive.length,meanBirths:mean(complete.map(run=>run.summary.births)),
      meanDeaths:mean(complete.map(run=>run.summary.deathsEnergy+run.summary.deathsAge+run.summary.deathsPredation)),
      meanPredationDeaths:mean(complete.map(run=>run.summary.deathsPredation)),
      runs:complete,series};
  });
  const paired=[];
  if(groups.length>=2) {
    const [a,b]=groups;
    for(const x of a.runs) {
      const y=b.runs.find(r=>r.summary.seed===x.summary.seed);
      if(y)paired.push({seed:x.summary.seed,deltaPopulation:y.summary.finalPopulation-x.summary.finalPopulation,
        deltaGene:(y.summary.finalMeanSpeedGene===null||x.summary.finalMeanSpeedGene===null)?null:
          y.summary.finalMeanSpeedGene-x.summary.finalMeanSpeedGene});
    }
  }
  return {groups,paired};
}
