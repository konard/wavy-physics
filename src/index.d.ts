/**
 * Type definitions for wavy-physics. All quantities are in Hartree atomic
 * units (ħ = mₑ = e = 4πε₀ = 1, c = 1/α) unless a doc comment says otherwise.
 */

export type Complex = [number, number];
export type Vector3 = [number, number, number] | number[];
export type ComplexVector = { x: Complex; y: Complex; z: Complex };
export type GridPotential = number | Float64Array | number[];

// ── constants ────────────────────────────────────────────────────────────

export declare const SI: Readonly<{
  c: number;
  h: number;
  hbar: number;
  e: number;
  me: number;
  mp: number;
  alpha: number;
  a0: number;
  Eh: number;
  Rinf: number;
  eps0: number;
  mu0: number;
  mpOverMe: number;
  eV: number;
}>;
export declare const INVERSE_ALPHA: number;
export declare const AU: Readonly<{
  hbar: number;
  me: number;
  e: number;
  c: number;
  length: number;
  energy: number;
  energyEV: number;
  time: number;
  electricField: number;
  protonMass: number;
}>;
export declare function reducedMass(nucleusMass?: number): number;
export declare const hartreeToEV: (energy: number) => number;
export declare const evToHartree: (energy: number) => number;
export declare const auTimeToSeconds: (time: number) => number;
export declare const secondsToAuTime: (time: number) => number;
export declare const bohrToMeters: (length: number) => number;
/** Vacuum wavelength in metres for a photon energy in Hartree. */
export declare function photonWavelength(energy: number): number;
/** Frequency in Hz for a photon energy in Hartree. */
export declare function photonFrequency(energy: number): number;

// ── FFT and special functions ────────────────────────────────────────────

export declare function isPowerOfTwo(n: number): boolean;
export declare class FFT {
  constructor(n: number);
  readonly n: number;
  transform(re: Float64Array, im: Float64Array, inverse?: boolean): void;
  forward(re: Float64Array, im: Float64Array): void;
  inverse(re: Float64Array, im: Float64Array): void;
}
export declare class FFT2D {
  constructor(nx: number, ny?: number);
  transform(re: Float64Array, im: Float64Array, inverse?: boolean): void;
  forward(re: Float64Array, im: Float64Array): void;
  inverse(re: Float64Array, im: Float64Array): void;
}
export declare function fftWavenumbers(n: number, dx: number): Float64Array;
export declare function logFactorial(n: number): number;
export declare function laguerre(k: number, alpha: number, x: number): number;
export declare function associatedLegendre(
  l: number,
  m: number,
  x: number
): number;
export declare function sphericalHarmonic(
  l: number,
  m: number,
  theta: number,
  phi: number
): Complex;
export declare function gaussLegendre(n: number): {
  nodes: Float64Array;
  weights: Float64Array;
};

// ── Schrödinger matter waves ─────────────────────────────────────────────

export interface WaveState {
  re: Float64Array;
  im: Float64Array;
}
export interface Moments {
  mean: number;
  variance: number;
}
export interface RelaxOptions {
  dt?: number;
  maxSteps?: number;
  tolerance?: number;
  orthogonalTo?: WaveState[];
}

export declare class SplitOperatorCore {
  readonly size: number;
  re: Float64Array;
  im: Float64Array;
  potential: Float64Array;
  time: number;
  mass: number;
  setPotentialValues(values: Float64Array | number[]): void;
  setMask(mask: Float64Array | null): void;
  setWavefunction(
    re: Float64Array | number[],
    im: Float64Array | number[]
  ): void;
  norm(): number;
  normalize(): void;
  density(): Float64Array;
  step(dt: number, steps?: number): void;
  relax(options?: RelaxOptions): {
    energy: number;
    steps: number;
    converged: boolean;
  };
  snapshot(): WaveState;
  kineticEnergy(): number;
  potentialEnergy(): number;
  energy(): number;
  positionMoments(axis?: number): Moments;
  momentumMoments(axis?: number): Moments;
}

