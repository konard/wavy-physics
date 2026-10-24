/**
 * Basic usage: an atom waving in time, an electron wave packet, a tunnelling
 * wave and the light the atom emits — all from wave equations.
 *
 * Run with any runtime:
 * - Bun: bun examples/basic-usage.js
 * - Node.js: node examples/basic-usage.js
 * - Deno: deno run examples/basic-usage.js
 */

import {
  AU,
  HydrogenSuperposition,
  Schrodinger1D,
  auTimeToSeconds,
  circularWavePacket,
  hartreeToEV,
  hydrogenEnergy,
  keplerPeriod,
  larmorPower,
  packetTransmission,
  radiativeLifetime,
  transitionWavelength,
} from '../src/index.js';

console.log('Hydrogen as standing electron waves:');
for (const n of [1, 2, 3]) {
  console.log(`  E_${n} = ${hartreeToEV(hydrogenEnergy(n)).toFixed(5)} eV`);
}
console.log(
  `  Lyman-α: ${(transitionWavelength(2, 1) * 1e9).toFixed(4)} nm, 2p lifetime ${(radiativeLifetime(2, 1) * 1e9).toFixed(3)} ns`
);

// 1s + 2p₀: the charge cloud oscillates along z, i.e. a tiny antenna.
const atom = new HydrogenSuperposition([
  { n: 1, l: 0, m: 0 },
  { n: 2, l: 1, m: 0 },
]);
console.log('\nAn atom waving in time (⟨z⟩ in bohr):');
for (const t of [0, 4, 8, 12, 16]) {
  const z = atom.expectationPosition(t)[2];
  console.log(
    `  t = ${auTimeToSeconds(t).toExponential(2)} s  ⟨z⟩ = ${z.toFixed(4)}`
  );
}

// The oscillating dipole radiates: Larmor power of its peak acceleration.
const omega = hydrogenEnergy(2) - hydrogenEnergy(1);
const dipole = atom.expectationPosition(0)[2];
console.log(
  `  peak Larmor power ${larmorPower(dipole * omega * omega, { c: AU.c }).toExponential(3)} hartree per atomic time unit`
);

// A Rydberg electron wave packet orbits at the classical Kepler period.
const packet = circularWavePacket({ nMean: 30, width: 1, count: 5 });
const period = keplerPeriod(30);
console.log('\nElectron wave packet around the atom (n ≈ 30):');
for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
  const [x, y] = packet.expectationPosition(fraction * period);
  console.log(
    `  ${(fraction * 100).toFixed(0).padStart(3)} % of orbit: ⟨x⟩ = ${x.toFixed(1)}, ⟨y⟩ = ${y.toFixed(1)}`
  );
}

// A matter wave tunnels through a barrier higher than its mean energy. The
// barrier spans a whole number of grid cells so the grid sees its true width.
const grid = { n: 2048, xMin: -80, xMax: 80 };
const dx = (grid.xMax - grid.xMin) / grid.n;
const barrier = { height: 2.4, width: Math.round(1 / dx) * dx };
const sim = new Schrodinger1D({
  ...grid,
  potential: (x) =>
    x > -dx / 2 && x < barrier.width - dx / 2 ? barrier.height : 0,
});
sim.setGaussian({ x0: -25, sigma: 4, k0: 2 });
sim.step(0.02, 1500);
console.log('\nTunnelling (mean energy 2 < barrier 2.4):');
console.log(
  `  simulated ${(sim.probabilityRightOf(barrier.width) * 100).toFixed(1)} %, exact ${(packetTransmission({ k0: 2, sigma: 4 }, barrier) * 100).toFixed(1)} %`
);
