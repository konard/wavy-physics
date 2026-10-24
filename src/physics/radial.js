/**
 * Radial Schrödinger wave equation for a central potential, solved without
 * any analytic input: a trial wave is relaxed in imaginary time
 * (backward-Euler steps, i.e. ψ ← (1 + τH)⁻¹ψ) until only the lowest
 * standing wave survives. Excited waves are found the same way while
 * projecting out the lower ones (Gram–Schmidt).
 *
 * The reduced radial function u(r) = r R(r) obeys
 *   −u''/(2μ) + [l(l+1)/(2μ r²) + V(r)] u = E u,  u(0) = u(rMax) = 0.
 */

/**
 * Solve a symmetric tridiagonal system with constant off-diagonal (Thomas
 * algorithm).
 */
function solveTridiagonal(diagonal, offDiagonal, rhs, out, scratch) {
  const n = diagonal.length;
  scratch[0] = offDiagonal / diagonal[0];
  out[0] = rhs[0] / diagonal[0];
  for (let i = 1; i < n; i++) {
    const denominator = diagonal[i] - offDiagonal * scratch[i - 1];
    scratch[i] = offDiagonal / denominator;
    out[i] = (rhs[i] - offDiagonal * out[i - 1]) / denominator;
  }
  for (let i = n - 2; i >= 0; i--) {
    out[i] -= scratch[i] * out[i + 1];
  }
}

function dot(a, b, h) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum * h;
}

function projectAndNormalize(next, found, h) {
  for (const lower of found) {
    const overlap = dot(next, lower.u, h);
    for (let i = 0; i < next.length; i++) {
      next[i] -= overlap * lower.u[i];
    }
  }
  const scale = 1 / Math.sqrt(dot(next, next, h));
  for (let i = 0; i < next.length; i++) {
    next[i] *= scale;
  }
}

function radialEnergy(u, grid) {
  const { onSite, hop, h } = grid;
  const points = u.length;
  let sum = 0;
  for (let i = 0; i < points; i++) {
    const left = i > 0 ? u[i - 1] : 0;
    const right = i < points - 1 ? u[i + 1] : 0;
    sum += u[i] * (onSite[i] * u[i] + hop * (left + right));
  }
  return (sum * h) / dot(u, u, h);
}

function relaxState(grid, found, { l, tau, tolerance, maxIterations }) {
  const { r, h, diagonal, hop } = grid;
  // Generic trial wave: any shape with a non-zero overlap works.
  let u = r.map((value) => value ** (l + 1) * Math.exp(-value / 10));
  let next = new Float64Array(r.length);
  const scratch = new Float64Array(r.length);
  let energy = Infinity;
  let iterations = 0;
  for (; iterations < maxIterations; iterations++) {
    solveTridiagonal(diagonal, tau * hop, u, next, scratch);
    projectAndNormalize(next, found, h);
    [u, next] = [next, u];
    const updated = radialEnergy(u, grid);
    const change = Math.abs(updated - energy);
    energy = updated;
    if (change < tolerance) {
      break;
    }
  }
  return { energy, u, iterations };
}

/**
 * @param {object} [options]
 * @param {number} [options.l=0] - Orbital angular momentum.
 * @param {number} [options.states=1] - How many standing waves to find.
 * @param {number} [options.Z=1] - Nuclear charge (used by the default V).
 * @param {number} [options.mass=1] - Reduced mass in electron masses.
 * @param {Function} [options.potential] - V(r) in Hartree (default −Z/r).
 * @param {number} [options.rMax=60] - Box radius in bohr.
 * @param {number} [options.points=12000] - Interior grid points.
 * @param {number} [options.tau=1] - Imaginary time step.
 * @param {number} [options.tolerance=1e-12]
 * @param {number} [options.maxIterations=5000]
 * @returns {{r: Float64Array, states: Array<{energy: number,
 *   u: Float64Array, iterations: number}>}}
 */
export function solveRadialStates({
  l = 0,
  states = 1,
  Z = 1,
  mass = 1,
  potential = (r) => -Z / r,
  rMax = 60,
  points = 12000,
  tau = 1,
  tolerance = 1e-12,
  maxIterations = 5000,
} = {}) {
  const h = rMax / (points + 1);
  const r = new Float64Array(points);
  const onSite = new Float64Array(points);
  for (let i = 0; i < points; i++) {
    r[i] = (i + 1) * h;
    onSite[i] =
      1 / (mass * h * h) +
      (l * (l + 1)) / (2 * mass * r[i] * r[i]) +
      potential(r[i]);
  }
  const hop = -1 / (2 * mass * h * h);
  const diagonal = onSite.map((value) => 1 + tau * value);
  const grid = { r, h, onSite, hop, diagonal };
  const found = [];
  for (let s = 0; s < states; s++) {
    found.push(relaxState(grid, found, { l, tau, tolerance, maxIterations }));
  }
  return { r, states: found };
}
