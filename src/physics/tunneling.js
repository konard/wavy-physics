/**
 * Exact plane-wave transmission through a rectangular barrier, used to
 * check that a numerically propagated wave packet tunnels correctly.
 */

/**
 * Transmission probability T(E) of a plane wave with energy E through a
 * barrier of height V0 and width a (ħ = 1).
 * @param {number} energy
 * @param {{height: number, width: number, mass?: number}} barrier
 */
export function barrierTransmission(energy, { height, width, mass = 1 }) {
  if (energy <= 0) {
    return 0;
  }
  const difference = height - energy;
  if (Math.abs(difference) < 1e-12) {
    return 1 / (1 + (mass * height * width * width) / 2);
  }
  const q = Math.sqrt(2 * mass * Math.abs(difference)) * width;
  const swing = difference > 0 ? Math.sinh(q) : Math.sin(q);
  return (
    1 /
    (1 +
      (height * height * swing * swing) / (4 * energy * Math.abs(difference)))
  );
}

/**
 * Transmission of a Gaussian packet with mean momentum k0 and position
 * spread σ: the plane-wave result averaged over the packet's momentum
 * distribution |φ(k)|² ∝ exp(−2σ²(k − k0)²).
 */
export function packetTransmission(
  { k0, sigma, mass = 1 },
  barrier,
  samples = 2001
) {
  const sigmaK = 1 / (2 * sigma);
  const span = 8 * sigmaK;
  let weightSum = 0;
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const k = k0 - span + (2 * span * i) / (samples - 1);
    const weight = Math.exp(-((k - k0) ** 2) / (2 * sigmaK * sigmaK));
    weightSum += weight;
    if (k > 0) {
      sum +=
        weight *
        barrierTransmission((k * k) / (2 * mass), { ...barrier, mass });
    }
  }
  return sum / weightSum;
}
