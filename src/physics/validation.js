/**
 * Benchmarks that compare the wave simulations against exact solutions and
 * measured reference data. The same list drives the automated tests, the
 * command-line `validate` command and the validation table on the website.
 */

import { AU, SI, reducedMass } from './constants.js';
import { Schrodinger1D } from './schrodinger.js';
import {
  HydrogenSuperposition,
  circularWavePacket,
  diracEnergy,
  einsteinA,
  hydrogenEnergy,
  radiativeLifetime,
  transitionWavelength,
} from './hydrogen.js';
import { solveRadialStates } from './radial.js';
import { FDTD1D, FDTD2D } from './maxwell.js';
import {
  circularCharge,
  larmorPower,
  lienardPower,
  oscillatingCharge,
  poyntingFlux,
  twoLevelEmission,
} from './radiation.js';
import { Dirac1D, dominantFrequency } from './dirac.js';
import { NonlinearSchrodinger1D } from './nls.js';
import {
  StringWave,
  boxCountingDimension,
  dAlembert,
  gibbsPeak,
  weierstrass,
  weierstrassDimension,
} from './waves.js';
import { packetTransmission } from './tunneling.js';
import { gaussLegendre } from './special-functions.js';

const NIST_ASD =
  'NIST Atomic Spectra Database v5.12, H I (doi:10.18434/T4W30F)';
const CODATA = 'CODATA 2022 recommended values (physics.nist.gov/cuu)';
const HYDROGEN = { nucleusMass: AU.protonMass };
const MU = reducedMass(AU.protonMass);

/** Convert a wavenumber in cm⁻¹ to Hz. */
function wavenumberToHz(perCm) {
  return perCm * 100 * SI.c;
}

function freePacketSpreading() {
  const solver = new Schrodinger1D({ n: 2048, xMin: -100, xMax: 100 });
  solver.setGaussian({ x0: -20, sigma: 1, k0: 2 });
  solver.step(0.01, 500);
  return {
    computed: solver.sigmaX(),
    reference: Math.sqrt(1 + (solver.time / 2) ** 2),
    unit: 'bohr',
    tolerance: 1e-6,
    method: 'Split-operator FFT propagation of a free Gaussian to t = 5',
    source: 'Exact: σ(t) = σ₀√(1 + (ħt/2mσ₀²)²)',
  };
}

function uncertaintyProduct() {
  const solver = new Schrodinger1D({ n: 1024, xMin: -40, xMax: 40 });
  solver.setGaussian({ sigma: 1.7, k0: 0.8 });
  return {
    computed: solver.sigmaX() * solver.sigmaP(),
    reference: 0.5,
    unit: 'ħ',
    tolerance: 1e-8,
    method: 'Spread of a Gaussian wave in position and (FFT) momentum space',
    source: 'Heisenberg–Kennard bound σxσp ≥ ħ/2, equality for Gaussians',
  };
}

function harmonicOscillator(level) {
  return () => {
    const solver = new Schrodinger1D({
      n: 512,
      xMin: -20,
      xMax: 20,
      potential: (x) => 0.5 * x * x,
    });
    const found = [];
    let result = null;
    for (let k = 0; k <= level; k++) {
      solver.setGaussian({ x0: 0.3, sigma: 1.3, k0: 0.2 });
      result = solver.relax({ dt: 0.01, orthogonalTo: found });
      found.push(solver.snapshot());
    }
    return {
      computed: result.energy,
      reference: level + 0.5,
      unit: 'ħω',
      tolerance: 1e-6,
      method: 'Imaginary-time relaxation of a trial wave (split-operator)',
      source: 'Exact: E_n = ħω(n + ½)',
    };
  };
}

function radialHydrogen(l, index) {
  return () => {
    const { states } = solveRadialStates({
      l,
      states: index + 1,
      mass: MU,
      rMax: 80,
      points: 16000,
    });
    const n = l + index + 1;
    return {
      computed: states[index].energy,
      reference: hydrogenEnergy(n, HYDROGEN),
      unit: 'Hartree',
      tolerance: 2e-5,
      method:
        'Radial wave relaxed in imaginary time (backward Euler), no analytic input',
      source: 'Bohr/Schrödinger: E_n = −μ/(2n²) Hartree',
    };
  };
}

