import { solveRadialStates } from '../src/physics/radial.js';
console.time('radial');
const s0 = solveRadialStates({ l: 0, states: 3, rMax: 80, points: 16000 });
console.log(s0.states.map((s) => [s.energy, s.iterations]));
const s1 = solveRadialStates({ l: 1, states: 2, rMax: 80, points: 16000 });
console.log(s1.states.map((s) => [s.energy, s.iterations]));
console.timeEnd('radial');
