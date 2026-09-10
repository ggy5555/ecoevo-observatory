import { Simulation } from "./simulation.js";
import {
  addExperimentSample,
  cloneExperimentRun,
  createExperimentRun,
  describeExperimentComparison,
  experimentRunsToCsv,
  finalizeExperimentRun,
  isUsableExperimentRun,
} from "./experiment.js";

const canvas = document.querySelector("#ecosystemCanvas");
const context = canvas.getContext("2d", { alpha: false });
const simulation = new Simulation();

const elements = {
  tick: document.querySelector("#statTick"),
  population: document.querySelector("#statPopulation"),
  meanGene: document.querySelector("#statMeanGene"),
  food: document.querySelector("#statFood"),
  births: document.querySelector("#statBirths"),
  deaths: document.querySelector("#statDeaths"),
  meanEnergy: document.querySelector("#statMeanEnergy"),
  meanSpeed: document.querySelector("#statMeanSpeed"),
  oldest: document.querySelector("#statOldest"),
  foodEaten: document.querySelector("#statFoodEaten"),
  foodSpawnRate: document.querySelector("#foodSpawnRate"),
  foodSpawnOutput: document.querySelector("#foodSpawnOutput"),
  speedSelect: document.querySelector("#speedSelect"),
  toggleButton: document.querySelector("#toggleButton"),
  toggleButtonText: document.querySelector("#toggleButtonText"),
  stepButton: document.querySelector("#stepButton"),
  resetButton: document.querySelector("#resetButton"),
  overlayStartButton: document.querySelector("#overlayStartButton"),
  overlay: document.querySelector("#canvasOverlay"),
  runStatus: document.querySelector("#runStatus"),
  runStatusText: document.querySelector("#runStatusText"),
  tutorialReplay: document.querySelector("#tutorialReplay"),
  tutorialLayer: document.querySelector("#tutorialLayer"),
  tutorialCard: document.querySelector("#tutorialCard"),
  tutorialStep: document.querySelector("#tutorialStep"),
  tutorialIcon: document.querySelector("#tutorialIcon"),
  tutorialTitle: document.querySelector("#tutorialTitle"),
  tutorialDescription: document.querySelector("#tutorialDescription"),
  tutorialTip: document.querySelector("#tutorialTip"),
  tutorialProgress: document.querySelector("#tutorialProgress"),
  tutorialSkip: document.querySelector("#tutorialSkip"),
  tutorialPrevious: document.querySelector("#tutorialPrevious"),
  tutorialNext: document.querySelector("#tutorialNext"),
  recordButton: document.querySelector("#recordButton"),
  recordButtonText: document.querySelector("#recordButtonText"),
  recordStatus: document.querySelector("#recordStatus"),
  recordStatusText: document.querySelector("#recordStatusText"),
  recordSampleCount: document.querySelector("#recordSampleCount"),
  saveRunA: document.querySelector("#saveRunA"),
  saveRunB: document.querySelector("#saveRunB"),
  slotACard: document.querySelector("#slotACard"),
  slotAMeta: document.querySelector("#slotAMeta"),
  slotAStats: document.querySelector("#slotAStats"),
  slotBCard: document.querySelector("#slotBCard"),
  slotBMeta: document.querySelector("#slotBMeta"),
  slotBStats: document.querySelector("#slotBStats"),
  downloadCsv: document.querySelector("#downloadCsv"),
  clearExperiments: document.querySelector("#clearExperiments"),
  comparisonSummary: document.querySelector("#comparisonSummary"),
  populationChart: document.querySelector("#populationChart"),
  geneChart: document.querySelector("#geneChart"),
  vitalChart: document.querySelector("#vitalChart"),
};

