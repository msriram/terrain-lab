import {
  T,
  material,
  ellipsoid,
  pivot,
  rod,
  fin,
  rotateTrack,
} from "./common.mjs";
export function makeOtherworld(id) {
  const root = new T.Group();
  root.name = id;
  const palette = {
    starseed: ["#ffda83", "#fa8ce7", "#f6fff1"],
    voidray: ["#8076d9", "#57d9e8", "#e4a4ff"],
    microbe: ["#9bef89", "#56cdb4", "#e8ffb3"],
    phage: ["#b990f5", "#e4699e", "#8fe4f6"],
    drone: ["#365464", "#52e7d6", "#ffad69"],
  }[id];
  const [a, b, c] = palette.map((color, i) =>
    material(`${id}-${i}`, color, 0.36),
  );
  const moving = pivot(root, "Motion", [0, 0, 0]);
  if (id === "starseed") {
    ellipsoid(moving, "Living star", a, [0, 0, 0], [0.29, 0.15, 0.34], 2);
    for (let i = 0; i < 6; i++) {
      const q = (i * Math.PI) / 3;
      const spike = new T.Mesh(
        new T.ConeGeometry(0.105, 0.37, 5),
        i % 2 ? b : c,
      );
      spike.position.set(Math.sin(q) * 0.32, 0.02, Math.cos(q) * 0.32);
      spike.rotation.x = Math.PI / 2 - q;
      moving.add(spike);
    }
    ellipsoid(moving, "Stellar core", c, [0, 0.12, 0.04], [0.14, 0.075, 0.15]);
  } else if (id === "voidray") {
    ellipsoid(moving, "Ray body", a, [0, 0.02, 0], [0.3, 0.13, 0.49], 2);
    for (const side of [-1, 1]) {
      fin(moving, "Wing" + side, b, [
        [side * 0.12, 0.03, 0.32],
        [side * 0.78, 0.02, -0.18],
        [side * 0.11, 0.02, -0.3],
      ]);
      ellipsoid(
        moving,
        "Eye" + side,
        c,
        [side * 0.17, 0.12, 0.24],
        [0.05, 0.035, 0.06],
      );
    }
    rod(moving, "Spine", c, [0, 0, -0.3], [0, 0, -0.91], 0.035);
  } else if (id === "microbe") {
    ellipsoid(moving, "Cell membrane", a, [0, 0, 0], [0.34, 0.18, 0.51], 2);
    ellipsoid(moving, "Nucleus", b, [0, 0.15, 0.04], [0.16, 0.05, 0.22]);
    for (let i = 0; i < 8; i++) {
      const q = (i * Math.PI) / 4;
      ellipsoid(
        moving,
        "Organelle" + i,
        c,
        [Math.sin(q) * 0.25, 0.13, Math.cos(q) * 0.33],
        [0.065, 0.035, 0.09],
      );
    }
    const tail = pivot(moving, "Flagellum", [0, 0, -0.42]);
    rod(tail, "Tail filament", b, [0, 0, 0], [0, 0, -0.54], 0.035);
  } else if (id === "phage") {
    ellipsoid(moving, "Capsid", a, [0, 0.15, 0.2], [0.22, 0.25, 0.24], 1);
    rod(moving, "Neck", b, [0, 0.08, 0.05], [0, 0.05, -0.48], 0.075);
    for (let i = 0; i < 6; i++) {
      const q = (i * Math.PI) / 3;
      const x = Math.sin(q) * 0.31,
        z = -0.4 + Math.cos(q) * 0.13;
      rod(moving, "Leg" + i, c, [0, 0.03, -0.37], [x, -0.03, z], 0.035);
    }
  } else {
    ellipsoid(moving, "Chassis", a, [0, 0.1, 0], [0.35, 0.16, 0.42], 1);
    ellipsoid(moving, "Sensor", b, [0, 0.22, 0.2], [0.17, 0.055, 0.16]);
    for (const side of [-1, 1]) {
      rod(
        moving,
        "Arm" + side,
        b,
        [side * 0.2, 0.08, 0],
        [side * 0.6, 0.07, 0],
        0.045,
      );
      const rotor = pivot(moving, "Rotor" + (side > 0 ? "R" : "L"), [
        side * 0.62,
        0.07,
        0,
      ]);
      ellipsoid(rotor, "Blade", c, [0, 0, 0], [0.42, 0.015, 0.065]);
    }
    rod(moving, "Antenna", c, [0, 0.12, -0.29], [0, 0.28, -0.41], 0.026);
  }
  const tracks = [
    rotateTrack(
      "Motion",
      [0, 1, 0],
      [0, 0.4, 0.8, 1.2, 1.6],
      [0, 0.12, 0, -0.12, 0],
    ),
  ];
  if (id === "microbe")
    tracks.push(
      rotateTrack(
        "Flagellum",
        [0, 1, 0],
        [0, 0.4, 0.8, 1.2, 1.6],
        [0, 0.4, 0, -0.4, 0],
      ),
    );
  if (id === "drone")
    for (const side of ["L", "R"])
      tracks.push(
        rotateTrack(
          "Rotor" + side,
          [0, 1, 0],
          [0, 0.4, 0.8, 1.2, 1.6],
          [0, Math.PI, Math.PI * 2, Math.PI * 3, Math.PI * 4],
        ),
      );
  const idle = new T.AnimationClip("Float", 1.6, tracks),
    move = idle.clone();
  move.name = "Glide";
  const fast = idle.clone();
  fast.name = "Dash";
  fast.tracks[0].times = fast.tracks[0].times.map((v) => v * 0.55);
  fast.resetDuration();
  return { root, clips: [idle, move, fast] };
}
