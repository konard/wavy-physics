import {
  createElement as h,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  boxCountingDimension,
  gibbsPeak,
  squareWavePartialSum,
  weierstrass,
  weierstrassDimension,
} from '../physics.js';
import {
  Figure,
  SeriesLegend,
  Slider,
  Stat,
  StatRow,
  TabLayout,
  drawLines,
  format,
} from '../ui.js';

const POINTS = 1200;
const B = 3;

function fourierCurves(terms) {
  const x = new Float64Array(POINTS);
  const sum = new Float64Array(POINTS);
  const square = new Float64Array(POINTS);
  const harmonic = new Float64Array(POINTS);
  const k = 2 * terms - 1;
  for (let i = 0; i < POINTS; i++) {
    x[i] = -Math.PI + (2 * Math.PI * i) / (POINTS - 1);
    sum[i] = squareWavePartialSum(x[i], terms);
    square[i] = Math.sign(Math.sin(x[i]));
    harmonic[i] = (4 / Math.PI) * (Math.sin(k * x[i]) / k);
  }
  return { x, sum, square, harmonic };
}

/** The Weierstrass wave on a window that zooms in by factors of b. */
function weierstrassWindow(a, zoom) {
  const width = 2 / B ** zoom;
  const x = new Float64Array(POINTS);
  const y = new Float64Array(POINTS);
  for (let i = 0; i < POINTS; i++) {
    x[i] = -width / 2 + (width * i) / (POINTS - 1);
    y[i] = weierstrass(x[i], { a, b: B, terms: 40 });
  }
  return { x, y, width };
}

function estimateDimension(a) {
  const samples = new Float64Array(3 ** 9 + 1);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = weierstrass(i / (samples.length - 1), { a, b: B, terms: 40 });
  }
  return boxCountingDimension(samples);
}

function range(values) {
  let low = Infinity;
  let high = -Infinity;
  for (const value of values) {
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  const pad = (high - low) * 0.08 || 1;
  return [low - pad, high + pad];
}

function FourierPanel() {
  const [terms, setTerms] = useState(8);
  const canvasRef = useRef(null);
  const curves = useMemo(() => fourierCurves(terms), [terms]);
  useEffect(() => {
    drawLines(canvasRef.current, {
      series: [
        { x: curves.x, y: curves.square, dashed: true },
        { x: curves.x, y: curves.sum },
        { x: curves.x, y: curves.harmonic },
      ],
      xRange: [-Math.PI, Math.PI],
      yRange: [-1.4, 1.4],
      xLabel: 'x (one period, −π to π)',
    });
  });
  // The jump is from −1 to +1, so its height is 2.
  const overshoot = (gibbsPeak(terms) - 1) / 2;
  return h(
    'section',
    { className: 'panel' },
    h('h3', null, 'Any wave shape is a sum of pure waves'),
    h(
      Figure,
      {
        canvasRef,
        width: 640,
        height: 280,
        label: `Square wave built from ${terms} sine waves`,
        readout: (fx) => {
          const x = -Math.PI + fx * 2 * Math.PI;
          return `x ${format(x, 3)} · sum ${format(
            squareWavePartialSum(x, terms),
            4
          )}`;
        },
      },
      h(SeriesLegend, {
        items: [
          { label: 'target: square wave', dashed: true },
          { label: `sum of ${terms} odd harmonics` },
          { label: `newest harmonic, k = ${2 * terms - 1}` },
        ],
      })
    ),
    h(
      'div',
      { className: 'controls controls-inline' },
      h(Slider, {
        id: 'fourier-terms',
        label: 'Number of sine waves',
        value: terms,
        min: 1,
        max: 60,
        step: 1,
        onChange: setTerms,
      }),
      h(
        StatRow,
        null,
        h(Stat, {
          label: 'Overshoot at the jump (Gibbs)',
          value: `${format(overshoot * 100, 4)} %`,
          detail: 'of the jump height; tends to 8.949 %, never to zero',
        })
      )
    )
  );
}

function FractalPanel() {
  const [a, setA] = useState(0.6);
  const [zoom, setZoom] = useState(0);
  const canvasRef = useRef(null);
  const curve = useMemo(() => weierstrassWindow(a, zoom), [a, zoom]);
  const measured = useMemo(() => estimateDimension(a), [a]);
  useEffect(() => {
    drawLines(canvasRef.current, {
      series: [{ x: curve.x, y: curve.y }],
      xRange: [curve.x[0], curve.x[POINTS - 1]],
      yRange: range(curve.y),
      xLabel: `x (window width ${format(curve.width, 3)})`,
    });
  });
  return h(
    'section',
    { className: 'panel' },
    h('h3', null, 'Waves made of waves: a fractal wave'),
    h(Figure, {
      canvasRef,
      width: 640,
      height: 280,
      label: 'Weierstrass function: waves on waves on waves',
      readout: (fx) => {
        const x = curve.x[0] + fx * curve.width;
        return `x ${format(x, 4)} · W ${format(
          weierstrass(x, { a, b: B, terms: 40 }),
          4
        )}`;
      },
      caption: `W(x) = Σ aⁿ cos(3ⁿ π x), 40 terms. Each zoom step magnifies ${B}×; the same wiggles keep appearing. `,
    }),
    h(
      'div',
      { className: 'controls controls-inline' },
      h(Slider, {
        id: 'fractal-a',
        label: 'Amplitude ratio a',
        value: a,
        min: 0.4,
        max: 0.9,
        step: 0.05,
        onChange: setA,
        format: (v) => v.toFixed(2),
      }),
      h(Slider, {
        id: 'fractal-zoom',
        label: 'Zoom',
        value: zoom,
        min: 0,
        max: 8,
        step: 1,
        onChange: setZoom,
        format: (v) => `${B}^${v} = ${B ** v}×`,
      }),
      h(
        StatRow,
        null,
        h(Stat, {
          label: 'Fractal dimension (theory)',
          value: format(weierstrassDimension({ a, b: B }), 4),
          detail: 'D = 2 + ln a / ln b',
        }),
        h(Stat, {
          label: 'Measured by box counting',
          value: format(measured, 4),
          detail: `${3 ** 9 + 1} samples, 4 scales`,
        })
      )
    )
  );
}

export function FractalTab() {
  return h(TabLayout, {
    title: 'Are waves made of waves?',
    intro:
      'Fourier showed that every shape — even a sharp step, or a particle-like lump — is a sum of pure sine waves. Carried on forever, waves built from ever smaller waves become fractal.',
    figures: [
      h(FourierPanel, { key: 'fourier' }),
      h(FractalPanel, { key: 'fractal' }),
    ],
    controls: [
      h(
        'p',
        { key: 'hint', className: 'hint' },
        'Drag the sliders under each picture. Hover a curve to read its value.'
      ),
    ],
    notes: [
      h('h3', { key: 'h' }, 'How far the fractal idea goes'),
      h(
        'p',
        { key: 'a' },
        'Mathematically, “waves made of waves” is exact: Fourier analysis, and wave packets in every tab of this site, are sums of waves. The Weierstrass wave shows the limit — infinitely many scales, continuous everywhere but smooth nowhere.'
      ),
      h(
        'p',
        { key: 'b' },
        'Physically it is an open question. In quantum field theory each particle is a ripple of a field, and the vacuum itself fluctuates on every scale we can probe — but no experiment yet shows an endless tower of smaller waves. The hypothesis tab sets out what is established and what is speculation.'
      ),
    ],
  });
}
