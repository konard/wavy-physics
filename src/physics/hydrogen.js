/**
 * Exact stationary waves of the hydrogen-like atom and their coherent
 * superpositions.
 *
 * Each eigenstate ψ_nlm(r, t) = R_nl(r) Y_lm(θ, φ) e^{-i E_n t} is an exact
 * standing-wave solution of the Schrödinger equation with the Coulomb
 * potential −Z/r (reduced-mass corrected). A superposition of eigenstates
 * with different energies is no longer stationary: its charge cloud beats at
 * the Bohr frequencies ω = (E_a − E_b)/ħ, which are exactly the frequencies of
 * the emitted light.
 */

import { AU, SI, reducedMass } from './constants.js';
import {
  gaussLegendre,
  logFactorial,
  laguerre,
  sphericalHarmonic,
} from './special-functions.js';

function atomOptions({ Z = 1, nucleusMass = AU.protonMass } = {}) {
  return { Z, mu: reducedMass(nucleusMass) };
}

function assertQuantumNumbers(n, l, m = 0) {
  if (
    !Number.isInteger(n) ||
    !Number.isInteger(l) ||
    !Number.isInteger(m) ||
    n < 1 ||
    l < 0 ||
    l >= n ||
    Math.abs(m) > l
  ) {
    throw new RangeError(`Invalid quantum numbers n=${n}, l=${l}, m=${m}`);
  }
}

/**
 * Non-relativistic (Schrödinger/Bohr) energy level in Hartree,
 * E_n = −μ Z² / (2 n²).
 * @param {number} n
 * @param {{Z?: number, nucleusMass?: number}} [options]
 */
export function hydrogenEnergy(n, options) {
  const { Z, mu } = atomOptions(options);
  return (-mu * Z * Z) / (2 * n * n);
}

/**
 * Dirac-equation energy (excluding rest mass) in Hartree for quantum
 * numbers n and j, with the leading reduced-mass correction. This is the
 * exact eigenvalue of the Dirac wave equation in a Coulomb field; QED
 * corrections (Lamb shift, ~4·10⁻⁶ relative for 1s) are not included.
 * @param {number} n
 * @param {number} j - Total angular momentum (l ± 1/2).
 * @param {{Z?: number, nucleusMass?: number}} [options]
 */
export function diracEnergy(n, j, options) {
  const { Z, mu } = atomOptions(options);
  const za = Z * SI.alpha;
  const kappa = j + 0.5;
  const delta = kappa - Math.sqrt(kappa * kappa - za * za);
  const restEnergy = mu * AU.c * AU.c;
  return restEnergy * (1 / Math.sqrt(1 + (za / (n - delta)) ** 2) - 1);
}

/**
 * Radial wavefunction R_nl(r) normalised so that ∫ R² r² dr = 1.
 * @param {number} n
 * @param {number} l
 * @param {number} r - Radius in bohr.
 * @param {{Z?: number, nucleusMass?: number}} [options]
 */
export function radialWavefunction(n, l, r, options) {
  assertQuantumNumbers(n, l);
  const { Z, mu } = atomOptions(options);
  const scale = (2 * Z * mu) / n;
  const rho = scale * r;
  const logNorm =
    0.5 *
    (3 * Math.log(scale) +
      logFactorial(n - l - 1) -
      Math.log(2 * n) -
      logFactorial(n + l));
  if (rho === 0) {
    return l === 0 ? Math.exp(logNorm) * laguerre(n - 1, 1, 0) : 0;
  }
  const logPart = logNorm - rho / 2 + l * Math.log(rho);
  return Math.exp(logPart) * laguerre(n - l - 1, 2 * l + 1, rho);
}

/**
 * Full eigenfunction ψ_nlm at a Cartesian point (bohr).
 * @param {{n: number, l: number, m: number}} state
 * @returns {[number, number]} [real, imaginary]
 */
export function hydrogenWavefunction({ n, l, m }, x, y, z, options) {
  assertQuantumNumbers(n, l, m);
  const r = Math.sqrt(x * x + y * y + z * z);
  const theta = r === 0 ? 0 : Math.acos(z / r);
  const phi = Math.atan2(y, x);
  const radial = radialWavefunction(n, l, r, options);
  const [yr, yi] = sphericalHarmonic(l, m, theta, phi);
  return [radial * yr, radial * yi];
}

