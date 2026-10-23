/**
 * One- and two-dimensional time-dependent Schrödinger equation solvers
 * (atomic units) built on the spectral split-operator core.
 */

import { FFT, FFT2D, fftWavenumbers } from './fft.js';
import { SplitOperatorCore } from './split-operator.js';

function evaluatePotential(potential, size, at) {
  const values = new Float64Array(size);
  if (typeof potential === 'function') {
    for (let i = 0; i < size; i++) {
      values[i] = potential(...at(i));
    }
  } else if (typeof potential === 'number') {
    values.fill(potential);
  } else if (potential) {
    values.set(potential);
  }
  return values;
}

/**
 * Smooth absorbing mask profile: 1 in the interior, decaying as
 * cos^{1/8} inside a boundary layer of the given width.
 */
function maskProfile(distanceToEdge, width) {
  if (width <= 0 || distanceToEdge >= width) {
    return 1;
  }
  const s = Math.max(0, distanceToEdge) / width;
  return Math.pow(Math.sin((Math.PI / 2) * s), 1 / 8);
}

/** Time-dependent Schrödinger equation on a periodic 1D grid. */
export class Schrodinger1D extends SplitOperatorCore {
  /**
   * @param {object} [options]
   * @param {number} [options.n=1024] - Grid points (power of two).
   * @param {number} [options.xMin=-50]
   * @param {number} [options.xMax=50]
   * @param {number} [options.mass=1] - Mass in electron masses.
   * @param {number|Function|Float64Array} [options.potential=0] - V(x) in
   *   Hartree.
   * @param {number} [options.absorbingWidth=0] - Absorbing layer width in
   *   bohr at each edge (0 = periodic, no absorption).
   */
  constructor({
    n = 1024,
    xMin = -50,
    xMax = 50,
    mass = 1,
    potential = 0,
    absorbingWidth = 0,
  } = {}) {
    const dx = (xMax - xMin) / n;
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = xMin + i * dx;
    }
    const k = fftWavenumbers(n, dx);
    const kSquared = k.map((value) => value * value);
    super({
      fft: new FFT(n),
      kSquared,
      momentumAxes: [k],
      positionAxes: [x],
      cellVolume: dx,
      mass,
    });
    this.n = n;
    this.dx = dx;
    this.x = x;
    this.k = k;
    this.setPotential(potential);
    if (absorbingWidth > 0) {
      const mask = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const edge = Math.min(x[i] - xMin, xMax - dx - x[i]);
        mask[i] = maskProfile(edge, absorbingWidth);
      }
      this.setMask(mask);
    }
  }

  /** @param {number|Function|Float64Array} potential - V(x) in Hartree. */
  setPotential(potential) {
    this.setPotentialValues(
      evaluatePotential(potential, this.n, (i) => [this.x[i]])
    );
  }

  /**
   * Load a normalised Gaussian wave packet
   *   ψ(x) ∝ exp(-(x-x0)²/(4σ²) + i k0 x),  so that Δx = σ.
   * @param {{x0?: number, sigma?: number, k0?: number}} [packet]
   */
  setGaussian({ x0 = 0, sigma = 1, k0 = 0 } = {}) {
    for (let i = 0; i < this.n; i++) {
      const u = this.x[i] - x0;
      const envelope = Math.exp(-(u * u) / (4 * sigma * sigma));
      this.re[i] = envelope * Math.cos(k0 * this.x[i]);
      this.im[i] = envelope * Math.sin(k0 * this.x[i]);
    }
    this.normalize();
    this.time = 0;
  }

  /** ⟨x⟩ */
  expectationX() {
    return this.positionMoments(0).mean;
  }

  /** Δx */
  sigmaX() {
    return Math.sqrt(this.positionMoments(0).variance);
  }

  /** ⟨p⟩ */
  expectationP() {
    return this.momentumMoments(0).mean;
  }

  /** Δp */
  sigmaP() {
    return Math.sqrt(this.momentumMoments(0).variance);
  }

  /**
   * Probability of finding the particle at x > position.
   * @param {number} position
   */
  probabilityRightOf(position) {
    let sum = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.x[i] > position) {
        sum += this.re[i] * this.re[i] + this.im[i] * this.im[i];
      }
    }
    return sum * this.dx;
  }
}

