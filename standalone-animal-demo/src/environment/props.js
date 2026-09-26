import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { seededRandom } from "../simulation/world.js";
/** Original low-poly scenery kits. Static parts merge by material for low draw cost. */
export function createPropFactory() {
  const cache = new Map(),
    resources = [];
  const windTime = { value: 0 };
  function groundTexture(kind, colors) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    const pixels = context.createImageData(256, 256);
    const color = new T.Color(colors[kind === "vent" ? 2 : 0]);
    const smooth = (a, b, x) => {
      const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const dx = (x - 128) / 128,
          dy = (y - 128) / 128;
        const angle = Math.atan2(dy, dx);
        const irregular =
          1 +
          0.045 * Math.sin(angle * 7 + 0.8) +
          0.025 * Math.sin(angle * 13 - 0.7);
        const r = Math.hypot(dx, dy) / irregular;
        let rgb, alpha;
        if (kind === "crater") {
          const floor = 1 - smooth(0.31, 0.43, r);
          const rim = smooth(0.35, 0.45, r) * (1 - smooth(0.56, 0.72, r));
          const light = (dx - dy) * 0.5;
          rgb = 62 + floor * 12 + rim * (light > 0 ? 106 : 17);
          alpha =
            (floor * 0.62 + rim * (light > 0 ? 0.63 : 0.42)) *
            (1 - smooth(0.72, 0.91, r));
        } else if (kind === "vent") {
          const core = 1 - smooth(0.12, 0.42, r);
          const rim = smooth(0.29, 0.44, r) * (1 - smooth(0.56, 0.79, r));
          const fracture =
            Math.pow(Math.max(0, Math.sin(angle * 9 + r * 14)), 12) * rim;
          rgb = 45 + core * 170 + fracture * 90;
          alpha =
            (core * 0.84 + rim * 0.55 + fracture * 0.25) *
            (1 - smooth(0.76, 0.95, r));
        } else {
          const arm = Math.sin(angle * 2.7 - r * 11);
          const haze =
            Math.exp(-r * r * 8) +
            Math.max(0, arm) * Math.exp(-r * r * 3.5) * 0.36;
          rgb = 115 + haze * 110;
          alpha = Math.min(0.43, haze * 0.31) * (1 - smooth(0.7, 1, r));
        }
        const offset = (y * 256 + x) * 4;
        const tint =
          kind === "nebula" || kind === "starfield" || kind === "dustlane"
            ? color
            : null;
        pixels.data[offset] = tint ? tint.r * rgb : rgb;
        pixels.data[offset + 1] = tint
          ? tint.g * rgb
          : kind === "vent"
            ? rgb * 0.55
            : rgb;
        pixels.data[offset + 2] = tint
          ? tint.b * rgb
          : kind === "vent"
            ? rgb * 0.26
            : rgb;
        pixels.data[offset + 3] = Math.round(alpha * 255);
      }
    context.putImageData(pixels, 0, 0);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    resources.push(texture);
    return texture;
  }
  function build(kind, colors, seed = 0) {
    const tree = ["tree", "snowpine", "palm"].includes(kind);
    const variant = tree ? Math.abs(Math.floor(seed)) % 16 : 0;
    const rng = seededRandom(variant * 7919 + 83);
    const key = kind + colors.join() + ":" + variant;
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
    if (tree) {
      for (const material of [...mats, wood]) {
        material.onBeforeCompile = (shader) => {
          shader.uniforms.windTime = windTime;
          shader.vertexShader = "uniform float windTime;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
            #include <begin_vertex>
            float heightWeight = max(position.y, 0.);
            float phase = ${(variant * .73).toFixed(3)};
            float gust = sin(windTime * 1.1 + phase) + .35 * sin(windTime * 2.3 + phase);
            transformed.x += gust * .065 * heightWeight * heightWeight;
            transformed.z += sin(windTime * .83 + phase) * .045 * heightWeight * heightWeight;
            transformed.x += sin(windTime * 3.6 + position.x * 8. + phase) * .018 * heightWeight;
          `);
        };
        material.customProgramCacheKey = () => "tree-wind-" + variant;
      }
    }
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
      const height = 1.05 + rng() * .65;
      const lean = (rng() - .5) * .2;
      rod([0, 0, 0], [lean, height, 0], .055 + rng() * .025, wood);
      if (kind === "snowpine") {
        for (let tier = 0; tier < 6; tier++) {
          const y = .32 + tier * height / 7;
          const radius = (.48 - tier * .061) * (.8 + rng() * .4);
          for (let j = 0; j < 5; j++) {
            const a = j * Math.PI * 2 / 5 + tier * 1.3 + rng() * .4;
            const tip = [lean * y / height + Math.cos(a) * radius, y - .08, Math.sin(a) * radius];
            rod([lean * y / height, y, 0], tip, .018, wood);
            cone(tip, radius * .42, .25 + rng() * .15, mats[j % 3 === 0 ? 1 : 0], 5);
          }
        }
        cone([lean, height, 0], .14, .38);
      } else {
        const narrow = variant % 3 === 0;
        const branches = 7 + Math.floor(rng() * 5);
        for (let i = 0; i < branches; i++) {
          const a = i * 2.399 + rng() * .65;
          const y = height * (.35 + rng() * .5);
          const reach = (narrow ? .22 : .37) + rng() * .24;
          const tip = [lean + Math.cos(a) * reach, y + .18 + rng() * .2, Math.sin(a) * reach];
          rod([lean * y / height, y, 0], tip, .025, wood);
          for (let j = 0; j < 3; j++) {
            const off = a + j * 2.1;
            const leaf = [tip[0] + Math.cos(off) * .12, tip[1] + rng() * .16, tip[2] + Math.sin(off) * .12];
            rod(tip, leaf, .01, wood);
            const size = .10 + rng() * .1;
            ball(leaf, [size, size * (narrow ? 1.8 : 1.2), size * .8], mats[(i + j) % 2]);
          }
        }
        ball([lean, height + .12, 0], [.18, .3, .16]);
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
    } else if (
      ["starcore", "planet", "nebula", "starfield", "dustlane"].includes(kind)
    ) {
      const map = groundTexture("nebula", colors);
      const material = new T.MeshBasicMaterial({
        map,
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
      });
      put(
        new T.PlaneGeometry(
          kind === "dustlane" ? 2.5 : 1.9,
          kind === "dustlane" ? 0.9 : 1.5,
        ),
        material,
        [0, 0.018, 0],
        [1, 1, 1],
        [-Math.PI / 2, 0, 0],
      );
    } else if (kind === "cell" || kind === "nucleus" || kind === "enzyme") {
      ball([0, 0.2, 0], [0.56, 0.2, 0.46], mats[0]);
      ball([0.08, 0.36, -0.04], [0.22, 0.08, 0.18], mats[1]);
      for (let i = 0; i < 8; i++) {
        const q = (i * Math.PI) / 4;
        ball(
          [Math.sin(q) * 0.38, 0.39, Math.cos(q) * 0.31],
          [0.07, 0.04, 0.08],
          mats[2],
        );
      }
    } else if (kind === "neuron" || kind === "synapse" || kind === "axon") {
      ball([0, 0.24, 0], [0.25, 0.18, 0.25], mats[0]);
      for (let i = 0; i < 7; i++) {
        const q = (i * Math.PI * 2) / 7,
          x = Math.cos(q) * 0.65,
          z = Math.sin(q) * 0.65;
        rod([0, 0.24, 0], [x, 0.13, z], 0.025, mats[1]);
        ball([x, 0.13, z], [0.08, 0.08, 0.08], mats[2]);
      }
    } else if (kind === "atom" || kind === "orbital") {
      ball([0, 0.24, 0], [0.22, 0.22, 0.22], mats[0]);
      for (let i = 0; i < 3; i++)
        ring([0, 0.24, 0], 0.5, 0.025, mats[(i + 1) % 3], [
          Math.PI / 2,
          (i * Math.PI) / 3,
          i * 0.2,
        ]);
    } else if (kind === "hologram" || kind === "circuit") {
      box([0, 0.03, 0], [0.75, 0.06, 0.5], mats[0]);
      for (let i = -1; i <= 1; i++) {
        rod([i * 0.22, 0.08, -0.2], [i * 0.22, 0.08, 0.2], 0.025, mats[1]);
        ball([i * 0.22, 0.12, 0.2], [0.07, 0.05, 0.07], mats[2]);
      }
      if (kind === "hologram") cone([0, 0.47, 0], 0.25, 0.7, mats[2]);
    } else if (kind === "eye") {
      ball([0, 0.18, 0], [0.65, 0.17, 0.4], mats[0]);
      ball([0, 0.35, 0], [0.24, 0.035, 0.23], mats[1]);
      ball([0, 0.39, 0], [0.12, 0.02, 0.11], mats[2]);
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
      // The camera looks down with screen-up at -Z; tines point toward -Z.
      rod([0, 0.09, 0.72], [0, 0.09, -0.38], 0.055, gold);
      rod([-0.32, 0.09, -0.27], [0.32, 0.09, -0.27], 0.045, gold);
      for (const x of [-0.32, 0, 0.32]) {
        rod([x, 0.09, -0.27], [x, 0.09, -0.66], 0.045, gold);
        const m = cone([x, 0.09, -0.74], 0.095, 0.2, gold, 4);
        m.rotation.x = -Math.PI / 2;
      }
      ball([0, 0.12, 0.48], [0.09, 0.045, 0.12], mats[0]);
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
      const material = new T.MeshBasicMaterial({
        map: groundTexture(kind, colors),
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
      });
      put(
        new T.PlaneGeometry(1.75, 1.75),
        material,
        [0, 0.014, 0],
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
    setTime(time) { windTime.value = time; },
    dispose() {
      resources.forEach((r) => r.dispose());
      cache.clear();
    },
  };
}
