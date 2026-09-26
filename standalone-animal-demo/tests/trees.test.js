import { test } from "node:test";
import assert from "node:assert/strict";
import { createPropFactory } from "../src/environment/props.js";

test("tree variants are deterministic, varied, batched and wind animated", () => {
  const factory = createPropFactory();
  const colors = ["#4e8050", "#8caf67", "#d3a969"];
  for (const kind of ["tree", "snowpine", "palm"]) {
    const a = factory.build(kind, colors, 1);
    const b = factory.build(kind, colors, 2);
    const again = factory.build(kind, colors, 1);
    assert.notEqual(a, again);
    assert.equal(a.children[0].geometry, again.children[0].geometry);
    assert.ok(a.children.length <= 4);
    if (kind !== "palm")
      assert.notDeepEqual(a.children[0].geometry.attributes.position.array, b.children[0].geometry.attributes.position.array);
    const shader = { uniforms: {}, vertexShader: "#include <begin_vertex>" };
    a.children[0].material.onBeforeCompile(shader);
    assert.ok(shader.vertexShader.includes("heightWeight * heightWeight"));
    factory.setTime(7);
    assert.equal(shader.uniforms.windTime.value, 7);
  }
  factory.dispose();
});
