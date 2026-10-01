/** Local sand height and contiguous raised area both contribute to reef size. */
export function reefGrowth(sampleTerrain, u, v, water = 0.43) {
  const center = sampleTerrain(u, v);
  if (!Number.isFinite(center) || center < water + 0.035) return 0;
  let height = 0;
  let raised = 0;
  let count = 0;
  for (const du of [-0.045, 0, 0.045])
    for (const dv of [-0.06, 0, 0.06]) {
      const h = sampleTerrain(u + du, v + dv);
      if (!Number.isFinite(h)) continue;
      height += h;
      raised += Math.max(0, Math.min(1, (h - water) * 5));
      count++;
    }
  if (count < 7) return 0;
  const mean = height / count;
  const mass = raised / count;
  return Math.max(0, Math.min(1, (mean - water + 0.05) * 2.7)) * mass;
}
