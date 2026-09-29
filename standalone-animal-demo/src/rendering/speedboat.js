import * as T from "three";

// Original pointed hull, cockpit, twin motors and police lightbar; nose faces +Z.
export function createSpeedboat(police) {
  const scene=new T.Group(),resources=[];
  const material=(color,emissive=0)=>{const m=new T.MeshStandardMaterial({color,emissive,roughness:.4,metalness:.35});resources.push(m);return m;};
  const hull=material(police?0xd8e4ed:0xec9a36),trim=material(0x1a2737),glass=material(0x46afc9,0x113340);
  const red=material(0xff3455,0xff1233),blue=material(0x329dff,0x1277ff);
  const shape=new T.Shape();shape.moveTo(0,1);
  shape.lineTo(.4,.25);shape.lineTo(.34,-.9);shape.lineTo(-.34,-.9);shape.lineTo(-.4,.25);shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.035,bevelThickness:.025});
  geometry.rotateX(Math.PI/2);geometry.translate(0,.17,0);resources.push(geometry);
  scene.add(new T.Mesh(geometry,hull));
  const part=(x,y,z,sx,sy,sz,mat)=>{
    const g=new T.BoxGeometry(sx,sy,sz);resources.push(g);
    const m=new T.Mesh(g,mat);m.position.set(x,y,z);scene.add(m);
  };
  part(0,.24,-.15,.48,.2,.65,trim);
  part(0,.37,.12,.46,.11,.16,glass);
  part(-.19,.16,-.93,.14,.19,.24,trim);part(.19,.16,-.93,.14,.19,.24,trim);
  if(police){part(-.12,.39,-.2,.18,.065,.12,red);part(.12,.39,-.2,.18,.065,.12,blue);}
  return {scene,animations:[],dispose:()=>resources.forEach(r=>r.dispose())};
}