const TUTORIAL_STORAGE_KEY = "ecoevo:tutorial-seen:v1";
const tutorialSteps = [
  {
    icon: "◎",
    title: "EcoEvo Observatory 사용법",
    description:
      "환경을 바꾸고 가상 생물 집단의 생존·번식·사망을 관찰하는 실험실입니다. 중요한 기능만 짧게 살펴볼게요.",
    tip: "화살표 키로도 이전·다음 단계로 이동할 수 있습니다.",
  },
  {
    target: ".controls-panel .control-group:first-of-type",
    icon: "◒",
    title: "먹이 생성률",
    description:
      "한 tick마다 새 먹이가 생길 확률입니다. 값을 낮추면 경쟁이 강해지고, 높이면 에너지를 얻을 기회가 늘어납니다.",
    tip: "한 번에 조건 하나만 바꿔야 결과를 비교하기 쉽습니다.",
  },
  {
    target: ".control-group.compact",
    icon: "×",
    title: "관찰 속도",
    description:
      "1×는 움직임을 자세히 볼 때, 5×는 변화 확인, 20×는 여러 세대를 빠르게 관찰할 때 사용합니다.",
    tip: "속도는 시간만 빠르게 하며 모델 규칙은 바꾸지 않습니다.",
  },
  {
    target: "#toggleButton",
    icon: "▶",
    title: "시작과 일시정지",
    description:
      "시뮬레이션을 시작하거나 잠시 멈춥니다. 멈춘 상태에서도 현재 개체와 통계는 그대로 유지됩니다.",
    tip: "조건을 천천히 읽고 싶을 때 먼저 일시정지하세요.",
  },
  {
    target: "#stepButton",
    icon: "+1",
    title: "1 tick 실행",
    description:
      "시간을 정확히 한 단계만 진행합니다. 특정 순간의 이동·에너지 변화·먹이 섭취를 관찰할 때 유용합니다.",
    tip: "연속 실행 중에는 사용할 수 없습니다.",
  },
  {
    target: "#resetButton",
    icon: "↺",
    title: "초기 상태로 재설정",
    description:
      "개체 30마리와 먹이 50개의 새로운 실험을 시작합니다. 누적 Births와 Deaths도 0으로 돌아갑니다.",
    tip: "현재 실험 결과가 사라지므로 비교할 수치를 먼저 기록하세요.",
  },
  {
    target: ".canvas-shell",
    icon: "◇",
    title: "가상 생태계 화면",
    description:
      "파란 원은 생물, 초록 마름모는 먹이입니다. 생물 뒤의 가는 선은 이동 방향이며 화면 가장자리는 반대편과 연결됩니다.",
    tip: "파란색이 밝을수록 speedGene 값이 높은 개체입니다.",
  },
  {
    target: ".stats-grid",
    scrollBlock: "start",
    icon: "Σ",
    title: "핵심 결과 읽기",
    description:
      "Population은 현재 개체 수, Mean speedGene은 평균 유전값, Births와 Deaths는 실험 시작 후 누적 출생·사망 수입니다.",
    tip: "먹이 생성률을 바꾼 뒤 이 값들이 시간에 따라 어떻게 달라지는지 비교하세요.",
  },
  {
    target: ".recorder-panel",
    icon: "A/B",
    title: "실험 기록과 조건 비교",
    description:
      "기록을 시작해 한 조건의 변화를 모은 뒤 A에 저장하세요. 조건을 바꾸어 다시 기록하고 B에 저장하면 그래프와 비교 요약이 완성됩니다.",
    tip: "정확한 비교를 위해 먹이 생성률을 제외한 나머지 조건은 같게 유지하세요.",
  },
  {
    icon: "✓",
    title: "준비 완료! 이제 직접 해봅시다.",
    description:
      "먹이 생성률을 정하고 실행한 뒤 Population, Births, Deaths의 변화를 관찰하세요. 필요하면 상단의 ? 버튼으로 언제든 다시 볼 수 있습니다.",
    tip: "추천 첫 실험: 먹이 생성률 0.25, 관찰 속도 20×",
    final: true,
  },
];

const TICK_DURATION_MS = 50;
let running = false;
let speedMultiplier = 1;
let accumulator = 0;
let previousTime = performance.now();
let tutorialIndex = 0;
let tutorialTarget = null;
let tutorialReturnFocus = null;
let recordingExperiment = false;
let activeExperimentRun = null;
let activeExperimentSavedAs = null;
const savedExperimentRuns = { A: null, B: null };

function tutorialHasBeenSeen() {
  try {
    return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === "yes";
  } catch {
    return false;
  }
}

function rememberTutorialCompletion() {
  try {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "yes");
  } catch {
    // The tutorial still works when storage is unavailable.
  }
}

function clearTutorialTarget() {
  if (!tutorialTarget) return;
  tutorialTarget.classList.remove("tutorial-focus");
  tutorialTarget = null;
}

