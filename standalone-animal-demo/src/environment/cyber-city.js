import * as T from "three";
import { planCyberCity } from "./cyber-city-layout.js";

const position = (u, v) => [(u - .5) * 4, (v - .5) * 3];

/** A batched miniature city sharing the sandbox's terrain sample and clock. */
export function createCyberCity(root) {
  const group = new T.Group();
  group.name = "Cyberpunk streets";
  root.add(group);
  const box = new T.BoxGeometry(1, 1, 1);
  const body = new T.MeshStandardMaterial({ color: "#172039", roughness: .75, metalness: .28 });
  const curb = new T.MeshBasicMaterial({ color: "#40506a" });
  const road = new T.MeshBasicMaterial({ color: "#080e20" });
  const lane = new T.MeshBasicMaterial({ color: "#57a9bd", transparent: true, opacity: .55 });
  const neon = new T.MeshBasicMaterial({ color: "#ffffff" });
  const vehicle = new T.MeshBasicMaterial({ color: "#ffffff" });
  const walker = new T.MeshBasicMaterial({ color: "#bfd8e9" });
  const rainMaterial = new T.LineBasicMaterial({ color: "#a2d7fa", transparent: true, opacity: .35, depthWrite: false });
  const rainGeometry = new T.BufferGeometry();
  const rainPositions = new Float32Array(260 * 2 * 3);
  rainGeometry.setAttribute("position", new T.BufferAttribute(rainPositions, 3));
  const rainfall = new T.LineSegments(rainGeometry, rainMaterial);
  rainfall.frustumCulled = false;
  group.add(rainfall);
  const matrix = new T.Matrix4(), color = new T.Color();
  let blocks = [], roads = [], cars, people, rainSites = [];
  const staticMeshes = [];
  const place = (mesh, index, x, y, z, sx, sy, sz, tint) => {
    matrix.makeScale(sx, sy, sz).setPosition(x, y, z);
    mesh.setMatrixAt(index, matrix);
    if (tint) mesh.setColorAt(index, color.set(tint));
  };
  function rebuild(sample, water, seed, density) {
    for (const mesh of staticMeshes) group.remove(mesh);
    staticMeshes.length = 0;
    if (cars) group.remove(cars);
    if (people) group.remove(people);
    ({ blocks, roads } = planCyberCity(sample, water, seed, density));
    group.visible = blocks.length > 0;
    rainSites = blocks.filter((block, i) => (i + seed) % 3 !== 0);
    const towers = new T.InstancedMesh(box, body, blocks.length * 3);
    const roofs = new T.InstancedMesh(box, neon, blocks.length * 3);
    const curbs = new T.InstancedMesh(box, curb, roads.length);
    const streets = new T.InstancedMesh(box, road, roads.length);
    const markings = new T.InstancedMesh(box, lane, roads.length);
    const crossings = new T.InstancedMesh(box, lane, blocks.length * 2);
    const hues = ["#42dbe6", "#f245b7", "#ebbb57", "#7187fa", "#82ddab"];
    blocks.forEach((block, i) => {
      const [cx, cz] = position(block.u, block.v);
      for (let j = 0; j < 3; j++) {
        const n = i * 3 + j;
        const angle = j * 2.094 + block.phase * 3;
        const x = cx + Math.cos(angle) * .18, z = cz + Math.sin(angle) * .18;
        const width = .09 + ((i * 7 + j * 3) % 5) * .015;
        const height = .16 + ((i * 5 + j * 11) % 9) * .038;
        place(towers, n, x, height / 2, z, width, height, width * .82);
        place(roofs, n, x, height + .008, z, width * .77, .016, width * .53, hues[(i + j) % hues.length]);
      }
    });
    roads.forEach((route, i) => {
      const [ax, az] = position(route.u0, route.v0), [bx, bz] = position(route.u1, route.v1);
      const eastWest = Math.abs(bx - ax) > Math.abs(bz - az);
      const length = Math.hypot(bx - ax, bz - az);
      place(curbs, i, (ax + bx) / 2, .005, (az + bz) / 2,
        eastWest ? length : .11, .01, eastWest ? .11 : length);
      place(streets, i, (ax + bx) / 2, .009, (az + bz) / 2,
        eastWest ? length : .075, .012, eastWest ? .075 : length);
      place(markings, i, (ax + bx) / 2, .018, (az + bz) / 2,
        eastWest ? length * .77 : .006, .004, eastWest ? .006 : length * .77);
    });
    blocks.forEach((block, i) => {
      const [x, z] = position(block.u, block.v);
      place(crossings, i * 2, x + .065, .02, z, .008, .004, .05);
      place(crossings, i * 2 + 1, x, .02, z + .065, .05, .004, .008);
    });
    for (const mesh of [towers, roofs, curbs, streets, markings, crossings]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = false;
      group.add(mesh);
      staticMeshes.push(mesh);
    }
    cars = new T.InstancedMesh(box, vehicle, Math.min(roads.length, 30));
    people = new T.InstancedMesh(box, walker, Math.min(blocks.length * 2, 70));
    cars.frustumCulled = people.frustumCulled = false;
    group.add(cars, people);
  }
  function update(time) {
    if (!group.visible) return;
    for (let i = 0; i < cars.count; i++) {
      const route = roads[(i * 7) % roads.length], t = (time * (.12 + i % 3 * .035) + i * .173) % 1;
      const [x, z] = position(route.u0 + (route.u1 - route.u0) * t, route.v0 + (route.v1 - route.v0) * t);
      const horizontal = route.u0 !== route.u1;
      place(cars, i, x, .033, z, horizontal ? .045 : .022, .025, horizontal ? .022 : .045,
        i % 3 === 0 ? "#f6cf73" : i % 3 === 1 ? "#ff67b6" : "#69e7ef");
    }
    cars.instanceMatrix.needsUpdate = true;
    if (cars.instanceColor) cars.instanceColor.needsUpdate = true;
    for (let i = 0; i < people.count; i++) {
      const block = blocks[Math.floor(i / 2)], [cx, cz] = position(block.u, block.v);
      const phase = (time * (.22 + i % 4 * .035) + i * .37) % 1;
      const side = i % 2 ? 1 : -1;
      place(people, i, cx + (phase - .5) * .36, .036, cz + side * .11, .012, .06, .012);
    }
    people.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 260; i++) {
      const site = rainSites[(i * 13) % rainSites.length];
      if (!site) { rainPositions.fill(-5, i * 6, i * 6 + 6); continue; }
      const phase = (i * .618033 + time * (.7 + i % 5 * .08)) % 1;
      const [cx, cz] = position(site.u, site.v);
      const x = cx + (((i * 73) % 101) / 101 - .5) * .46;
      const z = cz + (((i * 47) % 97) / 97 - .5) * .45;
      const y = .07 + (1 - phase) * .45;
      rainPositions.set([x, y, z, x + .016, y - .07, z + .025], i * 6);
    }
    rainGeometry.attributes.position.needsUpdate = true;
  }
  return {
    rebuild,
    update,
    stats: () => ({ cityBlocks: blocks.length, roadSegments: roads.length, cars: cars?.count || 0, pedestrians: people?.count || 0, rainPatches: rainSites.length }),
    dispose() {
      root.remove(group);
      for (const resource of [box, body, curb, road, lane, neon, vehicle, walker, rainMaterial, rainGeometry]) resource.dispose();
    },
  };
}
