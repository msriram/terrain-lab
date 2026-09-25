import * as T from "three";
export { T };
export function material(name, color, roughness = 0.72) {
  return new T.MeshStandardMaterial({
    name,
    color,
    roughness,
    flatShading: true,
    side: T.DoubleSide,
  });
}
export function ellipsoid(parent, name, mat, p, s, detail = 1) {
  const m = new T.Mesh(new T.IcosahedronGeometry(1, detail), mat);
  m.name = name;
  m.position.set(...p);
  m.scale.set(...s);
  parent.add(m);
  return m;
}
export function pivot(parent, name, p) {
  const g = new T.Group();
  g.name = name;
  g.position.set(...p);
  parent.add(g);
  return g;
}
export function rod(parent, name, mat, a, b, r1 = 0.04, r2 = r1) {
  const av = new T.Vector3(...a),
    bv = new T.Vector3(...b),
    dir = bv.clone().sub(av);
  const m = new T.Mesh(new T.CylinderGeometry(r2, r1, dir.length(), 6), mat);
  m.name = name;
  m.position.copy(av.add(bv).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
  parent.add(m);
  return m;
}
export function fin(parent, name, mat, vertices) {
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vertices.flat(), 3));
  g.setIndex([0, 1, 2]);
  g.computeVertexNormals();
  const m = new T.Mesh(g, mat);
  m.name = name;
  parent.add(m);
  return m;
}
export function rotateTrack(node, axis, times, values) {
  return new T.QuaternionKeyframeTrack(
    node + ".quaternion",
    times,
    values.flatMap((v) =>
      new T.Quaternion().setFromAxisAngle(new T.Vector3(...axis), v).toArray(),
    ),
  );
}
export function positionTrack(node, times, positions) {
  return new T.VectorKeyframeTrack(node + ".position", times, positions.flat());
}

// Merge static pieces sharing a material under each animated pivot.
// This preserves independently animated parts and reduces draw calls.
export async function optimizeModel(root) {
  const { mergeGeometries } = await import(
    "three/addons/utils/BufferGeometryUtils.js"
  );
  root.updateMatrixWorld(true);
  const groups = [];
  root.traverse((o) => {
    if (o.isGroup) groups.push(o);
  });
  for (const group of groups) {
    const batches = new Map();
    for (const mesh of group.children.filter((o) => o.isMesh)) {
      if (!batches.has(mesh.material)) batches.set(mesh.material, []);
      batches.get(mesh.material).push(mesh);
    }
    for (const [mat, meshes] of batches) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map((mesh) => {
        mesh.updateMatrix();
        const g = mesh.geometry.index
          ? mesh.geometry.toNonIndexed()
          : mesh.geometry.clone();
        g.applyMatrix4(mesh.matrix);
        return g;
      });
      // Geometry generators all provide position/normal/uv except custom fins.
      const hasUV = geometries.every((g) => g.hasAttribute("uv"));
      if (!hasUV) geometries.forEach((g) => g.deleteAttribute("uv"));
      const merged = mergeGeometries(geometries);
      if (!merged) throw new Error("Geometry merge failed");
      const combined = new T.Mesh(merged, mat);
      combined.name = group.name + "_" + mat.name;
      group.add(combined);
      meshes.forEach((m) => group.remove(m));
      geometries.forEach((g) => g.dispose());
    }
  }
}
