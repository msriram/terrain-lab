# Copper: the lost bronze citadel

Copper is an original procedural dwarven city, rendered through the same landscape layer in Browser Mode and Live Sandbox Mode. Its visual vocabulary is aged bronze, pale masonry, domes, vaulted halls, broken gates, working foundries, and articulated street automatons. No external model or texture downloads are required.

## Where to extend it

- `standalone-animal-demo/src/environment/copper-layout.js`: deterministic districts, dry building footprints, streets, short bridges, and patrol routes derived from the current height field.
- `standalone-animal-demo/src/environment/copper-citadel.js`: architecture, generated masonry texture, steam, flywheels, pistons, and walking automatons. Static geometry is merged by material; moving parts retain independent transforms.
- `standalone-animal-demo/src/environment/world-architecture.js`: shared integration and lifecycle for Copper and Emerald.
- `standalone-animal-demo/src/catalog/landscapes.js`: scene caption and selectable wildlife roster. The brass scarabs belong to the wildlife simulation; the street automatons are animated scenery following city routes.

Foundations stay at their sampled terrain positions. A local shear exposes building facades under the fixed overhead camera without changing projector calibration. Raising land allows new districts; wet or invalid footprints reject buildings. Flooding removes routes and their automatons. Motion uses the shared scene clock, so pausing remains consistent between modes.

## Check changes

Run `npm test --prefix standalone-animal-demo`, then `node scripts/build-site.mjs`. From `standalone-animal-demo`, run `node scripts/verify-copper.mjs` to capture both modes, check motion pause and flood/rebuild behavior, and detect browser errors. Screenshots go to `/tmp/terrain-copper-review` by default (`COPPER_QA_DIR` overrides this). Run the full `npm run test:site --prefix standalone-animal-demo` for shared controls and projector regression coverage.
