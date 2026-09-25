import {
  T,
  material,
  ellipsoid,
  pivot,
  rod,
  rotateTrack,
  positionTrack,
} from "./common.mjs";
export function makeLandAnimal(kind) {
  const root = new T.Group();
  root.name = kind;
  const deer = kind === "deer",
    rabbit = kind === "rabbit";
  const coat = material(
    "Coat",
    deer ? "#a86b36" : rabbit ? "#bfa38a" : "#687e8c",
  );
  const light = material(
    "Warm undercoat",
    deer ? "#f1d5a0" : rabbit ? "#eddfc9" : "#d7e2df",
  );
  const shade = material(
    "Back markings",
    deer ? "#775037" : rabbit ? "#997b64" : "#425969",
  );
  const black = material("Nose and eyes", "#111e28", 0.35),
    pink = material("Inner ear", "#d3a396");
  const body = pivot(root, "Body", [0, rabbit ? 0.24 : 0.54, 0]);
  ellipsoid(
    body,
    "Torso",
    coat,
    [0, 0, 0],
    rabbit ? [0.24, 0.25, 0.34] : [0.24, 0.29, 0.5],
    2,
  );
  ellipsoid(
    body,
    "Back",
    shade,
    [0, 0.19, -0.09],
    rabbit ? [0.17, 0.07, 0.23] : [0.17, 0.1, 0.36],
  );
  ellipsoid(
    body,
    "Chest",
    light,
    [0, -0.05, 0.28],
    rabbit ? [0.18, 0.17, 0.16] : [0.2, 0.23, 0.23],
  );
  const neck = pivot(body, "Neck", [0, deer ? 0.17 : 0.08, 0.31]);
  if (deer)
    ellipsoid(neck, "Long neck", coat, [0, 0.22, 0.04], [0.145, 0.38, 0.18]);
  const hp = [
    0,
    deer ? 0.49 : rabbit ? 0.12 : 0.15,
    deer ? 0.09 : rabbit ? 0.08 : 0.2,
  ];
  const head = pivot(neck, "Head", hp);
  ellipsoid(
    head,
    "Face",
    coat,
    [0, 0, 0.04],
    rabbit ? [0.18, 0.19, 0.22] : [0.16, 0.2, 0.23],
    2,
  );
  ellipsoid(
    head,
    "Muzzle",
    light,
    [0, -0.065, rabbit ? 0.2 : 0.22],
    rabbit ? [0.12, 0.09, 0.105] : [0.105, 0.1, 0.19],
  );
  ellipsoid(
    head,
    "Nose",
    black,
    [0, -0.035, rabbit ? 0.29 : 0.39],
    [0.055, 0.042, 0.035],
  );
  for (const sign of [-1, 1]) {
    ellipsoid(
      head,
      "Eye" + sign,
      black,
      [sign * (rabbit ? 0.153 : 0.14), 0.048, 0.15],
      [0.031, 0.037, 0.035],
    );
    ellipsoid(
      head,
      "Glint" + sign,
      light,
      [sign * (rabbit ? 0.16 : 0.15), 0.063, 0.17],
      [0.01, 0.012, 0.01],
    );
    const ear = pivot(head, sign < 0 ? "EarL" : "EarR", [
      sign * 0.11,
      0.15,
      -0.035,
    ]);
    ear.rotation.z = sign * -0.19;
    ellipsoid(
      ear,
      "Ear outer" + sign,
      coat,
      [0, rabbit ? 0.24 : 0.12, 0],
      rabbit ? [0.067, 0.3, 0.045] : [0.09, 0.18, 0.045],
    );
    ellipsoid(
      ear,
      "Ear inner" + sign,
      pink,
      [0, rabbit ? 0.25 : 0.12, 0.03],
      rabbit ? [0.035, 0.22, 0.017] : [0.05, 0.12, 0.015],
    );
  }
  if (deer) {
    for (const sign of [-1, 1]) {
      const antler = material("Antler bone", "#dfc39a");
      rod(
        head,
        "Antler stem" + sign,
        antler,
        [sign * 0.07, 0.12, -0.09],
        [sign * 0.2, 0.66, -0.29],
        0.038,
        0.018,
      );
      rod(
        head,
        "Antler tip" + sign,
        antler,
        [sign * 0.2, 0.66, -0.29],
        [sign * 0.32, 0.82, -0.2],
        0.02,
        0.009,
      );
      rod(
        head,
        "Antler fork" + sign,
        antler,
        [sign * 0.16, 0.47, -0.22],
        [sign * 0.34, 0.62, -0.08],
        0.023,
        0.008,
      );
      rod(
        head,
        "Antler tine" + sign,
        antler,
        [sign * 0.11, 0.32, -0.15],
        [sign * 0.05, 0.51, 0.025],
        0.02,
        0.008,
      );
    }
    // Dorsal spots retain identity in the projection view.
    for (const sign of [-1, 1])
      for (let i = 0; i < 4; i++)
        ellipsoid(
          body,
          "Spot" + sign + "_" + i,
          light,
          [sign * 0.14, 0.22, 0.2 - i * 0.14],
          [0.034, 0.015, 0.046],
        );
  }
  const tail = pivot(body, "Tail", [0, 0.1, -0.39]);
  if (rabbit)
    ellipsoid(tail, "Cotton tail", light, [0, 0.035, -0.02], [0.11, 0.11, 0.1]);
  else {
    const t = ellipsoid(
      tail,
      "Tail fur",
      deer ? light : shade,
      [0, -0.07, -0.22],
      deer ? [0.075, 0.09, 0.16] : [0.115, 0.13, 0.36],
    );
    t.rotation.x = -0.3;
  }
  const legNames = ["FrontL", "FrontR", "BackL", "BackR"];
  legNames.forEach((name, i) => {
    const back = i >= 2,
      sign = i % 2 === 0 ? -1 : 1;
    const leg = pivot(body, name, [
      sign * (rabbit ? 0.16 : 0.165),
      rabbit ? -0.09 : -0.16,
      back ? -0.3 : 0.3,
    ]);
    if (rabbit) {
      ellipsoid(
        leg,
        "Haunch" + name,
        coat,
        [0, -0.035, -0.01],
        back ? [0.13, 0.18, 0.18] : [0.067, 0.11, 0.08],
      );
      ellipsoid(
        leg,
        "Paw" + name,
        light,
        [0, -0.14, 0.08],
        back ? [0.085, 0.05, 0.18] : [0.055, 0.045, 0.12],
      );
    } else {
      rod(leg, "Leg" + name, coat, [0, 0, 0], [0, -0.27, -0.035], 0.045, 0.065);
      rod(
        leg,
        "Ankle" + name,
        coat,
        [0, -0.27, -0.035],
        [0, -0.36, 0.005],
        0.027,
        0.035,
      );
      ellipsoid(
        leg,
        "Foot" + name,
        deer ? black : light,
        [0, -0.37, 0.045],
        [0.052, 0.055, 0.09],
      );
    }
  });
  const t = [0, 0.25, 0.5, 0.75, 1];
  const walkTracks = legNames.map((name, i) =>
    rotateTrack(name, [1, 0, 0], t, [
      0,
      (i === 0 || i === 3 ? 1 : -1) * 0.5,
      0,
      (i === 0 || i === 3 ? -1 : 1) * 0.5,
      0,
    ]),
  );
  walkTracks.push(rotateTrack("Tail", [0, 1, 0], t, [0, 0.15, 0, -0.15, 0]));
  const clips = [new T.AnimationClip("Walk", 1, walkTracks)];
  const run = clips[0].clone();
  run.name = "Run";
  run.scale = 1;
  run.tracks.forEach((track) => {
    track.times = track.times.map((v) => v * 0.58);
  });
  run.resetDuration();
  clips.push(run);
  const idle = deer ? "Graze" : rabbit ? "Nibble" : "Survey";
  clips.push(
    new T.AnimationClip(idle, 3, [
      rotateTrack(
        "Neck",
        [1, 0, 0],
        [0, 0.7, 1.5, 2.3, 3],
        deer
          ? [0, 0.75, 0.85, 0.75, 0]
          : rabbit
            ? [0, 0.17, 0.08, 0.17, 0]
            : [0, 0, 0.1, 0, 0],
      ),
      rotateTrack(
        "Head",
        [0, 1, 0],
        [0, 0.7, 1.5, 2.3, 3],
        [0, -0.22, 0, 0.22, 0],
      ),
    ]),
  );
  clips.push(
    new T.AnimationClip("Alert", 1.5, [
      rotateTrack(
        "Head",
        [0, 1, 0],
        [0, 0.4, 0.8, 1.2, 1.5],
        [0, -0.4, 0, 0.4, 0],
      ),
    ]),
  );
  if (rabbit) {
    clips.push(
      new T.AnimationClip("Hop", 0.65, [
        positionTrack(
          "Body",
          [0, 0.16, 0.32, 0.48, 0.65],
          [
            [0, 0.24, 0],
            [0, 0.36, 0],
            [0, 0.39, 0],
            [0, 0.28, 0],
            [0, 0.24, 0],
          ],
        ),
        ...legNames.map((name, i) =>
          rotateTrack(
            name,
            [1, 0, 0],
            [0, 0.16, 0.32, 0.48, 0.65],
            [0, i < 2 ? -0.65 : 0.8, 0, i < 2 ? 0.4 : -0.5, 0],
          ),
        ),
      ]),
    );
  }
  if (kind === "wolf")
    clips.push(
      new T.AnimationClip("Howl", 2.8, [
        rotateTrack("Neck", [1, 0, 0], [0, 0.7, 2, 2.8], [0, -0.65, -0.65, 0]),
      ]),
    );
  return { root, clips };
}
