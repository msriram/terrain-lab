import {test} from "node:test";
import assert from "node:assert/strict";
import {planCyberCity,cityLinks,cablePoint} from "../src/environment/cyber-city-layout.js";
test("sand height controls city storeys, not the waterline",()=>{
  const low=planCyberCity(()=>.2,.43),high=planCyberCity(()=>.9,.43);
  assert.ok(low.blocks.every(b=>b.floors===0));
  assert.ok(high.blocks.every(b=>b.floors>=7));
  assert.deepEqual(planCyberCity(()=>.2,.9),low);
  assert.equal(planCyberCity(()=>NaN,.43).blocks.length,0);
});
test("zip lines connect elevated roofs and sag between anchored ends",()=>{
  const links=cityLinks(planCyberCity(()=>.8,.43).blocks);
  assert.ok(links.length>0&&links.length<=30);
  for(const l of links){
    const a=cablePoint(l,0),b=cablePoint(l,1),mid=cablePoint(l,.5);
    assert.ok(Math.abs(a.y-l.a.roof-.065)<1e-9);
    assert.ok(mid.y<(a.y+b.y)/2);
    assert.ok(l.a.floors>=4&&l.b.floors>=4);
  }
});
test("city districts have stable irregular footprints, lots and open space",()=>{
  const a=planCyberCity(()=>.8,.43,31),b=planCyberCity(()=>.8,.43,31);
  assert.deepEqual(a,b);
  assert.notDeepEqual(a,planCyberCity(()=>.8,.43,32));
  assert.ok(a.blocks.some(b=>!b.tower));
  assert.ok(a.blocks.filter(b=>b.tower).length>20);
  assert.ok(new Set(a.blocks.map(b=>b.width.toFixed(3))).size>20);
  assert.ok(a.roads.some(r=>r.u0!==r.u1&&r.v0!==r.v1));
  assert.ok(a.blocks.every(b=>b.width<.16));
});
