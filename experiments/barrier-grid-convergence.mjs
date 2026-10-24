// How the tunnelling fraction of the website barrier depends on the grid.
import { Schrodinger1D, packetTransmission } from '../src/index.js';

const barrier = { height: 2.4, width: 1 };
const packet = { x0: -25, sigma: 4, k0: 2 };
console.log('theory', packetTransmission(packet, barrier));
for (const n of [2048, 4096, 8192]) {
  for (const shift of [0, 0.5]) {
    const sim = new Schrodinger1D({ n, xMin: -80, xMax: 80 });
    const dx = 160 / n;
    // Barrier edges placed between grid points when shift = 0.5.
    sim.setPotential((x) =>
      Math.abs(x + shift * dx) < barrier.width / 2 ? barrier.height : 0
    );
    sim.setGaussian(packet);
    sim.step(0.01, 3000);
    console.log(n, shift, sim.probabilityRightOf(0.5));
  }
}
