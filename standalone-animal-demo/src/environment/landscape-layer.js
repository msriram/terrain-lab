import * as T from "three";
import { LANDSCAPES } from "../catalog/landscapes.js";
import { analyzeLandscape } from "./layout.js";
import { createPropFactory } from "./props.js";
import { seededRandom } from "../simulation/world.js";

/** Shared scene layer: terrain-aware props, weather, shores, and mountain events. */
export function createLandscapeLayer(
  scene,
  { sampleTerrain, waterLevel = 0.43, theme = "earth" } = {},
) {
  const root = new T.Group();
  root.name = "Living landscape";
  scene.add(root);
  const propsRoot = new T.Group();
  root.add(propsRoot);
  const factory = createPropFactory();
  let recipe = LANDSCAPES[theme] || LANDSCAPES.earth,
    dirty = true,
    lastBuild = -Infinity,
    enabled = true,
    motion = true,
    time = 0,
    layout = { shore: [], volcanoes: [] },
    props = [];
  const resources = [];
  const own = (value) => (resources.push(value), value);
  function texture(kind) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const c = canvas.getContext("2d");
    if (kind === "bubble") {
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
      const g = c.createRadialGradient(
        64,
        64,
        kind === "cloud" ? 12 : 0,
        64,
        64,
        63,
      );
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
    particles = Array.from({ length: 170 }, () => ({
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
    for (let j = 0; j < 4; j++) {
      const material = own(
        new T.SpriteMaterial({
          map: cloudTexture,
          color: 0xe5eee7,
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
        }),
      );
      const sprite = new T.Sprite(material);
      sprite.position.set((j - 1.5) * 0.18, 0.7, Math.sin(j * 2) * 0.09);
      sprite.scale.set(0.8, 0.5, 1);
      group.add(sprite);
    }
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
      uniforms: { time: { value: 0 } },
      vertexShader:
        "varying vec2 uvScene;void main(){uvScene=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec2 uvScene;uniform float time;void main(){vec2 p=uvScene*25.;float a=sin(p.x+sin(p.y*.7+time*.3))+sin(p.y+cos(p.x*.6-time*.23));float b=pow(max(0.,1.-abs(a)),9.);gl_FragColor=vec4(.45,.94,.87,b*.12);}",
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
      size: 10,
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
        galaxies.length < 4 &&
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
          arm = i % 3,
          theta = i * 0.31 + (arm * Math.PI * 2) / 3,
          r = 0.008 + Math.sqrt((i % 105) / 105) * (0.09 + center.h * 0.09);
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
    if (!["neuron", "cyberpunk"].includes(theme)) return;
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
    layout = analyzeLandscape(sampleTerrain, waterLevel, {
      underwater: recipe.underwater,
    });
    propsRoot.clear();
    ventsRoot.clear();
    props = [];
    if (recipe.weather === "galaxy") galaxyLayout();
    else {
      galaxies = [];
      starSeeds = [];
      scatteredStars = 0;
    }
    const candidates = recipe.underwater ? layout.sea : layout.land;
    candidates.slice(0, recipe.underwater ? 24 : 20).forEach((p, i) => {
      const kind = recipe.props[i % recipe.props.length],
        object = factory.build(kind, recipe.colors);
      const scale =
        (["chest", "trident", "ruin"].includes(kind)
          ? 0.29
          : kind === "knoll"
            ? 0.48
            : 0.23) * p.size;
      object.scale.setScalar(scale);
      object.position.set((p.u - 0.5) * 4, 0.004, (p.v - 0.5) * 3);
      object.rotation.y = p.phase;
      propsRoot.add(object);
      props.push({ object, kind, p, scale });
    });
    rebuildNetwork();
    for (const wave of waves)
      wave.geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(
          new Float32Array(layout.shore.length * 6),
          3,
        ),
      );
    for (const p of recipe.eruption ? layout.volcanoes : []) {
      const vent = factory.build("vent", ["#42353a", "#8d4336", "#ff742b"]);
      vent.scale.setScalar(0.48);
      vent.position.set((p.u - 0.5) * 4, 0.01, (p.v - 0.5) * 3);
      ventsRoot.add(vent);
    }
    dirty = false;
    lastBuild = time;
  }
  function weatherIsNeon() {
    return recipe.weather === "neon";
  }
  function update(dt) {
    root.visible = enabled;
    if (!enabled) return;
    if (motion) time += Math.max(0, Math.min(dt, 0.05));
    if (dirty && (time - lastBuild > 0.3 || !motion)) rebuild();
    for (const { object, kind, p, scale } of props) {
      if (
        ["tree", "palm", "flowers", "seaweed", "coral", "snowpine"].includes(
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
    }
    networkLines.visible = signals.visible = [
      "neuron",
      "cyberpunk",
      "atomic",
    ].includes(theme);
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
      weather !== "clouds" && weather !== "rain" && weather !== "fog";
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
      if (weather === "steam" && props.length) {
        const source = props[i % props.length].p,
          age = (time * 0.15 + p.phase) % 1;
        u = source.u + age * 0.04 + Math.sin(time + p.phase) * age * 0.02;
        v = source.v - age * 0.12;
      }
      if (weather === "sprinkles") {
        v = (p.z + time * 0.08 * p.speed) % 1;
      }
      let y = 0.35;
      if (recipe.underwater && sampleTerrain(u, v) > waterLevel) y = -5;
      positions.set([(u - 0.5) * 4, y, (v - 0.5) * 3], i * 3);
    });
    particleGeometry.attributes.position.needsUpdate = true;
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
      cloud.visible =
        ["clouds", "rain", "fog"].includes(weather) || recipe.clouds;
      cloud.position.set(
        (((i * 0.29 + time * 0.012) % 1.4) - 0.7) * 4,
        0,
        Math.sin(i * 5.3) * 1.08,
      );
      cloud.children.forEach((s) => {
        s.material.opacity =
          weather === "fog" ? 0.12 : weather === "rain" ? 0.23 : 0.16;
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
    setTerrain(sample, water) {
      sampleTerrain = sample;
      waterLevel = water;
      dirty = true;
    },
    setOptions(options) {
      if (options.theme && options.theme !== theme) {
        theme = options.theme;
        recipe = LANDSCAPES[theme] || LANDSCAPES.earth;
        dirty = true;
        lastBuild = -Infinity;
      }
      if (options.enabled !== undefined) enabled = options.enabled;
      if (options.motion !== undefined) motion = options.motion;
    },
    getStats() {
      return {
        theme,
        galaxies: galaxies.length,
        signalLinks: links.length,
        scatteredStars,
        props: props.length,
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
      scene.remove(root);
      factory.dispose();
      resources.forEach((r) => r.dispose());
    },
  };
}
