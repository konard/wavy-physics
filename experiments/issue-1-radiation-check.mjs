import * as R from '../src/physics/radiation.js';
import { gaussLegendre } from '../src/physics/special-functions.js';
import * as H from '../src/physics/hydrogen.js';
import { AU } from '../src/physics/constants.js';
const traj = R.oscillatingCharge({ amplitude: 0.01, omega: 1 });
const q = gaussLegendre(24);
const period = 2 * Math.PI;
console.time('flux');
const flux = R.poyntingFlux(
  traj,
  { radius: 300, t: 1000, period, timeSamples: 8 },
  q
);
console.timeEnd('flux');
const larmor = R.larmorPower(0.01, {}) / 2; // time average of a² = A²ω⁴/2
console.log('flux', flux, 'larmor avg', larmor, flux / larmor);
// circular
const circ = R.circularCharge({ radius: 1, omega: 0.3 });
const fc = R.poyntingFlux(
  circ,
  { radius: 400, t: 2000, period: (2 * Math.PI) / 0.3, timeSamples: 4 },
  q
);
console.log(
  'circ',
  fc,
  R.lienardPower([0, 0.3, 0], [-0.09, 0, 0]),
  fc / R.lienardPower([0, 0.3, 0], [-0.09, 0, 0])
);
// hydrogen semiclassical
const inf = { nucleusMass: Infinity };
const sp = new H.HydrogenSuperposition(
  [
    { n: 1, l: 0, m: 0 },
    { n: 2, l: 1, m: 0 },
  ],
  inf
);
const omega = 0.375;
let avg = 0;
const N = 64;
const T = (2 * Math.PI) / omega;
const h = 1e-3;
for (let i = 0; i < N; i++) {
  const t = (T * i) / N;
  const a = [0, 1, 2].map(
    (k) =>
      (sp.expectationPosition(t + h)[k] -
        2 * sp.expectationPosition(t)[k] +
        sp.expectationPosition(t - h)[k]) /
      (h * h)
  );
  avg += R.larmorPower(a, { c: AU.c }) / N;
}
const A = H.einsteinA({ n: 2, l: 1 }, { n: 1, l: 0 }, inf) * AU.time;
console.log(
  'semi',
  avg,
  R.twoLevelEmission({ einsteinA: A, omega, upperPopulation: 0.5 })
);
