import { initAnalytics } from "./client.js";

const mode = new URLSearchParams(location.search).has("projection") ? "projector"
  : location.pathname.includes("/sandbox/") ? "sandbox"
  : location.pathname.includes("/guide/") ? "guide"
  : location.pathname.includes("/contribute/") ? "contribute" : "home";
initAnalytics(mode);
