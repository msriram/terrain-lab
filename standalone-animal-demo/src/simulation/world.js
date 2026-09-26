// Pure deterministic simulation. No DOM, WebGL, sprites, or sensor dependency.
import { SPECIES, randomRoster, validateRoster } from "../catalog/species.js";
import { updateBehavior, chooseAction } from "./behaviors.js";
const TAU = Math.PI * 2;
export function seededRandom(seed = 7) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export class AnimalSimulation {
  constructor({
    sampleTerrain,
    waterLevel = 0.43,
    seed = Math.floor(Math.random() * 4294967296),
    roster,
  }) {
    this.sampleTerrain = sampleTerrain;
    this.waterLevel = waterLevel;
    this.random = seededRandom(seed);
    this.time = 0;
    this.events = [];
    this.captures = 0;
    this.rescues = 0;
    this.setRoster(roster ?? randomRoster(this.random));
  }
  setRoster(roster) {
    validateRoster(roster);
    this.creatures = roster.map((species, id) => ({
      id,
      species,
      habitat: SPECIES[species].habitat,
      radius: SPECIES[species].radius,
      u: 0.5,
      v: 0.5,
      heading: this.random() * TAU,
      turn: 0,
      active: false,
      mode: "roam",
      target: null,
      actionAge: 0,
      actionDuration: Infinity,
      nextAction: 1 + this.random() * 5,
      cooldown: 0,
      speedMultiplier: 1,
      timer: this.random() * 4,
      moving: false,
      held: false,
      protection: 1.5,
      respawnAt: null,
    }));
    this.events = [];
    this.reconcile();
  }
  valid(c, u, v) {
    const r = c.radius;
    if (u < r || v < (r * 4) / 3 || u > 1 - r || v > 1 - (r * 4) / 3)
      return false;
    const center = this.sampleTerrain(u, v);
    if (!Number.isFinite(center)) return false;
    for (let i = 0; i < 9; i++) {
      const a = (i * TAU) / 8,
        e =
          i === 8
            ? center
            : this.sampleTerrain(
                u + Math.cos(a) * r,
                v + (Math.sin(a) * r * 4) / 3,
              );
      if (
        !Number.isFinite(e) ||
        (c.habitat === "water"
          ? e >= this.waterLevel - 0.009
          : e <= this.waterLevel + 0.017 || Math.abs(e - center) > 0.105)
      )
        return false;
    }
    return true;
  }
  relocate(c) {
    let best = null,
      distance = Infinity;
    for (let y = 1; y < 40; y++)
      for (let x = 1; x < 54; x++) {
        const u = x / 54,
          v = y / 40,
          d = (u - c.u) ** 2 + (v - c.v) ** 2;
        if (d < distance && this.valid(c, u, v)) {
          best = { u, v };
          distance = d;
        }
      }
    c.active = !!best;
    if (best) Object.assign(c, best);
  }
  reconcile() {
    for (const c of this.creatures) {
      if (c.respawnAt !== null) continue;
      if (c.active && this.valid(c, c.u, c.v)) continue;
      if (c.active) {
        c.active = false;
        c.respawnAt = this.time + 5;
        continue;
      }
      let found = false;
      for (let j = 0; j < 400; j++) {
        const u = 0.07 + this.random() * 0.86;
        const v = 0.08 + this.random() * 0.84;
        if (
          this.valid(c, u, v) &&
          this.creatures.every(
            (other) =>
              other === c ||
              !other.active ||
              Math.hypot((other.u - u) * 4, (other.v - v) * 3) > 0.29,
          )
        ) {
          Object.assign(c, { u, v, active: true });
          found = true;
          break;
        }
      }
      if (!found) this.relocate(c);
    }
  }
  setTerrain(sampleTerrain, waterLevel = this.waterLevel) {
    if (
      typeof sampleTerrain !== "function" ||
      !Number.isFinite(waterLevel) ||
      waterLevel < 0 ||
      waterLevel > 1
    )
      throw new Error("Terrain requires a sampler and water level in 0..1.");
    this.sampleTerrain = sampleTerrain;
    this.waterLevel = waterLevel;
    this.reconcile();
  }
  stir() {
    for (const c of this.creatures) {
      chooseAction(this, c);
      if (c.species === "koi") {
        c.mode = "breach";
        c.actionAge = 0;
        c.actionDuration = 1.35;
      }
      c.cooldown = 0;
    }
  }
  update(dt) {
    dt = Math.max(0, Math.min(dt, 0.05));
    this.time += dt;
    for (const c of this.creatures) {
      c.moving = false;
      c.protection = Math.max(0, c.protection - dt);
      if (c.respawnAt !== null && this.time >= c.respawnAt) {
        c.respawnAt = null;
        c.mode = "roam";
        c.actionAge = 0;
        c.actionDuration = Infinity;
        c.protection = 3;
        c.cooldown = 2;
        this.reconcile();
      }
      if (!c.active || c.held) continue;
      if (!this.valid(c, c.u, c.v)) {
        c.active = false;
        c.respawnAt = this.time + 5;
        continue;
      }
      c.timer -= dt;
      if (c.timer <= 0) {
        c.turn = (this.random() - 0.5) * 1.2;
        c.timer = 1.5 + this.random() * 3;
      }
      let heading = updateBehavior(this, c, dt);
      if (c.speedMultiplier === 0) continue;
      if (c.mode !== "chase" && c.mode !== "flee")
        for (const other of this.creatures) {
          if (other === c || !other.active || other.habitat !== c.habitat)
            continue;
          const du = (other.u - c.u) * 4,
            dv = (other.v - c.v) * 3;
          if (Math.hypot(du, dv) < 0.32) {
            const away = Math.atan2(-du, -dv),
              delta = Math.atan2(
                Math.sin(away - c.heading),
                Math.cos(away - c.heading),
              );
            heading =
              c.heading + Math.max(-dt * 1.6, Math.min(dt * 1.6, delta));
          }
        }
      const ahead = 0.045 + c.speedMultiplier * 0.01;
      if (
        !this.valid(
          c,
          c.u + Math.sin(heading) * ahead,
          c.v + (Math.cos(heading) * ahead * 4) / 3,
        )
      ) {
        let target = null;
        for (let i = 1; i <= 12 && target === null; i++)
          for (const sign of [-1, 1]) {
            const a = c.heading + (sign * i * Math.PI) / 12;
            if (
              this.valid(
                c,
                c.u + Math.sin(a) * ahead,
                c.v + (Math.cos(a) * ahead * 4) / 3,
              )
            ) {
              target = a;
              break;
            }
          }
        if (target !== null) {
          const delta = Math.atan2(
            Math.sin(target - c.heading),
            Math.cos(target - c.heading),
          );
          heading = c.heading + Math.max(-dt * 3.2, Math.min(dt * 3.2, delta));
        } else heading = c.heading + dt * 1.8;
      }
      const speed = SPECIES[c.species].speed * c.speedMultiplier;
      const u = c.u + Math.sin(heading) * speed * dt,
        v = c.v + (Math.cos(heading) * speed * dt * 4) / 3;
      c.heading = heading;
      if (this.valid(c, u, v)) {
        c.u = u;
        c.v = v;
        c.moving = true;
      }
    }
    this.resolveCaptures();
  }
  resolveCaptures() {
    for (const predator of this.creatures) {
      if (!predator.active || predator.held || predator.mode !== "chase")
        continue;
      const prey = this.creatures.find((c) => c.id === predator.target);
      if (!prey || !prey.active || prey.held || prey.protection > 0) continue;
      const gap = Math.hypot(predator.u - prey.u, (predator.v - prey.v) * 0.75);
      // A center-distance catch envelope, smaller than visual body footprints.
      if (gap > (predator.radius + prey.radius) * 0.4) continue;
      if (!this.valid(predator, prey.u, prey.v)) continue;
      prey.active = false;
      prey.mode = "eaten";
      prey.target = null;
      prey.respawnAt = this.time + 5;
      predator.mode = "feed";
      predator.actionAge = 0;
      predator.actionDuration = 2.2;
      predator.cooldown = 5;
      predator.target = null;
      predator.speedMultiplier = 0;
      this.captures++;
      this.events.unshift({
        type: "capture",
        time: this.time,
        predator: predator.species,
        prey: prey.species,
      });
      this.events.length = Math.min(this.events.length, 5);
    }
  }
  grab(id) {
    const c = this.creatures.find((c) => c.id === id && c.active);
    if (!c) return false;
    c.held = true;
    c.mode = "held";
    c.target = null;
    c.moving = false;
    return true;
  }
  move(id, u, v) {
    const c = this.creatures.find((c) => c.id === id && c.held);
    if (!c || !this.valid(c, u, v)) return false;
    c.u = u;
    c.v = v;
    return true;
  }
  release(id) {
    const c = this.creatures.find((c) => c.id === id && c.held);
    if (!c) return false;
    c.held = false;
    c.protection = 3;
    c.cooldown = 1;
    c.mode = "roam";
    c.nextAction = 3;
    c.actionAge = 0;
    c.actionDuration = Infinity;
    this.rescues++;
    return true;
  }
}
