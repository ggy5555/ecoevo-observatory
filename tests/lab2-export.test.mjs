import test from "node:test";import assert from "node:assert/strict";
import {csvCell,exportRunsCsv,exportTimeseriesCsv,exportMetadata} from "../dist/lab2/js/experiments/export.js";
import {mean,sampleSD,percentile,aggregate} from "../dist/lab2/js/experiments/aggregation.js";
import {runExperiment} from "../dist/lab2/js/experiments/runner.js";
import {DEFAULT_PLAN} from "../dist/lab2/js/experiments/validation.js";
import {MODEL_VERSION} from "../dist/lab2/js/core/ecology-engine.js";
test("sample sd and percentiles distinguish sparse values",()=>{
  assert.equal(mean([]),null);assert.equal(sampleSD([3]),null);assert.equal(sampleSD([1,3]),Math.SQRT2);
  assert.equal(percentile([0,10],50),5);
});
test("CSV user text is properly quoted and spreadsheet injection neutralized",()=>{
  assert.equal(csvCell('ab,"cd"'),'"ab,""cd"""');
  assert.equal(csvCell("=HYPERLINK(1)"),"'=HYPERLINK(1)");
  assert.equal(csvCell("+10"),"'+10");
});
test("CSV / JSON derive from same genuine runs and include seeds & version",async()=>{
  const result=await runExperiment({...DEFAULT_PLAN,conditions:[0,.15],replicates:1,ticks:500,experimentId:"csv-test"},{yieldEvery:1000});
  const csv=exportRunsCsv(result),times=exportTimeseriesCsv(result),meta=JSON.parse(exportMetadata(result));
  assert.match(csv,/experiment_id,model_version/);assert.match(times,/tick,population,mean_speed_gene/);
  assert.ok(csv.includes(MODEL_VERSION));
  assert.equal(meta.replicateSeeds[0],result.runs[0].summary.seed);
  assert.equal(meta.completedRuns,2);assert.equal(meta.controlledParameters.initialPrey,30);
  const agg=aggregate(result);assert.equal(agg.groups.length,2);assert.equal(agg.paired.length,1);
});
