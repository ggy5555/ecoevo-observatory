import {percentile} from "../experiments/aggregation.js";
const COLORS=["#0f766e","#315fbc","#b45e23","#7a50a5"];
const chartTooltips=new WeakMap();
const fmt=n=>n===null?"—":Number(n).toLocaleString("ko-KR",{maximumFractionDigits:3});
function canvasSetup(canvas){
  const cssWidth=Math.max(240,Math.round(canvas.getBoundingClientRect().width||700));
  const cssHeight=240,dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=cssWidth*dpr;canvas.height=cssHeight*dpr;
  const ctx=canvas.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle="#fff";ctx.fillRect(0,0,cssWidth,cssHeight);
  return {ctx,width:cssWidth,height:cssHeight};
}
function axes(ctx,w,h,maxX,maxY,units,decimals=0,top=20){
  const l=w<360?41:52,r=w<360?10:18,t=top,b=39,plotW=w-l-r,plotH=h-t-b;
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

// Hover inspection reads already-computed plot samples; it never advances a simulation.
function attachChartTooltip(canvas,groups,key,axesGeometry,maxX,width){
  if(typeof document==="undefined"||!canvas.parentElement)return;
  let state=chartTooltips.get(canvas);
  if(!state){
    const parent=canvas.closest("figure")||canvas.parentElement;
    const tooltip=document.createElement("div");
    tooltip.className="chart-data-tooltip";
    tooltip.hidden=true;
    tooltip.setAttribute("aria-hidden","true");
    parent.append(tooltip);
    state={tooltip,groups:[],key:"",axesGeometry:null,maxX:1,width:700};
    chartTooltips.set(canvas,state);
    canvas.addEventListener("pointermove",event=>{
      const current=chartTooltips.get(canvas);
      if(!current||!current.axesGeometry)return;
      const rect=canvas.getBoundingClientRect(),plot=current.axesGeometry;
      const x=(event.clientX-rect.left)*current.width/Math.max(1,rect.width);
      if(x<plot.l||x>current.width-plot.r){current.tooltip.hidden=true;return;}
      const tick=(x-plot.l)/Math.max(1,plot.plotW)*current.maxX;
      const rows=[];
      for(const group of current.groups){
        let nearest=null;
        for(const p of group.series){
          if(p[current.key]===null||p[current.key]===undefined||!Number.isFinite(p[current.key]))continue;
          if(!nearest||Math.abs(p.tick-tick)<Math.abs(nearest.tick-tick))nearest=p;
        }
        if(nearest)rows.push((group.experimentType==="predation"?"Predators ":"Food p ")+group.label+
          " · tick "+nearest.tick+": "+Number(nearest[current.key]).toLocaleString("ko-KR",{maximumFractionDigits:4}));
      }
      if(!rows.length){current.tooltip.hidden=true;return;}
      current.tooltip.textContent="가까운 기록 시점\n"+rows.join("\n");
      current.tooltip.style.left=Math.max(8,Math.min(parent.clientWidth-205,canvas.offsetLeft+(event.clientX-rect.left)+12))+"px";
      current.tooltip.style.top=Math.max(8,canvas.offsetTop+10)+"px";
      current.tooltip.hidden=false;
    });
    canvas.addEventListener("pointerleave",()=>{tooltip.hidden=true;});
  }
  state.groups=groups;state.key=key;state.axesGeometry=axesGeometry;
  state.maxX=maxX;state.width=width;
}

export function renderLineChart(canvas,groups,key,{maxY=null,yLabel="ticks",band=false}={}){
  const {ctx,width:w,height:h}=canvasSetup(canvas);
  const points=groups.flatMap(g=>g.series.filter(p=>p[key]!==null));
  if(!points.length){ctx.fillStyle="#64736f";ctx.textAlign="center";ctx.fillText("분석 가능한 데이터 없음",w/2,h/2);return;}
  const maxX=Math.max(1,...points.map(p=>p.tick));
  const valMax=maxY??Math.max(1,...points.map(p=>p[key]),...(band?points.map(p=>p.popHigh??0):[]))*1.1;
  const legendsPerRow=Math.max(1,Math.floor((w-26)/152));
  const legendRows=Math.ceil(groups.length/legendsPerRow);
  const a=axes(ctx,w,h,maxX,valMax,yLabel,key==="geneMean"?2:0,20+legendRows*16);
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
  ctx.textAlign="left";ctx.font="11px system-ui,sans-serif";
  const legendStep=Math.max(110,(w-24)/legendsPerRow);
  groups.forEach((g,i)=>{
    const xx=12+(i%legendsPerRow)*legendStep,yy=15+Math.floor(i/legendsPerRow)*16;
    ctx.fillStyle=COLORS[i%COLORS.length];ctx.fillRect(xx,yy-4,12,4);
    ctx.fillStyle="#33423e";
    ctx.fillText((g.experimentType==="predation"?"Predators ":"Food p ")+g.label,xx+17,yy);
  });
  attachChartTooltip(canvas,groups,key,a,maxX,w);
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
    ctx.font="11px system-ui";ctx.fillStyle="#263d36";ctx.textAlign="center";ctx.fillText((g.experimentType==="predation"?"Pred ":"p=")+g.label,center,h-32);
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
  const a=axes(ctx,w,h,10,max,"speedGene 범위 0~1",2,w<440?77:w<500?58:38);
  const base=a.y(0);
  for(let i=0;i<10;i++){
    const l=a.x(i+.04),barW=Math.min(19,a.plotW/10*.38);
    ctx.fillStyle="#2b6ff3a8";ctx.fillRect(l,a.y(a0[i]),barW,base-a.y(a0[i]));
    ctx.fillStyle="#de762ca8";ctx.fillRect(l+barW+2,a.y(a1[i]),barW,base-a.y(a1[i]));
  }
  ctx.font="11px system-ui";ctx.textAlign="left";
  ctx.fillStyle="#315fbc";ctx.fillText("■ 초기",14,12);
  ctx.fillStyle="#b45e23";ctx.fillText("■ 종료(생존 집단)",w<500?14:112,w<500?30:12);
  ctx.fillStyle="#263d36";
  ctx.fillText((first.experimentType==="predation"?"Predators ":"Food p ")+first.label+" · 상대빈도",w<440?14:w<500?150:274,w<440?48:w<500?30:12);
}
export function numericText(v,digits=2){return v===null?"N/A":fmt(Number(v).toFixed(digits));}
