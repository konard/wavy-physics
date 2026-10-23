/**
 * One-dimensional Dirac equation  i ∂ψ/∂t = (c α p + β m c² + V) ψ  for a
 * two-component spinor (α = σx, β = σz), solved with an exact split-operator
 * scheme in natural units (ħ = 1; c and m configurable).
 *
 * This is the relativistic wave equation of the electron. A packet built
 * from positive-energy waves moves at the group velocity c²p/E; a packet
 * mixing positive and negative energies shows Zitterbewegung — a trembling
 * of the centre at angular frequency ≈ 2E/ħ caused by interference between
 * the two frequency branches.
 */

import { FFT, fftWavenumbers } from './fft.js';

export class Dirac1D {
  /**
   * @param {object} [options]
   * @param {number} [options.n=2048]
   * @param {number} [options.xMin=-100]
   * @param {number} [options.xMax=100]
   * @param {number} [options.mass=1]
   * @param {number} [options.c=1]
   * @param {Function|number} [options.potential=0]
   */
  constructor({
    n = 2048,
    xMin = -100,
    xMax = 100,
    mass = 1,
    c = 1,
    potential = 0,
  } = {}) {
    this.n = n;
    this.dx = (xMax - xMin) / n;
    this.mass = mass;
    this.c = c;
    this.fft = new FFT(n);
    this.x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      this.x[i] = xMin + i * this.dx;
    }
    this.k = fftWavenumbers(n, this.dx);
    this.upRe = new Float64Array(n);
    this.upIm = new Float64Array(n);
    this.downRe = new Float64Array(n);
    this.downIm = new Float64Array(n);
    this.potential = new Float64Array(n);
    this.setPotential(potential);
    this.time = 0;
    this.cacheDt = null;
  }

  setPotential(potential) {
    for (let i = 0; i < this.n; i++) {
      this.potential[i] =
        typeof potential === 'function' ? potential(this.x[i]) : potential;
    }
    this.cacheDt = null;
  }

  /** Relativistic energy E(k) = sqrt(c²k² + m²c⁴). */
  energyAt(k) {
    return Math.sqrt((this.c * k) ** 2 + (this.mass * this.c * this.c) ** 2);
  }

  /**
   * Gaussian packet ψ ∝ exp(−(x−x0)²/(4σ²) + i k0 x) · spinor.
   * @param {object} packet
   * @param {number} [packet.x0=0]
   * @param {number} [packet.sigma=5]
   * @param {number} [packet.k0=0]
   * @param {'positive'|'negative'|'upper'} [packet.branch='positive'] -
   *   Project onto positive or negative energy waves, or keep a bare upper
   *   component (which mixes both branches).
   */
  setGaussian({ x0 = 0, sigma = 5, k0 = 0, branch = 'positive' } = {}) {
    for (let i = 0; i < this.n; i++) {
      const u = this.x[i] - x0;
      const envelope = Math.exp(-(u * u) / (4 * sigma * sigma));
      this.upRe[i] = envelope * Math.cos(k0 * this.x[i]);
      this.upIm[i] = envelope * Math.sin(k0 * this.x[i]);
    }
    this.downRe.fill(0);
    this.downIm.fill(0);
    if (branch !== 'upper') {
      this.projectEnergyBranch(branch === 'positive' ? 1 : -1);
    }
    this.normalize();
    this.time = 0;
  }

  /** Keep only the positive (sign = 1) or negative (−1) energy waves. */
  projectEnergyBranch(sign) {
    const { upRe, upIm, downRe, downIm } = this;
    this.fft.forward(upRe, upIm);
    this.fft.forward(downRe, downIm);
    const mc2 = this.mass * this.c * this.c;
    for (let i = 0; i < this.n; i++) {
      const ck = this.c * this.k[i];
      const energy = sign * this.energyAt(this.k[i]);
      // Eigenvector of [[mc², ck], [ck, −mc²]] for eigenvalue `energy`.
      let a = energy + mc2;
      let b = ck;
      if (Math.abs(a) < 1e-14 && Math.abs(b) < 1e-14) {
        a = -ck;
        b = mc2 - energy;
      }
      const length = Math.hypot(a, b);
      a /= length;
      b /= length;
      const overlapRe = a * upRe[i] + b * downRe[i];
      const overlapIm = a * upIm[i] + b * downIm[i];
      upRe[i] = a * overlapRe;
      upIm[i] = a * overlapIm;
      downRe[i] = b * overlapRe;
      downIm[i] = b * overlapIm;
    }
    this.fft.inverse(upRe, upIm);
    this.fft.inverse(downRe, downIm);
  }

  norm() {
    let sum = 0;
    for (let i = 0; i < this.n; i++) {
      sum +=
        this.upRe[i] ** 2 +
        this.upIm[i] ** 2 +
        this.downRe[i] ** 2 +
        this.downIm[i] ** 2;
    }
    return sum * this.dx;
  }

  normalize() {
    const scale = 1 / Math.sqrt(this.norm());
    for (const array of [this.upRe, this.upIm, this.downRe, this.downIm]) {
      for (let i = 0; i < this.n; i++) {
        array[i] *= scale;
      }
    }
  }

  /** Probability density ψ†ψ. */
  density() {
    const rho = new Float64Array(this.n);
    for (let i = 0; i < this.n; i++) {
      rho[i] =
        this.upRe[i] ** 2 +
        this.upIm[i] ** 2 +
        this.downRe[i] ** 2 +
        this.downIm[i] ** 2;
    }
    return rho;
  }

  expectationX() {
    const rho = this.density();
    let sum = 0;
    for (let i = 0; i < this.n; i++) {
      sum += rho[i] * this.x[i];
    }
    return sum * this.dx;
  }

  prepare(dt) {
    if (this.cacheDt === dt) {
      return;
    }
    const n = this.n;
    const mc2 = this.mass * this.c * this.c;
    this.kineticCos = new Float64Array(n);
    this.kineticMass = new Float64Array(n);
    this.kineticMomentum = new Float64Array(n);
    this.potentialCos = new Float64Array(n);
    this.potentialSin = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const energy = this.energyAt(this.k[i]);
      const s = Math.sin(energy * dt) / energy;
      this.kineticCos[i] = Math.cos(energy * dt);
      this.kineticMass[i] = s * mc2;
      this.kineticMomentum[i] = s * this.c * this.k[i];
      const phase = (-this.potential[i] * dt) / 2;
      this.potentialCos[i] = Math.cos(phase);
      this.potentialSin[i] = Math.sin(phase);
    }
    this.cacheDt = dt;
  }

  potentialHalfStep() {
    for (const [re, im] of [
      [this.upRe, this.upIm],
      [this.downRe, this.downIm],
    ]) {
      for (let i = 0; i < this.n; i++) {
        const c = this.potentialCos[i];
        const s = this.potentialSin[i];
        const r = re[i];
        re[i] = r * c - im[i] * s;
        im[i] = r * s + im[i] * c;
      }
    }
  }

  /**
   * Exact free evolution in momentum space:
   * exp(−i h dt) = cos(E dt) − i sin(E dt)/E · (ck σx + mc² σz).
   */
  kineticStep() {
    const { upRe, upIm, downRe, downIm } = this;
    this.fft.forward(upRe, upIm);
    this.fft.forward(downRe, downIm);
    for (let i = 0; i < this.n; i++) {
      const c = this.kineticCos[i];
      const m = this.kineticMass[i];
      const p = this.kineticMomentum[i];
      const ur = upRe[i];
      const ui = upIm[i];
      const dr = downRe[i];
      const di = downIm[i];
      // up' = (c − i m) up − i p down ; down' = −i p up + (c + i m) down
      upRe[i] = c * ur + m * ui + p * di;
      upIm[i] = c * ui - m * ur - p * dr;
      downRe[i] = c * dr - m * di + p * ui;
      downIm[i] = c * di + m * dr - p * ur;
    }
    this.fft.inverse(upRe, upIm);
    this.fft.inverse(downRe, downIm);
  }

  step(dt, steps = 1) {
    this.prepare(dt);
    for (let s = 0; s < steps; s++) {
      this.potentialHalfStep();
      this.kineticStep();
      this.potentialHalfStep();
      this.time += dt;
    }
  }
}

