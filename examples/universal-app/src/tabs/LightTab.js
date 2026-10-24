import {
  createElement as h,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FDTD2D,
  kickedCharge,
  larmorPower,
  oscillatingCharge,
  sampleFieldPlane,
} from '../physics.js';
import {
  ColorLegend,
  Figure,
  PlayControls,
  Select,
  Slider,
  Stat,
  StatRow,
  TabLayout,
  drawField,
  format,
  useAnimation,
  usePlaying,
} from '../ui.js';
import { chartInk } from '../colors.js';

const CELLS = 200;
const ABSORBING = 20;
const GLASS_INDEX = 1.5;
const LW_RESOLUTION = 44;
const LW_FRAME_MS = 150;
const SOURCE_CLEARANCE = 15;
const LW_EXTENT = 24;

const SOURCES = [
  { value: 'oscillating', label: 'Oscillating charge (antenna)' },
  { value: 'pulse', label: 'Single push (one burst)' },
];

function makeGrid({ source, wavelength, glass }) {
  const grid = new FDTD2D({
    nx: CELLS,
    ny: CELLS,
    absorbingCells: ABSORBING,
    permittivity: glass
      ? (i) => (i > CELLS * 0.62 ? GLASS_INDEX * GLASS_INDEX : 1)
      : 1,
  });
  const omega = (2 * Math.PI) / wavelength;
  const current =
    source === 'oscillating'
      ? // Smooth switch-on avoids a spurious broadband flash.
        (t) =>
          Math.sin(omega * t) * (1 - Math.exp(-((t / (2 * wavelength)) ** 2)))
      : (t) => -(t - 30) * Math.exp(-(((t - 30) / 8) ** 2)) * 0.2;
  grid.addDipole({ i: CELLS / 2, j: CELLS / 2, axis: 'y', current });
  return grid;
}

/** Largest |H_z| away from the source, where the field is radiation. */
function farPeak(hz) {
  const centre = CELLS / 2;
  let largest = 0;
  for (let j = ABSORBING; j < CELLS - ABSORBING; j += 2) {
    for (let i = ABSORBING; i < CELLS - ABSORBING; i += 2) {
      const near =
        Math.abs(i - centre) < SOURCE_CLEARANCE &&
        Math.abs(j - centre) < SOURCE_CLEARANCE;
      if (!near) {
        largest = Math.max(largest, Math.abs(hz[j * CELLS + i]));
      }
    }
  }
  return largest;
}

function drawGlass(canvas) {
  const context = canvas.getContext('2d');
  const ink = chartInk();
  const x = canvas.width * 0.62;
  context.strokeStyle = ink.secondary;
  context.setLineDash([6, 4]);
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x, 0);
  context.lineTo(x, canvas.height);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = ink.secondary;
  context.font = '13px system-ui, sans-serif';
  context.fillText(`glass, n = ${GLASS_INDEX}`, x + 8, 20);
}

