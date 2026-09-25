import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { AnimalSimulation } from "../simulation/world.js";
import { SPECIES, validateRoster } from "../catalog/species.js";
import { createLandscapeLayer } from "../environment/landscape-layer.js";
import { LANDSCAPES } from "../catalog/landscapes.js";
import { createEffects } from "./effects.js";
import { createAnimationController } from "../animation/controller.js";

/** Host owns terrain, layout, and frame loop. No Kinect access or terrain drawing. */
export async function createAnimalLayer({
  canvas,
  sampleTerrain,
  waterLevel = 0.43,
  assetBase = "./assets/animals/",
  seed,
  roster,
}) {
  const simulation = new AnimalSimulation({
    sampleTerrain,
    waterLevel,
    seed,
    roster,
  });
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene(),
    camera = new THREE.OrthographicCamera(-2, 2, 1.5, -1.5, 0.1, 30);
  camera.position.set(0, 10, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xfff4df, 0x59777d, 2.1));
  const sun = new THREE.DirectionalLight(0xfff1d5, 2.5);
  sun.position.set(-3, 6, -2);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9bdde5, 1.4);
  rim.position.set(3, 2, 3);
  scene.add(rim);
  const loader = new GLTFLoader(),
    models = {};
  // All bundled GLBs are prefetched once: changing the roster is synchronous.
  try {
    await Promise.all(
      Object.entries(SPECIES).map(async ([id, s]) => {
        models[id] = await loader.loadAsync(assetBase + s.model);
      }),
    );
  } catch (error) {
    renderer.dispose();
    throw new Error(`Animal assets could not load: ${error.message}`);
  }
  const effects = createEffects();
  const landscape = createLandscapeLayer(scene, { sampleTerrain, waterLevel });
  let landscapeTheme = "earth",
    scenery = true,
    atmosphere = true,
    requestedWater = waterLevel,
    lastSample = sampleTerrain;
  let animals = [],
    enabled = true,
    paused = false,
    pack = "earth",
    remote = false;
  function disposeAnimals() {
    for (const a of animals) {
      a.animation.dispose();
      a.materials.forEach((m) => m.material.dispose());
      a.shadow.material.dispose();
      a.ripple.material.dispose();
      scene.remove(a.root, a.shadow, a.ripple);
    }
    animals = [];
  }
  function applyPack() {
    animals.forEach((animal, i) =>
      animal.materials.forEach(({ material, color, emissive }) => {
        material.color.copy(color);
        material.emissive.copy(emissive);
        material.emissiveIntensity = 1;
        if (
          pack === "atlantis" &&
          simulation.creatures[i].habitat === "water" &&
          ["shark", "koi"].includes(simulation.creatures[i].species)
        ) {
          const glow = new THREE.Color(
            [0x50f4db, 0x69b6ff, 0xc099ff, 0x7cffe3, 0x80d9ff][i % 5],
          );
          // Keep dark eyes/gills and the dorsal markings visible in the luminous pack.
          if (
            color.getHSL({}).l > 0.15 &&
            !(
              simulation.creatures[i].species === "shark" &&
              color.getHSL({}).l > 0.7
            )
          ) {
            material.color.lerp(glow, 0.68);
            material.emissive.copy(glow).multiplyScalar(0.3);
          }
        }
      }),
    );
  }
  function rebuild() {
    disposeAnimals();
    animals = simulation.creatures.map((c) => {
      const species = SPECIES[c.species],
        gltf = models[c.species],
        model = clone(gltf.scene);
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model),
        size = bounds.getSize(new THREE.Vector3()),
        center = bounds.getCenter(new THREE.Vector3());
      // The display represents a broad sandbox footprint, not a life-size
      // diorama. Keep every creature at half its authored footprint.
      const scale = (species.length / Math.max(size.x, size.z)) * 0.5;
      model.scale.multiplyScalar(scale);
      model.position.set(
        -center.x * scale,
        -bounds.min.y * scale,
        -center.z * scale,
      );
      const root = new THREE.Group();
      root.add(model);
      scene.add(root);
      const materials = [];
      model.traverse((obj) => {
        if (obj.isMesh) {
          obj.frustumCulled = false;
          obj.material = obj.material.clone();
          materials.push({
            material: obj.material,
            color: obj.material.color.clone(),
            emissive: obj.material.emissive.clone(),
          });
        }
      });
      const { shadow, ripple } = effects.create(species.length);
      scene.add(shadow, ripple);
      return {
        root,
        displayU: c.u,
        displayV: c.v,
        displayHeading: c.heading,
        model,
        shadow,
        ripple,
        materials,
        animation: createAnimationController(
          model,
          gltf.animations,
          c.species,
          c.id * 0.19,
        ),
      };
    });
    applyPack();
  }
  rebuild();
  const api = {
    simulation,
    setTerrain(sample, level = simulation.waterLevel) {
      lastSample = sample;
      requestedWater = level;
      const underwater = !!LANDSCAPES[landscapeTheme]?.underwater;
      const allLand = !!LANDSCAPES[landscapeTheme]?.allLand;
      const terrain = underwater
        ? (u, v) => {
            const h = sample(u, v);
            return Number.isFinite(h) ? Math.min(0.97, h) : NaN;
          }
        : allLand
          ? (u, v) => (Number.isFinite(sample(u, v)) ? 0.7 : NaN)
          : sample;
      simulation.setTerrain(terrain, underwater ? 1 : level);
      landscape.setTerrain(sample, level);
    },
    setRoster(next) {
      validateRoster(next);
      simulation.setRoster(next);
      rebuild();
      api.update(0);
    },
    getSnapshot() {
      return {
        time: simulation.time,
        creatures: simulation.creatures.map((c) => ({ ...c })),
        events: simulation.events.map((e) => ({ ...e })),
        captures: simulation.captures,
        rescues: simulation.rescues,
      };
    },
    applySnapshot(snapshot) {
      if (
        !snapshot ||
        !Array.isArray(snapshot.creatures) ||
        snapshot.creatures.length > 8
      )
        return;
      const ids = snapshot.creatures.map((c) => c.species);
      validateRoster(ids);
      if (ids.join() !== simulation.creatures.map((c) => c.species).join()) {
        simulation.setRoster(ids);
        rebuild();
      }
      simulation.creatures = snapshot.creatures.map((c) => ({ ...c }));
      simulation.time = snapshot.time;
      simulation.events = snapshot.events;
      simulation.captures = snapshot.captures;
      simulation.rescues = snapshot.rescues;
      remote = true;
    },
    stir() {
      simulation.stir();
    },
    randomizeLandscape() {
      landscape.randomize();
    },
    setOptions(options = {}) {
      if (options.scenery !== undefined) scenery = options.scenery;
      if (options.atmosphere !== undefined) atmosphere = options.atmosphere;
      const nextTheme =
        options.theme ??
        (options.pack && options.pack !== pack ? options.pack : landscapeTheme);
      if (nextTheme !== landscapeTheme) {
        landscapeTheme = nextTheme;
        landscape.setOptions({ theme: landscapeTheme });
        api.setTerrain(lastSample, requestedWater);
      }
      if (options.enabled !== undefined) enabled = options.enabled;
      if (options.paused !== undefined) paused = options.paused;
      if (options.transparent !== undefined)
        renderer.setClearAlpha(options.transparent ? 0 : 1);
      if (options.pack && options.pack !== pack) {
        if (!["earth", "atlantis"].includes(options.pack))
          throw new Error("Unknown world pack");
        pack = options.pack;
        applyPack();
      }
    },
    resize(width, height) {
      renderer.setSize(Math.round(width), Math.round(height), false);
    },
    update(dt) {
      const step = enabled && !paused ? Math.max(0, Math.min(dt, 0.05)) : 0;
      if (step && !remote) simulation.update(step);
      simulation.creatures.forEach((c, i) => {
        const a = animals[i];
        a.root.visible = a.shadow.visible = enabled && c.active;
        a.ripple.visible = false;
        if (!c.active || !enabled) return;
        // Networked projector poses approach 10 Hz snapshots at render rate.
        const blend = remote && !paused ? Math.min(1, Math.max(0, dt) * 22) : 1;
        let u = a.displayU + (c.u - a.displayU) * blend;
        let v = a.displayV + (c.v - a.displayV) * blend;
        if (
          Math.hypot(c.u - a.displayU, c.v - a.displayV) > 0.12 ||
          !simulation.valid(c, u, v)
        ) {
          u = c.u;
          v = c.v;
        }
        a.displayU = u;
        a.displayV = v;
        a.displayHeading +=
          Math.atan2(
            Math.sin(c.heading - a.displayHeading),
            Math.cos(c.heading - a.displayHeading),
          ) * blend;
        a.root.position.set(
          (u - 0.5) * 4,
          c.habitat === "water" ? 0.012 : 0,
          (v - 0.5) * 3,
        );
        a.root.rotation.y = a.displayHeading;
        a.shadow.position.set(
          a.root.position.x + 0.008,
          -0.002,
          a.root.position.z + 0.012,
        );
        a.shadow.rotation.y = a.displayHeading;
        a.ripple.position.set(a.root.position.x, 0.002, a.root.position.z);
        a.animation.update(
          c,
          step,
          a.root,
          a.shadow,
          a.ripple,
          simulation.time,
        );
      });
      landscape.setOptions({ enabled: scenery, motion: atmosphere && !paused });
      landscape.update(paused ? 0 : Math.max(0, Math.min(dt, 0.05)));
      renderer.render(scene, camera);
    },
    getStats() {
      return {
        active: enabled
          ? simulation.creatures.filter((c) => c.active).length
          : 0,
        landscape: landscape.getStats(),
        captures: simulation.captures,
        rescues: simulation.rescues,
        waiting: simulation.creatures.filter((c) => c.respawnAt !== null)
          .length,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        pack,
        behaviors: simulation.creatures.map((c) => ({
          id: c.id,
          species: c.species,
          mode: c.mode,
          active: c.active,
        })),
      };
    },
    dispose() {
      disposeAnimals();
      const geometries = new Set(),
        materials = new Set(),
        textures = new Set();
      Object.values(models).forEach((g) =>
        g.scene.traverse((o) => {
          if (o.isMesh) {
            geometries.add(o.geometry);
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material]) {
              materials.add(m);
              for (const value of Object.values(m))
                if (value?.isTexture) textures.add(value);
            }
          }
        }),
      );
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      landscape.dispose();
      effects.dispose();
      renderer.dispose();
    },
  };
  api.update(0);
  return api;
}
