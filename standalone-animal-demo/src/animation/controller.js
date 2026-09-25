import * as THREE from "three";
import { SPECIES } from "../catalog/species.js";
/** Cross-faded GLB clips plus additive whole-body gestures and water effects. */
export function createAnimationController(model, animations, speciesId, phase) {
  const mixer = new THREE.AnimationMixer(model),
    clips = Object.fromEntries(
      animations.map((clip) => [clip.name, mixer.clipAction(clip)]),
    );
  const species = SPECIES[speciesId];
  let current = null;
  return {
    update(c, dt, root, shadow, ripple, time) {
      const mode = c.mode;
      const specific = {
        graze: "Graze",
        nibble: "Nibble",
        howl: "Howl",
        look: "Alert",
      }[mode];
      const name =
        (specific && clips[specific] ? specific : null) ||
        species.actions[mode] ||
        (c.moving ? species.actions.move : species.actions.idle);
      const action = clips[name] || Object.values(clips)[0];
      if (action !== current) {
        current?.fadeOut(0.22);
        action?.reset().fadeIn(0.22).play();
        if (!current && action) action.time = phase;
        current = action;
      }
      if (current)
        current.setEffectiveTimeScale(
          mode === "flee" ? 1.7 : mode === "chase" ? 1.25 : 1,
        );
      mixer.update(c.held ? 0 : dt);
      root.scale.setScalar(1);
      root.rotation.x = 0;
      root.rotation.z = 0;
      const t = c.actionAge;
      if (mode === "dive") {
        const depth = Math.sin(Math.min(1, t / c.actionDuration) * Math.PI);
        root.position.y -= depth * 0.08;
        root.scale.setScalar(1 - depth * 0.12);
        root.rotation.x = depth * 0.24;
      }
      if (mode === "shake") {
        root.rotation.z =
          Math.sin(t * 30) *
          0.12 *
          Math.sin(Math.min(1, t / c.actionDuration) * Math.PI);
        root.rotation.y += Math.sin(t * 25) * 0.07;
      }
      if (mode === "sniff") root.rotation.x = 0.09 * Math.sin(t * 5);
      if (mode === "breach") {
        const progress = Math.min(1, t / c.actionDuration),
          height = Math.sin(progress * Math.PI) * 0.22;
        root.position.y += height;
        root.rotation.x = -Math.sin(progress * Math.PI * 2) * 0.65;
        shadow.scale.setScalar(1 + height * 1.8);
        shadow.material.opacity = 0.32 - height * 0.7;
        ripple.visible = c.active;
        const r = 0.08 + 0.32 * progress;
        ripple.scale.set(r, 1, r);
        ripple.material.opacity = 0.6 * (1 - progress);
      } else {
        shadow.scale.setScalar(1);
        shadow.material.opacity = c.habitat === "land" ? 0.5 : 0.3;
        // Subtle persistent wake for swimming, and bobbing with a separate ground shadow.
        ripple.visible = c.active && c.habitat === "water" && mode === "chase";
        const r = 0.11 + ((time + phase) % 0.65) * 0.3;
        ripple.scale.set(r, 1, r);
        ripple.material.opacity = 0.24;
        if (c.habitat === "water")
          root.position.y += 0.008 * Math.sin(time * 3 + phase);
      }
      if (c.held || c.protection > 0) {
        ripple.visible = c.active;
        ripple.scale.set(0.16, 1, 0.16);
        ripple.material.opacity = 0.7;
        ripple.material.color.set(c.held ? 0xe7f4a5 : 0x93e7a9);
      } else ripple.material.color.set(0xc1f5e7);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    },
  };
}
