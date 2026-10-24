import {
  createElement as h,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AU,
  HydrogenSuperposition,
  auTimeToSeconds,
  hartreeToEV,
  hydrogenEnergy,
  radiativeLifetime,
  transitionWavelength,
} from '../physics.js';
import {
  ColorLegend,
  Figure,
  PlayControls,
  Select,
  SeriesLegend,
  Slider,
  Stat,
  StatRow,
  TabLayout,
  drawField,
  drawLines,
  format,
  peak,
  useAnimation,
  usePlaying,
} from '../ui.js';

const EXTENT = 14;
const RESOLUTION = 112;
const TRACE_POINTS = 240;

/** Atomic states the visitor can superpose (equal weights). */
export const ATOM_STATES = [
  {
    value: '1s',
    label: '1s alone (ground state)',
    terms: [{ n: 1, l: 0, m: 0 }],
    plane: 'xz',
    extent: 5,
  },
  {
    value: '1s+2p0',
    label: '1s + 2p₀ (Lyman-α dipole)',
    terms: [
      { n: 1, l: 0, m: 0 },
      { n: 2, l: 1, m: 0 },
    ],
    plane: 'xz',
    extent: 10,
  },
  {
    value: '1s+2p1',
    label: '1s + 2p₊₁ (rotating dipole)',
    terms: [
      { n: 1, l: 0, m: 0 },
      { n: 2, l: 1, m: 1 },
    ],
    plane: 'xy',
    extent: 10,
  },
  {
    value: '2p0+3d0',
    label: '2p₀ + 3d₀ (Balmer-α, red light)',
    terms: [
      { n: 2, l: 1, m: 0 },
      { n: 3, l: 2, m: 0 },
    ],
    plane: 'xz',
    extent: EXTENT,
  },
  {
    value: '2s+3p0',
    label: '2s + 3p₀ (Balmer-α, s–p)',
    terms: [
      { n: 2, l: 0, m: 0 },
      { n: 3, l: 1, m: 0 },
    ],
    plane: 'xz',
    extent: 20,
  },
];

function upperAndLower(terms) {
  const sorted = [...terms].sort((a, b) => a.n - b.n);
  return { lower: sorted[0], upper: sorted[sorted.length - 1] };
}

function describeEmission(choice) {
  if (choice.terms.length < 2) {
    return null;
  }
  const { lower, upper } = upperAndLower(choice.terms);
  const omega =
    hydrogenEnergy(upper.n, { nucleusMass: AU.protonMass }) -
    hydrogenEnergy(lower.n, { nucleusMass: AU.protonMass });
  return {
    omega,
    period: (2 * Math.PI) / omega,
    wavelength: transitionWavelength(upper.n, lower.n, {
      nucleusMass: AU.protonMass,
    }),
    lifetime: radiativeLifetime(upper.n, upper.l),
    photonEV: hartreeToEV(omega),
  };
}

function dipoleTrace(atom, period, axis) {
  const times = new Float64Array(TRACE_POINTS);
  const values = new Float64Array(TRACE_POINTS);
  for (let i = 0; i < TRACE_POINTS; i++) {
    times[i] = (2 * period * i) / (TRACE_POINTS - 1);
    values[i] = atom.expectationPosition(times[i])[axis];
  }
  return { times, values };
}

function notes() {
  return [
    h('h3', { key: 'h' }, 'What you are seeing'),
    h(
      'p',
      { key: 'a' },
      'Each state of hydrogen is an exact standing wave of the Schrödinger equation, ψ = R(r) Y(θ, φ) e^{−iEt/ħ}. Alone, its density never moves — only its phase turns (switch to “Re ψ” to watch it). '
    ),
    h(
      'p',
      { key: 'b' },
      'Superpose two of them and the waves beat at ω = (E₂ − E₁)/ħ: the charge cloud sloshes, the atom becomes a tiny antenna, and it radiates light of exactly that frequency. For 1s + 2p this is the 121.57 nm Lyman-α line; for n = 3 → 2 the red 656 nm Balmer-α line.'
    ),
    h(
      'p',
      { key: 'c' },
      'Units: atomic units (bohr, Hartree) with CODATA 2022 constants and the proton’s reduced mass.'
    ),
  ];
}

