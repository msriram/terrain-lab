// Deterministic, terrain-driven site plans shared by the browser and sandbox renderers.
const finite = (value) => Number.isFinite(value) && value >= 0;
const hash = (x, y, seed) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 0.017) * 43758.5453;
  return value - Math.floor(value);
};
const distance = (a, b) => Math.hypot((a.u - b.u) * 4, (a.v - b.v) * 3);
function candidates(sample, water, seed, minRise) {
  const points = [];
  for (let y = 2; y < 23; y++) for (let x = 2; x < 31; x++) {
    const u = x / 32, v = y / 24, h = sample(u, v);
    if (!finite(h) || h < water + minRise) continue;
    const neighbors = [sample(u - .025, v), sample(u + .025, v), sample(u, v - .033), sample(u, v + .033)];
    const slope = neighbors.every(finite) ? Math.max(...neighbors) - Math.min(...neighbors) : 1;
    if (slope > .23) continue;
    points.push({u, v, h, phase: hash(x, y, seed) * Math.PI * 2,
      score: h * .2 + hash(x, y, seed + 31) * .8 - slope * .15});
  }
  return points.sort((a, b) => b.score - a.score);
}
function select(points, count, gap) {
  const result = [];
  for (const point of points) {
    if (result.length >= count) break;
    if (result.every(other => distance(point, other) > gap)) result.push(point);
  }
  return result;
}
function connect(sites, maxDistance, maxDegree = 2) {
  const links = [], degree = sites.map(() => 0);
  const candidates = [];
  for (let i = 0; i < sites.length; i++) for (let j = i + 1; j < sites.length; j++) {
    const d = distance(sites[i], sites[j]);
    if (d < maxDistance) candidates.push({i, j, d});
  }
  candidates.sort((a, b) => a.d - b.d);
  for (const link of candidates) {
    if (degree[link.i] >= maxDegree || degree[link.j] >= maxDegree) continue;
    links.push(link); degree[link.i]++; degree[link.j]++;
  }
  return links;
}
export function planCopperWorks(sample, water, seed = 31, density = 1) {
  const stations = select(candidates(sample, water, seed, .055), Math.round(14 * density), .32)
    .map((point, i) => ({...point, radius: .095 + Math.max(0, point.h - water) * .10,
      height: .08 + Math.max(0, point.h - water) * .32, id: i}));
  const pipes = connect(stations, .83, 3).map(link=>({...link,bridge:false}));
  const crossings = [];
  for(let i=0;i<stations.length;i++)for(let j=i+1;j<stations.length;j++){
    const d=distance(stations[i],stations[j]);
    if(d<.65||d>2.1)continue;
    const mid=sample((stations[i].u+stations[j].u)/2,(stations[i].v+stations[j].v)/2);
    if(finite(mid)&&mid<water-.02)crossings.push({i,j,d,bridge:true});
  }
  crossings.sort((a,b)=>a.d-b.d);
  for(const link of crossings){
    if(pipes.filter(p=>p.bridge).length>=2)break;
    if(pipes.some(p=>p.bridge&&[p.i,p.j].some(id=>id===link.i||id===link.j)))continue;
    pipes.push(link);
  }
  const wheels = [];
  for (const station of stations) {
    const nearWater = [[.045,0],[-.045,0],[0,.06],[0,-.06]].some(([du,dv]) => {
      const h = sample(station.u + du, station.v + dv);
      return finite(h) && h < water;
    });
    if (nearWater) wheels.push(station.id);
  }
  return {stations, pipes, wheels};
}
export function planEmeraldCity(sample, water, seed = 31, density = 1) {
  const citadels = select(candidates(sample, water, seed + 103, .07), Math.round(8 * density), .53)
    .map((point, i) => ({...point, radius: .19 + Math.max(0, point.h - water) * .11,
      height: .13 + Math.max(0, point.h - water) * .42, id: i}));
  const skyways = connect(citadels, 1.32, 2).map(link=>({...link,bridge:false}));
  const crossings=[];
  for(let i=0;i<citadels.length;i++)for(let j=i+1;j<citadels.length;j++){
    const d=distance(citadels[i],citadels[j]);
    if(d<.8||d>2.3)continue;
    const mid=sample((citadels[i].u+citadels[j].u)/2,(citadels[i].v+citadels[j].v)/2);
    if(finite(mid)&&mid<water-.02)crossings.push({i,j,d,bridge:true});
  }
  crossings.sort((a,b)=>a.d-b.d);
  for(const link of crossings){
    if(skyways.filter(p=>p.bridge).length>=2)break;
    if(skyways.some(p=>p.bridge&&[p.i,p.j].some(id=>id===link.i||id===link.j)))continue;
    skyways.push(link);
  }
  const groves = select(candidates(sample, water, seed + 887, .035),Math.round(26*density),.18)
    .filter(p=>citadels.every(c=>distance(p,c)>c.radius*1.1));
  return {citadels, skyways, groves};
}
