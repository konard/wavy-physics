/**
 * Light from accelerated charges.
 *
 * The exact retarded (Liénard–Wiechert) field of a point charge splits into
 * a velocity field that falls off as 1/R² and is carried along with the
 * charge, and an acceleration field that falls off as 1/R and carries
 * energy to infinity — that is the emitted light. Its power is given by the
 * Larmor formula P = 2q²a²/(3c³): radiation is set by the acceleration a
 * (its time dependence sets the spectrum).
 *
 * Gaussian units with configurable c (c = 1 normalised by default; use
 * c = 1/α ≈ 137 for atomic units).
 */

const AXES = [0, 1, 2];

function subtract(a, b) {
  return AXES.map((k) => a[k] - b[k]);
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function scale(a, s) {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function norm(a) {
  return Math.sqrt(dot(a, a));
}

/** Larmor power P = 2 q² a² / (3 c³) of a slowly moving charge. */
export function larmorPower(acceleration, { charge = 1, c = 1 } = {}) {
  const a = Array.isArray(acceleration) ? norm(acceleration) : acceleration;
  return (2 * charge * charge * a * a) / (3 * c ** 3);
}

/**
 * Relativistic Liénard power
 *   P = 2q²γ⁶/(3c³) [a² − |v × a|²/c²].
 */
export function lienardPower(
  velocity,
  acceleration,
  { charge = 1, c = 1 } = {}
) {
  const beta2 = dot(velocity, velocity) / (c * c);
  const gamma6 = (1 / (1 - beta2)) ** 3;
  const va = cross(velocity, acceleration);
  return (
    ((2 * charge * charge * gamma6) / (3 * c ** 3)) *
    (dot(acceleration, acceleration) - dot(va, va) / (c * c))
  );
}

/**
 * Retarded time t_r solving c (t − t_r) = |r − r_q(t_r)| by bisection (the
 * solution is unique for sub-luminal motion).
 * @param {(t: number) => {position: number[]}} trajectory
 */
export function retardedTime(trajectory, point, t, { c = 1 } = {}) {
  const mismatch = (tr) =>
    c * (t - tr) - norm(subtract(point, trajectory(tr).position));
  let late = t;
  let span = norm(subtract(point, trajectory(t).position)) / c + 1;
  let early = t - span;
  while (mismatch(early) < 0) {
    span *= 2;
    early = t - span;
  }
  for (let iteration = 0; iteration < 80; iteration++) {
    const middle = (early + late) / 2;
    if (mismatch(middle) > 0) {
      early = middle;
    } else {
      late = middle;
    }
    if (late - early < 1e-13 * (1 + Math.abs(t))) {
      break;
    }
  }
  return (early + late) / 2;
}

/**
 * Exact Liénard–Wiechert fields of a point charge.
 * @param {(t: number) => {position: number[], velocity: number[],
 *   acceleration: number[]}} trajectory
 * @param {number[]} point - Observation point.
 * @param {number} t - Observation time.
 * @returns {{E: number[], B: number[], velocityField: number[],
 *   radiationField: number[], retardedTime: number}}
 */
export function lienardWiechertField(
  trajectory,
  point,
  t,
  { charge = 1, c = 1 } = {}
) {
  const tr = retardedTime(trajectory, point, t, { c });
  const { position, velocity, acceleration } = trajectory(tr);
  const separation = subtract(point, position);
  const distance = norm(separation);
  const n = scale(separation, 1 / distance);
  const beta = scale(velocity, 1 / c);
  const betaDot = scale(acceleration, 1 / c);
  const kappa = 1 - dot(n, beta);
  const nMinusBeta = subtract(n, beta);
  const velocityField = scale(
    nMinusBeta,
    (charge * (1 - dot(beta, beta))) / (kappa ** 3 * distance * distance)
  );
  const radiationField = scale(
    cross(n, cross(nMinusBeta, betaDot)),
    charge / (c * kappa ** 3 * distance)
  );
  const E = AXES.map((k) => velocityField[k] + radiationField[k]);
  return {
    E,
    B: cross(n, E),
    velocityField,
    radiationField,
    retardedTime: tr,
  };
}

/** Charge oscillating harmonically along an axis: x = A sin(ωt). */
export function oscillatingCharge({
  amplitude = 0.01,
  omega = 1,
  axis = 2,
} = {}) {
  return (t) => {
    const position = [0, 0, 0];
    const velocity = [0, 0, 0];
    const acceleration = [0, 0, 0];
    position[axis] = amplitude * Math.sin(omega * t);
    velocity[axis] = amplitude * omega * Math.cos(omega * t);
    acceleration[axis] = -amplitude * omega * omega * Math.sin(omega * t);
    return { position, velocity, acceleration };
  };
}

/**
 * Charge at rest that is kicked to velocity `speed` along x during
 * [start, start + duration] with constant acceleration (Purcell's picture:
 * the field lines develop a kink — a shell of radiation — that expands at
 * the speed of light).
 */
export function kickedCharge({ speed = 0.5, start = 0, duration = 1 } = {}) {
  const a = speed / duration;
  return (t) => {
    if (t <= start) {
      return {
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        acceleration: [0, 0, 0],
      };
    }
    if (t <= start + duration) {
      const s = t - start;
      return {
        position: [(a * s * s) / 2, 0, 0],
        velocity: [a * s, 0, 0],
        acceleration: [a, 0, 0],
      };
    }
    const s = t - start - duration;
    return {
      position: [(a * duration * duration) / 2 + speed * s, 0, 0],
      velocity: [speed, 0, 0],
      acceleration: [0, 0, 0],
    };
  };
}

/**
 * Charge on a circle of radius ρ with angular velocity ω in the xy plane
 * (the classical picture of an orbiting electron, which would radiate).
 */
export function circularCharge({ radius = 1, omega = 0.5 } = {}) {
  return (t) => {
    const c = Math.cos(omega * t);
    const s = Math.sin(omega * t);
    return {
      position: [radius * c, radius * s, 0],
      velocity: [-radius * omega * s, radius * omega * c, 0],
      acceleration: [
        -radius * omega * omega * c,
        -radius * omega * omega * s,
        0,
      ],
    };
  };
}

/**
 * Power flowing out through a sphere of radius R: ∮ (c/4π) (E × B)·n dA,
 * integrated with Gauss–Legendre in cos θ and a uniform rule in φ, then
 * averaged over `timeSamples` instants spanning `period`.
 */
export function poyntingFlux(
  trajectory,
  { radius = 200, t, period = 0, timeSamples = 1, charge = 1, c = 1 },
  quadrature
) {
  const { nodes, weights } = quadrature;
  const phiSteps = 16;
  let total = 0;
  for (let s = 0; s < timeSamples; s++) {
    const time = t + (period * s) / timeSamples;
    for (let a = 0; a < nodes.length; a++) {
      const cosTheta = nodes[a];
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
      for (let b = 0; b < phiSteps; b++) {
        const phi = (2 * Math.PI * b) / phiSteps;
        const n = [
          sinTheta * Math.cos(phi),
          sinTheta * Math.sin(phi),
          cosTheta,
        ];
        const { E, B } = lienardWiechertField(
          trajectory,
          scale(n, radius),
          time,
          { charge, c }
        );
        const flux = (c / (4 * Math.PI)) * dot(cross(E, B), n);
        total += flux * weights[a] * ((2 * Math.PI) / phiSteps) * radius ** 2;
      }
    }
  }
  return total / timeSamples;
}

/**
 * Sample the field of a moving charge on the z = 0 plane for display.
 * @returns {{values: Float32Array, resolution: number, extent: number}} -
 *   values hold the signed transverse radiation field E_rad·ẑ×n̂ (in-plane
 *   component perpendicular to n̂) when `component` is 'radiation', or |E|
 *   when it is 'magnitude'.
 */
export function sampleFieldPlane(
  trajectory,
  t,
  {
    extent = 20,
    resolution = 96,
    charge = 1,
    c = 1,
    component = 'radiation',
  } = {}
) {
  const values = new Float32Array(resolution * resolution);
  for (let row = 0; row < resolution; row++) {
    const y = extent - ((row + 0.5) * 2 * extent) / resolution;
    for (let col = 0; col < resolution; col++) {
      const x = -extent + ((col + 0.5) * 2 * extent) / resolution;
      const field = lienardWiechertField(trajectory, [x, y, 0], t, {
        charge,
        c,
      });
      values[row * resolution + col] =
        component === 'magnitude'
          ? norm(field.E)
          : radiationComponent(field.radiationField, x, y);
    }
  }
  return { values, resolution, extent };
}

function radiationComponent(field, x, y) {
  const r = Math.hypot(x, y) || 1;
  // Unit vector ẑ × r̂ (azimuthal direction in the plane).
  return (field[0] * -y + field[1] * x) / r;
}

/**
 * Electric-dipole light from a two-state wave superposition treated as a
 * classical oscillating charge cloud (semiclassical picture) versus the
 * quantum (QED) spontaneous-emission power.
 *
 * For |ψ⟩ = c₁|1⟩ + c₂|2⟩ the dipole ⟨d⟩ oscillates at ω = E₂ − E₁ with
 * amplitude 2|c₁c₂||d₁₂|, so Larmor gives P_cl = A ħω |c₁|²|c₂|², which
 * vanishes for a pure excited state. QED gives P_q = A ħω |c₂|² — an
 * excited atom radiates even with no oscillating dipole, because the
 * quantised electromagnetic field itself fluctuates.
 *
 * @param {{einsteinA: number, omega: number, upperPopulation: number}} input
 *   A and ω in consistent units (power returned in those units).
 */
export function twoLevelEmission({ einsteinA, omega, upperPopulation }) {
  const p2 = upperPopulation;
  const p1 = 1 - p2;
  return {
    semiclassical: einsteinA * omega * p1 * p2,
    quantum: einsteinA * omega * p2,
  };
}
