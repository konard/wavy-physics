// Measure per-frame cost of the simulations shown on the website.
import {
  HydrogenSuperposition,
  circularWavePacket,
  keplerPeriod,
  FDTD2D,
  sampleFieldPlane,
  kickedCharge,
  Schrodinger2D,
  runValidation,
} from '../src/index.js';

function time(label, fn, reps = 5) {
  fn();
  const start = performance.now();
  for (let i = 0; i < reps; i++) {
    fn();
  }
  console.log(label, ((performance.now() - start) / reps).toFixed(1), 'ms');
}
const atom = new HydrogenSuperposition([
  { n: 1, l: 0, m: 0 },
  { n: 2, l: 1, m: 0 },
]);
const s1 = atom.createPlaneSampler({ extent: 12, resolution: 128 });
time('1s+2p0 sampler 128²', () => s1.density(1));
const packet = circularWavePacket({ nMean: 12, width: 1.5, count: 7 });
console.log('packet terms', packet.terms?.length, 'period', keplerPeriod(12));
const s2 = packet.createPlaneSampler({
  plane: 'xy',
  extent: 300,
  resolution: 128,
});
time('rydberg n=12 sampler 128²', () => s2.density(1));
const fdtd = new FDTD2D({ nx: 240, ny: 240 });
fdtd.addDipole({ i: 120, j: 120, current: (t) => Math.sin(0.3 * t) });
time('fdtd 240² x4 steps', () => fdtd.step(4));
time(
  'LW plane 64²',
  () =>
    sampleFieldPlane(kickedCharge({ speed: 0.6 }), 15, {
      extent: 20,
      resolution: 64,
    }),
  2
);
const q = new Schrodinger2D({
  n: 128,
  extent: 40,
  potential: (x, y) => -1 / Math.sqrt(x * x + y * y + 0.5),
});
q.setGaussian({ x0: 8, sigma: 2, ky: 0.35 });
time('schrodinger2D 128² x4 steps', () => q.step(0.05, 4));
for (const r of runValidation()) {
  console.log(r.milliseconds.toFixed(0).padStart(6), r.id);
}
