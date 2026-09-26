import * as T from "three";
import { LavaFlow } from "./flow.js";
import { seededRandom } from "../simulation/world.js";

export function createLivingEffects(root) {
  const flow = new LavaFlow(),
    canvas = document.createElement("canvas");
  canvas.width = flow.width;
  canvas.height = flow.height;
  const ctx = canvas.getContext("2d"),
    pixels = ctx.createImageData(canvas.width, canvas.height);
  const texture = new T.CanvasTexture(canvas);
  const plane = new T.PlaneGeometry(4, 3);
  plane.rotateX(-Math.PI / 2);
  const lavaMaterial = new T.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const lava = new T.Mesh(plane, lavaMaterial);
  lava.position.y = 0.025;
  root.add(lava);
  const cloudMaterial = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      time: { value: 0 },
      density: { value: 0.55 },
      shadow: { value: 0 },
    },
    vertexShader:
      "varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec2 p;uniform float time;uniform float density;uniform float shadow;
    float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    float fbm(vec2 q){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(q);q=q*2.03+7.1;a*=.5;}return v;}
    void main(){vec2 q=p*vec2(5.,4.)+vec2(-time*.025,time*.009);vec2 warp=vec2(fbm(q+time*.035),fbm(q+13.-time*.027));float n=fbm(q+warp*2.);float body=smoothstep(.46,.73,n);float detail=fbm(q*3.+warp);float edge=smoothstep(0.,.09,p.x)*smoothstep(0.,.09,1.-p.x)*smoothstep(0.,.09,p.y)*smoothstep(0.,.09,1.-p.y);vec3 col=mix(vec3(.48,.57,.65),vec3(1.),detail);gl_FragColor=vec4(mix(col,vec3(.08,.12,.18),shadow),body*density*edge);}`,
  });
  const clouds = new T.Mesh(plane, cloudMaterial);
  clouds.position.y = 0.8;
  root.add(clouds);
  const shadowMaterial = cloudMaterial.clone();
  shadowMaterial.uniforms.shadow.value = 1;
  const shadow = new T.Mesh(plane, shadowMaterial);
  shadow.position.set(0.1, 0.018, 0.1);
  root.add(shadow);
  const rng = seededRandom(191),
    agents = Array.from({ length: 96 }, () => ({
      u: rng(),
      v: rng(),
      a: rng() * 6.28,
      s: 0.025 + rng() * 0.018,
    }));
  const geometry = new T.BufferGeometry();
  geometry.setAttribute(
    "position",
    new T.BufferAttribute(new Float32Array(96 * 18), 3),
  );
  const material = new T.MeshBasicMaterial({
    color: 0xd8f4ed,
    side: T.DoubleSide,
  });
  const flock = new T.Mesh(geometry, material);
  flock.frustumCulled = false;
  root.add(flock);
  let clock = 0,
    acc = 0,
    theme = "",
    sample = () => 0,
    water = 0.43,
    peaks = [],
    underwater = false;
  function stepSchool(dt, fish) {
    const next = agents.map((a) => ({ ...a }));
    agents.forEach((a, i) => {
      let ax = 0,
        ay = 0,
        cx = 0,
        cy = 0,
        n = 0;
      agents.forEach((b, j) => {
        if (i === j) return;
        const dx = b.u - a.u,
          dy = b.v - a.v,
          d = Math.hypot(dx, dy);
        if (d < 0.15) {
          ax += Math.cos(b.a);
          ay += Math.sin(b.a);
          cx += dx;
          cy += dy;
          n++;
          if (d < 0.025) {
            ax -= (dx / (d * d + 0.0001)) * 0.09;
            ay -= (dy / (d * d + 0.0001)) * 0.09;
          }
        }
      });
      ax += Math.cos(a.a) * 2 + Math.sin(clock * 0.3 + i * 0.37) * 0.25;
      ay += Math.sin(a.a) * 2 + Math.cos(clock * 0.23 + i * 0.31) * 0.25;
      if (n) {
        ax += (cx / n) * 9;
        ay += (cy / n) * 9;
      }
      ax += a.u < 0.06 ? 2 : a.u > 0.94 ? -2 : 0;
      ay += a.v < 0.06 ? 2 : a.v > 0.94 ? -2 : 0;
      const angle = Math.atan2(ay, ax),
        turn = Math.atan2(Math.sin(angle - a.a), Math.cos(angle - a.a));
      const b = next[i];
      b.a = a.a + Math.max(-dt * 2, Math.min(dt * 2, turn));
      const u = a.u + Math.cos(b.a) * a.s * dt,
        v = a.v + Math.sin(b.a) * a.s * dt;
      const valid = (x, y) =>
        x > 0 &&
        x < 1 &&
        y > 0 &&
        y < 1 &&
        Number.isFinite(sample(x, y)) &&
        (!fish || underwater || sample(x, y) < water - 0.015);
      if (valid(u, v)) {
        b.u = u;
        b.v = v;
      } else b.a += dt * 5;
      if (fish && !valid(a.u, a.v)) {
        for (let k = 0; k < 20; k++) {
          const x = rng(),
            y = rng();
          if (valid(x, y)) {
            b.u = x;
            b.v = y;
            break;
          }
        }
      }
    });
    agents.splice(0, agents.length, ...next);
  }
  return {
    terrain(fn, level, vents) {
      sample = fn;
      water = level;
      peaks = vents;
      flow.setTerrain(fn, vents);
    },
    update(dt, world, recipe, motion) {
      if (theme !== world) {
        theme = world;
        flow.reset();
        acc = 0;
      }
      underwater = !!recipe.underwater;
      const fish = underwater,
        birds = ["earth", "forest", "tropical", "sakura"].includes(world);
      lava.visible = !!recipe.eruption;
      clouds.visible =
        !!recipe.clouds || ["clouds", "rain", "fog"].includes(recipe.weather);
      flock.visible = fish || birds;
      if (motion) {
        clock += Math.min(dt, 0.1);
        acc += Math.min(dt, 0.1);
        while (acc >= 1 / 30) {
          if (lava.visible) flow.step(1 / 30);
          if (flock.visible) stepSchool(1 / 30, fish);
          acc -= 1 / 30;
        }
      }
      cloudMaterial.uniforms.time.value = clock;
      cloudMaterial.uniforms.density.value =
        recipe.weather === "fog" ? 0.35 : 0.65;
      shadow.visible = clouds.visible;
      shadowMaterial.uniforms.time.value = clock;
      shadowMaterial.uniforms.density.value = 0.22;
      if (lava.visible) {
        for (let i = 0; i < flow.mass.length; i++) {
          const h = flow.heat[i],
            m = flow.mass[i],
            j = i * 4;
          pixels.data[j] = 45 + 210 * h;
          pixels.data[j + 1] = 20 + 180 * h * h * h;
          pixels.data[j + 2] = 15 + 50 * h ** 8;
          pixels.data[j + 3] = Math.min(245, m * 32000);
        }
        ctx.putImageData(pixels, 0, 0);
        texture.needsUpdate = true;
      }
      if (flock.visible) {
        material.color.set(fish ? 0xb6ede1 : 0x24313a);
        const arr = geometry.attributes.position.array;
        agents.forEach((a, i) => {
          const x = (a.u - 0.5) * 4,
            z = (a.v - 0.5) * 3,
            y = fish ? 0.09 : 0.4,
            sz = fish ? 0.018 : 0.028,
            flap = Math.sin(clock * (fish ? 13 : 9) + i) * sz * 0.6;
          const shape = fish
            ? [
                [sz, 0],
                [0, sz * 0.4],
                [-sz, 0],
                [-sz, -sz * 0.65],
                [-sz * 0.5, 0],
                [-sz, sz * 0.65],
              ]
            : [
                [0, 0],
                [-sz, sz + flap],
                [sz * 0.2, sz * 0.3],
                [0, 0],
                [-sz, -sz - flap],
                [sz * 0.2, -sz * 0.3],
              ];
          shape.forEach(([px, pz], k) =>
            arr.set(
              [
                x + px * Math.cos(a.a) - pz * Math.sin(a.a),
                y,
                z + px * Math.sin(a.a) + pz * Math.cos(a.a),
              ],
              i * 18 + k * 3,
            ),
          );
        });
        geometry.setDrawRange(0, (fish ? 96 : 32) * 6);
        geometry.attributes.position.needsUpdate = true;
      }
    },
    stats: () => ({
      lavaCells: flow.mass.reduce((n, v) => n + (v > 0.0001), 0),
      flockCount: flock.visible ? (underwater ? 96 : 32) : 0,
      clouds: clouds.visible,
    }),
    dispose() {
      root.remove(lava, clouds, shadow, flock);
      plane.dispose();
      texture.dispose();
      lavaMaterial.dispose();
      cloudMaterial.dispose();
      shadowMaterial.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
