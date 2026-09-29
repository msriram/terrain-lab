# Contributing to Terrain Lab

Thanks for helping make Terrain Lab more alive. [The public contribution page](https://msriram.github.io/terrain-lab/contribute/) is the quick path; this file is the working checklist.

Original code contributions are accepted under the project's [MIT License](LICENSE). Keep separate asset licenses and attribution intact; see [license scope](LICENSES.md).

## Choose and discuss work

Search [issues](https://github.com/msriram/terrain-lab/issues) and [pull requests](https://github.com/msriram/terrain-lab/pulls) first. File a bug with the world, browser or rig, steps to reproduce, expected and actual behavior, and a screenshot when useful. Propose larger worlds, species, architecture changes, or new dependencies in an issue before implementation. Small fixes can go straight to a pull request.

Good contributions include terrain-responsive scenery, distinct creature animations, predator/prey behavior, usable controls, projector calibration, performance, accessibility, documentation, and browser tests that catch actual regressions.

## Branch and build

Fork the GitHub repository and create a focused branch from current `main`. GitHub calls a proposed merge a **pull request**; GitLab calls it a **merge request**. Please target `main` and link the relevant issue.

```sh
git clone https://github.com/YOUR-USERNAME/terrain-lab.git
cd terrain-lab
npm ci --prefix standalone-animal-demo
npm test --prefix standalone-animal-demo
node scripts/build-site.mjs
python3 -m http.server 5180 --directory _site
```

Check `/`, `/sandbox/`, and `/wildlife/` in the local site. With Chrome installed, run `npm run test:site --prefix standalone-animal-demo` for browser integration checks. Physical Kinect/projector changes need a rig check where possible; describe the hardware and any checks you could not run. Do not commit generated screenshots or local downloads unless they are a deliberate part of the change.

## Open the pull request

Describe the trigger and resulting behavior, link the issue, list checks and their results, and attach before/after images or a short recording for visual work. Open a draft pull request for early feedback. Keep unrelated changes in separate requests. Update your branch from `main` if the review or deployment workflow reports conflicts.

Automated checks run the simulation tests and build the Pages site. A maintainer reviews functionality, sandbox/projector integration, visual quality, performance, and asset provenance. Respond to requested changes on the same pull request. A maintainer merges an approved request into `main`; the Pages workflow then publishes the site. There is no promised review time.

## Assets and attribution

Contribute only assets you are permitted to redistribute. For each model, texture, sprite, sound, or other third-party asset, record creator, source URL, license, required attribution, and modifications in the relevant attribution file. Follow [Adding animals](standalone-animal-demo/docs/ADDING_ANIMALS.md) for wildlife structure and [existing credits](standalone-animal-demo/public/assets/animals/ATTRIBUTION.md) for the format. Do not submit downloaded libraries, unlicensed film/game artwork, or generated assets with unclear usage rights.

## Scope and safety

The browser demos should remain usable without a Kinect. Preserve the local-only depth bridge and projector calibration path when editing the sandbox. For any interaction or calibration change, verify both controller and projector views. Never include personal data, credentials, or private capture footage in a pull request.
