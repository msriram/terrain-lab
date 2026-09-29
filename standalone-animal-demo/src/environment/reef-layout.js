import { seededRandom } from "../simulation/world.js";
import { reefGrowth } from "./reef-growth.js";

// Reefs need their own full-field scan: generic prop sites omit tall peaks
// and can miss a newly sculpted mound between their randomly selected points.
export function findReefSites(sample, seed = 31, count = 25) {
  const raised = [];
  for (let y = 1; y < 40; y++) for (let x = 1; x < 52; x++) {
    const u = x / 52, v = y / 40, growth = reefGrowth(sample, u, v);
    if (growth > .025) raised.push({u, v, growth});
  }
  return clusteredReefSites(raised, seed, Math.ceil(count / 5)).slice(0, count)
    .map(site => reefGrowth(sample, site.u, site.v) > .025 ? site :
      {...site, u: site.centerU, v: site.centerV});
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
