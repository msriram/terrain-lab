import {test} from "node:test";
import assert from "node:assert/strict";
import {AnimalSimulation} from "../src/simulation/world.js";
import {SPECIES} from "../src/catalog/species.js";
import {rosterForWorld} from "../src/catalog/landscapes.js";
import {createSpeedboat} from "../src/rendering/speedboat.js";
import {helicopterHeading} from "../src/environment/cyber-city-layout.js";
test("helicopter cockpit points forward on outbound and return flights",()=>{
  for(const to of [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1},{x:1,z:2}]){
    const angle=helicopterHeading({x:0,z:0},to),distance=Math.hypot(to.x,to.z);
    assert.ok(Math.abs(-Math.sin(angle)-to.x/distance)<1e-9);
    assert.ok(Math.abs(-Math.cos(angle)-to.z/distance)<1e-9);
  }
});
test("Cyberpunk contains only police and thief vehicles",()=>{
  const roster=rosterForWorld("cyberpunk",[]);
  assert.ok(roster.every(id=>["police","thief"].includes(SPECIES[id].role)));
  assert.ok(roster.includes("policeBoat")&&roster.includes("thiefBoat"));
});
for(const [police,thief,height] of [["patrolDrone","thiefDrone",.1],["policeBoat","thiefBoat",.1]]){
  test(police+" pursues and arrests without feeding",()=>{
    const sim=new AnimalSimulation({sampleTerrain:()=>height,waterLevel:.43,roster:[police,thief]});
    const [a,b]=sim.creatures;
    Object.assign(a,{u:.5,v:.5,active:true,protection:0,cooldown:0});
    Object.assign(b,{u:.501,v:.501,active:true,protection:0});
    sim.update(.05);
    assert.equal(sim.events[0].type,"arrest");
    assert.equal(a.mode,"processing");assert.equal(b.mode,"detained");
    assert.equal(b.respawnAt,sim.time+5);
    if(police==="policeBoat"){
      sim.setTerrain(()=>.8);
      assert.equal(sim.valid(b,.5,.5),false);
    }
  });
}
test("speedboats have original hull geometry and police lightbars",()=>{
  const police=createSpeedboat(true),thief=createSpeedboat(false);
  assert.ok(police.scene.children.length>thief.scene.children.length);
  assert.equal(police.scene.children[0].geometry.type,"ExtrudeGeometry");
  police.dispose();thief.dispose();
});
