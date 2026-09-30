// Original lost-foundry city plan. Units are the shared 4 × 3 terrain surface.
const hash = (x, y, seed) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 0.017) * 43758.5453;
  return n - Math.floor(n);
};
const valid = (h) => Number.isFinite(h) && h >= 0;
const at = (sample, x, z) => sample(x / 4 + 0.5, z / 3 + 0.5);
function segmentDistance(p, a, b) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1),
    ),
  );
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
export function copperRoadPoint(road, t) {
  const n = Math.min(
    road.points.length - 2,
    Math.floor(Math.max(0, Math.min(0.999999, t)) * (road.points.length - 1)),
  );
  const f = Math.max(0, Math.min(1, t)) * (road.points.length - 1) - n,
    a = road.points[n],
    b = road.points[n + 1];
  return {
    x: a.x + (b.x - a.x) * f,
    z: a.z + (b.z - a.z) * f,
    heading: Math.atan2(b.x - a.x, b.z - a.z),
  };
}
export function planCopperCitadel(sample, water, seed = 31, density = 1) {
  density = Math.max(0, Math.min(3, Number(density) || 0));
  const pool = [];
  for (let iy = 2; iy < 24; iy++)
    for (let ix = 2; ix < 32; ix++) {
      const u = ix / 34,
        v = iy / 26,
        h = sample(u, v);
      if (!valid(h) || h < water + 0.065) continue;
      const around = [
        sample(u - 0.035, v),
        sample(u + 0.035, v),
        sample(u, v - 0.045),
        sample(u, v + 0.045),
      ];
      if (
        !around.every(valid) ||
        Math.max(...around) - Math.min(...around) > 0.24
      )
        continue;
      pool.push({
        u,
        v,
        h,
        x: (u - 0.5) * 4,
        z: (v - 0.5) * 3,
        phase: hash(ix, iy, seed) * Math.PI * 2,
        score: hash(ix, iy, seed + 31) * 0.78 + h * 0.22,
      });
    }
  pool.sort((a, b) => b.score - a.score);
  const stations = [];
  for (const p of pool) {
    if (stations.length >= Math.round(14 * density)) break;
    if (stations.every((q) => Math.hypot(p.x - q.x, p.z - q.z) > 0.43))
      stations.push({ ...p, id: stations.length });
  }
  const choices = [];
  for (let i = 0; i < stations.length; i++)
    for (let j = i + 1; j < stations.length; j++) {
      const a = stations[i],
        b = stations[j],
        d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d > 0.98) continue;
      const bend = (hash(i, j, seed) - 0.5) * 0.11,
        points = [];
      let wet = 0,
        invalid = false;
      for (let k = 0; k <= 16; k++) {
        const t = k / 16,
          s = Math.sin(t * Math.PI) * bend;
        const x = a.x + (b.x - a.x) * t - ((b.z - a.z) / d) * s,
          z = a.z + (b.z - a.z) * t + ((b.x - a.x) / d) * s,
          h = at(sample, x, z);
        if (!valid(h)) {
          invalid = true;
          break;
        }
        if (h < water + 0.01) wet++;
        points.push({ x, z });
      }
      if (!invalid && wet <= 5)
        choices.push({ i, j, d, points, bridge: wet > 0 });
    }
  choices.sort((a, b) => a.d - b.d);
  const roads = [],
    degree = stations.map(() => 0);
  for (const r of choices) {
    if (degree[r.i] >= 3 || degree[r.j] >= 3) continue;
    roads.push(r);
    degree[r.i]++;
    degree[r.j]++;
  }
  const buildings = [];
  for (const s of stations)
    for (let k = 0; k < 18; k++) {
      const angle = s.phase + k * 2.399963,
        r = 0.13 + (k % 4) * 0.068;
      const x = s.x + Math.cos(angle) * r,
        z = s.z + Math.sin(angle) * r;
      const w = 0.1 + hash(s.id, k, seed + 13) * 0.068,
        d = 0.115 + hash(s.id, k, seed + 58) * 0.09;
      const h = at(sample, x, z);
      if (
        !valid(h) ||
        h < water + 0.035 ||
        Math.abs(x) > 1.83 ||
        Math.abs(z) > 1.32
      )
        continue;
      const samples = [
        [-0.6, -0.6],
        [0.6, -0.6],
        [0.6, 0.6],
        [-0.6, 0.6],
        [0, 0],
      ].map(([a, b]) => at(sample, x + a * w, z + b * d));
      if (
        !samples.every((n) => valid(n) && n > water + 0.015) ||
        Math.max(...samples) - Math.min(...samples) > 0.23
      )
        continue;
      if (
        buildings.some(
          (b) =>
            Math.abs(b.x - x) < (b.w + w) * 0.54 &&
            Math.abs(b.z - z) < (b.d + d) * 0.54,
        )
      )
        continue;
      if (
        roads.some((road) =>
          road.points
            .slice(1)
            .some(
              (b, i) =>
                segmentDistance({ x, z }, road.points[i], b) <
                Math.max(w, d) * 0.47 + 0.025,
            ),
        )
      )
        continue;
      const kind =
        k === 0
          ? s.id % 3 === 0
            ? "palace"
            : "tower"
          : ["hall", "foundry", "ruin", "tower", "hall", "gate"][
              Math.floor(hash(s.id, k, seed + 88) * 6)
            ];
      const height =
        (kind === "palace"
          ? 0.28
          : kind === "tower"
            ? 0.22
            : kind === "ruin"
              ? 0.055
              : 0.11) +
        Math.max(0, h - water) * 0.22;
      buildings.push({
        x,
        z,
        u: x / 4 + 0.5,
        v: z / 3 + 0.5,
        w,
        d,
        height,
        h,
        kind,
        phase: s.phase + k,
        id: buildings.length,
        district: s.id,
      });
    }
  // Every walker uses a verified dry route or a short physical bridge.
  const patrols = roads.slice(0, Math.round(14 * density));
  return { stations, buildings, roads, patrols, pipes: roads, wheels: [] };
}