function ionizationEnergy() {
  const energyEV = -diracEnergy(1, 0.5, HYDROGEN) * AU.energyEV;
  return {
    computed: energyEV,
    reference: 13.598434599702,
    unit: 'eV',
    tolerance: 1e-5,
    method: 'Dirac-equation 1s½ level with reduced mass',
    source: `${NIST_ASD}; difference ≈ 2.5·10⁻⁶ is the QED Lamb shift`,
  };
}

function lymanAlphaWavelength() {
  return {
    computed:
      transitionWavelength(2, 1, { ...HYDROGEN, jUpper: 1.5, jLower: 0.5 }) *
      1e9,
    reference: 121.566823731,
    unit: 'nm',
    tolerance: 1e-5,
    method: 'Dirac 2p3/2 → 1s1/2 photon energy (reduced mass)',
    source: `${NIST_ASD}, Ritz wavelength in vacuum`,
  };
}

function fineStructure() {
  const splitting =
    (diracEnergy(2, 1.5, HYDROGEN) - diracEnergy(2, 0.5, HYDROGEN)) *
    (SI.Eh / SI.h);
  return {
    computed: splitting / 1e9,
    reference: wavenumberToHz(82259.2850014 - 82258.9191133) / 1e9,
    unit: 'GHz',
    tolerance: 5e-3,
    method: 'Dirac-equation 2p3/2 − 2p1/2 splitting',
    source: `${NIST_ASD}; the 0.23 % remainder is the (1 + 2aₑ) anomalous-moment factor (QED)`,
  };
}

function einsteinCoefficient(upper, lower, reference, source) {
  return () => ({
    computed: einsteinA(upper, lower, HYDROGEN),
    reference,
    unit: 's⁻¹',
    tolerance: 1e-3,
    method: 'A = 4ω³|⟨f|r|i⟩|²/(3c³) from the exact wave overlap integrals',
    source,
  });
}

function lifetime2p() {
  return {
    computed: radiativeLifetime(2, 1, HYDROGEN) * 1e9,
    reference: 1e9 / 6.2648e8,
    unit: 'ns',
    tolerance: 1e-3,
    method: 'τ = 1/ΣA over dipole-allowed decays',
    source: NIST_ASD,
  };
}

function dipoleOscillation() {
  const atom = new HydrogenSuperposition(
    [
      { n: 1, l: 0, m: 0 },
      { n: 2, l: 1, m: 0 },
    ],
    HYDROGEN
  );
  const dt = 0.5;
  const samples = [];
  for (let i = 0; i < 400; i++) {
    samples.push(atom.expectationPosition(i * dt)[2]);
  }
  const omega = dominantFrequency(samples, dt, {
    minOmega: 0.1,
    maxOmega: 1,
  });
  return {
    computed: ((2 * Math.PI * AU.c) / omega) * SI.a0 * 1e9,
    reference: 121.5684456,
    unit: 'nm',
    tolerance: 1e-4,
    method:
      'Wavelength c·2π/ω of the oscillating charge cloud of a 1s + 2p wave superposition',
    source: 'Bohr frequency (E₂ − E₁)/ħ with reduced mass (Rydberg formula)',
  };
}

function rydbergOrbit() {
  const nMean = 40;
  const packet = circularWavePacket({ nMean, width: 1, count: 7, ...HYDROGEN });
  const period = (2 * Math.PI * nMean ** 3) / MU;
  const dt = period / 40;
  const samples = [];
  for (let i = 0; i < 120; i++) {
    samples.push(packet.expectationPosition(i * dt)[0]);
  }
  const omega = dominantFrequency(samples, dt, {
    minOmega: (0.5 * 2 * Math.PI) / period,
    maxOmega: (1.5 * 2 * Math.PI) / period,
  });
  return {
    computed: (2 * Math.PI) / omega,
    reference: period,
    unit: 'a.u. of time',
    tolerance: 1e-2,
    method:
      'Orbit period of a circular Rydberg wave packet (superposition of n = 37…43)',
    source: 'Kepler/Bohr: T = 2πn³/μ (correspondence principle)',
  };
}