/**
 * Radial dipole integral ∫ R_{n1 l1} R_{n2 l2} r³ dr in bohr (composite
 * Simpson rule on a range that covers both waves).
 */
export function radialDipoleIntegral(n1, l1, n2, l2, options) {
  const { Z, mu } = atomOptions(options);
  const decay = Z * mu * (1 / n1 + 1 / n2);
  const rMax = (80 + 6 * (n1 + n2)) / decay;
  const steps = 4000 + 200 * (n1 + n2);
  const h = rMax / steps;
  let sum = 0;
  for (let i = 0; i <= steps; i++) {
    const r = i * h;
    const weight = i === 0 || i === steps ? 1 : i % 2 === 1 ? 4 : 2;
    sum +=
      weight *
      radialWavefunction(n1, l1, r, options) *
      radialWavefunction(n2, l2, r, options) *
      r *
      r *
      r;
  }
  return (sum * h) / 3;
}

function thetaFunction(l, m, x) {
  const [value] = sphericalHarmonic(l, m, Math.acos(x), 0);
  return value;
}

/**
 * Angular matrix element ⟨l1 m1| r̂ |l2 m2⟩ for r̂ = (x, y, z)/r.
 * The φ integral is done analytically and the θ integral with exact
 * Gauss–Legendre quadrature.
 * @returns {{x: [number, number], y: [number, number], z: [number, number]}}
 */
export function angularDipole(l1, m1, l2, m2) {
  const zero = { x: [0, 0], y: [0, 0], z: [0, 0] };
  const dm = m1 - m2;
  if (Math.abs(dm) > 1 || Math.abs(l1 - l2) !== 1) {
    return zero;
  }
  const { nodes, weights } = gaussLegendre(l1 + l2 + 4);
  let integral = 0;
  for (let i = 0; i < nodes.length; i++) {
    const x = nodes[i];
    const factor = dm === 0 ? x : Math.sqrt(1 - x * x);
    integral +=
      weights[i] * thetaFunction(l1, m1, x) * thetaFunction(l2, m2, x) * factor;
  }
  if (dm === 0) {
    return { ...zero, z: [2 * Math.PI * integral, 0] };
  }
  // ∫ e^{-i m1 φ} e^{i m2 φ} cos φ dφ = π ;  sin φ → −iπ·dm
  return {
    x: [Math.PI * integral, 0],
    y: [0, -Math.PI * dm * integral],
    z: [0, 0],
  };
}

/**
 * Dipole matrix element ⟨a| r |b⟩ (bohr) between hydrogen eigenstates.
 * @param {{n: number, l: number, m: number}} a
 * @param {{n: number, l: number, m: number}} b
 * @returns {{x: [number, number], y: [number, number], z: [number, number]}}
 */
export function dipoleMatrixElement(a, b, options) {
  const angular = angularDipole(a.l, a.m, b.l, b.m);
  if (
    angular.x[0] === 0 &&
    angular.y[1] === 0 &&
    angular.z[0] === 0 &&
    angular.x[1] === 0
  ) {
    return angular;
  }
  const radial = radialDipoleIntegral(a.n, a.l, b.n, b.l, options);
  const scale = ([re, im]) => [re * radial, im * radial];
  return { x: scale(angular.x), y: scale(angular.y), z: scale(angular.z) };
}

function vectorNormSquared(vector) {
  return ['x', 'y', 'z'].reduce(
    (sum, axis) => sum + vector[axis][0] ** 2 + vector[axis][1] ** 2,
    0
  );
}

/**
 * Spontaneous-emission rate (Einstein A coefficient, s⁻¹) from the level
 * (n, l) to the level (n', l'), summed over final m:
 *   A = 4 ω³ |⟨f|r|i⟩|² / (3 c³)   (atomic units).
 */
export function einsteinA(upper, lower, options) {
  if (Math.abs(upper.l - lower.l) !== 1 || lower.n >= upper.n) {
    return 0;
  }
  const omega =
    hydrogenEnergy(upper.n, options) - hydrogenEnergy(lower.n, options);
  let dipoleSquared = 0;
  for (let m = -lower.l; m <= lower.l; m++) {
    dipoleSquared += vectorNormSquared(
      dipoleMatrixElement(
        { n: lower.n, l: lower.l, m },
        { n: upper.n, l: upper.l, m: 0 },
        options
      )
    );
  }
  const rateAU = (4 * omega ** 3 * dipoleSquared) / (3 * AU.c ** 3);
  return rateAU / AU.time;
}

