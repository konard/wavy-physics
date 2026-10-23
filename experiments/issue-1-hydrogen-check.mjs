import * as H from '../src/physics/hydrogen.js';
import { AU } from '../src/physics/constants.js';
const inf = { nucleusMass: Infinity };
console.log('A 2p-1s', H.einsteinA({ n: 2, l: 1 }, { n: 1, l: 0 }));
console.log('tau 2p ns', H.radiativeLifetime(2, 1) * 1e9);
console.log(
  'tau 3p ns',
  H.radiativeLifetime(3, 1) * 1e9,
  'tau 3d',
  H.radiativeLifetime(3, 2) * 1e9,
  'tau 3s',
  H.radiativeLifetime(3, 0) * 1e9
);
console.log(
  'A 3p-2s',
  H.einsteinA({ n: 3, l: 1 }, { n: 2, l: 0 }),
  'A 3d-2p',
  H.einsteinA({ n: 3, l: 2 }, { n: 2, l: 1 })
);
console.log(
  'Lya nm',
  H.transitionWavelength(2, 1) * 1e9,
  H.transitionWavelength(2, 1, { jUpper: 1.5, jLower: 0.5 }) * 1e9,
  H.transitionWavelength(2, 1, { jUpper: 0.5, jLower: 0.5 }) * 1e9
);
console.log('Ha nm', H.transitionWavelength(3, 2) * 1e9);
console.log(
  'radial 1s2p',
  H.radialDipoleIntegral(1, 0, 2, 1, inf),
  (128 * Math.sqrt(6)) / 243
);
// normalisation of R
for (const [n, l] of [
  [1, 0],
  [3, 2],
  [10, 4],
  [20, 19],
]) {
  let s = 0;
  const h = 0.01;
  for (let r = 0; r < 2000; r += h) {
    s += H.radialWavefunction(n, l, r, inf) ** 2 * r * r * h;
  }
  console.log('norm', n, l, s);
}
const sp = new H.HydrogenSuperposition(
  [
    { n: 1, l: 0, m: 0 },
    { n: 2, l: 1, m: 0 },
  ],
  inf
);
console.log(
  'z(t)',
  sp.expectationPosition(0),
  sp.expectationPosition(Math.PI / 0.375)
);
const sx = new H.HydrogenSuperposition(
  [
    { n: 1, l: 0, m: 0 },
    { n: 2, l: 1, m: 1 },
  ],
  inf
);
console.log(
  'xy(t)',
  sx.expectationPosition(0),
  sx.expectationPosition(Math.PI / 0.75)
);
const wp = H.circularWavePacket({ nMean: 10, count: 5, nucleusMass: Infinity });
const T = H.keplerPeriod(10, inf);
console.log(
  'wp',
  wp.expectationPosition(0),
  wp.expectationPosition(T / 4),
  wp.expectationPosition(T / 2)
);
console.log(
  'dirac 1s',
  H.diracEnergy(1, 0.5, inf),
  'fs 2p',
  ((H.diracEnergy(2, 1.5, inf) - H.diracEnergy(2, 0.5, inf)) * AU.energy) /
    6.62607015e-34 /
    1e9,
  'GHz'
);
