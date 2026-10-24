import { describe, it, expect } from 'test-anywhere';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { runCli } from '../bin/wavy-physics.js';
import { itUnless, sandboxed } from './helpers/skip.js';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const lockJson = JSON.parse(readFileSync('package-lock.json', 'utf8'));

function windowsSymlinkSkipReason() {
  if (sandboxed || process.platform !== 'win32') {
    return null;
  }
  const fixture = mkdtempSync(join(tmpdir(), 'symlink-permission-'));
  try {
    symlinkSync(resolve('bin/wavy-physics.js'), join(fixture, 'bin'));
    return null;
  } catch (error) {
    if (error.code === 'EPERM') {
      return 'Windows file symlinks require developer mode or administrator privileges';
    }
    throw error;
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

const symlinkSkipReason = windowsSymlinkSkipReason();

describe('publishable package metadata', () => {
  it('publishes the library as wavy-physics', () => {
    expect(packageJson.name).toBe('wavy-physics');
    expect(packageJson.publishConfig).toEqual({ access: 'public' });
    expect(lockJson.name).toBe('wavy-physics');
    expect(lockJson.packages[''].name).toBe('wavy-physics');
  });

  it('defines a globally installable CLI command', () => {
    expect(packageJson.bin).toEqual({
      'wavy-physics': './bin/wavy-physics.js',
    });
    expect(existsSync('bin/wavy-physics.js')).toBe(true);
  });

  it('runs package functions through the CLI command', () => {
    const stdout = [];
    const stderr = [];

    expect(
      runCli(['energy', '1'], {
        stderr: (line) => stderr.push(line),
        stdout: (line) => stdout.push(line),
      })
    ).toBe(0);

    expect(stdout).toEqual(['-13.5982872643 eV']);
    expect(stderr).toEqual([]);
  });

  it('reports CLI argument errors with a non-zero exit code', () => {
    const stderr = [];

    expect(
      runCli(['lifetime', '2', '5'], {
        stderr: (line) => stderr.push(line),
        stdout: () => {},
      })
    ).toBe(1);
    expect(stderr).toEqual(['l must be smaller than n']);
  });

  it('runs selected wave benchmarks through the CLI', () => {
    const stdout = [];

    expect(
      runCli(['validate', 'lyman-alpha', 'light-speed'], {
        stderr: () => {},
        stdout: (line) => stdout.push(line),
      })
    ).toBe(0);
    expect(stdout.at(-1)).toBe('2/2 benchmarks passed');
  });

  itUnless(
    sandboxed,
    symlinkSkipReason,
    globalThis.Deno &&
      'Deno resolves relative imports from the bin symlink directory'
  )('runs when invoked through an npm-style bin symlink', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'wavy-physics-'));
    const linkPath = join(tempRoot, 'wavy-physics');

    try {
      symlinkSync(resolve('bin/wavy-physics.js'), linkPath);
      const result = spawnSync(
        process.execPath,
        [
          ...(globalThis.Deno ? ['run', '-A'] : []),
          linkPath,
          'spectrum',
          '3',
          '2',
        ],
        { encoding: 'utf8' }
      );

      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(
        '656.4696063 nm (vacuum, Schrödinger levels)'
      );
      expect(result.stderr).toBe('');
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  it('publishes only the package runtime surface', () => {
    expect(packageJson.files).toEqual([
      'bin/',
      'src/',
      'CHANGELOG.md',
      'LICENSE',
      'README.md',
    ]);
  });
});
