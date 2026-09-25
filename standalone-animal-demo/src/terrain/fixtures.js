export const FIXTURES = ["River valley", "Twin islands", "Tidal lagoon"];
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
const mix = (a, b, t) =>
  a.map((x, i) => Math.round(x + (b[i] - x) * Math.max(0, Math.min(1, t))));
export function paintTerrain(canvas, sample, water, pack) {
  const w = (canvas.width = 1024),
    h = (canvas.height = 768),
    ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  const night = pack === "atlantis";
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
