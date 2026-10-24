#!/usr/bin/env node

import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import {
  AU,
  SI,
  diracEnergy,
  hartreeToEV,
  hydrogenEnergy,
  radiativeLifetime,
  runValidation,
  transitionWavelength,
} from '../src/index.js';

function usage() {
  return [
    'Usage: wavy-physics <command> [arguments]',
    '',
    'Commands:',
    '  validate [id...]            Run the wave-physics benchmarks',
    '  energy <n> [j]              Hydrogen level energy in eV',
    '  spectrum <nUpper> <nLower>  Hydrogen line wavelength in nm',
    '  lifetime <n> <l>            Radiative lifetime of hydrogen nl in s',
    '  constants                   Print the CODATA constants in use',
    '',
    'Options:',
    '  --help     Show this help',
    '  --version  Show package version',
  ].join('\n');
}

function readVersion() {
  const packageUrl = new URL('../package.json', import.meta.url);
  const packageJson = JSON.parse(readFileSync(packageUrl, 'utf8'));
  return packageJson.version;
}

function parseInteger(value, label, minimum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`${label} must be an integer >= ${minimum}`);
  }
  return parsed;
}

function validate(ids, stdout) {
  const results = runValidation(ids.length > 0 ? ids : undefined);
  for (const result of results) {
    stdout(
      [
        result.pass ? 'PASS' : 'FAIL',
        result.id.padEnd(20),
        `computed=${result.computed.toPrecision(10)}`,
        `reference=${result.reference.toPrecision(10)}`,
        `${result.errorKind} error=${result.error.toExponential(2)}`,
      ].join('  ')
    );
  }
  const failed = results.filter((result) => !result.pass).length;
  stdout(`${results.length - failed}/${results.length} benchmarks passed`);
  return failed === 0 ? 0 : 1;
}

function energy([nArg, jArg], stdout) {
  const n = parseInteger(nArg, 'n', 1);
  const value =
    jArg === undefined
      ? hydrogenEnergy(n, { nucleusMass: AU.protonMass })
      : diracEnergy(n, Number(jArg), { nucleusMass: AU.protonMass });
  stdout(`${hartreeToEV(value).toPrecision(12)} eV`);
  return 0;
}

function spectrum([upperArg, lowerArg], stdout) {
  const nUpper = parseInteger(upperArg, 'nUpper', 2);
  const nLower = parseInteger(lowerArg, 'nLower', 1);
  if (nUpper <= nLower) {
    throw new Error('nUpper must be greater than nLower');
  }
  const wavelength = transitionWavelength(nUpper, nLower, {
    nucleusMass: AU.protonMass,
  });
  stdout(
    `${(wavelength * 1e9).toPrecision(10)} nm (vacuum, Schrödinger levels)`
  );
  return 0;
}

function lifetime([nArg, lArg], stdout) {
  const n = parseInteger(nArg, 'n', 2);
  const l = parseInteger(lArg, 'l', 0);
  if (l >= n) {
    throw new Error('l must be smaller than n');
  }
  stdout(`${radiativeLifetime(n, l).toPrecision(6)} s`);
  return 0;
}

function constants(_args, stdout) {
  for (const [name, value] of Object.entries(SI)) {
    stdout(`${name.padEnd(9)} ${value}`);
  }
  return 0;
}

const COMMANDS = { validate, energy, spectrum, lifetime, constants };

export function runCli(
  argv,
  { stderr = console.error, stdout = console.log } = {}
) {
  const [command, ...rest] = argv;

  if (!command || command === '--help' || command === '-h') {
    stdout(usage());
    return 0;
  }

  if (command === '--version' || command === '-v') {
    stdout(readVersion());
    return 0;
  }

  const operation = COMMANDS[command];

  if (!operation) {
    stderr(`Unknown command: ${command}`);
    stderr(usage());
    return 1;
  }

  try {
    return operation(rest, stdout);
  } catch (error) {
    stderr(error.message);
    return 1;
  }
}

function isCliEntryPoint() {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (isCliEntryPoint()) {
  process.exitCode = runCli(process.argv.slice(2));
}
