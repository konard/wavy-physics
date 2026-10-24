import { NonlinearSchrodinger1D } from '../src/index.js';
for (const dt of [0.02, 0.01, 0.005]) {
  const nls = new NonlinearSchrodinger1D({ n: 1024, xMin: -40, xMax: 40 });
  nls.setSolitons([
    { eta: 1.2, velocity: 0.6, x0: -12 },
    { eta: 0.9, velocity: -0.6, x0: 12 },
  ]);
  const e0 = nls.energy();
  let worst = 0;
  for (let i = 0; i < 20 / dt; i++) {
    nls.step(dt);
    worst = Math.max(worst, Math.abs(nls.energy() - e0) / Math.abs(e0));
  }
  console.log(dt, worst.toExponential(3));
}