/** Largest value over one cycle, so the colour scale stays fixed. */
function fieldScale({ sampler, view, cycle, buffer }) {
  let largest = 0;
  for (let i = 0; i < 8; i++) {
    const sample =
      view === 'density'
        ? sampler.density((cycle * i) / 8, buffer)
        : sampler.realPart((cycle * i) / 8, buffer);
    largest = Math.max(largest, peak(sample));
  }
  return largest;
}

function describePoint({ atom, choice, t, fx, fy }) {
  const u = (2 * fx - 1) * choice.extent;
  const v = (1 - 2 * fy) * choice.extent;
  const [x, y, z] = choice.plane === 'xy' ? [u, v, 0] : [u, 0, v];
  return `x ${format(x, 3)}, ${choice.plane === 'xy' ? 'y' : 'z'} ${format(
    v,
    3
  )} bohr · |ψ|² ${format(atom.density(x, y, z, t), 3)}`;
}

function atomControls({
  stateKey,
  setStateKey,
  view,
  setView,
  speed,
  setSpeed,
  playing,
  setPlaying,
  timeRef,
  setNow,
  stats,
}) {
  return [
    h(Select, {
      key: 'state',
      id: 'atom-state',
      label: 'Superposition',
      value: stateKey,
      options: ATOM_STATES,
      onChange: (value) => {
        timeRef.current = 0;
        setStateKey(value);
      },
    }),
    h(Select, {
      key: 'view',
      id: 'atom-view',
      label: 'Show',
      value: view,
      options: [
        { value: 'density', label: 'Probability density |ψ|²' },
        { value: 'real', label: 'The wave itself, Re ψ' },
      ],
      onChange: setView,
    }),
    h(Slider, {
      key: 'speed',
      id: 'atom-speed',
      label: 'Speed',
      value: speed,
      min: 0.25,
      max: 3,
      step: 0.25,
      onChange: setSpeed,
      format: (v) => `${v}×`,
    }),
    h(PlayControls, {
      key: 'play',
      playing,
      setPlaying,
      onReset: () => {
        timeRef.current = 0;
        setNow(0);
      },
    }),
    stats,
  ];
}

function AtomStats({ now, emission, atom }) {
  return h(
    StatRow,
    null,
    h(Stat, {
      label: 'Simulated time',
      value: `${format(auTimeToSeconds(now) * 1e15, 3)} fs`,
    }),
    emission &&
      h(Stat, {
        label: 'Emitted light',
        value: `${format(emission.wavelength * 1e9, 7)} nm`,
        detail: `${format(emission.photonEV, 5)} eV photons, vacuum`,
      }),
    emission &&
      h(Stat, {
        label: 'Oscillation period',
        value: `${format(auTimeToSeconds(emission.period) * 1e15, 4)} fs`,
      }),
    emission &&
      h(Stat, {
        label: 'Upper-state lifetime',
        value: `${format(emission.lifetime * 1e9, 4)} ns`,
        detail: 'from the dipole matrix element',
      }),
    !emission &&
      h(Stat, {
        label: 'Energy',
        value: `${format(hartreeToEV(atom.energy()), 6)} eV`,
        detail: 'a single standing wave: density frozen',
      })
  );
}

