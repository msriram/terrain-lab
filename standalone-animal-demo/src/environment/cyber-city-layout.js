// Street blocks are admitted only where sand supports them. A route disappears
// when either of its neighboring blocks is submerged or sharply uneven.
export function planCyberCity(sample, water, seed = 31, density = 1) {
  const columns = 7, rows = 5;
  const blocks = [];
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const u = (column + .5) / columns, v = (row + .5) / rows;
    const heights = [sample(u, v), sample(u - .045, v), sample(u + .045, v), sample(u, v - .06), sample(u, v + .06)];
    if (heights.some((height) => !Number.isFinite(height) || height < water + .025)) continue;
    if (Math.max(...heights) - Math.min(...heights) > .25) continue;
    const hash = ((column * 73856093 ^ row * 19349663 ^ seed * 83492791) >>> 0) / 4294967295;
    if (hash > Math.min(1, Math.max(0, density) * 1.35)) continue;
    blocks.push({ column, row, u, v, height: heights[0], phase: hash });
  }
  const occupied = new Set(blocks.map(({ column, row }) => `${column},${row}`));
  const roads = [];
  for (const block of blocks) {
    const { column, row } = block;
    if (occupied.has(`${column + 1},${row}`)) roads.push({
      u0: (column + .5) / columns, v0: (row + .5) / rows,
      u1: (column + 1.5) / columns, v1: (row + .5) / rows,
    });
    if (occupied.has(`${column},${row + 1}`)) roads.push({
      u0: (column + .5) / columns, v0: (row + .5) / rows,
      u1: (column + .5) / columns, v1: (row + 1.5) / rows,
    });
  }
  return { blocks, roads };
}
