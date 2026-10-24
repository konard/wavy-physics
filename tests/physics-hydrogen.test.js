/**
 * The hydrogen atom as standing electron waves: exact eigenfunctions,
 * selection rules, the oscillating charge cloud and Rydberg wave packets.
 */

import { describe, it, expect } from 'test-anywhere';
import {
  HydrogenSuperposition,
  circularWavePacket,
  diracEnergy,
  dipoleMatrixElement,
  einsteinA,
  hydrogenEnergy,
  hydrogenWavefunction,
  keplerPeriod,
  radialWavefunction,
  radiativeLifetime,
  solveRadialStates,
  SI,
} from '../src/index.js';

const FIXED = { nucleusMass: Infinity };

function radialOverlap(a, b, rMax = 200, steps = 20000) {
  const h = rMax / steps;
  let sum = 0;
  for (let i = 1; i < steps; i++) {
    const r = i * h;
    const weight = i % 2 === 0 ? 2 : 4;
    sum +=
      weight *
      radialWavefunction(a.n, a.l, r, FIXED) *
      radialWavefunction(b.n, b.l, r, FIXED) *
      r *
      r;
  }
  return (sum * h) / 3;
}

describe('hydrogen standing waves', () => {
  it('has Bohr levels E_n = −μZ²/(2n²)', () => {
    expect(hydrogenEnergy(1, FIXED)).toBe(-0.5);
    expect(hydrogenEnergy(3, { Z: 2, nucleusMass: Infinity })).toBe(-2 / 9);
    expect(hydrogenEnergy(1)).toBeGreaterThan(-0.5);
  });

  it('has normalised, mutually orthogonal radial waves', () => {
    for (const state of [
      { n: 1, l: 0 },
      { n: 3, l: 1 },
      { n: 4, l: 2 },
    ]) {
      expect(Math.abs(radialOverlap(state, state) - 1)).toBeLessThan(1e-8);
    }
    expect(
      Math.abs(radialOverlap({ n: 1, l: 0 }, { n: 2, l: 0 }))
    ).toBeLessThan(1e-8);
  });

  it('gives complex orbitals with the e^{imφ} phase', () => {
    const [re, im] = hydrogenWavefunction({ n: 2, l: 1, m: 1 }, 0, 2, 0, FIXED);
    expect(Math.abs(re)).toBeLessThan(1e-15);
    expect(Math.abs(im)).toBeGreaterThan(0.01);
  });

  it('rejects impossible quantum numbers', () => {
    expect(() => radialWavefunction(2, 2, 1)).toThrow();
    expect(() => hydrogenWavefunction({ n: 2, l: 1, m: 2 }, 1, 1, 1)).toThrow();
  });

  it('reproduces ⟨1s|z|2p₀⟩ = 128√2/243 and the dipole selection rules', () => {
    const d = dipoleMatrixElement(
      { n: 1, l: 0, m: 0 },
      { n: 2, l: 1, m: 0 },
      FIXED
    );
    expect(Math.abs(d.z[0] - (128 * Math.SQRT2) / 243)).toBeLessThan(1e-9);
    expect(Math.hypot(...d.x, ...d.y)).toBeLessThan(1e-12);
    const forbidden = dipoleMatrixElement(
      { n: 1, l: 0, m: 0 },
      { n: 2, l: 0, m: 0 },
      FIXED
    );
    expect(Math.hypot(...forbidden.x, ...forbidden.y, ...forbidden.z)).toBe(0);
    expect(einsteinA({ n: 2, l: 0 }, { n: 1, l: 0 })).toBe(0);
  });

  it('predicts the 2p lifetime of 1.596 ns', () => {
    expect(Math.abs(radiativeLifetime(2, 1) / 1.596e-9 - 1)).toBeLessThan(2e-3);
  });

  it('splits n = 2 by the measured fine structure (Dirac waves)', () => {
    // NIST ASD: 2p3/2 − 2p1/2 = 0.3658881 cm⁻¹.
    const measured = 0.3658881 * 100 * SI.c;
    const splitting =
      ((diracEnergy(2, 1.5) - diracEnergy(2, 0.5)) * SI.Eh) / SI.h;
    expect(Math.abs(splitting / measured - 1)).toBeLessThan(3e-3);
    expect(diracEnergy(1, 0.5)).toBeLessThan(hydrogenEnergy(1));
  });

  it('finds the levels from the radial wave equation alone', () => {
    const { states } = solveRadialStates({
      states: 2,
      rMax: 40,
      points: 4000,
    });
    expect(Math.abs(states[0].energy + 0.5)).toBeLessThan(1e-4);
    expect(Math.abs(states[1].energy + 0.125)).toBeLessThan(1e-4);
  });
});

