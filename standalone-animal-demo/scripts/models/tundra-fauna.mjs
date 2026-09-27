import { T, material, ellipsoid, pivot, rod, rotateTrack, positionTrack } from "./common.mjs";
import { WORLD_FAUNA } from "../../src/catalog/world-fauna.js";

/** Original Tundra silhouettes. Each gait and head gesture is a separate glTF clip. */
export function makeTundraFauna(id) {
  const [coat, pale, dark] = WORLD_FAUNA[id].colors.map((c, i) => material(`${id}-${i}`, c));
  const eye = material(`${id}-eye`, "#171818");
  const root = new T.Group(); root.name = id;
  const body = pivot(root, "Body", [0, 0, 0]);
  const head = pivot(body, "Head", [0, 0, 0.44]);
  const tail = pivot(body, "Tail", [0, 0, -0.62]);
  const legs = [[-1,1],[1,1],[-1,-1],[1,-1]].map(([side, front], i) =>
    pivot(body, `Leg${i}`, [side * (id === "brownbear" ? .29 : .22), id === "moose" ? .54 : .3, front * .42]));
  const e = (parent, name, mat, p, s) => ellipsoid(parent, name, mat, p, s);
  if (id === "brownbear") {
    e(body,"Barrel",coat,[0,.43,-.08],[.42,.34,.7]);
    e(body,"ShoulderHump",pale,[0,.67,.2],[.38,.31,.37]);
    e(head,"BroadHead",coat,[0,.47,.23],[.28,.24,.31]);
    e(head,"Muzzle",pale,[0,.34,.51],[.19,.13,.23]);
    e(head,"Nose",dark,[0,.38,.71],[.12,.075,.075]);
    for (const side of [-1,1]) {
      e(head,`Ear${side}`,coat,[side*.23,.69,.13],[.11,.12,.09]);
      e(head,`Eye${side}`,eye,[side*.21,.51,.43],[.036,.035,.035]);
    }
    legs.forEach((leg,i)=>{ e(leg,`HeavyLeg${i}`,coat,[0,-.13,0],[.17,.28,.18]); e(leg,`Paw${i}`,pale,[0,-.37,.1],[.19,.09,.23]); });
    e(tail,"StubTail",coat,[0,.22,-.07],[.12,.12,.12]);
  } else if (id === "dallsheep") {
    e(body,"WoolBody",coat,[0,.4,-.08],[.32,.29,.62]);
    e(body,"Chest",pale,[0,.39,.37],[.29,.27,.3]);
    e(head,"LongFace",coat,[0,.43,.26],[.17,.17,.31]);
    e(head,"Muzzle",pale,[0,.34,.52],[.13,.09,.17]);
    for (const side of [-1,1]) {
      e(head,`Eye${side}`,eye,[side*.15,.48,.37],[.03,.03,.03]);
      e(head,`Ear${side}`,coat,[side*.25,.52,.05],[.15,.045,.085]);
      // The curled horns are thick segmented arcs rather than simple spikes.
      let previous = [side*.19,.64,.06];
      for (let j=1;j<=11;j++) {
        const a=j/11*Math.PI*1.75;
        const next=[side*(.19+.22*Math.sin(a)), .64+.24*(1-Math.cos(a)), .06-.25*j/11];
        rod(head,`Horn${side}_${j}`,pale,previous,next,.075-j*.003,.074-j*.003);
        previous=next;
      }
    }
    legs.forEach((leg,i)=>{ rod(leg,`Shin${i}`,coat,[0,0,0],[0,-.36,.01],.083,.058); e(leg,`Hoof${i}`,dark,[0,-.39,.035],[.085,.065,.1]); });
    e(tail,"WoolTail",coat,[0,.22,-.04],[.12,.12,.13]);
  } else {
    e(body,"LongBody",coat,[0,.69,-.12],[.36,.33,.73]);
    e(body,"Shoulder",coat,[0,.83,.31],[.35,.38,.34]);
    e(body,"Dewlap",pale,[0,.48,.45],[.16,.24,.2]);
    e(head,"LongHead",coat,[0,.65,.22],[.2,.2,.31]);
    e(head,"DroopingMuzzle",pale,[0,.51,.57],[.18,.16,.32]);
    e(head,"Nose",dark,[0,.49,.85],[.13,.08,.07]);
    for (const side of [-1,1]) {
      e(head,`Eye${side}`,eye,[side*.17,.72,.37],[.032,.032,.032]);
      e(head,`Ear${side}`,coat,[side*.33,.78,.05],[.2,.07,.11]);
      rod(head,`AntlerStem${side}`,pale,[side*.18,.83,.03],[side*.4,1.15,-.06],.065,.045);
      // Broad, flattened palm with several distinct tines.
      e(head,`AntlerPalm${side}`,pale,[side*.51,1.27,-.07],[.26,.25,.055]);
      for (let i=0;i<4;i++) rod(head,`Tine${side}_${i}`,pale,[side*(.38+i*.1),1.33,-.07],[side*(.39+i*.13),1.55+(i%2)*.08,-.07],.045,.012);
    }
    legs.forEach((leg,i)=>{ rod(leg,`Upper${i}`,coat,[0,0,0],[0,-.44,.025],.12,.085); rod(leg,`Lower${i}`,pale,[0,-.42,.025],[0,-.75,.07],.07,.04); e(leg,`Hoof${i}`,dark,[0,-.77,.1],[.09,.055,.12]); });
    e(tail,"ShortTail",coat,[0,.28,-.06],[.1,.16,.12]);
  }
  const gait = (speed, amplitude) => {
    const times=[0,.25/speed,.5/speed,.75/speed,1/speed];
    const wave=[0,amplitude,0,-amplitude,0];
    return legs.map((leg,i)=>rotateTrack(leg.name,[1,0,0],times,wave.map(v=>v*(i===0||i===3?1:-1))));
  };
  const idle = new T.AnimationClip("Idle",3,[
    rotateTrack("Head",[1,0,0],[0,.7,1.5,2.2,3],[0,-.14,.08,-.1,0]),
    rotateTrack("Tail",[0,1,0],[0,.75,1.5,2.25,3],[0,.22,0,-.22,0]),
  ]);
  const move = new T.AnimationClip("Move",1,[...gait(1,.34),positionTrack("Body",[0,.25,.5,.75,1],[[0,0,0],[0,.025,0],[0,0,0],[0,.025,0],[0,0,0]])]);
  const dash = new T.AnimationClip("Dash",.55,[...gait(1/.55,.65),positionTrack("Body",[0,.14,.275,.41,.55],[[0,0,0],[0,.08,0],[0,0,0],[0,.08,0],[0,0,0]])]);
  return {root,clips:[idle,move,dash]};
}
