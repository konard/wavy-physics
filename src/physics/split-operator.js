/**
 * Spectral split-operator propagator for the time-dependent Schrödinger
 * equation  i dψ/dt = [-∇²/(2m) + V] ψ  (atomic units).
 *
 * The propagator e^{-iHdt} is factored (Strang splitting) as
 *   e^{-iV dt/2} · F⁻¹ e^{-i k² dt/(2m)} F · e^{-iV dt/2}
 * so every factor is an exact phase rotation: the kinetic factor is exact
 * for plane waves and the potential factor is exact in position space.
 * The scheme is unitary (norm-preserving to round-off), time reversible and
 * second-order accurate in dt; spatial accuracy is spectral.
 *
 * Imaginary-time propagation (t → -iτ) turns the same wave equation into a
 * diffusion equation that relaxes any trial wave to the lowest eigenstate,
 * so stationary states are also found with wave-only math.
 */

/**
 * Grid-agnostic split-operator core shared by the 1D and 2D solvers.
 */
export class SplitOperatorCore {
  /**
   * @param {object} options
   * @param {{forward: Function, inverse: Function}} options.fft - FFT plan.
   * @param {Float64Array} options.kSquared - |k|² for every grid point
   *   in FFT ordering.
   * @param {Float64Array[]} options.momentumAxes - k components per axis.
   * @param {Float64Array[]} options.positionAxes - x components per axis.
   * @param {number} options.cellVolume - dx (1D) or dx·dy (2D).
   * @param {number} [options.mass=1] - Particle mass (electron masses).
   */
  constructor({
    fft,
    kSquared,
    momentumAxes,
    positionAxes,
    cellVolume,
    mass = 1,
  }) {
    this.fft = fft;
    this.size = kSquared.length;
    this.kSquared = kSquared;
    this.momentumAxes = momentumAxes;
    this.positionAxes = positionAxes;
    this.cellVolume = cellVolume;
    this.mass = mass;
    this.re = new Float64Array(this.size);
    this.im = new Float64Array(this.size);
    this.potential = new Float64Array(this.size);
    this.mask = null;
    this.time = 0;
    this.scratchRe = new Float64Array(this.size);
    this.scratchIm = new Float64Array(this.size);
    this.cache = null;
  }

  /**
   * Replace the potential energy (Hartree) on the grid.
   * @param {Float64Array|number[]} values
   */
  setPotentialValues(values) {
    if (values.length !== this.size) {
      throw new RangeError('Potential length does not match the grid');
    }
    this.potential.set(values);
    this.cache = null;
  }

  /**
   * Install a multiplicative absorbing mask (1 inside, < 1 at the edges)
   * that removes outgoing probability so it cannot wrap around the periodic
   * grid.
   * @param {Float64Array|null} mask
   */
  setMask(mask) {
    this.mask = mask;
  }

  /**
   * @param {Float64Array|number[]} re
   * @param {Float64Array|number[]} im
   */
  setWavefunction(re, im) {
    this.re.set(re);
    this.im.set(im);
    this.time = 0;
  }

  /** Total probability ∫|ψ|². */
  norm() {
    let sum = 0;
    for (let i = 0; i < this.size; i++) {
      sum += this.re[i] * this.re[i] + this.im[i] * this.im[i];
    }
    return sum * this.cellVolume;
  }

  /** Scale ψ so that ∫|ψ|² = 1. */
  normalize() {
    const norm = this.norm();
    if (!(norm > 0)) {
      throw new RangeError('Cannot normalise a zero wavefunction');
    }
    const scale = 1 / Math.sqrt(norm);
    for (let i = 0; i < this.size; i++) {
      this.re[i] *= scale;
      this.im[i] *= scale;
    }
  }

  /** @returns {Float64Array} Probability density |ψ|². */
  density() {
    const rho = new Float64Array(this.size);
    for (let i = 0; i < this.size; i++) {
      rho[i] = this.re[i] * this.re[i] + this.im[i] * this.im[i];
    }
    return rho;
  }

  prepare(dt, imaginary) {
    const cache = this.cache;
    if (cache && cache.dt === dt && cache.imaginary === imaginary) {
      return cache;
    }
    const halfV = { a: new Float64Array(this.size), b: null };
    const kinetic = { a: new Float64Array(this.size), b: null };
    if (imaginary) {
      for (let i = 0; i < this.size; i++) {
        halfV.a[i] = Math.exp((-this.potential[i] * dt) / 2);
        kinetic.a[i] = Math.exp((-this.kSquared[i] * dt) / (2 * this.mass));
      }
    } else {
      halfV.b = new Float64Array(this.size);
      kinetic.b = new Float64Array(this.size);
      for (let i = 0; i < this.size; i++) {
        const phaseV = (-this.potential[i] * dt) / 2;
        halfV.a[i] = Math.cos(phaseV);
        halfV.b[i] = Math.sin(phaseV);
        const phaseK = (-this.kSquared[i] * dt) / (2 * this.mass);
        kinetic.a[i] = Math.cos(phaseK);
        kinetic.b[i] = Math.sin(phaseK);
      }
    }
    this.cache = { dt, imaginary, halfV, kinetic };
    return this.cache;
  }

  applyFactor(factor) {
    const { re, im } = this;
    if (!factor.b) {
      for (let i = 0; i < this.size; i++) {
        re[i] *= factor.a[i];
        im[i] *= factor.a[i];
      }
      return;
    }
    for (let i = 0; i < this.size; i++) {
      const c = factor.a[i];
      const s = factor.b[i];
      const r = re[i];
      re[i] = r * c - im[i] * s;
      im[i] = r * s + im[i] * c;
    }
  }

