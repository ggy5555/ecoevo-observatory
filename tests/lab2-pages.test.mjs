import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../dist/"+p,import.meta.url),"utf8");
test("legacy page remains intact, with only LAB 2.0 access added",()=>{
  const html=read("index.html");
  for(const id of ["ecosystemCanvas","tutorialLayer","populationChart","saveRunA","saveRunB","recordButton"])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/href="\.\/lab2\/"/);
});
test("subdirectory routes, semantic links and accessible placeholder states exist",()=>{
  const home=read("lab2/index.html"),ex=read("lab2/experiment.html"),methods=read("lab2/methods.html");
  for(const html of [home,ex,methods]) assert.match(html,/href="\.\.\/"/);
  assert.match(home,/href="\.\/experiment\.html\?mode=resource"/);
  assert.match(home,/Coming later/);
  assert.match(ex,/id="downloadSummary"/);
  assert.match(ex,/id="cancelExperiment"/);
  assert.match(methods,/실제 이동/);
});
