export const EXPERIMENT_SAMPLE_INTERVAL = 10;

export function snapshotStatistics(stats) {
  return {
    tick: Number(stats.tick),
    population: Number(stats.population),
    meanSpeedGene: Number(stats.meanSpeedGene),
    births: Number(stats.births),
    deaths: Number(stats.deaths),
    currentFood: Number(stats.currentFood),
  };
}

export function createExperimentRun(foodSpawnRate, stats) {
  const firstSample = snapshotStatistics(stats);
  return {
    foodSpawnRate: Number(foodSpawnRate),
    startedTick: firstSample.tick,
    endedTick: firstSample.tick,
    samples: [firstSample],
  };
}

export function addExperimentSample(run, stats, force = false) {
  if (!run) return false;

  const sample = snapshotStatistics(stats);
  const lastIndex = run.samples.length - 1;
  const lastSample = run.samples[lastIndex];

  if (lastSample && sample.tick === lastSample.tick) {
    if (!force) return false;
    run.samples[lastIndex] = sample;
    run.endedTick = sample.tick;
    return true;
  }

  if (
    !force &&
    lastSample &&
    sample.tick - lastSample.tick < EXPERIMENT_SAMPLE_INTERVAL
  ) {
    return false;
  }

  run.samples.push(sample);
  run.endedTick = sample.tick;
  return true;
}

export function finalizeExperimentRun(run, stats) {
  addExperimentSample(run, stats, true);
  run.endedTick = Number(stats.tick);
  return run;
}

export function cloneExperimentRun(run) {
  if (!run) return null;
  return {
    ...run,
    samples: run.samples.map((sample) => ({ ...sample })),
  };
}

export function isUsableExperimentRun(run) {
  if (!run || run.samples.length < 2) return false;
  return run.samples.at(-1).tick > run.samples[0].tick;
}

function signed(value, digits = 0) {
  const rounded = Number(value).toFixed(digits);
  return `${value > 0 ? "+" : ""}${rounded}`;
}

function endSample(run) {
  return run.samples.at(-1);
}

export function describeExperimentComparison(runA, runB) {
  if (!runA && !runB) {
    return "실험을 기록한 뒤 A와 B 슬롯에 저장하면 조건별 차이를 자동으로 정리합니다.";
  }
  if (!runA || !runB) {
    const saved = runA ? "A" : "B";
    const missing = runA ? "B" : "A";
    return `${saved} 실험이 저장되었습니다. 조건을 바꾸어 새로 기록한 뒤 ${missing} 슬롯에도 저장하세요.`;
  }

  const aStart = runA.samples[0];
  const bStart = runB.samples[0];
  const aEnd = endSample(runA);
  const bEnd = endSample(runB);
  const aGeneChange = aEnd.meanSpeedGene - aStart.meanSpeedGene;
  const bGeneChange = bEnd.meanSpeedGene - bStart.meanSpeedGene;
  const aBirths = aEnd.births - aStart.births;
  const aDeaths = aEnd.deaths - aStart.deaths;
  const bBirths = bEnd.births - bStart.births;
  const bDeaths = bEnd.deaths - bStart.deaths;
  const populationDifference = aEnd.population - bEnd.population;
  const populationText = populationDifference === 0
    ? `종료 개체 수는 두 실험 모두 ${aEnd.population}마리였습니다.`
    : `종료 개체 수는 ${populationDifference > 0 ? "A" : "B"}가 ${Math.abs(populationDifference)}마리 더 많았습니다.`;

  return [
    `A(먹이 ${runA.foodSpawnRate.toFixed(2)})와 B(먹이 ${runB.foodSpawnRate.toFixed(2)})를 비교했습니다.`,
    populationText,
    `평균 speedGene 변화는 A ${signed(aGeneChange, 3)}, B ${signed(bGeneChange, 3)}이고, 기록 중 출생·사망은 A ${aBirths}·${aDeaths}, B ${bBirths}·${bDeaths}입니다.`,
    "확률적 변동이 있으므로 같은 조건을 여러 번 반복한 뒤 경향을 판단하세요.",
  ].join(" ");
}

export function experimentRunsToCsv(runs) {
  const rows = [
    [
      "slot",
      "food_spawn_rate",
      "relative_tick",
      "simulation_tick",
      "population",
      "mean_speed_gene",
      "births_since_recording",
      "deaths_since_recording",
      "current_food",
    ].join(","),
  ];

  for (const slot of ["A", "B"]) {
    const run = runs[slot];
    if (!run) continue;
    const firstSample = run.samples[0];
    for (const sample of run.samples) {
      rows.push([
        slot,
        run.foodSpawnRate.toFixed(2),
        sample.tick - run.startedTick,
        sample.tick,
        sample.population,
        sample.meanSpeedGene.toFixed(6),
        sample.births - firstSample.births,
        sample.deaths - firstSample.deaths,
        sample.currentFood,
      ].join(","));
    }
  }

  return rows.length > 1 ? rows.join("\n") : "";
}