function FdtdPanel({ dark, playing }) {
  const [source, setSource] = useState('oscillating');
  const [wavelength, setWavelength] = useState(24);
  const [glass, setGlass] = useState('vacuum');
  const [stepsPerFrame, setStepsPerFrame] = useState(3);
  const [generation, setGeneration] = useState(0);
  const canvasRef = useRef(null);
  const grid = useMemo(
    () =>
      // A new `generation` starts a fresh run.
      generation >= 0 &&
      makeGrid({ source, wavelength, glass: glass === 'glass' }),
    [source, wavelength, glass, generation]
  );
  const display = useMemo(() => new Float32Array(CELLS * CELLS), []);
  const rangeRef = useRef(0);
  const render = () => {
    // Held, slowly decaying maximum: the colour scale follows the outgoing
    // light and does not blow up numerical noise after a pulse leaves.
    rangeRef.current = Math.max(rangeRef.current * 0.995, farPeak(grid.hz));
    const range = Math.max(rangeRef.current, 1e-4);
    for (let j = 0; j < CELLS; j++) {
      for (let i = 0; i < CELLS; i++) {
        display[(CELLS - 1 - j) * CELLS + i] = grid.hz[j * CELLS + i];
      }
    }
    drawField(canvasRef.current, display, {
      nx: CELLS,
      ny: CELLS,
      kind: 'diverging',
      dark,
      range,
    });
    if (glass === 'glass') {
      drawGlass(canvasRef.current);
    }
  };
  useAnimation(() => {
    grid.step(stepsPerFrame);
    render();
  }, playing);
  useEffect(() => {
    if (grid.time === 0) {
      rangeRef.current = 0;
      grid.step(Math.round(CELLS * 0.9));
    }
    render();
  });
  return h(
    'div',
    { className: 'panel-grid' },
    h(
      Figure,
      {
        canvasRef,
        width: 600,
        height: 600,
        square: true,
        label: 'Magnetic field of light radiated by an oscillating charge',
        readout: (fx, fy) => {
          const i = Math.floor(fx * CELLS);
          const j = CELLS - 1 - Math.floor(fy * CELLS);
          return `cell (${i}, ${j}) · H_z ${format(grid.hz[j * CELLS + i], 3)}`;
        },
        caption:
          'Maxwell’s equations solved on a 200 × 200 Yee grid (2D TE light, absorbing edges). The charge oscillates up and down at the centre; its light is strongest sideways and vanishes along the axis of motion. ',
      },
      h(ColorLegend, {
        kind: 'diverging',
        dark,
        low: '−H_z',
        middle: '0',
        high: '+H_z',
      })
    ),
    h(
      'div',
      { className: 'controls' },
      h(Select, {
        id: 'light-source',
        label: 'Source',
        value: source,
        options: SOURCES,
        onChange: setSource,
      }),
      source === 'oscillating' &&
        h(Slider, {
          id: 'light-wavelength',
          label: 'Wavelength',
          value: wavelength,
          min: 12,
          max: 48,
          step: 4,
          onChange: setWavelength,
          format: (v) => `${v} cells`,
        }),
      h(Select, {
        id: 'light-medium',
        label: 'Right side',
        value: glass,
        options: [
          { value: 'vacuum', label: 'Vacuum' },
          { value: 'glass', label: `Glass (n = ${GLASS_INDEX})` },
        ],
        onChange: setGlass,
      }),
      h(Slider, {
        id: 'light-speed',
        label: 'Steps per frame',
        value: stepsPerFrame,
        min: 1,
        max: 8,
        step: 1,
        onChange: setStepsPerFrame,
      }),
      h(
        'button',
        {
          type: 'button',
          className: 'button',
          onClick: () => setGeneration(generation + 1),
        },
        'Restart field'
      )
    )
  );
}

