/**
 * Physical constants (CODATA 2022 recommended values, NIST) and helpers for
 * converting between SI and Hartree atomic units.
 *
 * Every solver in this library works in Hartree atomic units
 * (hbar = m_e = e = 4*pi*eps0 = 1) unless documented otherwise, because the
 * numbers stay close to 1 and floating-point error stays small.
 *
 * Source: https://physics.nist.gov/cuu/Constants/ (CODATA 2022, May 2024).
 */

/** Exact or CODATA 2022 SI values. */
export const SI = Object.freeze({
  /** Speed of light in vacuum, m s^-1 (exact). */
  c: 299792458,
  /** Planck constant, J s (exact). */
  h: 6.62607015e-34,
  /** Reduced Planck constant, J s (exact to the digits shown). */
  hbar: 1.054571817e-34,
  /** Elementary charge, C (exact). */
  e: 1.602176634e-19,
  /** Electron mass, kg. */
  me: 9.1093837139e-31,
  /** Proton mass, kg. */
  mp: 1.67262192595e-27,
  /** Fine-structure constant (dimensionless). */
  alpha: 7.2973525643e-3,
  /** Bohr radius, m. */
  a0: 5.29177210544e-11,
  /** Hartree energy, J. */
  Eh: 4.359744722206e-18,
  /** Rydberg constant, m^-1. */
  Rinf: 10973731.568157,
  /** Vacuum electric permittivity, F m^-1. */
  eps0: 8.8541878188e-12,
  /** Vacuum magnetic permeability, N A^-2. */
  mu0: 1.25663706127e-6,
  /** Proton-electron mass ratio. */
  mpOverMe: 1836.152673426,
  /** Electron volt, J (exact). */
  eV: 1.602176634e-19,
});

/** Inverse fine-structure constant. */
export const INVERSE_ALPHA = 1 / SI.alpha;

/**
 * Atomic units. In these units hbar = m_e = e = 4*pi*eps0 = 1 and the speed
 * of light is 1/alpha.
 */
export const AU = Object.freeze({
  hbar: 1,
  me: 1,
  e: 1,
  /** Speed of light in atomic units (= 1/alpha). */
  c: INVERSE_ALPHA,
  /** Atomic unit of length in metres (Bohr radius). */
  length: SI.a0,
  /** Atomic unit of energy in joules (Hartree). */
  energy: SI.Eh,
  /** Atomic unit of energy in electron volts. */
  energyEV: SI.Eh / SI.eV,
  /** Atomic unit of time in seconds (hbar / E_h). */
  time: SI.hbar / SI.Eh,
  /** Atomic unit of electric field in V m^-1. */
  electricField: SI.Eh / (SI.e * SI.a0),
  /** Proton mass in atomic units (electron masses). */
  protonMass: SI.mpOverMe,
});

/**
 * Reduced mass of an electron bound to a nucleus.
 * @param {number} nucleusMass - Nucleus mass in electron masses
 *   (Infinity for an infinitely heavy nucleus).
 * @returns {number} Reduced mass in electron masses.
 */
export function reducedMass(nucleusMass = AU.protonMass) {
  if (!Number.isFinite(nucleusMass)) {
    return 1;
  }
  return nucleusMass / (1 + nucleusMass);
}

/** Convert an energy in Hartree to electron volts. */
export const hartreeToEV = (energy) => energy * AU.energyEV;

/** Convert an energy in electron volts to Hartree. */
export const evToHartree = (energy) => energy / AU.energyEV;

/** Convert a time in atomic units to seconds. */
export const auTimeToSeconds = (time) => time * AU.time;

/** Convert a time in seconds to atomic units. */
export const secondsToAuTime = (time) => time / AU.time;

/** Convert a length in bohr to metres. */
export const bohrToMeters = (length) => length * AU.length;

/**
 * Vacuum wavelength (metres) of a photon carrying the given energy.
 * @param {number} energy - Photon energy in Hartree.
 * @returns {number} Wavelength in metres.
 */
export function photonWavelength(energy) {
  return (SI.h * SI.c) / Math.abs(energy * SI.Eh);
}

/**
 * Photon frequency in hertz for an energy given in Hartree.
 * @param {number} energy - Photon energy in Hartree.
 * @returns {number} Frequency in Hz.
 */
export function photonFrequency(energy) {
  return Math.abs(energy * SI.Eh) / SI.h;
}
