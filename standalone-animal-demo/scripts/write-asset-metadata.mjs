import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { SPECIES } from "../src/catalog/species.js";
for (const [id, species] of Object.entries(SPECIES)) {
  const url = new URL(
    "../public/assets/animals/" + species.model,
    import.meta.url,
  );
  const bytes = await readFile(url),
    data = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
  const metadata = {
    name: species.label,
    habitat: species.habitat,
    format: "glTF 2.0 binary",
    forward: "+Z",
    up: "+Y",
    animations: data.animations.map((a) => a.name),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    license: id === "fox" ? "CC0-1.0 AND CC-BY-4.0" : "CC0-1.0",
    author:
      id === "fox"
        ? "PixelMannen; tomkranis; AsoboStudio; scurest"
        : "Original procedural Terrain Lab artwork",
    source:
      id === "fox"
        ? "https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox"
        : id === "koi"
          ? "scripts/build-fish.mjs"
          : id === "shark"
            ? "scripts/models/shark.mjs"
            : "scripts/models/land.mjs",
  };
  await writeFile(
    new URL("model.meta.json", url),
    JSON.stringify(metadata, null, 2) + "\n",
  );
}