function larmorFlux() {
  const amplitude = 0.01;
  const trajectory = oscillatingCharge({ amplitude, omega: 1 });
  const flux = poyntingFlux(
    trajectory,
    { radius: 300, t: 1000, period: 2 * Math.PI, timeSamples: 8 },
    gaussLegendre(24)
  );
  return {
    computed: flux,
    reference: larmorPower(amplitude) / 2,
    unit: 'q²ω⁴A²/c³',
    tolerance: 5e-4,
    method:
      'Poynting flux of the exact Liénard–Wiechert field through a sphere',
    source: 'Larmor formula ⟨P⟩ = q²a₀²/(3c³)',
  };
}

function synchrotronFlux() {
  const omega = 0.3;
  const flux = poyntingFlux(
    circularCharge({ radius: 1, omega }),
    { radius: 400, t: 2000, period: (2 * Math.PI) / omega, timeSamples: 4 },
    gaussLegendre(24)
  );
  return {
    computed: flux,
    reference: lienardPower([0, omega, 0], [-omega * omega, 0, 0]),
    unit: 'q²/c',
    tolerance: 1e-4,
    method: 'Poynting flux of a charge circling at v = 0.3c',
    source: 'Liénard formula P = 2q²γ⁴a²/(3c³) for circular motion',
  };
}

function semiclassicalAtom() {
  const atom = new HydrogenSuperposition(
    [
      { n: 1, l: 0, m: 0 },
      { n: 2, l: 1, m: 0 },
    ],
    HYDROGEN
  );
  const omega = hydrogenEnergy(2, HYDROGEN) - hydrogenEnergy(1, HYDROGEN);
  const period = (2 * Math.PI) / omega;
  const h = 1e-3;
  let power = 0;
  const samples = 64;
  for (let i = 0; i < samples; i++) {
    const t = (period * i) / samples;
    const [before, now, after] = [t - h, t, t + h].map(
      (time) => atom.expectationPosition(time)[2]
    );
    power += larmorPower((after - 2 * now + before) / (h * h), {
      c: AU.c,
    });
  }
  const rate = einsteinA({ n: 2, l: 1 }, { n: 1, l: 0 }, HYDROGEN) * AU.time;
  return {
    computed: power / samples,
    reference: twoLevelEmission({
      einsteinA: rate,
      omega,
      upperPopulation: 0.5,
    }).semiclassical,
    unit: 'Hartree / a.u. time',
    tolerance: 1e-5,
    method:
      'Larmor power of the oscillating charge cloud of a 50/50 1s + 2p superposition',
    source: 'Semiclassical radiation theory: P = A ħω |c₁|²|c₂|²',
  };
}

function fresnelReflection() {
  const grid = new FDTD1D({
    cells: 1600,
    courant: 0.5,
    permittivity: (i) => (i >= 800 ? 4 : 1),
  });
  grid.setPulse({ center: 400, width: 25 });
  grid.step(1200);
  let reflected = 0;
  for (let i = 0; i < 800; i++) {
    if (Math.abs(grid.ez[i]) > Math.abs(reflected)) {
      reflected = grid.ez[i];
    }
  }
  return {
    computed: reflected,
    reference: -1 / 3,
    unit: 'E_r/E_i',
    tolerance: 5e-3,
    method: 'FDTD Maxwell pulse hitting a glass-like medium with n = 2',
    source: 'Fresnel equations: r = (1 − n)/(1 + n)',
  };
}

function lightSpeed() {
  const grid = new FDTD1D({ cells: 1200 });
  grid.setPulse({ center: 200, width: 20 });
  grid.step(1000);
  let peak = 0;
  for (let i = 0; i < grid.cells; i++) {
    if (grid.ez[i] > grid.ez[peak]) {
      peak = i;
    }
  }
  return {
    computed: (peak - 200) / grid.time,
    reference: 1,
    unit: 'c',
    tolerance: 1e-3,
    method: 'Peak travel of a FDTD light pulse in vacuum',
    source: 'Maxwell: waves travel at c = 1/√(ε₀μ₀)',
  };
}

