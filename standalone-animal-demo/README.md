# Terrain Lab · Field Notes

A standalone 3D wildlife viewer for a 4:3 AR sandbox. Thirty-three locally bundled,
animated GLB species; up to eight creatures; habitat-safe wandering and
predator/prey reactions. This module now also powers the integrated sandbox at
`/sandbox/`, while the focused public demo is available at `/wildlife/`.

## Run locally

Requires Node.js 22.12+ and a WebGL2 browser (current Chrome recommended).
From the repository root:

```sh
cd standalone-animal-demo
npm ci
npm run dev
```

Open **http://127.0.0.1:5174/**. Dependencies are installed already in this working
copy; `npm run dev` is enough here. `npm ci` is needed on a fresh checkout.
After installation, the viewer makes no external requests: fonts, libraries,
models, textures, and effects are local. To serve a compiled static directory:

```sh
npm run build
npm run preview -- --port 5175
```

Open **http://127.0.0.1:5175/**. `dist/` also works on an ordinary static server.
Do not open the HTML through `file://`.

## Explore

- **World:** Earth or Atlantis (moonlit terrain and luminous aquatic materials).
- **Rescue:** drag any animal to a valid habitat. Held animals are safe; release
  grants three seconds of protection. Wrong-habitat moves are rejected.
- **New population:** randomizes safe spawn positions and uses the selected world's signature fauna. Earth uses six
  prey/herbivores and two predators.
- **Interaction preset:** Fox & rabbit, Wolf & deer, or Shark & koi.
- **Choose each animal:** change any of eight roster slots to any species.
- **Stir wildlife:** prompt gestures and koi breaches immediately. Nearby
  predators may override an idle gesture with a chase.
- **Behavior labels:** see what each animal is doing; hidden in projection view.
- **Landscape / water level:** edit habitat. Creatures turn away from shorelines,
  steep changes, and bounds. If an edit removes their habitat, they relocate;
  if no safe footprint exists, they hide until suitable habitat returns.
- **Transparent WebGL layer:** on by default over the separate terrain canvas.
  Hide **Show terrain canvas** to inspect alpha over a checkerboard. Turning
  transparency off gives the WebGL canvas an opaque black background.
- **Pause motion:** freezes positions, gestures, and animation clocks.
- **Projection** or **F:** clean orthographic 4:3 output. **Escape** returns.
  Use browser fullscreen for the physical projector.
- **Save 1024 × 768 capture:** exports composed terrain and wildlife, without
  control labels. With terrain hidden it exports the animal layer with alpha.

## Real animations and interactions

| Species | Embedded GLB clips | Additional behavior |
|---|---|---|
| Fox | Survey, Walk, Run | Sniff, body shake, chase nearby rabbits |
| Deer | Graze, Walk, Run, Alert | Look around, flee nearby wolves |
| Wolf | Survey, Walk, Run, Alert, Howl | Shake, howl, chase deer/rabbits |
| Rabbit | Nibble, Hop, Walk, Run, Alert | Hop, nibble, shake, flee foxes/wolves |
| Koi | Swim (tail and pectoral fins) | Dart, breach, flee sharks |
| Shark | Swim, Hunt | Faster tail beat during pursuit, cruise/dive behavior |

These are actual animated 3D models. `AnimationMixer` blends GLB clips; an
additive pose layer supplies gestures and a breach arc with expanding water
rings. At a straight-down angle, fish height reads through body pitch,
foreshortening, and the changing shadow. All land models face +Z and use +Y up.

Predators notice configured prey within a species-specific radius. Prey flee,
predators accelerate and turn towards them, and habitat checks constrain both.
Prey interrupt idle states and flee at 2× their normal speed. Close contact
means the prey is eaten and disappears without gore; a replacement spawns
after 10–16 seconds. Captured animals cannot be revived early by terrain
updates. Predators rest after feeding or a timed-out chase. Navigation is local steering, not a global
pathfinding/ecosystem simulation; narrow or disconnected habitats can prevent
a pursuit. The original procedural models are editable prototype artwork.

