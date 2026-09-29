import { test } from "node:test";
import assert from "node:assert/strict";
import { BirdFlight } from "../src/environment/bird-flight.js";
test("V formation flies straight with its apex leading and fixed spacing", () => {
  const f = new BirdFlight();
  const start = f.formation.map(b => ({...b}));
  for (let i=0;i<300;i++) f.step(1/30);
  const dx=Math.cos(f.heading),dz=Math.sin(f.heading);
  f.formation.forEach((b,i) => {
    const displacement={x:b.x-start[i].x,z:b.z-start[i].z};
    assert.ok(Math.abs(displacement.x*dz-displacement.z*dx)<1e-9);
    assert.equal(b.a,start[i].a);
    if(i) assert.ok((f.formation[0].x-b.x)*dx+(f.formation[0].z-b.z)*dz>0);
  });
  f.passAge=29;f.placeFormation();
  assert.ok(f.formation.every(b=>Math.abs(b.x)>2.1||Math.abs(b.z)>1.6));
});
test("100 small birds remain a compact, smoothly turning flock", () => {
  const f=new BirdFlight();
  assert.equal(f.birds.length,100);
  for(let frame=0;frame<1800;frame++){
    const old=f.birds;
    f.step(1/30);
    f.birds.forEach((b,i)=>{
      assert.ok(Math.hypot(b.x-old[i].x,b.z-old[i].z)<.0061);
      assert.ok(Math.abs(b.a-old[i].a)<=.05001);
      assert.ok(Number.isFinite(b.x+b.z));
    });
  }
  const cx=f.birds.reduce((s,b)=>s+b.x,0)/100,cz=f.birds.reduce((s,b)=>s+b.z,0)/100;
  assert.ok(f.birds.every(b=>Math.hypot(b.x-cx,b.z-cz)<.65));
});
