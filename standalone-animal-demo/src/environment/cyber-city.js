import * as T from "three";
import {planCyberCity,roofPosition,cityLinks,cablePoint,roadPoint} from "./cyber-city-layout.js";

export function createCyberCity(root){
  const group=new T.Group();group.name="Layered cyberpunk metropolis";root.add(group);
  const box=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,7,5);
  const dark=new T.MeshStandardMaterial({color:0x202a42,roughness:.6,metalness:.45});
  const glow=new T.MeshBasicMaterial({color:0xffffff});
  const lines=new T.LineBasicMaterial({color:0x72c6df,transparent:true,opacity:.75});
  const rainMat=new T.LineBasicMaterial({color:0x72a3b8,transparent:true,opacity:.22});
  const matrix=new T.Matrix4(),scaleVector=new T.Vector3(),color=new T.Color(),hues=[0x40ddeb,0xf15cba,0xf6bc69,0x849bff];
  let blocks=[],roads=[],links=[],pads=[],batches=[],cars,people,riders,heads,helis=[],rain,rainSites=[];
  function clear(){
    for(const m of batches)m.dispose();batches=[];
    for(const child of group.children)if(child.isLineSegments)child.geometry.dispose();
    group.clear();helis=[];rain=null;
  }
  const put=(mesh,i,x,y,z,sx,sy,sz,tint,yaw=0)=>{
    matrix.makeRotationY(yaw).scale(scaleVector.set(sx,sy,sz)).setPosition(x,y,z);mesh.setMatrixAt(i,matrix);
    if(tint!==undefined)mesh.setColorAt(i,color.set(tint));
  };
  const batch=(geo,mat,count)=>{
    const m=new T.InstancedMesh(geo,mat,count);m.frustumCulled=false;group.add(m);batches.push(m);return m;
  };
  const flush=m=>{if(m){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}};
  function helicopter(){
    const g=new T.Group();
    const part=(geo,mat,x,y,z,sx,sy,sz)=>{
      const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m;
    };
    part(sphere,dark,0,0,0,.044,.025,.075);
    part(sphere,glow,0,.004,-.032,.033,.018,.032);
    part(box,dark,0,0,.10,.012,.015,.12);
    part(box,glow,0,.012,.15,.06,.008,.013);
    for(const s of [-1,1])part(box,dark,s*.037,-.027,0,.006,.006,.11);
    const rotor=part(box,glow,0,.037,0,.20,.003,.009);
    const rotor2=part(box,dark,0,.038,0,.009,.003,.20);
    g.scale.setScalar(.55);group.add(g);return {g,rotor,rotor2};
  }
  function rebuild(sample,water,seed,density){
    clear();
    ({blocks,roads}=planCyberCity(sample,water,seed,density));
    rainSites=blocks.filter((b,i)=>(i+seed)%3===0);
    group.visible=blocks.length>0;
    if(!group.visible){links=[];pads=[];cars=people=riders=heads=null;return;}
    links=cityLinks(blocks);
    pads=blocks.filter(b=>b.tower&&b.floors>=7&&b.width>.105).sort((a,b)=>b.floors-a.floors).slice(0,4);
    const tiles=batch(box,glow,72*54);
    const groundColor=new T.Color(),waterColor=new T.Color();
    for(let y=0;y<54;y++)for(let x=0;x<72;x++){
      const u=(x+.5)/72,v=(y+.5)/54,h=sample(u,v),i=y*72+x;
      if(!Number.isFinite(h)){put(tiles,i,0,0,0,0,0,0);continue;}
      if(h<water){
        waterColor.set(0x0b4977).lerp(new T.Color(0x218eb6),Math.max(0,1-(water-h)/.24));
        groundColor.copy(waterColor);
      }else{
        const district=(Math.sin(u*11+Math.cos(v*7))*.5+.5);
        groundColor.set(0x304f60).lerp(new T.Color(0x685076),district);
        groundColor.lerp(new T.Color(0x6a6959),Math.max(0,Math.sin(u*8-v*10))*.4);
        if(h-water<.025)groundColor.lerp(new T.Color(0x55aca5),.65);
      }
      put(tiles,i,(u-.5)*4,.002,(v-.5)*3,4/72+.001,.008,3/54+.001,groundColor);
    }
    const floors=batch(box,dark,blocks.reduce((n,b)=>n+(b.tower?b.floors:0),0));
    const windows=batch(box,glow,floors.count*4);
    const roofs=batch(box,glow,blocks.filter(b=>b.tower).length);
    const trim=batch(box,glow,roofs.count*4),padMesh=batch(box,glow,pads.length*7);
    const equipment=batch(box,dark,roofs.count*2),beacons=batch(sphere,glow,roofs.count);
    let fi=0,wi=0,ri=0,ti=0;
    blocks.forEach((b,i)=>{
      const x=(b.u-.5)*4,z=(b.v-.5)*3;
      if(!b.tower)return;
      const width=b.width,depth=width*b.aspect;
      for(let f=0;f<b.floors;f++){
        const px=x+f*.004,pz=z-f*.0035,y=.018+f*.043;
        const setback=b.variation>.5?1-.2*Math.floor(f/4)/4:1;
        put(floors,fi++,px,y,pz,width*setback,.042,depth*setback);
        for(let side=0;side<4;side++){
          const a=side*Math.PI/2;
          put(windows,wi++,px+Math.cos(a)*width*setback*.505,y+.017,pz+Math.sin(a)*depth*setback*.505,
            side%2?width*setback*.62:.002,.006,side%2?.002:depth*setback*.62,(f+side)%3===0?0x243249:hues[i%4]);
        }
      }
      const p=roofPosition(b);
      const roofScale=b.variation>.5?1-.2*Math.floor((b.floors-1)/4)/4:1;
      put(equipment,ri*2,p.x-width*.18,p.y+.012,p.z+depth*.12,width*.28,.02,depth*.24);
      put(equipment,ri*2+1,p.x+width*.28,p.y+.025,p.z-depth*.25,.004,.055,.004);
      put(beacons,ri,p.x+width*.28,p.y+.055,p.z-depth*.25,.004,.004,.004,hues[i%4]);
      put(roofs,ri++,p.x,p.y,p.z,width*roofScale,.01,depth*roofScale,0x25364b);
      for(let side=0;side<4;side++){
        const a=side*Math.PI/2;
        put(trim,ti++,p.x+Math.cos(a)*width*roofScale*.5,p.y+.009,p.z+Math.sin(a)*depth*roofScale*.5,
          side%2?width*roofScale:.002,.003,side%2?.002:depth*roofScale,hues[i%4]);
      }
    });
    pads.forEach((b,i)=>{
      const p=roofPosition(b),r=Math.min(b.width,b.width*b.aspect)*.29;
      [[-r,0,.005,r*2],[r,0,.005,r*2],[0,-r,r*2,.005],[0,r,r*2,.005],
        [-r*.35,0,.003,r],[r*.35,0,.003,r],[0,0,r*.7,.003]].forEach(([x,z,sx,sz],j)=>
        put(padMesh,i*7+j,p.x+x,p.y+.025,p.z+z,sx,.004,sz,0x86f5ca));
    });
    const segments=roads.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,bridge:r.bridge})));
    const curbs=batch(box,glow,segments.length),streets=batch(box,glow,segments.length);
    const lanes=batch(box,glow,segments.length),rails=batch(box,glow,segments.length*2);
    segments.forEach(({a,b,bridge},i)=>{
      const x=(a.u+b.u-1)*2,z=(a.v+b.v-1)*1.5,dx=(b.u-a.u)*4,dz=(b.v-a.v)*3;
      const length=Math.hypot(dx,dz),yaw=-Math.atan2(dz,dx),y=bridge?.065:.018;
      put(curbs,i,x,y,z,length+.006,.009,.052,bridge?0xf5bc7a:0x8ba2b6,yaw);
      put(streets,i,x,y+.005,z,length+.006,.008,.037,bridge?0x596577:0x37404f,yaw);
      put(lanes,i,x,y+.011,z,length*.4,.002,.003,i%2?0xa7b7c4:0xf2dba5,yaw);
      for(let side=0;side<2;side++){
        const sign=side?1:-1;
        put(rails,i*2+side,x-sign*dz/length*.024,y+.025,z+sign*dx/length*.024,
          bridge?length+.003:0,bridge?.018:0,bridge?.003:0,0xffd497,yaw);
      }
    });
    const vertices=[];
    links.forEach(l=>{for(let j=0;j<16;j++){const a=cablePoint(l,j/16),b=cablePoint(l,(j+1)/16);vertices.push(a.x,a.y,a.z,b.x,b.y,b.z);}});
    const geometry=new T.BufferGeometry();geometry.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
    group.add(new T.LineSegments(geometry,lines));
    cars=batch(box,glow,Math.min(roads.length,60));
    people=batch(box,glow,Math.min(roads.filter(r=>r.low).length*3,160));
    heads=batch(sphere,glow,people.count);riders=batch(box,glow,links.length);
    for(let i=0;i<Math.min(3,pads.length);i++)helis.push(helicopter());
    const rg=new T.BufferGeometry();rg.setAttribute("position",new T.BufferAttribute(new Float32Array(180*6),3));
    rain=new T.LineSegments(rg,rainMat);rain.frustumCulled=false;group.add(rain);
    batches.forEach(flush);
  }
  function update(time){
    if(!group.visible)return;
    const low=roads.filter(r=>r.low);
    const routePoint=(r,t)=>{const p=roadPoint(r,t);return {...p,x:(p.u-.5)*4,z:(p.v-.5)*3,y:r.bridge?.065:.018};};
    for(let i=0;i<cars.count;i++){
      const r=roads[i%roads.length],p=routePoint(r,(1-Math.cos(time*.32+i*2.3))/2);
      put(cars,i,p.x,p.y+.016,p.z,.022,.008,.009,hues[i%4],p.yaw);
    }
    for(let i=0;i<people.count;i++){
      const r=low[i%low.length],p=routePoint(r,(1-Math.cos(time*.14+i*1.7))/2),side=i%2?1:-1;
      p.x+=side*Math.sin(p.yaw)*.02;p.z+=side*Math.cos(p.yaw)*.02;
      put(people,i,p.x,p.y+.023,p.z,.009,.025,.012,i%3?0xa2b8c4:0xf59ec6);
      put(heads,i,p.x,p.y+.039,p.z,.006,.006,.006,0xe8cec1);
    }
    links.forEach((l,i)=>{const p=cablePoint(l,(1-Math.cos(time*.25+i*1.3))/2);put(riders,i,p.x,p.y-.035,p.z,.012,.045,.015,hues[i%4]);});
    helis.forEach((h,i)=>{
      const a=roofPosition(pads[i]),b=roofPosition(pads[(i+1)%pads.length]);
      const phase=(time+i*9)%32,t=Math.max(0,Math.min(1,(phase-8)/16)),e=t*t*(3-2*t);
      const reverse=Math.floor((time+i*9)/32)%2,from=reverse?b:a,to=reverse?a:b;
      h.g.position.set(from.x+(to.x-from.x)*e,from.y+(to.y-from.y)*e+.06+Math.sin(Math.PI*t)*.42,from.z+(to.z-from.z)*e);
      h.g.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);
      h.rotor.rotation.y=time*(phase<6?6:45);h.rotor2.rotation.y=h.rotor.rotation.y;
    });
    const arr=rain.geometry.attributes.position.array;
    for(let i=0;i<180;i++){
      const site=rainSites[i%rainSites.length];
      if(!site){arr.fill(-5,i*6,i*6+6);continue;}
      const x=(site.u-.5)*4+((i*.618)%1-.5)*.32,
        z=(site.v-.5)*3+((i*.419)%1-.5)*.32,
        y=.1+(1-(time*.8+i*.173)%1)*1.2;
      arr.set([x,y,z,x+.009,y-.06,z+.012],i*6);
    }
    rain.geometry.attributes.position.needsUpdate=true;[cars,people,heads,riders].forEach(flush);
  }
  return {rebuild,update,stats:()=>({cityBlocks:blocks.length,roadSegments:roads.length,towers:blocks.filter(b=>b.tower).length,
    helipads:pads.length,helicopters:helis.length,zipLines:links.length,cars:cars?.count||0,pedestrians:people?.count||0,rainPatches:rainSites.length}),
    dispose(){clear();root.remove(group);[box,sphere,dark,glow,lines,rainMat].forEach(r=>r.dispose());}};
}