/** Time-dependent Schrödinger equation on a periodic square 2D grid. */
export class Schrodinger2D extends SplitOperatorCore {
  /**
   * @param {object} [options]
   * @param {number} [options.n=128] - Points per axis (power of two).
   * @param {number} [options.extent=40] - Box spans [-extent/2, extent/2).
   * @param {number} [options.mass=1]
   * @param {number|Function|Float64Array} [options.potential=0] - V(x, y).
   * @param {number} [options.absorbingWidth=0] - Absorbing layer in bohr.
   */
  constructor({
    n = 128,
    extent = 40,
    mass = 1,
    potential = 0,
    absorbingWidth = 0,
  } = {}) {
    const dx = extent / n;
    const size = n * n;
    const x = new Float64Array(size);
    const y = new Float64Array(size);
    const kx = new Float64Array(size);
    const ky = new Float64Array(size);
    const k1 = fftWavenumbers(n, dx);
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const i = row * n + col;
        x[i] = -extent / 2 + col * dx;
        y[i] = -extent / 2 + row * dx;
        kx[i] = k1[col];
        ky[i] = k1[row];
      }
    }
    const kSquared = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      kSquared[i] = kx[i] * kx[i] + ky[i] * ky[i];
    }
    super({
      fft: new FFT2D(n, n),
      kSquared,
      momentumAxes: [kx, ky],
      positionAxes: [x, y],
      cellVolume: dx * dx,
      mass,
    });
    this.n = n;
    this.dx = dx;
    this.extent = extent;
    this.x = x;
    this.y = y;
    this.setPotential(potential);
    if (absorbingWidth > 0) {
      const mask = new Float64Array(size);
      const lo = -extent / 2;
      const hi = extent / 2 - dx;
      for (let i = 0; i < size; i++) {
        const edge = Math.min(x[i] - lo, hi - x[i], y[i] - lo, hi - y[i]);
        mask[i] = maskProfile(edge, absorbingWidth);
      }
      this.setMask(mask);
    }
  }

  /** @param {number|Function|Float64Array} potential - V(x, y) in Hartree. */
  setPotential(potential) {
    this.setPotentialValues(
      evaluatePotential(potential, this.size, (i) => [this.x[i], this.y[i]])
    );
  }

  /**
   * Load a normalised 2D Gaussian packet with Δx = Δy = σ and mean
   * momentum (kx, ky).
   * @param {{x0?: number, y0?: number, sigma?: number, kx?: number,
   *   ky?: number}} [packet]
   */
  setGaussian({ x0 = 0, y0 = 0, sigma = 1, kx = 0, ky = 0 } = {}) {
    for (let i = 0; i < this.size; i++) {
      const u = this.x[i] - x0;
      const v = this.y[i] - y0;
      const envelope = Math.exp(-(u * u + v * v) / (4 * sigma * sigma));
      const phase = kx * this.x[i] + ky * this.y[i];
      this.re[i] = envelope * Math.cos(phase);
      this.im[i] = envelope * Math.sin(phase);
    }
    this.normalize();
    this.time = 0;
  }

  /** ⟨x⟩, ⟨y⟩ */
  expectationPosition() {
    return [this.positionMoments(0).mean, this.positionMoments(1).mean];
  }

  /** ⟨px⟩, ⟨py⟩ */
  expectationMomentum() {
    return [this.momentumMoments(0).mean, this.momentumMoments(1).mean];
  }

  /**
   * Expectation of the angular momentum L_z = x p_y − y p_x.
   * Computed spectrally: (∂ψ/∂x, ∂ψ/∂y) via FFT.
   */
  angularMomentum() {
    const { re, im } = this.momentumSpace();
    const [kx, ky] = this.momentumAxes;
    const dxRe = new Float64Array(this.size);
    const dxIm = new Float64Array(this.size);
    const dyRe = new Float64Array(this.size);
    const dyIm = new Float64Array(this.size);
    for (let i = 0; i < this.size; i++) {
      // ∂/∂x ↔ i kx
      dxRe[i] = -kx[i] * im[i];
      dxIm[i] = kx[i] * re[i];
      dyRe[i] = -ky[i] * im[i];
      dyIm[i] = ky[i] * re[i];
    }
    this.fft.inverse(dxRe, dxIm);
    this.fft.inverse(dyRe, dyIm);
    // L_z ψ = -i (x ∂y − y ∂x) ψ ;  ⟨ψ|L_zψ⟩ real part
    let sum = 0;
    let total = 0;
    for (let i = 0; i < this.size; i++) {
      const gRe = this.x[i] * dyRe[i] - this.y[i] * dxRe[i];
      const gIm = this.x[i] * dyIm[i] - this.y[i] * dxIm[i];
      // -i g = gIm - i gRe ; conj(ψ)·(-i g) real part:
      sum += this.re[i] * gIm - this.im[i] * gRe;
      total += this.re[i] * this.re[i] + this.im[i] * this.im[i];
    }
    return sum / total;
  }
}
