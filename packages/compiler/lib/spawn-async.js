import { spawn } from 'node:child_process';

/**
 * Non-blocking stand-in for `spawnSync` with the same result shape
 * ({ status, stdout, stderr, error }). Long build and render steps use it so the
 * CLI spinner keeps animating while the child process runs; `spawnSync` would
 * freeze the event loop until it exits.
 *
 * Output is captured as strings unless `stdio: 'inherit'` is passed.
 * @param {string} command
 * @param {string[]} args
 * @param {import('node:child_process').SpawnOptions} [options]
 * @returns {Promise<{ status: number | null, stdout: string, stderr: string, error?: Error }>}
 */
export function spawnAsync(command, args, options = {}) {
  // eslint-disable-next-line no-unused-vars
  const { encoding, stdio, ...rest } = /** @type {any} */ (options);
  const inherit = stdio === 'inherit';
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const child = spawn(command, args, {
      ...rest,
      stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => (stdout += chunk));
    child.stderr?.on('data', (chunk) => (stderr += chunk));
    child.on('error', (error) => resolve({ status: null, stdout, stderr, error }));
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}
