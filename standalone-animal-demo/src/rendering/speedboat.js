import * as T from "three";

// Original pointed hull, cockpit, twin motors and police lightbar; nose faces +Z.
export function createSpeedboat(police) {
  const scene=new T.Group(),resources=[];
  const material=(color,emissive=0)=>{const m=new T.MeshStandardMaterial({color,emissive,roughness:.4,metalness:.35});resources.push(m);return m;};
  const hull=material(police?0x1879e8:0xec329b,police?0x092455:0x541128);
  const trim=material(police?0x0b1d39:0x39152f),glass=material(police?0x73e6ff:0xffc277,police?0x13415a:0x5a2a10);
  const accent=material(police?0xa8eaff:0xffb34d,police?0x174b65:0x683010);
  const red=material(0xff3455,0xff1233),blue=material(0x329dff,0x1277ff);
  const shape=new T.Shape();shape.moveTo(0,1);
  shape.lineTo(.4,.25);shape.lineTo(.34,-.9);shape.lineTo(-.34,-.9);shape.lineTo(-.4,.25);shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.035,bevelThickness:.025});
  geometry.rotateX(Math.PI/2);geometry.translate(0,.17,0);resources.push(geometry);
  scene.add(new T.Mesh(geometry,hull));
  const part=(x,y,z,sx,sy,sz,mat,name)=>{
    const g=new T.BoxGeometry(sx,sy,sz);resources.push(g);
    const m=new T.Mesh(g,mat);m.position.set(x,y,z);if(name)m.name=name;scene.add(m);
  };
  part(0,.24,-.15,.48,.2,.65,trim);
  part(0,.37,.12,.46,.11,.16,glass);
  for(const side of [-1,1])part(side*.31,.31,-.13,.055,.035,1.12,accent);
  part(0,.33,.71,.13,.025,.27,accent);
  part(-.19,.16,-.93,.14,.19,.24,trim);part(.19,.16,-.93,.14,.19,.24,trim);
  if(police){
    part(-.12,.39,-.2,.18,.065,.12,red,"police-red");
    part(.12,.39,-.2,.18,.065,.12,blue,"police-blue");
  }
  return {scene,animations:[],dispose:()=>resources.forEach(r=>r.dispose())};
}