function placeTutorialCard(step) {
  const card = elements.tutorialCard;
  card.classList.remove("ready");
  card.style.left = "";
  card.style.right = "";
  card.style.top = "";
  card.style.bottom = "";

  if (!tutorialTarget || step.final || !step.target) {
    card.dataset.placement = "center";
    requestAnimationFrame(() => card.classList.add("ready"));
    return;
  }

  if (window.innerWidth <= 820) {
    card.dataset.placement = "bottom-sheet";
    requestAnimationFrame(() => card.classList.add("ready"));
    return;
  }

  const targetRect = tutorialTarget.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const gap = 18;
  const edge = 16;
  let left;
  let top;
  let placement;

  if (targetRect.right + gap + cardRect.width <= window.innerWidth - edge) {
    left = targetRect.right + gap;
    top = targetRect.top + targetRect.height / 2 - cardRect.height / 2;
    placement = "right";
  } else if (targetRect.left - gap - cardRect.width >= edge) {
    left = targetRect.left - gap - cardRect.width;
    top = targetRect.top + targetRect.height / 2 - cardRect.height / 2;
    placement = "left";
  } else if (targetRect.bottom + gap + cardRect.height <= window.innerHeight - edge) {
    left = targetRect.left + targetRect.width / 2 - cardRect.width / 2;
    top = targetRect.bottom + gap;
    placement = "bottom";
  } else {
    left = targetRect.left + targetRect.width / 2 - cardRect.width / 2;
    top = targetRect.top - gap - cardRect.height;
    placement = "top";
  }

  card.dataset.placement = placement;
  card.style.left = `${Math.max(edge, Math.min(left, window.innerWidth - cardRect.width - edge))}px`;
  card.style.top = `${Math.max(edge, Math.min(top, window.innerHeight - cardRect.height - edge))}px`;
  requestAnimationFrame(() => card.classList.add("ready"));
}

function renderTutorialStep() {
  const step = tutorialSteps[tutorialIndex];
  clearTutorialTarget();

  elements.tutorialStep.textContent = `STEP ${tutorialIndex + 1} / ${tutorialSteps.length}`;
  elements.tutorialIcon.textContent = step.icon;
  elements.tutorialTitle.textContent = step.title;
  elements.tutorialDescription.textContent = step.description;
  elements.tutorialTip.textContent = step.tip || "";
  elements.tutorialPrevious.disabled = tutorialIndex === 0;
  elements.tutorialNext.textContent = step.final ? "이제 해봅시다" : "다음";
  elements.tutorialSkip.hidden = Boolean(step.final);
  elements.tutorialProgress.replaceChildren(
    ...tutorialSteps.map((_, index) => {
      const dot = document.createElement("span");
      if (index === tutorialIndex) dot.classList.add("active");
      return dot;
    }),
  );

  if (step.target) {
    tutorialTarget = document.querySelector(step.target);
    if (tutorialTarget) {
      tutorialTarget.classList.add("tutorial-focus");
      tutorialTarget.style.scrollMarginTop = step.scrollBlock === "start" ? "88px" : "";
      tutorialTarget.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: step.scrollBlock || "center",
        inline: "center",
      });
    }
  }

  const positionDelay = tutorialTarget ? 360 : 0;
  window.setTimeout(() => placeTutorialCard(step), positionDelay);
  elements.tutorialNext.focus({ preventScroll: true });
}

function openTutorial() {
  tutorialReturnFocus = document.activeElement;
  if (running) setRunState(false, "튜토리얼 일시정지");
  tutorialIndex = 0;
  elements.tutorialLayer.hidden = false;
  elements.tutorialLayer.setAttribute("aria-hidden", "false");
  document.body.classList.add("tutorial-open");
  renderTutorialStep();
}

function closeTutorial() {
  clearTutorialTarget();
  rememberTutorialCompletion();
  elements.tutorialCard.classList.remove("ready");
  elements.tutorialLayer.hidden = true;
  elements.tutorialLayer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("tutorial-open");
  const focusTarget = tutorialReturnFocus === document.body
    ? elements.tutorialReplay
    : tutorialReturnFocus;
  focusTarget?.focus?.({ preventScroll: true });
}

function moveTutorial(direction) {
  const nextIndex = tutorialIndex + direction;
  if (nextIndex < 0) return;
  if (nextIndex >= tutorialSteps.length) {
    closeTutorial();
    return;
  }
  tutorialIndex = nextIndex;
  renderTutorialStep();
}

function prepareCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = simulation.config.width * pixelRatio;
  canvas.height = simulation.config.height * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function drawBackground() {
  const { width, height } = simulation.config;
  context.fillStyle = "#071c1b";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(111, 170, 156, 0.08)";
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += 40) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += 40) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.strokeStyle = "rgba(136, 204, 188, 0.16)";
  context.setLineDash([4, 6]);
  context.strokeRect(12.5, 12.5, width - 25, height - 25);
  context.setLineDash([]);
}

function drawFood(food) {
  context.save();
  context.translate(food.x, food.y);
  context.rotate(Math.PI / 4);
  context.fillStyle = "#62d28a";
  context.shadowColor = "rgba(83, 223, 143, 0.42)";
  context.shadowBlur = 6;
  context.fillRect(-2.5, -2.5, 5, 5);
  context.restore();
}

function drawAgent(agent) {
  const gene = agent.genotype.speedGene;
  const radius = 4.3;
  const tailLength = 5 + gene * 7;

  context.beginPath();
  context.moveTo(agent.x, agent.y);
  context.lineTo(
    agent.x - Math.cos(agent.heading) * tailLength,
    agent.y - Math.sin(agent.heading) * tailLength,
  );
  context.strokeStyle = `rgba(94, 154, 255, ${0.22 + gene * 0.4})`;
  context.lineWidth = 1.2;
  context.stroke();

  context.beginPath();
  context.arc(agent.x, agent.y, radius, 0, Math.PI * 2);
  context.fillStyle = `hsl(${218 - gene * 18} 82% ${53 + gene * 16}%)`;
  context.shadowColor = "rgba(71, 133, 255, 0.5)";
  context.shadowBlur = 7;
  context.fill();
  context.shadowBlur = 0;

  context.beginPath();
  context.arc(
    agent.x + Math.cos(agent.heading) * 2.4,
    agent.y + Math.sin(agent.heading) * 2.4,
    1,
    0,
    Math.PI * 2,
  );
  context.fillStyle = "rgba(235, 247, 255, 0.9)";
  context.fill();
}

function render() {
  drawBackground();
  for (const food of simulation.foods) drawFood(food);
  context.save();
  for (const agent of simulation.agents) drawAgent(agent);
  context.restore();
}

const chartStyles = {
  A: { color: "#2b6ff3", width: 2.4 },
  B: { color: "#de762c", width: 2.4 },
  current: { color: "#75837f", width: 1.8, dash: [6, 5] },
};

function resizeChartCanvas(canvas) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(280, Math.round(canvas.clientWidth || 640));
  const height = Math.max(180, Math.round(canvas.clientHeight || 220));
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const chartContext = canvas.getContext("2d");
  chartContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { chartContext, width, height };
}

