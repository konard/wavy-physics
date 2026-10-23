// Quick numerical checks for the Schrödinger solvers.
import { Schrodinger1D, Schrodinger2D } from '../src/physics/schrodinger.js';

// Free Gaussian spreading: σ(t) = σ0 sqrt(1 + (t/(2σ0²))²)
const free = new Schrodinger1D({ n: 2048, xMin: -100, xMax: 100 });
free.setGaussian({ x0: -20, sigma: 1, k0: 2 });
free.step(0.01, 500);
const t = free.time;
console.log(
  'free',
  free.sigmaX(),
  Math.sqrt(1 + (t / 2) ** 2),
  free.expectationX(),
  -20 + 2 * t,
  free.norm()
);

// Harmonic oscillator ground state by imaginary time
const ho = new Schrodinger1D({
  n: 512,
  xMin: -20,
  xMax: 20,
  potential: (x) => 0.5 * x * x,
});
ho.setGaussian({ x0: 1, sigma: 2 });
const g = ho.relax({ dt: 0.01 });
const g0 = ho.snapshot();
ho.setGaussian({ x0: 1, sigma: 2 });
const e1 = ho.relax({ dt: 0.01, orthogonalTo: [g0] });
console.log('HO', g, e1);

// 2D: soft Coulomb ground state, L_z of rotating packet
const s2 = new Schrodinger2D({
  n: 128,
  extent: 40,
  potential: (x, y) => -1 / Math.sqrt(x * x + y * y + 0.01),
});
s2.setGaussian({ sigma: 1 });
console.log('2D H', s2.relax({ dt: 0.005, maxSteps: 4000 }));
s2.setGaussian({ x0: 3, sigma: 1, ky: 0.5 });
console.log('Lz', s2.angularMomentum(), 3 * 0.5);
