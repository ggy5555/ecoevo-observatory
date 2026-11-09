import { normalizeSeed } from "../core/rng.js";
export const DEFAULT_PLAN=Object.freeze({experimentType:"resource",conditions:[0.15,0.25,0.35],replicates:10,ticks:3000,sampleInterval:50,baseSeed:314159,hypothesis:""});
export function validatePlan(raw) {
  const errors=[];
  const conditions=Array.isArray(raw.conditions)?raw.conditions.map(Number):[];
  if(raw.experimentType!=="resource")errors.push("P0에서는 Resource Trade-off만 실행할 수 있습니다.");
  if(conditions.length<2||conditions.length>4)errors.push("조건은 2~4개 입력하세요.");
  if(conditions.some(v=>!Number.isFinite(v)||v<0||v>0.5||Math.abs(v*100-Math.round(v*100))>1e-7))errors.push("먹이 생성확률은 0~0.50 사이, 0.01 간격이어야 합니다.");
  if(new Set(conditions.map(v=>v.toFixed(2))).size!==conditions.length)errors.push("중복된 실험 조건을 제거하세요.");
  if(!Number.isInteger(raw.replicates)||raw.replicates<1||raw.replicates>50)errors.push("반복 횟수는 1~50입니다.");
  if(!Number.isInteger(raw.ticks)||raw.ticks<500||raw.ticks>20000)errors.push("관찰 기간은 500~20000 ticks입니다.");
  if(!Number.isInteger(raw.sampleInterval)||raw.sampleInterval<10||raw.sampleInterval>500)errors.push("기록 간격은 10~500 ticks입니다.");
  if(Number.isInteger(raw.sampleInterval)&&Number.isInteger(raw.ticks)&&raw.sampleInterval>raw.ticks)errors.push("기록 간격은 관찰 기간보다 짧아야 합니다.");
  const work=conditions.length*raw.replicates*raw.ticks;
  if(work>1000000)errors.push("총 1,000,000 simulated ticks를 초과했습니다. 조건·반복·기간을 줄이세요.");
  try {normalizeSeed(raw.baseSeed);} catch(e){errors.push(e.message);}
  if(String(raw.hypothesis??"").length>500)errors.push("가설은 최대 500자입니다.");
  return {valid:errors.length===0,errors,work,plan:{...raw,
    conditions:conditions.sort((a,b)=>a-b),baseSeed:errors.some(e=>e.includes("시드"))?raw.baseSeed:normalizeSeed(raw.baseSeed),
    hypothesis:String(raw.hypothesis??"")}};
}
