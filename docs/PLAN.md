# Portable AR Sandbox plan

## Recommendation

Keep the upstream Magic-Sand repository as a behavioral and UX reference, but
do not make its 2017-era Xcode project the foundation of a new portable build.
Start with this browser demo, define a small sensor-neutral depth-frame API,
then add native camera adapters and calibration behind it.

The result should have three independently testable pieces:

1. **Input** — live depth camera, recorded depth stream, or synthetic demo.
2. **Processing** — filtering, sandbox bounds, height normalization, calibration.
3. **Output** — topographic palette, contours, water, and projector fullscreen.

That separation is what makes development possible on a laptop without the
physical rig and makes failures reproducible on another machine.

## Findings

### Magic-Sand upstream

- Strengths: approachable UI, automatic camera/projector calibration, games,
  and explicit macOS/Windows/Linux ambitions.
- Constraints: openFrameworks 0.9.3, old addon forks, Kinect v1 assumptions,
  generated Xcode/Visual Studio project files, and no current CI.
- The checkout used for this evaluation is commit
  `0d26ba89d111884cd92bd517db6eff7f4ffb4c8b` (2019-09-13).
- License: GPL-2.0. A fork or derivative must retain compatible source and notices.

### Comparable projects

| Project | Useful ideas | Fit for this project |
| --- | --- | --- |
| [UC Davis SARndbox](https://github.com/KeckCAVES/SARndbox) | Mature calibration, contour and water behavior | Strong reference; Linux/Vrui stack is not Mac-first |
| [Open AR-Sandbox](https://github.com/cgre-aachen/open_AR_Sandbox) | Geoscience layers and haptic interaction | Good content architecture reference; heavier deployment |
| [DuneBox](https://github.com/Manaiakalani/DuneBox) | Updated openFrameworks, GPU water, demo terrain fallback | Closest modern descendant, but currently Windows-only |
| [libfreenect](https://github.com/OpenKinect/libfreenect) | Kinect v1 access on macOS/Linux/Windows; recorded-stream tooling | Viable legacy adapter, not the portable core |

## Hardware decision

Before implementing live input, choose one of these paths:

- **Lowest-cost legacy rig:** Kinect v1 + USB/power adapter. Use libfreenect.
  Hardware is cheap, but it carries the most driver and longevity risk.
- **Recommended maintainable rig:** a currently supported USB depth camera with
  an SDK that publishes macOS arm64 binaries and depth frames. Confirm the exact
  model and current SDK support before purchase.
- **Development without hardware:** recorded depth frames plus the synthetic
  field in this prototype. This should remain a supported mode permanently.

An ordinary MacBook camera is RGB-only and cannot reproduce the reliable,
per-pixel depth map needed for a physical sand table by itself.

## Milestones

### M0 — portable prototype (complete)

- Run with one command and no dependencies beyond Python 3 + browser.
- Interactive elevation, palette, contours, water threshold, projector view.
- Responsive on an Apple-silicon MacBook and usable on Windows/Linux.

### M1 — reproducible project foundation

- Initialize the final Git repository and decide fork vs submodule for upstream.
- Add automated browser smoke tests and GitHub Actions on macOS/Windows/Linux.
- Define a versioned `DepthFrame` data format and include a small recorded fixture.
- Add export/import for settings and calibration.

Exit criterion: a fresh clone passes checks and launches on all three desktop OSes.

### M2 — sensor adapter (Kinect v1 baseline complete)

- Kinect v1 capture uses libfreenect on Apple silicon.
- Live capture runs as a local native service and sends depth frames to the UI.
- Keep synthetic and recorded modes selectable when no sensor is present.
- Add temporal smoothing, invalid-pixel handling, and frame-rate telemetry.

Exit criterion: stable 30 fps depth input for 30 minutes with reconnect recovery.

### M3 — projector calibration

- Sandbox region selection.
- Camera intrinsics/extrinsics storage.
- Projected checkerboard correspondence and homography/mesh warp.
- A calibration wizard with saved, portable profiles.

Exit criterion: projected contours remain aligned across the usable sand surface.

### M4 — production rendering and packaging

- GPU rendering, hillshade, configurable palettes, and optional water simulation.
- Signed/notarized macOS app; equivalent Windows and Linux packages.
- Hardware diagnostics and a first-run setup assistant.

### M5 — GitHub release

- Preserve GPL notices and document upstream provenance.
- CI-built artifacts, checksums, setup guide, bill of materials, and demo media.
- Publish only after repository name/owner and license strategy are confirmed.

## Immediate next decisions

1. Is the goal a real sand table with projector, or primarily a laptop simulation?
2. Which depth camera, if any, do you already own?
3. Should the final GitHub repository be a visible fork of Magic-Sand or a new
   project that references it as upstream?

## Theme-world extension roadmap

Themes should be data, not separate apps. Each world will declare a palette,
lighting, atmosphere, water material, effects, soundscape, and compatible
characters. This keeps the 20 worlds consistent and makes additions inexpensive.

### Phase A — calibration and GPU terrain

- Add a four-corner sandbox crop and projector mesh warp.
- Move palette, contours, lighting, and normals into WebGL shaders.
- Store named camera/projector calibration profiles.
- Add recorded-depth playback for repeatable tests without the hardware.

### Phase B — environmental simulation

- Earth: shallow-water flow, rain, cloud shadows, and vegetation tint.
- Atlantis/Abyss/Coral: caustics, suspended particles, fog, and currents.
- Mars/Sahara: wind-driven dust, heat haze, and dune highlights.
- Glacier/Tundra: snow accumulation, meltwater, and cold atmospheric haze.
- Alien/Synthwave: emissive materials, unusual skies, and reactive particles.

All simulations should use the same Kinect height field. Water must follow
terrain slopes and retain a fixed simulation step so frame rate does not alter
the physics.

### Phase C — roaming characters

- Use glTF/GLB assets with explicit redistribution licenses and attribution.
- Begin with four optimized rigs: biped, quadruped, flying, and swimming.
- Build navigation from slope, elevation, and water masks so agents respond as
  people reshape the sand.
- Target 10–30 agents using instancing and level-of-detail meshes.
- Keep character packs optional so the core Kinect app stays lightweight.

Evaluate Kenney, Quaternius, Poly Haven, and selected Sketchfab CC0/CC-BY
models. Record license and source beside every asset; never commit marketplace
models with unclear redistribution rights.
