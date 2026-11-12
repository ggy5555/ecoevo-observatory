import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("both applications share scientific design tokens without changing their scripts", () => {
  const tokens = read("dist/css/design-tokens.css");
  assert.match(tokens, /--eco-brand:/);
  assert.match(tokens, /--eco-condition-4:/);
  assert.match(read("dist/css/style.css"), /@import url\("\.\/design-tokens\.css"\)/);
  assert.match(read("dist/lab2/css/lab2.css"), /@import url\("\.\.\/\.\.\/css\/design-tokens\.css"\)/);
  assert.match(read("dist/index.html"), /src="\.\/js\/main\.js"/);
  assert.match(read("dist/lab2/observe.html"), /src="\.\/js\/pages\/observe-page\.js"/);
});

test("distinct condition application semantics are explained", () => {
  assert.match(read("dist/index.html"), /즉시 적용/);
  assert.match(read("dist/lab2/observe.html"), /observeApplyStatus/);
  assert.match(read("dist/lab2/js/pages/observe-page.js"), /Reset 후 적용/);
});

test("experiment builder and drift placeholder retain real states", () => {
  assert.match(read("dist/lab2/experiment.html"), /id="startExperiment"/);
  assert.match(read("dist/lab2/experiment.html"), /id="cancelExperiment"/);
  assert.match(read("dist/lab2/index.html"), /AVAILABLE · P1/);
  assert.match(read("dist/lab2/drift.html"), /PLANNED · P2/);
});

test("results chart labels distinguish resource and predator conditions", () => {
  const charts = read("dist/lab2/js/ui/charts.js");
  assert.match(charts, /g\.experimentType==="predation"/);
  assert.match(charts, /Predators /);
  assert.match(charts, /Food p /);
  assert.match(charts, /const colWidth=Math\.max/);
});
