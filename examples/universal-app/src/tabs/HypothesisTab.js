import {
  createElement as h,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { twoLevelEmission } from '../physics.js';
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

const POINTS = 201;

const VERDICTS = [
  {
    tone: 'established',
    heading: 'Well established: particles are wave excitations',
    points: [
      'Electrons, neutrons, atoms and even 2000-atom molecules show interference — they propagate as waves (de Broglie, Davisson–Germer, Arndt et al.).',
      'In quantum field theory, the best-tested theory we have, every particle is a quantised ripple (excitation) of a field that fills space.',
      'Atoms are standing electron waves: the hydrogen spectrum, fine structure and lifetimes on these pages follow from wave equations alone.',
      'Light is emitted when charge oscillates or accelerates — Maxwell’s equations, again a wave equation.',
    ],
  },
  {
    tone: 'partly',
    heading: 'True with an important qualification',
    points: [
      'The waves are not waves in ordinary space carrying a fraction of an electron: an electron is always detected whole, at one spot. The wave sets the probabilities (Born rule).',
      'For two or more particles the wave lives in a 3N-dimensional configuration space, not in our 3D space, and it produces entanglement that no set of classical waves can mimic (Bell-test experiments, Nobel Prize 2022).',
      'An excited atom with no oscillating charge still emits light. Classical waves predict nothing; only the quantised electromagnetic field (QED) gets it right — see the chart.',
    ],
  },
  {
    tone: 'open',
    heading: 'Open or speculative',
    points: [
      'Stable lumps of a classical field (solitons) do exist, but Derrick’s theorem forbids static ones in three dimensions for simple scalar fields; they need extra structure (topology, gauge fields, internal rotation as in Q-balls). No accepted model builds the electron this way.',
      '“Waves made of waves” at every scale (a fractal) is not supported by data. Effective field theories do nest — atoms → nucleons → quarks and gluons, all quantum fields — and string theory proposes vibrating strings, but none of this is a confirmed infinite tower.',
      'Pilot-wave (de Broglie–Bohm) and “walking droplet” analogies keep a real wave guiding a particle; they reproduce many quantum effects but need non-local dynamics.',
    ],
  },
];

function emissionCurves() {
  const x = new Float64Array(POINTS);
  const classical = new Float64Array(POINTS);
  const quantum = new Float64Array(POINTS);
  for (let i = 0; i < POINTS; i++) {
    x[i] = i / (POINTS - 1);
    const power = twoLevelEmission({
      einsteinA: 1,
      omega: 1,
      upperPopulation: x[i],
    });
    classical[i] = power.semiclassical;
    quantum[i] = power.quantum;
  }
  return { x, classical, quantum };
}

function EmissionPanel() {
  const [population, setPopulation] = useState(1);
  const canvasRef = useRef(null);
  const curves = useMemo(emissionCurves, []);
  const now = twoLevelEmission({
    einsteinA: 1,
    omega: 1,
    upperPopulation: population,
  });
  useEffect(() => {
    drawLines(canvasRef.current, {
      series: [
        { x: curves.x, y: curves.classical },
        { x: curves.x, y: curves.quantum },
        { x: [population, population], y: [-1, 2], dashed: true },
      ],
      xRange: [0, 1],
      yRange: [0, 1.05],
      xLabel: 'probability of finding the atom excited, |c₂|²',
    });
  });
  return h(
    'section',
    { className: 'panel' },
    h('h3', null, 'Test case: does a classical charge wave explain the light?'),
    h(
      Figure,
      {
        canvasRef,
        width: 640,
        height: 260,
        label:
          'Light power of a 1s/2p hydrogen atom: classical charge wave against quantum electrodynamics',
        readout: (fx) =>
          `|c₂|² ${format(fx, 3)} · classical ${format(
            fx * (1 - fx),
            3
          )} · QED ${format(fx, 3)} (units of Aħω)`,
        caption:
          'Power in units of Aħω (Einstein A coefficient times photon energy). Experiments agree with QED: a fully excited atom radiates most strongly. ',
      },
      h(SeriesLegend, {
        items: [
          { label: 'classical oscillating cloud (Larmor): |c₁|²|c₂|²' },
          { label: 'quantum field (QED): |c₂|²' },
          { label: 'chosen state', dashed: true },
        ],
      })
    ),
    h(
      'div',
      { className: 'controls controls-inline' },
      h(Slider, {
        id: 'hypothesis-population',
        label: 'Excited fraction |c₂|²',
        value: population,
        min: 0,
        max: 1,
        step: 0.05,
        onChange: setPopulation,
        format: (v) => v.toFixed(2),
      }),
      h(
        StatRow,
        null,
        h(Stat, {
          label: 'Classical wave predicts',
          value: format(now.semiclassical, 3),
        }),
        h(Stat, {
          label: 'Quantum field predicts',
          value: format(now.quantum, 3),
          detail: 'measured: 2p decays in 1.596 ns',
        })
      )
    )
  );
}

function Verdict({ tone, heading, points }) {
  return h(
    'section',
    { className: `verdict verdict-${tone}` },
    h('h3', null, heading),
    h(
      'ul',
      null,
      points.map((point) => h('li', { key: point }, point))
    )
  );
}

export function HypothesisTab() {
  return h(TabLayout, {
    title: 'Is everything a wave?',
    intro:
      'The hypothesis: everything is a wave, particles are wave packets or stable wave configurations, and waves are made of waves. Here is how it holds up against established physics.',
    figures: [
      ...VERDICTS.map((verdict) =>
        h(Verdict, { key: verdict.tone, ...verdict })
      ),
      h(EmissionPanel, { key: 'emission' }),
    ],
    controls: [
      h(
        StatRow,
        { key: 'summary' },
        h(Stat, {
          label: 'Verdict',
          value: 'Mostly yes',
          detail:
            'if “wave” means a quantum field — not a classical wave in 3D space',
        })
      ),
    ],
    notes: [
      h('h3', { key: 'h' }, 'Sources'),
      h(
        'ul',
        { key: 'l', className: 'sources' },
        h('li', null, 'Davisson & Germer, Phys. Rev. 30, 705 (1927)'),
        h(
          'li',
          null,
          'Fein et al., Nature Physics 15, 1242 (2019): 25 000 Da molecule interference'
        ),
        h('li', null, 'Derrick, J. Math. Phys. 5, 1252 (1964)'),
        h('li', null, 'Weisskopf & Wigner, Z. Phys. 63, 54 (1930)'),
        h('li', null, 'NIST Atomic Spectra Database; CODATA 2022'),
        h(
          'li',
          null,
          'Full discussion: docs/case-studies/issue-1 in the repository'
        )
      ),
    ],
  });
}
