import "./style.css";
import { LANDSCAPES, rosterForWorld } from "./catalog/landscapes.js";
import { bindAnimalInteraction } from "./interaction/drag.js";
import { SPECIES, randomRoster, PRESETS } from "./catalog/species.js";
import { createAnimalLayer } from "./rendering/animal-layer.js";
import { createTerrain, paintTerrain, FIXTURES } from "./terrain/fixtures.js";
const $ = (id) => document.getElementById(id);
const state = {
  fixture: 0,
  water: 0.43,
  pack: "earth",
  paused: false,
  roster: randomRoster(),
};
let sample = createTerrain();
const terrain = $("terrain"),
  stage = $("stage");
const paint = () => paintTerrain(terrain, sample, state.water, state.pack);
paint();
try {
  const layer = await createAnimalLayer({
    canvas: $("animals"),
    sampleTerrain: sample,
    waterLevel: state.water,
    roster: state.roster,
    assetBase: import.meta.env.BASE_URL + "assets/animals/",
  });
  $("loading").hidden = true;
  const unbind = bindAnimalInteraction({
    element: $("animals"),
    layer,
    enabled: () => $("enabled").checked,
    onMessage: (text) => ($("rescue-message").textContent = text),
  });
  $("shuffle").addEventListener("click", () => {
    state.roster = rosterForWorld(state.pack, randomRoster());
    $("preset").value = "random";
    layer.setRoster(state.roster);
    rebuildRoster();
  });
  const labels = $("behavior-labels");
  function setLandscape(theme) {
    const was = state.pack;
    state.pack = theme;
    if (theme !== was) {
      state.roster = rosterForWorld(theme, randomRoster());
      layer.setRoster(state.roster);
      rebuildRoster();
    }
    const wet = !!LANDSCAPES[theme].underwater;
    layer.setOptions({ theme, pack: wet ? "atlantis" : "earth" });
    paint();
    $("landscape").value = theme;
    $("pack-note").textContent = LANDSCAPES[theme].caption;
    document.querySelectorAll("[data-pack]").forEach((b) => {
      const chosen = wet
        ? b.dataset.pack === "atlantis"
        : b.dataset.pack === "earth";
      b.classList.toggle("selected", chosen);
      b.setAttribute("aria-pressed", String(chosen));
    });
  }
  Object.entries(LANDSCAPES).forEach(([id, recipe]) =>
    $("landscape").add(new Option(recipe.label, id)),
  );
  const requestedWorld = new URLSearchParams(location.search).get("theme");
  if (requestedWorld && LANDSCAPES[requestedWorld])
    setLandscape(requestedWorld);
  $("landscape").addEventListener("change", (e) =>
    setLandscape(e.target.value),
  );
  $("scenery").addEventListener("change", (e) =>
    layer.setOptions({ scenery: e.target.checked }),
  );
  $("atmosphere").addEventListener("change", (e) =>
    layer.setOptions({ atmosphere: e.target.checked }),
  );
  function rebuildRoster() {
    $("roster").replaceChildren();
    labels.replaceChildren();
    $("encounter").textContent = "Watching for nearby encounters…";
    state.roster.forEach((id, index) => {
      const row = document.createElement("label");
      row.className = "roster-row";
      const name = document.createElement("span");
      name.textContent = String(index + 1).padStart(2, "0");
      row.append(name);
      const select = document.createElement("select");
      select.setAttribute("aria-label", `Animal slot ${index + 1}`);
      Object.entries(SPECIES).forEach(([key, species]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = `${species.label} · ${species.habitat}`;
        select.append(option);
      });
      select.value = id;
      select.addEventListener("change", () => {
        state.roster[index] = select.value;
        $("preset").value = "custom";
        layer.setRoster(state.roster);
        rebuildRoster();
      });
      row.append(select);
      $("roster").append(row);
      const tag = document.createElement("span");
      tag.className = "behavior-tag";
      labels.append(tag);
    });
    const land = state.roster.filter(
      (id) => SPECIES[id].habitat === "land",
    ).length;
    $("population").innerHTML =
      `<i class="key land"></i> ${land} LAND <i class="key water"></i> ${state.roster.length - land} WATER`;
  }
  rebuildRoster();
  $("preset").addEventListener("change", (e) => {
    state.roster =
      e.target.value === "random"
        ? rosterForWorld(state.pack, randomRoster())
        : [...PRESETS[e.target.value].roster];
    layer.setRoster(state.roster);
    rebuildRoster();
  });
  $("stir").addEventListener("click", () => {
    if (state.paused) $("pause").click();
    layer.stir();
  });
  $("labels").addEventListener(
    "change",
    (e) => (labels.hidden = !e.target.checked),
  );
  const resize = new ResizeObserver(() => {
    const r = stage.getBoundingClientRect();
    layer.resize(r.width, r.height);
  });
  resize.observe(stage);
  const refresh = () => {
    sample = createTerrain(state.fixture);
    layer.setTerrain(sample, state.water);
    paint();
  };
  $("fixture").addEventListener("change", (e) => {
    state.fixture = Number(e.target.value);
    $("map-title").textContent = FIXTURES[state.fixture].toUpperCase();
    refresh();
  });
  $("water").addEventListener("input", (e) => {
    state.water = Number(e.target.value) / 100;
    $("water-value").value = e.target.value + "%";
    refresh();
  });
  document.querySelectorAll("[data-pack]").forEach((button) =>
    button.addEventListener("click", () => {
      setLandscape(button.dataset.pack);
    }),
  );
  $("transparent").addEventListener("change", (e) =>
    layer.setOptions({ transparent: e.target.checked }),
  );
  $("terrain-visible").addEventListener(
    "change",
    (e) => (terrain.style.visibility = e.target.checked ? "visible" : "hidden"),
  );
  $("enabled").addEventListener("change", (e) =>
    layer.setOptions({ enabled: e.target.checked }),
  );
  $("pause").addEventListener("click", () => {
    state.paused = !state.paused;
    layer.setOptions({ paused: state.paused });
    $("pause").textContent = state.paused ? "Resume motion" : "Pause motion";
  });
  function projection(on) {
    document.body.classList.toggle("projection", on);
  }
  $("project").addEventListener("click", () => projection(true));
  $("exit-projection").addEventListener("click", () => projection(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") projection(false);
    if (
      e.key.toLowerCase() === "f" &&
      !["INPUT", "SELECT"].includes(e.target.tagName)
    )
      projection(!document.body.classList.contains("projection"));
  });
  if (new URLSearchParams(location.search).has("projection")) projection(true);
  $("capture").addEventListener("click", () => {
    layer.update(0);
    const out = document.createElement("canvas");
    out.width = 1024;
    out.height = 768;
    const ctx = out.getContext("2d");
    if ($("terrain-visible").checked) ctx.drawImage(terrain, 0, 0, 1024, 768);
    ctx.drawImage($("animals"), 0, 0, 1024, 768);
    out.toBlob((blob) => {
      const a = document.createElement("a"),
        url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `terrain-lab-${state.pack}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  });
  let last = performance.now(),
    start = last,
    frames = 0,
    raf;
  const samples = [];
  const frame = (now) => {
    const dt = (now - last) / 1000;
    last = now;
    layer.update(dt);
    if (dt > 0 && dt < 0.2) {
      samples.push(dt);
      if (samples.length > 600) samples.shift();
    }
    frames++;
    layer.simulation.creatures.forEach((c, i) => {
      const tag = labels.children[i];
      if (!tag) return;
      tag.style.left = `${c.u * 100}%`;
      tag.style.top = `${c.v * 100}%`;
      tag.hidden = !c.active || !$("enabled").checked;
      tag.textContent = `${SPECIES[c.species].label} · ${c.mode}`;
      tag.dataset.mode = c.mode;
    });
    if (now - start > 750) {
      const stats = layer.getStats();
      $("fps").textContent = Math.round(
        samples.length / samples.reduce((a, b) => a + b, 0),
      );
      $("count").textContent = stats.active;
      $("pack-note").textContent = stats.landscape.erupting
        ? "Volcano active — lava and ash rising."
        : stats.landscape.caption;
      $("calls").textContent = stats.drawCalls;
      $("status").textContent = state.paused
        ? "MOTION PAUSED"
        : stats.active < state.roster.length
          ? `${stats.active} ACTIVE · ${stats.waiting} REPOPULATING`
          : "HABITATS IN BALANCE";
      const event = layer.simulation.events[0];
      $("encounter").textContent = event
        ? `${SPECIES[event.predator].label} → ${SPECIES[event.prey].label} · ${event.type === "capture" ? "eaten; repopulating soon" : "pursuit"}`
        : "Watching for nearby encounters…";
      start = now;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  // Explicit read-only diagnostic surface for local acceptance checks.
  window.animalDemo = {
    layer,
    state,
    getMetrics: () => ({
      ...layer.getStats(),
      frames,
      averageFPS: samples.length / samples.reduce((a, b) => a + b, 0),
      resolution: [$("animals").width, $("animals").height],
    }),
  };
  window.addEventListener(
    "pagehide",
    () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      unbind();
      layer.dispose();
    },
    { once: true },
  );
} catch (error) {
  $("loading").textContent = error.message;
  console.error(error);
}
