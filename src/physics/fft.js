/**
 * Radix-2 complex fast Fourier transform on split real/imaginary arrays.
 *
 * The FFT is the core of every spectral wave solver in this library: it
 * rewrites any wave as a superposition of plane waves e^{ikx}, which is
 * where the kinetic (dispersive) part of each wave equation is exact.
 */

/**
 * @param {number} n
 * @returns {boolean} Whether n is a positive power of two.
 */
export function isPowerOfTwo(n) {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

/** Reusable FFT plan for a fixed power-of-two length. */
export class FFT {
  /**
   * @param {number} n - Transform length (power of two).
   */
  constructor(n) {
    if (!isPowerOfTwo(n)) {
      throw new RangeError(`FFT length must be a power of two, got ${n}`);
    }
    this.n = n;
    this.cos = new Float64Array(n / 2);
    this.sin = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      const angle = (-2 * Math.PI * i) / n;
      this.cos[i] = Math.cos(angle);
      this.sin[i] = Math.sin(angle);
    }
    this.reverse = new Uint32Array(n);
    const bits = Math.log2(n);
    for (let i = 0; i < n; i++) {
      let reversed = 0;
      for (let b = 0; b < bits; b++) {
        reversed = (reversed << 1) | ((i >> b) & 1);
      }
      this.reverse[i] = reversed;
    }
  }

  /**
   * In-place transform. The forward transform uses e^{-ikx}; the inverse
   * transform uses e^{+ikx} and divides by n.
   * @param {Float64Array} re - Real parts (length n).
   * @param {Float64Array} im - Imaginary parts (length n).
   * @param {boolean} [inverse=false]
   */
  transform(re, im, inverse = false) {
    const { n, reverse } = this;
    for (let i = 0; i < n; i++) {
      const j = reverse[i];
      if (j > i) {
        let t = re[i];
        re[i] = re[j];
        re[j] = t;
        t = im[i];
        im[i] = im[j];
        im[j] = t;
      }
    }
    const sign = inverse ? -1 : 1;
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let start = 0; start < n; start += size) {
        for (let k = 0; k < half; k++) {
          const wr = this.cos[k * step];
          const wi = sign * this.sin[k * step];
          const a = start + k;
          const b = a + half;
          const tr = re[b] * wr - im[b] * wi;
          const ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
    if (inverse) {
      const scale = 1 / n;
      for (let i = 0; i < n; i++) {
        re[i] *= scale;
        im[i] *= scale;
      }
    }
  }

  /** Forward transform (in place). */
  forward(re, im) {
    this.transform(re, im, false);
  }

  /** Inverse transform (in place, normalised). */
  inverse(re, im) {
    this.transform(re, im, true);
  }
}

/**
 * Angular wavenumbers k_j matching FFT ordering for a periodic grid.
 * @param {number} n - Number of points.
 * @param {number} dx - Grid spacing.
 * @returns {Float64Array}
 */
export function fftWavenumbers(n, dx) {
  const k = new Float64Array(n);
  const dk = (2 * Math.PI) / (n * dx);
  for (let j = 0; j < n; j++) {
    k[j] = (j < n / 2 ? j : j - n) * dk;
  }
  return k;
}

/** Two-dimensional FFT on row-major n x n split arrays. */
export class FFT2D {
  /**
   * @param {number} nx - Columns (power of two).
   * @param {number} ny - Rows (power of two).
   */
  constructor(nx, ny = nx) {
    this.nx = nx;
    this.ny = ny;
    this.rowPlan = new FFT(nx);
    this.columnPlan = nx === ny ? this.rowPlan : new FFT(ny);
    this.rowRe = new Float64Array(nx);
    this.rowIm = new Float64Array(nx);
    this.colRe = new Float64Array(ny);
    this.colIm = new Float64Array(ny);
  }

  /**
   * In-place 2D transform.
   * @param {Float64Array} re
   * @param {Float64Array} im
   * @param {boolean} [inverse=false]
   */
  transform(re, im, inverse = false) {
    const { nx, ny, rowRe, rowIm, colRe, colIm } = this;
    for (let y = 0; y < ny; y++) {
      const offset = y * nx;
      rowRe.set(re.subarray(offset, offset + nx));
      rowIm.set(im.subarray(offset, offset + nx));
      this.rowPlan.transform(rowRe, rowIm, inverse);
      re.set(rowRe, offset);
      im.set(rowIm, offset);
    }
    for (let x = 0; x < nx; x++) {
      for (let y = 0; y < ny; y++) {
        colRe[y] = re[y * nx + x];
        colIm[y] = im[y * nx + x];
      }
      this.columnPlan.transform(colRe, colIm, inverse);
      for (let y = 0; y < ny; y++) {
        re[y * nx + x] = colRe[y];
        im[y * nx + x] = colIm[y];
      }
    }
  }

  forward(re, im) {
    this.transform(re, im, false);
  }

  inverse(re, im) {
    this.transform(re, im, true);
  }
}