  /**
   * Advance the wavefunction in real time.
   * @param {number} dt - Time step (atomic units).
   * @param {number} [steps=1]
   */
  step(dt, steps = 1) {
    const { halfV, kinetic } = this.prepare(dt, false);
    for (let s = 0; s < steps; s++) {
      this.applyFactor(halfV);
      this.fft.forward(this.re, this.im);
      this.applyFactor(kinetic);
      this.fft.inverse(this.re, this.im);
      this.applyFactor(halfV);
      if (this.mask) {
        for (let i = 0; i < this.size; i++) {
          this.re[i] *= this.mask[i];
          this.im[i] *= this.mask[i];
        }
      }
      this.time += dt;
    }
  }

  projectOut(states) {
    for (const state of states) {
      let overlapRe = 0;
      let overlapIm = 0;
      for (let i = 0; i < this.size; i++) {
        overlapRe += state.re[i] * this.re[i] + state.im[i] * this.im[i];
        overlapIm += state.re[i] * this.im[i] - state.im[i] * this.re[i];
      }
      overlapRe *= this.cellVolume;
      overlapIm *= this.cellVolume;
      for (let i = 0; i < this.size; i++) {
        this.re[i] -= overlapRe * state.re[i] - overlapIm * state.im[i];
        this.im[i] -= overlapRe * state.im[i] + overlapIm * state.re[i];
      }
    }
  }

  /**
   * Relax the current wavefunction to the lowest stationary state that is
   * orthogonal to `orthogonalTo` by propagating in imaginary time.
   * @param {object} [options]
   * @param {number} [options.dt=0.01]
   * @param {number} [options.maxSteps=20000]
   * @param {number} [options.tolerance=1e-10] - Energy change per check.
   * @param {Array<{re: Float64Array, im: Float64Array}>} [options.orthogonalTo]
   * @returns {{energy: number, steps: number, converged: boolean}}
   */
  relax({
    dt = 0.01,
    maxSteps = 20000,
    tolerance = 1e-10,
    orthogonalTo = [],
  } = {}) {
    const { halfV, kinetic } = this.prepare(dt, true);
    let previous = Infinity;
    let energy = Infinity;
    const checkEvery = 20;
    for (let s = 1; s <= maxSteps; s++) {
      this.applyFactor(halfV);
      this.fft.forward(this.re, this.im);
      this.applyFactor(kinetic);
      this.fft.inverse(this.re, this.im);
      this.applyFactor(halfV);
      this.projectOut(orthogonalTo);
      this.normalize();
      if (s % checkEvery === 0) {
        energy = this.energy();
        if (Math.abs(energy - previous) < tolerance) {
          this.time = 0;
          return { energy, steps: s, converged: true };
        }
        previous = energy;
      }
    }
    this.time = 0;
    return { energy: this.energy(), steps: maxSteps, converged: false };
  }

  /** Copy of the current state. */
  snapshot() {
    return { re: Float64Array.from(this.re), im: Float64Array.from(this.im) };
  }

  momentumSpace() {
    this.scratchRe.set(this.re);
    this.scratchIm.set(this.im);
    this.fft.forward(this.scratchRe, this.scratchIm);
    let total = 0;
    for (let i = 0; i < this.size; i++) {
      total +=
        this.scratchRe[i] * this.scratchRe[i] +
        this.scratchIm[i] * this.scratchIm[i];
    }
    return { re: this.scratchRe, im: this.scratchIm, total };
  }

  /** Kinetic energy expectation ⟨p²/2m⟩ / ⟨ψ|ψ⟩ (exact via Parseval). */
  kineticEnergy() {
    const { re, im, total } = this.momentumSpace();
    let sum = 0;
    for (let i = 0; i < this.size; i++) {
      sum += (re[i] * re[i] + im[i] * im[i]) * this.kSquared[i];
    }
    return sum / total / (2 * this.mass);
  }

  /** Potential energy expectation ⟨V⟩ / ⟨ψ|ψ⟩. */
  potentialEnergy() {
    let sum = 0;
    let total = 0;
    for (let i = 0; i < this.size; i++) {
      const p = this.re[i] * this.re[i] + this.im[i] * this.im[i];
      sum += p * this.potential[i];
      total += p;
    }
    return sum / total;
  }

  /** Total energy expectation ⟨H⟩. */
  energy() {
    return this.kineticEnergy() + this.potentialEnergy();
  }

  /**
   * Position moments along one axis.
   * @param {number} [axis=0]
   * @returns {{mean: number, variance: number}}
   */
  positionMoments(axis = 0) {
    const coordinate = this.positionAxes[axis];
    let total = 0;
    let first = 0;
    let second = 0;
    for (let i = 0; i < this.size; i++) {
      const p = this.re[i] * this.re[i] + this.im[i] * this.im[i];
      total += p;
      first += p * coordinate[i];
      second += p * coordinate[i] * coordinate[i];
    }
    const mean = first / total;
    return { mean, variance: Math.max(0, second / total - mean * mean) };
  }

  /**
   * Momentum moments along one axis (ħ = 1, so p = k).
   * @param {number} [axis=0]
   * @returns {{mean: number, variance: number}}
   */
  momentumMoments(axis = 0) {
    const k = this.momentumAxes[axis];
    const { re, im, total } = this.momentumSpace();
    let first = 0;
    let second = 0;
    for (let i = 0; i < this.size; i++) {
      const p = re[i] * re[i] + im[i] * im[i];
      first += p * k[i];
      second += p * k[i] * k[i];
    }
    const mean = first / total;
    return { mean, variance: Math.max(0, second / total - mean * mean) };
  }
}