## Organized for extension

```text
src/
  index.js                  public library exports
  catalog/species.js        species, clip mappings, prey rules, roster presets
  simulation/world.js       normalized UV state, habitat footprint, steering
  simulation/behaviors.js   chase/flee decisions, gestures, cooldowns
  interaction/drag.js       shared pointer/touch rescue controller
  animation/controller.js  clip cross-fades and additive poses
  rendering/animal-layer.js Three.js adapter, model cache, camera, lifecycle
  rendering/effects.js      generated shadow sprites, splash/wake geometry
  terrain/fixtures.js       demo-only sampler and 2D terrain canvas
  main.js / style.css       demo-only controls and presentation
public/assets/
  animals/<species>/        model.glb + model.meta.json per species
  animals/ATTRIBUTION.md    provenance, licenses, and source links
  animals/licenses/         license notices
  effects/README.md         optional future sprite/texture convention
scripts/
  build-models.mjs           regenerate all five original animated models
  build-fish.mjs             original koi geometry and clips
  models/                   shared primitives, land/shark model generators
  write-asset-metadata.mjs   animation names, provenance, hashes
  verify-browser.mjs         production/offline/UI/performance checks
screenshots/                controller, projection, alpha screenshots + report
```

See **[Adding models and behavior](docs/ADDING_ANIMALS.md)** for a worked species
entry. Rebuild original assets with `npm run assets`. Downloaded artist-authored
GLBs can replace individual models without replacing navigation or the UI.
No animal sprites are used. Optional sprite textures belong under
`public/assets/effects/`; effect code belongs in `src/rendering/effects.js`.

## Integration contract

See **[Integration](docs/INTEGRATION.md)**. Core inputs are:

- `sampleTerrain(u, v)`: synchronous normalized elevation 0..1. `(0,0)` is
  top-left; `(1,1)` bottom-right. Water is elevation below `waterLevel`.
- `waterLevel`: finite normalized threshold, 0..1.
- `setRoster(speciesIds)`: zero to eight IDs from the catalog.
- `setOptions({ enabled, paused, transparent, pack })`: explicit toggle state.
- `resize(width, height)`: CSS pixel dimensions of the same 4:3 host rectangle.
- `update(deltaSeconds)`: host-owned frame loop; clamped simulation delta.
- `dispose()`: release model materials, geometry, textures, mixers and renderer.

The layer neither reads Kinect nor draws terrain. It does not calibrate, crop,
resize, or otherwise mutate the host terrain. The host must provide calibrated
UVs and position both canvases in the identical 4:3 rectangle.

`npm run build:layer` creates `dist-layer/`: a self-contained ES module plus
local models and notices. The root `scripts/build-site.mjs` copies this output
to `assets/wildlife/` for the integrated sandbox and assembles the full Pages
site under `_site/`. `animals.js` is the host adapter; it reads normalized
terrain, mirrors the calibrated display transform, and synchronizes wildlife
with projector windows over BroadcastChannel. Vite is a build tool only.

## Verification and performance

```sh
npm test
npm run build
npm run test:browser
npm run build:layer
npm run test:layer
```

The browser check uses locally installed Google Chrome, a temporary profile,
and localhost port 5175. `BROWSER_CHANNEL` can override the Playwright channel.
It blocks all non-local browser requests and verifies model switches,
proximity interactions, breach actions, pause, alpha, PNG export, terrain edits,
mobile layout, and resize. Tests do not connect to any sensor.

Measured on this **Apple M3 Pro MacBook Pro, 36 GB RAM**, headless Chrome with
ANGLE/Metal, eight animated animals, **1024 × 768**, production build:
**approximately 60 FPS average**, 600-frame sample (p95 frame time 16.8 ms). A separate
plain-HTTP integration check with eight animated deer measured **60.0 FPS**
over 300 frames, recorded in `screenshots/integration-verification.json`. Exact final FPS, p95 frame
time, browser version, resolution, and renderer are saved in
[`screenshots/verification.json`](screenshots/verification.json). This is a
local browser benchmark, not a physical-projector or Safari measurement.