function dipolePattern() {
  const n = 240;
  const grid = new FDTD2D({ nx: n, ny: n, courant: 0.5, absorbingCells: 30 });
  const omega = (2 * Math.PI) / 20;
  grid.addDipole({
    i: n / 2,
    j: n / 2,
    axis: 'x',
    current: (t) => Math.sin(omega * t) * (1 - Math.exp(-t / 30)),
  });
  grid.step(600);
  const intensity = { 45: 0, 90: 0 };
  for (let s = 0; s < 80; s++) {
    grid.step(1);
    for (const degrees of [45, 90]) {
      for (const mirrored of [degrees, 180 - degrees, 180 + degrees]) {
        const angle = (mirrored * Math.PI) / 180;
        const value = grid.sampleHz(
          n / 2 + 0.5 + 70 * Math.cos(angle),
          n / 2 + 0.5 + 70 * Math.sin(angle)
        );
        intensity[degrees] += value * value;
      }
    }
  }
  return {
    computed: intensity[90] / intensity[45],
    reference: 2,
    unit: 'I(90°)/I(45°)',
    tolerance: 5e-2,
    method: '2D FDTD field radiated by an oscillating current (dipole)',
    source: 'Dipole radiation pattern I ∝ sin²θ',
  };
}

function diracGroupVelocity() {
  const solver = new Dirac1D({ n: 2048, xMin: -200, xMax: 200 });
  solver.setGaussian({ sigma: 10, k0: 1, branch: 'positive' });
  const start = solver.expectationX();
  solver.step(0.05, 400);
  return {
    computed: (solver.expectationX() - start) / solver.time,
    reference: 1 / Math.SQRT2,
    unit: 'c',
    tolerance: 5e-3,
    method: 'Positive-energy Dirac spinor packet (k = mc/ħ)',
    source: 'Relativistic group velocity v = c²p/E',
  };
}

function zitterbewegung() {
  const solver = new Dirac1D({ n: 2048, xMin: -200, xMax: 200 });
  solver.setGaussian({ sigma: 10, k0: 1, branch: 'upper' });
  const dt = 0.05;
  const samples = [];
  for (let i = 0; i < 400; i++) {
    samples.push(solver.expectationX());
    solver.step(dt);
  }
  return {
    computed: dominantFrequency(samples, dt, { minOmega: 1, maxOmega: 6 }),
    reference: 2 * Math.SQRT2,
    unit: 'mc²/ħ',
    tolerance: 1e-2,
    method: 'Trembling of ⟨x⟩ for a packet mixing ± energy waves',
    source: 'Schrödinger (1930) Zitterbewegung: ω = 2E/ħ',
  };
}

function solitonShape() {
  const solver = new NonlinearSchrodinger1D({ n: 1024, xMin: -40, xMax: 40 });
  const soliton = { eta: 1, velocity: 0.5, x0: -10 };
  solver.setSolitons([soliton]);
  solver.step(0.01, 2000);
  return {
    computed: solver.solitonError(soliton),
    reference: 0,
    unit: 'max |Δψ|',
    tolerance: 1e-4,
    absolute: true,
    method: 'Split-step NLS propagation of a bright soliton to t = 20',
    source: 'Zakharov–Shabat exact soliton η sech(η(x − vt))',
  };
}

function solitonCollision() {
  const solver = new NonlinearSchrodinger1D({ n: 2048, xMin: -60, xMax: 60 });
  solver.setSolitons([
    { eta: 1, velocity: 1, x0: -15 },
    { eta: 1.2, velocity: -1, x0: 15 },
  ]);
  solver.step(0.01, 3000);
  let peak = 0;
  for (let i = 0; i < solver.n; i++) {
    if (solver.x[i] < 0) {
      peak = Math.max(peak, Math.hypot(solver.re[i], solver.im[i]));
    }
  }
  return {
    computed: peak,
    reference: 1.2,
    unit: 'amplitude',
    tolerance: 1e-3,
    method: 'Two solitons pass through each other (t = 30)',
    source: 'Integrability: solitons keep their amplitude after collisions',
  };
}

function tunneling() {
  const n = 4096;
  const dx = 400 / n;
  // Align the barrier with whole grid cells so its width is exact.
  const width = Math.round(1 / dx) * dx;
  const barrier = { height: 1.2, width };
  const packet = { k0: 1.4, sigma: 12 };
  const solver = new Schrodinger1D({
    n,
    xMin: -200,
    xMax: 200,
    absorbingWidth: 20,
    potential: (x) => (x > -dx / 2 && x < width - dx / 2 ? barrier.height : 0),
  });
  solver.setGaussian({ x0: -70, ...packet });
  solver.step(0.05, 2000);
  return {
    computed: solver.probabilityRightOf(width),
    reference: packetTransmission(packet, barrier),
    unit: 'probability',
    tolerance: 1e-2,
    method: 'Wave packet tunnelling through a barrier higher than its energy',
    source: 'Exact plane-wave T(E) averaged over the packet spectrum',
  };
}

