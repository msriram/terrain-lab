import * as T from "three";
import { planCopperWorks, planEmeraldCity } from "./world-architecture-layout.js";

const TAU = Math.PI * 2;
const position = p => new T.Vector3((p.u - .5) * 4, 0, (p.v - .5) * 3);

/** Two authored architectures, rebuilt from the same live terrain as wildlife. */
export function createWorldArchitecture(root) {
  const copper = new T.Group(), emerald = new T.Group();
  copper.name = "Copper clockwork waterworks";
  emerald.name = "Emerald garden citadels";
  root.add(copper, emerald);
  const resources = [], transient = [];
  const geometry = g => (resources.push(g), g);
  const material = m => (resources.push(m), m);
  const disc = geometry(new T.CylinderGeometry(1, 1, 1, 12));
  const octagon = geometry(new T.CylinderGeometry(1, 1, 1, 8));
  const prism = geometry(new T.CylinderGeometry(0, 1, 1, 7));
  const cylinder = geometry(new T.CylinderGeometry(1, 1, 1, 10));
  const block = geometry(new T.BoxGeometry(1, 1, 1));
  const orb = geometry(new T.IcosahedronGeometry(1, 1));
  const copperDark = material(new T.MeshStandardMaterial({color:0x344747,metalness:.72,roughness:.44}));
  const copperMetal = material(new T.MeshStandardMaterial({color:0xbf723e,metalness:.86,roughness:.3}));
  const brass = material(new T.MeshStandardMaterial({color:0xf0bf6b,metalness:.85,roughness:.26,emissive:0x593817,emissiveIntensity:.18}));
  const patina = material(new T.MeshStandardMaterial({color:0x5fa898,metalness:.54,roughness:.52}));
  const steam = material(new T.MeshBasicMaterial({color:0xcdeee2,transparent:true,opacity:.26,depthWrite:false}));
  const jadeDark = material(new T.MeshStandardMaterial({color:0x164c48,metalness:.18,roughness:.62}));
  const jade = material(new T.MeshStandardMaterial({color:0x42b881,metalness:.22,roughness:.3,emissive:0x0d3e2d,emissiveIntensity:.32}));
  const emeraldGlass = material(new T.MeshStandardMaterial({color:0x8cefc3,metalness:.25,roughness:.16,transparent:true,opacity:.82,emissive:0x2b8064,emissiveIntensity:.38,depthWrite:false}));
  const paleGold = material(new T.MeshStandardMaterial({color:0xf6d58c,metalness:.7,roughness:.28,emissive:0x66532c,emissiveIntensity:.18}));
  const leaf = material(new T.MeshStandardMaterial({color:0x2d815a,roughness:.83}));
  const mote = material(new T.MeshBasicMaterial({color:0xd6ffd1,transparent:true,opacity:.88,depthWrite:false}));
  const surfaceCanvas=document.createElement("canvas");surfaceCanvas.width=512;surfaceCanvas.height=384;
  const surfaceTexture=new T.CanvasTexture(surfaceCanvas);surfaceTexture.colorSpace=T.SRGBColorSpace;
  surfaceTexture.minFilter=T.LinearFilter;surfaceTexture.magFilter=T.LinearFilter;resources.push(surfaceTexture);
  const surfaceMaterial=material(new T.MeshBasicMaterial({map:surfaceTexture,transparent:true,depthWrite:false}));
  const surfaceGeometry=geometry(new T.PlaneGeometry(4,3));surfaceGeometry.rotateX(-Math.PI/2);
  const surface=new T.Mesh(surfaceGeometry,surfaceMaterial);surface.position.y=.003;surface.renderOrder=1;root.add(surface);
  const copperGears = [], pistons = [], puffs = [], emeraldMotes = [], emeraldCrowns = [];
  let copperPlan = {stations:[],pipes:[],wheels:[]}, emeraldPlan = {citadels:[],skyways:[],groves:[]};
  function paintSurface(theme,sample,water,plan){
    const ctx=surfaceCanvas.getContext("2d"),w=surfaceCanvas.width,h=surfaceCanvas.height;
    const image=ctx.createImageData(w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const u=x/w,v=y/h,e=sample(u,v),i=(y*w+x)*4;
      if(!Number.isFinite(e)||e<0)continue;
      const wet=e<water,t=Math.max(0,Math.min(1,(e-water)/.5));
      if(theme==="copper"){
        const plate=(Math.sin(u*94)*Math.sin(v*73)+1)*.5;
        image.data.set(wet?[10,60,63,128]:[Math.round(42+t*70+plate*8),Math.round(49+t*31+plate*5),Math.round(46+t*13),176],i);
      }else{
        const terrace=(Math.sin(e*70)+1)*.5;
        image.data.set(wet?[5,51,49,132]:[Math.round(10+t*18+terrace*4),Math.round(70+t*56+terrace*12),Math.round(48+t*36+terrace*5),158],i);
      }
    }
    ctx.putImageData(image,0,0);
    if(theme==="copper"){
      ctx.strokeStyle="rgba(233,177,99,.24)";ctx.lineWidth=.8;
      for(let x=0;x<w;x+=22)for(let y=0;y<h;y+=22){
        const u=x/w,v=y/h,e=sample(u,v);
        if(!Number.isFinite(e)||e<=water+.02)continue;
        ctx.strokeRect(x+1,y+1,20,20);
      }
      ctx.fillStyle="rgba(232,188,118,.35)";
      for(let x=0;x<w;x+=22)for(let y=0;y<h;y+=22){
        if(sample(x/w,y/h)<=water+.02)continue;
        ctx.beginPath();ctx.arc(x+3,y+3,1,0,TAU);ctx.fill();
      }
    }else{
      ctx.strokeStyle="rgba(197,239,152,.22)";ctx.lineWidth=1.3;
      for(const site of plan.citadels){
        const x=site.u*w,y=site.v*h,r=site.radius*w/4;
        for(let k=1;k<=3;k++){
          ctx.beginPath();ctx.ellipse(x,y,r*(1+k*.65),r*(1+k*.65),site.phase,0,TAU);ctx.stroke();
        }
      }
      ctx.fillStyle="rgba(205,251,164,.18)";
      for(let i=0;i<540;i++){
        const u=(i*.618033+Math.sin(i*3)*.035+1)%1,v=(i*.414214+Math.sin(i*11)*.03+1)%1;
        if(sample(u,v)<=water+.02)continue;
        ctx.beginPath();ctx.ellipse(u*w,v*h,3,1.1,i*.41,0,TAU);ctx.fill();
      }
    }
    surfaceTexture.needsUpdate=true;
  }
  function part(group, geo, mat, x, y, z, sx, sy, sz) {
    const mesh = new T.Mesh(geo, mat);
    mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); group.add(mesh);
    return mesh;
  }
  function ring(group, radius, tube, mat, y=0) {
    const geo = new T.TorusGeometry(radius,tube,6,32); transient.push(geo);
    const mesh = new T.Mesh(geo,mat);
    mesh.rotation.x = Math.PI/2; mesh.position.y = y; group.add(mesh);
    return mesh;
  }
  function beam(group, a, b, radius, mat, ownGeometry=false) {
    const direction = b.clone().sub(a);
    const geo = new T.CylinderGeometry(radius,radius,direction.length(),7);
    (ownGeometry ? transient : resources).push(geo);
    const mesh = new T.Mesh(geo,mat);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
    group.add(mesh); return mesh;
  }
  function clear() {
    copper.clear(); emerald.clear();
    transient.forEach(g=>g.dispose()); transient.length=0;
    copperGears.length=pistons.length=puffs.length=emeraldMotes.length=emeraldCrowns.length=0;
  }
  function buildCopper(plan) {
    plan.stations.forEach((site,i) => {
      const at = position(site), r = site.radius * (i%3===0?1.25:1), h=site.height;
      const station = new T.Group(); station.position.copy(at); copper.add(station);
      part(station,disc,copperDark,0,.015,0,r*1.53,.035,r*1.53);
      part(station,disc,patina,0,.04,0,r*1.32,.015,r*1.32);
      ring(station,r*.72,.008,brass,.055);
      for(let j=0;j<12;j++){
        const angle=j*TAU/12;
        const tooth=part(station,block,copperMetal,Math.cos(angle)*r*.77,.056,Math.sin(angle)*r*.77,r*.22,.025,r*.12);
        tooth.rotation.y=-angle;
      }
      const gear = new T.Group(); gear.position.y=.07; station.add(gear);
      ring(gear,r*.51,.013,copperMetal);
      ring(gear,r*.24,.006,brass,.004);
      for(let j=0;j<8;j++){
        const angle=j*TAU/8;
        const spoke=part(gear,block,brass,Math.cos(angle)*r*.36,.006,Math.sin(angle)*r*.36,r*.31,.012,r*.045);
        spoke.rotation.y=-angle;
      }
      part(gear,cylinder,copperDark,0,.014,0,r*.17,.04,r*.17);
      copperGears.push({gear,phase:site.phase,direction:i%2?-1:1});
      const tower=part(station,cylinder,copperMetal,r*1.02,h*.5+.035,0,r*.21,h,r*.21);
      part(station,cylinder,brass,r*1.02,h+.04,0,r*.26,.024,r*.26);
      const piston=part(station,cylinder,brass,r*1.02,h+.09,0,r*.06,.12,r*.06);
      pistons.push({mesh:piston,base:h+.09,phase:site.phase});
      const puff=part(station,orb,steam,r*1.02,h+.17,0,r*.24,.08,r*.24);
      puffs.push({mesh:puff,base:h+.17,phase:site.phase});
      if(plan.wheels.includes(site.id)) {
        const wheel = new T.Group(); wheel.position.set(-r*1.02,.07,0); station.add(wheel);
        ring(wheel,r*.38,.009,patina);
        part(wheel,cylinder,brass,0,.005,0,r*.08,.02,r*.08);
        copperGears.push({gear:wheel,phase:site.phase,direction:-1});
      }
    });
    plan.pipes.forEach(({i,j,bridge},index) => {
      const a=position(plan.stations[i]),b=position(plan.stations[j]);
      a.y=b.y=bridge?.15:.055;
      beam(copper,a,b,.014,copperDark,true);
      a.y=b.y=bridge?.17:.074;
      beam(copper,a,b,.005,index%2?patina:brass,true);
      for(let t=.2;t<1;t+=.2){
        const p=a.clone().lerp(b,t);
        part(copper,orb,brass,p.x,bridge?.173:.077,p.z,.012,.012,.012);
      }
      if(bridge){const m=a.clone().lerp(b,.5);part(copper,cylinder,patina,m.x,.085,m.z,.012,.17,.012);}
    });
  }
  function buildEmerald(plan) {
    plan.citadels.forEach((site,i) => {
      const at=position(site),r=site.radius,h=site.height;
      const city=new T.Group();city.position.copy(at);emerald.add(city);
      part(city,octagon,jadeDark,0,.02,0,r*1.8,.04,r*1.8);
      part(city,octagon,jade,0,.052,0,r*1.47,.018,r*1.47);
      ring(city,r*.64,.007,paleGold,.065);
      part(city,octagon,jadeDark,0,h*.42+.06,0,r*.52,h*.84,r*.52);
      part(city,octagon,emeraldGlass,0,h*.9+.06,0,r*.43,.04,r*.43);
      part(city,prism,emeraldGlass,0,h*1.25+.06,0,r*.48,h*.68,r*.48);
      part(city,orb,paleGold,0,h*1.62+.06,0,r*.095,r*.095,r*.095);
      for(let j=0;j<7;j++){
        const angle=j*TAU/7+site.phase,x=Math.cos(angle)*r*.99,z=Math.sin(angle)*r*.99;
        const sh=h*(.37+(j%3)*.08);
        part(city,octagon,jadeDark,x,sh*.5+.07,z,r*.16,sh,r*.16);
        part(city,prism,j===0||j===3?emeraldGlass:jade,x,sh+.08,z,r*.20,sh*.5,r*.20);
        part(city,orb,leaf,x*1.19,.073,z*1.19,r*.27,.075,r*.27);
        const light=part(city,orb,mote,x*1.48,.17,z*1.48,r*.05,r*.05,r*.05);
        emeraldMotes.push({mesh:light,base:.17,phase:angle+i});
      }
      const crown=ring(city,r*.30,.006,paleGold,h*1.36+.06);
      emeraldCrowns.push({mesh:crown,base:h*1.36+.06,phase:site.phase});
    });
    plan.skyways.forEach(({i,j,bridge}) => {
      const a=position(plan.citadels[i]),b=position(plan.citadels[j]);
      const arc=new T.QuadraticBezierCurve3(
        a.clone().setY(.08),a.clone().add(b).multiplyScalar(.5).setY(bridge?.32:.18),b.clone().setY(.08));
      const geo=new T.TubeGeometry(arc,24,bridge?.018:.012,5,false);transient.push(geo);
      emerald.add(new T.Mesh(geo,paleGold));
      const inner=new T.TubeGeometry(arc,24,.003,5,false);transient.push(inner);
      emerald.add(new T.Mesh(inner,emeraldGlass));
      if(bridge)for(const t of [.25,.5,.75]){
        const p=arc.getPoint(t);
        part(emerald,orb,emeraldGlass,p.x,p.y+.012,p.z,.023,.023,.023);
      }
    });
    plan.groves.forEach((site,i)=>{
      const at=position(site),r=.055+(site.h-.43)*.04;
      part(emerald,orb,leaf,at.x,.07,at.z,r,.06,r);
      part(emerald,prism,emeraldGlass,at.x,.11,at.z,r*.37,.16,r*.37);
      if(i%3===0)part(emerald,orb,mote,at.x,.21,at.z,r*.09,r*.09,r*.09);
    });
  }
  return {
    rebuild(theme,sample,water,seed,density) {
      clear(); copper.visible=theme==="copper"; emerald.visible=theme==="emerald";
      surface.visible=copper.visible||emerald.visible;
      copperPlan={stations:[],pipes:[],wheels:[]}; emeraldPlan={citadels:[],skyways:[],groves:[]};
      if(copper.visible){copperPlan=planCopperWorks(sample,water,seed,density);paintSurface(theme,sample,water,copperPlan);buildCopper(copperPlan);}
      if(emerald.visible){emeraldPlan=planEmeraldCity(sample,water,seed,density);paintSurface(theme,sample,water,emeraldPlan);buildEmerald(emeraldPlan);}
    },
    update(time) {
      for(const {gear,phase,direction} of copperGears) gear.rotation.y=phase+time*.38*direction;
      for(const {mesh,base,phase} of pistons)mesh.position.y=base+Math.sin(time*2.4+phase)*.025;
      for(const {mesh,base,phase} of puffs){
        const age=(time*.35+phase/TAU)%1;
        mesh.position.y=base+age*.23;mesh.scale.setScalar(.018+age*.045);
        mesh.material.opacity=.26;
      }
      for(const {mesh,base,phase} of emeraldMotes) mesh.position.y=base+Math.sin(time*1.7+phase)*.028;
      for(const {mesh,base,phase} of emeraldCrowns)mesh.position.y=base+Math.sin(time*.8+phase)*.01;
    },
    steamSources:()=>copperPlan.stations,
    stats:()=>({copperStations:copperPlan.stations.length,copperPipes:copperPlan.pipes.length,
      emeraldCitadels:emeraldPlan.citadels.length,emeraldSkyways:emeraldPlan.skyways.length,
      emeraldGroves:emeraldPlan.groves.length}),
    dispose(){clear();resources.forEach(resource=>resource.dispose());root.remove(copper,emerald);},
  };
}
