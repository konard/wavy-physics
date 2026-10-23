import * as W from '../src/physics/waves.js';
const pluck = (x) => Math.exp(-(((x - 0.3) / 0.05) ** 2));
const s = new W.StringWave({ points: 401 });
s.setDisplacement(pluck);
s.step(299);
let err = 0;
for (let i = 0; i < s.points; i++) {
  err = Math.max(
    err,
    Math.abs(s.current[i] - W.dAlembert(pluck, s.x[i], s.time))
  );
}
console.log('dAlembert err', err, 't', s.time);
console.log('gibbs', W.gibbsPeak(1000), 1.1789797444721672);
const N = 1 << 16;
const samples = Float64Array.from({ length: N + 1 }, (_, i) =>
  W.weierstrass(i / N)
);
console.log('dim', W.boxCountingDimension(samples), W.weierstrassDimension());
const r = W.relativisticDispersion();
console.log(
  W.waveVelocities(r, 1),
  W.waveVelocities(W.schrodingerDispersion(), 2)
);
