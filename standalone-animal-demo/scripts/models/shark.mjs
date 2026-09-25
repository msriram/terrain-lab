import { T, material, ellipsoid, pivot, fin, rotateTrack } from "./common.mjs";
export function makeShark() {
  const root = new T.Group();
  root.name = "ReefShark";
  const blue = material("Slate blue", "#568a9e", 0.45),
    white = material("Pale belly", "#cadcd9", 0.6),
    dark = material("Eyes", "#102734", 0.25);
  ellipsoid(root, "Streamlined body", blue, [0, 0, 0], [0.24, 0.22, 0.8], 2);
  ellipsoid(
    root,
    "Underbelly",
    white,
    [0, -0.105, 0.13],
    [0.217, 0.13, 0.66],
    2,
  );
  ellipsoid(root, "Broad head", blue, [0, 0.005, 0.58], [0.25, 0.17, 0.32], 2);
  ellipsoid(root, "Nose", blue, [0, -0.012, 0.82], [0.2, 0.1, 0.16]);
  for (const sign of [-1, 1]) {
    ellipsoid(
      root,
      "Eye" + sign,
      dark,
      [sign * 0.224, 0.045, 0.64],
      [0.026, 0.025, 0.037],
    );
    for (let i = 0; i < 3; i++)
      ellipsoid(
        root,
        "Gill" + sign + "_" + i,
        dark,
        [sign * 0.228, 0.018, 0.33 - i * 0.055],
        [0.009, 0.075, 0.008],
      );
    fin(root, "Pectoral" + sign, blue, [
      [sign * 0.12, -0.05, 0.35],
      [sign * 0.64, -0.12, -0.28],
      [sign * 0.12, -0.04, -0.09],
    ]);
    fin(root, "Pelvic" + sign, blue, [
      [sign * 0.1, -0.08, -0.25],
      [sign * 0.31, -0.1, -0.56],
      [sign * 0.09, -0.08, -0.47],
    ]);
  }
  fin(root, "Dorsal", blue, [
    [0, 0.16, 0.3],
    [0, 0.61, -0.16],
    [0, 0.18, -0.28],
  ]);
  const tail = pivot(root, "Tail", [0, 0, -0.62]);
  ellipsoid(tail, "Tail stalk", blue, [0, 0, -0.15], [0.09, 0.1, 0.25]);
  fin(tail, "Upper caudal", blue, [
    [0, 0, -0.15],
    [0, 0.43, -0.65],
    [0, 0.03, -0.5],
  ]);
  fin(tail, "Lower caudal", blue, [
    [0, 0, -0.15],
    [0, -0.26, -0.56],
    [0, 0.03, -0.5],
  ]);
  const swim = new T.AnimationClip("Swim", 1.4, [
    rotateTrack(
      "Tail",
      [0, 1, 0],
      [0, 0.35, 0.7, 1.05, 1.4],
      [0, 0.28, 0, -0.28, 0],
    ),
  ]);
  const hunt = swim.clone();
  hunt.name = "Hunt";
  hunt.tracks[0].times = hunt.tracks[0].times.map((v) => v * 0.55);
  hunt.resetDuration();
  return { root, clips: [swim, hunt] };
}
