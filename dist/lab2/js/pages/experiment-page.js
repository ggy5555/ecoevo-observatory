import {DEFAULT_PLAN,validatePlan} from "../experiments/validation.js";
import {deriveSeed} from "../core/rng.js";
import {aggregate} from "../experiments/aggregation.js";
import {exportRunsCsv,exportTimeseriesCsv,exportMetadata} from "../experiments/export.js";
import {renderLineChart,renderFinalPopulation,renderGeneHistogram} from "../ui/charts.js";
const $=id=>document.getElementById(id);
const el={form:$("experimentForm"),hypothesis:$("hypothesis"),conditions:$("conditions"),
  replicates:$("replicates"),ticks:$("ticks"),sampleInterval:$("sampleInterval"),baseSeed:$("baseSeed"),
  errors:$("validationErrors"),estimate:$("workEstimate"),runCount:$("runEstimate"),
  conditionsPreview:$("conditionsPreview"),seedPreview:$("seedPreview"),start:$("startExperiment"),cancel:$("cancelExperiment"),
  progress:$("progressPanel"),percent:$("progressValue"),bar:$("progressBar"),progressText:$("progressText"),
  results:$("resultSection"),empty:$("emptyState"),note:$("resultNote"),kpis:$("resultKpis")};
let worker=null,jobId=null,result=null,running=false;
const nf=(n,d=2)=>n===null||n===undefined?"N/A":Number(n).toLocaleString("ko-KR",{maximumFractionDigits:d});
const readPlan=()=>({experimentType:"resource",
  conditions:el.conditions.value.split(",").map(x=>x.trim()).filter(x=>x!=="").map(Number),
  replicates:Number(el.replicates.value),ticks:Number(el.ticks.value),sampleInterval:Number(el.sampleInterval.value),
  baseSeed:el.baseSeed.value,hypothesis:el.hypothesis.value.trim()});
