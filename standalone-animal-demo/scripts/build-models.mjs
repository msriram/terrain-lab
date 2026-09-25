import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { writeFile } from "node:fs/promises";
import { makeLandAnimal } from "./models/land.mjs";
import { optimizeModel } from "./models/common.mjs";
import { makeShark } from "./models/shark.mjs";
// Registers FileReader and rebuilds the original animated koi.
await import("./build-fish.mjs");
for (const species of ["deer", "wolf", "rabbit", "shark"]) {
  const { root, clips } =
    species === "shark" ? makeShark() : makeLandAnimal(species);
  await optimizeModel(root);
  const binary = await new GLTFExporter().parseAsync(root, {
    binary: true,
    animations: clips,
  });
  await writeFile(
    new URL(`../public/assets/animals/${species}/model.glb`, import.meta.url),
    Buffer.from(binary),
  );
  console.log(
    `Exported ${species}: ${binary.byteLength} bytes; ${clips.map((c) => c.name).join(", ")}`,
  );
}
await import("./write-asset-metadata.mjs");
