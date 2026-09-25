// Pure terrain analysis: scenery distribution, shoreline geometry, volcano trigger.
export function analyzeLandscape(
  sample,
  water,
  { underwater = false, seed = 31 } = {},
) {
  const land = [],
    sea = [],
    peaks = [],
    shore = [];
  const nx = 42,
    ny = 32;
  for (let y = 1; y < ny; y++)
    for (let x = 1; x < nx; x++) {
      const u = x / nx,
        v = y / ny,
        h = sample(u, v);
      if (!Number.isFinite(h)) continue;
      if (h > water + 0.055 && h < 0.93) land.push({ u, v, h });
      if (underwater || h < water - 0.045) sea.push({ u, v, h });
      if (u > 0.1 && u < 0.9 && v > 0.1 && v < 0.9 && h > 0.78) {
        const around = [
          sample(u - 0.065, v),
          sample(u + 0.065, v),
          sample(u, v - 0.085),
          sample(u, v + 0.085),
        ];
        if (
          around.every(Number.isFinite) &&
          h - around.reduce((a, b) => a + b, 0) / 4 > 0.035
        )
          peaks.push({ u, v, h });
      }
      if (!underwater) {
        const points = [
          [u, v],
          [u + 1 / nx, v],
          [u + 1 / nx, v + 1 / ny],
          [u, v + 1 / ny],
        ];
        const heights = points.map(([u, v]) => sample(u, v));
        if (!heights.every(Number.isFinite)) continue;
        const crossings = [];
        for (let k = 0; k < 4; k++) {
          const next = (k + 1) % 4,
            a = heights[k] - water,
            b = heights[next] - water;
          if (a < 0 === b < 0) continue;
          const t = a / (a - b);
          crossings.push({
            u: points[k][0] + (points[next][0] - points[k][0]) * t,
            v: points[k][1] + (points[next][1] - points[k][1]) * t,
          });
        }
        for (let i = 0; i + 1 < crossings.length; i += 2) {
          const a = crossings[i],
            b = crossings[i + 1],
            mu = (a.u + b.u) / 2,
            mv = (a.v + b.v) / 2;
          const dx = sample(mu + 0.005, mv) - sample(mu - 0.005, mv),
            dz = ((sample(mu, mv + 0.005) - sample(mu, mv - 0.005)) * 4) / 3,
            n = Math.hypot(dx, dz) || 1;
          shore.push({ a, b, nx: dx / n, nz: dz / n });
        }
      }
    }
  function select(candidates, count, minGap = 0.065) {
    const hash = (p) => {
      const n = Math.sin(p.u * 173.3 + p.v * 421.7 + seed) * 43758.5453;
      return n - Math.floor(n);
    };
    const chosen = [],
      pool = [...candidates].sort((a, b) => hash(a) - hash(b));
    while (pool.length && chosen.length < count) {
      const p = pool.shift();
      if (
        chosen.every((q) => Math.hypot(q.u - p.u, (q.v - p.v) * 0.75) > minGap)
      )
        chosen.push({
          ...p,
          phase: hash(p) * Math.PI * 2,
          size: 0.8 + hash(p) * 0.5,
        });
    }
    return chosen;
  }
  peaks.sort((a, b) => b.h - a.h);
  const volcanoes = [];
  for (const p of peaks)
    if (
      volcanoes.length < 2 &&
      volcanoes.every((q) => Math.hypot(q.u - p.u, q.v - p.v) > 0.22)
    )
      volcanoes.push(p);
  return { land: select(land, 24), sea: select(sea, 28), shore, volcanoes };
}
