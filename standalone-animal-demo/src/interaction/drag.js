/** Pointer/touch rescue interaction shared by the demo and real sandbox. */
export function bindAnimalInteraction({
  element,
  layer,
  toUV,
  enabled = () => true,
  onMessage = () => {},
}) {
  let selected = null,
    pointer = null;
  const uv = (event) => {
    if (toUV) return toUV(event);
    const rect = element.getBoundingClientRect();
    return {
      u: (event.clientX - rect.left) / rect.width,
      v: (event.clientY - rect.top) / rect.height,
    };
  };
  const down = (event) => {
    if (!enabled() || event.button > 0 || selected !== null) return;
    const p = uv(event);
    const candidates = layer.simulation.creatures
      .filter((c) => c.active)
      .map((c) => ({ c, d: Math.hypot(c.u - p.u, (c.v - p.v) * 0.75) }))
      .filter(({ c, d }) => d < Math.max(c.radius, 0.035))
      .sort((a, b) => a.d - b.d);
    if (!candidates.length) return;
    const c = candidates[0].c;
    if (!layer.simulation.grab(c.id)) return;
    selected = c.id;
    pointer = event.pointerId;
    element.setPointerCapture(pointer);
    element.style.cursor = "grabbing";
    event.preventDefault();
    onMessage(
      `Move to safe ${c.habitat === "water" ? "water" : "land"}; release to rescue.`,
    );
  };
  const move = (event) => {
    if (selected === null) return;
    const p = uv(event),
      valid = layer.simulation.move(selected, p.u, p.v);
    element.style.cursor = valid ? "grabbing" : "not-allowed";
    onMessage(
      valid
        ? "Safe habitat — release here."
        : "Wrong habitat or too close to shore. Try another spot.",
    );
    event.preventDefault();
  };
  const finish = () => {
    if (selected === null) return;
    layer.simulation.release(selected);
    if (element.hasPointerCapture(pointer))
      element.releasePointerCapture(pointer);
    selected = pointer = null;
    element.style.cursor = "grab";
    onMessage("Rescued — protected for 3 seconds.");
  };
  element.style.touchAction = "none";
  element.style.cursor = "grab";
  element.addEventListener("pointerdown", down);
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", finish);
  element.addEventListener("pointercancel", finish);
  element.addEventListener("lostpointercapture", finish);
  return () => {
    finish();
    element.removeEventListener("pointerdown", down);
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", finish);
    element.removeEventListener("pointercancel", finish);
    element.removeEventListener("lostpointercapture", finish);
  };
}
