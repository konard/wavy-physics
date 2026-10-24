import { createElement as h, useEffect, useRef, useState } from 'react';
import { BENCHMARKS } from '../physics.js';
import { Stat, StatRow, TabLayout, format } from '../ui.js';

function startWorker(onResult, onDone) {
  const worker = new Worker(
    new URL('../validation-worker.js', import.meta.url),
    { type: 'module' }
  );
  worker.onmessage = ({ data }) => {
    if (data.type === 'result') {
      onResult(data.result);
    } else {
      onDone();
    }
  };
  worker.postMessage('run');
  return worker;
}

function formatValue(value, unit) {
  const digits = Math.abs(value) > 1e5 || Math.abs(value) < 1e-3 ? 6 : 7;
  return `${format(value, digits)}${unit ? ` ${unit}` : ''}`;
}

function ResultRow({ benchmark, result }) {
  if (!result) {
    return h(
      'tr',
      { className: 'pending' },
      h('td', null, benchmark.title),
      h('td', { colSpan: 4 }, 'running…')
    );
  }
  return h(
    'tr',
    null,
    h(
      'td',
      null,
      h('span', { className: 'row-title' }, result.title),
      h('span', { className: 'row-method' }, result.method)
    ),
    h('td', { className: 'number' }, formatValue(result.computed, result.unit)),
    h(
      'td',
      { className: 'number' },
      formatValue(result.reference, result.unit),
      h('span', { className: 'row-method' }, result.source)
    ),
    h(
      'td',
      { className: 'number' },
      `${format(result.error, 2)} ${result.errorKind === 'absolute' ? 'abs' : 'rel'}`,
      h(
        'span',
        { className: 'row-method' },
        `limit ${format(result.tolerance, 2)}`
      )
    ),
    h(
      'td',
      null,
      h(
        'span',
        { className: result.pass ? 'badge badge-pass' : 'badge badge-fail' },
        result.pass ? '✓ pass' : '✗ fail'
      )
    )
  );
}

function groupByCategory() {
  const groups = new Map();
  for (const benchmark of BENCHMARKS) {
    if (!groups.has(benchmark.category)) {
      groups.set(benchmark.category, []);
    }
    groups.get(benchmark.category).push(benchmark);
  }
  return [...groups];
}

export function ValidationTab() {
  const [results, setResults] = useState({});
  const [done, setDone] = useState(false);
  const startedRef = useRef(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    startedRef.current = performance.now();
    const worker = startWorker(
      (result) =>
        setResults((previous) => ({ ...previous, [result.id]: result })),
      () => {
        setSeconds((performance.now() - startedRef.current) / 1000);
        setDone(true);
      }
    );
    return () => worker.terminate();
  }, []);
  const finished = Object.values(results);
  const passed = finished.filter((result) => result.pass).length;
  return h(TabLayout, {
    title: 'Tested against known results',
    intro:
      'A wave picture is only worth something if it reproduces what is measured. Every number below is computed live in your browser by the wave solvers and compared with measured data (NIST, CODATA) or with exact solutions.',
    figures: [
      h(
        'div',
        { key: 'table', className: 'table-scroll' },
        h(
          'table',
          { className: 'results' },
          h(
            'thead',
            null,
            h(
              'tr',
              null,
              h('th', { scope: 'col' }, 'Test'),
              h('th', { scope: 'col' }, 'Wave simulation'),
              h('th', { scope: 'col' }, 'Reference'),
              h('th', { scope: 'col' }, 'Error'),
              h('th', { scope: 'col' }, 'Result')
            )
          ),
          ...groupByCategory().map(([category, benchmarks]) =>
            h(
              'tbody',
              { key: category },
              h(
                'tr',
                { className: 'group' },
                h('th', { colSpan: 5, scope: 'rowgroup' }, category)
              ),
              ...benchmarks.map((benchmark) =>
                h(ResultRow, {
                  key: benchmark.id,
                  benchmark,
                  result: results[benchmark.id],
                })
              )
            )
          )
        )
      ),
    ],
    controls: [
      h(
        StatRow,
        { key: 'stats' },
        h(Stat, {
          label: 'Passed',
          value: `${passed} / ${BENCHMARKS.length}`,
          detail: done
            ? `all run in ${format(seconds, 3)} s`
            : `${finished.length} finished, running in a background thread`,
        })
      ),
    ],
    notes: [
      h('h3', { key: 'h' }, 'What “pass” means'),
      h(
        'p',
        { key: 'a' },
        'Each test has a tolerance chosen from the method’s known accuracy (grid size, time step) — not tuned to hide errors. The same suite runs in the library’s automated tests on Node.js, Bun and Deno.'
      ),
      h('p', { key: 'b' }, 'Run it yourself: npx wavy-physics validate.'),
    ],
  });
}
