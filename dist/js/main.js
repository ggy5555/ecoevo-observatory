import { Simulation } from "./simulation.js";

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
};

const TICK_DURATION_MS = 50;
let running = false;
let speedMultiplier = 1;
let accumulator = 0;
let previousTime = performance.now();

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
window.addEventListener("resize", prepareCanvas);

prepareCanvas();
updateStats();
render();
requestAnimationFrame(animate);
