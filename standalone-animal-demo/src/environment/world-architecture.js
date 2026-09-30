import * as T from "three";
import { planCopperWorks, planEmeraldCity } from "./world-architecture-layout.js";
import { createCopperCitadel } from "./copper-citadel.js";

const TAU = Math.PI * 2;
const position = p => new T.Vector3((p.u - .5) * 4, 0, (p.v - .5) * 3);

/** Two authored architectures, rebuilt from the same live terrain as wildlife. */
export function createWorldArchitecture(root) {
  const copperCity = createCopperCitadel(root), emerald = new T.Group();
  emerald.name = "Emerald garden citadels";
  root.add(emerald);
  const resources = [], transient = [];
  const geometry = g => (resources.push(g), g);
  const material = m => (resources.push(m), m);
  const octagon = geometry(new T.CylinderGeometry(1, 1, 1, 8));
  const prism = geometry(new T.CylinderGeometry(0, 1, 1, 7));
  const block = geometry(new T.BoxGeometry(1, 1, 1));
  const orb = geometry(new T.IcosahedronGeometry(1, 1));
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
  const emeraldMotes = [], emeraldCrowns = [];
  let copperPlan = {stations:[],pipes:[],wheels:[]}, emeraldPlan = {citadels:[],skyways:[],groves:[]};
  function paintSurface(theme,sample,water,plan){
    const ctx=surfaceCanvas.getContext("2d"),w=surfaceCanvas.width,h=surfaceCanvas.height;
    const image=ctx.createImageData(w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const u=x/w,v=y/h,e=sample(u,v),i=(y*w+x)*4;
      if(!Number.isFinite(e)||e<0)continue;
      const wet=e<water,t=Math.max(0,Math.min(1,(e-water)/.5));
      const terrace=(Math.sin(e*70)+1)*.5;
      image.data.set(wet?[5,51,49,132]:[Math.round(10+t*18+terrace*4),Math.round(70+t*56+terrace*12),Math.round(48+t*36+terrace*5),158],i);
    }
    ctx.putImageData(image,0,0);
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
  function clear() {
    emerald.clear();
    transient.forEach(g=>g.dispose()); transient.length=0;
    emeraldMotes.length=emeraldCrowns.length=0;
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
      clear(); emerald.visible=theme==="emerald";
      surface.visible=emerald.visible;
      copperPlan={stations:[],pipes:[],wheels:[]}; emeraldPlan={citadels:[],skyways:[],groves:[]};
      if(theme==="copper")copperPlan=planCopperWorks(sample,water,seed,density);
      copperCity.rebuild(theme==="copper"?copperPlan:null,sample,water);
      if(emerald.visible){emeraldPlan=planEmeraldCity(sample,water,seed,density);paintSurface(theme,sample,water,emeraldPlan);buildEmerald(emeraldPlan);}
    },
    update(time) {
      copperCity.update(time);
      for(const {mesh,base,phase} of emeraldMotes) mesh.position.y=base+Math.sin(time*1.7+phase)*.028;
      for(const {mesh,base,phase} of emeraldCrowns)mesh.position.y=base+Math.sin(time*.8+phase)*.01;
    },
    steamSources:()=>copperPlan.stations,
    stats:()=>({...copperCity.stats(),copperStations:copperPlan.stations.length,copperPipes:copperPlan.pipes.length,
      emeraldCitadels:emeraldPlan.citadels.length,emeraldSkyways:emeraldPlan.skyways.length,
      emeraldGroves:emeraldPlan.groves.length}),
    dispose(){clear();resources.forEach(resource=>resource.dispose());copperCity.dispose();root.remove(emerald,surface);},
  };
}
