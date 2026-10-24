// Runs every website matter-wave scenario to its end and prints the
// statistics it shows, plus the cost of one animation frame.
import { MATTER_SCENARIOS } from '../examples/universal-app/src/tabs/matter-scenarios.js';

for (const scenario of MATTER_SCENARIOS) {
  const sim = scenario.create();
  const frames = Math.ceil(
    scenario.duration / (scenario.dt * scenario.stepsPerFrame)
  );
  const start = performance.now();
  for (let f = 0; f < frames; f++) {
    sim.step(scenario.dt, scenario.stepsPerFrame);
  }
  const perFrame = (performance.now() - start) / frames;
  console.log(
    `${scenario.value}: ${frames} frames, ${perFrame.toFixed(2)} ms/frame, t=${sim.time.toFixed(2)}`
  );
  for (const { label, value, detail } of scenario.stats(sim)) {
    console.log(`  ${label}: ${value}${detail ? ` (${detail})` : ''}`);
  }
}
