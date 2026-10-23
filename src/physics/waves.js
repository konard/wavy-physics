/**
 * Classical waves and "waves made of waves": the 1D wave equation,
 * Fourier synthesis (every shape is a sum of sine waves), the Weierstrass
 * function (a wave built from waves on every scale — a genuine fractal) and
 * the phase/group velocities that make a packet of waves behave like a
 * moving particle.
 */

/**
 * Vibrating string u_tt = c² u_xx with fixed ends, central-difference
 * leapfrog. At Courant number S = cΔt/Δx = 1 the scheme reproduces
 * d'Alembert's solution exactly on the grid.
 */
export class StringWave {
  /**
   * @param {object} [options]
   * @param {number} [options.points=401] - Grid points including both ends.
   * @param {number} [options.length=1]
   * @param {number} [options.speed=1]
   * @param {number} [options.courant=1]
   */
  constructor({ points = 401, length = 1, speed = 1, courant = 1 } = {}) {
    if (!(courant > 0 && courant <= 1)) {
      throw new RangeError('Leapfrog needs 0 < S ≤ 1');
    }
    this.points = points;
    this.dx = length / (points - 1);
    this.dt = (courant * this.dx) / speed;
    this.courant = courant;
    this.speed = speed;
    this.x = Float64Array.from({ length: points }, (_, i) => i * this.dx);
    this.current = new Float64Array(points);
    this.previous = new Float64Array(points);
    this.time = 0;
  }

  /**
   * Start from rest with displacement f(x) (first step by Taylor expansion,
   * exact for the discrete scheme).
   * @param {(x: number) => number} shape
   */
  setDisplacement(shape) {
    const s2 = this.courant ** 2;
    const n = this.points;
    for (let i = 0; i < n; i++) {
      this.previous[i] = i === 0 || i === n - 1 ? 0 : shape(this.x[i]);
    }
    for (let i = 1; i < n - 1; i++) {
      this.current[i] =
        this.previous[i] +
        (s2 / 2) *
          (this.previous[i + 1] - 2 * this.previous[i] + this.previous[i - 1]);
    }
    this.current[0] = 0;
    this.current[n - 1] = 0;
    // `current` is u(dt); keep a consistent clock.
    this.time = this.dt;
  }

  step(steps = 1) {
    const s2 = this.courant ** 2;
    const n = this.points;
    for (let s = 0; s < steps; s++) {
      for (let i = 1; i < n - 1; i++) {
        this.previous[i] =
          2 * this.current[i] -
          this.previous[i] +
          s2 *
            (this.current[i + 1] - 2 * this.current[i] + this.current[i - 1]);
      }
      [this.current, this.previous] = [this.previous, this.current];
      this.time += this.dt;
    }
  }

  /** Displacement at grid points (copy). */
  displacement() {
    return Float64Array.from(this.current);
  }
}

/**
 * d'Alembert solution on a string with fixed ends at 0 and L, released from
 * rest: u = ½[f(x − ct) + f(x + ct)] with f extended odd and 2L-periodic.
 */
export function dAlembert(shape, x, t, { length = 1, speed = 1 } = {}) {
  const extended = (s) => {
    const period = 2 * length;
    let y = ((s % period) + period) % period;
    let sign = 1;
    if (y > length) {
      y = period - y;
      sign = -1;
    }
    return sign * shape(y);
  };
  return 0.5 * (extended(x - speed * t) + extended(x + speed * t));
}

/**
 * Partial Fourier sum of a square wave of amplitude 1 and period 2π:
 * (4/π) Σ_{k odd ≤ 2N−1} sin(kx)/k.
 */
export function squareWavePartialSum(x, terms) {
  let sum = 0;
  for (let k = 1; k <= 2 * terms - 1; k += 2) {
    sum += Math.sin(k * x) / k;
  }
  return (4 / Math.PI) * sum;
}

/**
 * Peak of the square-wave partial sum (Gibbs phenomenon). It tends to
 * (2/π) Si(π) ≈ 1.178979744 — an overshoot of ≈ 8.95 % of the jump.
 */
export function gibbsPeak(terms) {
  // The first maximum sits at x = π/(2N).
  return squareWavePartialSum(Math.PI / (2 * terms), terms);
}

/**
 * Weierstrass function W(x) = Σ aⁿ cos(bⁿ π x): a wave whose every crest is
 * itself made of smaller waves, continuous everywhere but differentiable
 * nowhere (for 0 < a < 1, ab ≥ 1). Graph box dimension D = 2 + ln a / ln b.
 */
export function weierstrass(x, { a = 0.5, b = 3, terms = 30 } = {}) {
  let sum = 0;
  let amplitude = 1;
  let frequency = Math.PI;
  for (let n = 0; n < terms; n++) {
    sum += amplitude * Math.cos(frequency * x);
    amplitude *= a;
    frequency *= b;
  }
  return sum;
}

/** Theoretical box-counting dimension of the Weierstrass graph. */
export function weierstrassDimension({ a = 0.5, b = 3 } = {}) {
  return 2 + Math.log(a) / Math.log(b);
}

/**
 * Box-counting (variation method) estimate of a graph's fractal dimension
 * from samples on [0, 1]: N(δ) ≈ Σ (oscillation in column)/δ, D = slope of
 * log N against log(1/δ). The default scales are powers of 3, which match
 * the default Weierstrass frequency ratio b = 3.
 * @param {Float64Array|number[]} samples - Uniform samples on [0, 1].
 * @param {number[]} [boxCounts] - Numbers of columns per scale.
 */
export function boxCountingDimension(samples, boxCounts = [27, 81, 243, 729]) {
  const points = samples.length - 1;
  const logs = boxCounts.map((columns) => {
    const delta = 1 / columns;
    const perColumn = points / columns;
    let boxes = 0;
    for (let c = 0; c < columns; c++) {
      let low = Infinity;
      let high = -Infinity;
      for (
        let i = Math.floor(c * perColumn);
        i <= Math.floor((c + 1) * perColumn);
        i++
      ) {
        low = Math.min(low, samples[i]);
        high = Math.max(high, samples[i]);
      }
      boxes += (high - low) / delta;
    }
    return [Math.log(columns), Math.log(boxes)];
  });
  const count = logs.length;
  const meanX = logs.reduce((s, [x]) => s + x, 0) / count;
  const meanY = logs.reduce((s, [, y]) => s + y, 0) / count;
  let numerator = 0;
  let denominator = 0;
  for (const [x, y] of logs) {
    numerator += (x - meanX) * (y - meanY);
    denominator += (x - meanX) ** 2;
  }
  return numerator / denominator;
}

/**
 * Phase and group velocity for a dispersion relation ω(k) (central
 * difference for dω/dk).
 * @param {(k: number) => number} omega
 * @param {number} k
 */
export function waveVelocities(omega, k, h = 1e-6) {
  return {
    phase: omega(k) / k,
    group: (omega(k + h) - omega(k - h)) / (2 * h),
  };
}

/** Schrödinger (de Broglie) dispersion ω = ħk²/(2m) in units ħ = 1. */
export function schrodingerDispersion(mass = 1) {
  return (k) => (k * k) / (2 * mass);
}

/** Relativistic matter-wave dispersion ω = √(c²k² + m²c⁴) (ħ = 1). */
export function relativisticDispersion(mass = 1, c = 1) {
  return (k) => Math.sqrt(c * c * k * k + mass * mass * c ** 4);
}
