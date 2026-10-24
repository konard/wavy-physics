/**
 * Relativistic (Dirac) electron waves, solitons as particle-like waves, and
 * classical and fractal waves-of-waves.
 */

import { describe, it, expect } from 'test-anywhere';
import {
  Dirac1D,
  NonlinearSchrodinger1D,
  StringWave,
  boxCountingDimension,
  brightSoliton,
  dAlembert,
  dominantFrequency,
  gibbsPeak,
  relativisticDispersion,
  schrodingerDispersion,
  squareWavePartialSum,
  waveVelocities,
  weierstrass,
  weierstrassDimension,
} from '../src/index.js';

describe('Dirac electron waves', () => {
  it('evolves unitarily', () => {
    const dirac = new Dirac1D({ n: 512, xMin: -60, xMax: 60 });
    dirac.setGaussian({ sigma: 3, k0: 1, branch: 'upper' });
    dirac.step(0.05, 200);
    expect(Math.abs(dirac.norm() - 1)).toBeLessThan(1e-12);
  });

  it('moves a positive-energy packet at the group velocity c²k/E', () => {
    const dirac = new Dirac1D({ n: 2048, xMin: -150, xMax: 150 });
    const k0 = 0.8;
    dirac.setGaussian({ x0: -40, sigma: 8, k0 });
    const start = dirac.expectationX();
    dirac.step(0.05, 600);
    const velocity = (dirac.expectationX() - start) / dirac.time;
    expect(Math.abs(velocity - k0 / dirac.energyAt(k0))).toBeLessThan(2e-3);
  });

  it('never exceeds the speed of light', () => {
    const dirac = new Dirac1D({ n: 1024, xMin: -100, xMax: 100 });
    dirac.setGaussian({ sigma: 2, k0: 20 });
    const start = dirac.expectationX();
    dirac.step(0.05, 400);
    expect((dirac.expectationX() - start) / dirac.time).toBeLessThan(1);
  });

  it('shows Zitterbewegung at 2mc² when both energy branches mix', () => {
    const dt = 0.05;
    const trace = (k0) => {
      const dirac = new Dirac1D({ n: 1024, xMin: -50, xMax: 50 });
      // Only the upper spinor component: a mix of E > 0 and E < 0 waves.
      dirac.setGaussian({ sigma: 2, k0, branch: 'upper' });
      return Array.from({ length: 400 }, () => {
        dirac.step(dt);
        return dirac.expectationX();
      });
    };
    // At rest the mirror-symmetric packet keeps ⟨x⟩ = 0.
    expect(Math.max(...trace(0).map(Math.abs))).toBeLessThan(1e-9);
    // In motion ⟨x⟩ trembles at the beat frequency 2E ≈ 2mc² = 2.
    const omega = dominantFrequency(trace(0.4), dt, {
      minOmega: 1,
      maxOmega: 4,
    });
    expect(Math.abs(omega / 2 - 1)).toBeLessThan(0.1);
  });
});

describe('solitons: waves that behave like particles', () => {
  it('keeps the sech soliton shape while it travels', () => {
    const nls = new NonlinearSchrodinger1D({ n: 1024, xMin: -40, xMax: 40 });
    const soliton = { eta: 1, velocity: 0.5, x0: -10 };
    nls.setSolitons([soliton]);
    nls.step(0.01, 1000);
    expect(nls.solitonError(soliton)).toBeLessThan(1e-4);
  });

  it('conserves norm exactly and energy to second order in dt', () => {
    const worstEnergyError = (dt) => {
      const nls = new NonlinearSchrodinger1D({ n: 512, xMin: -30, xMax: 30 });
      nls.setSolitons([
        { eta: 1.2, velocity: 0.6, x0: -5 },
        { eta: 0.9, velocity: -0.6, x0: 5 },
      ]);
      const norm = nls.norm();
      const energy = nls.energy();
      let worst = 0;
      for (let i = 0; i < Math.round(10 / dt); i++) {
        nls.step(dt);
        worst = Math.max(worst, Math.abs(nls.energy() / energy - 1));
      }
      expect(Math.abs(nls.norm() - norm)).toBeLessThan(1e-11);
      return worst;
    };
    const coarse = worstEnergyError(0.02);
    const fine = worstEnergyError(0.01);
    expect(fine).toBeLessThan(1e-2);
    // Strang splitting: halving dt cuts the error by about four.
    expect(Math.abs(coarse / fine - 4)).toBeLessThan(0.5);
  });

  it('has the analytic norm 2η and peak η', () => {
    const [re, im] = brightSoliton({ eta: 1.5 }, 0);
    expect(Math.hypot(re, im)).toBe(1.5);
    const nls = new NonlinearSchrodinger1D({ n: 1024, xMin: -40, xMax: 40 });
    nls.setSolitons([{ eta: 1.5 }]);
    expect(Math.abs(nls.norm() - 3)).toBeLessThan(1e-10);
  });
});

describe('classical and fractal waves', () => {
  it('matches d’Alembert exactly on the leapfrog string at S = 1', () => {
    const string = new StringWave({ points: 201 });
    const shape = (x) => Math.exp(-(((x - 0.3) / 0.05) ** 2));
    string.setDisplacement(shape);
    string.step(299);
    const u = string.displacement();
    let worst = 0;
    for (let i = 0; i < string.points; i++) {
      worst = Math.max(
        worst,
        Math.abs(u[i] - dAlembert(shape, string.x[i], string.time))
      );
    }
    expect(worst).toBeLessThan(1e-3);
  });

  it('builds a square wave from sine waves with the Gibbs overshoot', () => {
    expect(Math.abs(squareWavePartialSum(Math.PI / 2, 4000) - 1)).toBeLessThan(
      1e-3
    );
    const gibbs = (2 / Math.PI) * 1.851937051982466;
    expect(Math.abs(gibbsPeak(2000) - gibbs)).toBeLessThan(1e-5);
  });

  it('builds a fractal wave of waves with dimension 2 + ln a / ln b', () => {
    expect(weierstrassDimension({ a: 0.5, b: 3 })).toBe(
      2 + Math.log(0.5) / Math.log(3)
    );
    const points = 1 << 15;
    const samples = Float64Array.from({ length: points + 1 }, (_, i) =>
      weierstrass(i / points)
    );
    expect(
      Math.abs(boxCountingDimension(samples) - weierstrassDimension())
    ).toBeLessThan(0.05);
  });

  it('separates phase and group velocity of matter waves', () => {
    const k = 1.3;
    const free = waveVelocities(schrodingerDispersion(1), k);
    expect(Math.abs(free.group - k)).toBeLessThan(1e-8);
    expect(Math.abs(free.phase - k / 2)).toBeLessThan(1e-12);
    const relativistic = waveVelocities(relativisticDispersion(1, 1), k);
    expect(relativistic.phase).toBeGreaterThan(1);
    expect(relativistic.group).toBeLessThan(1);
    expect(Math.abs(relativistic.phase * relativistic.group - 1)).toBeLessThan(
      1e-8
    );
  });
});
