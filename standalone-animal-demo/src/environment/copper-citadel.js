import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { copperRoadPoint } from "./copper-layout.js";

const TAU = Math.PI * 2;
// Local architectural relief exposes facades to the top-down projector while
// keeping every foundation and street anchored to its terrain coordinates.
const RELIEF = new T.Matrix4().set(
  1,
  0.38,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0.28,
  1,
  0,
  0,
  0,
  0,
  1,
);
export function createCopperCitadel(parent) {
  const root = new T.Group();
  root.name = "Lost bronze citadel";
  parent.add(root);
  const relief = new T.Group();
  relief.matrixAutoUpdate = false;
  relief.matrix.copy(RELIEF);
  root.add(relief);
  const masonry = new T.Group(),
    mechanisms = new T.Group();
  relief.add(masonry, mechanisms);
  const resources = [],
    merged = [],
    steamMaterials = [];
  const own = (x) => (resources.push(x), x);
  const box = own(new T.BoxGeometry(1, 1, 1));
  const cylinder = own(new T.CylinderGeometry(1, 1, 1, 12));
  const column = own(new T.CylinderGeometry(0.86, 1, 1, 8));
  const dome = own(new T.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2));
  const ball = own(new T.SphereGeometry(1, 10, 7));
  const cone = own(new T.ConeGeometry(1, 1, 8));
  const ring = own(new T.TorusGeometry(1, 0.075, 5, 24));
  const rib = own(new T.TorusGeometry(1, 0.018, 4, 24, Math.PI));
  const barrel = own(
    new T.CylinderGeometry(1, 1, 1, 16, 1, false, Math.PI / 2, Math.PI),
  );
  barrel.rotateX(Math.PI / 2);
  const shape = new T.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(-0.5, 0.55);
  shape.absarc(0, 0.55, 0.5, Math.PI, 0, true);
  shape.lineTo(0.5, 0);
  shape.lineTo(0.31, 0);
  shape.lineTo(0.31, 0.55);
  shape.absarc(0, 0.55, 0.31, 0, Math.PI, false);
  shape.lineTo(-0.31, 0);
  shape.closePath();
  const arch = own(
    new T.ExtrudeGeometry(shape, {
      depth: 1,
      bevelEnabled: false,
      curveSegments: 10,
    }),
  );
  arch.translate(0, 0, -0.5);
  const stoneCanvas = document.createElement("canvas");
  stoneCanvas.width = stoneCanvas.height = 128;
  const sc = stoneCanvas.getContext("2d");
  sc.fillStyle = "#d1c9b9";
  sc.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const n = Math.sin(x * 73.1 + y * 41.7) * 43758.5;
      const v = n - Math.floor(n);
      sc.fillStyle = `rgba(50,43,35,${v * 0.16})`;
      sc.fillRect(x, y, 1, 1);
    }
  sc.strokeStyle = "rgba(62,52,39,.23)";
  sc.lineWidth = 1;
  for (let y = 0; y < 128; y += 24) {
    sc.beginPath();
    sc.moveTo(0, y);
    sc.lineTo(128, y);
    sc.stroke();
    for (let x = ((y / 24) % 2) * 20; x < 128; x += 40) {
      sc.beginPath();
      sc.moveTo(x, y);
      sc.lineTo(x, y + 24);
      sc.stroke();
    }
  }
  const stoneTexture = own(new T.CanvasTexture(stoneCanvas));
  stoneTexture.colorSpace = T.SRGBColorSpace;
  const stone = own(
    new T.MeshStandardMaterial({
      color: 0xb3a184,
      map: stoneTexture,
      roughness: 0.95,
    }),
  );
  const darkStone = own(
    new T.MeshStandardMaterial({
      color: 0x777160,
      map: stoneTexture,
      roughness: 0.96,
    }),
  );
  const bronze = own(
    new T.MeshStandardMaterial({
      color: 0xb58a52,
      metalness: 0.65,
      roughness: 0.47,
    }),
  );
  const gold = own(
    new T.MeshStandardMaterial({
      color: 0xcba461,
      metalness: 0.63,
      roughness: 0.38,
    }),
  );
  const iron = own(
    new T.MeshStandardMaterial({
      color: 0x626a60,
      metalness: 0.68,
      roughness: 0.57,
    }),
  );
  const patina = own(
    new T.MeshStandardMaterial({
      color: 0x486556,
      metalness: 0.35,
      roughness: 0.76,
    }),
  );
  const soot = own(
    new T.MeshStandardMaterial({ color: 0x343a32, roughness: 1 }),
  );
  const ember = own(new T.MeshBasicMaterial({ color: 0xf4b75b }));
  const pane = own(
    new T.MeshStandardMaterial({
      color: 0xa77d45,
      emissive: 0xf0a441,
      emissiveIntensity: 0.38,
      roughness: 0.65,
    }),
  );
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 576;
  const texture = own(new T.CanvasTexture(canvas));
  texture.colorSpace = T.SRGBColorSpace;
  texture.minFilter = T.LinearFilter;
  const surfaceGeo = own(new T.PlaneGeometry(4, 3));
  surfaceGeo.rotateX(-Math.PI / 2);
  const surface = new T.Mesh(
    surfaceGeo,
    own(
      new T.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      }),
    ),
  );
  surface.position.y = 0.003;
  root.add(surface);
  const puffCanvas = document.createElement("canvas");
  puffCanvas.width = puffCanvas.height = 64;
  const pc = puffCanvas.getContext("2d"),
    gradient = pc.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(235,229,209,.75)");
  gradient.addColorStop(0.35, "rgba(213,213,201,.38)");
  gradient.addColorStop(1, "rgba(220,224,211,0)");
  pc.fillStyle = gradient;
  pc.fillRect(0, 0, 64, 64);
  const puffTexture = own(new T.CanvasTexture(puffCanvas));
  let rotors = [],
    pistons = [],
    walkers = [],
    vents = [],
    puffs = [],
    currentPlan = null,
    currentTime = 0;
  function part(group, geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const mesh = new T.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(rx, ry, rz);
    group.add(mesh);
    return mesh;
  }
  function pipe(group, a, b, r, mat = bronze) {
    const av = new T.Vector3(...a),
      bv = new T.Vector3(...b),
      d = bv.clone().sub(av);
    const m = part(group, cylinder, mat, 0, 0, 0, r, d.length(), r);
    m.position.copy(av).add(bv).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return m;
  }
  function cap(group, x, y, z, r, h) {
    part(group, cylinder, gold, x, y, z, r * 1.05, 0.009, r * 1.05);
    part(group, dome, bronze, x, y + 0.006, z, r, h, r);
    for (let n = 0; n < 6; n++)
      part(group, rib, gold, x, y + 0.007, z, r, h, r, 0, (n * Math.PI) / 6, 0);
    part(group, column, iron, x, y + h + 0.019, z, r * 0.16, 0.034, r * 0.16);
    part(group, dome, gold, x, y + h + 0.036, z, r * 0.21, 0.018, r * 0.21);
    part(group, cone, gold, x, y + h + 0.061, z, 0.007, 0.035, 0.007);
  }
  function tower(group, x, z, w, h) {
    part(group, cylinder, darkStone, x, h / 2, z, w * 0.51, h, w * 0.51);
    part(group, cylinder, stone, x, h * 0.51, z, w * 0.46, h * 0.94, w * 0.46);
    for (let floor = 0; floor < 3; floor++) {
      const y = 0.025 + floor * h * 0.3;
      part(group, cylinder, bronze, x, y, z, w * 0.51, 0.009, w * 0.51);
      for (let side = 0; side < 8; side++) {
        const a = (side * TAU) / 8,
          s = Math.sin(a),
          c = Math.cos(a);
        part(
          group,
          box,
          soot,
          x + s * w * 0.465,
          y + h * 0.12,
          z + c * w * 0.465,
          w * 0.15,
          h * 0.13,
          0.004,
          0,
          a,
          0,
        );
        part(
          group,
          box,
          pane,
          x + s * w * 0.47,
          y + h * 0.12,
          z + c * w * 0.47,
          w * 0.055,
          h * 0.105,
          0.004,
          0,
          a,
          0,
        );
        part(
          group,
          column,
          gold,
          x + s * w * 0.49,
          y + h * 0.12,
          z + c * w * 0.49,
          0.004,
          h * 0.24,
          0.004,
        );
      }
    }
    cap(group, x, h + 0.005, z, w * 0.56, w * 0.4);
  }
  function chimney(group, b, x, z, h) {
    part(group, box, darkStone, x, h * 0.5, z, 0.034, h, 0.032);
    for (const y of [0.025, h * 0.5, h - 0.014])
      part(group, box, bronze, x, y, z, 0.039, 0.008, 0.037);
    part(group, box, soot, x, h + 0.001, z, 0.022, 0.003, 0.021);
    vents.push({ x: b.x + x, z: b.z + z, y: h, phase: b.phase + x * 11 });
  }
  function flywheel(b, x, y, z, r) {
    const wheel = new T.Group();
    wheel.position.set(b.x + x, y, b.z + z);
    mechanisms.add(wheel);
    part(wheel, ring, bronze, 0, 0, 0, r, r, r);
    part(
      wheel,
      cylinder,
      iron,
      0,
      0,
      0,
      r * 0.16,
      0.026,
      r * 0.16,
      Math.PI / 2,
    );
    for (let n = 0; n < 8; n++)
      part(
        wheel,
        box,
        gold,
        0,
        0,
        0,
        r * 1.75,
        r * 0.1,
        0.008,
        0,
        0,
        (n * Math.PI) / 4,
      );
    for (let n = 0; n < 12; n++) {
      const a = (n * TAU) / 12;
      part(
        wheel,
        box,
        bronze,
        Math.sin(a) * r,
        Math.cos(a) * r,
        0,
        r * 0.22,
        r * 0.21,
        0.012,
        0,
        0,
        -a,
      );
    }
    rotors.push({ mesh: wheel, phase: b.phase });
  }
  function building(b) {
    const g = new T.Group();
    g.position.set(b.x, 0, b.z);
    masonry.add(g);
    const { w, d, height: h } = b;
    part(g, box, darkStone, 0, 0.013, 0, w * 1.14, 0.026, d * 1.14);
    if (b.kind === "tower" || b.kind === "palace") {
      tower(g, 0, -d * 0.08, w, h);
      if (b.kind === "palace") {
        for (const side of [-1, 1])
          tower(g, side * w * 0.51, d * 0.2, w * 0.42, h * 0.58);
        part(g, arch, gold, 0, 0.025, d * 0.47, w * 0.47, h * 0.4, 0.022);
      }
    } else if (b.kind === "gate") {
      const th = h * 0.9;
      for (const side of [-1, 1]) tower(g, side * w * 0.37, 0, w * 0.47, th);
      part(g, arch, bronze, 0, 0.02, 0, w * 0.53, h * 0.61, d * 0.65);
      part(g, box, gold, 0, h * 0.72, 0, w * 0.97, 0.014, d * 0.7);
    } else if (b.kind === "ruin") {
      for (let n = 0; n < 5; n++) {
        const x = (n / 4 - 0.5) * w * 0.9,
          hh = h * (0.35 + 0.45 * Math.abs(Math.sin(n * 8 + b.phase)));
        part(g, box, stone, x, hh / 2, -d * 0.4, w * 0.18, hh, 0.026);
      }
      part(g, box, darkStone, -w * 0.4, h * 0.45, 0, 0.025, h * 0.9, d);
      part(
        g,
        arch,
        bronze,
        w * 0.1,
        0.016,
        d * 0.1,
        w * 0.55,
        h * 0.78,
        0.014,
        0,
        0,
        0.14,
      );
      for (let n = 0; n < 6; n++)
        part(
          g,
          box,
          stone,
          Math.sin(n * 8 + b.phase) * w * 0.46,
          0.012,
          Math.cos(n * 4 + b.phase) * d * 0.43,
          0.023,
          0.021,
          0.018,
          0.2,
          n,
          0.1,
        );
      part(g, box, patina, 0, 0.029, -d * 0.37, w * 0.65, 0.006, 0.018);
    } else {
      part(g, box, stone, 0, h * 0.36, 0, w, h * 0.72, d);
      for (const side of [-1, 1])
        for (const end of [-1, 1]) {
          part(
            g,
            column,
            darkStone,
            side * w * 0.48,
            h * 0.38,
            end * d * 0.46,
            0.01,
            h * 0.79,
            0.01,
          );
          part(
            g,
            box,
            gold,
            side * w * 0.48,
            h * 0.77,
            end * d * 0.46,
            0.025,
            0.012,
            0.025,
          );
        }
      part(g, box, bronze, 0, h * 0.73, 0, w * 1.09, 0.018, d * 1.06);
      if (b.kind === "hall") {
        part(g, barrel, bronze, 0, h * 0.74, 0, w * 0.56, w * 0.29, d * 1.03);
        for (let n = -2; n <= 2; n++)
          part(g, rib, gold, 0, h * 0.74, n * d * 0.2, w * 0.57, w * 0.3, 0.01);
      } else {
        part(g, box, iron, 0, h * 0.77, 0, w * 1.05, 0.022, d);
        cap(g, -w * 0.18, h * 0.78, -d * 0.16, w * 0.32, w * 0.24);
        chimney(g, b, w * 0.29, -d * 0.29, h * 1.2);
        chimney(g, b, w * 0.31, d * 0.03, h * 1.02);
        flywheel(b, -w * 0.51, h * 0.39, d * 0.1, w * 0.23);
        const piston = part(
          mechanisms,
          cylinder,
          gold,
          b.x - w * 0.53,
          h * 0.65,
          b.z + d * 0.1,
          0.007,
          0.08,
          0.007,
        );
        pistons.push({ mesh: piston, base: h * 0.65, phase: b.phase });
        pipe(
          g,
          [-w * 0.35, 0.04, d * 0.43],
          [-w * 0.35, h * 0.75, d * 0.43],
          0.009,
        );
        pipe(
          g,
          [-w * 0.35, h * 0.75, d * 0.43],
          [w * 0.34, h * 0.75, d * 0.43],
          0.009,
        );
      }
      for (let n = -1; n <= 1; n++) {
        const x = n * w * 0.28;
        part(g, box, soot, x, h * 0.3, d * 0.505, w * 0.19, h * 0.36, 0.004);
        part(g, box, pane, x, h * 0.3, d * 0.509, w * 0.11, h * 0.26, 0.004);
        part(
          g,
          arch,
          bronze,
          x,
          h * 0.09,
          d * 0.516,
          w * 0.26,
          h * 0.42,
          0.008,
        );
      }
    }
    // A broad stair and copper threshold announce the entrance from above.
    if (b.kind !== "ruin")
      for (let n = 0; n < 4; n++)
        part(
          g,
          box,
          stone,
          0,
          0.006 + n * 0.005,
          d * 0.56 + (3 - n) * 0.011,
          w * 0.44,
          0.011,
          0.025,
        );
  }
  function batchMasonry() {
    root.updateMatrixWorld(true);
    const inverse = new T.Matrix4().copy(masonry.matrixWorld).invert(),
      buckets = new Map();
    masonry.traverse((mesh) => {
      if (!mesh.isMesh) return;
      let g = mesh.geometry.clone();
      if (g.index) {
        const old = g;
        g = g.toNonIndexed();
        old.dispose();
      }
      g.applyMatrix4(
        new T.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld),
      );
      if (!buckets.has(mesh.material)) buckets.set(mesh.material, []);
      buckets.get(mesh.material).push(g);
    });
    masonry.clear();
    for (const [mat, geometries] of buckets) {
      const joined = mergeGeometries(geometries, false);
      geometries.forEach((g) => g.dispose());
      if (joined) {
        merged.push(joined);
        masonry.add(new T.Mesh(joined, mat));
      }
    }
  }
  function paintGround(plan, sample, water) {
    const ctx = canvas.getContext("2d"),
      w = canvas.width,
      h = canvas.height,
      img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const u = x / w,
          v = y / h,
          e = sample(u, v),
          i = (y * w + x) * 4;
        if (!Number.isFinite(e) || e < 0) continue;
        const hash = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        const noise = (hash - Math.floor(hash) - 0.5) * 5;
        const strata = Math.sin(e * 92 + Math.sin(u * 9 + v * 7) * 0.15) * 1.8;
        const rise = Math.max(0, Math.min(1, (e - water) / 0.5));
        const wet = e < water,
          shore = Math.max(0, 1 - Math.abs(e - water) / 0.045);
        const rgb = wet
          ? [34 + rise * 8 + noise, 55 + noise, 58 + noise]
          : [
              105 + rise * 24 + noise + strata + shore * 7,
              99 + rise * 20 + noise + strata,
              85 + rise * 17 + noise,
            ];
        img.data.set([...rgb.map((n) => Math.round(n)), 255], i);
      }
    ctx.putImageData(img, 0, 0);
    const px = (x) => (x / 4 + 0.5) * w,
      pz = (z) => (z / 3 + 0.5) * h;
    for (const road of plan.roads) {
      for (const [color, width] of [
        ["rgba(30,30,25,.38)", 12],
        ["#a79c83", 8],
        ["#beb19a", 5],
      ]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        road.points.forEach((p, i) =>
          i ? ctx.lineTo(px(p.x), pz(p.z)) : ctx.moveTo(px(p.x), pz(p.z)),
        );
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(55,50,41,.4)";
      ctx.lineWidth = 4;
      ctx.setLineDash([0.7, 3]);
      ctx.beginPath();
      road.points.forEach((p, i) =>
        i ? ctx.lineTo(px(p.x), pz(p.z)) : ctx.moveTo(px(p.x), pz(p.z)),
      );
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const b of plan.buildings) {
      const x = px(b.x),
        z = pz(b.z),
        bw = (b.w * w) / 4,
        bd = (b.d * h) / 3,
        dx = ((b.height * 0.54 + 0.02) * w) / 4,
        dz = ((b.height * 0.46 + 0.02) * h) / 3;
      ctx.fillStyle = "rgba(19,25,22,.34)";
      ctx.beginPath();
      ctx.moveTo(x - bw / 2, z - bd / 2);
      ctx.lineTo(x + bw / 2, z - bd / 2);
      ctx.lineTo(x + bw / 2 + dx, z - bd / 2 + dz);
      ctx.lineTo(x + bw / 2 + dx, z + bd / 2 + dz);
      ctx.lineTo(x - bw / 2 + dx, z + bd / 2 + dz);
      ctx.lineTo(x - bw / 2, z + bd / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(58,52,42,.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - bw * 0.62, z - bd * 0.62, bw * 1.24, bd * 1.24);
    }
    texture.needsUpdate = true;
  }
  function makeAutomaton(road, i) {
    const g = new T.Group();
    mechanisms.add(g);
    part(g, cylinder, iron, 0, 0.036, 0, 0.014, 0.025, 0.013);
    part(g, ball, bronze, 0, 0.058, 0, 0.02, 0.026, 0.016);
    part(g, box, gold, 0, 0.057, 0.015, 0.023, 0.022, 0.004);
    part(g, box, ember, 0, 0.059, 0.018, 0.012, 0.012, 0.003);
    part(g, ball, iron, 0, 0.087, 0, 0.012, 0.012, 0.011);
    part(g, dome, gold, 0, 0.088, 0, 0.016, 0.016, 0.014);
    part(g, box, ember, 0, 0.088, 0.011, 0.017, 0.003, 0.003);
    part(g, cylinder, iron, 0, 0.068, -0.02, 0.008, 0.033, 0.008);
    const limbs = [];
    for (const side of [-1, 1]) {
      part(g, ball, gold, side * 0.023, 0.07, 0, 0.012, 0.011, 0.012);
      const arm = new T.Group();
      arm.position.set(side * 0.025, 0.064, 0);
      g.add(arm);
      part(arm, column, bronze, 0, -0.017, 0, 0.006, 0.034, 0.006);
      part(arm, box, iron, 0, -0.037, 0.004, 0.01, 0.013, 0.012);
      const leg = new T.Group();
      leg.position.set(side * 0.011, 0.033, 0);
      g.add(leg);
      part(leg, column, bronze, 0, -0.014, 0, 0.006, 0.03, 0.006);
      part(leg, box, iron, 0, -0.029, 0.006, 0.012, 0.01, 0.024);
      limbs.push({ arm, leg, side });
    }
    g.scale.setScalar(i % 4 === 0 ? 1.52 : 1.22);
    walkers.push({ g, limbs, road, phase: i * 0.713 });
  }
  function clear() {
    masonry.clear();
    mechanisms.clear();
    merged.splice(0).forEach((g) => g.dispose());
    for (const puff of puffs) root.remove(puff.sprite);
    steamMaterials.splice(0).forEach((m) => m.dispose());
    rotors = [];
    pistons = [];
    walkers = [];
    vents = [];
    puffs = [];
    currentPlan = null;
  }
  return {
    rebuild(plan, sample, water) {
      clear();
      root.visible = !!plan;
      if (!plan) return;
      currentPlan = plan;
      paintGround(plan, sample, water);
      plan.buildings.forEach(building);
      plan.roads.forEach((road, i) => {
        if (road.bridge) {
          for (let k = 1; k < road.points.length; k++) {
            const a = road.points[k - 1],
              b = road.points[k];
            pipe(masonry, [a.x, 0.024, a.z], [b.x, 0.024, b.z], 0.035, stone);
          }
          for (const t of [0.25, 0.5, 0.75]) {
            const p = copperRoadPoint(road, t);
            part(
              masonry,
              arch,
              bronze,
              p.x,
              0,
              p.z,
              0.1,
              0.07,
              0.025,
              0,
              p.heading + Math.PI / 2,
            );
          }
        }
        if (i % 3 !== 0) return;
        for (let k = 1; k < road.points.length; k++) {
          const a = road.points[k - 1],
            b = road.points[k];
          pipe(
            masonry,
            [a.x - 0.033, 0.018, a.z - 0.015],
            [b.x - 0.033, 0.018, b.z - 0.015],
            0.007,
            bronze,
          );
          if (k % 3 === 0)
            part(
              masonry,
              ball,
              gold,
              a.x - 0.033,
              0.018,
              a.z - 0.015,
              0.01,
              0.011,
              0.01,
            );
        }
      });
      batchMasonry();
      plan.patrols.forEach(makeAutomaton);
      for (const vent of vents.slice(0, 22))
        for (let i = 0; i < 3; i++) {
          const m = new T.SpriteMaterial({
            map: puffTexture,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: false,
          });
          steamMaterials.push(m);
          const sprite = new T.Sprite(m);
          root.add(sprite);
          puffs.push({ sprite, vent, phase: i / 3 });
        }
    },
    update(time) {
      currentTime = time;
      for (const { mesh, phase } of rotors)
        mesh.rotation.z = time * 0.85 + phase;
      for (const { mesh, base, phase } of pistons)
        mesh.position.y = base + Math.sin(time * 3 + phase) * 0.018;
      for (const walker of walkers) {
        const { g, limbs, road, phase } = walker;
        const cycle = time * 0.065 + phase,
          travel = ((cycle % 2) + 2) % 2,
          reverse = travel > 1,
          t = reverse ? 2 - travel : travel;
        const p = copperRoadPoint(road, t),
          stride = Math.sin(time * 6 + phase);
        g.position.set(p.x, 0.003 + Math.abs(stride) * 0.002, p.z);
        g.rotation.y = p.heading + (reverse ? Math.PI : 0);
        for (const { leg, arm, side } of limbs) {
          leg.rotation.x = stride * 0.38 * side;
          arm.rotation.x = -stride * 0.26 * side;
        }
      }
      for (const { sprite, vent, phase } of puffs) {
        const age = (time * 0.24 + phase + vent.phase / TAU) % 1;
        sprite.position.set(
          vent.x + vent.y * 0.38 + age * 0.06,
          vent.y + 0.03 + age * 0.1,
          vent.z + vent.y * 0.28 - age * 0.15,
        );
        sprite.scale.set(0.05 + age * 0.17, 0.065 + age * 0.24, 1);
        sprite.material.opacity = Math.sin(age * Math.PI) * 0.72;
      }
    },
    stats: () => ({
      copperBuildings: currentPlan?.buildings.length || 0,
      copperAutomatons: walkers.length,
      copperSteamVents: vents.length,
      copperRuins:
        currentPlan?.buildings.filter((b) => b.kind === "ruin").length || 0,
      copperAnimationTime: currentTime,
    }),
    dispose() {
      clear();
      resources.forEach((r) => r.dispose());
      parent.remove(root);
    },
  };
}
