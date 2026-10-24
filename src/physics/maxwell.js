/**
 * Maxwell's equations on a Yee grid (finite-difference time domain).
 *
 * Light is computed here as what it is in classical electrodynamics: a
 * self-sustaining wave of coupled E and H fields. Units are normalised so
 * that c = 1, ε₀ = μ₀ = 1, the cell size is 1 and the time step equals the
 * Courant number S (S ≤ 1 in 1D, S ≤ 1/√2 in 2D for stability).
 *
 * Open boundaries use a graded, impedance-matched conducting layer (σ_m = σ
 * so the layer is reflectionless at normal incidence in the continuum
 * limit; the grading keeps the numerical reflection small).
 */

function gradedConductivity(distance, width, maxConductivity) {
  if (distance >= width) {
    return 0;
  }
  const depth = (width - distance) / width;
  return maxConductivity * depth ** 3;
}

/**
 * Peak conductivity for a cubic-graded layer of `width` cells aiming at a
 * normal-incidence reflection R₀ = 10⁻⁶: σ_max = (m + 1) ln(1/R₀) / (2 d).
 */
function peakConductivity(width) {
  return width > 0 ? (4 * Math.log(1e6)) / (2 * width) : 0;
}

function lossCoefficients(sigma, dt) {
  const loss = (sigma * dt) / 2;
  return { keep: (1 - loss) / (1 + loss), drive: dt / (1 + loss) };
}

export class FDTD1D {
  /**
   * @param {object} [options]
   * @param {number} [options.cells=800]
   * @param {number} [options.courant=0.5]
   * @param {number} [options.absorbingCells=60]
   * @param {Function|number} [options.permittivity=1] - ε_r(i).
   */
  constructor({
    cells = 800,
    courant = 0.5,
    absorbingCells = 60,
    permittivity = 1,
  } = {}) {
    if (!(courant > 0 && courant <= 1)) {
      throw new RangeError('1D FDTD needs 0 < S ≤ 1');
    }
    this.cells = cells;
    this.dt = courant;
    this.ez = new Float64Array(cells);
    this.hy = new Float64Array(cells - 1);
    this.ezKeep = new Float64Array(cells);
    this.ezDrive = new Float64Array(cells);
    this.hyKeep = new Float64Array(cells - 1);
    this.hyDrive = new Float64Array(cells - 1);
    this.permittivity = new Float64Array(cells);
    const maxSigma = peakConductivity(absorbingCells);
    for (let i = 0; i < cells; i++) {
      const eps =
        typeof permittivity === 'function' ? permittivity(i) : permittivity;
      this.permittivity[i] = eps;
      const edge = Math.min(i, cells - 1 - i);
      const sigma = gradedConductivity(edge, absorbingCells, maxSigma);
      const { keep, drive } = lossCoefficients(sigma, this.dt);
      this.ezKeep[i] = keep;
      this.ezDrive[i] = drive / eps;
    }
    for (let i = 0; i < cells - 1; i++) {
      const edge = Math.min(i + 0.5, cells - 1.5 - i);
      const sigma = gradedConductivity(edge, absorbingCells, maxSigma);
      const { keep, drive } = lossCoefficients(sigma, this.dt);
      this.hyKeep[i] = keep;
      this.hyDrive[i] = drive;
    }
    this.time = 0;
    this.sources = [];
  }

  /**
   * Load a right-moving (direction = 1) or left-moving (−1) Gaussian pulse
   * Ez = exp(−((x − center)/width)²) with the matching Hy, staggered half a
   * cell and half a step.
   */
  setPulse({ center = 200, width = 20, direction = 1, amplitude = 1 } = {}) {
    const shape = (x) => amplitude * Math.exp(-(((x - center) / width) ** 2));
    for (let i = 0; i < this.cells; i++) {
      this.ez[i] = shape(i);
    }
    for (let i = 0; i < this.cells - 1; i++) {
      this.hy[i] = -direction * shape(i + 0.5 + (direction * this.dt) / 2);
    }
    this.time = 0;
  }

  /**
   * Add a soft current source J(t) at a cell (adds −J·dt/ε to Ez).
   * @param {number} cell
   * @param {(t: number) => number} current
   */
  addSource(cell, current) {
    this.sources.push({ cell, current });
  }

