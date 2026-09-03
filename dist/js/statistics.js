export function calculateStatistics(simulation) {
  const { agents, foods, tick, births, deaths, totalFoodEaten } = simulation;
  const count = agents.length;

  if (count === 0) {
    return {
      tick,
      population: 0,
      meanSpeedGene: 0,
      currentFood: foods.length,
      births,
      deaths,
      meanEnergy: 0,
      oldestAgent: 0,
      meanMaxSpeed: 0,
      totalFoodEaten,
    };
  }

  let geneTotal = 0;
  let energyTotal = 0;
  let speedTotal = 0;
  let oldestAgent = 0;

  for (const agent of agents) {
    geneTotal += agent.genotype.speedGene;
    energyTotal += agent.energy;
    speedTotal += agent.phenotype.maxSpeed;
    oldestAgent = Math.max(oldestAgent, agent.age);
  }

  return {
    tick,
    population: count,
    meanSpeedGene: geneTotal / count,
    currentFood: foods.length,
    births,
    deaths,
    meanEnergy: energyTotal / count,
    oldestAgent,
    meanMaxSpeed: speedTotal / count,
    totalFoodEaten,
  };
}
