/**
 * Every published benchmark must reproduce its measured or exact reference
 * value within the stated tolerance.
 */

import { describe, it, expect } from 'test-anywhere';
import { BENCHMARKS, runBenchmark } from '../src/index.js';

describe('wave-physics validation suite', () => {
  for (const benchmark of BENCHMARKS) {
    it(`${benchmark.id}: ${benchmark.title}`, () => {
      const result = runBenchmark(benchmark);
      expect(Number.isFinite(result.computed)).toBe(true);
      expect(result.error).toBeLessThanOrEqual(result.tolerance);
      expect(result.pass).toBe(true);
      expect(result.source.length).toBeGreaterThan(0);
    });
  }

  it('rejects unknown benchmark ids', () => {
    expect(() => runBenchmark('no-such-benchmark')).toThrow();
  });
});