/**
 * Radiative lifetime (seconds) of the level (n, l): 1 / Σ A over all
 * lower levels allowed by the electric-dipole selection rule Δl = ±1.
 */
export function radiativeLifetime(n, l, options) {
  assertQuantumNumbers(n, l);
  let total = 0;
  for (let lowerN = 1; lowerN < n; lowerN++) {
    for (const lowerL of [l - 1, l + 1]) {
      if (lowerL >= 0 && lowerL < lowerN) {
        total += einsteinA({ n, l }, { n: lowerN, l: lowerL }, options);
      }
    }
  }
  return total > 0 ? 1 / total : Infinity;
}

/**
 * Vacuum wavelength (metres) of the n_upper → n_lower line.
 * @param {number} upper - Upper principal quantum number.
 * @param {number} lower - Lower principal quantum number.
 * @param {{Z?: number, nucleusMass?: number, jUpper?: number,
 *   jLower?: number}} [options] - Supply j values to use Dirac energies.
 */
export function transitionWavelength(upper, lower, options = {}) {
  const { jUpper, jLower } = options;
  const energy =
    jUpper !== undefined && jLower !== undefined
      ? diracEnergy(upper, jUpper, options) -
        diracEnergy(lower, jLower, options)
      : hydrogenEnergy(upper, options) - hydrogenEnergy(lower, options);
  return (SI.h * SI.c) / (energy * SI.Eh);
}

function normaliseAmplitude(amplitude) {
  if (Array.isArray(amplitude)) {
    return amplitude;
  }
  return [amplitude ?? 1, 0];
}

/**
 * Time-dependent coherent superposition Σ c_k ψ_k e^{−iE_k t} of hydrogen
 * eigenstates — an exact solution of the time-dependent Schrödinger
 * equation for the Coulomb problem.
 */
export class HydrogenSuperposition {
  /**
   * @param {Array<{n: number, l: number, m: number,
   *   amplitude?: number|[number, number]}>} terms
   * @param {{Z?: number, nucleusMass?: number}} [options]
   */
  constructor(terms, options = {}) {
    if (!terms.length) {
      throw new RangeError('A superposition needs at least one state');
    }
    this.options = options;
    let total = 0;
    this.terms = terms.map((term) => {
      assertQuantumNumbers(term.n, term.l, term.m);
      const amplitude = normaliseAmplitude(term.amplitude);
      total += amplitude[0] ** 2 + amplitude[1] ** 2;
      return {
        n: term.n,
        l: term.l,
        m: term.m,
        amplitude,
        energy: hydrogenEnergy(term.n, options),
      };
    });
    const scale = 1 / Math.sqrt(total);
    for (const term of this.terms) {
      term.amplitude = [term.amplitude[0] * scale, term.amplitude[1] * scale];
    }
    this.dipoleCache = null;
  }

  /** Complex coefficient c_k e^{−iE_k t} of term k. */
  coefficient(k, t) {
    const term = this.terms[k];
    const c = Math.cos(-term.energy * t);
    const s = Math.sin(-term.energy * t);
    const [ar, ai] = term.amplitude;
    return [ar * c - ai * s, ar * s + ai * c];
  }

  /** ψ(x, y, z, t) as [re, im]. */
  evaluate(x, y, z, t = 0) {
    let re = 0;
    let im = 0;
    for (let k = 0; k < this.terms.length; k++) {
      const [pr, pi] = hydrogenWavefunction(
        this.terms[k],
        x,
        y,
        z,
        this.options
      );
      const [cr, ci] = this.coefficient(k, t);
      re += cr * pr - ci * pi;
      im += cr * pi + ci * pr;
    }
    return [re, im];
  }

  /** Probability density |ψ|² at (x, y, z, t). */
  density(x, y, z, t = 0) {
    const [re, im] = this.evaluate(x, y, z, t);
    return re * re + im * im;
  }

  /** Energy expectation ⟨H⟩ in Hartree (time independent). */
  energy() {
    return this.terms.reduce(
      (sum, term) =>
        sum + (term.amplitude[0] ** 2 + term.amplitude[1] ** 2) * term.energy,
      0
    );
  }