function stringWave() {
  const pluck = (x) => Math.exp(-(((x - 0.3) / 0.05) ** 2));
  const string = new StringWave({ points: 401 });
  string.setDisplacement(pluck);
  string.step(299);
  let error = 0;
  for (let i = 0; i < string.points; i++) {
    error = Math.max(
      error,
      Math.abs(string.current[i] - dAlembert(pluck, string.x[i], string.time))
    );
  }
  return {
    computed: error,
    reference: 0,
    unit: 'max |Δu|',
    tolerance: 1e-10,
    absolute: true,
    method: 'Leapfrog wave equation at Courant number 1 (with reflections)',
    source: "d'Alembert solution u = ½[f(x − ct) + f(x + ct)]",
  };
}

function gibbs() {
  return {
    computed: gibbsPeak(2000),
    reference: 1.1789797444721672,
    unit: 'amplitude',
    tolerance: 1e-6,
    method: 'Peak of a 2000-term Fourier sum of a square wave',
    source: 'Wilbraham–Gibbs constant (2/π)·Si(π)',
  };
}

function fractalDimension() {
  const points = 1 << 16;
  const samples = Float64Array.from({ length: points + 1 }, (_, i) =>
    weierstrass(i / points)
  );
  return {
    computed: boxCountingDimension(samples),
    reference: weierstrassDimension(),
    unit: 'dimension',
    tolerance: 2e-2,
    method: 'Box counting on the Weierstrass wave-of-waves (a = ½, b = 3)',
    source: 'Shen (2018): box dimension 2 + ln a / ln b',
  };
}