export interface Schrodinger1DOptions {
  n?: number;
  xMin?: number;
  xMax?: number;
  mass?: number;
  potential?: GridPotential | ((x: number) => number);
  absorbingWidth?: number;
}
export declare class Schrodinger1D extends SplitOperatorCore {
  constructor(options?: Schrodinger1DOptions);
  readonly n: number;
  readonly dx: number;
  readonly x: Float64Array;
  readonly k: Float64Array;
  setPotential(potential: GridPotential | ((x: number) => number)): void;
  setGaussian(packet?: { x0?: number; sigma?: number; k0?: number }): void;
  expectationX(): number;
  sigmaX(): number;
  expectationP(): number;
  sigmaP(): number;
  probabilityRightOf(position: number): number;
}

export interface Schrodinger2DOptions {
  n?: number;
  extent?: number;
  mass?: number;
  potential?: GridPotential | ((x: number, y: number) => number);
  absorbingWidth?: number;
}
export declare class Schrodinger2D extends SplitOperatorCore {
  constructor(options?: Schrodinger2DOptions);
  readonly n: number;
  readonly dx: number;
  readonly extent: number;
  readonly x: Float64Array;
  readonly y: Float64Array;
  setPotential(
    potential: GridPotential | ((x: number, y: number) => number)
  ): void;
  setGaussian(packet?: {
    x0?: number;
    y0?: number;
    sigma?: number;
    kx?: number;
    ky?: number;
  }): void;
  expectationPosition(): [number, number];
  expectationMomentum(): [number, number];
  angularMomentum(): number;
}

// ── hydrogen ─────────────────────────────────────────────────────────────

export interface AtomOptions {
  /** Nuclear charge (default 1). */
  Z?: number;
  /** Nucleus mass in electron masses (default proton; Infinity = fixed). */
  nucleusMass?: number;
}
export interface QuantumNumbers {
  n: number;
  l: number;
  m?: number;
}
export declare function hydrogenEnergy(
  n: number,
  options?: AtomOptions
): number;
export declare function diracEnergy(
  n: number,
  j: number,
  options?: AtomOptions
): number;
export declare function radialWavefunction(
  n: number,
  l: number,
  r: number,
  options?: AtomOptions
): number;
export declare function hydrogenWavefunction(
  state: { n: number; l: number; m: number },
  x: number,
  y: number,
  z: number,
  options?: AtomOptions
): Complex;
export declare function radialDipoleIntegral(
  n1: number,
  l1: number,
  n2: number,
  l2: number,
  options?: AtomOptions
): number;
export declare function angularDipole(
  l1: number,
  m1: number,
  l2: number,
  m2: number
): ComplexVector;
export declare function dipoleMatrixElement(
  a: { n: number; l: number; m: number },
  b: { n: number; l: number; m: number },
  options?: AtomOptions
): ComplexVector;
/** Spontaneous emission rate in s⁻¹ summed over final m. */
export declare function einsteinA(
  upper: QuantumNumbers,
  lower: QuantumNumbers,
  options?: AtomOptions
): number;
/** Radiative lifetime in seconds. */
export declare function radiativeLifetime(
  n: number,
  l: number,
  options?: AtomOptions
): number;
/** Vacuum wavelength in metres. */
export declare function transitionWavelength(
  upper: number,
  lower: number,
  options?: AtomOptions & { jUpper?: number; jLower?: number }
): number;

export interface SuperpositionTerm {
  n: number;
  l: number;
  m: number;
  amplitude?: number | Complex;
}
export declare class HydrogenSuperposition {
  constructor(terms: SuperpositionTerm[], options?: AtomOptions);
  coefficient(k: number, t: number): Complex;
  evaluate(x: number, y: number, z: number, t?: number): Complex;
  density(x: number, y: number, z: number, t?: number): number;
  energy(): number;
  dipoleMatrix(): ComplexVector[][];
  expectationPosition(t?: number): [number, number, number];
  createPlaneSampler(options?: {
    plane?: 'xz' | 'xy';
    extent?: number;
    resolution?: number;
  }): {
    resolution: number;
    extent: number;
    plane: 'xz' | 'xy';
    density<T extends Float32Array | Float64Array = Float32Array>(
      t: number,
      out?: T
    ): T;
  };
}
export declare function circularWavePacket(
  options?: { nMean?: number; width?: number; count?: number } & AtomOptions
): HydrogenSuperposition;
export declare function keplerPeriod(n: number, options?: AtomOptions): number;

