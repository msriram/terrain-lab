# Terrain Lab v0.1.0

[**Terrain Lab showcase →**](https://msriram.github.io/terrain-lab/) ·
[**Live sandbox →**](https://msriram.github.io/terrain-lab/sandbox/) ·
[**Wildlife demo →**](https://msriram.github.io/terrain-lab/wildlife/) ·
[**Field guide →**](https://msriram.github.io/terrain-lab/guide/)

![Terrain Lab rendering live Kinect depth as colored topographic contours](assets/terrain-lab-kinect.png)

A Mac-first Kinect-powered augmented-reality sandbox inspired by
[Magic-Sand](https://github.com/thomwolf/Magic-Sand) and
[DuneBox](https://github.com/Manaiakalani/DuneBox). A small native depth bridge
feeds a dependency-free browser display.

## Release package

**v0.1.0** is the first portable Terrain Lab release. Download the
[v0.1.0 source package](https://github.com/msriram/terrain-lab/archive/refs/tags/v0.1.0.zip),
unzip it, then run `./scripts/install-kinect-service.sh` once on a fixed Mac
or `./scripts/run.sh` for a portable session. The package includes the hosted
web application, local Kinect bridge, calibration tools, and macOS launchers.

## Run it

On this macOS Kinect-v1 setup:

```bash
./scripts/run.sh
```

The launcher prints the URL to open. It builds the small native capture bridge
when needed and starts the browser application. Close TouchDesigner first so
the Kinect is available to the app.

The sandbox controller is hosted at
[msriram.github.io/terrain-lab/sandbox](https://msriram.github.io/terrain-lab/sandbox/). On a
Mac with the Kinect, first
run `./scripts/run.sh`, open the hosted page, and press **Connect Kinect**. The
hosted interface discovers the local bridge; the depth data never leaves the
machine. Sample terrain and projector preview work without a sensor. Wildlife follows
the same terrain grid and calibration transform as the Canvas landscape.
Do not open `index.html` with a `file:///` URL: use the hosted page or the
local bridge URL printed by the launcher.

### Reliable Kinect service on macOS

For a fixed sandbox machine, run this once after cloning the repository:

```bash
./scripts/install-kinect-service.sh
```

It installs a per-user background service which starts at login, waits idle
without holding the Kinect, starts capture when **Connect Kinect** is pressed,
releases the USB device on **Disconnect**, and retries a failed capture. For a
portable one-off session, double-click `Open Terrain Lab.command` instead.

If port 8080 is already occupied, the launcher automatically tries 8081 through
8099 and prints the selected address. To request a specific port, run
`PORT=9000 ./scripts/run.sh`.

Controls:

- Choose from 26 living worlds and 33 animated species in the in-scene control panel. Each world starts with signature fauna; all eight animal slots remain editable.
- Press **Auto fit** to map the visible surface to the full color range.
- Move **Position** to shift the color band nearer/farther and adjust **Range**
  for shallow or deep terrain. A 50 mm minimum supports shallow terrain; use
  **Stability** to suppress Kinect noise at very narrow ranges.
- Use **Color spread** for palette contrast and **Stability** to reduce flicker.
- Toggle contour lines and the simulated water level.
- Press **Reset terrain** to restore the sample landscape.
- Keep this controller window on the laptop. Use **Open projector window** (or
  press **F**) to create a separate clean projection window, drag that window
  to the projector display, then press **F** there for browser fullscreen.
- The Kinect normally sees a wider area than the projector. During
  **Calibrate**, select the four inside corners of the sandbox in the laptop
  preview; Terrain Lab crops and stretches that camera region to fill the
  projector window.

The checked-in sandbox runtime needs no package manager, account, or network
after downloading the repository. Rebuilding the wildlife module or website
requires Node.js and the pinned dependencies described below.

## Open the Kinect viewer

With TouchDesigner, FreenectTD, and the Kinect connected, double-click
`Open Kinect Viewer.command` in Finder. It opens the bundled ready-made
FreenectTD example at `touchdesigner/Kinect Viewer.toe`; no node construction
is required.

Prerequisites:

```bash
brew install libfreenect
```

## What works now

- Live Kinect v1 depth capture on Apple-silicon macOS
- Full native 640×480 depth processing with 1024×768 projector output
- Synthetic height/depth fallback
- Twenty authored color themes
- Contour lines
- Water-level visualization
- Separate laptop controller/live-preview and fullscreen projector windows
- Adjustable depth position, range, contrast, smoothing, and automatic fitting
- Saved four-corner sandbox ROI calibration with alignment-grid preview
- Responsive UI for ordinary laptop screens

## Remaining physical-rig work

Live depth and four-corner sandbox-region capture are implemented. Automatic
camera/projector correspondence, reference-plane fitting, and water-flow physics
remain future milestones. Use Projector view for a clean fullscreen output and
adjust the depth band for the current mounting height.

## Repository layout

```text
app.js                 browser renderer and interaction
index.html             public project showcase
sandbox/index.html     integrated sandbox controller
guide/index.html       public field guide
website/               shared site styling and showcase images
animals.js             adapter for wildlife and projector synchronization
assets/wildlife/       generated, offline wildlife runtime and licensed models
standalone-animal-demo/ source, assets, tests, and focused wildlife viewer
scripts/build-site.mjs builds all GitHub Pages routes
styles.css             responsive presentation
control-icon.css        compact collapsed-control affordance
native/kinect_depth_bridge.c native Kinect v1 capture helper
scripts/kinect_server.py local static/depth server
scripts/run.sh         build-and-run launcher
scripts/check-kinect.sh verify Kinect USB and FreenectTD setup on macOS
scripts/install-kinect-service.sh install the managed macOS background bridge
Open Terrain Lab.command one-click portable launcher
Open Kinect Viewer.command double-click launcher for the Kinect viewer
touchdesigner/Kinect Viewer.toe ready-made FreenectTD viewer project
docs/PLAN.md           research, architecture, and milestones
docs/KINECT_MAC_SETUP.md Kinect v1 setup and DuneBox integration path
upstream-magic-sand/   unmodified upstream reference checkout
```

## GitHub readiness

The local `upstream-magic-sand` reference checkout is excluded from publishing.
Magic-Sand is GPL-2.0 licensed and remains an upstream design reference. A final
license should be chosen for the original Terrain Lab code before release.

## Wildlife, rescue, and website development

The sandbox and wildlife demo support foxes, wolves, deer, rabbits, koi, and
sharks. Drag an animal to safe habitat to rescue it. Prey flee at double speed;
caught animals disappear without gore and repopulate after 10–16 seconds.
Random populations favor prey six-to-two. Calibration retains pointer control,
and the controller synchronizes its animals with the projector window.

```sh
npm ci --prefix standalone-animal-demo
npm test --prefix standalone-animal-demo
node scripts/build-site.mjs
python3 -m http.server 5180 --directory _site
```

Open `http://localhost:5180/`. Routes: `/` showcase, `/sandbox/` integrated app,
`/wildlife/` focused demo, `/guide/` documentation. GitHub Actions builds this
same `_site/` directory and deploys it beneath `/terrain-lab/`. The macOS
launcher opens the sandbox path; old `?autoconnect=1` and `?projection=1`
bookmarks at the site root redirect to it.

Run `npm run test:site --prefix standalone-animal-demo` after building (requires
local Google Chrome). It checks subpath links, mobile layouts, wildlife drag
rescue, terrain editing, and controller/projector synchronization. Physical
Kinect capture and on-sand alignment still require a hardware check.

See [the animal extension guide](standalone-animal-demo/docs/ADDING_ANIMALS.md)
and [model attribution](standalone-animal-demo/public/assets/animals/ATTRIBUTION.md).