  dipoleMatrix() {
    if (!this.dipoleCache) {
      this.dipoleCache = this.terms.map((a) =>
        this.terms.map((b) => dipoleMatrixElement(a, b, this.options))
      );
    }
    return this.dipoleCache;
  }

  /**
   * Expectation of the electron position ⟨r⟩(t) in bohr. The electric
   * dipole moment of the atom is −e⟨r⟩; its second derivative is what
   * radiates.
   * @returns {[number, number, number]}
   */
  expectationPosition(t = 0) {
    const matrix = this.dipoleMatrix();
    const result = [0, 0, 0];
    const coefficients = this.terms.map((_, k) => this.coefficient(k, t));
    for (let a = 0; a < this.terms.length; a++) {
      const [ar, ai] = coefficients[a];
      for (let b = 0; b < this.terms.length; b++) {
        const [br, bi] = coefficients[b];
        // conj(c_a) c_b
        const pr = ar * br + ai * bi;
        const pi = ar * bi - ai * br;
        ['x', 'y', 'z'].forEach((axis, index) => {
          const [dr, di] = matrix[a][b][axis];
          result[index] += pr * dr - pi * di;
        });
      }
    }
    return result;
  }

  /**
   * Precompute the basis on a planar grid so the density can be animated
   * cheaply: density(t) only recombines cached complex values.
   * @param {object} [options]
   * @param {'xy'|'xz'} [options.plane='xz']
   * @param {number} [options.extent=20] - Half width in bohr.
   * @param {number} [options.resolution=128]
   */
  createPlaneSampler({ plane = 'xz', extent = 20, resolution = 128 } = {}) {
    const size = resolution * resolution;
    const basis = this.terms.map((term) => {
      const re = new Float32Array(size);
      const im = new Float32Array(size);
      for (let row = 0; row < resolution; row++) {
        const v = extent - ((row + 0.5) * 2 * extent) / resolution;
        for (let col = 0; col < resolution; col++) {
          const u = -extent + ((col + 0.5) * 2 * extent) / resolution;
          const [x, y, z] = plane === 'xy' ? [u, v, 0] : [u, 0, v];
          const [pr, pi] = hydrogenWavefunction(term, x, y, z, this.options);
          re[row * resolution + col] = pr;
          im[row * resolution + col] = pi;
        }
      }
      return { re, im };
    });
    return {
      resolution,
      extent,
      plane,
      density: (t, out = new Float32Array(size)) => {
        const coefficients = this.terms.map((_, k) => this.coefficient(k, t));
        for (let i = 0; i < size; i++) {
          let re = 0;
          let im = 0;
          for (let k = 0; k < basis.length; k++) {
            const [cr, ci] = coefficients[k];
            re += cr * basis[k].re[i] - ci * basis[k].im[i];
            im += cr * basis[k].im[i] + ci * basis[k].re[i];
          }
          out[i] = re * re + im * im;
        }
        return out;
      },
    };
  }
}

/**
 * Circular-orbit Rydberg wave packet: a Gaussian superposition of circular
 * states (l = m = n − 1) centred on nMean. The packet orbits the nucleus at
 * the classical Kepler period 2π n³ (atomic units), spreads, and later
 * revives — the electron "orbit" emerges from interfering standing waves.
 * @param {{nMean?: number, width?: number, count?: number,
 *   Z?: number, nucleusMass?: number}} [options]
 */
export function circularWavePacket({
  nMean = 12,
  width = 1.5,
  count = 7,
  ...atom
} = {}) {
  const start = Math.max(1, Math.round(nMean - (count - 1) / 2));
  const terms = [];
  for (let n = start; n < start + count; n++) {
    terms.push({
      n,
      l: n - 1,
      m: n - 1,
      // (−1)^l cancels the Condon–Shortley phase so the packet starts on +x.
      amplitude:
        (-1) ** (n - 1) * Math.exp(-((n - nMean) ** 2) / (4 * width * width)),
    });
  }
  return new HydrogenSuperposition(terms, atom);
}

/** Classical Kepler period 2π n³ / (μ Z²) for level n (atomic units). */
export function keplerPeriod(n, options) {
  const { Z, mu } = atomOptions(options);
  return (2 * Math.PI * n ** 3) / (mu * Z * Z);
}