export declare function solveRadialStates(options?: {
  l?: number;
  states?: number;
  Z?: number;
  mass?: number;
  potential?: (r: number) => number;
  rMax?: number;
  points?: number;
  tau?: number;
  tolerance?: number;
  maxIterations?: number;
}): {
  r: Float64Array;
  states: Array<{ energy: number; u: Float64Array; iterations: number }>;
};

// ── tunnelling ───────────────────────────────────────────────────────────

export interface Barrier {
  height: number;
  width: number;
  mass?: number;
}
export declare function barrierTransmission(
  energy: number,
  barrier: Barrier
): number;
export declare function packetTransmission(
  packet: { k0: number; sigma: number; mass?: number },
  barrier: Barrier,
  samples?: number
): number;

// ── Dirac and nonlinear waves ────────────────────────────────────────────

export declare class Dirac1D {
  constructor(options?: {
    n?: number;
    xMin?: number;
    xMax?: number;
    mass?: number;
    c?: number;
    potential?: number | ((x: number) => number);
  });
  readonly n: number;
  readonly dx: number;
  readonly x: Float64Array;
  readonly k: Float64Array;
  upRe: Float64Array;
  upIm: Float64Array;
  downRe: Float64Array;
  downIm: Float64Array;
  time: number;
  setPotential(potential: number | ((x: number) => number)): void;
  energyAt(k: number): number;
  setGaussian(packet?: {
    x0?: number;
    sigma?: number;
    k0?: number;
    branch?: 'positive' | 'negative' | 'upper';
  }): void;
  projectEnergyBranch(sign: 1 | -1): void;
  norm(): number;
  normalize(): void;
  density(): Float64Array;
  expectationX(): number;
  step(dt: number, steps?: number): void;
}
export declare function dominantFrequency(
  samples: number[] | Float64Array,
  dt: number,
  range?: { minOmega?: number; maxOmega?: number }
): number;

export interface SolitonParameters {
  eta?: number;
  velocity?: number;
  x0?: number;
  phase?: number;
}
export declare function brightSoliton(
  soliton: SolitonParameters,
  x: number,
  t?: number
): Complex;
export declare class NonlinearSchrodinger1D extends Schrodinger1D {
  constructor(options?: Schrodinger1DOptions & { coupling?: number });
  coupling: number;
  setSolitons(solitons: SolitonParameters[]): void;
  nonlinearHalfStep(dt: number): void;
  /** Largest deviation of |ψ| from the exact travelling soliton. */
  solitonError(soliton: SolitonParameters): number;
}

// ── Maxwell light waves ──────────────────────────────────────────────────

export declare class FDTD1D {
  constructor(options?: {
    cells?: number;
    courant?: number;
    absorbingCells?: number;
    permittivity?: number | ((i: number) => number);
  });
  readonly cells: number;
  readonly dt: number;
  ez: Float64Array;
  hy: Float64Array;
  time: number;
  setPulse(pulse?: {
    center?: number;
    width?: number;
    direction?: 1 | -1;
    amplitude?: number;
  }): void;
  addSource(cell: number, current: (t: number) => number): void;
  step(steps?: number): void;
  energy(): number;
}
export declare class FDTD2D {
  constructor(options?: {
    nx?: number;
    ny?: number;
    courant?: number;
    absorbingCells?: number;
    permittivity?: number | ((i: number, j: number) => number);
  });
  readonly nx: number;
  readonly ny: number;
  readonly dt: number;
  ex: Float64Array;
  ey: Float64Array;
  hz: Float64Array;
  time: number;
  addDipole(source: {
    i: number;
    j: number;
    axis?: 'x' | 'y';
    current: (t: number) => number;
  }): void;
  updateMagnetic(): void;
  updateElectric(): void;
  step(steps?: number): void;
  sampleHz(x: number, y: number): number;
}

// ── radiation from accelerating charges ──────────────────────────────────

