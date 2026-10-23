import * as W from '../src/physics/waves.js';
for (const p of [16, 18]) {
  const N = 1 << p;
  const samples = Float64Array.from({ length: N + 1 }, (_, i) =>
    W.weierstrass(i / N)
  );
  for (const bc of [
    [16, 32, 64, 128, 256, 512],
    [64, 128, 256, 512, 1024, 2048],
    [81, 243, 729, 2187],
    [27, 81, 243, 729],
  ]) {
    console.log(
      p,
      bc.join(','),
      W.boxCountingDimension(samples, bc).toFixed(4),
      W.weierstrassDimension().toFixed(4)
    );
  }
}
