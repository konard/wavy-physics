/**
 * One-dimensional matter-wave experiments for the website: each scenario
 * builds a solver from the library, says how to step it and which exact
 * result to compare it with.
 */

import {
  Dirac1D,
  NonlinearSchrodinger1D,
  Schrodinger1D,
  packetTransmission,
} from '../physics.js';
import { format } from '../ui.js';

const TUNNEL_GRID = { n: 2048, xMin: -80, xMax: 80 };
const TUNNEL_DX = (TUNNEL_GRID.xMax - TUNNEL_GRID.xMin) / TUNNEL_GRID.n;
// A whole number of grid cells, so the simulated barrier has exactly the
// width used by the analytic formula.
const BARRIER = { height: 2.4, width: Math.round(1 / TUNNEL_DX) * TUNNEL_DX };
const FREE = { x0: -30, sigma: 1.5, k0: 2 };
const TUNNEL = { x0: -25, sigma: 4, k0: 2 };
const OSCILLATOR = { omega: 0.5, x0: -10 };
const SOLITONS = [
  { eta: 1.2, velocity: 0.6, x0: -12 },
  { eta: 0.9, velocity: -0.6, x0: 12 },
];

function stat(label, value, detail) {
  return { label, value, detail };
}

export const MATTER_SCENARIOS = [
  {
    value: 'free',
    label: 'Free electron wave packet',
    xRange: [-60, 60],
    duration: 26,
    dt: 0.02,
    stepsPerFrame: 4,
    create() {
      const sim = new Schrodinger1D({ n: 1024, xMin: -60, xMax: 60 });
      sim.setGaussian(FREE);
      return sim;
    },
    stats(sim) {
      const t = sim.time;
      const spread = FREE.sigma * Math.hypot(1, t / (2 * FREE.sigma ** 2));
      return [
        stat(
          'Width Δx',
          `${format(sim.sigmaX(), 4)} bohr`,
          `exact σ√(1 + (t/2σ²)²) = ${format(spread, 4)}`
        ),
        stat(
          'Centre ⟨x⟩',
          `${format(sim.expectationX(), 4)} bohr`,
          `exact x₀ + ħk₀t/m = ${format(FREE.x0 + FREE.k0 * t, 4)}`
        ),
        stat('Δx·Δp', format(sim.sigmaX() * sim.sigmaP(), 4), '≥ ħ/2 = 0.5'),
      ];
    },
    explain:
      'A free electron is a packet of de Broglie waves with λ = h/p. Its parts have different speeds (ω = ħk²/2m), so it travels at the group velocity and spreads exactly as the formula predicts.',
  },
  {
    value: 'barrier',
    label: 'Tunnelling through a barrier',
    xRange: [-60, 60],
    duration: 30,
    dt: 0.02,
    stepsPerFrame: 4,
    potential: (x) =>
      x > -TUNNEL_DX / 2 && x < BARRIER.width - TUNNEL_DX / 2
        ? BARRIER.height
        : 0,
    create() {
      const sim = new Schrodinger1D({
        ...TUNNEL_GRID,
        potential: this.potential,
      });
      sim.setGaussian(TUNNEL);
      return sim;
    },
    stats(sim) {
      const transmitted = sim.probabilityRightOf(BARRIER.width);
      const theory = packetTransmission(TUNNEL, BARRIER);
      return [
        stat(
          'Transmitted now',
          `${format(transmitted * 100, 3)} %`,
          `exact plane-wave average: ${format(theory * 100, 3)} %`
        ),
        stat(
          'Mean energy vs barrier',
          `${format(TUNNEL.k0 ** 2 / 2, 3)} < ${BARRIER.height} Eₕ`,
          'a classical particle would always bounce back'
        ),
      ];
    },
    explain:
      'The packet’s mean energy is below the barrier, yet part of the wave leaks through: tunnelling. The transmitted fraction approaches the exact result for this barrier averaged over the packet’s momenta.',
  },
  {
    value: 'oscillator',
    label: 'Coherent state in a harmonic trap',
    xRange: [-30, 30],
    duration: (4 * 2 * Math.PI) / OSCILLATOR.omega,
    dt: 0.02,
    stepsPerFrame: 6,
    potential: (x) => 0.5 * OSCILLATOR.omega ** 2 * x * x,
    create() {
      const sim = new Schrodinger1D({
        n: 512,
        xMin: -30,
        xMax: 30,
        potential: this.potential,
      });
      sim.setGaussian({
        x0: OSCILLATOR.x0,
        sigma: 1 / Math.sqrt(2 * OSCILLATOR.omega),
      });
      return sim;
    },
    stats(sim) {
      const exact = OSCILLATOR.x0 * Math.cos(OSCILLATOR.omega * sim.time);
      return [
        stat(
          'Centre ⟨x⟩',
          `${format(sim.expectationX(), 4)} bohr`,
          `classical x₀ cos ωt = ${format(exact, 4)}`
        ),
        stat(
          'Width Δx',
          `${format(sim.sigmaX(), 4)} bohr`,
          `constant 1/√(2ω) = ${format(1 / Math.sqrt(2 * OSCILLATOR.omega), 4)}`
        ),
      ];
    },
    explain:
      'In a parabolic well a packet of the right width never spreads: it swings like a classical pendulum. This coherent state is the closest a wave gets to a classical particle.',
  },
  {
    value: 'dirac',
    label: 'Relativistic electron (Dirac): Zitterbewegung',
    xRange: [-30, 30],
    duration: 24,
    dt: 0.05,
    stepsPerFrame: 2,
    create() {
      const sim = new Dirac1D({ n: 1024, xMin: -50, xMax: 50 });
      sim.setGaussian({ sigma: 2, k0: 0.4, branch: 'upper' });
      return sim;
    },
    stats(sim) {
      return [
        stat('Centre ⟨x⟩', `${format(sim.expectationX(), 4)} ƛ_C`),
        stat(
          'Trembling frequency',
          '2E/ħ ≈ 2mc²/ħ',
          'period ≈ π in these units (ħ = m = c = 1)'
        ),
        stat('Norm', format(sim.norm(), 10), 'unitary evolution'),
      ];
    },
    explain:
      'Dirac’s equation describes the electron as a four-component (here two-component) wave. Mixing its positive- and negative-energy parts makes the centre tremble at 2mc²/ħ — Schrödinger’s Zitterbewegung, a pure interference effect between waves.',
  },
  {
    value: 'soliton',
    label: 'Two solitons colliding (nonlinear waves)',
    xRange: [-40, 40],
    duration: 40,
    dt: 0.01,
    stepsPerFrame: 10,
    create() {
      const sim = new NonlinearSchrodinger1D({ n: 1024, xMin: -40, xMax: 40 });
      sim.setSolitons(SOLITONS);
      sim.initialEnergy = sim.energy();
      return sim;
    },
    stats(sim) {
      return [
        stat(
          'Norm',
          format(sim.norm(), 8),
          `exact 2η₁ + 2η₂ = ${format(2 * (SOLITONS[0].eta + SOLITONS[1].eta), 4)}`
        ),
        stat(
          'Energy drift',
          `${format(Math.abs(sim.energy() / sim.initialEnergy - 1) * 100, 2)} %`,
          'second order in the time step'
        ),
      ];
    },
    explain:
      'With self-attraction (focusing nonlinear Schrödinger equation) a wave holds itself together: a soliton. Two of them pass through each other and come out unchanged apart from a shift — waves that behave like particles.',
  },
];