/**
 * Dominant angular frequency of a uniformly sampled signal after removing
 * its best straight-line fit (discrete Fourier scan with parabolic peak
 * refinement).
 * @param {number[]} samples
 * @param {number} dt - Sampling interval.
 * @param {{minOmega?: number, maxOmega?: number}} [range]
 */
export function dominantFrequency(samples, dt, range = {}) {
  const count = samples.length;
  let sumT = 0;
  let sumY = 0;
  let sumTT = 0;
  let sumTY = 0;
  samples.forEach((y, i) => {
    sumT += i;
    sumY += y;
    sumTT += i * i;
    sumTY += i * y;
  });
  const slope = (count * sumTY - sumT * sumY) / (count * sumTT - sumT * sumT);
  const intercept = (sumY - slope * sumT) / count;
  const residual = samples.map((y, i) => {
    const window = Math.sin((Math.PI * i) / (count - 1)) ** 2;
    return (y - intercept - slope * i) * window;
  });
  const minOmega = range.minOmega ?? (2 * Math.PI) / (count * dt);
  const maxOmega = range.maxOmega ?? Math.PI / dt;
  const power = (omega) => {
    let re = 0;
    let im = 0;
    residual.forEach((y, i) => {
      re += y * Math.cos(omega * i * dt);
      im += y * Math.sin(omega * i * dt);
    });
    return re * re + im * im;
  };
  const scanSteps = 2000;
  const delta = (maxOmega - minOmega) / scanSteps;
  let best = minOmega;
  let bestPower = -1;
  for (let s = 0; s <= scanSteps; s++) {
    const omega = minOmega + s * delta;
    const p = power(omega);
    if (p > bestPower) {
      bestPower = p;
      best = omega;
    }
  }
  const left = power(best - delta);
  const right = power(best + delta);
  const curvature = left - 2 * bestPower + right;
  return curvature < 0
    ? best + (0.5 * delta * (left - right)) / curvature
    : best;
}
