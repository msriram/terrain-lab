# Terrain Lab integration

The standalone controller, terrain fixture, and CSS are not integration
requirements. The renderer is exposed through `src/index.js`.

## Build a portable local module

```sh
npm run build:layer
```

Copy the complete `dist-layer/` folder to a future host path, such as
`wildlife/`. It includes `animal-layer.js` (Three.js bundled), GLBs, and license
notices. The existing Canvas renderer can remain dependency-free and load the
ES module only when wildlife is enabled. No CDN/import map is needed.

```html
<div id="sandbox" style="position:relative;aspect-ratio:4/3">
  <canvas id="terrain" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
  <canvas id="wildlife" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></canvas>
</div>
```

```js
import { createAnimalLayer } from './wildlife/animal-layer.js';

const element = document.getElementById('sandbox');
const layer = await createAnimalLayer({
  canvas: document.getElementById('wildlife'),
  sampleTerrain: (u, v) => calibratedElevation(u, v), // host function, 0..1
  waterLevel: 0.43,
  assetBase: new URL('./wildlife/assets/animals/', document.baseURI).href,
  roster: ['wolf', 'deer', 'rabbit', 'shark', 'koi', 'koi', 'koi', 'koi'],
});
layer.setOptions({ enabled: true, paused: false, transparent: true, pack: 'earth' });

const observer = new ResizeObserver(() => {
  const { width, height } = element.getBoundingClientRect();
  layer.resize(width, height);
});
observer.observe(element);

let frameId;
let previous = performance.now();
function frame(now) {
  layer.update((now - previous) / 1000);
  previous = now;
  frameId = requestAnimationFrame(frame);
}
frameId = requestAnimationFrame(frame);

function onTerrainChanged(sampleTerrain, waterLevel) {
  layer.setTerrain(sampleTerrain, waterLevel);
}
function unmount() {
  cancelAnimationFrame(frameId);
  observer.disconnect();
  layer.dispose();
}
```

If the host already has a frame loop, call `layer.update(dt)` in that loop;
do not start another. The simulation clamps dt to 50 ms after a tab resumes.
A stable sampler closure may read the latest height grid; call `setTerrain`
after material changes to reconcile hidden/stranded creatures promptly.
Sampler values must be normalized numbers; NaN is treated as unavailable habitat.

`setRoster(ids)` replaces the active population and resets behaviors. It is
synchronous after initial asset loading. `setOptions` updates only specified
fields. Disabling animals freezes their simulation and makes the entire animal
layer invisible; pausing freezes clocks while retaining the current image.
`getStats()` supplies counts, triangles, draw calls, and behavior state for a
host controller; it does not measure FPS. `stir()` prompts immediate gestures.

## Alignment and terrain semantics

The camera is top-down orthographic. UV maps to `(x,z)=((u-.5)*4,(v-.5)*3)`.
Renderer pixel ratio is capped at 1.5. `resize` accepts CSS dimensions and
rounds the buffer size. Letterbox the host container to 4:3; do not independently
crop either canvas. The host is responsible for the physical projector warp
and should composite before applying that warp if calibration uses one.

Terrain elevation is used for **habitat**, not a second 3D terrain mesh.
Animals float just above the projection plane. Threshold tests include an
entire conservative footprint and reject steep land changes. A breach changes
rendered height/pose; its UV footprint stays in water. Invalidated positions
are moved to safe samples; creatures hide if no such sample exists and return
on a future `setTerrain` when there is room. This is deliberately distinct from
letting a shark swim across newly exposed land.

The fox has externally authored skinning; original prototype species have
hierarchically animated parts. Both use AnimationMixer and independent clones.
GLB cache entries share immutable geometry/textures; instances own materials,
clips, and skeletons. `dispose()` releases all owned GPU resources.

## Integration acceptance still required

The standalone browser tests cover UV habitat constraints, 4:3 resize, alpha,
and local performance. Before putting this in the full application, visually
approve the animals on the physical sand, profile alongside the real terrain
renderer, and check calibration alignment. The integrated host now lives in `/sandbox/`; `animals.js` adapts the layer to
`window.TerrainLab`. Both canvases share the same CSS transform for rotation
and projector offset. Calibration temporarily hides wildlife and gives pointer
ownership to the terrain canvas. Demo editing uses the same height grid.
Kinect capture code and calibration calculations remain in the host.

## Rescue and population APIs

`bindAnimalInteraction({element, layer, toUV, enabled, onMessage})` installs
pointer capture for mouse/touch rescue and returns a cleanup function. `toUV`
lets the host invert its calibrated display transform. While held, a creature
is frozen and protected; moves are accepted only in valid habitat. Release
starts a three-second protection window.

`randomRoster()` produces six prey animals and two predators. Runtime seeds
are random; pass `seed` explicitly for reproducible tests. `simulation.grab`,
`move`, and `release` are data-only methods suitable for future physical touch
input. Captured animals remain inactive until their respawn deadline.

`getSnapshot()` / `applySnapshot(snapshot)` synchronize controller and projector
instances. Applying a snapshot makes the receiver a rendering follower, so it
animates the shared state without independently running predator/prey logic.
The host sends sample terrain edits too; live projector windows still use the
existing local depth bridge. These messages are local to the browser origin.
