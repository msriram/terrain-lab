import * as THREE from "three";

/** Procedural alpha effects; no downloaded sprite textures or runtime URLs. */
export function createEffects() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(32, 32, 3, 32, 32, 32);
  gradient.addColorStop(0, "rgba(5,24,29,.5)");
  gradient.addColorStop(1, "rgba(5,24,29,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const shadowGeometry = new THREE.PlaneGeometry(1, 1);
  shadowGeometry.rotateX(-Math.PI / 2);
  const rippleGeometry = new THREE.RingGeometry(0.96, 1, 48);
  rippleGeometry.rotateX(-Math.PI / 2);
  return {
    create(length) {
      const shadow = new THREE.Group();
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        opacity: 0.5,
      });
      const mesh = new THREE.Mesh(shadowGeometry, material);
      mesh.scale.set(length * 0.7, 1, length);
      shadow.add(mesh);
      shadow.material = material;
      const ripple = new THREE.Mesh(
        rippleGeometry,
        new THREE.MeshBasicMaterial({
          color: 0xc1f5e7,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      ripple.visible = false;
      return { shadow, ripple };
    },
    dispose() {
      shadowGeometry.dispose();
      rippleGeometry.dispose();
      texture.dispose();
    },
  };
}
