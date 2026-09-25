import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
/** Original low-poly scenery kits. Static parts merge by material for low draw cost. */
export function createPropFactory() {
  const cache = new Map(),
    resources = [];
  function build(kind, colors) {
    const key = kind + colors.join();
    if (cache.has(key)) return cache.get(key).clone();
    const root = new T.Group();
    const mats = colors.map(
      (color, i) =>
        new T.MeshStandardMaterial({
          color,
          roughness: 0.75,
          flatShading: true,
          metalness: ["chest", "trident", "gear", "pipe"].includes(kind)
            ? 0.4
            : 0,
          emissive: color,
          emissiveIntensity: ["crystal", "jellyfish", "vent"].includes(kind)
            ? 0.12
            : 0,
        }),
    );
    const wood = new T.MeshStandardMaterial({
      color: "#6b5944",
      roughness: 0.9,
    });
    const gold = new T.MeshStandardMaterial({
      color: "#e5bb58",
      metalness: 0.5,
      roughness: 0.4,
    });
    const put = (
      geometry,
      material,
      p = [0, 0, 0],
      s = [1, 1, 1],
      r = [0, 0, 0],
    ) => {
      const m = new T.Mesh(geometry, material);
      m.position.set(...p);
      m.scale.set(...s);
      m.rotation.set(...r);
      root.add(m);
      return m;
    };
    const ball = (p, s, mat = mats[0]) =>
      put(new T.IcosahedronGeometry(1, 1), mat, p, s);
    const box = (p, s, mat = mats[0], r) =>
      put(new T.BoxGeometry(1, 1, 1), mat, p, s, r);
    const rod = (a, b, r, mat = mats[0]) => {
      const av = new T.Vector3(...a),
        bv = new T.Vector3(...b),
        direction = bv.clone().sub(av);
      const m = put(
        new T.CylinderGeometry(r * 0.7, r, direction.length(), 7),
        mat,
        av.add(bv).multiplyScalar(0.5).toArray(),
      );
      m.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        direction.normalize(),
      );
      return m;
    };
    const cone = (p, r, h, mat = mats[0], sides = 7) =>
      put(new T.ConeGeometry(r, h, sides), mat, p);
    const ring = (p, r, t, mat = mats[0], rotation = [Math.PI / 2, 0, 0]) =>
      put(new T.TorusGeometry(r, t, 6, 24), mat, p, [1, 1, 1], rotation);
    if (["tree", "snowpine"].includes(kind)) {
      rod([0, 0, 0], [0, 0.95, 0], 0.1, wood);
      if (kind === "snowpine") {
        for (let i = 0; i < 3; i++)
          cone(
            [0, 0.5 + i * 0.32, 0],
            0.55 - i * 0.1,
            0.8,
            i === 2 ? mats[1] : mats[0],
          );
      } else {
        ball([0, 0.87, 0], [0.65, 0.6, 0.6]);
        ball([-0.4, 0.68, 0.16], [0.4, 0.4, 0.4], mats[1]);
        ball([0.35, 0.75, -0.2], [0.45, 0.43, 0.4], mats[1]);
      }
    } else if (kind === "palm") {
      rod([0, 0, 0], [0.1, 0.9, 0.06], 0.075, wood);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const m = ball(
          [Math.cos(a) * 0.33, 0.91, Math.sin(a) * 0.33],
          [0.56, 0.035, 0.14],
        );
        m.rotation.y = -a;
      }
      ball([0.1, 0.95, 0.06], [0.13, 0.13, 0.13], mats[2]);
    } else if (kind === "cactus") {
      rod([0, 0, 0], [0, 0.85, 0], 0.14);
      for (const sign of [-1, 1]) {
        rod([0, 0.4, 0], [sign * 0.3, 0.4, 0], 0.08);
        rod([sign * 0.3, 0.4, 0], [sign * 0.3, 0.65, 0], 0.08);
      }
    } else if (kind === "flowers" || kind === "seaweed") {
      for (let i = 0; i < 5; i++) {
        const a = i * 2.4,
          x = Math.cos(a) * 0.32,
          z = Math.sin(a) * 0.32;
        rod(
          [x, 0, z],
          [x * 0.8, 0.6 + i * 0.08, z * 0.8],
          kind === "seaweed" ? 0.04 : 0.02,
          mats[0],
        );
        if (kind === "flowers")
          ball(
            [x * 0.8, 0.6 + i * 0.08, z * 0.8],
            [0.15, 0.065, 0.15],
            mats[(i % 2) + 1],
          );
        else {
          ball([x, 0.35, z], [0.1, 0.45, 0.035], mats[i % 2]);
        }
      }
    } else if (kind === "coral") {
      for (let i = 0; i < 6; i++) {
        const a = i * 2.4,
          x = Math.cos(a) * 0.38,
          z = Math.sin(a) * 0.38;
        rod([0, 0, 0], [x, 0.5, z], 0.08, mats[i % 2]);
        rod([x, 0.5, z], [x * 1.2, 0.83, z * 1.1], 0.055, mats[i % 2]);
        rod([x, 0.4, z], [x + 0.16, 0.63, z - 0.15], 0.035, mats[i % 2]);
      }
    } else if (kind === "mushroom") {
      rod([0, 0, 0], [0, 0.55, 0], 0.13, mats[2]);
      ball([0, 0.6, 0], [0.6, 0.25, 0.58]);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4;
        ball(
          [Math.cos(a) * 0.37, 0.8, Math.sin(a) * 0.37],
          [0.08, 0.025, 0.08],
          mats[1],
        );
      }
    } else if (kind === "chest") {
      box([0, 0.16, 0], [0.9, 0.3, 0.62], wood);
      box([0, 0.32, 0.04], [0.73, 0.04, 0.47], gold);
      box([0, 0.51, -0.31], [0.9, 0.12, 0.65], wood, [-0.9, 0, 0]);
      for (const x of [-0.31, 0.31]) {
        box([x, 0.2, 0.01], [0.08, 0.36, 0.66], gold);
        box([x, 0.56, -0.31], [0.08, 0.15, 0.69], gold, [-0.9, 0, 0]);
      }
      box([0, 0.25, 0.34], [0.14, 0.13, 0.06], gold);
      for (let i = 0; i < 9; i++)
        ball(
          [Math.sin(i * 4) * 0.29, 0.37, Math.cos(i * 2) * 0.17],
          [0.09, 0.035, 0.09],
          i % 3 ? gold : mats[1],
        );
    } else if (kind === "trident") {
      rod([0, 0.1, -0.65], [0, 0.1, 0.45], 0.04, gold);
      rod([-0.28, 0.1, 0.22], [0.28, 0.1, 0.22], 0.035, gold);
      for (const x of [-0.28, 0, 0.28]) {
        rod([x, 0.1, 0.2], [x, 0.1, 0.64], 0.035, gold);
        const m = cone([x, 0.1, 0.72], 0.085, 0.21, gold, 4);
        m.rotation.x = Math.PI / 2;
      }
      ball([0, 0.13, -0.4], [0.09, 0.045, 0.12], mats[0]);
    } else if (kind === "ruin") {
      box([0, 0.025, 0], [1.25, 0.08, 0.85], mats[2]);
      for (const x of [-0.44, 0, 0.44])
        for (const z of [-0.26, 0.26]) {
          rod([x, 0, z], [x, 0.45, z], 0.09, mats[2]);
          box([x, 0.47, z], [0.24, 0.09, 0.24], mats[2]);
        }
      box([0, 0.55, -0.26], [1.1, 0.12, 0.22], mats[1]);
      ball([0.4, 0.15, 0.43], [0.26, 0.2, 0.21], mats[0]);
    } else if (kind === "shell") {
      for (let i = 0; i < 7; i++) {
        const a = (i / 6 - 0.5) * 2;
        const m = ball(
          [Math.sin(a) * 0.25, 0.08, Math.cos(a) * 0.25],
          [0.075, 0.05, 0.35],
          mats[1],
        );
        m.rotation.y = a;
      }
      ball([0, 0.18, 0.15], [0.14, 0.14, 0.14], mats[2]);
    } else if (kind === "jellyfish") {
      ball([0, 0.42, 0], [0.5, 0.22, 0.5], mats[1]);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4;
        rod(
          [Math.cos(a) * 0.25, 0.3, Math.sin(a) * 0.25],
          [Math.cos(a) * 0.37, -0.07, Math.sin(a) * 0.37],
          0.025,
          mats[2],
        );
      }
    } else if (kind === "crater" || kind === "vent") {
      ring([0, 0.04, 0], 0.45, 0.15, kind === "vent" ? mats[0] : mats[1]);
      put(
        new T.CircleGeometry(0.36, 24),
        kind === "vent" ? mats[2] : mats[0],
        [0, 0.041, 0],
        [1, 1, 1],
        [-Math.PI / 2, 0, 0],
      );
    } else if (kind === "gear") {
      ring([0, 0.08, 0], 0.34, 0.1, gold);
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5;
        box(
          [Math.cos(a) * 0.44, 0.08, Math.sin(a) * 0.44],
          [0.19, 0.1, 0.18],
          mats[0],
          [0, -a, 0],
        );
      }
    } else if (kind === "pipe") {
      for (const x of [-0.28, 0.1, 0.38]) {
        rod([x, 0, 0], [x, 0.55 + x, 0.0], 0.11, mats[0]);
        ring([x, 0.55 + x, 0], 0.12, 0.035, mats[1]);
      }
    } else if (kind === "arch") {
      rod([-0.4, 0, 0], [-0.4, 0.6, 0], 0.08);
      rod([0.4, 0, 0], [0.4, 0.6, 0], 0.08);
      box([0, 0.62, 0], [0.95, 0.1, 0.18], mats[1]);
    } else if (
      kind === "tower" ||
      kind === "pyramid" ||
      kind === "spire" ||
      kind === "crystal"
    ) {
      for (let i = 0; i < (kind === "crystal" ? 3 : 1); i++) {
        const x = (i - 1) * 0.26;
        const m = cone(
          [kind === "crystal" ? x : 0, 0.45, (i % 2) * 0.1],
          kind === "pyramid" ? 0.65 : 0.3,
          0.9,
          mats[i % 3],
          kind === "pyramid" ? 4 : 6,
        );
        if (kind === "crystal") m.rotation.z = x * 0.5;
      }
      if (kind === "tower") box([0, 0.22, 0], [0.5, 0.45, 0.5], mats[0]);
    } else if (kind === "lollipop") {
      rod([0, 0, 0], [0, 0.7, 0], 0.055, mats[1]);
      ball([0, 0.76, 0], [0.45, 0.12, 0.45]);
      ring([0, 0.9, 0], 0.24, 0.055, mats[2]);
    } else if (kind === "antenna" || kind === "marker") {
      rod([0, 0, 0], [0, 0.7, 0], 0.045, mats[1]);
      if (kind === "antenna") {
        ball([0, 0.68, 0], [0.35, 0.07, 0.35], mats[0]);
        rod([0, 0.7, 0], [0.12, 0.95, 0.1], 0.025, mats[1]);
      } else box([0.16, 0.64, 0], [0.35, 0.12, 0.06], mats[2]);
    } else {
      ball([0, 0.14, 0], [0.65, kind === "knoll" ? 0.28 : 0.38, 0.5]);
      ball([0.35, 0.09, 0.28], [0.24, 0.21, 0.28], mats[1]);
      if (kind === "gumdrop") ball([0, 0.35, 0], [0.42, 0.5, 0.4], mats[2]);
    }
    root.updateMatrixWorld(true);
    const batches = new Map();
    root.traverse((o) => {
      if (o.isMesh) {
        if (!batches.has(o.material)) batches.set(o.material, []);
        const g = o.geometry.index
          ? o.geometry.toNonIndexed()
          : o.geometry.clone();
        g.applyMatrix4(o.matrixWorld);
        batches.get(o.material).push(g);
        o.geometry.dispose();
      }
    });
    const mergedRoot = new T.Group();
    for (const [material, geometries] of batches) {
      const geometry = mergeGeometries(geometries);
      mergedRoot.add(new T.Mesh(geometry, material));
      resources.push(geometry, material);
      geometries.forEach((g) => g.dispose());
    }
    for (const material of [...mats, wood, gold])
      if (!batches.has(material)) material.dispose();
    cache.set(key, mergedRoot);
    return mergedRoot.clone();
  }
  return {
    build,
    dispose() {
      resources.forEach((r) => r.dispose());
      cache.clear();
    },
  };
}
