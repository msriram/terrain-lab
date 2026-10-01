import { seededRandom } from "../simulation/world.js";
import { reefGrowth } from "./reef-growth.js";

// Reefs need their own full-field scan: generic prop sites omit tall peaks
// and can miss a newly sculpted mound between their randomly selected points.
export function findReefSites(sample, seed = 31, count = 48, water = 0.43) {
  const raised = [];
  for (let y = 1; y < 54; y++) for (let x = 1; x < 72; x++) {
    const u = x / 72, v = y / 54, growth = reefGrowth(sample, u, v, water);
    if (growth > .035) raised.push({u, v, growth});
  }
  if (!raised.length || count <= 0) return [];
  const phase = p => {
    const value = Math.sin(p.u * 179.3 + p.v * 451.7 + seed) * 43758.5453;
    return value - Math.floor(value);
  };
  raised.sort((a, b) => b.growth - a.growth || phase(a) - phase(b));
  const centers = [];
  for (const site of raised) {
    if (centers.every(other => Math.hypot(site.u - other.u, site.v - other.v) > .09))
      centers.push(site);
    if (centers.length >= Math.ceil(count / 6)) break;
  }
  const sites = [];
  const add = (site, center, cluster) => {
    if (sites.some(other => Math.hypot(site.u - other.u, site.v - other.v) < .014)) return;
    sites.push({ ...site, centerU: center.u, centerV: center.v,
      cluster, phase: phase(site) * Math.PI * 2 });
  };
  const quota = Math.ceil(count / centers.length);
  centers.forEach((center, cluster) => {
    const nearby = raised.filter(site => Math.hypot(site.u - center.u, site.v - center.v) < .085)
      .sort((a, b) => Math.hypot(a.u - center.u, a.v - center.v) -
        Math.hypot(b.u - center.u, b.v - center.v) + (phase(a) - phase(b)) * .035);
    let placed = 0;
    for (const site of nearby) {
      const before = sites.length;
      add(site, center, cluster);
      if (sites.length > before) placed++;
      if (placed >= quota || sites.length >= count) break;
    }
  });
  for (const site of raised) {
    if (sites.length >= count) break;
    const closest = centers.reduce((best, center, i) =>
      Math.hypot(site.u - center.u, site.v - center.v) < best.distance
        ? { center, i, distance: Math.hypot(site.u - center.u, site.v - center.v) }
        : best, { center: centers[0], i: 0, distance: Infinity });
    add(site, closest.center, closest.i);
  }
  return sites.slice(0, count);
}

/** Twenty-five small colonies form five irregular groups on raised sand. */
export function clusteredReefSites(raisedLand, seed = 31, clusters = 5) {
  if (!raisedLand.length) return [];
  const rng = seededRandom(seed);
  const sorted = [...raisedLand].sort((a, b) => (b.growth ?? b.h) - (a.growth ?? a.h));
  const centers = [];
  for (const p of sorted)
    if (centers.every((q) => Math.hypot(p.u - q.u, p.v - q.v) > .15)) {
      centers.push(p);
      if (centers.length === 5) break;
    }
  for (const p of sorted) {
    if (centers.length === 5) break;
    if (!centers.includes(p)) centers.push(p);
  }
  const sites = [];
  for (let cluster = 0; cluster < clusters; cluster++) {
    const center = centers[cluster % centers.length];
    for (let member = 0; member < 5; member++) {
      const angle = member * 2.399 + cluster * 1.73 + (rng() - .5) * .8;
      const radius = member === 0 ? 0 : .02 + rng() * .04;
      sites.push({
        u: Math.max(.035, Math.min(.965, center.u + Math.cos(angle) * radius)),
        v: Math.max(.035, Math.min(.965, center.v + Math.sin(angle) * radius * 1.3)),
        centerU: center.u,
        centerV: center.v,
        cluster,
        phase: rng() * Math.PI * 2,
      });
    }
  }
  return sites;
}