describe('an atom waving in time', () => {
  it('keeps a stationary state perfectly still', () => {
    const atom = new HydrogenSuperposition([{ n: 2, l: 1, m: 0 }], FIXED);
    const a = atom.density(0.3, 0.2, 1.1, 0);
    const b = atom.density(0.3, 0.2, 1.1, 37);
    expect(Math.abs(a - b)).toBeLessThan(1e-15);
    expect(atom.expectationPosition(5)).toEqual([0, 0, 0]);
  });

  it('makes a 1s + 2p₀ superposition slosh at the Lyman-α frequency', () => {
    const atom = new HydrogenSuperposition(
      [
        { n: 1, l: 0, m: 0 },
        { n: 2, l: 1, m: 0 },
      ],
      FIXED
    );
    const omega = 0.375;
    const amplitude = (128 * Math.SQRT2) / 243;
    for (const t of [0, 1, 2.5, 10]) {
      const z = atom.expectationPosition(t)[2];
      expect(Math.abs(z - amplitude * Math.cos(omega * t))).toBeLessThan(1e-9);
    }
  });

  it('samples a plane of the charge cloud consistently', () => {
    const atom = new HydrogenSuperposition(
      [
        { n: 1, l: 0, m: 0 },
        { n: 2, l: 1, m: 1, amplitude: [0, 1] },
      ],
      FIXED
    );
    const sampler = atom.createPlaneSampler({
      plane: 'xy',
      extent: 8,
      resolution: 16,
    });
    const grid = sampler.density(2);
    const row = 3;
    const col = 11;
    const x = -8 + ((col + 0.5) * 16) / 16;
    const y = 8 - ((row + 0.5) * 16) / 16;
    expect(
      Math.abs(grid[row * 16 + col] - atom.density(x, y, 0, 2))
    ).toBeLessThan(1e-6);
  });

  it('shows the phase of a stationary wave rotating at its energy', () => {
    const ground = new HydrogenSuperposition([{ n: 1, l: 0, m: 0 }], FIXED);
    const sampler = ground.createPlaneSampler({ extent: 4, resolution: 8 });
    const centre = 3 * 8 + 3;
    const start = sampler.realPart(0)[centre];
    // ψ(t) = ψ(0) e^{−iEt} with E = −½: Re ψ flips sign after t = π/|E|.
    const half = sampler.realPart(2 * Math.PI)[centre];
    expect(Math.abs(half + start)).toBeLessThan(1e-6);
    expect(Math.abs(sampler.realPart(Math.PI)[centre])).toBeLessThan(1e-6);
    expect(sampler.density(1)[centre]).toBeGreaterThan(0);
  });

  it('builds a Rydberg packet that orbits like a classical electron', () => {
    const packet = circularWavePacket({ nMean: 30, width: 1, count: 5 });
    const [x0, y0] = packet.expectationPosition(0);
    expect(x0).toBeGreaterThan(0);
    expect(Math.abs(y0)).toBeLessThan(1e-6 * x0);
    const quarter = keplerPeriod(30) / 4;
    const [x1, y1] = packet.expectationPosition(quarter);
    expect(Math.abs(y1)).toBeGreaterThan(Math.abs(x1));
  });
});
