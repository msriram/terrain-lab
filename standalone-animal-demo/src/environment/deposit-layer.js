import * as T from "three";
import {
  depositStyle,
  depositTarget,
  settleDeposit,
} from "./surface-deposits.js";

export function createDepositLayer(root) {
  const w = 192,
    h = 144,
    canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d"),
    pixels = ctx.createImageData(w, h);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const geometry = new T.PlaneGeometry(4, 3);
  geometry.rotateX(-Math.PI / 2);
  const material = new T.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.position.y = 0.02;
  root.add(mesh);
  const mass = new Float32Array(w * h);
  let world = "",
    elapsed = 0,
    coverage = 0;
  return {
    update(dt, theme, recipe, sample, water, motion) {
      const style = depositStyle(theme, recipe);
      mesh.visible = !!style;
      if (theme !== world) {
        world = theme;
        mass.fill(0);
        pixels.data.fill(0);
        ctx.putImageData(pixels, 0, 0);
        texture.needsUpdate = true;
        elapsed = 0;
        coverage = 0;
      }
      if (!style || !motion) return;
      elapsed += Math.max(0, Math.min(dt, 0.1));
      if (elapsed < 0.1) return;
      const step = elapsed;
      elapsed = 0;
      coverage = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const u = x / (w - 1),
            v = y / (h - 1),
            height = sample(u, v);
          const dx =
            sample(Math.min(1, u + 1 / w), v) -
            sample(Math.max(0, u - 1 / w), v);
          const dy =
            sample(u, Math.min(1, v + 1 / h)) -
            sample(u, Math.max(0, v - 1 / h));
          const slope = Math.hypot((dx * w) / 2, (dy * h) / 2);
          const pattern =
            0.55 +
            0.25 * Math.sin(u * 41 + Math.sin(v * 23) * 2) +
            0.2 * Math.sin(v * 67 + u * 29);
          const i = y * w + x,
            j = i * 4;
          const target = depositTarget(
            style.kind,
            height,
            slope,
            water,
            pattern,
          );
          mass[i] = Number.isFinite(target)
            ? settleDeposit(mass[i], target, step)
            : 0;
          // Never paint holes in Kinect data, even while old deposits are melting.
          if (!Number.isFinite(height)) mass[i] = 0;
          coverage += mass[i];
          const grain = 0.94 + 0.06 * Math.sin(x * 2.3 + y * 4.1);
          pixels.data[j] = style.color[0] * grain;
          pixels.data[j + 1] = style.color[1] * grain;
          pixels.data[j + 2] = style.color[2] * grain;
          pixels.data[j + 3] = mass[i] * style.opacity * 255;
        }
      ctx.putImageData(pixels, 0, 0);
      texture.needsUpdate = true;
    },
    stats: () => ({ depositCoverage: coverage / (w * h) }),
    dispose() {
      root.remove(mesh);
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
