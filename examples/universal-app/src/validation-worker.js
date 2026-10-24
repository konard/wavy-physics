/**
 * Runs the library's validation benchmarks off the main thread and posts
 * each result as soon as it is ready.
 */
import { BENCHMARKS, runBenchmark } from './physics.js';

self.onmessage = () => {
  for (const benchmark of BENCHMARKS) {
    self.postMessage({ type: 'result', result: runBenchmark(benchmark) });
  }
  self.postMessage({ type: 'done' });
};
