// Field amplitudes that the website's Light tab colour scales are set from.
import {
  FDTD2D,
  kickedCharge,
  oscillatingCharge,
  sampleFieldPlane,
} from '../src/index.js';

function ringPeak(grid, radius) {
  let largest = 0;
  for (let a = 0; a < 64; a++) {
    const angle = (2 * Math.PI * a) / 64;
    const i = Math.round(100 + radius * Math.cos(angle));
    const j = Math.round(100 + radius * Math.sin(angle));
    largest = Math.max(largest, Math.abs(grid.hz[j * 200 + i]));
  }
  return largest;
}

for (const wavelength of [12, 24, 48]) {
  const omega = (2 * Math.PI) / wavelength;
  const grid = new FDTD2D({ nx: 200, ny: 200, absorbingCells: 20 });
  grid.addDipole({
    i: 100,
    j: 100,
    axis: 'y',
    current: (t) =>
      Math.sin(omega * t) * (1 - Math.exp(-((t / (2 * wavelength)) ** 2))),
  });
  const start = performance.now();
  grid.step(400);
  const ms = (performance.now() - start) / 400;
  console.log(
    `λ=${wavelength}: |Hz| at r=20 ${ringPeak(grid, 20).toFixed(4)}, r=60 ${ringPeak(grid, 60).toFixed(4)}, ${ms.toFixed(2)} ms/step`
  );
}

const pulse = new FDTD2D({ nx: 200, ny: 200, absorbingCells: 20 });
pulse.addDipole({
  i: 100,
  j: 100,
  axis: 'y',
  current: (t) => -(t - 30) * Math.exp(-(((t - 30) / 8) ** 2)) * 0.2,
});
pulse.step(140);
console.log(`pulse: r=30 ${ringPeak(pulse, 30).toFixed(4)}`);

for (const [name, trajectory, t] of [
  ['kick', kickedCharge({ speed: 0.6, duration: 2 }), 14],
  ['oscillate', oscillatingCharge({ amplitude: 1.2, omega: 0.5, axis: 0 }), 30],
]) {
  const start = performance.now();
  const { values } = sampleFieldPlane(trajectory, t, {
    extent: 24,
    resolution: 56,
  });
  const ms = performance.now() - start;
  const sorted = Array.from(values, Math.abs).sort((a, b) => a - b);
  console.log(
    `${name}: p50 ${sorted[sorted.length >> 1].toExponential(2)} p95 ${sorted[Math.floor(sorted.length * 0.95)].toExponential(2)} max ${sorted.at(-1).toExponential(2)} ${ms.toFixed(1)} ms`
  );
}