export interface TrajectoryPoint {
  position: number[];
  velocity: number[];
  acceleration: number[];
}
export type Trajectory = (t: number) => TrajectoryPoint;
export interface ChargeOptions {
  charge?: number;
  c?: number;
}
export declare function larmorPower(
  acceleration: number | Vector3,
  options?: ChargeOptions
): number;
export declare function lienardPower(
  velocity: Vector3,
  acceleration: Vector3,
  options?: ChargeOptions
): number;
export declare function retardedTime(
  trajectory: Trajectory,
  point: Vector3,
  t: number,
  options?: { c?: number }
): number;
export declare function lienardWiechertField(
  trajectory: Trajectory,
  point: Vector3,
  t: number,
  options?: ChargeOptions
): {
  E: number[];
  B: number[];
  velocityField: number[];
  radiationField: number[];
  retardedTime: number;
};
export declare function oscillatingCharge(options?: {
  amplitude?: number;
  omega?: number;
  axis?: 0 | 1 | 2;
}): Trajectory;
export declare function kickedCharge(options?: {
  speed?: number;
  start?: number;
  duration?: number;
}): Trajectory;
export declare function circularCharge(options?: {
  radius?: number;
  omega?: number;
}): Trajectory;
export declare function poyntingFlux(
  trajectory: Trajectory,
  options: {
    radius?: number;
    t: number;
    period?: number;
    timeSamples?: number;
  } & ChargeOptions,
  quadrature: { nodes: ArrayLike<number>; weights: ArrayLike<number> }
): number;
export declare function sampleFieldPlane(
  trajectory: Trajectory,
  t: number,
  options?: {
    extent?: number;
    resolution?: number;
    component?: 'radiation' | 'magnitude';
  } & ChargeOptions
): { values: Float32Array; resolution: number; extent: number };
export declare function twoLevelEmission(input: {
  einsteinA: number;
  omega: number;
  upperPopulation: number;
}): { semiclassical: number; quantum: number };

// ── classical and fractal waves ──────────────────────────────────────────

export declare class StringWave {
  constructor(options?: {
    points?: number;
    length?: number;
    speed?: number;
    courant?: number;
  });
  readonly x: Float64Array;
  current: Float64Array;
  time: number;
  setDisplacement(shape: (x: number) => number): void;
  step(steps?: number): void;
  displacement(): Float64Array;
}
export declare function dAlembert(
  shape: (x: number) => number,
  x: number,
  t: number,
  options?: { length?: number; speed?: number }
): number;
export declare function squareWavePartialSum(x: number, terms: number): number;
export declare function gibbsPeak(terms: number): number;
export declare function weierstrass(
  x: number,
  options?: { a?: number; b?: number; terms?: number }
): number;
export declare function weierstrassDimension(options?: {
  a?: number;
  b?: number;
}): number;
export declare function boxCountingDimension(
  samples: ArrayLike<number>,
  boxCounts?: number[]
): number;
export declare function waveVelocities(
  omega: (k: number) => number,
  k: number,
  h?: number
): { phase: number; group: number };
export declare function schrodingerDispersion(
  mass?: number
): (k: number) => number;
export declare function relativisticDispersion(
  mass?: number,
  c?: number
): (k: number) => number;

// ── validation ───────────────────────────────────────────────────────────

export interface Benchmark {
  id: string;
  title: string;
  category: string;
  run: () => {
    computed: number;
    reference: number;
    unit: string;
    tolerance: number;
    absolute?: boolean;
    method: string;
    source: string;
  };
}
export interface BenchmarkResult {
  id: string;
  title: string;
  category: string;
  computed: number;
  reference: number;
  unit: string;
  error: number;
  errorKind: 'absolute' | 'relative';
  tolerance: number;
  pass: boolean;
  method: string;
  source: string;
  milliseconds: number;
}
export declare const BENCHMARKS: Benchmark[];
export declare function runBenchmark(
  benchmark: string | Benchmark
): BenchmarkResult;
export declare function runValidation(ids?: string[]): BenchmarkResult[];
export declare const CODATA: string;
export declare const NIST_ASD: string;
