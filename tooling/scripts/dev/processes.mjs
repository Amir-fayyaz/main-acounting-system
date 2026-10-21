/**
 * Child-process helpers for `pnpm run dev:local` (Dev bootstrap).
 *
 * Log prefixing, secret redaction and line splitting are pure and unit-testable;
 * tree termination uses Node built-ins plus `taskkill` on Windows. No
 * shell-specific syntax is embedded in commands; `shell: true` is only used by
 * `spawn` so `pnpm` and `docker` resolve to their Windows wrappers.
 */

import { spawn, spawnSync } from 'node:child_process';

export const PROCESS_COLORS = {
  api: '\x1b[36m',
  worker: '\x1b[33m',
  scheduler: '\x1b[35m',
};

export const RESET_COLOR = '\x1b[0m';

export const PROCESS_LABELS = ['api', 'worker', 'scheduler'];

/** Prefixes one line with a colored `[label]` tag. */
export function prefixLine(label, line) {
  const text = String(line).replace(/\r$/, '');
  const color = PROCESS_COLORS[label] ?? '';
  return `${color}[${label}]${RESET_COLOR} ${text}`;
}

/**
 * Replaces every occurrence of every secret with `***`. Empty secrets are
 * ignored, and the result carries no secret value.
 */
export function redactSecrets(text, secrets) {
  let output = String(text);
  for (const secret of secrets) {
    const value = String(secret);
    if (value.length > 0) output = output.split(value).join('***');
  }
  return output;
}

/** Stateful line splitter: emits complete lines, keeps the trailing fragment. */
export class LineStream {
  constructor(onLine) {
    this.onLine = onLine;
    this.remainder = '';
  }

  push(chunk) {
    const text = this.remainder + String(chunk);
    const lines = text.split(/\r?\n/);
    this.remainder = lines.pop() ?? '';
    for (const line of lines) this.onLine(line);
  }

  flush() {
    if (this.remainder !== '') {
      const line = this.remainder;
      this.remainder = '';
      this.onLine(line);
    }
  }
}

/**
 * Terminates a child process and everything it spawned:
 * a detached child gets its whole process group signalled on POSIX; on Windows
 * `taskkill /T` walks the process tree. Never throws (best effort by design).
 */
export function terminateProcessTree(child, { platform = process.platform, spawnFn = spawn } = {}) {
  if (!child || child.pid === undefined || child.exitCode !== null || child.killed) return;
  try {
    if (platform === 'win32') {
      spawnFn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(-child.pid, 'SIGTERM');
    }
    child.killed = true;
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
}

/**
 * Runs one command synchronously through the shell and resolves its exit code.
 * Output is inherited, so the step's own tools stay visible; the caller decides
 * what failure means.
 */
export function runCommandSync(command, args, { spawnSyncFn = spawnSync } = {}) {
  const result = spawnSyncFn(command, args, { stdio: 'inherit', shell: true });
  return { code: result.status ?? 1, error: result.error };
}
