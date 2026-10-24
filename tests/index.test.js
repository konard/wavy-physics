/**
 * Public API surface of wavy-physics (works with Node.js, Bun, and Deno).
 */

import { describe, it, expect } from 'test-anywhere';
import * as wavy from '../src/index.js';

const FUNCTIONS = [
  'reducedMass',
  'hartreeToEV',
  'photonWavelength',
  'fftWavenumbers',
  'gaussLegendre',
  'sphericalHarmonic',
  'hydrogenEnergy',
  'diracEnergy',
  'hydrogenWavefunction',
  'dipoleMatrixElement',
  'einsteinA',
  'radiativeLifetime',
  'transitionWavelength',
  'circularWavePacket',
  'keplerPeriod',
  'solveRadialStates',
  'barrierTransmission',
  'packetTransmission',
  'dominantFrequency',
  'brightSoliton',
  'larmorPower',
  'lienardPower',
  'lienardWiechertField',
  'poyntingFlux',
  'sampleFieldPlane',
  'twoLevelEmission',
  'dAlembert',
  'weierstrass',
  'boxCountingDimension',
  'runBenchmark',
  'runValidation',
];

const CLASSES = [
  'FFT',
  'FFT2D',
  'Schrodinger1D',
  'Schrodinger2D',
  'HydrogenSuperposition',
  'Dirac1D',
  'NonlinearSchrodinger1D',
  'FDTD1D',
  'FDTD2D',
  'StringWave',
];

describe('wavy-physics entry point', () => {
  it('exports every wave solver and helper', () => {
    for (const name of [...FUNCTIONS, ...CLASSES]) {
      expect(typeof wavy[name]).toBe('function');
    }
  });

  it('exports CODATA 2022 constants in SI and atomic units', () => {
    expect(wavy.SI.c).toBe(299792458);
    expect(wavy.SI.alpha).toBe(7.2973525643e-3);
    expect(wavy.AU.c).toBe(1 / wavy.SI.alpha);
    expect(Object.isFrozen(wavy.SI)).toBe(true);
  });

  it('exports a benchmark catalogue with unique ids', () => {
    const ids = wavy.BENCHMARKS.map((entry) => entry.id);
    expect(ids.length).toBeGreaterThanOrEqual(30);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