function renderPreview() {
  const check=validatePlan(readPlan()),plan=check.plan;
  el.errors.textContent=check.errors.join("\n");
  el.start.disabled=running||!check.valid;
  el.estimate.textContent=Number.isFinite(check.work)?nf(check.work,0)+" ticks":"설정 확인";
  el.runCount.textContent=Number.isFinite(plan.replicates)?nf(plan.conditions.length*plan.replicates,0)+" runs":"설정 확인";
  el.conditionsPreview.replaceChildren();
  for(const value of plan.conditions){const x=document.createElement("span");x.textContent=Number.isFinite(value)?value.toFixed(2):"잘못된 값";el.conditionsPreview.append(x);}
  el.seedPreview.replaceChildren();
  if(!check.errors.some(e=>e.includes("시드"))) {
    for(let i=0;i<Math.min(5,Number.isInteger(plan.replicates)?plan.replicates:0);i++){
      const li=document.createElement("li");li.textContent=String(deriveSeed(Number(plan.baseSeed),"replicate:"+i));el.seedPreview.append(li);
    }
  }
  return check;
}
function setRunning(value) {
  running=value;
  el.start.hidden=value;el.cancel.hidden=!value;el.start.disabled=value;
  for(const item of el.form.querySelectorAll("input,textarea"))item.disabled=value;
  $("newSeed").disabled=value;
  if(!value)renderPreview();
}
function setProgress(data) {
  const p=Math.min(100,Math.max(0,data.percent||0));
  el.percent.textContent=p+"%";el.bar.value=p;
  el.progressText.textContent="완료 "+data.finishedRuns+" / "+data.totalRuns+" runs · 현재 "+nf(data.currentTick,0)+" ticks";
}
function closeWorker(){
  if(worker){worker.terminate();worker=null;}
  jobId=null;setRunning(false);
}
function addCells(row,values) {
  for(const value of values){const td=document.createElement("td");td.textContent=String(value??"N/A");row.append(td);}
}
function addKpi(title,value){
  const div=document.createElement("article");div.className="kpi";
  const s=document.createElement("span"),b=document.createElement("strong");
  s.textContent=title;b.textContent=value;div.append(s,b);el.kpis.append(div);
}
function renderResults(){
  if(!result)return;
  el.empty.hidden=true;el.results.hidden=false;
  const analysis=aggregate(result),groups=analysis.groups,completed=groups.reduce((s,g)=>s+g.completeRuns,0);
  const overallExtinct=groups.reduce((s,g)=>s+g.extinctCount,0);
  const overallSurvive=groups.reduce((s,g)=>s+g.survivorCount,0);
  el.note.textContent=result.status==="cancelled"?
    "사용자가 취소했습니다. 완료된 반복 "+result.runs.length+"회만 부분 데이터로 표시합니다. 전체 실험과 구별하세요.":
    "실제 계산이 완료됐습니다. 완료 "+completed+"회 · 제외 "+(result.runs.length-completed)+"회. 멸종은 정상적인 결과입니다.";
  el.kpis.replaceChildren();
  addKpi("완료된 반복",completed+" / "+result.totalRuns);
  addKpi("관찰 기간 내 멸종",completed?nf(overallExtinct/completed*100,1)+"%":"N/A");
  addKpi("살아남은 집단",nf(overallSurvive,0)+" runs");
  addKpi("제외 / overflow",nf(result.runs.length-completed,0)+" runs");
  const summaryBody=$("summaryTable").querySelector("tbody");summaryBody.replaceChildren();
  for(const group of groups){
    const tr=document.createElement("tr");
    addCells(tr,[group.label,group.completeRuns,group.extinctionRate===null?"N/A":nf(group.extinctionRate*100,1)+"%",
      nf(group.finalPopulationMean),nf(group.finalPopulationSD),nf(group.finalGeneMean,4),group.survivorCount,nf(group.meanBirths)]);
    summaryBody.append(tr);
  }
  const runBody=$("runsTable").querySelector("tbody");runBody.replaceChildren();
  for(const run of result.runs){
    const s=run.summary,tr=document.createElement("tr");
    addCells(tr,[s.conditionValue.toFixed(2),s.replicateIndex+1,s.seed,s.runStatus,s.ticksCompleted,
      s.finalPopulation,nf(s.finalMeanSpeedGene,4),s.extinctionTick]);runBody.append(tr);
  }
  renderLineChart($("populationChart"),groups,"populationMean",{band:true});
  renderLineChart($("geneChart"),groups,"geneMean",{maxY:1});
  renderFinalPopulation($("finalChart"),groups);
  renderGeneHistogram($("geneHistogram"),groups);
  el.results.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"});
}
function finish(message){
  result=message.result;closeWorker();setProgress({percent:result.status==="completed"?100:Math.floor(100*result.finishedRuns/result.totalRuns),
    finishedRuns:result.finishedRuns,totalRuns:result.totalRuns,currentTick:result.plan.ticks});
  renderResults();
}
function run(){
  const check=renderPreview();
  if(!check.valid)return;
  if(typeof Worker==="undefined"){el.errors.textContent="이 브라우저는 Web Worker를 지원하지 않습니다. 다른 최신 브라우저에서 실행하세요.";return;}
  const plan={...check.plan,experimentId:"eco2-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)};
  result=null;el.results.hidden=true;el.empty.hidden=false;
  el.empty.textContent="실험 실행 중입니다. 화면을 닫기 전에 완료 또는 취소 결과를 확인하세요.";
  el.progress.hidden=false;
  setProgress({percent:0,finishedRuns:0,totalRuns:plan.conditions.length*plan.replicates,currentTick:0});
  setRunning(true);
  jobId=plan.experimentId;
  try{
    worker=new Worker(new URL("../workers/experiment.worker.js",import.meta.url),{type:"module"});
    const thisJob=jobId;
    worker.onmessage=e=>{
      const msg=e.data;
      if(!running||msg.jobId!==jobId||msg.jobId!==thisJob)return;
      if(msg.type==="PROGRESS")setProgress(msg);
      if(msg.type==="RESULT"||msg.type==="CANCELLED")finish(msg);
      if(msg.type==="ERROR"){closeWorker();el.errors.textContent="실행 실패: "+msg.message+" · 설정을 확인한 뒤 다시 실행하세요.";el.empty.textContent="실행에 실패했습니다. 아직 결과가 없습니다.";}
    };
    worker.onerror=e=>{if(jobId!==thisJob)return;closeWorker();el.errors.textContent="Worker를 불러오지 못했습니다. GitHub Pages 또는 로컬 HTTP 서버에서 다시 시도하세요.";el.empty.textContent="실행에 실패했습니다.";};
    worker.postMessage({type:"START",jobId,plan});
  }catch(error){closeWorker();el.errors.textContent="Worker 시작 실패: "+String(error.message||error);}
}
function download(text,filename,type){
  try{
    const blob=new Blob(["\ufeff",text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(err){el.errors.textContent="파일 내보내기 실패: "+String(err.message||err);}
}
function downloadResult(kind){
  if(!result)return;
  const suffix=result.status==="cancelled"?"-PARTIAL":"";
  const base="ecoevo-"+result.plan.experimentId+suffix;
  if(kind==="summary")download(exportRunsCsv(result),base+"-run_summary.csv","text/csv;charset=utf-8");
  if(kind==="series")download(exportTimeseriesCsv(result),base+"-timeseries.csv","text/csv;charset=utf-8");
  if(kind==="json")download(exportMetadata(result),base+"-experiment_metadata.json","application/json;charset=utf-8");
}
el.form.addEventListener("submit",e=>{e.preventDefault();run();});
el.form.addEventListener("input",renderPreview);
$("newSeed").addEventListener("click",()=>{
  if(crypto?.getRandomValues){const value=new Uint32Array(1);crypto.getRandomValues(value);el.baseSeed.value=String(value[0]);}
  else el.baseSeed.value=String(Math.floor(Math.random()*4294967296));
  renderPreview();
});
el.cancel.addEventListener("click",()=>{
  if(worker&&jobId){worker.postMessage({type:"CANCEL",jobId});el.cancel.disabled=true;el.progressText.textContent="취소 요청 중 · 완료된 반복만 보존됩니다.";}
});
$("downloadSummary").addEventListener("click",()=>downloadResult("summary"));
$("downloadSeries").addEventListener("click",()=>downloadResult("series"));
$("downloadJson").addEventListener("click",()=>downloadResult("json"));
window.addEventListener("resize",()=>{if(result)renderResultsNoScroll();});
function renderResultsNoScroll(){
  const groups=aggregate(result).groups;
  renderLineChart($("populationChart"),groups,"populationMean",{band:true});
  renderLineChart($("geneChart"),groups,"geneMean",{maxY:1});
  renderFinalPopulation($("finalChart"),groups);
  renderGeneHistogram($("geneHistogram"),groups);
}
const mode=new URLSearchParams(location.search).get("mode");
if(mode&&mode!=="resource"){
  el.errors.textContent="이 실험 모드는 후속 개발(P1) 예정입니다. 현재는 Resource Trade-off만 실행할 수 있습니다.";
  el.start.disabled=true;
  el.form.addEventListener("submit",e=>e.preventDefault());
} else {
  renderPreview();
}
