# Standalone 3D Animal Rendering Handoff

## Mission

Create a standalone, high-quality 3D wildlife rendering prototype for Terrain
Lab. Do **not** modify the Kinect bridge, calibration, or live Terrain Lab
application. The result will be brought back into the sandbox project after it
has been visually approved.

The experience is a top-down augmented-reality sandbox. Animals must look good
when projected onto a physical sand surface from above, at roughly 1024×768,
while remaining readable from a standing viewer’s angle.

## Required first deliverable

Build a standalone web demo that runs from a local static server and shows:

1. Two or three attractive land animals roaming on a terrain map.
2. Three to five water animals swimming only in visible water.
3. Smooth motion, turning, and simple idle/swim/walk animation.
4. A top-down orthographic camera that fits a 4:3 sandbox rectangle.
5. A transparent WebGL layer option so it can later sit above the existing
   Terrain Lab Canvas terrain renderer.

The first visual target should be an **Earth** pack: fox/deer-like land animals
and fish. A second proof-of-concept pack should be **Atlantis**: glowing fish,
ray, or jellyfish-like water animals.

## Quality bar

- Use actual glTF/GLB models, not flat sprites or emoji.
- Prefer stylized, detailed low-poly/PBR assets that remain clear at a small
  projected size. High polygon film assets are a poor fit.
- Models must look intentional from above: silhouette, color contrast, shadows,
  and animation matter more than close-up realism.
- Target 60 fps on an Apple-silicon MacBook with up to 8 active creatures.
- No external runtime CDN or network request after installation. Bundle every
  runtime dependency and model locally.

## Technology recommendation

Use a small Vite + Three.js prototype, with `GLTFLoader` and `AnimationMixer`.
Use an orthographic camera above a normalized world where `(0,0)` is the
top-left sandbox corner and `(1,1)` is the bottom-right.

Keep simulation independent of rendering:

```text
terrain sampler -> navigation / habitat rules -> creature state -> Three.js scene
```

The future Terrain Lab integration will provide a terrain sampler like:

```js
sampleTerrain(u, v) // returns normalized elevation 0..1; 0 is water/low
```

Use `u` and `v` coordinates throughout. Land creatures should avoid water and
steep local changes; water creatures should remain below a configurable water
threshold.

## Asset and license rules

- Use only CC0, CC-BY, or another explicit redistribution-safe license.
- Do not use marketplace-only, editorial-only, or “testing only” assets.
- Place every model under `assets/animals/` in the standalone prototype.
- Add `assets/animals/ATTRIBUTION.md` with model name, author, license, and
  direct source URL.
- Good starting sources:
  - Khronos animated Fox: CC0 + CC-BY 4.0;
    https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox
  - Khronos Barramundi Fish: CC0;
    https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/BarramundiFish
  - Kenney CC0 3D collections: https://kenney.nl/assets

## Deliverables

Provide a directory that can be copied into Terrain Lab later, containing:

```text
standalone-animal-demo/
  README.md                 how to run and controls
  package.json              pinned dependencies and scripts
  src/                      renderer, simulation, terrain fixture
  public/assets/animals/    bundled GLB/GLTF models and textures
  public/assets/animals/ATTRIBUTION.md
  screenshots/              controller and projection-style captures
```

The README must state:

- The exact run command.
- Asset licenses and attribution location.
- Average FPS measured on the target MacBook.
- How to turn the transparent overlay on/off.
- The integration contract: `sampleTerrain(u, v)`, water level, toggle state,
  resize behavior, and no direct Kinect access.

## Acceptance checklist

- [ ] A fresh local run needs no internet connection after dependencies/assets
      are installed.
- [ ] At least one animated land GLB and one animated water GLB are visible.
- [ ] Land and water creatures remain in correct habitats.
- [ ] Creatures re-route when terrain/water fixture changes.
- [ ] The demo stays responsive at 1024×768 with eight total creatures.
- [ ] A transparent overlay aligns with a 4:3 terrain canvas.
- [ ] All third-party model licenses are recorded.
- [ ] No Terrain Lab application files are modified.

## Current Terrain Lab context

The main app is a dependency-free 2D Canvas renderer. A previous in-progress
WebGL overlay attempt is deliberately **not** ready for publishing. Treat this
standalone prototype as the source of truth for the animal renderer; integrate
only after its visual output and performance are approved.

Do not publish, commit to the main Terrain Lab branch, create releases, or
change GitHub issues as part of this standalone rendering task.
