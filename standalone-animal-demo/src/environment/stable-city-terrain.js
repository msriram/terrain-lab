// City streets should respond to reshaped sand, not to each noisy depth frame.
const WIDTH = 65;
const HEIGHT = 49;
const HEIGHT_DEADBAND = 0.045;
const MIN_CHANGED_CELLS = 5;

function capture(sample) {
  const raw = new Float32Array(WIDTH * HEIGHT);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const value = sample(x / (WIDTH - 1), y / (HEIGHT - 1));
      raw[y * WIDTH + x] = Number.isFinite(value) ? value : NaN;
    }
  const heights = new Float32Array(raw.length);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      let sum = 0, count = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= WIDTH || yy >= HEIGHT) continue;
          const value = raw[yy * WIDTH + xx];
          if (Number.isFinite(value)) { sum += value; count++; }
        }
      heights[y * WIDTH + x] = count ? sum / count : NaN;
    }
  return heights;
}

function changedCells(before, after) {
  let count = 0;
  for (let i = 0; i < after.length; i++) {
    const a = before[i], b = after[i];
    if (Number.isFinite(a) !== Number.isFinite(b) ||
        (Number.isFinite(a) && Math.abs(a - b) >= HEIGHT_DEADBAND)) count++;
  }
  return count;
}

function sampleGrid(heights, u, v) {
  const x = Math.max(0, Math.min(WIDTH - 1, u * (WIDTH - 1)));
  const y = Math.max(0, Math.min(HEIGHT - 1, v * (HEIGHT - 1)));
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(WIDTH - 1, x0 + 1), y1 = Math.min(HEIGHT - 1, y0 + 1);
  const a = heights[y0 * WIDTH + x0], b = heights[y0 * WIDTH + x1];
  const c = heights[y1 * WIDTH + x0], d = heights[y1 * WIDTH + x1];
  if (![a, b, c, d].every(Number.isFinite)) return NaN;
  const tx = x - x0, ty = y - y0;
  return (a * (1 - tx) + b * tx) * (1 - ty) +
    (c * (1 - tx) + d * tx) * ty;
}

export function createStableCityTerrain() {
  let heights = null;
  let options = null;
  return {
    update(sample, nextOptions) {
      const next = capture(sample);
      const force = !options || Object.keys(nextOptions).some(key => options[key] !== nextOptions[key]);
      if (!force && changedCells(heights, next) < MIN_CHANGED_CELLS) return false;
      heights = next;
      options = { ...nextOptions };
      return true;
    },
    sample(u, v) { return heights ? sampleGrid(heights, u, v) : NaN; },
  };
}
