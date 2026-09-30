import * as T from "three";

const TAU = Math.PI * 2;
const at = (p) => ({ x: (p.u - 0.5) * 4, z: (p.v - 0.5) * 3 });
const hash = (n) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function routePoint(route, t) {
  const points = route.points,
    n = points.length - 1,
    q = clamp(t, 0, 0.999999) * n,
    i = Math.floor(q),
    f = q - i,
    a = points[i],
    b = points[i + 1];
  return {
    x: a.x + (b.x - a.x) * f,
    z: a.z + (b.z - a.z) * f,
    y: a.y + (b.y - a.y) * f,
    heading: Math.atan2(b.x - a.x, b.z - a.z),
  };
}
export function createEmeraldCity(parent) {
  const root = new T.Group();
  root.name = "Emerald City of Oz";
  parent.add(root);
  const staticRoot = new T.Group(),
    dynamic = new T.Group();
  root.add(staticRoot, dynamic);
  const owned = [],
    transient = [];
  const own = (x) => (owned.push(x), x);
  const box = own(new T.BoxGeometry(1, 1, 1)),
    column = own(new T.CylinderGeometry(1, 1, 1, 8)),
    spire = own(new T.ConeGeometry(1, 1, 6)),
    orb = own(new T.IcosahedronGeometry(1, 1)),
    dome = own(new T.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2));
  const mat = (color, extra = {}) =>
    own(new T.MeshStandardMaterial({ color, roughness: 0.48, ...extra }));
  const lawn = mat(0x275c42),
    dark = mat(0x123b31),
    jade = mat(0x14825d, { metalness: 0.28 }),
    glass = mat(0x34dda5, {
      metalness: 0.4,
      roughness: 0.18,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
    }),
    gold = mat(0xf9cf56, { metalness: 0.45 }),
    yellow = mat(0xffd84e, { emissive: 0x553200, emissiveIntensity: 0.25 }),
    cream = mat(0xf6efbb),
    amethyst = mat(0xaa5ee9, { emissive: 0x321259, emissiveIntensity: 0.32 }),
    witchBlack = mat(0x1b1029),
    moss = mat(0x237847),
    skin = mat(0xb0cc80),
    gem = mat(0x72ffb5, { emissive: 0x38bd73, emissiveIntensity: 0.5 }),
    eye = mat(0xfaa0ec, { emissive: 0x853085, emissiveIntensity: 0.5 });
  const surfaceCanvas = document.createElement("canvas");
  surfaceCanvas.width = 768;
  surfaceCanvas.height = 576;
  const surfaceTex = own(new T.CanvasTexture(surfaceCanvas));
  surfaceTex.colorSpace = T.SRGBColorSpace;
  const surfaceGeo = own(new T.PlaneGeometry(4, 3));
  surfaceGeo.rotateX(-Math.PI / 2);
  const surface = new T.Mesh(
    surfaceGeo,
    own(
      new T.MeshBasicMaterial({
        map: surfaceTex,
        transparent: true,
        depthWrite: false,
      }),
    ),
  );
  surface.position.y = 0.006;
  root.add(surface);
  // The same drifting fractal-noise language as Earth's clouds, tinted in broad rainbow bands.
  const rainbowMaterial = own(
    new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: { time: { value: 0 }, fade: { value: 0 } },
      vertexShader:
        "varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 p;uniform float time;uniform float fade;
    float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
    float fbm(vec2 q){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(q);q=q*2.03+7.1;a*=.5;}return v;}
    void main(){vec2 q=p*vec2(5.,3.)+vec2(-time*.035,time*.014);vec2 warp=vec2(fbm(q+time*.03),fbm(q+13.-time*.021));float n=fbm(q+warp*2.);
    vec2 d=(p-.5)*vec2(1.05,2.25);float envelope=1.-smoothstep(.26,.82,length(d)+(n-.5)*.19);
    float body=(.42+.58*smoothstep(.32,.64,n))*envelope;
    float u=clamp((p.x-.08)/.84,0.,1.);
    vec3 a=vec3(1.,.29,.42),b=vec3(1.,.60,.23),c=vec3(1.,.88,.36),e=vec3(.36,.85,.50),f=vec3(.29,.63,1.),g=vec3(.65,.42,.94);
    vec3 spectrum=u<.2?mix(a,b,u*5.):u<.4?mix(b,c,(u-.2)*5.):u<.6?mix(c,e,(u-.4)*5.):u<.8?mix(e,f,(u-.6)*5.):mix(f,g,(u-.8)*5.);
    vec3 col=mix(spectrum,vec3(1.),.18);gl_FragColor=vec4(col,body*fade*.82);}`,
    }),
  );
  const rainbowGeometry = own(new T.PlaneGeometry(1.9, 0.95));
  rainbowGeometry.rotateX(-Math.PI / 2);
  const rainbow = new T.Mesh(rainbowGeometry, rainbowMaterial);
  rainbow.position.y = 0.82;
  rainbow.renderOrder = 20;
  dynamic.add(rainbow);
  const lights = [],
    citizens = [],
    witches = [],
    guardians = [],
    roads = [];
  let plan = null,
    time = 0,
    previousTime = 0,
    deaths = 0;
  function piece(group, geo, material, x, y, z, sx, sy, sz) {
    const m = new T.Mesh(geo, material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    group.add(m);
    return m;
  }
  function rod(group, a, b, r, material) {
    const d = b.clone().sub(a),
      m = piece(group, column, material, 0, 0, 0, r, d.length(), r);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return m;
  }
  function paint(sample, water) {
    const c = surfaceCanvas.getContext("2d"),
      w = surfaceCanvas.width,
      h = surfaceCanvas.height,
      im = c.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const e = sample(x / w, y / h),
          i = (y * w + x) * 4;
        if (!Number.isFinite(e) || e < 0) continue;
        const n = hash(x * 31 + y * 87) - 0.5,
          wet = e < water;
        const shade = clamp((e - water) * 110, 0, 28);
        im.data.set(
          wet
            ? [12 + n * 8, 72 + n * 9, 66 + n * 7, 230]
            : [
                30 + shade + n * 12,
                91 + shade + n * 12,
                55 + shade * 0.4 + n * 9,
                238,
              ],
          i,
        );
      }
    c.putImageData(im, 0, 0);
    const px = (x) => (x / 4 + 0.5) * w,
      pz = (z) => (z / 3 + 0.5) * h;
    for (const road of roads) {
      c.lineCap = "round";
      c.lineJoin = "round";
      for (const [color, width] of [
        ["#134c3a", 20],
        ["#c18d30", 16],
        ["#ffe27a", 12],
      ]) {
        c.strokeStyle = color;
        c.lineWidth = width;
        c.beginPath();
        road.points.forEach((p, i) =>
          i ? c.lineTo(px(p.x), pz(p.z)) : c.moveTo(px(p.x), pz(p.z)),
        );
        c.stroke();
      }
      // Individual brick courses remain visible in the normal browser view.
      c.strokeStyle = "rgba(132,85,19,.7)";
      c.lineWidth = 1.4;
      for (let i = 1; i < road.points.length - 1; i++) {
        const p = road.points[i],
          a = road.points[i - 1],
          b = road.points[i + 1],
          dx = b.x - a.x,
          dz = b.z - a.z,
          len = Math.hypot(dx, dz) || 1,
          nx = -dz / len,
          nz = dx / len;
        c.beginPath();
        c.moveTo(px(p.x - nx * 0.026), pz(p.z - nz * 0.026));
        c.lineTo(px(p.x + nx * 0.026), pz(p.z + nz * 0.026));
        c.stroke();
      }
    }
    surfaceTex.needsUpdate = true;
  }
  function palace(site, i) {
    const p = at(site),
      r = site.radius,
      h = 0.19 + site.height * 0.8;
    const g = new T.Group();
    g.position.set(p.x, 0, p.z);
    staticRoot.add(g);
    g.matrixAutoUpdate = false;
    g.matrix.set(1, 0.32, 0, p.x, 0, 1, 0, 0, 0, 0.23, 1, p.z, 0, 0, 0, 1);
    piece(g, column, dark, 0, 0.023, 0, r * 1.05, 0.045, r * 1.05);
    piece(g, column, gold, 0, 0.051, 0, r * 0.98, 0.014, r * 0.98);
    piece(g, column, jade, 0, h * 0.38 + 0.06, 0, r * 0.62, h * 0.76, r * 0.62);
    for (let k = 0; k < 9; k++) {
      const a = (k * TAU) / 9,
        x = Math.sin(a) * r * 0.61,
        z = Math.cos(a) * r * 0.61;
      piece(g, column, gold, x, h * 0.4 + 0.06, z, 0.009, h * 0.8, 0.009);
      piece(g, box, cream, x, h * 0.43 + 0.06, z, 0.014, 0.043, 0.017);
    }
    piece(g, column, gold, 0, h * 0.82 + 0.06, 0, r * 0.69, 0.017, r * 0.69);
    piece(g, dome, glass, 0, h * 0.83 + 0.06, 0, r * 0.62, h * 0.35, r * 0.62);
    piece(g, column, gold, 0, h * 1.17 + 0.06, 0, r * 0.1, 0.035, r * 0.1);
    piece(g, spire, glass, 0, h * 1.36 + 0.06, 0, r * 0.16, h * 0.34, r * 0.16);
    piece(g, orb, yellow, 0, h * 1.56 + 0.06, 0, 0.017, 0.024, 0.017);
    // Rectangular wings, windows, and turrets keep the skyline architectural.
    for (const side of [-1, 1]) {
      const x = side * r * 0.64,
        z = r * 0.37;
      piece(
        g,
        box,
        i % 3 === 0 ? cream : jade,
        x,
        h * 0.28 + 0.06,
        z,
        r * 0.33,
        h * 0.56,
        r * 0.32,
      );
      piece(g, box, gold, x, h * 0.57 + 0.06, z, r * 0.38, 0.012, r * 0.37);
      piece(
        g,
        spire,
        glass,
        x,
        h * 0.71 + 0.06,
        z,
        r * 0.21,
        h * 0.27,
        r * 0.21,
      );
      for (let floor = 0; floor < 2; floor++)
        piece(
          g,
          box,
          yellow,
          x,
          h * (0.21 + floor * 0.19) + 0.06,
          z + r * 0.168,
          r * 0.13,
          0.012,
          0.006,
        );
    }
    for (let k = 0; k < 6; k++) {
      const a = (k * TAU) / 6 + site.phase,
        x = Math.sin(a) * r * 0.78,
        z = Math.cos(a) * r * 0.78,
        sh = h * (0.5 + (k % 3) * 0.12);
      piece(g, column, jade, x, sh * 0.5 + 0.06, z, r * 0.18, sh, r * 0.18);
      piece(g, spire, glass, x, sh + 0.13, z, r * 0.23, 0.16, r * 0.23);
      piece(g, orb, gold, x, sh + 0.22, z, 0.013, 0.013, 0.013);
      piece(g, box, cream, x, 0.15, z, 0.024, 0.085, 0.024);
    }
    for (let k = 0; k < 12; k++) {
      const a = (k * TAU) / 12,
        x = Math.sin(a) * r * 0.94,
        z = Math.cos(a) * r * 0.94;
      piece(
        g,
        orb,
        k % 3 === 0 ? amethyst : gem,
        x,
        0.066,
        z,
        0.017,
        0.032,
        0.016,
      );
    }
    if (i === 0) {
      // Great gate and two vigilant, stationary guardians.
      piece(g, box, gold, 0, 0.105, r * 1.02, r * 0.9, 0.18, 0.034);
      piece(g, box, dark, 0, 0.105, r * 1.04, r * 0.47, 0.14, 0.038);
      for (const side of [-1, 1]) {
        piece(
          g,
          column,
          glass,
          side * r * 0.52,
          0.16,
          r * 1.02,
          r * 0.13,
          0.32,
          r * 0.13,
        );
        piece(
          g,
          spire,
          gold,
          side * r * 0.52,
          0.35,
          r * 1.02,
          r * 0.18,
          0.13,
          r * 0.18,
        );
        const guard = new T.Group();
        guard.position.set(p.x + side * r * 0.66, 0.02, p.z + r * 1.18);
        dynamic.add(guard);
        piece(guard, column, gold, 0, 0.043, 0, 0.024, 0.07, 0.018);
        piece(guard, orb, cream, 0, 0.091, 0, 0.016, 0.017, 0.016);
        piece(guard, spire, glass, 0, 0.118, 0, 0.022, 0.037, 0.022);
        rod(
          guard,
          new T.Vector3(side * 0.026, 0.11, 0),
          new T.Vector3(side * 0.026, 0.025, 0),
          0.003,
          gold,
        );
        guardians.push(guard);
      }
    }
  }
  function gemField(site, i) {
    const p = at(site);
    for (let k = 0; k < 4; k++) {
      const a = hash(i * 19 + k * 7) * TAU,
        r = 0.025 + hash(i * 13 + k * 3) * 0.05,
        x = p.x + Math.cos(a) * r,
        z = p.z + Math.sin(a) * r;
      const m = piece(
        staticRoot,
        spire,
        k % 4 === 0 ? amethyst : gem,
        x,
        0.045,
        z,
        0.016,
        0.063,
        0.016,
      );
      m.rotation.y = a;
      if (k === 0) lights.push({ mesh: m, phase: i * 0.7 });
    }
  }
  function makeCitizen(road, i) {
    const g = new T.Group();
    dynamic.add(g);
    piece(
      g,
      column,
      i % 4 === 0 ? gold : jade,
      0,
      0.033,
      0,
      0.014,
      0.045,
      0.013,
    );
    piece(g, orb, skin, 0, 0.062, 0, 0.011, 0.012, 0.011);
    piece(
      g,
      spire,
      i % 3 === 0 ? amethyst : glass,
      0,
      0.087,
      0,
      0.024,
      0.044,
      0.024,
    );
    const legs = [];
    for (const side of [-1, 1]) {
      const leg = new T.Group();
      leg.position.set(side * 0.008, 0.016, 0);
      g.add(leg);
      piece(leg, box, dark, 0, -0.008, 0, 0.006, 0.019, 0.007);
      legs.push(leg);
    }
    g.scale.setScalar(1.65);
    citizens.push({
      g,
      legs,
      road,
      offset: hash(i * 7.13),
      speed: 0.034 + hash(i * 13.1) * 0.024,
      alive: true,
      respawn: 0,
      id: i,
    });
  }
  function makeWitch(road, i) {
    const g = new T.Group();
    dynamic.add(g);
    // Local +Z is the flight direction. The broad cloak and broom bristles trail behind.
    const capeShape = new T.Shape();
    capeShape.moveTo(-0.022, -0.025);
    capeShape.lineTo(-0.055, 0.12);
    capeShape.lineTo(0.055, 0.12);
    capeShape.lineTo(0.022, -0.025);
    capeShape.closePath();
    const capeGeometry = new T.ShapeGeometry(capeShape);
    capeGeometry.rotateX(-Math.PI / 2);
    transient.push(capeGeometry);
    const cape = new T.Mesh(capeGeometry, amethyst);
    cape.position.y = 0.039;
    g.add(cape);
    for (const side of [-1, 1])
      rod(
        g,
        new T.Vector3(side * 0.022, 0.045, 0.018),
        new T.Vector3(side * 0.046, 0.035, -0.04),
        0.006,
        witchBlack,
      );
    rod(
      g,
      new T.Vector3(0.024, 0.018, -0.09),
      new T.Vector3(0.024, 0.018, 0.13),
      0.004,
      gold,
    );
    for (let k = -3; k <= 3; k++)
      rod(
        g,
        new T.Vector3(0.024, 0.022, -0.07),
        new T.Vector3(
          0.024 + k * 0.008,
          0.022,
          -0.15 - Math.abs(k % 2) * 0.008,
        ),
        0.0023,
        gold,
      );
    piece(g, column, witchBlack, 0, 0.047, 0, 0.021, 0.035, 0.019);
    piece(g, orb, skin, 0, 0.067, 0.026, 0.018, 0.016, 0.017);
    for (const side of [-1, 1])
      piece(g, orb, eye, side * 0.009, 0.069, 0.042, 0.004, 0.004, 0.003);
    piece(g, column, witchBlack, 0, 0.079, 0.008, 0.047, 0.008, 0.047);
    piece(g, column, amethyst, 0, 0.084, 0.008, 0.035, 0.006, 0.035);
    const hat = piece(
      g,
      spire,
      witchBlack,
      0,
      0.114,
      0.012,
      0.032,
      0.068,
      0.032,
    );
    hat.rotation.x = 0.28;
    piece(g, orb, amethyst, 0, 0.15, 0.031, 0.008, 0.009, 0.008);
    g.scale.setScalar(1.85);
    witches.push({
      g,
      road,
      phase: i * 0.47,
      target: i % Math.max(1, citizens.length),
      heading: 0,
      id: i,
    });
  }
  function makeRoad(link, plan, sample, water) {
    const a = at(plan.citadels[link.i]),
      b = at(plan.citadels[link.j]),
      points = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32,
        x = a.x + (b.x - a.x) * t,
        z = a.z + (b.z - a.z) * t,
        e = sample(x / 4 + 0.5, z / 3 + 0.5);
      if (!Number.isFinite(e) || e < 0) return;
      const rise = e < water + 0.018 ? Math.sin(t * Math.PI) * 0.055 : 0;
      points.push({
        x,
        z,
        y: link.bridge || e < water + 0.018 ? 0.055 + rise : 0.026,
        wet: e < water + 0.018,
      });
    }
    roads.push({ points, bridge: points.some((p) => p.wet) });
  }
  function buildCauseways() {
    for (const road of roads) {
      if (!road.bridge) continue;
      for (let i = 1; i < road.points.length; i++) {
        const a = road.points[i - 1],
          b = road.points[i];
        if (!a.wet && !b.wet) continue;
        rod(
          staticRoot,
          new T.Vector3(a.x, a.y, a.z),
          new T.Vector3(b.x, b.y, b.z),
          0.039,
          gold,
        );
      }
      for (let k = 4; k < road.points.length - 4; k += 5) {
        const p = road.points[k];
        if (!p.wet) continue;
        piece(staticRoot, column, jade, p.x, p.y * 0.5, p.z, 0.009, p.y, 0.009);
        piece(staticRoot, orb, gem, p.x, p.y + 0.018, p.z, 0.012, 0.018, 0.012);
      }
    }
  }
  function clear() {
    staticRoot.clear();
    dynamic.clear();
    dynamic.add(rainbow);
    roads.length =
      citizens.length =
      witches.length =
      guardians.length =
      lights.length =
        0;
    transient.splice(0).forEach((x) => x.dispose());
    plan = null;
    deaths = 0;
    rainbowMaterial.uniforms.fade.value = 0;
  }
  return {
    rebuild(next, sample, water) {
      clear();
      root.visible = !!next;
      if (!next) return;
      plan = next;
      next.skyways.forEach((link) => makeRoad(link, next, sample, water));
      paint(sample, water);
      buildCauseways();
      next.citadels.forEach(palace);
      next.groves.forEach(gemField);
      const active = roads.filter((r) => !r.bridge);
      const walking = active.length ? active : roads;
      for (let i = 0; i < Math.min(36, walking.length * 5); i++)
        makeCitizen(walking[i % walking.length], i);
      for (let i = 0; i < Math.min(3, Math.max(1, roads.length)); i++)
        if (roads.length) makeWitch(roads[i % roads.length], i);
      citizens.forEach((c) => {
        const p = routePoint(c.road, c.offset);
        c.g.position.set(p.x, p.y + 0.012, p.z);
      });
      witches.forEach((w, i) => {
        const p = routePoint(w.road, i / Math.max(1, witches.length));
        w.g.position.set(p.x, 0.14, p.z);
        w.heading = p.heading;
        w.g.rotation.y = p.heading;
      });
    },
    update(t) {
      const dt = clamp(t - previousTime, 0, 0.05);
      previousTime = t;
      time = t;
      if (!plan) return;
      for (const item of lights) {
        const pulse = 0.8 + 0.35 * Math.sin(t * 4 + item.phase);
        item.mesh.scale.set(0.016 * pulse, 0.063 * pulse, 0.016 * pulse);
      }
      const rainbowCycle = (t + 2) % 19,
        show = rainbowCycle > 5 && rainbowCycle < 13,
        fade = show
          ? Math.min(1, (rainbowCycle - 5) / 1.2, (13 - rainbowCycle) / 1.2)
          : 0;
      rainbowMaterial.uniforms.fade.value = fade;
      rainbowMaterial.uniforms.time.value = t;
      if (plan.citadels.length) {
        const cycle = Math.floor(t / 19);
        rainbow.position.set(
          (hash(cycle * 17 + 9) - 0.5) * 0.55,
          0.82,
          (hash(cycle * 29 + 7) - 0.5) * 0.45,
        );
        rainbow.rotation.y = t * 0.11;
      }
      for (const w of witches) {
        const victim = citizens[w.target];
        if (!victim || !victim.alive) {
          w.target = (w.target + 1) % citizens.length;
        }
        const target = citizens[w.target],
          p = w.g.position,
          goal = target?.g.position;
        if (goal && target.alive) {
          const dx = goal.x - p.x,
            dz = goal.z - p.z,
            len = Math.hypot(dx, dz) || 1,
            step = Math.min(len, 0.34 * dt);
          p.x += (dx / len) * step;
          p.z += (dz / len) * step;
          p.y = 0.12 + Math.sin(t * 4 + w.id) * 0.016;
          p.y = Math.max(p.y, 0.12);
          const desired = Math.atan2(dx, dz);
          w.heading +=
            Math.atan2(
              Math.sin(desired - w.heading),
              Math.cos(desired - w.heading),
            ) * Math.min(1, dt * 8);
          w.g.rotation.y = w.heading;
          if (len < 0.052) {
            target.alive = false;
            target.g.visible = false;
            target.respawn = t + 3;
            deaths++;
            w.target = (w.target + 1) % citizens.length;
          }
        }
      }
      for (const c of citizens) {
        if (!c.alive) {
          if (t >= c.respawn) {
            c.alive = true;
            c.g.visible = true;
            c.offset = hash(c.id * 71 + t);
          } else continue;
        }
        const phase = (c.offset + t * c.speed) % 2,
          s = phase > 1 ? 2 - phase : phase,
          p = routePoint(c.road, s);
        let fleeX = 0,
          fleeZ = 0;
        for (const w of witches) {
          const dx = p.x - w.g.position.x,
            dz = p.z - w.g.position.z,
            d = Math.hypot(dx, dz);
          if (d < 0.25 && d > 0.001) {
            fleeX += (dx / d) * (0.25 - d) * 1.2;
            fleeZ += (dz / d) * (0.25 - d) * 1.2;
            c.offset += dt * 0.055;
          }
        }
        c.g.position.set(p.x + fleeX, p.y + 0.012, p.z + fleeZ);
        c.g.rotation.y = p.heading + (phase > 1 ? Math.PI : 0);
        c.legs[0].rotation.x = Math.sin(t * 10 + c.id) * 0.45;
        c.legs[1].rotation.x = -c.legs[0].rotation.x;
      }
      for (const w of witches)
        for (const c of citizens) {
          if (!c.alive) continue;
          if (
            Math.hypot(
              c.g.position.x - w.g.position.x,
              c.g.position.z - w.g.position.z,
            ) < 0.045
          ) {
            c.alive = false;
            c.g.visible = false;
            c.respawn = t + 3;
            deaths++;
          }
        }
    },
    stats: () => ({
      emeraldCitadels: plan?.citadels.length || 0,
      emeraldSkyways: plan?.skyways.length || 0,
      emeraldGroves: plan?.groves.length || 0,
      emeraldRoads: roads.length,
      emeraldBridges: roads.filter((r) => r.bridge).length,
      emeraldCitizens: citizens.filter((c) => c.alive).length,
      emeraldWitches: witches.length,
      emeraldGuardians: guardians.length,
      emeraldWitchKills: deaths,
      emeraldRainbowOpacity: rainbowMaterial.uniforms.fade.value,
      emeraldAnimationTime: time,
    }),
    dispose() {
      clear();
      owned.forEach((x) => x.dispose());
      parent.remove(root);
    },
  };
}
