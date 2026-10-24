/**
 * Special functions used by the exact hydrogen eigenstates: log-factorial,
 * generalised Laguerre polynomials, associated Legendre functions and
 * spherical harmonics (Condon–Shortley phase), plus Gauss–Legendre nodes.
 */

const logFactorialCache = [0];

/**
 * ln(n!) for non-negative integers (exact summation, cached).
 * @param {number} n
 */
export function logFactorial(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`logFactorial needs a non-negative integer, got ${n}`);
  }
  for (let i = logFactorialCache.length; i <= n; i++) {
    logFactorialCache[i] = logFactorialCache[i - 1] + Math.log(i);
  }
  return logFactorialCache[n];
}

/**
 * Generalised Laguerre polynomial L_k^{(alpha)}(x) via the three-term
 * recurrence.
 * @param {number} k - Degree (≥ 0).
 * @param {number} alpha
 * @param {number} x
 */
export function laguerre(k, alpha, x) {
  if (k === 0) {
    return 1;
  }
  let previous = 1;
  let current = 1 + alpha - x;
  for (let i = 1; i < k; i++) {
    const next =
      ((2 * i + 1 + alpha - x) * current - (i + alpha) * previous) / (i + 1);
    previous = current;
    current = next;
  }
  return current;
}

/**
 * Associated Legendre function P_l^m(x) for m ≥ 0 including the
 * Condon–Shortley phase (−1)^m.
 * @param {number} l
 * @param {number} m - 0 ≤ m ≤ l
 * @param {number} x - cos θ
 */
export function associatedLegendre(l, m, x) {
  let pmm = 1;
  if (m > 0) {
    const s = Math.sqrt(Math.max(0, (1 - x) * (1 + x)));
    let factor = 1;
    for (let i = 1; i <= m; i++) {
      pmm *= -factor * s;
      factor += 2;
    }
  }
  if (l === m) {
    return pmm;
  }
  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) {
    return pmmp1;
  }
  let pll = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}

/**
 * Complex spherical harmonic Y_l^m(θ, φ) (Condon–Shortley convention).
 * @returns {[number, number]} [real, imaginary]
 */
export function sphericalHarmonic(l, m, theta, phi) {
  const am = Math.abs(m);
  const logNorm =
    0.5 *
    (Math.log((2 * l + 1) / (4 * Math.PI)) +
      logFactorial(l - am) -
      logFactorial(l + am));
  let value = Math.exp(logNorm) * associatedLegendre(l, am, Math.cos(theta));
  if (m < 0 && am % 2 === 1) {
    value = -value;
  }
  return [value * Math.cos(m * phi), value * Math.sin(m * phi)];
}

/**
 * Gauss–Legendre quadrature nodes and weights on [-1, 1].
 * @param {number} n - Number of nodes.
 * @returns {{nodes: Float64Array, weights: Float64Array}}
 */
export function gaussLegendre(n) {
  const nodes = new Float64Array(n);
  const weights = new Float64Array(n);
  for (let i = 0; i < Math.ceil(n / 2); i++) {
    let x = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    let derivative = 1;
    for (let iteration = 0; iteration < 100; iteration++) {
      let p0 = 1;
      let p1 = x;
      for (let k = 2; k <= n; k++) {
        const p2 = ((2 * k - 1) * x * p1 - (k - 1) * p0) / k;
        p0 = p1;
        p1 = p2;
      }
      derivative = (n * (x * p1 - p0)) / (x * x - 1);
      const dx = p1 / derivative;
      x -= dx;
      if (Math.abs(dx) < 1e-15) {
        break;
      }
    }
    nodes[i] = -x;
    nodes[n - 1 - i] = x;
    const w = 2 / ((1 - x * x) * derivative * derivative);
    weights[i] = w;
    weights[n - 1 - i] = w;
  }
  return { nodes, weights };
}
