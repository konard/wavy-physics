/**
 * wavy-physics: a wave-only physics library.
 *
 * Every model in this package is a wave equation solved numerically
 * (Schrödinger, Dirac, nonlinear Schrödinger, Maxwell, the classical wave
 * equation) or an exact wave solution of one. Particles appear only as wave
 * packets or stable wave configurations, and every module is checked against
 * measured or exactly known results in `./physics/validation.js`.
 */

export * from './physics/constants.js';
export * from './physics/fft.js';
export * from './physics/special-functions.js';
export * from './physics/split-operator.js';
export * from './physics/schrodinger.js';
export * from './physics/hydrogen.js';
export * from './physics/radial.js';
export * from './physics/tunneling.js';
export * from './physics/dirac.js';
export * from './physics/nls.js';
export * from './physics/maxwell.js';
export * from './physics/radiation.js';
export * from './physics/waves.js';
export * from './physics/validation.js';
