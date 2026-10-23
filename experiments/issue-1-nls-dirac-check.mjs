import { NonlinearSchrodinger1D } from '../src/physics/nls.js';
import { Dirac1D, dominantFrequency } from '../src/physics/dirac.js';

const nls = new NonlinearSchrodinger1D({ n: 1024, xMin: -40, xMax: 40 });
const sol = { eta: 1, velocity: 0.5, x0: -10 };
nls.setSolitons([sol]);
const e0 = nls.energy();
nls.step(0.01, 2000);
console.log(
  'soliton err',
  nls.solitonError(sol),
  'norm',
  nls.norm(),
  'E drift',
  nls.energy() - e0,
  e0
);

const col = new NonlinearSchrodinger1D({ n: 2048, xMin: -60, xMax: 60 });
col.setSolitons([
  { eta: 1, velocity: 1, x0: -15 },
  { eta: 1.2, velocity: -1, x0: 15 },
]);
col.step(0.01, 3000);
let maxL = 0,
  maxR = 0;
for (let i = 0; i < col.n; i++) {
  const a = Math.hypot(col.re[i], col.im[i]);
  if (col.x[i] < 0) {
    maxL = Math.max(maxL, a);
  } else {
    maxR = Math.max(maxR, a);
  }
}
console.log('collision peaks', maxL, maxR);

const d = new Dirac1D({ n: 2048, xMin: -200, xMax: 200 });
d.setGaussian({ sigma: 10, k0: 1, branch: 'positive' });
const x0 = d.expectationX();
d.step(0.05, 400);
console.log(
  'Dirac vg',
  (d.expectationX() - x0) / d.time,
  1 / Math.SQRT2,
  'norm',
  d.norm()
);

const z = new Dirac1D({ n: 2048, xMin: -200, xMax: 200 });
z.setGaussian({ sigma: 10, k0: 1, branch: 'upper' });
const samples = [];
const dt = 0.05;
for (let i = 0; i < 400; i++) {
  samples.push(z.expectationX());
  z.step(dt);
}
console.log(
  'ZB omega',
  dominantFrequency(samples, dt, { minOmega: 1, maxOmega: 6 }),
  2 * Math.SQRT2,
  'amp',
  Math.max(...samples) - Math.min(...samples)
);
