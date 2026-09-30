// Ruins and inhabited districts occupy raised seabed, leaving trenches open.
export function findUnderwaterStructureSites(sample, water, seed = 31, count = 14) {
  if (count <= 0) return [];
  const candidates = [];
  for (let y = 2; y < 31; y++)
    for (let x = 2; x < 41; x++) {
      const u = x / 42, v = y / 32, h = sample(u, v);
      if (!Number.isFinite(h) || h < water - 0.035) continue;
      const phase = ((Math.sin(x * 127.1 + y * 311.7 + seed) * 43758.5453) % 1 + 1) % 1;
      candidates.push({ u, v, h, phase: phase * Math.PI * 2, size: 0.8 + phase * 0.5 });
    }
  candidates.sort((a, b) => b.h - a.h || a.phase - b.phase);
  const sites = [];
  for (const site of candidates) {
    if (sites.every(other => Math.hypot(site.u - other.u, (site.v - other.v) * 0.75) > 0.075))
      sites.push(site);
    if (sites.length >= count) break;
  }
  return sites;
}
