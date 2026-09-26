// Normalized terrain heights: deposits build gradually and follow terrain edits.
const clamp = (v) => Math.max(0, Math.min(1, v));
export function depositStyle(world, recipe) {
  if (recipe.weather === "snow")
    return { kind: "snow", color: [234, 246, 255], opacity: 0.82 };
  if (recipe.weather === "sand" || recipe.weather === "dust")
    return {
      kind: "sand",
      color: world === "mars" ? [216, 137, 87] : [240, 207, 140],
      opacity: 0.36,
    };
  if (recipe.underwater)
    return { kind: "silt", color: [144, 207, 189], opacity: 0.23 };
  if (["earth", "forest", "topographic", "tropical"].includes(world))
    return { kind: "moss", color: [96, 155, 70], opacity: 0.3 };
  if (recipe.eruption)
    return { kind: "ash", color: [74, 64, 62], opacity: 0.3 };
  return null;
}
export function depositTarget(kind, height, slope, water, pattern = 0.5) {
  if (!Number.isFinite(height)) return 0;
  const land = clamp((height - water) / 0.035);
  const gentle = 1 / (1 + slope * 0.55);
  if (kind === "snow")
    return (
      land *
      clamp((height - (water + 0.13)) / 0.3) *
      gentle *
      (0.7 + pattern * 0.3)
    );
  if (kind === "moss")
    return (
      land *
      Math.exp(-Math.max(0, height - water - 0.06) * 7) *
      gentle *
      pattern
    );
  if (kind === "silt")
    return clamp((water - height) / 0.1) * gentle * (0.4 + pattern * 0.6);
  if (kind === "sand")
    return land * gentle * (0.45 + 0.55 * (1 - clamp(height))) * pattern;
  if (kind === "ash") return land * gentle * pattern;
  return 0;
}
export function settleDeposit(current, target, dt) {
  // Melting/erosion is faster than accumulation, without sudden popping.
  return (
    current +
    (target - current) *
      (1 - Math.exp(-Math.max(0, dt) / (target < current ? 1.4 : 7)))
  );
}
