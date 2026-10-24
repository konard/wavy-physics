/**
 * Schrödinger matter waves: FFT, unitarity, spreading, stationary states,
 * tunnelling.
 */

import { describe, it, expect } from 'test-anywhere';
import {
  FFT,
  FFT2D,
  Schrodinger1D,
  Schrodinger2D,
  barrierTransmission,
  packetTransmission,
  isPowerOfTwo,
} from '../src/index.js';

describe('FFT', () => {
  it('round-trips a signal to round-off', () => {
    const n = 64;
    const re = Float64Array.from({ length: n }, (_, i) => Math.sin(i * 0.3));
    const im = Float64Array.from({ length: n }, (_, i) => Math.cos(i * 0.7));
    const original = [Float64Array.from(re), Float64Array.from(im)];
    const fft = new FFT(n);
    fft.forward(re, im);
    fft.inverse(re, im);
    for (let i = 0; i < n; i++) {
      expect(Math.abs(re[i] - original[0][i])).toBeLessThan(1e-12);
      expect(Math.abs(im[i] - original[1][i])).toBeLessThan(1e-12);
    }
  });

  it('maps a plane wave to a single Fourier mode', () => {
    const n = 32;
    const re = Float64Array.from({ length: n }, (_, i) =>
      Math.cos((2 * Math.PI * 5 * i) / n)
    );
    const im = Float64Array.from({ length: n }, (_, i) =>
      Math.sin((2 * Math.PI * 5 * i) / n)
    );
    new FFT(n).forward(re, im);
    expect(Math.abs(re[5] - n)).toBeLessThan(1e-9);
    expect(Math.abs(re[4])).toBeLessThan(1e-9);
  });

  it('round-trips in two dimensions and rejects bad sizes', () => {
    const re = Float64Array.from({ length: 16 * 8 }, (_, i) => (i % 7) - 3);
    const im = new Float64Array(16 * 8);
    const copy = Float64Array.from(re);
    const fft = new FFT2D(16, 8);
    fft.forward(re, im);
    fft.inverse(re, im);
    expect(Math.max(...re.map((v, i) => Math.abs(v - copy[i])))).toBeLessThan(
      1e-12
    );
    expect(isPowerOfTwo(48)).toBe(false);
    expect(() => new FFT(48)).toThrow();
  });
});

describe('Schrödinger wave packets', () => {
  it('conserves probability (unitary evolution)', () => {
    const solver = new Schrodinger1D({
      n: 512,
      xMin: -40,
      xMax: 40,
      potential: (x) => 0.5 * 0.1 * x * x,
    });
    solver.setGaussian({ x0: -5, sigma: 1, k0: 1 });
    solver.step(0.02, 400);
    expect(Math.abs(solver.norm() - 1)).toBeLessThan(1e-12);
  });

  it('follows Ehrenfest: a free packet moves at ⟨p⟩/m', () => {
    const solver = new Schrodinger1D({ n: 1024, xMin: -60, xMax: 60 });
    solver.setGaussian({ x0: -20, sigma: 2, k0: 1.5 });
    solver.step(0.05, 200);
    expect(Math.abs(solver.expectationX() - (-20 + 1.5 * 10))).toBeLessThan(
      1e-8
    );
    expect(Math.abs(solver.expectationP() - 1.5)).toBeLessThan(1e-8);
  });

  it('is time reversible', () => {
    const solver = new Schrodinger1D({ n: 256, xMin: -30, xMax: 30 });
    solver.setPotential((x) => 0.2 * x * x);
    solver.setGaussian({ x0: 3, sigma: 1.2, k0: -0.5 });
    const start = solver.snapshot();
    solver.step(0.05, 100);
    solver.step(-0.05, 100);
    let worst = 0;
    for (let i = 0; i < solver.n; i++) {
      worst = Math.max(worst, Math.abs(solver.re[i] - start.re[i]));
    }
    expect(worst).toBeLessThan(1e-10);
  });

  it('relaxes to oscillator eigenstates E_n = (n + ½)ω', () => {
    const omega = 0.7;
    const solver = new Schrodinger1D({
      n: 512,
      xMin: -25,
      xMax: 25,
      potential: (x) => 0.5 * omega * omega * x * x,
    });
    solver.setGaussian({ x0: 0.4, sigma: 2 });
    const ground = solver.relax({ dt: 0.02 });
    expect(Math.abs(ground.energy - 0.5 * omega)).toBeLessThan(1e-8);
    const groundState = solver.snapshot();
    solver.setGaussian({ x0: 1, sigma: 2 });
    const excited = solver.relax({ dt: 0.02, orthogonalTo: [groundState] });
    expect(Math.abs(excited.energy - 1.5 * omega)).toBeLessThan(1e-7);
  });

  it('absorbs outgoing waves at the boundary', () => {
    const solver = new Schrodinger1D({
      n: 1024,
      xMin: -50,
      xMax: 50,
      absorbingWidth: 15,
    });
    solver.setGaussian({ x0: 0, sigma: 2, k0: 3 });
    solver.step(0.05, 800);
    expect(solver.norm()).toBeLessThan(1e-3);
  });

  it('rotates in 2D with conserved angular momentum', () => {
    const solver = new Schrodinger2D({
      n: 64,
      extent: 30,
      potential: (x, y) => 0.5 * 0.25 * (x * x + y * y),
    });
    solver.setGaussian({ x0: 4, sigma: 1.5, ky: 1 });
    const before = solver.angularMomentum();
    solver.step(0.05, 200);
    expect(Math.abs(solver.angularMomentum() - before)).toBeLessThan(1e-6);
    expect(Math.abs(before - 4)).toBeLessThan(1e-6);
  });
});

describe('quantum tunnelling', () => {
  it('matches the textbook transmission formula', () => {
    // E < V0: T = 1 / (1 + V0² sinh²(κa) / (4E(V0 − E))).
    const E = 0.5;
    const V0 = 1;
    const a = 1;
    const kappa = Math.sqrt(2 * (V0 - E));
    const exact =
      1 / (1 + (V0 * V0 * Math.sinh(kappa * a) ** 2) / (4 * E * (V0 - E)));
    expect(
      Math.abs(barrierTransmission(E, { height: V0, width: a }) - exact)
    ).toBeLessThan(1e-12);
  });

  it('is continuous at E = V0 and transmits fully at resonance', () => {
    const barrier = { height: 1, width: 2 };
    const below = barrierTransmission(1 - 1e-7, barrier);
    const above = barrierTransmission(1 + 1e-7, barrier);
    expect(Math.abs(below - above)).toBeLessThan(1e-5);
    // Resonance: k' a = π  ⇒  E = V0 + π²/(2a²).
    const resonance = 1 + Math.PI ** 2 / 8;
    expect(Math.abs(barrierTransmission(resonance, barrier) - 1)).toBeLessThan(
      1e-12
    );
  });

  it('averages over the packet momentum spread', () => {
    const value = packetTransmission(
      { k0: 1.2, sigma: 5 },
      { height: 1, width: 1 }
    );
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(1);
  });
});
