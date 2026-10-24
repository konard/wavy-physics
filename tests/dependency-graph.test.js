/**
 * scripts/check-dependency-graph.sh lets dependency review skip with a
 * warning on pull requests while main fails with the admin instructions.
 */

import { describe, it, expect } from 'test-anywhere';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { itUnless, noPosixShell, sandboxed } from './helpers/skip.js';

const scriptPath = 'scripts/check-dependency-graph.sh';
const workflow = readFileSync(
  '.github/workflows/security.yml',
  'utf8'
).replaceAll('\r\n', '\n');

/** Run the script with a fake `gh` that prints `reply` and exits `code`. */
function probe(mode, { reply = '[]', code = 0 } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'dependency-graph-'));
  try {
    const gh = path.join(dir, 'gh');
    writeFileSync(
      gh,
      `#!/usr/bin/env bash\necho '${reply}' >&2\nexit ${code}\n`
    );
    chmodSync(gh, 0o755);
    const output = path.join(dir, 'output');
    writeFileSync(output, '');
    const result = spawnSync('bash', [scriptPath, mode], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${dir}${path.delimiter}${process.env.PATH}`,
        GITHUB_REPOSITORY: 'owner/repo',
        BASE_SHA: 'a',
        HEAD_SHA: 'b',
        GITHUB_OUTPUT: output,
      },
    });
    return {
      status: result.status,
      log: `${result.stdout}${result.stderr}`,
      output: readFileSync(output, 'utf8'),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('dependency graph gate', () => {
  it('skips the review on pull requests and requires the graph elsewhere', () => {
    expect(workflow).toContain(
      'run: bash scripts/check-dependency-graph.sh warn'
    );
    expect(workflow).toContain(
      "        if: steps.graph.outputs.enabled == 'true'\n        uses: actions/dependency-review-action@v5"
    );
    expect(workflow).toContain(
      "  dependency-graph:\n    name: Dependency graph enabled\n    if: github.event_name != 'pull_request'"
    );
    expect(workflow).toContain(
      'run: bash scripts/check-dependency-graph.sh require'
    );
    expect(workflow).toMatch(
      /needs:\n(?: {6}- .+\n)*? {6}- dependency-graph\n/
    );
  });

  itUnless(sandboxed, noPosixShell)('passes when the graph is enabled', () => {
    for (const mode of ['warn', 'require']) {
      const result = probe(mode);
      expect(result.status).toBe(0);
      expect(result.output).toBe('enabled=true\n');
    }
  });

  itUnless(sandboxed, noPosixShell)(
    'warns on a pull request when the graph is disabled',
    () => {
      const result = probe('warn', { reply: 'Forbidden (HTTP 403)', code: 1 });
      expect(result.status).toBe(0);
      expect(result.output).toBe('enabled=false\n');
      expect(result.log).toContain('::warning::');
      expect(result.log).toContain(
        'https://github.com/owner/repo/settings/security_analysis'
      );
    }
  );

  itUnless(sandboxed, noPosixShell)(
    'fails with the admin instructions when the graph is required',
    () => {
      const result = probe('require', {
        reply: 'Not Found (HTTP 404)',
        code: 1,
      });
      expect(result.status).toBe(1);
      expect(result.log).toContain('::error::');
      expect(result.log).toContain('enable Dependency graph');
    }
  );

  itUnless(sandboxed, noPosixShell)(
    'keeps a failed probe red even in warn mode',
    () => {
      const result = probe('warn', { reply: 'HTTP 500: boom', code: 1 });
      expect(result.status).toBe(1);
      expect(result.output).toBe('');
      expect(result.log).toContain('probe failed');
    }
  );

  itUnless(sandboxed, noPosixShell)('rejects an unknown mode', () => {
    expect(probe('maybe').status).toBe(1);
  });
});
