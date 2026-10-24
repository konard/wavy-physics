import {
  createElement as h,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AU,
  auTimeToSeconds,
  bohrToMeters,
  circularWavePacket,
  keplerPeriod,
} from '../physics.js';
import {
  ColorLegend,
  Figure,
  PlayControls,
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
import { chartInk } from '../colors.js';

const RESOLUTION = 112;
const COUNT = 7;
const ATOM = { nucleusMass: AU.protonMass };

/** |⟨ψ(0)|ψ(t)⟩|²: 1 when the packet looks exactly as it did at t = 0. */
function autocorrelation(packet, t) {
  let re = 0;
  let im = 0;
  for (let k = 0; k < COUNT; k++) {
    const [ar, ai] = packet.coefficient(k, 0);
    const [br, bi] = packet.coefficient(k, t);
    re += ar * br + ai * bi;
    im += ar * bi - ai * br;
  }
  return re * re + im * im;
}

function overlay(canvas, { packet, t, nMean, extent }) {
  const context = canvas.getContext('2d');
  const ink = chartInk();
  const toPixel = (u, v) => [
    ((u + extent) / (2 * extent)) * canvas.width,
    ((extent - v) / (2 * extent)) * canvas.height,
  ];
  const [cx, cy] = toPixel(0, 0);
  const radius = ((nMean * nMean) / (2 * extent)) * canvas.width;
  context.setLineDash([6, 6]);
  context.lineWidth = 1;
  context.strokeStyle = ink.muted;
  context.beginPath();
  context.arc(cx, cy, radius, 0, 2 * Math.PI);
  context.stroke();
  context.setLineDash([]);
  // Nucleus.
  context.fillStyle = ink.series[1];
  context.beginPath();
  context.arc(cx, cy, 5, 0, 2 * Math.PI);
  context.fill();
  // ⟨r⟩ of the wave: where a classical electron would be.
  const [x, y] = packet.expectationPosition(t);
  const [px, py] = toPixel(x, y);
  context.strokeStyle = ink.surface;
  context.lineWidth = 2;
  context.fillStyle = ink.series[1];
  context.beginPath();
  context.arc(px, py, 6, 0, 2 * Math.PI);
  context.fill();
  context.stroke();
}

function correlationCurve(packet, period, span) {
  const points = 600;
  const x = new Float64Array(points);
  const y = new Float64Array(points);
  for (let i = 0; i < points; i++) {
    x[i] = (span * i) / (points - 1);
    y[i] = autocorrelation(packet, x[i] * period);
  }
  return { x, y };
}

function orbitNotes() {
  return [
    h('h3', { key: 'h' }, 'Why it orbits, spreads and revives'),
    h(
      'p',
      { key: 'a' },
      'Every term turns at its own frequency Eₙ/ħ. Neighbouring terms differ by about 1/n³, so the lump moves round at the classical Kepler frequency. Because the spacing is not perfectly even, the lump smears into a ring — a quantum effect a point particle cannot show — and after the revival time all the phases realign.'
    ),
    h(
      'p',
      { key: 'b' },
      'This is the textbook picture of how a particle-like electron emerges from waves. Such packets have been made and observed in real Rydberg atoms with picosecond lasers.'
    ),
  ];
}

function orbitControls({
  nMean,
  setNMean,
  width,
  setWidth,
  orbitsPerSecond,
  setOrbitsPerSecond,
  playing,
  setPlaying,
  restart,
  stats: { now, period, revival },
}) {
  return [
    h(Slider, {
      key: 'n',
      id: 'orbit-n',
      label: 'Mean principal number n̄',
      value: nMean,
      min: 6,
      max: 16,
      step: 1,
      onChange: (value) => {
        restart();
        setNMean(value);
      },
    }),
    h(Slider, {
      key: 'width',
      id: 'orbit-width',
      label: 'Spread of n (σₙ)',
      value: width,
      min: 0.6,
      max: 2.4,
      step: 0.2,
      onChange: (value) => {
        restart();
        setWidth(value);
      },
      format: (v) => v.toFixed(1),
    }),
    h(Slider, {
      key: 'speed',
      id: 'orbit-speed',
      label: 'Orbits per second',
      value: orbitsPerSecond,
      min: 0.1,
      max: 3,
      step: 0.1,
      onChange: setOrbitsPerSecond,
      format: (v) => v.toFixed(1),
    }),
    h(PlayControls, { key: 'play', playing, setPlaying, onReset: restart }),
    h(
      StatRow,
      { key: 'stats' },
      h(Stat, {
        label: 'Orbits completed',
        value: format(now / period, 3),
      }),
      h(Stat, {
        label: 'Kepler period 2πn̄³',
        value: `${format(auTimeToSeconds(period) * 1e15, 4)} fs`,
      }),
      h(Stat, {
        label: 'Revival after',
        value: `${format(revival, 3)} orbits`,
        detail: 'T_rev = (2n̄/3) T_K from E ∝ −1/n²',
      }),
      h(Stat, {
        label: 'Orbit radius',
        value: `${format(bohrToMeters(nMean * nMean) * 1e9, 3)} nm`,
      })
    ),
  ];
}

export function OrbitTab({ dark }) {
  const [nMean, setNMean] = useState(10);
  const [width, setWidth] = useState(1.2);
  const [orbitsPerSecond, setOrbitsPerSecond] = useState(0.5);
  const [playing, setPlaying] = usePlaying();
  const [now, setNow] = useState(0);
  const timeRef = useRef(0);
  const fieldRef = useRef(null);
  const traceRef = useRef(null);
  const period = keplerPeriod(nMean, ATOM);
  const extent = Math.ceil(1.7 * nMean * nMean);
  const revival = (2 * nMean) / 3;
  const packet = useMemo(
    () => circularWavePacket({ nMean, width, count: COUNT, ...ATOM }),
    [nMean, width]
  );
  const sampler = useMemo(
    () =>
      packet.createPlaneSampler({
        plane: 'xy',
        extent,
        resolution: RESOLUTION,
      }),
    [packet, extent]
  );
  const buffer = useMemo(() => new Float32Array(RESOLUTION * RESOLUTION), []);
  const span = Math.ceil(revival * 1.25);
  const correlation = useMemo(
    () => correlationCurve(packet, period, span),
    [packet, period, span]
  );
  const scale = useMemo(
    () => peak(sampler.density(0, buffer)),
    [sampler, buffer]
  );

  const render = (t) => {
    const values = sampler.density(t, buffer);
    for (let i = 0; i < values.length; i++) {
      values[i] = Math.sqrt(values[i] / scale);
    }
    drawField(fieldRef.current, values, {
      nx: RESOLUTION,
      ny: RESOLUTION,
      kind: 'sequential',
      dark,
      range: 1,
    });
    overlay(fieldRef.current, { packet, t, nMean, extent });
    const orbits = (t / period) % span;
    drawLines(traceRef.current, {
      series: [
        { x: correlation.x, y: correlation.y, fill: true },
        { x: [orbits, orbits], y: [-1, 2], dashed: true },
      ],
      xRange: [0, span],
      yRange: [0, 1.05],
      xLabel: 'time in Kepler periods',
    });
  };
  useAnimation((elapsed) => {
    timeRef.current += elapsed * orbitsPerSecond * period;
    render(timeRef.current);
    setNow(timeRef.current);
  }, playing);
  useEffect(() => render(timeRef.current));

  const restart = () => {
    timeRef.current = 0;
    setNow(0);
  };
  return h(TabLayout, {
    title: 'The electron as a wave packet around the atom',
    intro:
      'Add a handful of circular standing waves (l = m = n − 1) of neighbouring energies and they interfere into a single lump that orbits the proton like Bohr’s electron — then spreads around the ring and, remarkably, reassembles.',
    figures: [
      h(
        Figure,
        {
          key: 'packet',
          canvasRef: fieldRef,
          width: 560,
          height: 560,
          square: true,
          label: `Rydberg wave packet around n = ${nMean}`,
          readout: (fx, fy) => {
            const x = (2 * fx - 1) * extent;
            const y = (1 - 2 * fy) * extent;
            return `x ${format(x, 3)}, y ${format(y, 3)} bohr · |ψ|² ${format(
              packet.density(x, y, 0, timeRef.current),
              3
            )}`;
          },
          caption: `Orbital plane, ±${extent} bohr. Dashed circle: Bohr radius n² a₀; dot: ⟨r⟩ of the wave; centre: proton. `,
        },
        h(ColorLegend, {
          kind: 'sequential',
          dark,
          low: '0',
          high: '√|ψ|² max',
        })
      ),
      h(
        Figure,
        {
          key: 'correlation',
          canvasRef: traceRef,
          width: 560,
          height: 200,
          label: 'Autocorrelation of the wave packet against time',
          readout: (fx) => {
            const orbits = fx * span;
            return `${format(orbits, 3)} orbits · |⟨ψ(0)|ψ(t)⟩|² ${format(
              autocorrelation(packet, orbits * period),
              3
            )}`;
          },
        },
        h(SeriesLegend, {
          items: [
            { label: '|⟨ψ(0)|ψ(t)⟩|²: overlap with the starting packet' },
            { label: 'now', dashed: true },
          ],
        })
      ),
    ],
    controls: orbitControls({
      nMean,
      setNMean,
      width,
      setWidth,
      orbitsPerSecond,
      setOrbitsPerSecond,
      playing,
      setPlaying,
      restart,
      stats: { now, period, revival },
    }),
    notes: orbitNotes(),
  });
}
