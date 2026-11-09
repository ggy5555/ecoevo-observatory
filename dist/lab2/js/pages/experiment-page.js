import {DEFAULT_PLAN,validatePlan} from "../experiments/validation.js";
import {listHistory,loadHistory,saveHistory,deleteHistory} from "../ui/storage.js";
import {deriveSeed} from "../core/rng.js";
import {aggregate} from "../experiments/aggregation.js";
import {exportRunsCsv,exportTimeseriesCsv,exportMetadata} from "../experiments/export.js";
import {renderLineChart,renderFinalPopulation,renderGeneHistogram} from "../ui/charts.js";
const $=id=>document.getElementById(id);
const el={form:$("experimentForm"),mode:$("experimentType"),hypothesis:$("hypothesis"),conditions:$("conditions"),
  replicates:$("replicates"),ticks:$("ticks"),sampleInterval:$("sampleInterval"),baseSeed:$("baseSeed"),
  errors:$("validationErrors"),estimate:$("workEstimate"),runCount:$("runEstimate"),
  conditionsPreview:$("conditionsPreview"),seedPreview:$("seedPreview"),start:$("startExperiment"),cancel:$("cancelExperiment"),
  progress:$("progressPanel"),percent:$("progressValue"),bar:$("progressBar"),progressText:$("progressText"),
  results:$("resultSection"),empty:$("emptyState"),note:$("resultNote"),kpis:$("resultKpis")};