function LienardPanel({ dark, playing }) {
  const [speed, setSpeed] = useState(0.6);
  const [mode, setMode] = useState('kick');
  const [component, setComponent] = useState('radiation');
  const canvasRef = useRef(null);
  const timeRef = useRef(14);
  const lastRenderRef = useRef(0);
  const trajectory = useMemo(
    () =>
      mode === 'kick'
        ? kickedCharge({ speed, start: 0, duration: 2 })
        : oscillatingCharge({ amplitude: speed * 2, omega: 0.5, axis: 0 }),
    [mode, speed]
  );
  const render = () => {
    const t = timeRef.current;
    const plane = sampleFieldPlane(trajectory, t, {
      extent: LW_EXTENT,
      resolution: LW_RESOLUTION,
      component,
    });
    const values = plane.values;
    if (component === 'magnitude') {
      for (let i = 0; i < values.length; i++) {
        values[i] = Math.max(0, Math.log10(values[i]) + 3.5) / 3;
      }
    }
    drawField(canvasRef.current, values, {
      nx: LW_RESOLUTION,
      ny: LW_RESOLUTION,
      kind: component === 'magnitude' ? 'sequential' : 'diverging',
      dark,
      range:
        component === 'magnitude'
          ? 1
          : ((mode === 'kick' ? 0.012 : 0.03) * speed) / 0.6,
    });
  };
  useAnimation((elapsed) => {
    timeRef.current += elapsed * 5;
    const limit = mode === 'kick' ? LW_EXTENT * 1.2 : Infinity;
    if (timeRef.current > limit) {
      timeRef.current = 0.5;
    }
    // The exact retarded field costs a root solve per pixel: throttle it.
    const now = performance.now();
    if (now - lastRenderRef.current > LW_FRAME_MS) {
      lastRenderRef.current = now;
      render();
    }
  }, playing);
  useEffect(() => render());
  const acceleration = mode === 'kick' ? speed / 2 : speed * 2 * 0.25;
  return h(
    'div',
    { className: 'panel-grid' },
    h(
      Figure,
      {
        canvasRef,
        width: 560,
        height: 560,
        square: true,
        label: 'Exact retarded field of an accelerated point charge',
        readout: (fx, fy) =>
          `x ${format((2 * fx - 1) * LW_EXTENT, 3)}, y ${format(
            (1 - 2 * fy) * LW_EXTENT,
            3
          )} (c = 1 units) · t ${format(timeRef.current, 3)}`,
        caption:
          mode === 'kick'
            ? 'A charge at rest is pushed to the right for 2 time units. Outside the shell (radius ct) the field still points at where the charge would have been; inside, at where it is. The kink between them is a pulse of light flying outward at c. '
            : 'A charge oscillating along x: the Liénard–Wiechert radiation field forms expanding wave crests, strongest broadside, zero along the motion. ',
      },
      h(ColorLegend, {
        kind: component === 'magnitude' ? 'sequential' : 'diverging',
        dark,
        low: component === 'magnitude' ? '10⁻³·⁵' : '−E_rad',
        middle: component === 'magnitude' ? null : '0',
        high: component === 'magnitude' ? '|E| (log)' : '+E_rad',
      })
    ),
    h(
      'div',
      { className: 'controls' },
      h(Select, {
        id: 'lw-mode',
        label: 'Motion',
        value: mode,
        options: [
          { value: 'kick', label: 'Kicked charge (pulse)' },
          { value: 'oscillate', label: 'Oscillating charge' },
        ],
        onChange: (value) => {
          timeRef.current = value === 'kick' ? 14 : 30;
          setMode(value);
        },
      }),
      h(Slider, {
        id: 'lw-speed',
        label: mode === 'kick' ? 'Final speed v/c' : 'Peak speed v/c',
        value: speed,
        min: 0.1,
        max: 0.9,
        step: 0.1,
        onChange: setSpeed,
        format: (v) => v.toFixed(1),
      }),
      h(Select, {
        id: 'lw-component',
        label: 'Show',
        value: component,
        options: [
          { value: 'radiation', label: 'Radiation (1/R) field only' },
          { value: 'magnitude', label: 'Total |E| (log scale)' },
        ],
        onChange: setComponent,
      }),
      h(
        StatRow,
        null,
        h(Stat, {
          label: 'Larmor power while accelerating',
          value: format(larmorPower(acceleration), 3),
          detail: 'P = 2q²a²/3c³ (q = c = 1)',
        })
      )
    )
  );
}

export function LightTab({ dark }) {
  const [playing, setPlaying] = usePlaying();
  return h(TabLayout, {
    title: 'Light from accelerating charge waves',
    intro:
      'Light is itself a wave — of the electromagnetic field. It is produced whenever charge accelerates: an oscillating electron cloud (like the atom on the first tab) is an antenna. Two independent calculations show it.',
    figures: [
      h('h3', { key: 'h1' }, '1 · Maxwell’s equations on a grid (FDTD)'),
      h(FdtdPanel, { key: 'fdtd', dark, playing }),
      h('h3', { key: 'h2' }, '2 · Exact field of a moving point charge'),
      h(LienardPanel, { key: 'lw', dark, playing }),
    ],
    controls: [
      h(PlayControls, { key: 'play', playing, setPlaying }),
      h(
        'p',
        { key: 'p', className: 'hint' },
        'Hover or touch a picture to read the field at that point.'
      ),
    ],
    notes: [
      h('h3', { key: 'h' }, 'From the atom to light'),
      h(
        'p',
        { key: 'a' },
        'A superposition of 1s and 2p has an oscillating dipole d(t) = d₀ cos ωt. Larmor’s formula turns that into radiated power, and the wave picture predicts the exact Lyman-α frequency. The validation tab checks these calculations against NIST data.'
      ),
      h(
        'p',
        { key: 'b' },
        'Classical waves alone are not the whole story: an atom purely in 2p has no oscillating dipole, yet it still decays in 1.6 ns. That spontaneous emission needs the quantised light field of QED — the electromagnetic field’s own zero-point waves. The library computes both and compares them (see the hypothesis tab).'
      ),
    ],
  });
}