The simulation tests check footprint safety across three fixtures and water
levels, unavailable habitat recovery, travel/turning, embedded asset animations,
all three predator/prey pairs, 2× fleeing, capture/respawn, rescue protection,
random population balance, time-bounded breaches, and roster validation.
`npm run test:site` checks the integrated sandbox and full website, including
GitHub Pages subpaths, actual pointer dragging, calibration ownership, projector
synchronization, internal links, and responsive layout.
A large shark can legitimately have no safe footprint at the lowest river tide.

## Asset licenses

The fox model is CC0 with CC-BY 4.0 rigging/animation/conversion credits. The
five original procedural assets use CC0. Full provenance and source links are
in [`public/assets/animals/ATTRIBUTION.md`](public/assets/animals/ATTRIBUTION.md).
Three.js is MIT; its notice is bundled as `public/THIRD_PARTY_NOTICES.txt`.
No marketplace-only, editorial-only, or testing-only models are included.

### Living landscapes

The landscape selector offers 26 shared scenery recipes. Trees sway, forest rain
falls, clouds drift, and surf follows the sampled shoreline. Atlantis, Coral Reef,
and Abyss treat the entire map as seafloor and start with one shark and seven koi.
Clouds are translucent wind-shaped wisps. Moon craters and volcanic vents use
low-profile ground textures instead of raised rings, while Universe uses nebula
haze and terrain-driven spiral star fields instead of spherical galaxy props.
Atlantis includes treasure chests, ruins, tridents, kelp, coral, and sea knolls.
Volcanic terrain erupts when an interior peak exceeds 78% normalized elevation
and rises prominently above its neighbors; lowering the peak stops the eruption.
In the sandbox, select **Volcanic**, choose **Raise**, and hold on the terrain.
**Landscape elements** controls scenery visibility; **Weather & motion** freezes
scenery animation independently of animal movement.

Extend `src/catalog/landscapes.js` for theme recipes, `src/environment/props.js`
for reusable original procedural models, `src/environment/layout.js` for pure
terrain placement rules, and `src/environment/landscape-layer.js` for animation.
All procedural scenery and generated particle textures are original project
assets and require no external downloads. They share the wildlife renderer and
its disposal lifecycle. Run `node scripts/verify-landscapes.mjs` from this folder
with the demo running on port 5174 to check all themes and mountain events.

Scenery performance check (September 2026, local M3 Pro, Chrome, 1018 × 764):
59.7 average FPS across a 10-second Earth scene with 20 props, clouds, shoreline
surf, and a randomized eight-animal population (one capture during the sample).
Physical projector readability and performance still require testing on the rig.

### Beyond Earth

Universe turns raised terrain into up to four rotating spiral galaxies. Low
terrain scatters background stars. Microscopic, Neuron Network, Atomic,
Cyberpunk, and Dreamscape add original terrain props, particles, and themed
populations. Five new locally bundled animated GLB creatures are Starseed,
Void Ray, Microbe, Phage, and Drone; Phages pursue microbes and Void Rays pursue
Starseeds. Other worlds also start with habitat-appropriate themed rosters;
all eight slots remain editable. The top-down shark model now has a broad,
contrast-marked caudal fin and the Atlantis trident faces screen-up.

### Signature fauna in every world

Each of the 26 themes now starts with a curated eight-creature population.
Twenty-two additional original GLB models introduce recognizably different
silhouettes and animations: manta, seahorse, anglerfish, several birds and
moths, beetles, scorpion, crab, snail, ox, goat, serpent, and dream whale.
Earth retains its fox/rabbit/deer ecology; deer and rabbits appear only in
Earth and Ancient Forest starter populations. Every other world has its own
signature creature, recorded in `src/catalog/world-fauna.js`. Add a creature
there, draw its 3D parts and animation in `scripts/models/world-fauna.mjs`,
run `npm run assets`, then add it to `src/catalog/landscapes.js` rosters.
Generated GLBs and SHA-256 metadata live under `public/assets/animals/`.
