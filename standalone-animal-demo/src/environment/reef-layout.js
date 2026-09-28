import { seededRandom } from "../simulation/world.js";

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
