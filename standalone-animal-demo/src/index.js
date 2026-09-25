// Public integration boundary. Controller UI and fixture terrain stay in the demo.
export { createAnimalLayer } from "./rendering/animal-layer.js";
export {
  SPECIES,
  PRESETS,
  DEFAULT_ROSTER,
  randomRoster,
} from "./catalog/species.js";

export { bindAnimalInteraction } from "./interaction/drag.js";

export {
  LANDSCAPES,
  AQUATIC_ROSTER,
  WORLD_ROSTERS,
  rosterForWorld,
} from "./catalog/landscapes.js";
