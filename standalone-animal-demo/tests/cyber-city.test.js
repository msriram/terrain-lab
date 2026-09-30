import {test} from "node:test";
import assert from "node:assert/strict";
import {planCyberCity,cityLinks,cablePoint} from "../src/environment/cyber-city-layout.js";
test("dug-out sand floods the city and leaves no floating buildings or roads",()=>{
  const low=planCyberCity(()=>.2,.43),high=planCyberCity(()=>.9,.43);
  assert.ok(low.blocks.every(b=>b.floors===0));
  assert.ok(high.blocks.every(b=>b.floors>=7));
  assert.equal(low.roads.length,0);
  assert.ok(low.blocks.every(b=>!b.tower));
  assert.ok(planCyberCity(()=>.6,.4).roads.length>0);
  assert.equal(planCyberCity(()=>.6,.8).roads.length,0);
  assert.equal(planCyberCity(()=>NaN,.43).blocks.length,0);
});
test("curving roads bridge channels and revert when channels are filled",()=>{
  const channel=(u)=>u>.46&&u<.54?.2:.65;
  const city=planCyberCity(channel,.43);
  assert.ok(city.roads.some(r=>r.bridge));
  for(const r of city.roads) {
    assert.ok(channel(r.u0)>.43&&channel(r.u1)>.43);
    assert.equal(r.bridge,r.points.some(p=>p.wet));
  }
  assert.ok(planCyberCity(()=>.65,.43).roads.every(r=>!r.bridge));
  assert.ok(city.roads.some(r=>{
    const p=r.points[12];
    return Math.abs((p.u-r.u0)*(r.v1-r.v0)-(p.v-r.v0)*(r.u1-r.u0))>.00001;
  }));
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
test("occupied buildings have dry access paths joining the road network",()=>{
  const sample=(u,v)=>u>.46&&u<.54?.2:.72;
  const city=planCyberCity(sample,.43);
  const towers=city.blocks.filter(b=>b.tower);
  assert.ok(towers.length>10);
  for(const b of towers){
    assert.ok(b.access);
    assert.ok(city.roads.some(r=>r.points.some(p=>p.u===b.access.end.u&&p.v===b.access.end.v)));
    for(let i=0;i<=12;i++){
      const t=i/12,a=b.access.start,c=b.access.end;
      assert.ok(sample(a.u+(c.u-a.u)*t,a.v+(c.v-a.v)*t)>.43);
    }
  }
});

test("Cyberpunk rain is irregular, repeatable, and falls at varied speeds", async () => {
  const { RAIN_STREAKS, rainDrop } = await import(
    "../src/environment/cyber-rain.js"
  );
  const drops = Array.from({ length: RAIN_STREAKS }, (_, i) => rainDrop(i, 0));
  const a=rainDrop(0,0), b=rainDrop(0,.1), c=rainDrop(0,.2);
  assert.ok(Math.abs((c.z-b.z)-(b.z-a.z))<1e-9);
  assert.ok(
    drops.every((d) => d.x >= -2 && d.x < 2 && d.z >= -1.5 && d.z < 1.5),
  );
  assert.ok(
    new Set(
      drops.map(
        (d) => `${Math.floor((d.x + 2) * 5)}:${Math.floor((d.z + 1.5) * 5)}`,
      ),
    ).size > 270,
  );
  assert.ok(
    Math.max(...drops.map((d) => d.speed)) -
      Math.min(...drops.map((d) => d.speed)) >
      0.6,
  );
  assert.ok(new Set(drops.map((d) => d.length.toFixed(3))).size > 35);
  const moving = Array.from({ length: 200 }, (_, i) => [
    rainDrop(i, 0),
    rainDrop(i, 0.1),
  ]).filter(([a, b]) => b.z > a.z);
  assert.ok(moving.length > 190);
  assert.ok(moving.every(([a, b]) => b.z - a.z > 0));
});