  step(steps = 1) {
    const { ez, hy } = this;
    const n = this.cells;
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < n - 1; i++) {
        hy[i] = this.hyKeep[i] * hy[i] + this.hyDrive[i] * (ez[i + 1] - ez[i]);
      }
      for (let i = 1; i < n - 1; i++) {
        ez[i] = this.ezKeep[i] * ez[i] + this.ezDrive[i] * (hy[i] - hy[i - 1]);
      }
      const t = this.time + this.dt / 2;
      for (const { cell, current } of this.sources) {
        ez[cell] -= this.ezDrive[cell] * current(t);
      }
      this.time += this.dt;
    }
  }

  /** Electromagnetic energy ½ Σ (ε E² + H²). */
  energy() {
    let sum = 0;
    for (let i = 0; i < this.cells; i++) {
      sum += this.permittivity[i] * this.ez[i] ** 2;
    }
    for (let i = 0; i < this.cells - 1; i++) {
      sum += this.hy[i] ** 2;
    }
    return sum / 2;
  }
}

/**
 * Two-dimensional TE_z Yee scheme (fields Ex, Ey, Hz). A point current Jx
 * is an oscillating electric dipole along x: it radiates with the dipole
 * pattern |Hz|² ∝ sin²φ (zero along the dipole axis).
 *
 * Index layout: Hz[i,j] at (i+½, j+½), Ex[i,j] at (i+½, j), Ey[i,j] at
 * (i, j+½); arrays are row-major with index j·nx + i.
 */
export class FDTD2D {
  /**
   * @param {object} [options]
   * @param {number} [options.nx=200]
   * @param {number} [options.ny=200]
   * @param {number} [options.courant=0.5]
   * @param {number} [options.absorbingCells=24]
   * @param {Function|number} [options.permittivity=1] - ε_r(i, j).
   */
  constructor({
    nx = 200,
    ny = 200,
    courant = 0.5,
    absorbingCells = 24,
    permittivity = 1,
  } = {}) {
    if (!(courant > 0 && courant <= Math.SQRT1_2)) {
      throw new RangeError('2D FDTD needs 0 < S ≤ 1/√2');
    }
    this.nx = nx;
    this.ny = ny;
    this.dt = courant;
    const size = nx * ny;
    this.ex = new Float64Array(size);
    this.ey = new Float64Array(size);
    this.hz = new Float64Array(size);
    this.eKeep = new Float64Array(size);
    this.eDrive = new Float64Array(size);
    this.hKeep = new Float64Array(size);
    this.hDrive = new Float64Array(size);
    const maxSigma = peakConductivity(absorbingCells);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const index = j * nx + i;
        const edge = Math.min(i, j, nx - 1 - i, ny - 1 - j);
        const sigma = gradedConductivity(edge, absorbingCells, maxSigma);
        const eps =
          typeof permittivity === 'function'
            ? permittivity(i, j)
            : permittivity;
        const electric = lossCoefficients(sigma, this.dt);
        this.eKeep[index] = electric.keep;
        this.eDrive[index] = electric.drive / eps;
        this.hKeep[index] = electric.keep;
        this.hDrive[index] = electric.drive;
      }
    }
    this.time = 0;
    this.sources = [];
  }

  /**
   * Point electric-dipole source: current density J(t) along `axis`.
   * @param {{i: number, j: number, axis?: 'x'|'y',
   *   current: (t: number) => number}} source
   */
  addDipole({ i, j, axis = 'x', current }) {
    this.sources.push({ index: j * this.nx + i, axis, current });
  }

  updateMagnetic() {
    const { nx, ny, ex, ey, hz } = this;
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const index = j * nx + i;
        const curl = ex[index + nx] - ex[index] - (ey[index + 1] - ey[index]);
        hz[index] = this.hKeep[index] * hz[index] + this.hDrive[index] * curl;
      }
    }
  }

  updateElectric() {
    const { nx, ny, ex, ey, hz } = this;
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const index = j * nx + i;
        const keep = this.eKeep[index];
        const drive = this.eDrive[index];
        ex[index] = keep * ex[index] + drive * (hz[index] - hz[index - nx]);
        ey[index] = keep * ey[index] - drive * (hz[index] - hz[index - 1]);
      }
    }
  }

  step(steps = 1) {
    for (let s = 0; s < steps; s++) {
      this.updateMagnetic();
      this.updateElectric();
      const t = this.time + this.dt / 2;
      for (const { index, axis, current } of this.sources) {
        const target = axis === 'x' ? this.ex : this.ey;
        target[index] -= this.eDrive[index] * current(t);
      }
      this.time += this.dt;
    }
  }

  /** Hz sampled at the nearest cell to (x, y) in cell units. */
  sampleHz(x, y) {
    const i = Math.round(x - 0.5);
    const j = Math.round(y - 0.5);
    return this.hz[j * this.nx + i];
  }
}
