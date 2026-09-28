# Terrain Lab v0.2.0 — Living Worlds

The sandbox comes alive with animated wildlife and terrain-aware environments.

## Highlights

- Theme-specific wildlife populations, adjustable up to 64 animals; smaller koi and rabbits, drag-to-safety interactions, and five-second respawn delays.
- Sculpt terrain, move animals, or place/remove landscape elements using the Wildlife pointer-mode selector.
- Terrain-driven volcanic lava, translucent moving clouds, bird flocks and fish schools.
- Snow accumulating on higher ground, shoreline greenery, sand/dust and underwater sediment.
- Varied branching trees and layered pines that bend in the wind.
- Branching coral reefs, richer Tundra scenery, polar and amphibious Glacier wildlife, lunar impact basins, and springing Synthwave monsters.
- Separate showcase, Wildlife demo, Kinect sandbox controller, and projector views.

## Download and run

Download **terrain-lab-v0.2.0.zip**, extract it, then run:

```sh
./scripts/run.sh
```

The ZIP includes prebuilt browser assets and the local Kinect bridge source.
The browser assets need no npm build. Python 3 is needed by the local launcher.
Kinect capture still needs the supported macOS Kinect v1 setup, native build
tools/libfreenect, device power and USB connection; see README for setup.
Close other applications using the Kinect first. A physical projector is not
needed to try the browser Wildlife demo.

For a local browser-only demo without Kinect dependencies, run
`python3 -m http.server 8080 --bind 127.0.0.1` from the extracted folder
and visit `http://127.0.0.1:8080/wildlife/`.

- Live site: https://msriram.github.io/terrain-lab/
- Wildlife: https://msriram.github.io/terrain-lab/wildlife/
- Kinect sandbox: https://msriram.github.io/terrain-lab/sandbox/

The automatic GitHub source archives contain source; use the separately attached
ZIP for the ready-built package. SHA256SUMS.txt verifies that package.

## Limits

These are interactive visual simulations, not scientific fluid or weather solvers.
Earth shallow-water transport and automatic projector correspondence remain
future work. Physical Kinect/projector calibration is specific to each rig.
