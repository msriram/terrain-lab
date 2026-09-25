# Add or replace a species

## 1. Prepare an animated model

Use a redistributable `.glb` with embedded textures and named animation clips.
Prefer a small stylized mesh, readable dorsal silhouette, and a modest texture
budget. Export from Blender as glTF 2.0, with +Y up and the nose facing +Z.
Apply transforms before export. Export skeletal or hierarchical animation;
root translation must stay in place because the simulation owns world motion.
Test that eyes, ears, fins, antlers and markings are visible from directly above.

The current loader supports ordinary glTF/GLB without Draco, Meshopt, or KTX2
decoders. Export uncompressed GLB or add/bundle the appropriate local decoder.
For a skinned asset, all instances are cloned with SkeletonUtils so each gets
its own skeleton and independent AnimationMixer.

Place files at:

```text
public/assets/animals/otter/model.glb
public/assets/animals/otter/model.meta.json
```

Record author, explicit license, and direct source URL in `ATTRIBUTION.md`.
Keep the license notice. Do not use a model merely because it is downloadable.
The per-model JSON is inventory metadata; the catalog controls runtime behavior.

## 2. Add one catalog entry

In `src/catalog/species.js`, add to `SPECIES`:

```js
otter: {
  label: 'Otter',
  habitat: 'water',
  model: 'otter/model.glb',
  length: 0.30,      // scene units; the sandbox is 4 × 3
  radius: 0.041,     // conservative normalized footprint radius
  speed: 0.030,     // normalized horizontal distance per second
  prey: ['koi'],
  sight: 0.24,      // normalized radius, corrected for 4:3 aspect
  actions: {
    idle: 'Float',
    move: 'Swim',
    chase: 'FastSwim',
    flee: 'FastSwim',
  },
  idleBehaviors: ['cruise', 'dive'],
  accent: '#ba9474',
},
```

Clip names are case-sensitive and must match those exported in the GLB. If a
mapping is missing the controller falls back to a movement/idle clip, then the
first clip. For quality, explicitly map every desired action. Keep `radius` at
least `length / 8` plus a small shoreline margin (UV half-length for a 4-unit
wide scene); use a larger margin for antlers, long tails, or gesture excursions.

The UI populates all eight slot selectors from this catalog automatically.
To expose a named combination, add a roster under `PRESETS` and a matching
option in the demo's preset selector. `DEFAULT_ROSTER` defines startup animals.
Run `node scripts/write-asset-metadata.mjs` after adjusting its provenance
mapping for the newly authored/downloaded species.

## 3. Choose the right animation layer

- **GLB clips:** gait, skeletal motion, tail beats, ear flicks, graze, howl.
  These should be authored in Blender or the model generator.
- **Behavior (`simulation/behaviors.js`):** when to wander, look, pursue, flee,
  rest, or breach. This layer works entirely on data and UV coordinates.
- **Animation controller:** map behavior to clips, blend over 0.22 seconds,
  apply small whole-body shake/sniff poses or the fish jump arc.
- **Effects (`rendering/effects.js`):** alpha shadow sprites and ring meshes.
  Add optional sprite atlases to `public/assets/effects/<effect>/`, with credits.

A species having a `Run` clip does not make it chase. `prey` and `sight` enable
pursuit decisions. Conversely, a pursuit rule does not create limb animation:
map `chase` to a proper clip. Prey reactions are discovered automatically from
predators' `prey` lists. Predator and prey need compatible habitats to meet.

To implement an entirely new action, give it a finite duration in the behavior
module, define its movement speed, map its GLB clip, and add any procedural pose
or effect in the controller. Keep randomized timing in the seeded simulation,
not in the renderer, so checks remain reproducible. No timer-based actions or
mutable renderer state should be required to simulate behavior.

## 4. Verify

```sh
npm test
npm run build
npm run test:browser
```

Inspect projection view at 1024 × 768. Check model orientation while moving,
idle transitions, tail/antler shoreline clearance, and behavior with a nearby
predator/prey. Test terrain changes and missing habitats. Add a behavior test
for a new decision rule; avoid tests that just duplicate a catalog value.

The asset test walks every species in the catalog and verifies each local GLB has animation and no external references. The browser preloads the catalog once;
for a large collection, evolve that cache into lazy loading with an explicit
loading state before increasing the active-creature budget.

## Signature animals for a world

`src/catalog/world-fauna.js` holds the 22 additional original species. Each
record names its home world, habitat, colors, top-down size, and body form.
`scripts/models/world-fauna.mjs` builds individually composed low-poly bodies
from reusable primitives and exports three real animation clips: Idle, Move,
and Dash. Add a form there (or author your own GLB), run `npm run assets`, and
check the generated `model.glb` and `model.meta.json` in
`public/assets/animals/<id>/`. Add the species to its eight-slot
`WORLD_ROSTERS` entry in `src/catalog/landscapes.js`; the sandbox and standalone
viewer share that catalog. Predators list their prey in `src/catalog/species.js`
or in the world fauna record. Preserve local licenses and update
`public/assets/animals/ATTRIBUTION.md`.
