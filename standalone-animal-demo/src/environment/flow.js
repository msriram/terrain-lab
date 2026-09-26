// Conservative downhill transport on the measured terrain, at a fixed timestep.
export class LavaFlow {
  constructor(width = 96, height = 72) {
    this.width = width;
    this.height = height;
    this.ground = new Float32Array(width * height);
    this.mass = new Float32Array(width * height);
    this.heat = new Float32Array(width * height);
    this.delta = new Float32Array(width * height);
    this.sources = [];
  }
  setTerrain(sample, peaks) {
    const { width: w, height: h } = this;
    let difference = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = sample(x / (w - 1), y / (h - 1));
        difference += Math.abs(
          this.ground[y * w + x] - (Number.isFinite(v) ? v : 10),
        );
        this.ground[y * w + x] = Number.isFinite(v) ? v : 10;
      }
    // A completely different fixture/rig must not inherit the old lava pools.
    if (difference / (w * h) > 0.05) this.reset();
    const sources = peaks.map(
      (p) => Math.round(p.v * (h - 1)) * w + Math.round(p.u * (w - 1)),
    );
    if (sources.length && this.sources.length && sources.every(i => this.sources.every(j => Math.hypot((i%w-j%w)/w, (Math.floor(i/w)-Math.floor(j/w))/h) > .08))) this.reset();
    this.sources = sources;
  }
  reset() {
    this.mass.fill(0);
    this.heat.fill(0);
  }
  step(dt) {
    const { width: w, height: h, mass: m, ground: g, heat, delta: d } = this;
    d.fill(0);
    for (const i of this.sources) {
      m[i] += dt * 0.15;
      heat[i] = 1;
    }
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (m[i] < 0.00001) continue;
        const neighbors = [i - 1, i + 1, i - w, i + w];
        const slopes = neighbors.map((j) =>
          Math.max(0, g[i] + m[i] - g[j] - m[j]),
        );
        const total = slopes.reduce((a, b) => a + b, 0);
        if (total > 0) {
          const out =
            Math.min(m[i] * 0.45, total * dt * 0.45) * (0.15 + 0.85 * heat[i]);
          d[i] -= out;
          neighbors.forEach((j, k) => {
            const amount = (out * slopes[k]) / total;
            d[j] += amount;
            if (amount > 0) heat[j] = Math.max(heat[j], heat[i] * 0.997);
          });
        }
      }
    for (let i = 0; i < m.length; i++) {
      m[i] = Math.max(0, m[i] + d[i]);
      heat[i] = Math.max(0, heat[i] - dt * 0.018);
    }
  }
}
