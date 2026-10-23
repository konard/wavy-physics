import { circularWavePacket } from '../src/physics/hydrogen.js';
import { Schrodinger1D } from '../src/physics/schrodinger.js';
import {
  barrierTransmission,
  packetTransmission,
} from '../src/physics/tunneling.js';
const p = circularWavePacket({ nMean: 15, count: 7, nucleusMass: Infinity });
const T = 2 * Math.PI * 15 ** 3;
for (let i = 0; i <= 8; i++) {
  const r = p.expectationPosition((i * T) / 8);
  console.log(
    i,
    r.map((v) => v.toFixed(1)).join(' '),
    ((Math.atan2(r[1], r[0]) * 180) / Math.PI).toFixed(1)
  );
}
for (const [n, sigma, xMax, dt] of [
  [4096, 12, 200, 0.05],
  [8192, 12, 200, 0.02],
  [16384, 40, 400, 0.02],
]) {
  const barrier = { height: 1.2, width: 1 };
  const s = new Schrodinger1D({
    n,
    xMin: -xMax,
    xMax,
    absorbingWidth: 20,
    potential: (x) => (x >= 0 && x < 1 ? 1.2 : 0),
  });
  s.setGaussian({ x0: -xMax / 2.5, k0: 1.4, sigma });
  s.step(dt, Math.round((xMax / 2.5 + 40) / 1.4 / dt));
  console.log(
    n,
    sigma,
    s.probabilityRightOf(1),
    s.norm(),
    packetTransmission({ k0: 1.4, sigma }, barrier),
    barrierTransmission(0.98, barrier)
  );
}
