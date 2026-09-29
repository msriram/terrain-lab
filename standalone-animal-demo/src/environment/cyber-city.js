import * as T from "three";
import {planCyberCity,roofPosition,cityLinks,cablePoint,roadPoint,helicopterHeading} from "./cyber-city-layout.js";

export function createCyberCity(root){
  const group=new T.Group();group.name="Layered cyberpunk metropolis";root.add(group);
  const box=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,7,5);
  const cylinder=new T.CylinderGeometry(.5,.5,1,12);
  const dark=new T.MeshStandardMaterial({color:0x111827,roughness:.58,metalness:.55});
  const glow=new T.MeshBasicMaterial({color:0xffffff});
  const lines=new T.LineBasicMaterial({color:0x4a8195,transparent:true,opacity:.65});
  const rainMat=new T.LineBasicMaterial({color:0xa6d3e8,transparent:true,opacity:.32});
  const lightCanvas=document.createElement("canvas");lightCanvas.width=64;lightCanvas.height=64;
  const lightContext=lightCanvas.getContext("2d"),halo=lightContext.createRadialGradient(32,32,1,32,32,32);
  halo.addColorStop(0,"rgba(255,255,255,.95)");halo.addColorStop(.22,"rgba(255,255,255,.5)");halo.addColorStop(1,"rgba(255,255,255,0)");
  lightContext.fillStyle=halo;lightContext.fillRect(0,0,64,64);
  const lightTexture=new T.CanvasTexture(lightCanvas);
  const lightMaterial=new T.MeshBasicMaterial({map:lightTexture,color:0xffffff,transparent:true,opacity:.24,depthWrite:false,blending:T.AdditiveBlending});
  const lightPlane=new T.PlaneGeometry(1,1);lightPlane.rotateX(-Math.PI/2);
  const signGeometry=new T.PlaneGeometry(1,1);signGeometry.rotateX(-Math.PI/2);
  const signMaterials=["NEX","24H","ION","KAI","HOTEL","88"].map((label,i)=>{
    const c=document.createElement("canvas");c.width=256;c.height=96;
    const ctx=c.getContext("2d");
    ctx.fillStyle=["#12283b","#412338","#19383e"][i%3];ctx.fillRect(0,0,256,96);
    ctx.strokeStyle=["#5ce8fa","#ff79c9","#ffc968"][i%3];ctx.lineWidth=5;ctx.strokeRect(3,3,250,90);
    ctx.fillStyle=ctx.strokeStyle;ctx.font="bold 53px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(label,128,50);
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
    return new T.MeshBasicMaterial({map,transparent:true});
  });
  const matrix=new T.Matrix4(),scaleVector=new T.Vector3(),color=new T.Color(),hues=[0x40ddeb,0xf15cba,0xf6bc69,0x849bff];
  let blocks=[],roads=[],links=[],pads=[],batches=[],cars,carLights,carHalos,people,riders,heads,helis=[],rain,rainSites=[],signs=[];
  function clear(){
    for(const m of batches)m.dispose();batches=[];
    for(const child of group.children)if(child.isLineSegments)child.geometry.dispose();
    for(const child of group.children)if(child.userData.citySurface){child.geometry.dispose();child.material.map.dispose();child.material.dispose();}
    group.clear();helis=[];rain=null;signs=[];
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
    if(!group.visible){links=[];pads=[];cars=carLights=carHalos=people=riders=heads=null;return;}
    links=cityLinks(blocks);
    pads=blocks.filter(b=>b.tower&&b.floors>=7&&b.width>.105).sort((a,b)=>b.floors-a.floors).slice(0,4);
    const canvas=document.createElement("canvas");canvas.width=768;canvas.height=576;
    const ctx=canvas.getContext("2d"),pixels=ctx.createImageData(canvas.width,canvas.height);
    const groundColor=new T.Color(),waterColor=new T.Color(),landColor=new T.Color();
    const deepWater=new T.Color(0x031321),shallowWater=new T.Color(0x12445c);
    const districtA=new T.Color(0x0d1d29),districtB=new T.Color(0x25172e);
    const warmStone=new T.Color(0x302019),shoreStone=new T.Color(0x174b55);
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      const u=(x+.5)/canvas.width,v=(y+.5)/canvas.height,h=sample(u,v),i=(y*canvas.width+x)*4;
      if(!Number.isFinite(h))continue;
      waterColor.copy(deepWater).lerp(shallowWater,Math.max(0,Math.min(1,1-(water-h)/.24)));
      const district=(Math.sin(u*11+Math.cos(v*7))*.5+.5);
      landColor.copy(districtA).lerp(districtB,district);
      landColor.lerp(warmStone,Math.max(0,Math.sin(u*8-v*10))*.4);
      if(h-water<.025)landColor.lerp(shoreStone,.65);
      const shore=Math.max(0,Math.min(1,(h-water+.009)/.018));
      groundColor.copy(waterColor).lerp(landColor,shore*shore*(3-2*shore));
      const rgb=groundColor.getHex();
      pixels.data.set([rgb>>16,(rgb>>8)&255,rgb&255,255],i);
    }
    ctx.putImageData(pixels,0,0);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;
    const groundGeometry=new T.PlaneGeometry(4,3);groundGeometry.rotateX(-Math.PI/2);
    const surface=new T.Mesh(groundGeometry,new T.MeshBasicMaterial({map:texture,transparent:true}));
    surface.position.y=.002;surface.userData.citySurface=true;group.add(surface);
    const towers=blocks.filter(b=>b.tower);
    const floors=batch(box,dark,towers.length);
    const roundTowers=batch(cylinder,dark,towers.length);
    const windows=batch(box,glow,towers.length*4);
    const roofs=batch(box,glow,blocks.filter(b=>b.tower).length);
    const trim=batch(box,glow,roofs.count*4),padMesh=batch(box,glow,pads.length*7);
    const equipment=batch(box,dark,roofs.count*2),beacons=batch(sphere,glow,roofs.count);
    const podiums=batch(box,glow,roofs.count),shadows=batch(box,glow,roofs.count);
    const access=batch(box,glow,roofs.count),accessLights=batch(box,glow,roofs.count*2);
    const roofPanels=batch(box,glow,roofs.count*3);
    const roofLights=batch(sphere,glow,roofs.count*8);
    const roofHalos=batch(lightPlane,lightMaterial,roofs.count*2);
    let fi=0,wi=0,ri=0,ti=0;
    blocks.forEach((b,i)=>{
      const x=(b.u-.5)*4,z=(b.v-.5)*3;
      if(!b.tower)return;
      const width=b.width,depth=width*b.aspect;
      const round=b.variation<.24;
      put(floors,fi,x,b.roof/2,z,round?0:width,round?0:b.roof,round?0:depth);
      put(roundTowers,fi,x,b.roof/2,z,round?width:0,round?b.roof:0,round?depth:0);
      put(podiums,fi,x,.022,z,width*1.12,.032,depth*1.12,[0x1b2a37,0x2a1b31,0x30231e][i%3]);
      put(shadows,fi,x+b.roof*.13,.009,z+b.roof*.10,width*1.15,.003,depth*1.15,0x050a12);
      const start=b.access.start,end=b.access.end;
      const dx=(end.u-start.u)*4,dz=(end.v-start.v)*3,len=Math.hypot(dx,dz),yaw=-Math.atan2(dz,dx);
      const ax=(start.u+end.u-1)*2,az=(start.v+end.v-1)*1.5;
      put(access,fi,ax,.021,az,len,.012,.028,0x344653,yaw);
      for(let s=0;s<2;s++){
        const sign=s?1:-1;
        put(accessLights,fi*2+s,ax-sign*Math.sin(-yaw)*.012,.03,az+sign*Math.cos(yaw)*.012,len,.003,.002,hues[i%4],yaw);
      }
      fi++;
      for(let side=0;side<4;side++){
        const a=side*Math.PI/2;
        put(windows,wi++,x+Math.cos(a)*width*.505,b.roof*.52,z+Math.sin(a)*depth*.505,
          side%2?width*.06:.003,b.roof*.82,side%2?.003:depth*.06,hues[i%4]);
      }
      const p=roofPosition(b);
      const roofScale=round?.72:1;
      put(equipment,ri*2,p.x-width*.18,p.y+.012,p.z+depth*.12,width*.28,.02,depth*.24);
      put(equipment,ri*2+1,p.x+width*.28,p.y+.025,p.z-depth*.25,.004,.055,.004);
      put(beacons,ri,p.x+width*.28,p.y+.055,p.z-depth*.25,.004,.004,.004,hues[i%4]);
      put(roofs,ri,p.x,p.y,p.z,width*roofScale,.01,depth*roofScale,[0x14202d,0x201b2e,0x26201e][i%3]);
      for(let j=0;j<3;j++){
        const px=p.x+width*((j*.39+i*.13)%1-.5)*.55;
        const pz=p.z+depth*((j*.63+i*.17)%1-.5)*.55;
        put(roofPanels,ri*3+j,px,p.y+.012,pz,width*(.12+j*.045),.004,depth*.12,
          j===0?0x486272:0x253746);
      }
      for(let j=0;j<8;j++){
        const side=j%4,along=((j*.41+i*.17)%1-.5)*.72;
        const lx=p.x+(side<2?(side?1:-1)*width*.43:along*width);
        const lz=p.z+(side>=2?(side===2?-1:1)*depth*.43:along*depth);
        put(roofLights,ri*8+j,lx,p.y+.014,lz,.0028,.0028,.0028,
          j%3===0?0xffbd73:j%3===1?0x42d9ef:0xe070ac);
      }
      for(let j=0;j<2;j++)put(roofHalos,ri*2+j,
        p.x+(j?-.29:.29)*width,p.y+.011,p.z+(j?.29:-.29)*depth,
        width*.72,1,depth*.72,j?0x2e87a5:0x9e455d);
      ri++;
      for(let side=0;side<4;side++){
        const a=side*Math.PI/2;
        put(trim,ti++,p.x+Math.cos(a)*width*roofScale*.5,p.y+.009,p.z+Math.sin(a)*depth*roofScale*.5,
          side%2?width*roofScale:.002,.003,side%2?.002:depth*roofScale,
          i%4===0?0x367e91:i%4===1?0x8b496f:0x826541);
      }
      if(i%3===0&&!pads.includes(b)){
        const sign=new T.Mesh(signGeometry,signMaterials[i%signMaterials.length]);
        sign.position.set(x,b.roof+.023,z-depth*.12);sign.scale.set(width*.88,1,depth*.48);
        group.add(sign);signs.push(sign);
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
    const lampCount=Math.ceil(segments.length/12),streetLamps=batch(sphere,glow,lampCount*2);
    const streetHalos=batch(lightPlane,lightMaterial,lampCount);
    segments.forEach(({a,b,bridge},i)=>{
      const x=(a.u+b.u-1)*2,z=(a.v+b.v-1)*1.5,dx=(b.u-a.u)*4,dz=(b.v-a.v)*3;
      const length=Math.hypot(dx,dz),yaw=-Math.atan2(dz,dx),y=bridge?.065:.018;
      put(curbs,i,x,y,z,length+.006,.009,.052,bridge?0x9b7253:0x354656,yaw);
      put(streets,i,x,y+.005,z,length+.006,.008,.037,bridge?0x303a4a:0x172535,yaw);
      put(lanes,i,x,y+.011,z,length*.4,.002,.003,i%2?0x657287:0x9c846a,yaw);
      for(let side=0;side<2;side++){
        const sign=side?1:-1;
        put(rails,i*2+side,x-sign*dz/length*.024,y+.025,z+sign*dx/length*.024,
          bridge?length+.003:0,bridge?.018:0,bridge?.003:0,0xca9e6f,yaw);
      }
      if(i%12===0){
        const index=Math.floor(i/12),lampColor=i%5===0?0xe7ad72:i%5===1?0x57c9e4:0xdd699f;
        for(let side=0;side<2;side++){
          const sign=side?1:-1;
          put(streetLamps,index*2+side,x-sign*dz/length*.035,y+.032,z+sign*dx/length*.035,
            .0035,.0035,.0035,lampColor);
        }
        put(streetHalos,index,x,y+.013,z,.12,1,.12,lampColor);
      }
    });
    const vertices=[];
    links.forEach(l=>{for(let j=0;j<16;j++){const a=cablePoint(l,j/16),b=cablePoint(l,(j+1)/16);vertices.push(a.x,a.y,a.z,b.x,b.y,b.z);}});
    const geometry=new T.BufferGeometry();geometry.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
    group.add(new T.LineSegments(geometry,lines));
    cars=batch(box,glow,roads.length*2);
    carLights=batch(sphere,glow,cars.count*2);
    carHalos=batch(lightPlane,lightMaterial,cars.count);
    people=batch(box,glow,Math.min(roads.filter(r=>r.low).length*3,160));
    heads=batch(sphere,glow,people.count);riders=batch(box,glow,links.length);
    for(let i=0;i<Math.min(3,pads.length);i++)helis.push(helicopter());
    const rg=new T.BufferGeometry();rg.setAttribute("position",new T.BufferAttribute(new Float32Array(320*6),3));
    rain=new T.LineSegments(rg,rainMat);rain.frustumCulled=false;group.add(rain);
    batches.forEach(flush);
  }
  function update(time){
    if(!group.visible)return;
    signs.forEach((s,i)=>{s.visible=Math.sin(time*.7+i*1.9)>-.98;});
    const low=roads.filter(r=>r.low);
    const routePoint=(r,t)=>{const p=roadPoint(r,t);return {...p,x:(p.u-.5)*4,z:(p.v-.5)*3,y:r.bridge?.065:.018};};
    for(let i=0;i<cars.count;i++){
      const r=roads[Math.floor(i/2)],progress=(time*.09+i*.37)%1;
      const p=routePoint(r,i%2?1-progress:progress);
      const side=i%2?1:-1;
      p.x+=side*Math.sin(p.yaw)*.008;p.z+=side*Math.cos(p.yaw)*.008;
      const yaw=p.yaw+(i%2?Math.PI:0),lampColor=i%4===0?0xffc87a:i%4===1?0x6ce6ff:i%4===2?0xff729f:0xd7eaff;
      put(cars,i,p.x,p.y+.016,p.z,.023,.008,.010,[0x294b67,0x5e334d,0x53433d,0x284756][i%4],yaw);
      for(let sideLight=0;sideLight<2;sideLight++){
        const lateral=sideLight?-.0035:.0035;
        put(carLights,i*2+sideLight,
          p.x+Math.cos(yaw)*.013+Math.sin(yaw)*lateral,p.y+.022,
          p.z-Math.sin(yaw)*.013+Math.cos(yaw)*lateral,
          .0028,.0028,.0028,lampColor);
      }
      put(carHalos,i,p.x,p.y+.013,p.z,.055,1,.055,lampColor);
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
      // The cockpit faces local -Z; +Z is the tail boom.
      h.g.rotation.y=helicopterHeading(from,to);
      h.rotor.rotation.y=time*(phase<6?6:45);h.rotor2.rotation.y=h.rotor.rotation.y;
    });
    const arr=rain.geometry.attributes.position.array;
    for(let i=0;i<320;i++){
      const site=rainSites[i%rainSites.length];
      if(!site){arr.fill(-5,i*6,i*6+6);continue;}
      const x=(site.u-.5)*4+((i*.618)%1-.5)*.32,
        z=(site.v-.5)*3+((i*.419)%1-.5)*.32,
        y=.1+(1-(time*1.1+i*.173)%1)*1.2;
      arr.set([x,y,z,x+.014,y-.08,z+.025],i*6);
    }
    rain.geometry.attributes.position.needsUpdate=true;[cars,carLights,carHalos,people,heads,riders].forEach(flush);
  }
  return {rebuild,update,stats:()=>({cityBlocks:blocks.length,roadSegments:roads.length,towers:blocks.filter(b=>b.tower).length,
    bridges:roads.filter(r=>r.bridge).length,
    helipads:pads.length,helicopters:helis.length,zipLines:links.length,cars:cars?.count||0,pedestrians:people?.count||0,rainPatches:rainSites.length}),
    dispose(){clear();root.remove(group);signMaterials.forEach(m=>{m.map.dispose();m.dispose();});[box,sphere,cylinder,signGeometry,lightPlane,lightTexture,lightMaterial,dark,glow,lines,rainMat].forEach(r=>r.dispose());}};
}
