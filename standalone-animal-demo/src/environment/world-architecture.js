import {
  planCopperWorks,
  planEmeraldCity,
} from "./world-architecture-layout.js";
import { createCopperCitadel } from "./copper-citadel.js";
import { createEmeraldCity } from "./emerald-city.js";

/** Terrain-driven worlds share the same lifecycle in browser and projector modes. */
export function createWorldArchitecture(root) {
  const copper = createCopperCitadel(root),
    emerald = createEmeraldCity(root);
  let copperPlan = { stations: [], pipes: [] };
  return {
    rebuild(theme, sample, water, seed, density) {
      copperPlan =
        theme === "copper"
          ? planCopperWorks(sample, water, seed, density)
          : { stations: [], pipes: [] };
      copper.rebuild(theme === "copper" ? copperPlan : null, sample, water);
      emerald.rebuild(
        theme === "emerald"
          ? planEmeraldCity(sample, water, seed, density)
          : null,
        sample,
        water,
      );
    },
    update(time) {
      copper.update(time);
      emerald.update(time);
    },
    steamSources: () => copperPlan.stations,
    stats: () => ({
      ...copper.stats(),
      copperStations: copperPlan.stations.length,
      copperPipes: copperPlan.pipes.length,
      ...emerald.stats(),
    }),
    dispose() {
      copper.dispose();
      emerald.dispose();
    },
  };
}
