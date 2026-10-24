import { circularWavePacket } from '../src/physics/hydrogen.js';
import { dominantFrequency } from '../src/physics/dirac.js';
for (const [nMean, width, count, periods] of [
  [15, 1.5, 7, 3],
  [40, 1, 7, 3],
  [40, 1, 7, 1.5],
  [60, 1, 7, 3],
]) {
  const p = circularWavePacket({ nMean, width, count, nucleusMass: Infinity });
  const T = 2 * Math.PI * nMean ** 3;
  const dt = T / 40;
  const s = [];
  for (let i = 0; i < 40 * periods; i++) {
    s.push(p.expectationPosition(i * dt)[0]);
  }
  const w = dominantFrequency(s, dt, {
    minOmega: (0.5 * 2 * Math.PI) / T,
    maxOmega: (1.5 * 2 * Math.PI) / T,
  });
  const syn = Array.from({ length: 40 * periods }, (_, i) =>
    Math.cos((2 * Math.PI * i) / 40)
  );
  const ws = dominantFrequency(syn, dt, {
    minOmega: (0.5 * 2 * Math.PI) / T,
    maxOmega: (1.5 * 2 * Math.PI) / T,
  });
  console.log(
    nMean,
    width,
    periods,
    ((2 * Math.PI) / w / T).toFixed(5),
    'synthetic',
    ((2 * Math.PI) / ws / T).toFixed(5)
  );
}
