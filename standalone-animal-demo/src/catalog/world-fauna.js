/** Original world-signature animals; each has a dedicated animated GLB. */
export const WORLD_FAUNA = {
  dusthopper: {
    label: "Dust hopper",
    world: "mars",
    form: "hopper",
    colors: ["#ba7150", "#f6b273", "#563c43"],
    length: 0.3,
  },
  manta: {
    label: "Atlantis manta",
    world: "atlantis",
    form: "manta",
    habitat: "water",
    colors: ["#487f87", "#7ca9a9", "#acc9bf"],
    length: 0.4,
  },
  mermaid: {
    label: "Mermaid harpist",
    world: "atlantis",
    form: "mermaid",
    habitat: "water",
    colors: ["#426c7b", "#6b9290", "#8fa9a7"],
    length: 0.46,
  },
  merman: {
    label: "Merman sentinel",
    world: "atlantis",
    form: "merman",
    habitat: "water",
    colors: ["#355b70", "#628b8d", "#88a4a4"],
    length: 0.49,
  },
  glowbug: {
    label: "Glow beetle",
    world: "alien",
    form: "beetle",
    colors: ["#8cd467", "#e794d5", "#e8f9a1"],
    length: 0.27,
  },
  lunamoth: {
    label: "Lunar moth",
    world: "moon",
    form: "moth",
    colors: ["#aebdce", "#dbe4db", "#8399c2"],
    length: 0.3,
  },
  narwhal: {
    label: "Narwhal",
    world: "ice",
    form: "narwhal",
    habitat: "water",
    colors: ["#7e949d", "#d8e7e2", "#f4ead2"],
    length: 0.47,
  },
  polarbear: {
    label: "Polar bear",
    world: "ice",
    form: "polarbear",
    colors: ["#e8e8d8", "#f5f0db", "#404750"],
    length: 0.42,
    prey: ["penguin"],
  },
  penguin: {
    label: "Penguin",
    world: "ice",
    form: "penguin",
    habitat: "amphibious",
    colors: ["#273743", "#f2f1e5", "#e6a25a"],
    length: 0.24,
  },
  walrus: {
    label: "Walrus",
    world: "ice",
    form: "walrus",
    habitat: "amphibious",
    colors: ["#8f7567", "#b6947f", "#eee0bd"],
    length: 0.43,
  },
  lavafinch: {
    label: "Lava finch",
    world: "volcanic",
    form: "bird",
    colors: ["#553f48", "#f86a39", "#ffd46c"],
    length: 0.28,
  },
  sandscorpion: {
    label: "Sand scorpion",
    world: "desert",
    form: "scorpion",
    colors: ["#d19b5e", "#795c41", "#f5d18b"],
    length: 0.34,
    prey: ["dusthopper"],
  },
  stagbeetle: {
    label: "Stag beetle",
    world: "forest",
    form: "stagbeetle",
    colors: ["#423a34", "#8b5f43", "#d4a764"],
    length: 0.3,
  },
  seahorse: {
    label: "Coral seahorse",
    world: "coral",
    form: "seahorse",
    habitat: "water",
    colors: ["#f5a276", "#e4dc89", "#a15ca4"],
    length: 0.27,
  },
  muskox: {
    label: "Musk ox",
    world: "tundra",
    form: "ox",
    colors: ["#6b5348", "#ccb995", "#f2e8c8"],
    length: 0.38,
  },
  brownbear: {
    label: "Brown bear", world: "tundra", form: "bear",
    colors: ["#68452f", "#9a6b43", "#2c2625"], length: 0.43,
    prey: ["dallsheep"],
  },
  dallsheep: {
    label: "Dall sheep", world: "tundra", form: "sheep",
    colors: ["#e5dfc7", "#c0ad87", "#514a42"], length: 0.32,
  },
  moose: {
    label: "Moose", world: "tundra", form: "moose",
    colors: ["#594735", "#a28a68", "#38342e"], length: 0.45,
  },
  prismwing: {
    label: "Prism wing",
    world: "synthwave",
    form: "butterfly",
    colors: ["#f87dc9", "#76dce8", "#a980ee"],
    length: 0.32,
  },
  neonbehemoth: {
    label: "Neon behemoth", world: "synthwave", form: "behemoth",
    colors: ["#35245f", "#f345ac", "#7d52df"], length: 0.52,
    prey: ["glitchimp", "prismwing"], locomotion: "bounce",
  },
  glitchimp: {
    label: "Glitch imp", world: "synthwave", form: "imp",
    colors: ["#512b88", "#ff70cb", "#60e9ee"], length: 0.29,
    locomotion: "bounce",
  },
  velvetphantom: {
    label: "Velvet phantom", world: "synthwave", form: "phantom",
    colors: ["#462b83", "#e46be9", "#a6f2ff"], length: 0.34,
    locomotion: "bounce",
  },
  ventcrab: {
    label: "Vent crab",
    world: "thermal",
    form: "crab",
    colors: ["#db8d5a", "#ebc375", "#5d7383"],
    length: 0.31,
  },
  mountaingoat: {
    label: "Mountain goat",
    world: "topographic",
    form: "goat",
    colors: ["#e1d4b1", "#8d927e", "#644d40"],
    length: 0.34,
  },
  heatserpent: {
    label: "Heat serpent",
    world: "infrared",
    form: "serpent",
    colors: ["#cd425d", "#ff9f57", "#ffde8c"],
    length: 0.42,
    prey: ["lavafinch", "ventcrab"],
  },
  clockbeetle: {
    label: "Clockwork beetle",
    world: "copper",
    form: "clockbeetle",
    colors: ["#af7859", "#74b3a5", "#e4bb80"],
    length: 0.29,
  },
  jadebird: {
    label: "Jade bird",
    world: "emerald",
    form: "peacock",
    colors: ["#258963", "#8bcf78", "#f5db94"],
    length: 0.33,
  },
  sugarsnail: {
    label: "Sugar snail",
    world: "candy",
    form: "snail",
    colors: ["#ec91b7", "#ffe2a7", "#aaadf0"],
    length: 0.28,
  },
  anglerfish: {
    label: "Abyss angler",
    world: "deepsea",
    form: "angler",
    habitat: "water",
    colors: ["#265e75", "#92b8aa", "#d5f2a4"],
    length: 0.34,
    prey: ["koi", "seahorse"],
  },
  inkbird: {
    label: "Ink bird",
    world: "monochrome",
    form: "inkbird",
    colors: ["#28383c", "#a9c0bc", "#eff4e8"],
    length: 0.31,
  },
  signalmoth: {
    label: "Signal moth",
    world: "neuron",
    form: "signalmoth",
    colors: ["#806bc0", "#6adddf", "#f5b6ca"],
    length: 0.3,
  },
  electronbug: {
    label: "Electron beetle",
    world: "atomic",
    form: "electronbug",
    colors: ["#5686b8", "#f2a9ce", "#f6eb9f"],
    length: 0.28,
  },
  dreamwhale: {
    label: "Dream whale",
    world: "surreal",
    form: "whale",
    colors: ["#ac8fcf", "#f1b4d5", "#ffecbc"],
    length: 0.43,
  },
};
export function worldFaunaSpecies() {
  return Object.fromEntries(
    Object.entries(WORLD_FAUNA).map(([id, animal]) => [
      id,
      {
        label: animal.label,
        habitat: animal.habitat || "land",
        model: `${id}/model.glb`,
        length: animal.length,
        radius: animal.length * 0.12,
        speed:
          animal.locomotion === "bounce"
            ? 0.004
            : animal.habitat === "water"
            ? 0.031
            : animal.habitat === "amphibious"
              ? 0.027
              : 0.028,
        prey: animal.prey || [],
        sight: 0.29,
        actions: {
          idle: "Idle",
          move: animal.locomotion === "bounce" ? "Jump" : "Move",
          chase: "Dash",
          flee: "Dash",
          breach: animal.locomotion === "bounce" ? "Jump" : "Move",
        },
        idleBehaviors:
          animal.habitat === "water"
            ? ["cruise", "dive", "breach"]
            : animal.habitat === "amphibious"
              ? ["look", "dive", "cruise"]
              : ["look", "dart", "shake"],
        accent: animal.colors[1],
        world: animal.world,
        locomotion: animal.locomotion,
      },
    ]),
  );
}