export function AtomTab({ dark }) {
  const [stateKey, setStateKey] = useState('1s+2p0');
  const [view, setView] = useState('density');
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = usePlaying();
  const fieldRef = useRef(null);
  const traceRef = useRef(null);
  const timeRef = useRef(0);
  const [now, setNow] = useState(0);
  const choice = ATOM_STATES.find((s) => s.value === stateKey);
  const emission = useMemo(() => describeEmission(choice), [choice]);
  const atom = useMemo(
    () =>
      new HydrogenSuperposition(choice.terms, { nucleusMass: AU.protonMass }),
    [choice]
  );
  const sampler = useMemo(
    () =>
      atom.createPlaneSampler({
        plane: choice.plane,
        extent: choice.extent,
        resolution: RESOLUTION,
      }),
    [atom, choice]
  );
  // One animation cycle shows one beat (or one phase turn for a single state).
  const cycle = emission
    ? emission.period
    : (2 * Math.PI) / Math.abs(atom.energy());
  const axis = choice.plane === 'xy' ? 0 : 2;
  const trace = useMemo(
    () => dipoleTrace(atom, cycle, axis),
    [atom, cycle, axis]
  );
  const buffer = useMemo(() => new Float32Array(RESOLUTION * RESOLUTION), []);
  const scale = useMemo(
    () => fieldScale({ sampler, view, cycle, buffer }),
    [sampler, view, cycle, buffer]
  );

  const render = (t) => {
    const values =
      view === 'density'
        ? sampler.density(t, buffer)
        : sampler.realPart(t, buffer);
    // Square root of |ψ|² brings out the faint outer lobes.
    if (view === 'density') {
      for (let i = 0; i < values.length; i++) {
        values[i] = Math.sqrt(values[i] / scale);
      }
    }
    drawField(fieldRef.current, values, {
      nx: RESOLUTION,
      ny: RESOLUTION,
      kind: view === 'density' ? 'sequential' : 'diverging',
      dark,
      range: view === 'density' ? 1 : scale,
    });
    const phase = t % (2 * cycle);
    const marker = Math.round((phase / (2 * cycle)) * (TRACE_POINTS - 1));
    drawLines(traceRef.current, {
      series: [
        { x: trace.times, y: trace.values },
        {
          x: [trace.times[marker], trace.times[marker]],
          y: [-1e3, 1e3],
          dashed: true,
        },
      ],
      xRange: [0, trace.times[TRACE_POINTS - 1]],
      yRange: [
        -Math.max(peak(trace.values), 0.5) * 1.2,
        Math.max(peak(trace.values), 0.5) * 1.2,
      ],
      xLabel: 'time (atomic units, ħ/Eₕ = 24.19 as)',
    });
  };

  useAnimation((elapsed) => {
    timeRef.current += (elapsed * speed * cycle) / 3;
    render(timeRef.current);
    setNow(timeRef.current);
  }, playing);
  useEffect(() => render(timeRef.current));

  const fieldReadout = (fx, fy) =>
    describePoint({ atom, choice, t: timeRef.current, fx, fy });
  const axisName = axis === 0 ? 'x' : 'z';

  return h(TabLayout, {
    title: 'An atom waving in time',
    intro:
      'The electron of hydrogen is not a dot on an orbit: it is a three-dimensional standing wave around the proton. Pick a superposition and watch the cloud breathe.',
    figures: [
      h(
        Figure,
        {
          key: 'field',
          canvasRef: fieldRef,
          width: 560,
          height: 560,
          square: true,
          label: `Hydrogen ${choice.label} in the ${choice.plane} plane`,
          readout: fieldReadout,
          caption: `Slice through the nucleus (${choice.plane} plane, ±${choice.extent} bohr). `,
        },
        h(ColorLegend, {
          kind: view === 'density' ? 'sequential' : 'diverging',
          dark,
          low: view === 'density' ? '0' : '−',
          middle: view === 'density' ? null : '0',
          high: view === 'density' ? '√|ψ|² max' : '+ Re ψ',
        })
      ),
      h(
        Figure,
        {
          key: 'trace',
          canvasRef: traceRef,
          width: 560,
          height: 200,
          label: `Dipole ⟨${axisName}⟩ of the electron wave against time`,
          readout: (fx) => {
            const t = fx * trace.times[TRACE_POINTS - 1];
            return `t ${format(t, 3)} a.u. · ⟨${axisName}⟩ ${format(
              atom.expectationPosition(t)[axis],
              3
            )} bohr`;
          },
        },
        h(SeriesLegend, {
          items: [
            { label: `⟨${axisName}⟩(t) in bohr: the oscillating charge` },
            { label: 'now', dashed: true },
          ],
        })
      ),
    ],
    controls: atomControls({
      stateKey,
      setStateKey,
      view,
      setView,
      speed,
      setSpeed,
      playing,
      setPlaying,
      timeRef,
      setNow,
      stats: h(AtomStats, { key: 'stats', now, emission, atom }),
    }),
    notes: notes(),
  });
}
