import { Schrodinger1D } from '../src/physics/schrodinger.js';
import { packetTransmission } from '../src/physics/tunneling.js';
for (const [n, dt] of [
  [4096, 0.05],
  [4096, 0.02],
  [8192, 0.02],
]) {
  const dx = 400 / n;
  const cells = Math.round(1 / dx);
  const width = cells * dx;
  const barrier = { height: 1.2, width };
  const s = new Schrodinger1D({
    n,
    xMin: -200,
    xMax: 200,
    absorbingWidth: 20,
    potential: (x) => (x > -dx / 2 && x < width - dx / 2 ? 1.2 : 0),
  });
  s.setGaussian({ x0: -70, k0: 1.4, sigma: 12 });
  s.step(dt, Math.round(100 / dt));
  console.log(
    n,
    dt,
    s.probabilityRightOf(width),
    packetTransmission({ k0: 1.4, sigma: 12 }, barrier)
  );
}
