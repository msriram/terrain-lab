import { LANDSCAPES } from "../catalog/landscapes.js";
export const FIXTURES = [
  "River valley",
  "Twin islands",
  "Tidal lagoon",
  "Galaxy clusters",
];
export function createTerrain(fixture = 0) {
  return (u, v) => {
    let h;
    if (fixture === 0) {
      const center = 0.5 + 0.13 * Math.sin(v * 6.4 - 0.8);
      h = 0.24 + Math.abs(u - center) * 1.3 + 0.035 * Math.sin(u * 18 + v * 8);
    } else if (fixture === 1) {
      const a = Math.exp(-(((u - 0.29) / 0.23) ** 2 + ((v - 0.38) / 0.3) ** 2));
      const b = Math.exp(
        -(((u - 0.75) / 0.21) ** 2 + ((v - 0.68) / 0.27) ** 2),
      );
      h = 0.23 + 0.54 * Math.max(a, b);
    } else if (fixture === 3) {
      const peaks = [
        [0.25, 0.32, 0.8],
        [0.67, 0.34, 0.67],
        [0.53, 0.73, 0.74],
      ];
      h =
        0.26 +
        peaks.reduce(
          (sum, [cx, cy, amp]) =>
            sum +
            amp * Math.exp(-(((u - cx) / 0.11) ** 2 + ((v - cy) / 0.12) ** 2)),
          0,
        );
      h -=
        0.16 * Math.exp(-(((u - 0.42) / 0.2) ** 2 + ((v - 0.57) / 0.18) ** 2));
    } else {
      const r = Math.hypot((u - 0.5) * 1.1, v - 0.5);
      h =
        0.24 +
        0.51 * Math.exp(-(((r - 0.36) / 0.14) ** 2)) +
        0.035 * Math.sin(u * 15) * Math.cos(v * 17);
    }
    return Math.max(0, Math.min(1, h));
  };
}
export function createSculptableTerrain(fixture = 0, width = 160, height = 120) {
  const base = createTerrain(fixture), edits = new Float32Array(width * height);
  const clamp = (value) => Math.max(0, Math.min(1, value));
  function delta(u, v) {
    const x = clamp(u) * (width - 1), y = clamp(v) * (height - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1), tx = x - x0, ty = y - y0;
    const a = edits[y0 * width + x0], b = edits[y0 * width + x1], c = edits[y1 * width + x0], d = edits[y1 * width + x1];
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
  }
  return {
    sample: (u, v) => clamp(base(u, v) + delta(u, v)),
    sculpt(u, v, amount, radius = 0.075) {
      const minX = Math.max(0, Math.floor((u - radius) * width)), maxX = Math.min(width - 1, Math.ceil((u + radius) * width));
      const minY = Math.max(0, Math.floor((v - radius) * height)), maxY = Math.min(height - 1, Math.ceil((v + radius) * height));
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const du = x / (width - 1) - u, dv = y / (height - 1) - v, distance = Math.hypot(du, dv);
        if (distance < radius) edits[y * width + x] = Math.max(-1, Math.min(1, edits[y * width + x] + amount * (1 - distance / radius) ** 2));
      }
    },
  };
}
const mix = (a, b, t) =>
  a.map((x, i) => Math.round(x + (b[i] - x) * Math.max(0, Math.min(1, t))));
export function paintTerrain(canvas, sample, water, pack) {
  const w = (canvas.width = 1024),
    h = (canvas.height = 768),
    ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  const colors = (LANDSCAPES[pack] || LANDSCAPES.earth).colors.map((hex) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
  );
  const night = ["atlantis", "coral", "deepsea"].includes(pack);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x / w,
        v = y / h,
        e = sample(u, v),
        wet = e < water;
      let c = wet
        ? mix(
            night ? [7, 24, 55] : [17, 66, 88],
            night ? [22, 98, 119] : [69, 144, 153],
            1 - (water - e) / 0.23,
          )
        : e < water + 0.027
          ? night
            ? [89, 120, 131]
            : [218, 204, 158]
          : mix(
              night ? [41, 76, 87] : [125, 160, 99],
              night ? [81, 104, 107] : [196, 190, 135],
              (e - water) / 0.48,
            );
      if (!night && pack !== "earth" && pack !== "forest" && !wet)
        c = mix(colors[0], colors[1], (e - water) / 0.55);
      if (night) c = mix([5, 25, 53], [36, 120, 128], e * 0.85 + 0.1);
      if (pack === "universe") c = mix([5, 10, 30], [36, 25, 78], e);
      const slope = (sample(u + 0.002, v + 0.002) - e) * 100;
      const contour = Math.abs(((e * 26) % 1) - 0.5) < 0.035;
      const light =
        1 +
        Math.max(-0.12, Math.min(0.12, slope * 0.14)) -
        (contour ? 0.075 : 0);
      const i = (y * w + x) * 4;
      for (let k = 0; k < 3; k++) img.data[i + k] = c[k] * light;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
}
