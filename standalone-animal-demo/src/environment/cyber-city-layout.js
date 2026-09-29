import { seededRandom } from "../simulation/world.js";
// Stable district lots; sculpting changes heights without reshuffling the city.
export function planCyberCity(sample, water, seed=31, density=1) {
  const blocks=[],roads=[],columns=12,rows=9;
  if(density<=0)return {blocks,roads};
  const random=seededRandom(seed);
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const jitterU=(random()-.5)*.65,jitterV=(random()-.5)*.65;
    const u=(column+.5+jitterU)/columns,v=(row+.5+jitterV)/rows,height=sample(u,v);
    const phase=random(),variation=random(),aspect=.55+random()*.85;
    const streetU=(column-.05+random()*.65)/columns,streetV=(row-.05+random()*.65)/rows;
    if(!Number.isFinite(height))continue;
    const floors=Math.max(0,Math.min(14,Math.floor((height-.34)*23*(.65+variation*.5))));
    const district=.55+.2*Math.sin(column*.7+row*.5);
    blocks.push({column,row,u,v,height,phase,floors,variation,aspect,
      width:.065+variation*.085,streetU,streetV,
      tower:height>water+.035&&floors>0&&phase<Math.min(.92,density*district),roof:.035+floors*.043});
  }
  const nodes=blocks.filter(b=>Number.isFinite(sample(b.streetU,b.streetV))&&sample(b.streetU,b.streetV)>water+.012);
  const pairs=new Set();
  for(const b of nodes){
    const neighbors=nodes.filter(n=>n!==b).sort((a,c)=>Math.hypot(a.streetU-b.streetU,a.streetV-b.streetV)-Math.hypot(c.streetU-b.streetU,c.streetV-b.streetV));
    const opposite=neighbors.find(n=>sample((n.streetU+b.streetU)/2,(n.streetV+b.streetV)/2)<water);
    for(const next of [...neighbors.slice(0,3),...(opposite?[opposite]:[])]){
      const id=[b.row*columns+b.column,next.row*columns+next.column].sort((a,c)=>a-c).join(":");
      if(pairs.has(id))continue;
      pairs.add(id);
      const du=next.streetU-b.streetU,dv=next.streetV-b.streetV,d=Math.hypot(du,dv);
      if(d>.5)continue;
      const bend=(b.phase-.5)*.55;
      const points=[];
      for(let i=0;i<=24;i++){
        const t=i/24,s=Math.sin(Math.PI*t)*bend;
        const u=b.streetU+du*t-dv*s,v=b.streetV+dv*t+du*s;
        points.push({u,v,wet:sample(u,v)<water,height:sample(u,v)});
      }
      if(points.some(p=>!Number.isFinite(p.height)))continue;
      const bridge=points.some(p=>p.wet);
      if(bridge&&roads.some(r=>r.bridge&&Math.hypot((r.u0+r.u1-b.streetU-next.streetU)/2,(r.v0+r.v1-b.streetV-next.streetV)/2)<.13))continue;
      roads.push({u0:b.streetU,v0:b.streetV,u1:next.streetU,v1:next.streetV,
        points,bridge,low:b.floors<5&&next.floors<5});
    }
  }
  // Keep occupied lots tied to the street network, never marooned in water.
  const streetAnchors=roads.filter(r=>!r.bridge).flatMap(r=>r.points.filter((p,i)=>i%4===0));
  for(const b of blocks){
    if(!b.tower)continue;
    const candidates=[...streetAnchors]
      .sort((a,c)=>((a.u-b.u)*4)**2+((a.v-b.v)*3)**2-((c.u-b.u)*4)**2-((c.v-b.v)*3)**2);
    b.access=null;
    for(const p of candidates){
      const dx=(p.u-b.u)*4,dz=(p.v-b.v)*3,d=Math.hypot(dx,dz);
      if(d>.45)break;
      const inset=Math.min(.8,Math.max(b.width,b.width*b.aspect)*.5/Math.max(d,.001));
      const start={u:b.u+(p.u-b.u)*inset,v:b.v+(p.v-b.v)*inset};
      const dry=Array.from({length:13},(_,i)=>{
        const t=i/12,h=sample(start.u+(p.u-start.u)*t,start.v+(p.v-start.v)*t);
        return Number.isFinite(h)&&h>water;
      }).every(Boolean);
      if(dry){b.access={start,end:{u:p.u,v:p.v}};break;}
    }
    if(!b.access)b.tower=false;
  }
  return {blocks,roads};
}
export function roadPoint(route,t){
  const s=Math.max(0,Math.min(1,t))*(route.points.length-1),i=Math.min(route.points.length-2,Math.floor(s)),f=s-i;
  const a=route.points[i],b=route.points[i+1];
  return {u:a.u+(b.u-a.u)*f,v:a.v+(b.v-a.v)*f,
    yaw:-Math.atan2((b.v-a.v)*3,(b.u-a.u)*4),bridge:route.bridge};
}
export function roofPosition(b){return {x:(b.u-.5)*4,z:(b.v-.5)*3,y:b.roof};}
export function helicopterHeading(from,to){return Math.atan2(from.x-to.x,from.z-to.z);}
export function cityLinks(blocks){
  const towers=blocks.filter(b=>b.tower&&b.floors>=4),links=[];
  for(const a of towers){
    const nearby=towers.filter(b=>b!==a).sort((b,c)=>Math.hypot(a.u-b.u,a.v-b.v)-Math.hypot(a.u-c.u,a.v-c.v));
    for(const b of nearby.slice(0,2))
      if(links.length<30&&!links.some(l=>l.a===b&&l.b===a)&&Math.hypot(a.u-b.u,a.v-b.v)<.27)links.push({a,b});
  }
  return links;
}
export function cablePoint(link,t){
  const a=roofPosition(link.a),b=roofPosition(link.b);
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t+.065-Math.sin(Math.PI*t)*.055};
}
