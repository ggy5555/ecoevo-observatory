import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const protectedBlobs={
  "dist/js/agent.js": "17abc46dbb63f95c916e3d7c09119cef60d50c37",
  "dist/js/experiment.js": "7bfd516f79590b09b09861f6ba742b767a51965f",
  "dist/js/food.js": "e882eb41824e62130f2ebfa8d0d65010ab86dfc1",
  "dist/js/genetics.js": "5c01f83de914813fca8f03a4bea1168d9a83336e",
  "dist/js/simulation.js": "a9289706766fb342e5b07c8d5e39e8e2baf8d483",
  "dist/js/statistics.js": "37785a9529ac2dce06916a3e75ed41efd8ecf61a",
  "dist/js/utils.js": "872eb8795189c7e5bd002f43c85ebf644ab361fa",
  "dist/lab2/js/core/ecology-engine.js": "a9b86d20729643121d97b45547389a02699a1904",
  "dist/lab2/js/core/rng.js": "48af487a1c47315d1e900012262f198cbdc5121f",
  "dist/lab2/js/experiments/aggregation.js": "165920b61d77d806b91d3e03894eeaa2af71641f",
  "dist/lab2/js/experiments/export.js": "17bc9fbb406c7b8220108f80f329442956141f6e",
  "dist/lab2/js/experiments/runner.js": "9aedfdaa1dee1454602280592a4649858eb33980",
  "dist/lab2/js/experiments/validation.js": "abce393107556b644b382101455f098081df503b",
  "dist/lab2/js/ui/storage.js": "788b73c6d4a853ae68feb049c9c540467062b738",
  "dist/lab2/js/workers/experiment.worker.js": "c51cb184ba0cb52a1515bb4059596e7e5cba9d17"
};
test("scientific computation, random streams, worker and persistence are byte-for-byte unchanged",()=>{
  for(const [path,sha] of Object.entries(protectedBlobs)){
    const bytes=Buffer.from(read(path),"utf8");
    const actual=createHash("sha1").update("blob "+bytes.length+"\\0").update(bytes).digest("hex");
    assert.equal(actual,sha,path+" differs from the pre-redesign main branch");
  }
});
test("both products use shared scientific tokens and maintain the original routes",()=>{
  const legacy=read("dist/index.html");
  assert.match(legacy,/href="\.\/css\/design-tokens\.css"/);
  assert.match(legacy,/href="\.\/css\/observatory-refresh\.css"/);
  assert.match(legacy,/href="\.\/lab2\/"/);
  for(const page of ["index","experiment","observe","methods","drift"]){
    const html=read("dist/lab2/"+page+".html");
    assert.match(html,/href="\.\.\/css\/design-tokens\.css"/,page);
    assert.match(html,/href="\.\/css\/lab2-refresh\.css"/,page);
    assert.match(html,/href="\.\.\/"/,page);
  }
  assert.match(read("dist/lab2/index.html"),/PLANNED · P2/);
});
test("UI enhancement preserves the essential data and input contracts",()=>{
  const experiment=read("dist/lab2/experiment.html");
  const observe=read("dist/lab2/observe.html");
  for(const id of ["experimentType","conditions","replicates","ticks","sampleInterval","baseSeed","startExperiment","cancelExperiment","summaryTable","pairedTable","runsTable","historySelect","downloadJson"]){
    assert.match(experiment,new RegExp('id="'+id+'"'),id);
  }
  for(const id of ["observeCanvas","observeToggle","observeStep","observeReset","obsInspector","observeAppliedState"]){
    assert.match(observe,new RegExp('id="'+id+'"'),id);
  }
  assert.match(read("dist/lab2/js/ui/charts.js"),/attachChartTooltip/);
  assert.match(read("dist/lab2/js/ui/charts.js"),/Predators /);
});
test("modified browser JavaScript still parses",()=>{
  for(const file of ["dist/js/main.js","dist/lab2/js/pages/observe-page.js","dist/lab2/js/pages/experiment-page.js","dist/lab2/js/ui/charts.js"]){
    const result=spawnSync(process.execPath,["--check",new URL("../"+file,import.meta.url).pathname],{encoding:"utf8"});
    assert.equal(result.status,0,file+" "+result.stderr);
  }
});