let worker=null,jobId=null,result=null,running=false;
const nf=(n,d=2)=>n===null||n===undefined?"N/A":Number(n).toLocaleString("ko-KR",{maximumFractionDigits:d});
const readPlan=()=>({experimentType:el.mode.value,
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
  for(const value of plan.conditions){const x=document.createElement("span");x.textContent=Number.isFinite(value)?(plan.experimentType==="predation"?String(value):value.toFixed(2)):"잘못된 값";el.conditionsPreview.append(x);}
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
  el.start.hidden=value;el.cancel.hidden=!value;el.cancel.disabled=false;el.start.disabled=value;
  for(const item of el.form.querySelectorAll("input,textarea,select"))item.disabled=value;
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
  const predation=result.plan.experimentType==="predation";
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
  if(predation)addKpi("포식으로 인한 사망",nf(result.runs.reduce((s,r)=>s+r.summary.deathsPredation,0),0)+" total");
  const summaryBody=$("summaryTable").querySelector("tbody");summaryBody.replaceChildren();
  for(const group of groups){
    const tr=document.createElement("tr");
    addCells(tr,[group.label,group.completeRuns,group.extinctionRate===null?"N/A":nf(group.extinctionRate*100,1)+"%",
      nf(group.finalPopulationMean),nf(group.finalPopulationSD),nf(group.finalGeneMean,4),group.survivorCount,nf(group.meanBirths),nf(group.meanPredationDeaths)]);
    summaryBody.append(tr);
  }
  const runBody=$("runsTable").querySelector("tbody");runBody.replaceChildren();
  for(const run of result.runs){
    const s=run.summary,tr=document.createElement("tr");
    addCells(tr,[s.conditionValue.toFixed(2),s.replicateIndex+1,s.seed,s.runStatus,s.ticksCompleted,
      s.finalPopulation,nf(s.finalMeanSpeedGene,4),s.extinctionTick,s.deathsPredation]);runBody.append(tr);
  }
  const paired=$("pairedTable").querySelector("tbody");paired.replaceChildren();
  for(const entry of analysis.paired){
    const tr=document.createElement("tr");
    addCells(tr,[entry.seed,entry.deltaPopulation,nf(entry.deltaGene,4)]);paired.append(tr);
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
async function refreshHistory(){
  try{
    const rows=await listHistory(),select=$("historySelect");
    select.replaceChildren();
    if(!rows.length){const option=document.createElement("option");option.value="";option.textContent="저장된 기록 없음";select.append(option);}
    for(const item of rows){
      const option=document.createElement("option");option.value=item.id;
      option.textContent=item.savedAt.slice(0,19).replace("T"," ")+" · "+item.summary.type+" · "+item.summary.conditions.join("/")+" · "+item.summary.runCount+" runs";
      select.append(option);
    }
    $("historyStatus").textContent=rows.length+" / 20개 보관 중";
    $("loadHistory").disabled=rows.length===0;$("deleteHistory").disabled=rows.length===0;
  }catch(error){
    $("historyStatus").textContent="저장소를 사용할 수 없습니다. 데이터 다운로드는 계속 이용할 수 있습니다. ("+String(error.message||error)+")";
    $("loadHistory").disabled=true;$("deleteHistory").disabled=true;
  }
}
$("saveHistory").addEventListener("click",async()=>{
  if(!result)return;
  try{
    const saved=await saveHistory(result,oldest=>window.confirm("저장 한도 20건에 도달했습니다. 가장 오래된 기록 ("+oldest.id+")을 삭제하고 새 결과를 저장할까요?"));
    $("historyStatus").textContent=saved?"이번 실험을 저장했습니다.":"저장이 취소되었습니다.";
    await refreshHistory();
  }catch(error){$("historyStatus").textContent="저장 실패: "+String(error.message||error)+". CSV/JSON으로 다운로드할 수 있습니다.";}
});
$("loadHistory").addEventListener("click",async()=>{
  try{
    const restored=await loadHistory($("historySelect").value);
    if(!restored)throw new Error("저장된 결과를 찾을 수 없습니다.");
    result=restored;renderResults();$("historyStatus").textContent="저장된 "+restored.plan.experimentType+" 실험 결과를 열었습니다.";
  }catch(error){$("historyStatus").textContent="불러오기 실패: "+String(error.message||error);}
});
$("deleteHistory").addEventListener("click",async()=>{
  const id=$("historySelect").value;if(!id)return;
  if(!window.confirm("이 브라우저에 저장된 실험 기록 "+id+"을 삭제할까요?"))return;
  try{await deleteHistory(id);await refreshHistory();$("historyStatus").textContent="선택한 실험 기록을 삭제했습니다.";}
  catch(error){$("historyStatus").textContent="삭제 실패: "+String(error.message||error);}
});
refreshHistory();
function download(text,filename,type){
  try{
    const blob=new Blob([type.startsWith("text/csv")?"\ufeff":"",text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
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
function applyMode(mode){
  const predation=mode==="predation";
  el.mode.value=predation?"predation":"resource";
  $("experimentTitle").textContent=predation?"Predation Selection":"Resource Trade-off";
  $("experimentDescription").textContent=predation?
    "포식자 수만 달리하고 나머지 조건을 통제합니다. 회피·포획·번식이 유전형질과 생존에 미치는 영향을 같은 시드로 비교합니다.":
    "먹이 생성확률을 바꾸되 다른 조건은 고정합니다. 반복 실행으로 개체 수·유전형질·멸종률을 비교하세요.";
  $("conditionLabel").innerHTML=predation?"포식자 수 <small>2~4개 · 정수 0~50</small>":
    "먹이 생성확률 <small>2~4개 · 0~0.50 · 0.01 간격</small>";
  $("conditionsHint").textContent=predation?
    "쉼표로 구분하세요. 기본값 0 / 10 / 30 / 50. 고밀도 조건의 조기 멸종도 기록합니다.":
    "쉼표로 구분하세요. 기본값 0.15 / 0.25 / 0.35";
  $("controlledText").textContent=predation?
    "먹이 생성확률 0.25 · 초기 Prey 30 · 초기 Food 50 · 최대 Food 80 · 번식 기준 100 · 돌연변이 5%":
    "초기 Prey 30 · 초기 Food 50 · 최대 Food 80 · 초기 에너지 50 · 번식 기준 100 · 돌연변이 5% · 포식자 0";
  $("conditionColumnHeader").textContent=predation?"Predators":"Food p";
  el.conditions.value=predation?"0, 10, 30, 50":"0.15, 0.25, 0.35";
  el.hypothesis.placeholder=predation?"포식자 수가 변하면 피식자의 생존과 속도형질이…":"먹이 생성확률이 높으면 집단 규모가…";
  el.results.hidden=true;el.empty.hidden=false;el.empty.textContent="실험 설정을 확인하고 실행하세요.";result=null;
  renderPreview();
}
el.mode.addEventListener("change",()=>applyMode(el.mode.value));
const requested=new URLSearchParams(location.search).get("mode");
applyMode(requested==="predation"?"predation":"resource");
