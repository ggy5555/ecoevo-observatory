import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import {spawn} from "node:child_process";
import {chromium} from "playwright";

const BASE="http://127.0.0.1:8765";
const server=spawn("python3",["-m","http.server","8765","--bind","127.0.0.1","--directory","dist"],{stdio:"ignore"});
let browser;
const checkLayout=async(page,name)=>{
  const result=await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    viewport:window.innerWidth,
    bodyScrollWidth:document.body.scrollWidth
  }));
  assert.ok(result.scrollWidth<=result.viewport+2,name+" horizontal page overflow "+JSON.stringify(result));
};
const screenshot=async(page,name)=>{
  await page.screenshot({path:"artifacts/"+name+".png",fullPage:true,animations:"disabled"});
};
const runtimeErrors=[];
try{
  let ready=false;
  for(let i=0;i<40;i++){
    try{const response=await fetch(BASE+"/lab2/");if(response.ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  assert.ok(ready,"Local static server did not start");
  mkdirSync("artifacts",{recursive:true});
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
  page.on("pageerror",e=>runtimeErrors.push("legacy/desktop: "+e.message));
  await page.goto(BASE+"/",{waitUntil:"networkidle"});
  await page.waitForTimeout(650);
  const skip=page.locator("#tutorialSkip");
  if(await skip.isVisible())await skip.click();
  await page.locator("#ecosystemCanvas").waitFor({state:"visible"});
  assert.equal(await page.locator("#statTick").innerText(),"0");
  await checkLayout(page,"legacy desktop");
  await screenshot(page,"observatory-desktop");
  await page.locator("#toggleButton").click();
  await page.waitForFunction(()=>Number(document.querySelector("#statTick").textContent.replaceAll(",",""))>=3,{timeout:12000});
  await page.locator("#toggleButton").click();
  const tick=Number((await page.locator("#statTick").innerText()).replaceAll(",",""));
  await page.locator("#stepButton").click();
  const next=Number((await page.locator("#statTick").innerText()).replaceAll(",",""));
  assert.equal(next,tick+1,"Legacy single tick should advance exactly one simulation tick");
  await page.locator("#recordButton").click();
  await page.locator("#stepButton").click();
  await page.locator("#recordButton").click();
  await page.locator("#saveRunA").click();
  assert.equal(await page.locator("#slotACard").getAttribute("data-state"),"filled");
  await page.locator("#foodSpawnRate").evaluate(input=>{
    input.value="0.35";input.dispatchEvent(new Event("input",{bubbles:true}));
  });
  await page.locator("#recordButton").click();
  await page.locator("#stepButton").click();
  await page.locator("#recordButton").click();
  await page.locator("#saveRunB").click();
  assert.equal(await page.locator("#slotBCard").getAttribute("data-state"),"filled");
  const legacyCsv=page.waitForEvent("download");
  await page.locator("#downloadCsv").click();
  assert.match((await legacyCsv).suggestedFilename(),/ecoevo-experiments-.*\.csv$/);
  console.log("Legacy A/B recording + CSV OK");
  console.log("Legacy play/pause/step:",tick,next);
  await page.goto(BASE+"/lab2/",{waitUntil:"networkidle"});
  await page.locator('a[href="./experiment.html?mode=predation"]').waitFor();
  assert.match(await page.locator("main").innerText(),/PLANNED · P2/);
  await page.goto(BASE+"/lab2/observe.html",{waitUntil:"networkidle"});
  await page.locator("#observeCanvas").waitFor({state:"visible"});
  await page.locator("#observeMode").selectOption("predation");
  assert.match(await page.locator("#observeAppliedState").innerText(),/Reset/);
  await page.locator("#observeReset").click();
  assert.match(await page.locator("#observeAppliedState").innerText(),/적용 중/);
  await screenshot(page,"lab2-observation-desktop");
  await page.locator("#observeToggle").click();
  await page.waitForFunction(()=>Number(document.querySelector("#obsTick").textContent.replaceAll(",",""))>=2,{timeout:12000});
  await page.locator("#observeToggle").click();
  await page.locator("#observeStep").click();
  console.log("LAB Observation play/pause/step OK");
  await page.goto(BASE+"/lab2/experiment.html?mode=resource",{waitUntil:"networkidle"});
  await page.locator("#conditions").fill("0.15, 0.25");
  await page.locator("#replicates").fill("1");
  await page.locator("#ticks").fill("500");
  await page.locator("#sampleInterval").fill("50");
  assert.equal(await page.locator("#startExperiment").isEnabled(),true);
  await page.locator("#startExperiment").click();
  await page.locator("#resultSection").waitFor({state:"visible",timeout:60000});
  assert.ok(await page.locator("#summaryTable tbody tr").count()>=2,"Two conditions should produce at least two summary rows");
  assert.equal(await page.locator("#progressValue").innerText(),"100%");
  await screenshot(page,"lab2-results-desktop");
  const dl=page.waitForEvent("download");
  await page.locator("#downloadSummary").click();
  assert.match((await dl).suggestedFilename(),/summary\.csv$/);
  for(const [button,filename] of [["#downloadSeries",/timeseries\.csv$/],["#downloadJson",/experiment_metadata\.json$/]]){
    const event=page.waitForEvent("download");await page.locator(button).click();
    assert.match((await event).suggestedFilename(),filename);
  }
  await page.locator("#populationChart").hover({position:{x:110,y:80}});
  assert.equal(await page.locator(".chart-data-tooltip").first().isVisible(),true,"Hover should show a data tooltip");
  await page.locator("#saveHistory").click();
  await page.waitForFunction(()=>document.querySelector("#historySelect").options.length>=1 && !document.querySelector("#loadHistory").disabled);
  await page.locator("#loadHistory").click();
  assert.match(await page.locator("#historyStatus").innerText(),/실험 결과를 열었습니다/);
  console.log("LAB Worker + Results + chart tooltip + CSV/JSON + IndexedDB save/load OK");
  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  mobile.on("pageerror",e=>runtimeErrors.push("mobile: "+e.message));
  await mobile.goto(BASE+"/lab2/observe.html",{waitUntil:"networkidle"});
  await checkLayout(mobile,"LAB Observation mobile");
  const dims=await mobile.locator("#observeCanvas").boundingBox();
  assert.ok(dims.width<=390,"Mobile LAB Canvas should fit viewport");
  await screenshot(mobile,"lab2-observation-mobile");
  await mobile.goto(BASE+"/",{waitUntil:"networkidle"});
  await mobile.waitForTimeout(650);
  const skipMobile=mobile.locator("#tutorialSkip");if(await skipMobile.isVisible())await skipMobile.click();
  await checkLayout(mobile,"Legacy mobile");
  await screenshot(mobile,"observatory-mobile");
  for(const width of [320,768]){
    await mobile.setViewportSize({width,height:844});
    await mobile.goto(BASE+"/lab2/observe.html",{waitUntil:"networkidle"});
    await checkLayout(mobile,"LAB Observation "+width+"px");
    await mobile.goto(BASE+"/",{waitUntil:"networkidle"});
    await mobile.waitForTimeout(650);
    const skipExtra=mobile.locator("#tutorialSkip");if(await skipExtra.isVisible())await skipExtra.click();
    await checkLayout(mobile,"Legacy "+width+"px");
  }
  console.log("Mobile/tablet viewport widths 320, 390, 768px: no horizontal overflow");
  assert.deepEqual(runtimeErrors,[],"Browser page errors");
  console.log("PASS: complete interactive UI browser smoke");
}catch(error){
  console.error("FAIL UI BROWSER SMOKE:",error);
  throw error;
}finally{
  if(browser)await browser.close();
  server.kill("SIGTERM");
}
