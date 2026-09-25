import { SPECIES } from "../catalog/species.js";
export const distance = (a, b) => Math.hypot(a.u - b.u, (a.v - b.v) * 0.75);
const direction = (a, b) => Math.atan2(b.u - a.u, (b.v - a.v) * 0.75);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export function chooseAction(sim, c) {
  const choices = SPECIES[c.species].idleBehaviors;
  c.mode = choices[Math.floor(sim.random() * choices.length)];
  c.actionAge = 0;
  c.actionDuration =
    c.mode === "breach"
      ? 1.35
      : c.mode === "dart"
        ? 1.1
        : 1.8 + sim.random() * 2.2;
  c.nextAction = 3 + sim.random() * 5;
}
export function updateBehavior(sim, c, dt) {
  const species = SPECIES[c.species];
  c.actionAge += dt;
  c.nextAction -= dt;
  c.cooldown = Math.max(0, c.cooldown - dt);
  let desired = c.heading + c.turn * dt,
    caught = false;
  const threats = sim.creatures.filter(
    (other) =>
      other.active &&
      !other.held &&
      other.protection <= 0 &&
      SPECIES[other.species].prey.includes(c.species) &&
      distance(c, other) < species.sight,
  );
  if (threats.length && c.protection <= 0) {
    threats.sort((a, b) => distance(a, c) - distance(b, c));
    c.mode = "flee";
    c.target = threats[0].id;
    desired = direction(threats[0], c);
    c.speedMultiplier = 2;
    c.nextAction = 2;
    // Threats interrupt ALL idle/gesture states; the escape response is immediate.
  } else if (c.mode === "breach" && c.actionAge < c.actionDuration) {
    c.speedMultiplier = 1.2;
  } else {
    const prey = sim.creatures
      .filter(
        (other) =>
          other.active &&
          !other.held &&
          other.protection <= 0 &&
          species.prey.includes(other.species) &&
          distance(c, other) < species.sight,
      )
      .sort((a, b) => distance(a, c) - distance(b, c));
    if (prey.length && c.cooldown === 0) {
      if (c.mode !== "chase") {
        c.actionAge = 0;
        sim.events.unshift({
          type: "chase",
          time: sim.time,
          predator: c.species,
          prey: prey[0].species,
        });
        sim.events.length = Math.min(sim.events.length, 5);
      }
      c.mode = "chase";
      c.target = prey[0].id;
      desired = direction(c, prey[0]);
      c.speedMultiplier = 1.6;
      if (c.actionAge > 8) {
        c.cooldown = 4 + sim.random() * 3;
        c.mode = "look";
        c.actionAge = 0;
        c.actionDuration = 1.4;
        c.target = null;
        caught = true;
      }
    } else {
      c.target = null;
      if (
        ["chase", "flee"].includes(c.mode) ||
        c.actionAge >= c.actionDuration
      ) {
        c.mode = "roam";
        c.actionAge = 0;
        c.actionDuration = Infinity;
      }
      if (c.nextAction <= 0 && c.mode === "roam") chooseAction(sim, c);
      const moving = ["roam", "dart", "cruise", "dive", "breach"].includes(
        c.mode,
      );
      c.speedMultiplier =
        c.mode === "feed"
          ? 0
          : moving
            ? c.mode === "dart"
              ? 2
              : 1
            : c.habitat === "water"
              ? 0.65
              : 0;
    }
  }
  if (caught) c.speedMultiplier = 0;
  // Steer smoothly towards a target, then let the habitat controller constrain motion.
  desired =
    c.heading +
    Math.max(-dt * 3.2, Math.min(dt * 3.2, wrap(desired - c.heading)));
  return desired;
}
