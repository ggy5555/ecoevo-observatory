import {createWorld,updateTick} from "../core/ecology-engine.js";
import {normalizeSeed} from "../core/rng.js";
const $=id=>document.getElementById(id);
const canvas=$("observeCanvas"),ctx=canvas.getContext("2d");
const fields={tick:"obsTick",population:"obsPopulation",foodCount:"obsFood",predatorCount:"obsPredatorCount",
  meanSpeedGene:"obsGene",meanEnergy:"obsEnergy",births:"obsBirths",foodConsumed:"obsEaten",
  deathsEnergy:"obsDeadEnergy",deathsAge:"obsDeadAge",deathsPredation:"obsDeadPredation"};
let world,playing=false,lastTime=0,accumulator=0,history=[],selection=null,lastSelected=null,lastRenderedSample=-1;
const maxSamples=2000;
function readSettings(){
  return {foodSpawnProbability:Number($("observeFood").value),
    predatorCount:$("observeMode").value==="predation"?Number($("observePredators").value):0,
    seed:normalizeSeed($("observeSeed").value)};
}
function format(n,d=3){return n===null||n===undefined?"N/A":Number(n).toLocaleString("ko-KR",{maximumFractionDigits:d});}
function pause(){playing=false;updateControls();}
function updateControls(){
  $("observeToggle").textContent=playing?"Ⅱ Pause":"▶ Start";
  $("observeStep").disabled=playing;
  for(const id of ["observeMode","observeFood","observePredators","observeSeed","observeNewSeed"]){
    $(id).disabled=playing||(id==="observePredators"&&$("observeMode").value!=="predation");
  }
  $("observeStatus").textContent=world?.prey.length===0?"멸종 · 개체군 0":playing?"실행 중":"일시정지 / 준비";
}
function record(){
  if(world.tick%10!==0 && world.tick!==0)return;
  history.push({tick:world.tick,population:world.stats.population,meanSpeedGene:world.stats.meanSpeedGene});
  if(history.length>maxSamples) history.shift();
}
function reset(){
  pause();
  try{
    const p=readSettings();world=createWorld({foodSpawnProbability:p.foodSpawnProbability,predatorCount:p.predatorCount},p.seed);
    history=[];selection=null;lastSelected=null;lastRenderedSample=-1;record();$("observeErrors").textContent="";$("observeApplyStatus").textContent="현재 표시된 조건은 마지막 Reset 기준입니다.";
    updateStats();render();drawCharts();updateControls();
  }catch(err){$("observeErrors").textContent=String(err.message||err);}
}
function updateStats(){
  const s=world.stats;
  for(const [key,id] of Object.entries(fields)) $(id).textContent=format(s[key],key==="meanSpeedGene"?4:2);
  $("obsInspector").replaceChildren();
  if(!selection){$("obsInspector").textContent="개체를 클릭하면 상세 기록이 표시됩니다.";$("obsClear").disabled=true;return;}
  const list=selection.type==="Prey"?world.prey:world.predators;
  const current=list.find(x=>x.id===selection.id);
  if(current)lastSelected={...current};
  const item=current||world.recentDeaths.find(x=>selection.type==="Prey"&&x.id===selection.id)||lastSelected;
  $("obsClear").disabled=false;
  if(!item){$("obsInspector").textContent="선택한 개체를 찾을 수 없습니다.";return;}
  const title=document.createElement("h3");title.textContent=selection.type+" #"+item.id;
  $("obsInspector").append(title);
  const dead=!current;
  const entries=[["상태",dead?"사망 / "+(item.deathCause||"기록 없음"):"생존"],
    ["위치",format(item.x,1)+" / "+format(item.y,1)]];
  if(selection.type==="Prey")entries.push(
    ["Age",item.age],["Energy",format(item.energy)],["speedGene",format(item.genotype.speedGene,5)],
    ["Max speed",format(item.phenotype.maxSpeed,3)],["Actual step",format(item.actualDistanceMoved)],
    ["Food eaten",item.foodEaten],["Offspring",item.offspringCount],
    ["Distance travelled",format(item.distanceTravelled,1)],["Parent ID",item.parentId??"최초 개체"]);
  else entries.push(["Captures",item.captureCount],["Heading (rad)",format(item.heading,2)]);
  const dl=document.createElement("dl");
  for(const [label,value] of entries){const row=document.createElement("div"),dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=label;dd.textContent=String(value);row.append(dt,dd);dl.append(row);}
  $("obsInspector").append(dl);
}
function render(){
  const W=800,H=600;
  ctx.fillStyle="#071e1c";ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="#173c37";ctx.lineWidth=.7;
  for(let x=0;x<=W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<=H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  for(const food of world.food){ctx.save();ctx.translate(food.x,food.y);ctx.rotate(Math.PI/4);ctx.fillStyle="#66d990";ctx.fillRect(-3,-3,6,6);ctx.restore();}
  for(const p of world.prey){
    const gene=p.genotype.speedGene;
    ctx.strokeStyle="rgba(116,173,255,.6)";ctx.lineWidth=1.2;ctx.beginPath();
    ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-8*Math.cos(p.direction),p.y-8*Math.sin(p.direction));ctx.stroke();
    ctx.fillStyle="hsl("+(218-18*gene)+" 85% "+(51+20*gene)+"%)";
    ctx.beginPath();ctx.arc(p.x,p.y,4.5,0,Math.PI*2);ctx.fill();
  }
  for(const p of world.predators){
    ctx.fillStyle="#ee7367";ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.heading);
    ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-6,-6);ctx.lineTo(-6,6);ctx.closePath();ctx.fill();ctx.restore();
  }
  if(selection){
    const item=(selection.type==="Prey"?world.prey:world.predators).find(p=>p.id===selection.id);
    if(item){ctx.strokeStyle="#f7d776";ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(item.x,item.y,13,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle="#fff";ctx.font="bold 13px system-ui";ctx.fillText("#"+item.id,item.x+13,item.y-12);}
  }
}
function plot(canvasId,key,maxYOverride=null){
  const c=$(canvasId),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(320,Math.round(c.getBoundingClientRect().width||500)),h=225;
  c.width=w*dpr;c.height=h*dpr;const g=c.getContext("2d");g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle="#fff";g.fillRect(0,0,w,h);
  const l=47,r=14,t=15,b=32,first=history[0]?.tick??0,last=history.at(-1)?.tick??1;
  const values=history.map(x=>x[key]).filter(x=>x!==null);
  const vmax=maxYOverride??Math.max(1,...values)*1.1;
  const X=tick=>l+(tick-first)/Math.max(1,last-first)*(w-l-r);
  const Y=v=>t+(h-t-b)*(1-v/Math.max(.001,vmax));
  g.strokeStyle="#e2ece8";g.fillStyle="#60766c";g.font="11px system-ui";
  for(let i=0;i<=4;i++){const y=t+(h-t-b)*i/4;g.beginPath();g.moveTo(l,y);g.lineTo(w-r,y);g.stroke();g.fillText(format(vmax*(4-i)/4,2),4,y+3);}
  g.fillText(String(first),l,h-10);g.textAlign="right";g.fillText(String(last),w-r,h-10);
  g.beginPath();let connected=false;
  for(const s of history){if(s[key]===null){connected=false;continue;}if(!connected)g.moveTo(X(s.tick),Y(s[key]));else g.lineTo(X(s.tick),Y(s[key]));connected=true;}
  g.strokeStyle=key==="population"?"#197767":"#376cc7";g.lineWidth=2;g.stroke();
}
function histogram(){
  const c=$("obsHistogram"),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(320,Math.round(c.getBoundingClientRect().width||500)),h=225;
  c.width=w*dpr;c.height=h*dpr;const g=c.getContext("2d");g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle="#fff";g.fillRect(0,0,w,h);
  const bins=Array(10).fill(0);for(const p of world.prey)bins[Math.min(9,Math.floor(p.genotype.speedGene*10))]++;
  const max=Math.max(1,...bins);const left=35,right=12,top=14,bottom=35,step=(w-left-right)/10;
  for(let i=0;i<10;i++){const bar=(h-top-bottom)*bins[i]/max;g.fillStyle="#397fc4";g.fillRect(left+i*step+3,h-bottom-bar,step-6,bar);}
  g.font="11px system-ui";g.fillStyle="#64736f";g.fillText("0",left,h-14);g.textAlign="right";g.fillText("1.0 speedGene",w-right,h-14);
  g.fillText("n="+world.prey.length,w-right,17);
}
function drawCharts(){plot("obsPopulationChart","population");plot("obsGeneChart","meanSpeedGene",1);histogram();}
function step(){
  if(!world)return;
  updateTick(world);record();
  if(selection){
    const list=selection.type==="Prey"?world.prey:world.predators;
    const current=list.find(p=>p.id===selection.id);
    if(current)lastSelected={...current};
    else if(selection.type==="Prey")lastSelected=world.recentDeaths.find(x=>x.id===selection.id)||lastSelected;
  }
  if(world.prey.length===0)pause();
}
function frame(now){
  if(!lastTime)lastTime=now;
  const dt=Math.min(250,now-lastTime);lastTime=now;
  if(playing){accumulator+=dt*Number($("observeSpeed").value);
    let n=0;while(accumulator>=50&&n<80&&playing){step();accumulator-=50;n++;}
    if(n===80)accumulator=0;
    if(n){updateStats();render();const sampleTick=history.at(-1)?.tick;if(sampleTick!==lastRenderedSample){drawCharts();lastRenderedSample=sampleTick;}updateControls();}
  }
  requestAnimationFrame(frame);
}
function selectAt(evt){
  const rect=canvas.getBoundingClientRect(),x=(evt.clientX-rect.left)*800/rect.width,y=(evt.clientY-rect.top)*600/rect.height;
  let pick=null,dist=14*14;
  for(const [type,items] of [["Prey",world.prey],["Predator",world.predators]]){
    for(const item of items){const d=(item.x-x)**2+(item.y-y)**2;
      if(d<dist||(d===dist&&pick&&item.id<pick.id)){pick={type,id:item.id};dist=d;}}
  }
  selection=pick;lastSelected=null;updateStats();render();
}
canvas.addEventListener("click",selectAt);
canvas.addEventListener("keydown",e=>{if(e.key==="Escape"){selection=null;lastSelected=null;updateStats();render();}});
$("obsClear").addEventListener("click",()=>{selection=null;lastSelected=null;updateStats();render();});
$("observeToggle").addEventListener("click",()=>{if(!world)return;playing=!playing;lastTime=performance.now();accumulator=0;updateControls();});
$("observeStep").addEventListener("click",()=>{step();updateStats();render();drawCharts();updateControls();});
$("observeReset").addEventListener("click",reset);
$("observeMode").addEventListener("change",()=>{$("observePredators").disabled=$("observeMode").value!=="predation";$("observeErrors").textContent="모드 변경을 반영하려면 Reset을 누르세요.";$("observeApplyStatus").textContent="변경된 조건이 있습니다 · Reset 후 적용";});
$("observeFood").addEventListener("input",()=>{$("foodValue").textContent=Number($("observeFood").value).toFixed(2)+" / tick";$("observeApplyStatus").textContent="변경된 조건이 있습니다 · Reset 후 적용";});
$("observePredators").addEventListener("input",()=>{$("predatorValue").textContent=$("observePredators").value;$("observeApplyStatus").textContent="변경된 조건이 있습니다 · Reset 후 적용";});
$("observeNewSeed").addEventListener("click",()=>{
  const a=new Uint32Array(1);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(a);else a[0]=Math.floor(Math.random()*4294967296);
  $("observeSeed").value=String(a[0]);$("observeErrors").textContent="새 시드를 적용하려면 Reset을 누르세요.";$("observeApplyStatus").textContent="변경된 조건이 있습니다 · Reset 후 적용";
});
$("observeSeed").addEventListener("input",()=>{$("observeApplyStatus").textContent="변경된 조건이 있습니다 · Reset 후 적용";});
window.addEventListener("resize",()=>{if(world){render();drawCharts();}});
reset();requestAnimationFrame(frame);
