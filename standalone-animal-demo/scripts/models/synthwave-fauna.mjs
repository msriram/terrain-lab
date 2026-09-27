import { T, material, ellipsoid, pivot, rod, rotateTrack, positionTrack } from "./common.mjs";
import { WORLD_FAUNA } from "../../src/catalog/world-fauna.js";

/** Original springing neon monsters, authored as separate animated GLBs. */
export function makeSynthwaveFauna(id) {
  const [skin, glow, accent] = WORLD_FAUNA[id].colors.map((color, i) => material(`${id}-${i}`, color));
  glow.emissive = new T.Color(WORLD_FAUNA[id].colors[1]); glow.emissiveIntensity = .35;
  accent.emissive = new T.Color(WORLD_FAUNA[id].colors[2]); accent.emissiveIntensity = .18;
  const voidMat = material(`${id}-void`, "#16132c");
  const fang = material(`${id}-fang`, "#f5d1ed");
  const root = new T.Group(); root.name = id;
  const body = pivot(root, "Body", [0, 0, 0]);
  const head = pivot(body, "Head", [0, .55, .29]);
  const left = pivot(body, "LeftArm", [-.32, .56, .15]);
  const right = pivot(body, "RightArm", [.32, .56, .15]);
  const e = (p,n,m,pos,scale) => ellipsoid(p,n,m,pos,scale);
  const eyes = (x,y,z,size=.06) => { for (const sign of [-1,1]) {
    e(head,`EyeSocket${sign}`,voidMat,[sign*x,y,z],[size*1.35,size*1.3,.04]);
    e(head,`EyeGlow${sign}`,glow,[sign*x,y,z+.035],[size*.58,size*.62,.028]);
  }};
  if (id === "neonbehemoth") {
    e(body,"MassiveTorso",skin,[0,.68,0],[.52,.58,.4]);
    e(body,"ChestGlow",glow,[0,.7,.35],[.23,.17,.07]);
    e(head,"Mane",accent,[0,.26,-.04],[.39,.33,.32]);
    e(head,"SnarlingFace",skin,[0,.2,.22],[.29,.25,.27]);
    e(head,"DarkMouth",voidMat,[0,.04,.46],[.22,.11,.05]);
    eyes(.16,.26,.44,.065);
    for (const sign of [-1,1]) {
      rod(head,`CrownHorn${sign}`,glow,[sign*.24,.44,.03],[sign*.43,.91,-.07],.12,.008);
      rod(head,`LowerFang${sign}`,fang,[sign*.12,-.01,.49],[sign*.12,.13,.52],.045,.003);
      for (let i=0;i<4;i++) rod(body,`BackSpine${sign}_${i}`,accent,[sign*.25,.95,-.23+i*.15],[sign*(.3+i*.025),1.18+i*.04,-.22+i*.15],.07,.005);
    }
    for (const [side,arm] of [[-1,left],[1,right]]) {
      e(arm,`BulkyArm${side}`,skin,[side*.09,-.23,.03],[.19,.31,.19]);
      e(arm,`ClawHand${side}`,skin,[side*.14,-.5,.1],[.16,.14,.17]);
      for(let i=0;i<3;i++) rod(arm,`Claw${side}_${i}`,fang,[side*.14+(i-1)*.08,-.57,.18],[side*.14+(i-1)*.08,-.72,.27],.035,.004);
    }
    for (const side of [-1,1]) {
      e(body,`Haunch${side}`,skin,[side*.31,.32,-.13],[.24,.29,.26]);
      e(body,`Foot${side}`,accent,[side*.31,.08,.06],[.24,.09,.27]);
    }
  } else if (id === "glitchimp") {
    e(body,"RoundBody",skin,[0,.44,0],[.29,.34,.27]);
    e(body,"HeartGlyph",accent,[0,.49,.25],[.095,.12,.035]);
    e(head,"OversizedHead",skin,[0,.24,.18],[.3,.26,.27]);
    e(head,"FacePlate",voidMat,[0,.19,.4],[.24,.16,.045]);
    for (let i=0;i<3;i++) e(head,`ThreeEyes${i}`,glow,[(i-1)*.13,.2+(i%2)*.06,.445],[.055,.065,.03]);
    for (const sign of [-1,1]) {
      rod(head,`CrookedHorn${sign}`,accent,[sign*.24,.42,.05],[sign*.39,.67,-.03],.07,.006);
      e(body,`SpringLeg${sign}`,glow,[sign*.16,.12,-.04],[.1,.17,.1]);
      e(body,`BigFoot${sign}`,skin,[sign*.17,.045,.11],[.13,.07,.2]);
    }
    e(left,"LeftPaw",skin,[-.11,-.15,.05],[.12,.19,.13]);
    e(right,"RightPaw",skin,[.11,-.15,.05],[.12,.19,.13]);
  } else {
    e(body,"FloatingCloak",skin,[0,.43,-.05],[.34,.48,.25]);
    for(let i=0;i<7;i++) {
      const a=i*Math.PI*2/7;
      rod(body,`TrailingRibbon${i}`,i%2?glow:accent,[Math.cos(a)*.18,.25,Math.sin(a)*.14],[Math.cos(a)*.33,-.15,Math.sin(a)*.26],.07,.006);
    }
    e(head,"Mask",accent,[0,.25,.18],[.25,.24,.13]);
    e(head,"DarkVisor",voidMat,[0,.24,.3],[.21,.12,.035]);
    eyes(.11,.27,.34,.057);
    for(const sign of [-1,1]) {
      rod(head,`CrescentHorn${sign}`,glow,[sign*.2,.41,.13],[sign*.34,.67,-.04],.07,.005);
      rod(body,`SpectralArm${sign}`,skin,[sign*.27,.56,.03],[sign*.48,.12,.22],.1,.04);
    }
  }
  const times=[0,.25,.5,.75,1];
  const idle=new T.AnimationClip("Idle",2,[
    rotateTrack("Head",[0,1,0],[0,.5,1,1.5,2],[0,.22,0,-.22,0]),
    rotateTrack("LeftArm",[1,0,0],[0,.5,1,1.5,2],[0,.2,0,-.2,0]),
    rotateTrack("RightArm",[1,0,0],[0,.5,1,1.5,2],[0,-.2,0,.2,0]),
  ]);
  const jump=new T.AnimationClip("Jump",1,[
    positionTrack("Body",times,[[0,0,0],[0,-.12,0],[0,.11,0],[0,.03,0],[0,0,0]]),
    rotateTrack("Head",[1,0,0],times,[0,.17,-.13,0,0]),
    rotateTrack("LeftArm",[1,0,0],times,[0,.45,-.38,-.18,0]),
    rotateTrack("RightArm",[1,0,0],times,[0,.45,-.38,-.18,0]),
  ]);
  const dash=jump.clone(); dash.name="Dash";
  return {root,clips:[idle,jump,dash]};
}
