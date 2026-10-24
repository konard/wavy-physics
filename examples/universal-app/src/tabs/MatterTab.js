import {
  createElement as h,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ColorLegend,
  Figure,
  PlayControls,
  Select,
  SeriesLegend,
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
import { MATTER_SCENARIOS } from './matter-scenarios.js';

const COLUMNS = 240;
const ROWS = 160;

/** |ψ|² resampled onto the visible x range. */
function visibleDensity(sim, scenario) {
  const rho = sim.density();
  const [low, high] = scenario.xRange;
  const x = new Float64Array(COLUMNS);
  const y = new Float64Array(COLUMNS);
  const dx = sim.x[1] - sim.x[0];
  for (let c = 0; c < COLUMNS; c++) {
    x[c] = low + ((c + 0.5) * (high - low)) / COLUMNS;
    const index = Math.round((x[c] - sim.x[0]) / dx);
    y[c] = rho[Math.max(0, Math.min(sim.x.length - 1, index))];
  }
  return { x, y };
}

function createRun(scenario) {
  const sim = scenario.create();
  const first = visibleDensity(sim, scenario);
  return {
    sim,
    scale: peak(first.y),
    history: new Float32Array(COLUMNS * ROWS),
    row: 0,
  };
}

function recordRow(run, scenario, density) {
  const row = Math.min(
    ROWS - 1,
    Math.floor((run.sim.time / scenario.duration) * ROWS)
  );
  for (let r = run.row; r <= row; r++) {
    run.history.set(
      density.y.map((value) => Math.sqrt(value / run.scale)),
      r * COLUMNS
    );
  }
  run.row = row + 1;
}

function drawSnapshot(canvas, { scenario, density, run }) {
  const series = [{ x: density.x, y: density.y, fill: true }];
  const yMax = run.scale * 1.25;
  if (scenario.potential) {
    const potential = density.x.map(scenario.potential);
    const top = peak(potential);
    series.push({
      x: density.x,
      y: potential.map((v) => (v / top) * yMax * 0.6),
      dashed: true,
    });
  }
  drawLines(canvas, {
    series,
    xRange: scenario.xRange,
    yRange: [0, yMax],
    xLabel:
      scenario.value === 'dirac'
        ? 'x (reduced Compton wavelengths)'
        : 'x (bohr)',
  });
}

function matterNotes(scenario) {
  return [
    h('h3', { key: 'h' }, 'What the equation is doing'),
    h('p', { key: 'a' }, scenario.explain),
    h(
      'p',
      { key: 'b' },
      'All five are solved with the same split-operator Fourier method: the wave is moved alternately in position space (potential) and momentum space (kinetic energy), which keeps the total probability exactly 1.'
    ),
  ];
}

export function MatterTab({ dark }) {
  const [key, setKey] = useState('barrier');
  const [playing, setPlaying] = usePlaying();
  const [generation, setGeneration] = useState(0);
  const [, setTick] = useState(0);
  const scenario = MATTER_SCENARIOS.find((entry) => entry.value === key);
  const run = useMemo(
    () => generation >= 0 && createRun(scenario),
    [scenario, generation]
  );
  const snapshotRef = useRef(null);
  const historyRef = useRef(null);

  const render = () => {
    const density = visibleDensity(run.sim, scenario);
    recordRow(run, scenario, density);
    drawSnapshot(snapshotRef.current, { scenario, density, run });
    drawField(historyRef.current, run.history, {
      nx: COLUMNS,
      ny: ROWS,
      kind: 'sequential',
      dark,
      range: 1,
    });
  };
  useAnimation(() => {
    if (run.sim.time >= scenario.duration) {
      setGeneration((value) => value + 1);
      return;
    }
    run.sim.step(scenario.dt, scenario.stepsPerFrame);
    render();
    setTick((value) => value + 1);
  }, playing);
  useEffect(() => render());

  const stats = scenario.stats(run.sim);
  return h(TabLayout, {
    title: 'Particles as wave packets',
    intro:
      'Electrons, atoms and molecules all interfere, diffract and tunnel: they are waves. Here a single wave equation produces particle-like behaviour — and the effects no particle could produce.',
    figures: [
      h(
        Figure,
        {
          key: 'snapshot',
          canvasRef: snapshotRef,
          width: 640,
          height: 260,
          label: `${scenario.label}: probability density now`,
          readout: (fx) => {
            const [low, high] = scenario.xRange;
            const x = low + fx * (high - low);
            return `x ${format(x, 3)} · t ${format(run.sim.time, 3)}`;
          },
        },
        h(SeriesLegend, {
          items: [
            { label: '|ψ|² now' },
            ...(scenario.potential
              ? [{ label: 'potential V(x), scaled', dashed: true }]
              : []),
          ],
        })
      ),
      h(
        Figure,
        {
          key: 'history',
          canvasRef: historyRef,
          width: 640,
          height: 360,
          label: `${scenario.label}: space-time picture`,
          readout: (fx, fy) => {
            const [low, high] = scenario.xRange;
            return `x ${format(low + fx * (high - low), 3)} · t ${format(
              fy * scenario.duration,
              3
            )}`;
          },
          caption: `Space–time diagram: x across, time downward from 0 to ${format(
            scenario.duration,
            3
          )} (atomic units). `,
        },
        h(ColorLegend, {
          kind: 'sequential',
          dark,
          low: '0',
          high: '√|ψ|²',
        })
      ),
    ],
    controls: [
      h(Select, {
        key: 'scenario',
        id: 'matter-scenario',
        label: 'Experiment',
        value: key,
        options: MATTER_SCENARIOS,
        onChange: setKey,
      }),
      h(PlayControls, {
        key: 'play',
        playing,
        setPlaying,
        onReset: () => setGeneration((value) => value + 1),
      }),
      h(
        StatRow,
        { key: 'stats' },
        h(Stat, {
          label: 'Time',
          value: `${format(run.sim.time, 3)} a.u.`,
        }),
        ...stats.map((entry) => h(Stat, { key: entry.label, ...entry }))
      ),
    ],
    notes: matterNotes(scenario),
  });
}
