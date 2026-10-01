import { ANALYTICS_ENDPOINT } from "./config.js";

const endpoint = ANALYTICS_ENDPOINT.replace(/\/$/, "");
const disabled = !endpoint || navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;
const bucketPopulation = (value) => value === 0 ? "0" : value <= 8 ? "1-8" : value <= 16 ? "9-16" : value <= 32 ? "17-32" : "33-64";
const bucketFps = (value) => value < 10 ? "under_10" : value < 20 ? "10-19" : value < 30 ? "20-29" : value < 40 ? "30-39" : value < 50 ? "40-49" : value < 60 ? "50-59" : "60_plus";
const bucketDuration = (seconds) => seconds < 30 ? "under_30s" : seconds < 60 ? "30-59s" : seconds < 120 ? "1-2m" : seconds < 300 ? "2-5m" : seconds < 600 ? "5-10m" : seconds < 1200 ? "10-20m" : "20m_plus";

export function initAnalytics(mode) {
  if (disabled) return { track() {} };
  const started = performance.now();
  const theme = () => document.querySelector("#landscape, #theme")?.value || new URLSearchParams(location.search).get("theme") || (mode === "browser" || mode === "sandbox" ? "earth" : "none");
  const track = (event, detail = "none", beacon = false) => {
    const payload = JSON.stringify({ mode, event, theme: String(theme()).slice(0, 32), detail });
    if (beacon && navigator.sendBeacon) navigator.sendBeacon(`${endpoint}/api/event`, new Blob([payload], { type: "text/plain" }));
    else fetch(`${endpoint}/api/event`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: payload, mode: "cors", keepalive: true }).catch(() => {});
  };
  track("page_view");
  addEventListener("pagehide", () => track("session_length", bucketDuration((performance.now() - started) / 1000), true), { once: true });
  const on = (selector, event, callback) => document.querySelector(selector)?.addEventListener(event, callback);
  on("#landscape, #theme", "change", () => track("world_change"));
  on("#animal-count", "change", () => track("population_change", bucketPopulation(Number(document.querySelector("#animal-count").value))));
  on("#randomize-landscape", "click", () => track("landscape_randomize"));
  on("#projector", "click", () => track("projector_opened"));
  on("#saveCalibration", "click", () => track("calibration_saved"));
  let editedAt = 0;
  on("#stage, .stage-card", "pointerdown", () => {
    const action = document.querySelector("#pointer-mode")?.value;
    if (action !== "sculpt" || performance.now() - editedAt < 10000) return;
    editedAt = performance.now();
    track("terrain_edit");
  });
  let lastCaptures = 0, lastRescues = 0, lastSensor = "";
  setInterval(() => {
    const simulation = window.animalDemo?.layer?.simulation || window.TerrainWildlife?.layer?.simulation;
    if (simulation) {
      for (let n = 0; n < Math.min(5, simulation.captures - lastCaptures); n++)
        track(simulation.events?.[0]?.type === "arrest" ? "arrest" : "capture");
      for (let n = 0; n < Math.min(5, simulation.rescues - lastRescues); n++) track("rescue");
      lastCaptures = simulation.captures;
      lastRescues = simulation.rescues;
    }
    if (mode === "sandbox") {
      const status = document.querySelector("#statusText")?.textContent || "";
      if (status !== lastSensor) {
        if (status === "Kinect live") track("kinect_connected");
        else if (status === "Connection lost") track("kinect_failed", "connection_lost");
        else if (status === "Start the local bridge") track("kinect_failed", "bridge_missing");
        else if (status === "Kinect unavailable") track("kinect_failed", "device_unavailable");
        else if (status === "Not connected" && lastSensor === "Kinect live") track("kinect_disconnected");
        lastSensor = status;
      }
    }
  }, 1000);
  if (mode === "sandbox" || mode === "browser") setInterval(() => {
    if (document.hidden) return;
    const value = Number.parseFloat(document.querySelector("#fps")?.value || document.querySelector("#fps")?.textContent);
    if (Number.isFinite(value) && value > 0) track("fps", bucketFps(value));
  }, 30000);
  window.TerrainAnalytics = { track };
  return { track };
}
