import { createStreams, shuffleSeeded, normalRandom, normalizeSeed } from "./rng.js";
export const MODEL_VERSION = "lab2-ecology-2.0.0";
export const MODEL_V2_DEFAULTS = Object.freeze({
  width:800, height:600, initialPrey:30, initialFood:50, maxFood:80,
  foodSpawnProbability:0.25, foodEnergy:25, initialEnergy:50, reproductionThreshold:100,
  maxAge:1500, detectionRadius:100, eatRadius:6, wanderSpeed:0.25,
  baseCost:0.1, motionCostFactor:0.05, mutationProbability:0.05, mutationSigma:0.03,
  predatorCount:0
});
export const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export const wrap=(n,len)=>((n%len)+len)%len;
export function toroidalDelta(from,to,length) {
  let delta=to-from;
  if (delta>length/2) delta-=length;
  if (delta< -length/2) delta+=length;
  return delta;
}
export function distanceSquared(a,b,config) {
  const dx=toroidalDelta(a.x,b.x,config.width),dy=toroidalDelta(a.y,b.y,config.height);
  return dx*dx+dy*dy;
}
export const geneToSpeed=g=>0.5+2.5*clamp(g,0,1);
function newPrey(world,{x,y,gene,energy,parentId=null,birthTick=0}) {
  return { id:world.nextPreyId++, x,y,age:0,alive:true,energy,birthTick,parentId,
    genotype:{speedGene:gene},phenotype:{maxSpeed:geneToSpeed(gene)},
    direction:world.rng.preyAction()*Math.PI*2, wanderRemaining:0,actualDistanceMoved:0,
    offspringCount:0,foodEaten:0,distanceTravelled:0,deathCause:null };
}
function newFood(world) {
  const r=world.rng.initialFood;
  // Spawned food uses a separate stream so initial conditions remain paired.
  return {id:world.nextFoodId++,x:r()*world.config.width,y:r()*world.config.height,energyValue:world.config.foodEnergy};
}
export function createWorld(configOverrides={},seed=314159) {
  const config={...MODEL_V2_DEFAULTS,...configOverrides};
  if (!(config.foodSpawnProbability>=0 && config.foodSpawnProbability<=0.5)) throw new RangeError("Invalid food probability");
  if (config.predatorCount!==0) throw new RangeError("P1 전용 포식자 기능은 아직 구현되지 않았습니다.");
  const world={version:MODEL_VERSION,config,seed:normalizeSeed(seed),rng:createStreams(seed),
    tick:0,prey:[],food:[],predators:[],nextPreyId:1,nextFoodId:1,
    births:0,deathsByCause:{energy:0,age:0,predation:0},consumedFoodCount:0,
    extinctionTick:null,populationSum:0,energyMeanSum:0,energyMeanTicks:0};
  for(let i=0;i<config.initialPrey;i++) {
    const r=world.rng.initialPrey;
    world.prey.push(newPrey(world,{x:r()*config.width,y:r()*config.height,
      gene:r(),energy:config.initialEnergy}));
  }
  for(let i=0;i<config.initialFood;i++) world.food.push(newFood(world));
  world.initialMeanSpeedGene=world.prey.length ? world.prey.reduce((s,p)=>s+p.genotype.speedGene,0)/world.prey.length:null;
  world.initialGenes=world.prey.map(p=>p.genotype.speedGene);
  world.stats=calculateStats(world);
  return world;
}
export function calculateStats(w) {
  const pop=w.prey.length, count=pop||1;
  return {tick:w.tick,population:pop,foodCount:w.food.length,
    meanSpeedGene:pop?w.prey.reduce((s,p)=>s+p.genotype.speedGene,0)/count:null,
    meanEnergy:pop?w.prey.reduce((s,p)=>s+p.energy,0)/count:null,
    births:w.births,deathsEnergy:w.deathsByCause.energy,deathsAge:w.deathsByCause.age,
    deathsPredation:w.deathsByCause.predation,foodConsumed:w.consumedFoodCount};
}
function nearestFood(prey,world,limit) {
  let closest=null,best=limit*limit;
  for(const food of world.food) {
    const d=distanceSquared(prey,food,world.config);
    if(d<best || (d===best && closest && food.id<closest.id)) {closest=food;best=d;}
  }
  return closest;
}
function movePrey(prey,world) {
  const cfg=world.config,r=world.rng.preyAction;
  const target=nearestFood(prey,world,cfg.detectionRadius);
  let step;
  if(target) {
    const dx=toroidalDelta(prey.x,target.x,cfg.width),dy=toroidalDelta(prey.y,target.y,cfg.height);
    prey.direction=Math.atan2(dy,dx);
    step=Math.min(prey.phenotype.maxSpeed,Math.hypot(dx,dy));
  } else {
    if(prey.wanderRemaining<=0) {
      prey.direction+=(r()-0.5)*1.15;
      prey.wanderRemaining=30+Math.floor(r()*61);
    }
    prey.wanderRemaining--;
    step=cfg.wanderSpeed;
  }
  prey.x=wrap(prey.x+Math.cos(prey.direction)*step,cfg.width);
  prey.y=wrap(prey.y+Math.sin(prey.direction)*step,cfg.height);
  prey.actualDistanceMoved=step;
  prey.distanceTravelled+=step;
  prey.energy-=cfg.baseCost+cfg.motionCostFactor*step*step;
}
function eatOne(prey,world) {
  const food=nearestFood(prey,world,world.config.eatRadius);
  if(!food)return;
  const i=world.food.findIndex(f=>f.id===food.id);
  if(i===-1)return;
  world.food.splice(i,1);
  prey.energy+=food.energyValue;
  prey.foodEaten++;
  world.consumedFoodCount++;
}
function reproduce(prey,world) {
  const r=world.rng.preyAction, mr=world.rng.mutation;
  const delta=mr()<world.config.mutationProbability ? normalRandom(mr)*world.config.mutationSigma:0;
  const gene=clamp(prey.genotype.speedGene+delta,0,1);
  const energy=prey.energy/2;prey.energy=energy;prey.offspringCount++;world.births++;
  const radius=5+r()*5,angle=r()*Math.PI*2;
  return newPrey(world,{x:wrap(prey.x+Math.cos(angle)*radius,world.config.width),
    y:wrap(prey.y+Math.sin(angle)*radius,world.config.height),
    gene,energy,parentId:prey.id,birthTick:world.tick});
}
export function updateTick(world) {
  if(world.prey.length===0) {
    world.tick++;world.stats=calculateStats(world);return world.stats;
  }
  const ordered=shuffleSeeded(world.prey.slice(),world.rng.shuffle);
  for(const prey of ordered) {movePrey(prey,world);eatOne(prey,world);}
  const newborn=[];
  for(const prey of ordered) {
    if(prey.energy>=world.config.reproductionThreshold) newborn.push(reproduce(prey,world));
  }
  for(const prey of ordered) {
    prey.age++;
    const cause=prey.energy<=0?"energy":prey.age>=world.config.maxAge?"age":null;
    if(cause){prey.alive=false;prey.deathCause=cause;world.deathsByCause[cause]++;}
  }
  world.prey=ordered.filter(p=>p.alive);
  world.prey.push(...newborn);
  if(world.food.length<world.config.maxFood && world.rng.foodSpawn()<world.config.foodSpawnProbability) {
    const r=world.rng.foodSpawn;
    world.food.push({id:world.nextFoodId++,x:r()*world.config.width,y:r()*world.config.height,energyValue:world.config.foodEnergy});
  }
  world.tick++;world.stats=calculateStats(world);
  world.populationSum+=world.stats.population;
  if(world.stats.meanEnergy!==null){world.energyMeanSum+=world.stats.meanEnergy;world.energyMeanTicks++;}
  if(world.stats.population===0 && world.extinctionTick===null)world.extinctionTick=world.tick;
  return world.stats;
}
export function snapshot(world) {return {...world.stats};}