function drawLineChart(canvas, series, options = {}) {
  const { chartContext: ctx, width, height } = resizeChartCanvas(canvas);
  const padding = { left: 46, right: 16, top: 15, bottom: 30 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfdfc";
  ctx.fillRect(0, 0, width, height);

  const points = series.flatMap((item) => item.points);
  if (points.length < 2) {
    ctx.fillStyle = "#83918d";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("기록을 시작하면 그래프가 표시됩니다.", width / 2, height / 2);
    return;
  }

  const rawMinY = Math.min(...points.map((point) => point.y));
  const rawMaxY = Math.max(...points.map((point) => point.y));
  const rawSpan = rawMaxY - rawMinY;
  const fallbackSpan = options.fallbackSpan ?? 1;
  const yPadding = Math.max(rawSpan * 0.12, fallbackSpan * 0.08);
  let minY = options.includeZero ? Math.min(0, rawMinY - yPadding) : rawMinY - yPadding;
  let maxY = rawMaxY + yPadding;
  if (options.clampMin !== undefined) minY = Math.max(options.clampMin, minY);
  if (options.clampMax !== undefined) maxY = Math.min(options.clampMax, maxY);
  if (maxY - minY < fallbackSpan * 0.1) {
    const center = (maxY + minY) / 2;
    minY = center - fallbackSpan * 0.05;
    maxY = center + fallbackSpan * 0.05;
  }
  if (options.clampMin !== undefined) minY = Math.max(options.clampMin, minY);
  if (options.clampMax !== undefined) maxY = Math.min(options.clampMax, maxY);

  const maxX = Math.max(1, ...points.map((point) => point.x));
  const xScale = (value) => padding.left + (value / maxX) * plotWidth;
  const yScale = (value) =>
    padding.top + plotHeight - ((value - minY) / (maxY - minY)) * plotHeight;

  ctx.lineWidth = 1;
  ctx.strokeStyle = "#e2eae8";
  ctx.fillStyle = "#7b8985";
  ctx.font = "10px ui-monospace, monospace";
  for (let index = 0; index <= 4; index += 1) {
    const ratio = index / 4;
    const y = padding.top + plotHeight * ratio;
    const value = maxY - (maxY - minY) * ratio;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(value.toFixed(options.decimals ?? 0), padding.left - 7, y + 3);
  }

  ctx.textAlign = "center";
  ctx.fillText("0", padding.left, height - 9);
  ctx.fillText(Math.round(maxX).toLocaleString("ko-KR"), width - padding.right, height - 9);
  ctx.textAlign = "left";
  ctx.fillText("경과 tick", padding.left + 5, height - 9);

  ctx.save();
  ctx.beginPath();
  ctx.rect(padding.left, padding.top, plotWidth, plotHeight);
  ctx.clip();

  for (const item of series) {
    if (item.points.length < 2) continue;
    ctx.beginPath();
    item.points.forEach((point, index) => {
      const x = xScale(point.x);
      const y = yScale(point.y);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.width || 2;
    ctx.setLineDash(item.dash || []);
    ctx.globalAlpha = item.alpha ?? 1;
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
}

function visibleExperimentRuns() {
  const runs = [];
  for (const slot of ["A", "B"]) {
    const run = savedExperimentRuns[slot];
    if (run) runs.push({ key: slot, run, ...chartStyles[slot] });
  }
  if (activeExperimentRun && (!activeExperimentSavedAs || recordingExperiment)) {
    runs.push({ key: "current", run: activeExperimentRun, ...chartStyles.current });
  }
  return runs;
}

function metricSeries(metric) {
  return visibleExperimentRuns().map((item) => ({
    ...item,
    points: item.run.samples.map((sample) => ({
      x: sample.tick - item.run.startedTick,
      y: sample[metric],
    })),
  }));
}

function vitalSeries() {
  return visibleExperimentRuns().flatMap((item) => {
    const first = item.run.samples[0];
    return [
      {
        ...item,
        points: item.run.samples.map((sample) => ({
          x: sample.tick - item.run.startedTick,
          y: sample.births - first.births,
        })),
      },
      {
        ...item,
        width: Math.max(1.5, item.width - 0.4),
        dash: item.key === "current" ? [2, 5] : [7, 5],
        alpha: 0.76,
        points: item.run.samples.map((sample) => ({
          x: sample.tick - item.run.startedTick,
          y: sample.deaths - first.deaths,
        })),
      },
    ];
  });
}

function renderExperimentCharts() {
  drawLineChart(elements.populationChart, metricSeries("population"), {
    includeZero: true,
    fallbackSpan: 10,
  });
  drawLineChart(elements.geneChart, metricSeries("meanSpeedGene"), {
    decimals: 3,
    fallbackSpan: 0.1,
    clampMin: 0,
    clampMax: 1,
  });
  drawLineChart(elements.vitalChart, vitalSeries(), {
    includeZero: true,
    fallbackSpan: 5,
  });
}

function renderExperimentSlot(slot) {
  const run = savedExperimentRuns[slot];
  const card = elements[`slot${slot}Card`];
  const meta = elements[`slot${slot}Meta`];
  const stats = elements[`slot${slot}Stats`];
  card.dataset.state = run ? "filled" : "empty";

  if (!run) {
    meta.textContent = "저장된 기록 없음";
    stats.textContent = slot === "A"
      ? "기록을 완료한 뒤 A에 저장하세요."
      : "조건을 바꾸어 B와 비교하세요.";
    return;
  }

  const end = run.samples.at(-1);
  const first = run.samples[0];
  const duration = end.tick - run.startedTick;
  meta.textContent = `먹이 ${run.foodSpawnRate.toFixed(2)} · ${duration.toLocaleString("ko-KR")} ticks`;
  stats.textContent = `Population ${end.population} · speedGene ${end.meanSpeedGene.toFixed(3)} · 출생/사망 ${end.births - first.births}/${end.deaths - first.deaths}`;
}

function setExperimentStatus(text, state = "idle") {
  elements.recordStatus.dataset.state = state;
  elements.recordStatusText.textContent = text;
}

function renderExperimentPanel() {
  const usable = isUsableExperimentRun(activeExperimentRun);
  elements.recordButton.dataset.recording = String(recordingExperiment);
  elements.recordButtonText.textContent = recordingExperiment ? "기록 완료" : "기록 시작";
  elements.recordButton.querySelector(".button-icon").textContent = recordingExperiment ? "■" : "●";
  elements.recordSampleCount.textContent = `표본 ${activeExperimentRun?.samples.length ?? 0}개`;
  elements.saveRunA.disabled = recordingExperiment || !usable;
  elements.saveRunB.disabled = recordingExperiment || !usable;
  elements.downloadCsv.disabled = !savedExperimentRuns.A && !savedExperimentRuns.B;
  elements.clearExperiments.disabled =
    !activeExperimentRun && !savedExperimentRuns.A && !savedExperimentRuns.B;
  renderExperimentSlot("A");
  renderExperimentSlot("B");
  elements.comparisonSummary.textContent = describeExperimentComparison(
    savedExperimentRuns.A,
    savedExperimentRuns.B,
  );
  renderExperimentCharts();
}

function startExperimentRecording() {
  activeExperimentRun = createExperimentRun(
    simulation.config.foodSpawnRate,
    simulation.stats,
  );
  activeExperimentSavedAs = null;
  recordingExperiment = true;
  elements.foodSpawnRate.disabled = true;
  setExperimentStatus(`먹이 ${simulation.config.foodSpawnRate.toFixed(2)} 기록 중`, "recording");
  renderExperimentPanel();
}

function stopExperimentRecording(label = "기록 완료 · 저장할 슬롯을 선택하세요") {
  if (!recordingExperiment || !activeExperimentRun) return;
  finalizeExperimentRun(activeExperimentRun, simulation.stats);
  recordingExperiment = false;
  elements.foodSpawnRate.disabled = false;
  setExperimentStatus(label, "ready");
  renderExperimentPanel();
}

function toggleExperimentRecording() {
  if (recordingExperiment) stopExperimentRecording();
  else startExperimentRecording();
}

function recordExperimentSample(force = false) {
  if (!recordingExperiment || !activeExperimentRun) return;
  if (addExperimentSample(activeExperimentRun, simulation.stats, force)) {
    elements.recordSampleCount.textContent = `표본 ${activeExperimentRun.samples.length}개`;
    renderExperimentCharts();
  }
}

function saveExperimentSlot(slot) {
  if (!isUsableExperimentRun(activeExperimentRun) || recordingExperiment) return;
  savedExperimentRuns[slot] = cloneExperimentRun(activeExperimentRun);
  activeExperimentSavedAs = slot;
  setExperimentStatus(`${slot} 실험 저장 완료`, "ready");
  renderExperimentPanel();
}

function clearExperimentRuns() {
  recordingExperiment = false;
  activeExperimentRun = null;
  activeExperimentSavedAs = null;
  savedExperimentRuns.A = null;
  savedExperimentRuns.B = null;
  elements.foodSpawnRate.disabled = false;
  setExperimentStatus("기록 대기", "idle");
  renderExperimentPanel();
}

function downloadExperimentCsv() {
  const csv = experimentRunsToCsv(savedExperimentRuns);
  if (!csv) return;
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ecoevo-experiments-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function updateStats() {
  const stats = simulation.stats;
  elements.tick.textContent = stats.tick.toLocaleString("ko-KR");
  elements.population.textContent = stats.population.toLocaleString("ko-KR");
  elements.meanGene.textContent = stats.meanSpeedGene.toFixed(3);
  elements.food.textContent = stats.currentFood.toLocaleString("ko-KR");
  elements.births.textContent = stats.births.toLocaleString("ko-KR");
  elements.deaths.textContent = stats.deaths.toLocaleString("ko-KR");
  elements.meanEnergy.textContent = stats.meanEnergy.toFixed(1);
  elements.meanSpeed.textContent = `${stats.meanMaxSpeed.toFixed(2)} px/tick`;
  elements.oldest.textContent = `${stats.oldestAgent.toLocaleString("ko-KR")} ticks`;
  elements.foodEaten.textContent = stats.totalFoodEaten.toLocaleString("ko-KR");
  recordExperimentSample();
}

function setRunState(nextRunning, label) {
  running = nextRunning;
  elements.runStatus.dataset.state = running ? "running" : label === "일시정지" ? "paused" : "ready";
  elements.runStatusText.textContent = running ? `${speedMultiplier}× 실행 중` : label;
  elements.toggleButtonText.textContent = running ? "일시정지" : "시뮬레이션 계속";
  elements.toggleButton.querySelector(".button-icon").textContent = running ? "Ⅱ" : "▶";
  elements.stepButton.disabled = running;
  elements.overlay.classList.add("hidden");
}

function toggleSimulation() {
  setRunState(!running, running ? "일시정지" : "실험 준비됨");
}

function resetSimulation() {
  if (recordingExperiment) {
    stopExperimentRecording("재설정 전 기록 보관됨 · A 또는 B에 저장하세요");
  }
  running = false;
  accumulator = 0;
  simulation.setFoodSpawnRate(elements.foodSpawnRate.value);
  simulation.reset();
  updateStats();
  render();
  elements.runStatus.dataset.state = "ready";
  elements.runStatusText.textContent = "실험 준비됨";
  elements.toggleButtonText.textContent = "시뮬레이션 시작";
  elements.toggleButton.querySelector(".button-icon").textContent = "▶";
  elements.stepButton.disabled = false;
  elements.overlay.classList.remove("hidden");
}

function animate(time) {
  const elapsed = Math.min(time - previousTime, 250);
  previousTime = time;

  if (running) {
    accumulator += elapsed * speedMultiplier;
    let steps = 0;
    while (accumulator >= TICK_DURATION_MS && steps < 240) {
      simulation.updateTick();
      accumulator -= TICK_DURATION_MS;
      steps += 1;
    }
    updateStats();
  }

  render();
  requestAnimationFrame(animate);
}

elements.toggleButton.addEventListener("click", toggleSimulation);
elements.overlayStartButton.addEventListener("click", () => setRunState(true, "실험 준비됨"));
elements.resetButton.addEventListener("click", resetSimulation);
elements.stepButton.addEventListener("click", () => {
  elements.overlay.classList.add("hidden");
  simulation.updateTick();
  updateStats();
  render();
  elements.runStatus.dataset.state = "paused";
  elements.runStatusText.textContent = "1 tick 실행됨";
  elements.toggleButtonText.textContent = "시뮬레이션 계속";
});
elements.foodSpawnRate.addEventListener("input", (event) => {
  const value = Number(event.target.value);
  elements.foodSpawnOutput.textContent = `${value.toFixed(2)} / tick`;
  simulation.setFoodSpawnRate(value);
});
elements.speedSelect.addEventListener("change", (event) => {
  speedMultiplier = Number(event.target.value);
  if (running) elements.runStatusText.textContent = `${speedMultiplier}× 실행 중`;
});
elements.recordButton.addEventListener("click", toggleExperimentRecording);
elements.saveRunA.addEventListener("click", () => saveExperimentSlot("A"));
elements.saveRunB.addEventListener("click", () => saveExperimentSlot("B"));
elements.downloadCsv.addEventListener("click", downloadExperimentCsv);
elements.clearExperiments.addEventListener("click", clearExperimentRuns);
elements.tutorialReplay.addEventListener("click", openTutorial);
elements.tutorialSkip.addEventListener("click", closeTutorial);
elements.tutorialPrevious.addEventListener("click", () => moveTutorial(-1));
elements.tutorialNext.addEventListener("click", () => moveTutorial(1));
elements.tutorialLayer.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeTutorial();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    moveTutorial(1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveTutorial(-1);
  } else if (event.key === "Tab") {
    const controls = [
      elements.tutorialSkip,
      elements.tutorialPrevious,
      elements.tutorialNext,
    ].filter((control) => !control.hidden && !control.disabled);
    const currentIndex = controls.indexOf(document.activeElement);
    const offset = event.shiftKey ? -1 : 1;
    const nextIndex = (currentIndex + offset + controls.length) % controls.length;
    event.preventDefault();
    controls[nextIndex].focus();
  }
});
window.addEventListener("resize", () => {
  if (!elements.tutorialLayer.hidden) placeTutorialCard(tutorialSteps[tutorialIndex]);
});
window.addEventListener("resize", prepareCanvas);
window.addEventListener("resize", renderExperimentCharts);

prepareCanvas();
updateStats();
render();
renderExperimentPanel();
requestAnimationFrame(animate);

if (!tutorialHasBeenSeen()) {
  window.setTimeout(openTutorial, 420);
}
