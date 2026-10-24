/**
 * Light as electromagnetic waves: Maxwell FDTD propagation and the
 * radiation emitted by accelerating charges.
 */

import { describe, it, expect } from 'test-anywhere';
import {
  FDTD1D,
  FDTD2D,
  gaussLegendre,
  kickedCharge,
  larmorPower,
  lienardPower,
  lienardWiechertField,
  oscillatingCharge,
  poyntingFlux,
  retardedTime,
  sampleFieldPlane,
  twoLevelEmission,
} from '../src/index.js';

function peakIndex(values) {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i]) > Math.abs(values[best])) {
      best = i;
    }
  }
  return best;
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

describe('Maxwell FDTD light waves', () => {
  it('moves a pulse one cell per step at the magic time step', () => {
    const grid = new FDTD1D({ cells: 600, courant: 1, absorbingCells: 40 });
    grid.setPulse({ center: 150, width: 12 });
    grid.step(200);
    expect(peakIndex(grid.ez)).toBe(350);
  });

  it('slows light to c/n inside glass', () => {
    const grid = new FDTD1D({
      cells: 1200,
      courant: 0.5,
      absorbingCells: 40,
      permittivity: 2.25,
    });
    grid.setPulse({ center: 200, width: 30 });
    // In a uniform medium the injected pulse splits; follow the forward
    // half: speed c/n = 1/1.5 cells per unit time.
    grid.step(1200);
    const forward = peakIndex(grid.ez.subarray(200));
    expect(Math.abs(forward - 600 / 1.5)).toBeLessThan(4);
  });

  it('absorbs outgoing light in the graded boundary layer', () => {
    const grid = new FDTD1D({ cells: 400, courant: 0.5, absorbingCells: 60 });
    grid.setPulse({ center: 200, width: 10 });
    const initial = grid.energy();
    grid.step(1200);
    expect(grid.energy() / initial).toBeLessThan(1e-8);
  });

  it('enforces the Courant stability limits', () => {
    expect(() => new FDTD1D({ courant: 1.01 })).toThrow();
    expect(() => new FDTD2D({ courant: 0.75 })).toThrow();
  });

  it('radiates the sin²φ dipole pattern in 2D', () => {
    const grid = new FDTD2D({ nx: 160, ny: 160, absorbingCells: 20 });
    const omega = (2 * Math.PI) / 20;
    grid.addDipole({
      i: 80,
      j: 80,
      axis: 'x',
      current: (t) => Math.sin(omega * t),
    });
    let along = 0;
    let across = 0;
    for (let s = 0; s < 240; s++) {
      grid.step();
      along += grid.sampleHz(80 + 40, 80) ** 2;
      across += grid.sampleHz(80, 80 + 40) ** 2;
    }
    expect(across).toBeGreaterThan(0);
    expect(along / across).toBeLessThan(0.02);
  });
});

describe('light from accelerating charges', () => {
  it('solves the light-cone condition for the retarded time', () => {
    const trajectory = oscillatingCharge({ amplitude: 0.3, omega: 0.8 });
    const point = [3, 1, 2];
    const t = 10;
    const tr = retardedTime(trajectory, point, t);
    const source = trajectory(tr).position;
    const distance = Math.hypot(
      point[0] - source[0],
      point[1] - source[1],
      point[2] - source[2]
    );
    expect(Math.abs(t - tr - distance)).toBeLessThan(1e-9);
  });

  it('reduces to Coulomb’s law for a charge at rest', () => {
    const rest = kickedCharge({ start: 100 });
    const field = lienardWiechertField(rest, [0, 4, 0], 10);
    expect(Math.abs(field.E[1] - 1 / 16)).toBeLessThan(1e-12);
    expect(Math.hypot(...field.radiationField)).toBe(0);
  });

  it('emits a transverse radiation field with E ⟂ B ⟂ n', () => {
    const trajectory = oscillatingCharge({ amplitude: 0.05, omega: 0.5 });
    const point = [60, 20, 10];
    const field = lienardWiechertField(trajectory, point, 140);
    const r = Math.hypot(...point);
    const n = point.map((value) => value / r);
    const radiation = field.radiationField;
    expect(Math.abs(dot(radiation, n)) / Math.hypot(...radiation)).toBeLessThan(
      0.01
    );
    expect(Math.abs(dot(field.E, field.B))).toBeLessThan(1e-12);
  });

  it('carries the Larmor power through a distant sphere', () => {
    const omega = 0.5;
    const amplitude = 0.01;
    const trajectory = oscillatingCharge({ amplitude, omega });
    const period = (2 * Math.PI) / omega;
    const flux = poyntingFlux(
      trajectory,
      { radius: 400, t: 600, period, timeSamples: 8 },
      gaussLegendre(24)
    );
    const averageLarmor = larmorPower(amplitude * omega * omega) / 2;
    expect(Math.abs(flux / averageLarmor - 1)).toBeLessThan(0.02);
  });

  it('matches Larmor at low speed and boosts by γ⁴ on a circle', () => {
    const a = [0, 0.01, 0];
    expect(
      Math.abs(lienardPower([1e-6, 0, 0], a) / larmorPower(a) - 1)
    ).toBeLessThan(1e-9);
    const v = [0.6, 0, 0];
    const gamma4 = 1 / (1 - 0.36) ** 2;
    expect(Math.abs(lienardPower(v, a) / larmorPower(a) - gamma4)).toBeLessThan(
      1e-12
    );
  });

  it('shows the radiation shell of a kicked charge expanding at c', () => {
    const trajectory = kickedCharge({ speed: 0.6, start: 0, duration: 1 });
    const { values, resolution, extent } = sampleFieldPlane(trajectory, 15, {
      extent: 20,
      resolution: 81,
    });
    // Strongest radiation sits on the shell r ≈ c·t (perpendicular to v).
    const column = Math.floor(resolution / 2);
    let best = 0;
    for (let row = 0; row < resolution; row++) {
      if (
        Math.abs(values[row * resolution + column]) >
        Math.abs(values[best * resolution + column])
      ) {
        best = row;
      }
    }
    const y = Math.abs(extent - ((best + 0.5) * 2 * extent) / resolution);
    expect(Math.abs(y - 14.5)).toBeLessThan(1.5);
  });

  it('separates semiclassical and QED emission from a two-level atom', () => {
    const excited = twoLevelEmission({
      einsteinA: 1,
      omega: 1,
      upperPopulation: 1,
    });
    expect(excited.semiclassical).toBe(0);
    expect(excited.quantum).toBe(1);
    const mixed = twoLevelEmission({
      einsteinA: 1,
      omega: 1,
      upperPopulation: 0.5,
    });
    expect(mixed.semiclassical).toBe(0.25);
  });
});