/** @type {Array<{id: string, title: string, category: string, run: Function}>} */
export const BENCHMARKS = [
  {
    id: 'free-packet',
    title: 'Free wave packet spreading',
    category: 'Matter waves',
    run: freePacketSpreading,
  },
  {
    id: 'uncertainty',
    title: 'Minimum uncertainty packet',
    category: 'Matter waves',
    run: uncertaintyProduct,
  },
  {
    id: 'oscillator-0',
    title: 'Harmonic oscillator ground state',
    category: 'Matter waves',
    run: harmonicOscillator(0),
  },
  {
    id: 'oscillator-1',
    title: 'Harmonic oscillator first excited state',
    category: 'Matter waves',
    run: harmonicOscillator(1),
  },
  {
    id: 'tunneling',
    title: 'Quantum tunnelling probability',
    category: 'Matter waves',
    run: tunneling,
  },
  {
    id: 'hydrogen-1s',
    title: 'Hydrogen 1s energy from a relaxed wave',
    category: 'Atom',
    run: radialHydrogen(0, 0),
  },
  {
    id: 'hydrogen-2s',
    title: 'Hydrogen 2s energy from a relaxed wave',
    category: 'Atom',
    run: radialHydrogen(0, 1),
  },
  {
    id: 'hydrogen-2p',
    title: 'Hydrogen 2p energy from a relaxed wave',
    category: 'Atom',
    run: radialHydrogen(1, 0),
  },
  {
    id: 'ionization',
    title: 'Hydrogen ionization energy (Dirac)',
    category: 'Atom',
    run: ionizationEnergy,
  },
  {
    id: 'fine-structure',
    title: '2p fine-structure splitting (Dirac)',
    category: 'Atom',
    run: fineStructure,
  },
  {
    id: 'rydberg-orbit',
    title: 'Rydberg wave packet orbit period',
    category: 'Atom',
    run: rydbergOrbit,
  },
  {
    id: 'dipole-oscillation',
    title: 'Charge-cloud oscillation → Lyman-α',
    category: 'Light',
    run: dipoleOscillation,
  },
  {
    id: 'lyman-alpha',
    title: 'Lyman-α wavelength',
    category: 'Light',
    run: lymanAlphaWavelength,
  },
  {
    id: 'einstein-a-2p',
    title: 'Einstein A, 2p → 1s',
    category: 'Light',
    run: einsteinCoefficient(
      { n: 2, l: 1 },
      { n: 1, l: 0 },
      6.2648e8,
      NIST_ASD
    ),
  },
  {
    id: 'einstein-a-3p',
    title: 'Einstein A, 3p → 1s (Lyman-β)',
    category: 'Light',
    run: einsteinCoefficient(
      { n: 3, l: 1 },
      { n: 1, l: 0 },
      1.6725e8,
      NIST_ASD
    ),
  },
  {
    id: 'einstein-a-3d',
    title: 'Einstein A, 3d → 2p (Balmer-α)',
    category: 'Light',
    run: einsteinCoefficient(
      { n: 3, l: 2 },
      { n: 2, l: 1 },
      6.4651e7,
      NIST_ASD
    ),
  },
  {
    id: 'lifetime-2p',
    title: '2p radiative lifetime',
    category: 'Light',
    run: lifetime2p,
  },
  {
    id: 'semiclassical-atom',
    title: 'Light from the oscillating atom',
    category: 'Light',
    run: semiclassicalAtom,
  },
  {
    id: 'larmor',
    title: 'Larmor radiation of an accelerated charge',
    category: 'Light',
    run: larmorFlux,
  },
  {
    id: 'synchrotron',
    title: 'Radiation of a circling charge (v = 0.3c)',
    category: 'Light',
    run: synchrotronFlux,
  },
  {
    id: 'light-speed',
    title: 'Speed of a light pulse',
    category: 'Light',
    run: lightSpeed,
  },
  {
    id: 'fresnel',
    title: 'Reflection of light from glass (n = 2)',
    category: 'Light',
    run: fresnelReflection,
  },
  {
    id: 'dipole-pattern',
    title: 'Dipole radiation pattern',
    category: 'Light',
    run: dipolePattern,
  },
  {
    id: 'dirac-velocity',
    title: 'Dirac packet group velocity',
    category: 'Relativistic',
    run: diracGroupVelocity,
  },
  {
    id: 'zitterbewegung',
    title: 'Zitterbewegung frequency',
    category: 'Relativistic',
    run: zitterbewegung,
  },
  {
    id: 'soliton',
    title: 'Soliton keeps its shape',
    category: 'Wave particles',
    run: solitonShape,
  },
  {
    id: 'soliton-collision',
    title: 'Solitons survive a collision',
    category: 'Wave particles',
    run: solitonCollision,
  },
  {
    id: 'string',
    title: "Wave on a string vs d'Alembert",
    category: 'Classical waves',
    run: stringWave,
  },
  {
    id: 'gibbs',
    title: 'Fourier synthesis overshoot (Gibbs)',
    category: 'Classical waves',
    run: gibbs,
  },
  {
    id: 'fractal',
    title: 'Fractal dimension of a wave of waves',
    category: 'Classical waves',
    run: fractalDimension,
  },
];

/**
 * Run one benchmark.
 * @param {string|object} benchmark - Benchmark object or id.
 * @returns {{id: string, title: string, category: string, computed: number,
 *   reference: number, unit: string, error: number, tolerance: number,
 *   pass: boolean, method: string, source: string, milliseconds: number}}
 */
export function runBenchmark(benchmark) {
  const entry =
    typeof benchmark === 'string'
      ? BENCHMARKS.find((candidate) => candidate.id === benchmark)
      : benchmark;
  if (!entry) {
    throw new RangeError(`Unknown benchmark: ${benchmark}`);
  }
  const started = Date.now();
  const outcome = entry.run();
  const difference = Math.abs(outcome.computed - outcome.reference);
  const error = outcome.absolute
    ? difference
    : difference / Math.abs(outcome.reference);
  return {
    id: entry.id,
    title: entry.title,
    category: entry.category,
    computed: outcome.computed,
    reference: outcome.reference,
    unit: outcome.unit,
    error,
    errorKind: outcome.absolute ? 'absolute' : 'relative',
    tolerance: outcome.tolerance,
    pass: Number.isFinite(error) && error <= outcome.tolerance,
    method: outcome.method,
    source: outcome.source,
    milliseconds: Date.now() - started,
  };
}

/**
 * Run several benchmarks (all by default).
 * @param {string[]} [ids]
 */
export function runValidation(ids) {
  const selected = ids
    ? ids.map((id) => BENCHMARKS.find((entry) => entry.id === id) ?? id)
    : BENCHMARKS;
  return selected.map((entry) => runBenchmark(entry));
}

export { CODATA, NIST_ASD };
