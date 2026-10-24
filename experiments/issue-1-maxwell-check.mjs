import { FDTD1D, FDTD2D } from '../src/physics/maxwell.js';
// Fresnel: vacuum -> n=2
const f = new FDTD1D({
  cells: 1600,
  courant: 0.5,
  permittivity: (i) => (i >= 800 ? 4 : 1),
});
f.setPulse({ center: 400, width: 25 });
const e0 = f.energy();
f.step(1200); // pulse travels 600 cells: hits interface at t=400
let refl = 0,
  trans = 0;
for (let i = 0; i < 800; i++) {
  if (Math.abs(f.ez[i]) > Math.abs(refl)) {
    refl = f.ez[i];
  }
}
for (let i = 800; i < 1600; i++) {
  if (Math.abs(f.ez[i]) > Math.abs(trans)) {
    trans = f.ez[i];
  }
}
console.log('r', refl, -1 / 3, 't', trans, 2 / 3, 'energy', f.energy() / e0);
// speed
const v = new FDTD1D({ cells: 1200 });
v.setPulse({ center: 200, width: 20 });
v.step(1000);
let peak = 0;
for (let i = 0; i < 1200; i++) {
  if (v.ez[i] > v.ez[peak]) {
    peak = i;
  }
}
console.log('speed', (peak - 200) / v.time);
// absorb
const a = new FDTD1D({ cells: 800 });
a.setPulse({ center: 400, width: 20 });
const ea = a.energy();
a.step(3000);
console.log('residual energy after absorption', a.energy() / ea);
console.time('2d');
const n = 240;
const g = new FDTD2D({ nx: n, ny: n, courant: 0.5, absorbingCells: 30 });
const omega = (2 * Math.PI) / 20;
g.addDipole({
  i: n / 2,
  j: n / 2,
  axis: 'x',
  current: (t) => Math.sin(omega * t) * (1 - Math.exp(-t / 30)),
});
g.step(600);
const R = 70;
const acc = { 0: 0, 45: 0, 90: 0 };
for (let s = 0; s < 80; s++) {
  g.step(1);
  for (const deg of [0, 45, 90]) {
    let tot = 0;
    for (const mirrored of [deg, 180 - deg, 180 + deg, 360 - deg]) {
      const ang = (mirrored * Math.PI) / 180;
      const val = g.sampleHz(
        n / 2 + 0.5 + R * Math.cos(ang),
        n / 2 + 0.5 + R * Math.sin(ang)
      );
      tot += val * val;
    }
    acc[deg] += tot;
  }
}
console.timeEnd('2d');
console.log(acc, 'I90/I45', acc[90] / acc[45], 'I0/I90', acc[0] / acc[90]);
