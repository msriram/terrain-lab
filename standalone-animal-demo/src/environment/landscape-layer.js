import * as T from "three";
import { LANDSCAPES } from "../catalog/landscapes.js";
import { analyzeLandscape } from "./layout.js";
import { createPropFactory } from "./props.js";
import { seededRandom } from "../simulation/world.js";
import { createLivingEffects } from "./living-effects.js";
import { reefGrowth } from "./reef-growth.js";
import { findReefSites } from "./reef-layout.js";
import { createCyberCity } from "./cyber-city.js";
import { createWorldArchitecture } from "./world-architecture.js";
import { createStableCityTerrain } from "./stable-city-terrain.js";
import { findUnderwaterStructureSites } from "./underwater-structures.js";

const PROP_SCALE = 0.5;
const LANDSCAPE_REBUILD_DELAY_SECONDS = 2.4;
const CITY_REBUILD_DELAY_SECONDS = 10;
const CITY_THEMES = new Set(["cyberpunk", "copper", "emerald", "atlantis", "deepsea"]);

/** Shared scene layer: terrain-aware props, weather, shores, and mountain events. */
export function createLandscapeLayer(
  scene,
  { sampleTerrain, waterLevel = 0.43, theme = "earth" } = {},
) {
  const root = new T.Group();
  root.name = "Living landscape";
  scene.add(root);
  const living = createLivingEffects(root);
  const city = createCyberCity(root);
  const architecture = createWorldArchitecture(root);
  const stableCityTerrain = createStableCityTerrain();
  const stableSceneryTerrain = createStableCityTerrain();
  // undefined means the hidden city renderers have not been initialized yet.
  let cityTheme;
  let cityRebuilds = 0;
  let sceneryRebuilds = 0;
  const propsRoot = new T.Group();
  root.add(propsRoot);
  const reefRoot = new T.Group();
  reefRoot.name = "Growing coral reef";
  root.add(reefRoot);
  let reefs = [];
  let retiringReefs = [];
  const factory = createPropFactory();
  let recipe = LANDSCAPES[theme] || LANDSCAPES.earth,
    dirty = true,
    lastBuild = -Infinity,
    lastBuildAt = -Infinity,
    enabled = true,
    motion = true,
    projectionFlipped = false,
    time = 0,
    layout = { shore: [], volcanoes: [] },
    props = [],
    layoutSeed = 31;
  let propTheme = null;
  let retiringProps = [];
  const resources = [];
  let density = 1;
  let addedElements = [], removedElements = [];
  let sceneryEditsRevision = 0;
  const own = (value) => (resources.push(value), value);
  function texture(kind) {
    const canvas = document.createElement("canvas");
    canvas.width = kind === "cloud" ? 256 : 128;
    canvas.height = 128;
    const c = canvas.getContext("2d");
    if (kind === "cloud") {
      const pixels = c.createImageData(256, 128);
      for (let y = 0; y < 128; y++)
        for (let x = 0; x < 256; x++) {
          const u = (x - 128) / 128,
            v = (y - 64) / 64;
          const waves =
            Math.sin(u * 8 + v * 3) * 0.13 + Math.sin(u * 17 - v * 5) * 0.045;
          const width = 0.31 + 0.12 * Math.cos(u * 3) + waves;
          const body = Math.max(
            0,
            1 - Math.abs(v - 0.09 * Math.sin(u * 5)) / Math.max(0.06, width),
          );
          const taper = Math.max(0, 1 - Math.abs(u) ** 2.3);
          const filament = Math.max(0, Math.sin(v * 17 + u * 9)) * 0.08;
          const alpha = Math.pow(body, 1.7) * taper * (0.52 + filament);
          const offset = (y * 256 + x) * 4;
          pixels.data[offset] = 239;
          pixels.data[offset + 1] = 250;
          pixels.data[offset + 2] = 255;
          pixels.data[offset + 3] = Math.round(alpha * 255);
        }
      c.putImageData(pixels, 0, 0);
    } else if (kind === "bubble") {
      c.strokeStyle = "rgba(204,255,249,.72)";
      c.lineWidth = 5;
      c.beginPath();
      c.arc(64, 64, 45, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "rgba(255,255,255,.95)";
      c.beginPath();
      c.arc(47, 40, 9, 0, Math.PI * 2);
      c.fill();
    } else {
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 63);
      g.addColorStop(0, "rgba(255,255,255,.9)");
      g.addColorStop(0.45, "rgba(255,255,255,.35)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
    }
    return own(new T.CanvasTexture(canvas));
  }
  const bubbleTexture = texture("bubble"),
    glowTexture = texture("glow"),
    cloudTexture = texture("cloud");
  const rng = seededRandom(839),
    particles = Array.from({ length: 340 }, () => ({
      x: rng(),
      z: rng(),
      phase: rng(),
      speed: 0.5 + rng(),
      size: rng(),
    }));
  const particleGeometry = own(new T.BufferGeometry());
  particleGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(new Float32Array(particles.length * 3), 3),
  );
  const particleMaterial = own(
    new T.PointsMaterial({
      size: 6,
      sizeAttenuation: false,
      color: 0xc5f5d9,
      map: glowTexture,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
  );
  const points = new T.Points(particleGeometry, particleMaterial);
  points.frustumCulled = false;
  root.add(points);
  const rainGeometry = own(new T.BufferGeometry());
  rainGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(new Float32Array(150 * 6), 3),
  );
  const rainMaterial = own(
    new T.LineBasicMaterial({
      color: 0xbad9d9,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
  );
  const rain = new T.LineSegments(rainGeometry, rainMaterial);
  root.add(rain);
  const clouds = [];
  for (let i = 0; i < 4; i++) {
    const group = new T.Group();
    const material = own(
      new T.SpriteMaterial({
        map: cloudTexture,
        color: 0xe5eee7,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    const sprite = new T.Sprite(material);
    sprite.position.y = 0.7;
    sprite.scale.set(1.7 + i * 0.13, 0.47 + i * 0.04, 1);
    group.add(sprite);
    root.add(group);
    clouds.push(group);
  }
  const waves = Array.from({ length: 3 }, () => {
    const geometry = own(new T.BufferGeometry());
    const material = own(
      new T.LineBasicMaterial({
        color: 0xdcf4dc,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    );
    const lines = new T.LineSegments(geometry, material);
    root.add(lines);
    return lines;
  });
  const causticGeometry = own(new T.PlaneGeometry(4, 3));
  causticGeometry.rotateX(-Math.PI / 2);
  const causticMaterial = own(
    new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: { time: { value: 0 }, strength: { value: .12 } },
      vertexShader:
        "varying vec2 uvScene;void main(){uvScene=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec2 uvScene;uniform float time;uniform float strength;void main(){vec2 p=uvScene*25.;float a=sin(p.x+sin(p.y*.7+time*.3))+sin(p.y+cos(p.x*.6-time*.23));float b=pow(max(0.,1.-abs(a)),9.);gl_FragColor=vec4(.45,.94,.87,b*strength);}",
    }),
  );
  const caustics = new T.Mesh(causticGeometry, causticMaterial);
  caustics.position.y = 0.015;
  caustics.renderOrder = 2;
  root.add(caustics);
  const eruptionGeometry = own(new T.BufferGeometry());
  eruptionGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(new Float32Array(120 * 3), 3),
  );
  const eruptionMaterial = own(
    new T.PointsMaterial({
      size: 4,
      sizeAttenuation: false,
      map: glowTexture,
      color: 0xff9a35,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: T.AdditiveBlending,
    }),
  );
  const eruption = new T.Points(eruptionGeometry, eruptionMaterial);
  eruption.frustumCulled = false;
  root.add(eruption);
  const ventsRoot = new T.Group();
  root.add(ventsRoot);
  const smokeGeometry = own(new T.BufferGeometry());
  smokeGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(new Float32Array(35 * 3), 3),
  );
  const smokeMaterial = own(
    new T.PointsMaterial({
      size: 50,
      sizeAttenuation: false,
      map: cloudTexture,
      color: 0x756b71,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    }),
  );
  const smoke = new T.Points(smokeGeometry, smokeMaterial);
  smoke.frustumCulled = false;
  root.add(smoke);
  const galaxyGeometry = own(new T.BufferGeometry());
  galaxyGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(new Float32Array(900 * 3), 3),
  );
  const galaxyMaterial = own(
    new T.PointsMaterial({
      color: 0xe4c9ff,
      size: 8,
      sizeAttenuation: false,
      map: glowTexture,
      transparent: true,
      opacity: 0.87,
      depthWrite: false,
      depthTest: false,
      blending: T.AdditiveBlending,
    }),
  );
  const galaxyPoints = new T.Points(galaxyGeometry, galaxyMaterial);
  galaxyPoints.frustumCulled = false;
  root.add(galaxyPoints);
  let galaxies = [],
    starSeeds = [],
    scatteredStars = 0;
  function galaxyLayout() {
    const candidates = [];
    for (let y = 2; y < 16; y++)
      for (let x = 2; x < 22; x++) {
        const u = x / 24,
          v = y / 18,
          h = sampleTerrain(u, v);
        if (!Number.isFinite(h) || h < 0.55) continue;
        const neighbors = [
          [u - 0.045, v],
          [u + 0.045, v],
          [u, v - 0.06],
          [u, v + 0.06],
        ].map(([a, b]) => sampleTerrain(a, b));
        if (neighbors.every((n) => Number.isFinite(n) && h >= n))
          candidates.push({ u, v, h });
      }
    candidates.sort((a, b) => b.h - a.h);
    galaxies = [];
    for (const p of candidates)
      if (
        galaxies.length < Math.round(4 * density) &&
        galaxies.every((q) => Math.hypot(q.u - p.u, q.v - p.v) > 0.18)
      )
        galaxies.push(p);
    starSeeds = [];
    for (let i = 0; i < 900; i++) {
      const seed = particles[i % particles.length],
        u = (seed.x + i * 0.618033) % 1,
        v = (seed.z + i * 0.414214) % 1,
        h = sampleTerrain(u, v);
      if (i < 720 && galaxies.length) {
        const center = galaxies[i % galaxies.length],
          rank = Math.floor(i / galaxies.length),
          arm = rank % 3,
          progress =
            Math.floor(rank / 3) /
            Math.max(1, Math.floor(720 / galaxies.length / 3)),
          theta =
            (arm * Math.PI * 2) / 3 +
            progress * Math.PI * 3.5 +
            (seed.phase - 0.5) * 0.25,
          r =
            0.005 +
            Math.sqrt(progress) * (0.09 + center.h * 0.08) +
            (seed.size - 0.5) * 0.009;
        starSeeds.push({ u: center.u, v: center.v, r, theta, cluster: true });
      } else if (Number.isFinite(h) && h < waterLevel + 0.05) {
        starSeeds.push({ u, v, r: 0, theta: 0, cluster: false });
      } else starSeeds.push({ u: -3, v: -3, r: 0, theta: 0, cluster: false });
    }
    scatteredStars = starSeeds.filter((s) => !s.cluster && s.u >= 0).length;
  }
  const networkGeometry = own(new T.BufferGeometry());
  networkGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(new Float32Array(48 * 6), 3),
  );
  const networkMaterial = own(
    new T.LineBasicMaterial({
      color: 0x9dcfff,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    }),
  );
  const networkLines = new T.LineSegments(networkGeometry, networkMaterial);
  networkLines.frustumCulled = false;
  root.add(networkLines);
  const signalGeometry = own(new T.BufferGeometry());
  signalGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(new Float32Array(48 * 3), 3),
  );
  const signalMaterial = own(
    new T.PointsMaterial({
      size: 9,
      sizeAttenuation: false,
      map: glowTexture,
      color: 0xffe9a8,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: T.AdditiveBlending,
    }),
  );
  const signals = new T.Points(signalGeometry, signalMaterial);
  signals.frustumCulled = false;
  root.add(signals);
  let links = [];
  function rebuildNetwork() {
    links = [];
    if (!["neuron", "universe"].includes(theme)) return;
    for (let i = 0; i < props.length; i++) {
      const a = props[i].object.position;
      const neighbors = props
        .map((p, j) => ({ j, d: p.object.position.distanceToSquared(a) }))
        .filter((p) => p.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const n of neighbors) {
        const j = n.j;
        if (i < j && !links.some((e) => e[0] === i && e[1] === j))
          links.push([i, j]);
      }
    }
    links = links.slice(0, 48);
  }
  function rebuild() {
    if (!stableSceneryTerrain.update(sampleTerrain, { theme, waterLevel, layoutSeed, density, sceneryEditsRevision })) {
      dirty = false;
      lastBuild = time;
      lastBuildAt = performance.now() / 1000;
      return;
    }
    const sceneryTerrain = stableSceneryTerrain.sample;
    layout = analyzeLandscape(sceneryTerrain, waterLevel, {
      underwater: recipe.underwater,
      seed: layoutSeed,
      capacity: 90,
    });
    const availableProps = propTheme === theme ? [...props] : [];
    if (propTheme !== theme) { propsRoot.clear(); retiringProps = []; }
    propTheme = theme;
    ventsRoot.clear();
    props = [];
    if (recipe.weather === "galaxy") galaxyLayout();
    else {
      galaxies = [];
      starSeeds = [];
      scatteredStars = 0;
    }
    const candidates = recipe.underwater ? layout.sea : layout.land;
    const baseCount = theme === "forest" ? 24 : theme === "tundra" ? 30 : theme === "coral" ? 10 : theme === "deepsea" ? 32 : ["cyberpunk","copper","emerald"].includes(theme) ? 0 : recipe.underwater ? 24 : 20;
    const structureWorld = theme === "atlantis" || theme === "deepsea";
    const structureCount = Math.round(baseCount * density * 0.65);
    let structures = structureWorld
      ? findUnderwaterStructureSites(sceneryTerrain, waterLevel, layoutSeed, structureCount)
      : [];
    const structureKinds = theme === "atlantis"
      ? ["castle", "drownedtower", "brokenarch", "ruin"]
      : ["talokan-temple", "talokan-district", "talokan-district", "talokan-beacon"];
    if (structureWorld) {
      const retained = availableProps.filter(old => structureKinds.includes(old.kind))
        .map(old => ({ ...old.p, h: sceneryTerrain(old.p.u, old.p.v), kind: old.kind }))
        .filter(site => Number.isFinite(site.h) && site.h >= waterLevel - 0.035)
        .slice(0, structureCount);
      for (const site of structures) {
        if (retained.some(old => Math.hypot(old.u - site.u, old.v - site.v) < 0.075)) continue;
        if (retained.length < structureCount) { retained.push(site); continue; }
        const weakest = retained.reduce((index, old, i) => old.h < retained[index].h ? i : index, 0);
        if (site.h > retained[weakest].h + 0.12) retained[weakest] = site;
      }
      structures = retained;
    }
    const secondaryKinds = theme === "atlantis"
      ? ["seaweed", "seaweed", "chest", "trident", "coral"]
      : ["seaweed", "vent", "seaweed"];
    const secondaryLimit = Math.max(0, Math.round(baseCount * density) - structures.length);
    let secondary = structureWorld
      ? candidates.filter(p => p.h < water - 0.025)
          .slice(0, secondaryLimit)
      : candidates.slice(0, Math.round(baseCount * density));
    if (structureWorld) {
      const retained = availableProps.filter(old => secondaryKinds.includes(old.kind))
        .map(old => ({ ...old.p, h: sceneryTerrain(old.p.u, old.p.v), kind: old.kind }))
        .filter(site => Number.isFinite(site.h) && site.h < waterLevel - 0.025)
        .slice(0, secondaryLimit);
      for (const site of secondary) {
        if (retained.length >= secondaryLimit) break;
        if (retained.every(old => Math.hypot(old.u - site.u, old.v - site.v) > 0.065))
          retained.push(site);
      }
      secondary = retained;
    }
    const placements = [...structures.map((p, i) => ({ ...p, kind: p.kind || structureKinds[i % structureKinds.length] })),
      ...secondary.map((p, i) => structureWorld ? { ...p, kind: p.kind || secondaryKinds[i % secondaryKinds.length] } : p)]
      .filter(p => !removedElements.some(q => Math.hypot(p.u-q.u, p.v-q.v) < .05))
      .concat(addedElements);
    placements.forEach((p, i) => {
      const kind = p.kind || (theme === "tundra"
        ? p.h > 0.76 ? "rockpeak" : p.h > 0.57 && i % 3 !== 0 ? "coniferstand" : "meadow"
        : recipe.props[i % recipe.props.length]);
      let closest = -1, distance = 0.105;
      for (let j = 0; j < availableProps.length; j++) {
        const old = availableProps[j];
        const d = old.kind === kind ? Math.hypot(old.p.u - p.u, old.p.v - p.v) : Infinity;
        if (d < distance) { closest = j; distance = d; }
      }
      const reused = closest >= 0 ? availableProps.splice(closest, 1)[0] : null;
      const object = reused?.object || factory.build(kind, recipe.colors, Math.floor(p.phase * 1000));
      const scale =
        (["chest", "trident", "ruin"].includes(kind)
          ? 0.29
          : kind === "talokan-temple" ? 0.38
          : kind === "talokan-district" ? 0.30
          : kind === "talokan-beacon" ? 0.24
          : kind === "forestgrove" ? 0.65
          : kind === "coniferstand" ? 0.56
          : kind === "meadow" ? 0.48
          : kind === "rockpeak" ? 0.45
          : kind === "crater" && theme === "moon"
            ? 0.4
          : kind === "knoll"
            ? 0.48
            : 0.23) *
        p.size *
        PROP_SCALE;
      if (!reused) {
        object.scale.setScalar(0.001);
        object.position.set((p.u - 0.5) * 4, 0.004, (p.v - 0.5) * 3);
        propsRoot.add(object);
      }
      object.rotation.y = kind === "crater" ? 0 : p.phase;
      props.push({ object, kind, p, scale, fade: reused?.fade ?? 0,
        targetX: (p.u - 0.5) * 4, targetZ: (p.v - 0.5) * 3 });
    });
    retiringProps.push(...availableProps);
    if (theme === "coral") {
      const sites = findReefSites(sceneryTerrain, layoutSeed, Math.round(48 * density), waterLevel);
      const palettes = [
        ["#b85b62", "#d39958", "#845d9d"],
        ["#ba6b91", "#bca769", "#4f9b8e"],
        ["#c68b66", "#7667a4", "#b89851"],
      ];
      const availableReefs = [...reefs];
      reefs = [];
      sites.forEach((site, i) => {
        let closest = -1, distance = 0.055;
        for (let j = 0; j < availableReefs.length; j++) {
          const old = availableReefs[j];
          const d = Math.hypot(old.u - site.u, old.v - site.v);
          if (d < distance) { closest = j; distance = d; }
        }
        let reef = closest >= 0 ? availableReefs.splice(closest, 1)[0] : null;
        if (!reef) {
          const object = factory.build("reefcolony", palettes[(site.cluster + i) % palettes.length], Math.floor(site.phase * 1000));
          object.rotation.y = site.phase;
          object.scale.setScalar(0.001);
          reefRoot.add(object);
          reef = { ...site, object, growth: 0 };
          object.position.set((site.u - 0.5) * 4, 0.004, (site.v - 0.5) * 3);
        }
        reef.u = site.u;
        reef.v = site.v;
        reef.centerU = site.centerU;
        reef.centerV = site.centerV;
        reef.phase = site.phase;
        reef.targetX = (site.u - 0.5) * 4;
        reef.targetZ = (site.v - 0.5) * 3;
        reefs.push(reef);
      });
      retiringReefs.push(...availableReefs);
    }
    rebuildNetwork();
    if (["cyberpunk", "copper", "emerald"].includes(theme)) {
      if (stableCityTerrain.update(sampleTerrain, { theme, waterLevel, layoutSeed, density })) {
        city.rebuild(stableCityTerrain.sample, waterLevel, layoutSeed, theme === "cyberpunk" ? density : 0);
        architecture.rebuild(theme, stableCityTerrain.sample, waterLevel, layoutSeed, density);
        cityRebuilds++;
      }
      cityTheme = theme;
    } else if (cityTheme !== null) {
      city.rebuild(sampleTerrain, waterLevel, layoutSeed, 0);
      architecture.rebuild(theme, sampleTerrain, waterLevel, layoutSeed, density);
      cityTheme = null;
    }
    for (const wave of waves)
      wave.geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(
          new Float32Array(layout.shore.length * 6),
          3,
        ),
      );
    living.terrain(
      sampleTerrain,
      waterLevel,
      recipe.eruption ? layout.volcanoes : [],
    );
    dirty = false;
    lastBuild = time;
    lastBuildAt = performance.now() / 1000;
    sceneryRebuilds++;
  }
  function weatherIsNeon() {
    return recipe.weather === "neon-rain";
  }
  function update(dt) {
    root.visible = enabled;
    if (!enabled) return;
    if (motion) time += Math.max(0, Math.min(dt, 0.05));
    // A city keeps its established layout through several seconds of live
    // depth updates. World switches and explicit scene edits still build now.
    const isCity = CITY_THEMES.has(theme);
    const delay = isCity ? CITY_REBUILD_DELAY_SECONDS
      : theme === "coral" ? 0.4 : LANDSCAPE_REBUILD_DELAY_SECONDS;
    if (
      dirty &&
      (lastBuild === -Infinity || performance.now() / 1000 - lastBuildAt >= delay || (!motion && !isCity))
    )
      rebuild();
    living.update(dt, theme, recipe, motion, projectionFlipped);
    city.update(time, projectionFlipped);
    architecture.update(time);
    factory.setTime(time);
    reefRoot.visible = theme === "coral";
    if (reefRoot.visible) for (const reef of reefs) {
      const target = reefGrowth(sampleTerrain, reef.u, reef.v, waterLevel);
      reef.growth += (target - reef.growth) * (motion ? 1 - Math.exp(-Math.min(dt, 0.05) * 1.65) : 1);
      reef.object.visible = reef.growth > 0.04;
      reef.object.scale.setScalar((0.018 + reef.growth * 0.063) * (1 + Math.sin(time * 0.7 + reef.phase) * 0.012));
      reef.object.rotation.z = Math.sin(time * 0.85 + reef.phase) * 0.012;
      reef.object.position.x += (reef.targetX - reef.object.position.x) * (motion ? 1 - Math.exp(-Math.min(dt, 0.05) * 4) : 1);
      reef.object.position.z += (reef.targetZ - reef.object.position.z) * (motion ? 1 - Math.exp(-Math.min(dt, 0.05) * 4) : 1);
    }
    retiringReefs = retiringReefs.filter(reef => {
      reef.growth *= motion ? Math.exp(-Math.min(dt, 0.05) * 3) : 0;
      reef.object.scale.setScalar((0.018 + reef.growth * 0.063) * reef.growth);
      if (reef.growth > 0.025) return true;
      reefRoot.remove(reef.object);
      return false;
    });
    const ease = motion ? 1 - Math.exp(-Math.min(dt, 0.05) * 3.5) : 1;
    for (const item of props) {
      const { object, kind, p, scale } = item;
      item.fade += (1 - item.fade) * ease;
      object.position.x += (item.targetX - object.position.x) * ease;
      object.position.z += (item.targetZ - object.position.z) * ease;
      object.scale.setScalar(scale);
      if (
        ["flowers", "seaweed", "coral"].includes(
          kind,
        )
      ) {
        object.rotation.z = Math.sin(time * 1.3 + p.phase) * 0.055;
        object.rotation.x = Math.cos(time * 0.9 + p.phase) * 0.025;
      }
      if (
        [
          "mushroom",
          "jellyfish",
          "gumdrop",
          "cell",
          "enzyme",
          "nucleus",
        ].includes(kind)
      ) {
        const pulse = 1 + Math.sin(time * 2 + p.phase) * 0.065;
        object.scale.set(scale * pulse, scale, scale * pulse);
      }
      if (kind === "jellyfish")
        object.position.y = 0.07 + Math.sin(time + p.phase) * 0.03;
      if (weatherIsNeon())
        object.scale.setScalar(
          scale * (1 + Math.sin(time * 2 + p.phase) * 0.04),
        );
      if (["eye", "planet", "starcore", "neuron", "atom"].includes(kind))
        object.rotation.y = p.phase + time * 0.17;
      if (kind === "eye")
        object.position.y = 0.05 + Math.sin(time + p.phase) * 0.03;
      if (kind === "gear") object.rotation.y = p.phase + time * 0.15;
      object.scale.multiplyScalar(item.fade);
    }
    retiringProps = retiringProps.filter(item => {
      item.fade *= 1 - ease;
      item.object.scale.setScalar(item.scale * item.fade);
      if (item.fade > 0.025) return true;
      propsRoot.remove(item.object);
      return false;
    });
    networkLines.visible = signals.visible = [
      "neuron",
      "universe",
      "atomic",
    ].includes(theme);
    networkMaterial.color.set(theme === "universe" ? 0xa68fda : 0x9dcfff);
    signalMaterial.color.set(theme === "universe" ? 0xf4d5ff : 0xffe9a8);
    if (networkLines.visible) {
      const lineData = networkGeometry.attributes.position.array,
        pointData = signalGeometry.attributes.position.array;
      if (theme === "atomic") {
        networkLines.visible = false;
        const count = Math.min(48, props.length * 2);
        for (let i = 0; i < count; i++) {
          const base = props[Math.floor(i / 2)].object.position,
            angle = time * (i % 2 ? 2.4 : -1.9) + i * 2.4;
          pointData.set(
            [
              base.x + Math.cos(angle) * 0.14,
              0.3,
              base.z + Math.sin(angle) * 0.14,
            ],
            i * 3,
          );
        }
        signalGeometry.setDrawRange(0, count);
      } else {
        links.forEach(([i, j], k) => {
          const a = props[i].object.position,
            b = props[j].object.position,
            t = (time * 0.3 + k * 0.17) % 1;
          lineData.set([a.x, 0.12, a.z, b.x, 0.12, b.z], k * 6);
          pointData.set(
            [a.x + (b.x - a.x) * t, 0.16, a.z + (b.z - a.z) * t],
            k * 3,
          );
        });
        networkGeometry.setDrawRange(0, links.length * 2);
        networkGeometry.attributes.position.needsUpdate = true;
        signalGeometry.setDrawRange(0, links.length);
      }
      signalGeometry.attributes.position.needsUpdate = true;
    }
    galaxyPoints.visible = recipe.weather === "galaxy";
    if (galaxyPoints.visible) {
      const data = galaxyGeometry.attributes.position.array;
      starSeeds.forEach((s, i) => {
        let u = s.u,
          v = s.v;
        if (s.cluster) {
          const a = s.theta + time * 0.07 * (i % 2 ? 1 : -1);
          u += Math.cos(a) * s.r;
          v += Math.sin(a) * s.r * 0.75;
        }
        data.set([(u - 0.5) * 4, 0.035, (v - 0.5) * 3], i * 3);
      });
      galaxyGeometry.attributes.position.needsUpdate = true;
    }
    const weather = recipe.weather;
    const bubbles = weather === "bubbles" || weather === "marine-snow";
    particleMaterial.map = bubbles ? bubbleTexture : glowTexture;
    particleMaterial.color.set(
      bubbles
        ? "#c1f5ee"
        : weather === "embers"
          ? "#ff9551"
          : weather === "snow"
            ? "#eaf7f4"
            : recipe.colors[1],
    );
    particleMaterial.size = bubbles
      ? 7
      : weather === "snow"
        ? 4
        : weather === "sprinkles"
          ? 6
          : 5;
    points.visible =
      theme !== "copper" && weather !== "clouds" && weather !== "rain" && weather !== "fog" && weather !== "neon-rain";
    particleGeometry.setDrawRange(0, weather === "snow" ? 340 : 170);
    const positions = particleGeometry.attributes.position.array;
    particles.forEach((p, i) => {
      let u = (p.x + time * 0.008 * p.speed) % 1,
        v =
          (p.z -
            time *
              (bubbles ? 0.012 : weather === "snow" ? 0.027 : 0.006) *
              p.speed +
            100) %
          1;
      u += Math.sin(time * 0.7 + p.phase * 12) * 0.009;
      if (weather === "dust") {
        const center = i % 3,
          angle = time * p.speed + p.phase * 20,
          r = 0.035 + p.size * 0.065;
        u = 0.2 + center * 0.3 + Math.sin(angle) * r;
        v = 0.5 + Math.cos(angle) * r + Math.sin(time * 0.13 + center) * 0.25;
      }
      if (weather === "sand") {
        u = (p.x + time * 0.12 * p.speed) % 1;
        v = p.z + Math.sin(time + p.phase) * 0.015;
      }
      if (weather === "steam" && (props.length || architecture.steamSources().length)) {
        const source = architecture.steamSources().length
          ? architecture.steamSources()[i % architecture.steamSources().length]
          : props[i % props.length].p,
          age = (time * 0.15 + p.phase) % 1;
        u = source.u + age * 0.04 + Math.sin(time + p.phase) * age * 0.02;
        v = source.v - age * 0.12;
      }
      if (weather === "sprinkles") {
        v = (p.z + time * 0.08 * p.speed) % 1;
      }
      let y = 0.35;
      if (weather === "snow") {
        const age = (time * .19 * p.speed + p.phase) % 1;
        y = .025 + (1 - age) * .48;
        // Flakes descend to the surface instead of floating at a fixed height.
        if (!Number.isFinite(sampleTerrain(u, v))) y = -5;
      }
      if (recipe.underwater && sampleTerrain(u, v) > waterLevel) y = -5;
      positions.set([(u - 0.5) * 4, y, (v - 0.5) * 3], i * 3);
    });
    particleGeometry.attributes.position.needsUpdate = true;
    const atmosphereRotation=projectionFlipped?Math.PI:0;
    points.rotation.y=atmosphereRotation;
    rain.rotation.y=atmosphereRotation;
    rain.visible = weather === "rain" || weather === "meteors";
    if (rain.visible) {
      const array = rainGeometry.attributes.position.array;
      for (let i = 0; i < 150; i++) {
        const p = particles[i],
          x = (p.x + time * (weather === "meteors" ? 0.25 : 0.04)) % 1,
          z = (p.z + time * 0.65 * p.speed) % 1;
        array.set(
          [
            (x - 0.5) * 4,
            0.35,
            (z - 0.5) * 3,
            (x - 0.5) * 4 + 0.015,
            0.32,
            (z - 0.5) * 3 + 0.07,
          ],
          i * 6,
        );
      }
      rainGeometry.setDrawRange(0, weather === "meteors" ? 24 : 300);
      rainGeometry.attributes.position.needsUpdate = true;
    }
    clouds.forEach((cloud, i) => {
      cloud.visible = false; // Replaced by the evolving noise cloud field.
      cloud.position.set(
        (((i * 0.29 + time * 0.012) % 1.4) - 0.7) * 4,
        0,
        Math.sin(i * 5.3) * 1.08,
      );
      cloud.children.forEach((s) => {
        s.material.opacity =
          weather === "fog" ? 0.18 : weather === "rain" ? 0.39 : 0.43;
        s.material.color.set(recipe.clouds ? "#edd2e2" : "#dce8e5");
      });
    });
    waves.forEach((wave, index) => {
      wave.visible = !!recipe.waves;
      const phase = (time * 0.32 + index / 3) % 1,
        offset = (1 - phase) * 0.1;
      wave.material.opacity = Math.sin(phase * Math.PI) * 0.42;
      const data = wave.geometry.attributes.position?.array;
      if (!data) return;
      layout.shore.forEach((segment, i) => {
        for (const [j, p] of [segment.a, segment.b].entries())
          data.set(
            [
              (p.u - 0.5) * 4 - segment.nx * offset,
              0.008,
              (p.v - 0.5) * 3 - segment.nz * offset,
            ],
            i * 6 + j * 3,
          );
      });
      wave.geometry.attributes.position.needsUpdate = true;
    });
    caustics.visible = !!recipe.underwater;
    causticMaterial.uniforms.time.value = time;
    causticMaterial.uniforms.strength.value = theme === "deepsea" ? .025 : .12;
    const erupting = recipe.eruption && layout.volcanoes.length > 0;
    eruption.visible = smoke.visible = !!erupting;
    if (erupting) {
      const array = eruptionGeometry.attributes.position.array;
      for (let i = 0; i < 120; i++) {
        const peak = layout.volcanoes[i % layout.volcanoes.length],
          p = particles[i],
          age = (time * 0.6 + p.phase) % 1,
          angle = p.phase * Math.PI * 30,
          r = age * (0.2 + p.size * 0.33);
        array.set(
          [
            (peak.u - 0.5) * 4 + Math.sin(angle) * r,
            0.05 + Math.sin(age * Math.PI) * 0.5,
            (peak.v - 0.5) * 3 + Math.cos(angle) * r,
          ],
          i * 3,
        );
      }
      eruptionGeometry.attributes.position.needsUpdate = true;
      const smokeArray = smokeGeometry.attributes.position.array;
      for (let i = 0; i < 35; i++) {
        const peak = layout.volcanoes[i % layout.volcanoes.length],
          p = particles[i],
          age = (time * 0.19 + p.phase) % 1;
        smokeArray.set(
          [
            (peak.u - 0.5) * 4 +
              age * 0.35 +
              Math.sin(i * 7 + time) * age * 0.12,
            0.5 + age * 0.5,
            (peak.v - 0.5) * 3 - age * 0.48,
          ],
          i * 3,
        );
      }
      smokeGeometry.attributes.position.needsUpdate = true;
    }
  }
  return {
    update,
    setWildlife(creatures, onCatch) {
      architecture.setWildlife(creatures, onCatch);
    },
    wildlifeThreats: () => architecture.wildlifeThreats(),
    setTerrain(sample, water) {
      sampleTerrain = sample;
      waterLevel = water;
      dirty = true;
    },
    setOptions(options) {
      if (Number.isFinite(options.density)) {
        const next = Math.max(0, Math.min(3, options.density));
        if (next !== density) { density = next; dirty = true; lastBuild = -Infinity; }
      }
      if (options.theme && options.theme !== theme) {
        addedElements = []; removedElements = [];
        theme = options.theme;
        recipe = LANDSCAPES[theme] || LANDSCAPES.earth;
        dirty = true;
        lastBuild = -Infinity;
      }
      if (options.enabled !== undefined) enabled = options.enabled;
      if (options.motion !== undefined) motion = options.motion;
      if (options.projectionFlipped !== undefined) projectionFlipped = !!options.projectionFlipped;
      if (options.labels !== undefined) architecture.setLabels(!!options.labels);
    },
    getState: () => ({ seed: layoutSeed, addedElements, removedElements }),
    applyState(state) {
      if (!state || !Number.isInteger(state.seed) ||
          !Array.isArray(state.addedElements) || !Array.isArray(state.removedElements)) return;
      if (state.seed === layoutSeed && JSON.stringify(state.addedElements) === JSON.stringify(addedElements) &&
          JSON.stringify(state.removedElements) === JSON.stringify(removedElements)) return;
      layoutSeed = state.seed;
      addedElements = state.addedElements.slice(0, 90);
      removedElements = state.removedElements.slice(0, 90);
      sceneryEditsRevision++;
      dirty = true;
      lastBuild = -Infinity;
    },
    randomize() {
      addedElements = []; removedElements = [];
      reefRoot.clear(); reefs = []; retiringReefs = [];
      layoutSeed = Math.floor(Math.random() * 2147483647);
      sceneryEditsRevision++;
      dirty = true;
      lastBuild = -Infinity;
    },
    edit(u, v, remove) {
      if (remove) {
        const nearest = props.reduce((best, p) => !best ||
          Math.hypot(p.p.u-u,p.p.v-v) < Math.hypot(best.p.u-u,best.p.v-v) ? p : best, null);
        if (!nearest || Math.hypot(nearest.p.u-u, nearest.p.v-v) > .08) return;
        addedElements = addedElements.filter(p => p !== nearest.p);
        removedElements.push({u:nearest.p.u, v:nearest.p.v});
      } else {
        const height = sampleTerrain(u, v);
        if (!Number.isFinite(height) || (!recipe.underwater && height <= waterLevel)) return;
        addedElements.push({u,v,phase:Math.random()*6.28,size:.8+Math.random()*.4,
          kind:recipe.props[Math.floor(Math.random()*recipe.props.length)]});
      }
      sceneryEditsRevision++;
      dirty = true; lastBuild = -Infinity;
    },
    getStats() {
      return {
        density,
        projectionFlipped,
        ...living.stats(),
        ...city.stats(),
        ...architecture.stats(),
        cityRebuilds,
        sceneryRebuilds,
        theme,
        galaxies: galaxies.length,
        signalLinks: links.length,
        scatteredStars,
        props: props.length,
        structureSites: props.filter(({ kind }) => ["castle", "drownedtower", "brokenarch", "ruin", "talokan-temple", "talokan-district", "talokan-beacon"].includes(kind))
          .map(({ kind, p }) => ({ kind, u: p.u, v: p.v })),
        reefColonies: reefs.filter((reef) => reef.object.visible && reefRoot.visible).length,
        reefSites: reefRoot.visible ? reefs.filter(reef => reef.object.visible).map(({ u, v }) => ({ u, v })) : [],
        reefGrowth: reefs.reduce((total, reef) => total + reef.growth, 0),
        propKinds: [...new Set(props.map((p) => p.kind))],
        shoreSegments: layout.shore.length,
        erupting: !!recipe.eruption && layout.volcanoes.length > 0,
        volcanoes: recipe.eruption ? layout.volcanoes.length : 0,
        weather: recipe.weather,
        caption: recipe.caption,
        underwater: !!recipe.underwater,
        time,
      };
    },
    dispose() {
      living.dispose();
      city.dispose();
      architecture.dispose();
      scene.remove(root);
      factory.dispose();
      resources.forEach((r) => r.dispose());
    },
  };
}
