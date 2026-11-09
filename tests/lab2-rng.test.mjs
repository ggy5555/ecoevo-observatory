import test from "node:test";import assert from "node:assert/strict";
import {normalizeSeed,deriveSeed,mulberry32,createStreams} from "../dist/lab2/js/core/rng.js";
test("32-bit seeds including zero are accepted; malformed input rejected",()=>{
  assert.equal(normalizeSeed(0),0);assert.equal(normalizeSeed("4294967295"),4294967295);
  for(const invalid of ["", "hello", -1, 1.5,4294967296])assert.throws(()=>normalizeSeed(invalid));
});
test("derived streams are deterministic and independent",()=>{
  const s1=createStreams(55),s2=createStreams(55);
  assert.equal(s1.initialPrey(),s2.initialPrey());assert.equal(s1.foodSpawn(),s2.foodSpawn());
  assert.notEqual(deriveSeed(123,"prey"),deriveSeed(123,"food"));
  assert.deepEqual(Array.from({length:10},mulberry32(0)),Array.from({length:10},mulberry32(0)));
});
