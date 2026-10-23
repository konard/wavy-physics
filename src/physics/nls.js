/**
 * Nonlinear Schrödinger equation  i ψ_t = −½ ψ_xx + g |ψ|² ψ + V ψ.
 *
 * With g < 0 (focusing) the equation has solitons: localized waves that keep
 * their shape forever and pass through each other unchanged. They are the
 * textbook example of a "particle" made purely of a wave.
 */

import { Schrodinger1D } from './schrodinger.js';

/**
 * Exact bright soliton of i ψ_t = −½ ψ_xx − |ψ|² ψ:
 *   ψ = η sech(η (x − x0 − v t)) exp(i (v x + (η² − v²) t / 2 + phase)).
 * @param {{eta?: number, velocity?: number, x0?: number, phase?: number}} soliton
 * @param {number} x
 * @param {number} [t=0]
 * @returns {[number, number]}
 */
export function brightSoliton(
  { eta = 1, velocity = 0, x0 = 0, phase = 0 },
  x,
  t = 0
) {
  const amplitude = eta / Math.cosh(eta * (x - x0 - velocity * t));
  const theta =
    velocity * x + ((eta * eta - velocity * velocity) * t) / 2 + phase;
  return [amplitude * Math.cos(theta), amplitude * Math.sin(theta)];
}

export class NonlinearSchrodinger1D extends Schrodinger1D {
  /**
   * @param {object} [options] - Same grid options as Schrodinger1D.
   * @param {number} [options.coupling=-1] - g (negative = focusing).
   */
  constructor({ coupling = -1, ...options } = {}) {
    super(options);
    this.coupling = coupling;
  }

  /**
   * Superpose solitons (sum of exact profiles; accurate when they are well
   * separated).
   * @param {Array<object>} solitons - brightSoliton parameter objects.
   */
  setSolitons(solitons) {
    this.re.fill(0);
    this.im.fill(0);
    for (const soliton of solitons) {
      for (let i = 0; i < this.n; i++) {
        const [re, im] = brightSoliton(soliton, this.x[i]);
        this.re[i] += re;
        this.im[i] += im;
      }
    }
    this.time = 0;
  }

  nonlinearHalfStep(dt) {
    for (let i = 0; i < this.size; i++) {
      const rho = this.re[i] ** 2 + this.im[i] ** 2;
      const phase = (-(this.potential[i] + this.coupling * rho) * dt) / 2;
      const c = Math.cos(phase);
      const s = Math.sin(phase);
      const r = this.re[i];
      this.re[i] = r * c - this.im[i] * s;
      this.im[i] = r * s + this.im[i] * c;
    }
  }

  /**
   * Strang split step: nonlinear half step, exact kinetic step in Fourier
   * space, nonlinear half step. Norm is conserved to round-off.
   */
  step(dt, steps = 1) {
    const { kinetic } = this.prepare(dt, false);
    for (let s = 0; s < steps; s++) {
      this.nonlinearHalfStep(dt);
      this.fft.forward(this.re, this.im);
      this.applyFactor(kinetic);
      this.fft.inverse(this.re, this.im);
      this.nonlinearHalfStep(dt);
      if (this.mask) {
        for (let i = 0; i < this.size; i++) {
          this.re[i] *= this.mask[i];
          this.im[i] *= this.mask[i];
        }
      }
      this.time += dt;
    }
  }

  /**
   * Conserved energy (not divided by the norm, which for NLS is a physical
   * quantity): ∫ ½|ψ_x|² + V|ψ|² + (g/2)|ψ|⁴ dx.
   */
  energy() {
    let interaction = 0;
    for (let i = 0; i < this.size; i++) {
      interaction += (this.re[i] ** 2 + this.im[i] ** 2) ** 2;
    }
    const norm = this.norm();
    return (
      (this.kineticEnergy() + this.potentialEnergy()) * norm +
      (this.coupling / 2) * interaction * this.dx
    );
  }

  /**
   * Largest deviation of |ψ| from a reference soliton at the current time.
   * @param {object} soliton
   */
  solitonError(soliton) {
    let worst = 0;
    for (let i = 0; i < this.n; i++) {
      const [re, im] = brightSoliton(soliton, this.x[i], this.time);
      const exact = Math.hypot(re, im);
      const actual = Math.hypot(this.re[i], this.im[i]);
      worst = Math.max(worst, Math.abs(exact - actual));
    }
    return worst;
  }
}
