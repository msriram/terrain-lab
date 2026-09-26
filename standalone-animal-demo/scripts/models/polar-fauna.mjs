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

/** Four original polar silhouettes with separate walking and swimming clips. */
export function makePolarFauna(id) {
  const spec = WORLD_FAUNA[id];
  const [base, accent, light] = spec.colors.map((color, i) =>
    material(`${id}-${i}`, color),
  );
  const dark = material(`${id}-eyes`, "#1f292f");
  const root = new T.Group();
  root.name = id;
  const body = pivot(root, "Body", [0, 0, 0]);
  const left = pivot(body, "LeftFlipper", [-0.27, 0.18, 0.02]);
  const right = pivot(body, "RightFlipper", [0.27, 0.18, 0.02]);
  const tail = pivot(body, "Tail", [0, 0.12, -0.58]);
  const feet = [
    pivot(body, "FrontLeft", [-0.22, 0.06, 0.28]),
    pivot(body, "FrontRight", [0.22, 0.06, 0.28]),
    pivot(body, "BackLeft", [-0.22, 0.06, -0.37]),
    pivot(body, "BackRight", [0.22, 0.06, -0.37]),
  ];
  const e = (parent, name, mat, p, s, detail = 1) =>
    ellipsoid(parent, name, mat, p, s, detail);
  const eyes = (x, y, z) => {
    for (const sign of [-1, 1])
      e(body, `Eye${sign}`, dark, [sign * x, y, z], [0.045, 0.04, 0.04]);
  };
  if (id === "narwhal") {
    e(body, "MottledBody", base, [0, 0.2, 0], [0.32, 0.2, 0.69], 2);
    e(body, "PaleBelly", accent, [0, 0.11, 0.06], [0.28, 0.09, 0.58]);
    e(body, "RoundedHead", base, [0, 0.21, 0.53], [0.29, 0.18, 0.29], 2);
    eyes(0.25, 0.24, 0.56);
    for (const sign of [-1, 1]) {
      fin(sign < 0 ? left : right, `Pectoral${sign}`, base, [
        [0, 0, 0.2],
        [sign * 0.52, -0.02, -0.18],
        [0, 0, -0.32],
      ]);
      fin(tail, `Fluke${sign}`, base, [
        [0, 0, -0.08],
        [sign * 0.47, 0, -0.43],
        [0, 0, -0.33],
      ]);
    }
    rod(
      body,
      "IvoryTusk",
      light,
      [-0.11, 0.23, 0.75],
      [-0.12, 0.24, 1.67],
      0.062,
      0.004,
    );
    for (let i = 0; i < 13; i++) {
      const z = 0.81 + i * 0.061,
        a = i * 1.7;
      e(
        body,
        `TuskRidge${i}`,
        accent,
        [
          -0.11 + Math.cos(a) * 0.043 * (1 - i / 15),
          0.23 + Math.sin(a) * 0.043 * (1 - i / 15),
          z,
        ],
        [0.024, 0.024, 0.035],
      );
    }
  } else if (id === "polarbear") {
    e(body, "FurBody", base, [0, 0.37, -0.07], [0.4, 0.31, 0.67], 2);
    e(body, "Shoulders", accent, [0, 0.41, 0.28], [0.38, 0.3, 0.3]);
    e(body, "BroadHead", base, [0, 0.42, 0.58], [0.28, 0.23, 0.29], 2);
    e(body, "LongMuzzle", accent, [0, 0.32, 0.83], [0.19, 0.12, 0.26]);
    e(body, "Nose", dark, [0, 0.34, 1.04], [0.095, 0.06, 0.065]);
    eyes(0.22, 0.5, 0.71);
    for (const sign of [-1, 1])
      e(
        body,
        `RoundEar${sign}`,
        base,
        [sign * 0.22, 0.6, 0.45],
        [0.1, 0.11, 0.08],
      );
    feet.forEach((foot, i) => {
      e(foot, `Leg${i}`, base, [0, -0.04, 0], [0.15, 0.25, 0.16]);
      e(foot, `Paw${i}`, accent, [0, -0.25, 0.1], [0.17, 0.08, 0.22]);
    });
    e(tail, "ShortTail", base, [0, 0.18, -0.11], [0.12, 0.12, 0.14]);
  } else if (id === "penguin") {
    e(body, "BlackCoat", base, [0, 0.36, 0], [0.27, 0.39, 0.24], 2);
    e(body, "WhiteBib", accent, [0, 0.35, 0.2], [0.2, 0.3, 0.075], 2);
    e(body, "Head", base, [0, 0.75, 0.08], [0.2, 0.2, 0.2]);
    e(body, "Beak", light, [0, 0.71, 0.29], [0.075, 0.055, 0.17]);
    eyes(0.14, 0.8, 0.22);
    for (const sign of [-1, 1]) {
      const wing = sign < 0 ? left : right;
      e(
        wing,
        `Flipper${sign}`,
        base,
        [sign * 0.12, 0.17, -0.04],
        [0.12, 0.28, 0.095],
      );
      e(
        wing,
        `FlipperEdge${sign}`,
        accent,
        [sign * 0.19, 0.05, 0.02],
        [0.035, 0.18, 0.06],
      );
      e(
        feet[sign < 0 ? 0 : 1],
        `WebbedFoot${sign}`,
        light,
        [-sign * 0.08, -0.045, -0.09],
        [0.14, 0.04, 0.22],
      );
    }
    e(tail, "TailFeathers", base, [0, 0.08, -0.08], [0.19, 0.05, 0.2]);
  } else if (id === "walrus") {
    e(body, "BarrelBody", base, [0, 0.27, -0.09], [0.47, 0.3, 0.68], 2);
    e(body, "HeavyNeck", accent, [0, 0.27, 0.4], [0.38, 0.25, 0.37]);
    e(body, "Muzzle", accent, [0, 0.24, 0.73], [0.27, 0.16, 0.22]);
    eyes(0.27, 0.39, 0.64);
    for (const sign of [-1, 1]) {
      rod(
        body,
        `Tusks${sign}`,
        light,
        [sign * 0.15, 0.19, 0.83],
        [sign * 0.18, -0.23, 0.92],
        0.048,
        0.013,
      );
      for (let i = 0; i < 3; i++)
        rod(
          body,
          `Whisker${sign}-${i}`,
          light,
          [sign * 0.16, 0.22, 0.79],
          [sign * (0.34 + i * 0.04), 0.2 - i * 0.04, 0.87],
          0.01,
        );
      e(
        sign < 0 ? left : right,
        `FrontFlipper${sign}`,
        base,
        [sign * 0.16, -0.07, -0.08],
        [0.22, 0.075, 0.36],
      );
      fin(tail, `HindFlipper${sign}`, base, [
        [0, 0, 0],
        [sign * 0.3, 0, -0.34],
        [0, 0, -0.28],
      ]);
    }
  }
  const times = [0, 0.4, 0.8, 1.2, 1.6];
  const wave = [0, 0.14, 0, -0.14, 0];
  const idle = new T.AnimationClip("Idle", 1.6, [
    rotateTrack(
      "Body",
      [0, 1, 0],
      times,
      wave.map((v) => v * 0.25),
    ),
    positionTrack("Body", times, [
      [0, 0, 0],
      [0, 0.018, 0],
      [0, 0, 0],
      [0, -0.012, 0],
      [0, 0, 0],
    ]),
  ]);
  const walking = [
    rotateTrack(
      "Body",
      [0, 0, 1],
      times,
      wave.map((v) => v * 0.32),
    ),
  ];
  if (id === "polarbear" || id === "penguin")
    feet.forEach((foot, i) =>
      walking.push(
        rotateTrack(
          foot.name,
          [1, 0, 0],
          times,
          wave.map(
            (v) =>
              v *
              (i === 0 || i === 3 ? 1 : -1) *
              (id === "penguin" ? 1.3 : 2.4),
          ),
        ),
      ),
    );
  else
    for (const wing of [left, right])
      walking.push(
        rotateTrack(
          wing.name,
          [0, 0, 1],
          times,
          wave.map((v) => v * (wing === left ? 1 : -1)),
        ),
      );
  const move = new T.AnimationClip("Move", 1.6, walking);
  const dash = move.clone();
  dash.name = "Dash";
  dash.tracks.forEach((track) => {
    track.times = track.times.map((t) => t * 0.65);
  });
  dash.resetDuration();
  const swim = new T.AnimationClip("Swim", 1.6, [
    rotateTrack(
      "Body",
      [0, 0, 1],
      times,
      wave.map((v) => v * 0.35),
    ),
    rotateTrack(
      "LeftFlipper",
      [0, 0, 1],
      times,
      wave.map((v) => v * 2.4),
    ),
    rotateTrack(
      "RightFlipper",
      [0, 0, 1],
      times,
      wave.map((v) => -v * 2.4),
    ),
    rotateTrack(
      "Tail",
      [0, 1, 0],
      times,
      wave.map((v) => v * 2.2),
    ),
  ]);
  return { root, clips: [idle, move, dash, swim] };
}
