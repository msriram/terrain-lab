import { seededRandom } from "../simulation/world.js";

// Positions and headings use scene-space units, avoiding stretched UV turns.
export class BirdFlight {
  constructor(seed = 291) {
    this.random = seededRandom(seed);
    this.time = 0;
    this.target = { x: .6, z: .3 };
    this.retarget = 0;
    this.birds = Array.from({ length: 100 }, () => {
      const a = this.random() * Math.PI * 2, r = Math.sqrt(this.random()) * .28;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, a: 0 };
    });
    this.formation = [];
    this.startPass();
  }
  startPass() {
    this.passAge = 0;
    this.heading = this.random() * Math.PI * 2;
    this.offset = (this.random() - .5) * .65;
    this.formation = Array.from({length: 13}, () => ({x:0,z:0,a:this.heading}));
    this.placeFormation();
  }
  placeFormation() {
    const dx = Math.cos(this.heading), dz = Math.sin(this.heading);
    const progress = -3.3 + this.passAge * .28;
    this.formation.forEach((b, i) => {
      const rank = Math.ceil(i / 2), side = i === 0 ? 0 : i % 2 ? -1 : 1;
      const along = progress - rank * .105, across = this.offset + side * rank * .12;
      b.x = dx * along - dz * across;
      b.z = dz * along + dx * across;
      b.a = this.heading;
    });
  }
  step(dt) {
    dt = Math.max(0, Math.min(.05, dt));
    this.time += dt; this.passAge += dt;
    // Entire trailing wing clears the viewport before the next pass begins.
    if (this.passAge > 32) this.startPass();
    this.placeFormation();
    if (this.time >= this.retarget) {
      this.target = { x: (this.random() - .5) * 2.6, z: (this.random() - .5) * 1.7 };
      this.retarget = this.time + 6 + this.random() * 4;
    }
    const next = this.birds.map(b => ({...b}));
    this.birds.forEach((b,i) => {
      let cx=0,cz=0,vx=0,vz=0,sx=0,sz=0,n=0;
      for (const other of this.birds) {
        if (b === other) continue;
        const x=other.x-b.x,z=other.z-b.z,d=Math.hypot(x,z);
        if (d < .5) {
          cx+=x;cz+=z;vx+=Math.cos(other.a);vz+=Math.sin(other.a);n++;
          if (d < .045) {sx-=x/(d*d+.0001);sz-=z/(d*d+.0001);}
        }
      }
      const x=(this.target.x-b.x)*.65+(n ? cx/n*3+vx/n*.55 : 0)+sx*.006;
      const z=(this.target.z-b.z)*.65+(n ? cz/n*3+vz/n*.55 : 0)+sz*.006;
      const desired=Math.atan2(z,x);
      const turn=Math.atan2(Math.sin(desired-b.a),Math.cos(desired-b.a));
      const a=b.a+Math.max(-dt*1.5,Math.min(dt*1.5,turn));
      next[i]={x:b.x+Math.cos(a)*.18*dt,z:b.z+Math.sin(a)*.18*dt,a};
    });
    this.birds=next;
  }
}
