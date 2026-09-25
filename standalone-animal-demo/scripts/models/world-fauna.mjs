import {
  T,
  material,
  ellipsoid,
  pivot,
  rod,
  fin,
  rotateTrack,
  positionTrack,
} from "./common.mjs";
import { WORLD_FAUNA } from "../../src/catalog/world-fauna.js";

/** Individually authored silhouettes built from reusable low-poly parts. */
export function makeWorldFauna(id) {
  const spec = WORLD_FAUNA[id];
  if (!spec) throw new Error(`Unknown signature animal ${id}`);
  const [base, accent, light] = spec.colors.map((color, i) =>
    material(`${id}-${i}`, color, 0.58),
  );
  const root = new T.Group();
  root.name = id;
  const body = pivot(root, "Body", [0, 0, 0]);
  const left = pivot(body, "LeftWing", [-0.19, 0.07, 0.02]),
    right = pivot(body, "RightWing", [0.19, 0.07, 0.02]);
  const tail = pivot(body, "Tail", [0, 0.03, -0.38]);
  const e = (name, mat, p, s, detail = 1, parent = body) =>
    ellipsoid(parent, name, mat, p, s, detail);
  const eyes = (z = 0.35, x = 0.13, y = 0.16) => {
    for (const sign of [-1, 1])
      e(`Eye${sign}`, light, [sign * x, y, z], [0.045, 0.026, 0.045]);
  };
  const sweep = (group, sign, mat = accent, reach = 0.56) => {
    fin(group, `Membrane${sign}`, mat, [
      [0, 0, 0.22],
      [sign * reach, 0.025, -0.23],
      [0, 0, -0.31],
    ]);
    e(
      `WingTip${sign}`,
      light,
      [sign * reach * 0.55, 0.025, -0.07],
      [reach * 0.35, 0.025, 0.065],
      1,
      group,
    );
  };
  const legs = (count = 4, mat = base) => {
    for (let i = 0; i < count; i++) {
      const sign = i % 2 ? 1 : -1,
        z = 0.24 - Math.floor(i / 2) * 0.32;
      rod(
        body,
        `Leg${i}`,
        mat,
        [sign * 0.18, 0, z],
        [sign * (0.32 + (i % 3) * 0.045), -0.06, z - 0.14],
        0.035,
      );
    }
  };
  const antenna = () => {
    for (const sign of [-1, 1]) {
      rod(
        body,
        `Antenna${sign}`,
        accent,
        [sign * 0.1, 0.13, 0.39],
        [sign * 0.25, 0.2, 0.62],
        0.02,
      );
      e(`Tip${sign}`, light, [sign * 0.25, 0.2, 0.62], [0.05, 0.05, 0.05]);
    }
  };
  const form = spec.form;
  if (["owl", "bird", "peacock", "inkbird"].includes(form)) {
    e("Torso", base, [0, 0.08, 0], [0.24, 0.16, 0.47], 2);
    e("Head", base, [0, 0.17, 0.4], [0.22, 0.18, 0.22], 2);
    e("Beak", accent, [0, 0.14, 0.62], [0.08, 0.07, 0.16]);
    eyes(0.49, 0.13, 0.25);
    sweep(left, -1, form === "inkbird" ? light : accent, 0.61);
    sweep(right, 1, form === "owl" ? light : accent, 0.61);
    legs(2, accent);
    for (let i = -1; i <= 1; i++)
      e(
        `TailFeather${i}`,
        i === 0 ? accent : light,
        [i * 0.17, 0.03, -0.38],
        [0.1, 0.035, form === "peacock" ? 0.62 : 0.35],
        1,
        tail,
      );
    if (form === "owl") {
      for (const side of [-1, 1])
        e(
          `EarTuft${side}`,
          light,
          [side * 0.18, 0.32, 0.47],
          [0.08, 0.16, 0.08],
        );
    }
    if (form === "peacock")
      for (let i = -2; i <= 2; i++) {
        const q = i * 0.28;
        e(
          `Fan${i}`,
          accent,
          [Math.sin(q) * 0.4, 0.06, -0.67],
          [0.13, 0.04, 0.42],
          1,
          tail,
        );
        e(
          `FanEye${i}`,
          light,
          [Math.sin(q) * 0.52, 0.11, -0.91],
          [0.065, 0.03, 0.08],
          1,
          tail,
        );
      }
  } else if (["moth", "butterfly", "signalmoth"].includes(form)) {
    e("Thorax", base, [0, 0.06, 0], [0.14, 0.13, 0.46]);
    e("Head", accent, [0, 0.09, 0.41], [0.13, 0.11, 0.15]);
    eyes(0.49, 0.09, 0.14);
    antenna();
    for (const sign of [-1, 1]) {
      const wing = sign < 0 ? left : right;
      e(
        `ForeWing${sign}`,
        accent,
        [sign * 0.36, 0.03, 0.09],
        [0.48, 0.035, 0.3],
        1,
        wing,
      );
      e(
        `HindWing${sign}`,
        base,
        [sign * 0.3, 0.02, -0.25],
        [0.4, 0.03, 0.24],
        1,
        wing,
      );
      for (let i = 0; i < 3; i++)
        e(
          `Spot${sign}-${i}`,
          light,
          [sign * (0.19 + i * 0.16), 0.064, 0.2 - i * 0.19],
          [0.09, 0.012, 0.07],
          1,
          wing,
        );
      if (form === "signalmoth")
        rod(
          wing,
          `Circuit${sign}`,
          light,
          [0, 0.07, 0],
          [sign * 0.68, 0.07, 0.11],
          0.014,
        );
    }
    e("Abdomen", base, [0, 0.03, -0.36], [0.15, 0.11, 0.28], 1, tail);
  } else if (
    ["beetle", "stagbeetle", "clockbeetle", "electronbug"].includes(form)
  ) {
    e("Carapace", base, [0, 0.08, -0.08], [0.35, 0.18, 0.45], 2);
    e("Head", accent, [0, 0.08, 0.39], [0.22, 0.14, 0.2]);
    eyes(0.51, 0.16, 0.16);
    legs(6, accent);
    antenna();
    for (const sign of [-1, 1])
      e(
        `Elytron${sign}`,
        sign < 0 ? accent : base,
        [sign * 0.17, 0.22, -0.09],
        [0.18, 0.04, 0.37],
      );
    if (form === "stagbeetle")
      for (const sign of [-1, 1]) {
        rod(
          body,
          `Mandible${sign}`,
          light,
          [sign * 0.13, 0.1, 0.48],
          [sign * 0.28, 0.1, 0.79],
          0.045,
        );
        rod(
          body,
          `MandibleTip${sign}`,
          light,
          [sign * 0.28, 0.1, 0.79],
          [sign * 0.09, 0.1, 0.87],
          0.03,
        );
      }
    if (form === "clockbeetle")
      for (let i = 0; i < 7; i++) {
        const q = (i * Math.PI * 2) / 7;
        e(
          `Rivet${i}`,
          light,
          [Math.sin(q) * 0.25, 0.27, -0.08 + Math.cos(q) * 0.32],
          [0.045, 0.025, 0.045],
        );
      }
    if (form === "electronbug")
      for (let i = 0; i < 6; i++) {
        const q = (i * Math.PI) / 3;
        e(
          `Electron${i}`,
          light,
          [Math.sin(q) * 0.41, 0.16, -0.1 + Math.cos(q) * 0.47],
          [0.045, 0.045, 0.045],
        );
      }
    if (form === "beetle")
      e("GlowAbdomen", light, [0, 0.22, -0.28], [0.18, 0.045, 0.16]);
  } else if (["scorpion", "crab"].includes(form)) {
    e("Shell", base, [0, 0.08, 0], [0.36, 0.17, 0.35], 2);
    eyes(0.27, 0.18, 0.18);
    legs(8, accent);
    for (const sign of [-1, 1]) {
      rod(
        body,
        `ClawArm${sign}`,
        accent,
        [sign * 0.23, 0.04, 0.2],
        [sign * 0.58, 0.04, 0.42],
        0.065,
      );
      e(`Claw${sign}`, light, [sign * 0.64, 0.05, 0.48], [0.14, 0.09, 0.14]);
      rod(
        body,
        `Pincer${sign}`,
        base,
        [sign * 0.67, 0.05, 0.53],
        [sign * 0.6, 0.05, 0.68],
        0.035,
      );
    }
    if (form === "scorpion") {
      for (let i = 0; i < 4; i++)
        e(
          `TailSegment${i}`,
          i % 2 ? accent : base,
          [0, 0.02 + i * 0.07, -0.14 - i * 0.17],
          [0.11 - i * 0.015, 0.09, 0.13],
          1,
          tail,
        );
      e("Stinger", light, [0, 0.28, -0.84], [0.07, 0.07, 0.18], 1, tail);
    } else e("CrabFan", accent, [0, 0.04, -0.35], [0.22, 0.06, 0.18], 1, tail);
  } else if (["hopper", "goat", "ox"].includes(form)) {
    const bulk = form === "ox" ? 0.43 : 0.28;
    e(
      "Torso",
      base,
      [0, 0.09, -0.06],
      [bulk, 0.24, form === "ox" ? 0.54 : 0.43],
      2,
    );
    e(
      "Head",
      accent,
      [0, 0.18, 0.43],
      [form === "ox" ? 0.25 : 0.18, 0.17, 0.23],
    );
    eyes(0.51, 0.16, 0.25);
    legs(4, accent);
    if (form === "hopper") {
      for (const sign of [-1, 1]) {
        rod(
          body,
          `HindThigh${sign}`,
          accent,
          [sign * 0.23, 0.04, -0.2],
          [sign * 0.51, -0.09, -0.47],
          0.09,
        );
        rod(
          body,
          `HindFoot${sign}`,
          light,
          [sign * 0.51, -0.09, -0.47],
          [sign * 0.62, -0.08, -0.79],
          0.045,
        );
      }
      for (const sign of [-1, 1])
        e(`Ear${sign}`, light, [sign * 0.13, 0.28, 0.56], [0.065, 0.18, 0.1]);
    } else {
      for (const sign of [-1, 1]) {
        rod(
          body,
          `Horn${sign}`,
          light,
          [sign * 0.16, 0.26, 0.44],
          [sign * (form === "ox" ? 0.43 : 0.34), 0.31, 0.52],
          0.065,
        );
        rod(
          body,
          `HornTip${sign}`,
          light,
          [sign * (form === "ox" ? 0.43 : 0.34), 0.31, 0.52],
          [sign * (form === "ox" ? 0.48 : 0.26), 0.38, 0.66],
          0.045,
        );
      }
      if (form === "goat")
        e("Beard", accent, [0, 0.01, 0.59], [0.09, 0.13, 0.12]);
    }
    e("TailTuft", accent, [0, 0.08, -0.35], [0.1, 0.12, 0.2], 1, tail);
  } else if (form === "manta") {
    e("Disc", base, [0, 0.04, 0], [0.28, 0.1, 0.43], 2);
    eyes(0.27, 0.15, 0.13);
    for (const sign of [-1, 1]) {
      const wing = sign < 0 ? left : right;
      fin(wing, `RayWing${sign}`, base, [
        [0, 0.08, 0.4],
        [sign * 0.98, 0.09, -0.06],
        [0, 0.08, -0.55],
      ]);
      fin(wing, `RayPattern${sign}`, accent, [
        [0, 0.1, 0.26],
        [sign * 0.7, 0.11, -0.07],
        [0, 0.1, -0.25],
      ]);
      rod(
        wing,
        `LeadingEdge${sign}`,
        light,
        [0, 0.11, 0.37],
        [sign * 0.93, 0.11, -0.08],
        0.028,
      );
    }
    rod(tail, "Whip", light, [0, 0, 0], [0, 0, -0.86], 0.025);
  } else if (form === "seahorse") {
    for (let i = 0; i < 6; i++)
      e(
        `BodySegment${i}`,
        i % 2 ? accent : base,
        [Math.sin(i * 0.6) * 0.08, 0.08, 0.38 - i * 0.17],
        [0.13 - i * 0.01, 0.11, 0.14],
      );
    e("HorseHead", base, [0, 0.13, 0.52], [0.19, 0.16, 0.19]);
    rod(body, "Snout", accent, [0, 0.1, 0.55], [0, 0.1, 0.88], 0.055);
    eyes(0.58, 0.14, 0.22);
    for (let i = 0; i < 4; i++)
      fin(body, `DorsalFin${i}`, light, [
        [0.08, 0.12, 0.32 - i * 0.16],
        [0.34, 0.12, 0.23 - i * 0.16],
        [0.08, 0.12, 0.15 - i * 0.16],
      ]);
    e("CurledTail", accent, [0.12, 0.05, -0.12], [0.17, 0.08, 0.15], 1, tail);
  } else if (form === "serpent") {
    e("Head", base, [0, 0.11, 0.5], [0.24, 0.16, 0.28], 2);
    eyes(0.64, 0.17, 0.2);
    e("ForkedTongue", light, [0, 0.08, 0.81], [0.06, 0.025, 0.2]);
    for (let i = 0; i < 6; i++)
      e(
        `Coil${i}`,
        i % 2 ? base : accent,
        [Math.sin(i * 0.7) * 0.08, 0.07, 0.32 - i * 0.22],
        [0.21 - i * 0.018, 0.12, 0.19],
      );
    e("TailTip", light, [0, 0.04, -0.47], [0.08, 0.08, 0.36], 1, tail);
  } else if (form === "snail") {
    e("Foot", base, [0, 0.02, 0.08], [0.29, 0.08, 0.56], 2);
    e("Shell", accent, [0, 0.25, -0.18], [0.36, 0.34, 0.37], 2);
    const spiral = new T.Mesh(new T.TorusGeometry(0.23, 0.037, 5, 24), light);
    spiral.rotation.x = -Math.PI / 2;
    spiral.position.set(0, 0.55, -0.18);
    body.add(spiral);
    for (const sign of [-1, 1]) {
      rod(
        body,
        `Stalk${sign}`,
        base,
        [sign * 0.13, 0.07, 0.43],
        [sign * 0.21, 0.23, 0.66],
        0.035,
      );
      e(`Eye${sign}`, light, [sign * 0.21, 0.23, 0.66], [0.075, 0.075, 0.075]);
    }
    e("ShellTip", light, [0, 0.08, -0.24], [0.1, 0.1, 0.14], 1, tail);
  } else if (form === "angler") {
    e("DeepHead", base, [0, 0.09, 0.15], [0.37, 0.24, 0.46], 2);
    e("Jaw", accent, [0, -0.04, 0.48], [0.31, 0.08, 0.22]);
    eyes(0.41, 0.2, 0.24);
    for (let i = -3; i <= 3; i++)
      e(`Tooth${i}`, light, [i * 0.075, 0.01, 0.67], [0.024, 0.06, 0.04]);
    rod(body, "LureStalk", accent, [0, 0.24, 0.26], [0, 0.32, 0.69], 0.035);
    e("BioluminescentLure", light, [0, 0.33, 0.73], [0.11, 0.1, 0.11]);
    for (const sign of [-1, 1])
      sweep(sign < 0 ? left : right, sign, accent, 0.48);
    e("CaudalFin", light, [0, 0.02, -0.36], [0.31, 0.03, 0.22], 1, tail);
  } else if (form === "whale") {
    e("DreamBody", base, [0, 0.08, 0], [0.35, 0.23, 0.7], 2);
    e("Head", accent, [0, 0.1, 0.57], [0.36, 0.18, 0.29]);
    eyes(0.65, 0.22, 0.22);
    for (const sign of [-1, 1])
      sweep(sign < 0 ? left : right, sign, accent, 0.55);
    for (const sign of [-1, 1])
      fin(tail, `Fluke${sign}`, light, [
        [0, 0, -0.18],
        [sign * 0.47, 0, -0.56],
        [0, 0, -0.46],
      ]);
    for (let i = 0; i < 7; i++) {
      const q = i * 2.4;
      e(
        `DreamStar${i}`,
        light,
        [Math.sin(q) * 0.23, 0.3, Math.cos(q) * 0.43],
        [0.045, 0.025, 0.045],
      );
    }
  }
  const keys = [0, 0.4, 0.8, 1.2, 1.6],
    wave = [0, 0.18, 0, -0.18, 0],
    flap = [0, 0.24, 0, -0.24, 0];
  const baseTracks = [
    rotateTrack("Body", [0, 1, 0], keys, wave),
    positionTrack("Body", keys, [
      [0, 0, 0],
      [0, 0.035, 0],
      [0, 0, 0],
      [0, -0.015, 0],
      [0, 0, 0],
    ]),
    rotateTrack("LeftWing", [0, 0, 1], keys, flap),
    rotateTrack(
      "RightWing",
      [0, 0, 1],
      keys,
      flap.map((x) => -x),
    ),
    rotateTrack("Tail", [0, 1, 0], keys, [0, 0.28, 0, -0.28, 0]),
  ];
  const idle = new T.AnimationClip("Idle", 1.6, baseTracks),
    move = idle.clone(),
    dash = idle.clone();
  move.name = "Move";
  dash.name = "Dash";
  dash.tracks.forEach((track) => {
    track.times = track.times.map((t) => t * 0.65);
  });
  dash.resetDuration();
  return { root, clips: [idle, move, dash] };
}
