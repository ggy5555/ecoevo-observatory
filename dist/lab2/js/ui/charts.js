import {percentile} from "../experiments/aggregation.js";
const COLORS=["#177d70","#c67a34","#366cc2","#9b639c"];
const fmt=n=>n===null?"—":Number(n).toLocaleString("ko-KR",{maximumFractionDigits:3});
function canvasSetup(canvas){
  const cssWidth=Math.max(320,Math.round(canvas.getBoundingClientRect().width||700));
  const cssHeight=240,dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=cssWidth*dpr;canvas.height=cssHeight*dpr;
  const ctx=canvas.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle="#fff";ctx.fillRect(0,0,cssWidth,cssHeight);
  return {ctx,width:cssWidth,height:cssHeight};
}
function axes(ctx,w,h,maxX,maxY,units,decimals=0,top=20){
  const l=52,r=18,t=top,b=39,plotW=w-l-r,plotH=h-t-b;
  const x=v=>l+v/Math.max(1,maxX)*plotW;
  const y=v=>t+plotH-(v/Math.max(0.000001,maxY))*plotH;
  ctx.font="11px system-ui,sans-serif";ctx.fillStyle="#64736f";ctx.textBaseline="middle";
  for(let i=0;i<=4;i++){
    const value=maxY*i/4,yy=y(value);
    ctx.strokeStyle="#e6ece9";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(l,yy);ctx.lineTo(w-r,yy);ctx.stroke();
    ctx.textAlign="right";ctx.fillText(value.toFixed(decimals),l-7,yy);
  }
  ctx.fillStyle="#64736f";ctx.textAlign="left";ctx.fillText("0",l,h-17);
  ctx.textAlign="right";ctx.fillText(String(maxX),w-r,h-17);
  ctx.textAlign="center";ctx.fillText(units,w/2,h-17);
  return {x,y,l,r,t,b,plotW,plotH};
}
export function renderLineChart(canvas,groups,key,{maxY=null,yLabel="ticks",band=false}={}){
  const {ctx,width:w,height:h}=canvasSetup(canvas);
  const points=groups.flatMap(g=>g.series.filter(p=>p[key]!==null));
  if(!points.length){ctx.fillStyle="#64736f";ctx.textAlign="center";ctx.fillText("분석 가능한 데이터 없음",w/2,h/2);return;}
  const maxX=Math.max(1,...points.map(p=>p.tick));
  const valMax=maxY??Math.max(1,...points.map(p=>p[key]),...(band?points.map(p=>p.popHigh??0):[]))*1.1;
  const a=axes(ctx,w,h,maxX,valMax,yLabel,key==="geneMean"?2:0,52);
  groups.forEach((g,i)=>{
    const color=COLORS[i%COLORS.length];
    if(band&&g.completeRuns>=2){
      const entries=g.series.filter(p=>p.popLow!==null&&p.popHigh!==null);
      if(entries.length){
        ctx.beginPath();
        entries.forEach((p,j)=>j?ctx.lineTo(a.x(p.tick),a.y(p.popHigh)):ctx.moveTo(a.x(p.tick),a.y(p.popHigh)));
        entries.slice().reverse().forEach(p=>ctx.lineTo(a.x(p.tick),a.y(p.popLow)));
        ctx.closePath();ctx.fillStyle=color+"20";ctx.fill();
      }
    }
    let started=false;ctx.beginPath();
    for(const p of g.series){
      if(p[key]===null){started=false;continue;}
      const xx=a.x(p.tick),yy=a.y(p[key]);
      if(!started){ctx.moveTo(xx,yy);started=true;} else ctx.lineTo(xx,yy);
    }
    ctx.strokeStyle=color;ctx.lineWidth=2.3;ctx.stroke();
  });
  // A two-column text legend remains readable on narrow displays.
  ctx.textAlign="left";ctx.textBaseline="middle";ctx.font="11px system-ui,sans-serif";
  const colWidth=Math.max(120,(w-68)/2);
  groups.forEach((g,i)=>{
    const x=52+(i%2)*colWidth, y=12+Math.floor(i/2)*18;
    const label=(g.experimentType==="predation"?"Predators ":"Food p ")+g.label;
    ctx.fillStyle=COLORS[i%COLORS.length];ctx.fillRect(x,y-2,13,4);
    ctx.fillStyle="#33423e";ctx.fillText(label,x+19,y,Math.max(75,colWidth-24));
  });
}
export function renderFinalPopulation(canvas,groups){
  const {ctx,width:w,height:h}=canvasSetup(canvas);
  const all=groups.flatMap(g=>g.runs.map(r=>r.summary.finalPopulation));
  if(!all.length){ctx.fillStyle="#64736f";ctx.fillText("완료된 반복 결과 없음",24,40);return;}
  const vmax=Math.max(1,...all)*1.1;
  const a=axes(ctx,w,h,groups.length+1,vmax,"조건별 종료 개체 수");
  groups.forEach((g,i)=>{
    const vals=g.runs.map(r=>r.summary.finalPopulation).sort((a,b)=>a-b);
    if(!vals.length)return;
    const center=a.x(i+1),low=percentile(vals,25),mid=percentile(vals,50),hi=percentile(vals,75);
    ctx.fillStyle=COLORS[i%COLORS.length]+"55";ctx.strokeStyle=COLORS[i%COLORS.length];
    ctx.fillRect(center-23,a.y(hi),46,Math.max(1,a.y(low)-a.y(hi)));
    ctx.strokeRect(center-23,a.y(hi),46,Math.max(1,a.y(low)-a.y(hi)));
    ctx.beginPath();ctx.moveTo(center-23,a.y(mid));ctx.lineTo(center+23,a.y(mid));ctx.stroke();
    vals.forEach((v,j)=>{
      ctx.beginPath();ctx.arc(center+((j%7)-3)*2.2,a.y(v),2.4,0,Math.PI*2);
      ctx.fillStyle=COLORS[i%COLORS.length];ctx.fill();
    });
    ctx.font="11px system-ui";ctx.fillStyle="#263d36";ctx.textAlign="center";ctx.fillText((g.experimentType==="predation"?"Predators ":"Food p ")+g.label,center,h-32,Math.max(60,a.plotW/groups.length-8));
  });
}
export function renderGeneHistogram(canvas,groups){
  const {ctx,width:w,height:h}=canvasSetup(canvas);
  const first=groups[0];
  if(!first?.runs.length){ctx.fillStyle="#64736f";ctx.fillText("분석 가능한 개체 없음",20,40);return;}
  // P0: compare relative distributions for one explicitly identified condition.
  // Pooled raw counts across unequal living population sizes would be misleading.
  const initial=first.runs.flatMap(r=>r.initialGenes);
  const final=first.runs.flatMap(r=>r.finalGenes);
  const bins=xs=>Array.from({length:10},(_,i)=>xs.filter(v=>Math.min(9,Math.floor(v*10))===i).length);
  const a0=bins(initial).map(n=>n/Math.max(1,initial.length)),a1=bins(final).map(n=>n/Math.max(1,final.length)),max=Math.max(0.05,...a0,...a1)*1.12;
  const a=axes(ctx,w,h,10,max,"speedGene 범위 0~1",2);
  const base=a.y(0);
  for(let i=0;i<10;i++){
    const l=a.x(i+.18),barW=Math.min(19,a.plotW/25);
    ctx.fillStyle="#2b6ff3a8";ctx.fillRect(l,a.y(a0[i]),barW,base-a.y(a0[i]));
    ctx.fillStyle="#de762ca8";ctx.fillRect(l+barW+2,a.y(a1[i]),barW,base-a.y(a1[i]));
  }
  ctx.font="11px system-ui";ctx.fillStyle="#2b6ff3";ctx.fillText("■ 초기",70,10);
  ctx.fillStyle="#de762c";ctx.fillText("■ 종료(생존 집단)",145,10);
  ctx.fillStyle="#263d36";ctx.fillText((first.experimentType==="predation"?"predators=":"p=")+first.label+" 상대빈도",275,10);
}
export function numericText(v,digits=2){return v===null?"N/A":fmt(Number(v).toFixed(digits));}
