// Stable independent rain drops: random-looking distribution without frame-to-frame jitter.
export const RAIN_STREAKS = 900;
const hash = (i, salt) => {
  const n = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const wrap = (value) => ((value % 1) + 1) % 1;
const seeds = Array.from({ length: RAIN_STREAKS }, (_, index) => ({
  x: hash(index + 1, 0),
  z: hash(index + 1, 1),
  y: 0.78 + hash(index + 1, 2) * 0.42,
  speed: 0.48 + hash(index + 1, 3) * 0.75,
  drift: (hash(index + 1, 4) - 0.5) * 0.035,
  dx: 0.003 + hash(index + 1, 5) * 0.014,
  length: 0.022 + hash(index + 1, 6) * 0.05,
}));
export function rainDrop(index, time) {
  const drop = seeds[index];
  return {
    x: wrap(drop.x + (time * drop.drift) / 4) * 4 - 2,
    z: wrap(drop.z + (time * drop.speed) / 3) * 3 - 1.5,
    y: drop.y,
    dx: drop.dx,
    length: drop.length,
    speed: drop.speed,
  };
}
