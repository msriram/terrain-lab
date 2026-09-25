/** Data-only catalog. Models face +Z with +Y up. Length is in the 4 × 3 world. */
export const SPECIES = {
  fox: {
    label: "Fox",
    habitat: "land",
    model: "fox/model.glb",
    length: 0.34,
    radius: 0.045,
    speed: 0.027,
    prey: ["rabbit"],
    sight: 0.26,
    actions: { idle: "Survey", move: "Walk", chase: "Run", flee: "Run" },
    idleBehaviors: ["look", "shake", "sniff"],
    accent: "#ed974c",
  },
  deer: {
    label: "Deer",
    habitat: "land",
    model: "deer/model.glb",
    length: 0.35,
    radius: 0.047,
    speed: 0.026,
    prey: [],
    sight: 0.27,
    actions: { idle: "Graze", move: "Walk", flee: "Run", alert: "Alert" },
    idleBehaviors: ["graze", "look"],
    accent: "#cda477",
  },
  wolf: {
    label: "Wolf",
    habitat: "land",
    model: "wolf/model.glb",
    length: 0.35,
    radius: 0.046,
    speed: 0.029,
    prey: ["deer", "rabbit"],
    sight: 0.29,
    actions: { idle: "Survey", move: "Walk", chase: "Run", alert: "Howl" },
    idleBehaviors: ["look", "howl", "shake"],
    accent: "#b9c9d1",
  },
  rabbit: {
    label: "Rabbit",
    habitat: "land",
    model: "rabbit/model.glb",
    length: 0.23,
    radius: 0.033,
    speed: 0.025,
    prey: [],
    sight: 0.26,
    actions: { idle: "Nibble", move: "Hop", flee: "Hop", alert: "Alert" },
    idleBehaviors: ["nibble", "look", "shake"],
    accent: "#e0c7ae",
  },
  koi: {
    label: "Koi",
    habitat: "water",
    model: "koi/model.glb",
    length: 0.26,
    radius: 0.035,
    speed: 0.031,
    prey: [],
    sight: 0.27,
    actions: { idle: "Swim", move: "Swim", flee: "Swim", breach: "Swim" },
    idleBehaviors: ["breach", "dart"],
    accent: "#ffb16b",
  },
  shark: {
    label: "Shark",
    habitat: "water",
    model: "shark/model.glb",
    length: 0.44,
    radius: 0.058,
    speed: 0.034,
    prey: ["koi"],
    sight: 0.32,
    actions: { idle: "Swim", move: "Swim", chase: "Hunt" },
    idleBehaviors: ["dive", "cruise"],
    accent: "#8bbacb",
  },
};
export const DEFAULT_ROSTER = [
  "fox",
  "rabbit",
  "deer",
  "shark",
  "koi",
  "koi",
  "koi",
  "koi",
];
export const PRESETS = {
  meadow: {
    label: "Fox & rabbit",
    roster: ["fox", "rabbit", "rabbit", "koi", "koi", "koi", "koi", "koi"],
  },
  woodland: {
    label: "Wolf & deer",
    roster: ["wolf", "deer", "deer", "koi", "koi", "koi", "koi", "koi"],
  },
  reef: {
    label: "Shark & koi",
    roster: ["fox", "deer", "rabbit", "shark", "koi", "koi", "koi", "koi"],
  },
};
export function validateRoster(roster) {
  if (
    !Array.isArray(roster) ||
    roster.length > 8 ||
    roster.some((id) => !SPECIES[id])
  )
    throw new Error("Roster must contain up to eight known species IDs.");
}

// A population contains six prey/herbivores and two predators. Species and
// positions are randomized separately; presets remain available for experiments.
export function randomRoster(random = Math.random) {
  const pick = (items) => items[Math.floor(random() * items.length)];
  return [
    pick(["fox", "wolf"]),
    pick(["rabbit", "deer"]),
    pick(["rabbit", "deer"]),
    pick(["rabbit", "deer"]),
    "shark",
    "koi",
    "koi",
    "koi",
  ];
}
