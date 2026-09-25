// Original Terrain Lab geometry, exported as redistributable animated glTF 2.0.
import * as T from "three";
import { optimizeModel } from "./models/common.mjs";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { writeFile } from "node:fs/promises";
// GLTFExporter uses the browser FileReader interface for binary output.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((data) => {
      this.result = data;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((data) => {
      this.result = `data:${blob.type};base64,${Buffer.from(data).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
const root = new T.Group();
root.name = "RiverKoi";
const material = (name, color) =>
  new T.MeshStandardMaterial({
    name,
    color,
    roughness: 0.48,
    metalness: 0.12,
    flatShading: true,
    side: T.DoubleSide,
  });
const cream = material("Ivory scales", "#fff0bb");
const orange = material("Vermilion markings", "#ed5c25");
const gold = material("Golden fins", "#ffb444");
const dark = material("Obsidian eyes", "#102833");
function ellipsoid(name, mat, p, s, parent = root) {
  const m = new T.Mesh(new T.SphereGeometry(1, 16, 10), mat);
  m.name = name;
  m.position.set(...p);
  m.scale.set(...s);
  parent.add(m);
  return m;
}
// Nose points toward +Z; dorsal side is +Y. Total length ~2 units.
ellipsoid("Body", cream, [0, 0, 0], [0.23, 0.23, 0.72]);
ellipsoid("Head", orange, [0, 0.01, 0.48], [0.22, 0.21, 0.3]);
ellipsoid("Back patch", orange, [0.015, 0.155, -0.17], [0.19, 0.085, 0.3]);
for (const sign of [-1, 1]) {
  ellipsoid(
    `Eye ${sign}`,
    dark,
    [sign * 0.165, 0.14, 0.57],
    [0.045, 0.04, 0.053],
  );
  ellipsoid(
    `Eye glint ${sign}`,
    cream,
    [sign * 0.17, 0.166, 0.59],
    [0.012, 0.011, 0.014],
  );
}
function fin(name, vertices, mat, parent = root) {
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vertices.flat(), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  const mesh = new T.Mesh(g, mat);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}
fin(
  "Dorsal",
  [
    [0, 0.16, 0.22],
    [0, 0.44, -0.08],
    [0, 0.31, -0.46],
    [0, 0.13, -0.51],
  ],
  gold,
);
const tail = new T.Group();
tail.name = "Tail";
tail.position.z = -0.58;
root.add(tail);
ellipsoid("Tail stalk", orange, [0, 0, -0.13], [0.105, 0.115, 0.24], tail);
fin(
  "Fan tail",
  [
    [0, 0, 0],
    [-0.34, 0.045, -0.49],
    [0, 0.025, -0.36],
    [0.34, 0.045, -0.49],
  ],
  gold,
  tail,
);
for (const sign of [-1, 1]) {
  const pivot = new T.Group();
  pivot.name = sign < 0 ? "FinL" : "FinR";
  pivot.position.set(sign * 0.16, -0.04, 0.2);
  root.add(pivot);
  fin(
    `Pectoral ${sign}`,
    [
      [0, 0, 0.1],
      [sign * 0.29, -0.015, -0.06],
      [sign * 0.21, -0.04, -0.28],
      [0, 0, -0.13],
    ],
    gold,
    pivot,
  );
}
const times = [0, 0.25, 0.5, 0.75, 1];
const rotation = (axis, values) =>
  values.flatMap((v) => new T.Quaternion().setFromAxisAngle(axis, v).toArray());
const clip = new T.AnimationClip("Swim", 1, [
  new T.QuaternionKeyframeTrack(
    "Tail.quaternion",
    times,
    rotation(new T.Vector3(0, 1, 0), [0, 0.42, 0, -0.42, 0]),
  ),
  new T.QuaternionKeyframeTrack(
    "FinL.quaternion",
    times,
    rotation(new T.Vector3(0, 0, 1), [0.1, 0.38, 0.1, -0.18, 0.1]),
  ),
  new T.QuaternionKeyframeTrack(
    "FinR.quaternion",
    times,
    rotation(new T.Vector3(0, 0, 1), [-0.1, -0.38, -0.1, 0.18, -0.1]),
  ),
]);
await optimizeModel(root);
const binary = await new GLTFExporter().parseAsync(root, {
  binary: true,
  animations: [clip],
});
await writeFile(
  new URL("../public/assets/animals/koi/model.glb", import.meta.url),
  Buffer.from(binary),
);
console.log(`Exported animated River Koi: ${binary.byteLength} bytes`);
