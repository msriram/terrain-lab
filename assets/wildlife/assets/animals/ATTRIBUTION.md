# Animal models and redistribution

All runtime GLBs and their embedded textures are local. No models are fetched
from a marketplace or CDN. Original models are stylized prototype assets;
they can be replaced independently through `src/catalog/species.js`.

| Model | Author / provenance | License | Direct source |
|---|---|---|---|
| `fox/model.glb` | Model: PixelMannen (2014); rigging and animation: tomkranis (2014); glTF conversion: AsoboStudio and scurest (2017) | Model CC0-1.0; rig/animation/conversion CC-BY-4.0 | https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox |
| `koi/model.glb` | Original procedural Terrain Lab artwork generated for this prototype | CC0-1.0 | `scripts/build-fish.mjs` in the source distribution |
| `deer/model.glb` | Original procedural Terrain Lab artwork generated for this prototype | CC0-1.0 | `scripts/models/land.mjs` in the source distribution |
| `wolf/model.glb` | Original procedural Terrain Lab artwork generated for this prototype | CC0-1.0 | `scripts/models/land.mjs` in the source distribution |
| `rabbit/model.glb` | Original procedural Terrain Lab artwork generated for this prototype | CC0-1.0 | `scripts/models/land.mjs` in the source distribution |
| `shark/model.glb` | Original procedural Terrain Lab artwork generated for this prototype | CC0-1.0 | `scripts/models/shark.mjs` in the source distribution |

| `starseed/model.glb` | Original procedural Terrain Lab artwork | CC0-1.0 | `scripts/models/otherworld.mjs` |
| `voidray/model.glb` | Original procedural Terrain Lab artwork | CC0-1.0 | `scripts/models/otherworld.mjs` |
| `microbe/model.glb` | Original procedural Terrain Lab artwork | CC0-1.0 | `scripts/models/otherworld.mjs` |
| `phage/model.glb` | Original procedural Terrain Lab artwork | CC0-1.0 | `scripts/models/otherworld.mjs` |
| `drone/model.glb` | Original procedural Terrain Lab artwork | CC0-1.0 | `scripts/models/otherworld.mjs` |

The fox GLB is bundled unmodified. Runtime changes: normalization, lighting,
clip cross-fades, additive sniff/shake gestures, and scene placement.
Original animals use authored hierarchical parts and embedded glTF animations.
Atlantis uses a runtime color/emissive variation of the aquatic assets.
The Barramundi model from the parent project is not used or redistributed here.

Fox upstream license notice: `licenses/Fox-LICENSE.md`.
Original asset dedication: `licenses/ORIGINAL-ASSETS-CC0.txt`.
CC0 legal text: https://creativecommons.org/publicdomain/zero/1.0/legalcode
CC-BY 4.0 legal text: https://creativecommons.org/licenses/by/4.0/legalcode
Fox binary source: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb

Source-generator paths are relative to the demo source tree. They are not
runtime resources in the built viewer. Each species directory also contains a
machine-readable `model.meta.json` with provenance, animation names and hash.

Three.js is MIT-licensed; its installed license is in `node_modules/three/LICENSE`.
