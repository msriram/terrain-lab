import { T, material, ellipsoid, pivot, rod, rotateTrack, positionTrack } from "./common.mjs";
import { WORLD_FAUNA } from "../../src/catalog/world-fauna.js";

/** Original animated Atlanteans: a harp-bearing mermaid and trident guard. */
export function makeAtlantean(id) {
  const [tailColor, cloth, skin] = WORLD_FAUNA[id].colors.map((color, i) => material(`${id}-${i}`, color));
  const hair = material(`${id}-hair`, id === "mermaid" ? "#314e61" : "#284957");
  const metal = material(`${id}-bronze`, "#8da99b");
  const dark = material(`${id}-eye`, "#1d3c4a");
  const root = new T.Group(); root.name = id;
  const body = pivot(root, "Body", [0, 0, 0]);
  const tail = pivot(body, "Tail", [0, .22, -.25]);
  const head = pivot(body, "Head", [0, .42, .35]);
  const left = pivot(body, "LeftArm", [-.22, .39, .2]);
  const right = pivot(body, "RightArm", [.22, .39, .2]);
  const e = (p,n,m,pos,s) => ellipsoid(p,n,m,pos,s);
  e(body,"Shoulders",skin,[0,.39,.19],[.26,.17,.32]);
  e(body,"ChestWrap",cloth,[0,.43,.07],[.25,.16,.15]);
  e(body,"Waist",tailColor,[0,.29,-.18],[.22,.17,.23]);
  e(tail,"FishTail",tailColor,[0,0,-.28],[.21,.14,.48]);
  e(tail,"FinL",cloth,[-.16,-.01,-.76],[.2,.045,.22]);
  e(tail,"FinR",cloth,[.16,-.01,-.76],[.2,.045,.22]);
  for (let i=0;i<6;i++) e(tail,`TailScale${i}`,cloth,[(i%2?1:-1)*.12,.115,-.12-i*.09],[.07,.018,.055]);
  e(head,"Face",skin,[0,.04,.11],[.19,.17,.22]);
  e(head,"HairCap",hair,[0,.18,.04],[.22,.13,.22]);
  for (const side of [-1,1]) {
    e(head,`Eye${side}`,dark,[side*.11,.085,.29],[.026,.025,.025]);
    e(head,`HairWave${side}`,hair,[side*.2,.05,-.09],[.07,.1,.23]);
    e(body,`GilledEar${side}`,tailColor,[side*.25,.45,.34],[.065,.085,.07]);
  }
  e(left,"LeftForearm",skin,[-.12,-.02,.08],[.17,.065,.085]);
  e(right,"RightForearm",skin,[.12,-.02,.08],[.17,.065,.085]);
  if (id === "mermaid") {
    // A readable lyre lies across the left arm, strings visible from overhead.
    const harp = pivot(body,"Harp",[-.42,.48,.32]);
    rod(harp,"LyreLeft",metal,[-.21,0,-.24],[-.23,0,.23],.035,.025);
    rod(harp,"LyreRight",metal,[.17,0,-.24],[.25,0,.23],.035,.025);
    rod(harp,"LyreBridge",metal,[-.25,0,.22],[.25,0,.22],.042,.042);
    rod(harp,"LyreFoot",metal,[-.2,0,-.26],[.18,0,-.26],.055,.055);
    for(let i=0;i<6;i++) {
      const x=-.15+i*.066;
      rod(harp,`HarpString${i}`,cloth,[x,.015,-.21],[x,.015,.19],.008,.008);
    }
    for(let i=0;i<3;i++) e(head,`CrownPearl${i}`,metal,[(i-1)*.13,.28,.14],[.05,.045,.045]);
    e(body,"Sash",cloth,[0,.32,-.18],[.24,.045,.11]);
  } else {
    // The three tines face the swimmer's forward (+Z) direction.
    rod(right,"TridentShaft",metal,[.21,.02,-.48],[.21,.02,.55],.035,.035);
    rod(right,"TridentCross",metal,[-.05,.02,.53],[.47,.02,.53],.035,.035);
    for (const x of [-.05,.21,.47])
      rod(right,`TridentTine${x}`,metal,[x,.02,.52],[x,.02,.83],.037,.006);
    e(body,"ShoulderArmorL",metal,[-.23,.5,.22],[.13,.06,.13]);
    e(body,"ShoulderArmorR",metal,[.23,.5,.22],[.13,.06,.13]);
    e(head,"Helm",metal,[0,.23,.04],[.21,.065,.22]);
    rod(head,"HelmFin",tailColor,[0,.26,-.11],[0,.42,-.29],.07,.008);
  }
  const tailWave = (times, amount) => rotateTrack("Tail",[0,1,0],times,[0,amount,0,-amount,0]);
  const idle = new T.AnimationClip("Idle",2.4,[
    tailWave([0,.6,1.2,1.8,2.4],.18),
    rotateTrack("RightArm",[0,1,0],[0,.6,1.2,1.8,2.4],[0,.22,0,-.16,0]),
    rotateTrack("Head",[0,1,0],[0,.6,1.2,1.8,2.4],[0,-.08,0,.08,0]),
    positionTrack("Body",[0,.6,1.2,1.8,2.4],[[0,0,0],[0,.025,0],[0,0,0],[0,-.015,0],[0,0,0]]),
  ]);
  const move = new T.AnimationClip("Move",1.2,[
    tailWave([0,.3,.6,.9,1.2],.42),
    rotateTrack("LeftArm",[0,1,0],[0,.3,.6,.9,1.2],[0,-.11,0,.11,0]),
    rotateTrack("RightArm",[0,1,0],[0,.3,.6,.9,1.2],[0,.14,0,-.14,0]),
  ]);
  const dash = new T.AnimationClip("Dash",.7,[
    tailWave([0,.175,.35,.525,.7],.67),
    rotateTrack("RightArm",[0,1,0],[0,.175,.35,.525,.7],[0,.25,0,-.25,0]),
  ]);
  return {root,clips:[idle,move,dash]};
}
