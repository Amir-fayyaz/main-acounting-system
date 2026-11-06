import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import process from 'node:process';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * Integration tests for the committed hook layer (FND-014).
 *
 * Each test builds a throwaway git repository *inside* the workspace so that
 * `lint-staged`, `commitlint` and the hooks resolve the same `node_modules` and
 * configuration the contributors use — the behaviour being tested is the real
 * one, not a mock.
 *
 * The fixtures are assembled at runtime where they would otherwise look like a
 * staged secret: this file is itself committed through the hook it tests.
 */

const REPOSITORY_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LINT_STAGED_BIN = join(
  REPOSITORY_ROOT,
  'node_modules',
  'lint-staged',
  'bin',
  'lint-staged.js',
);
const SECRET_SCAN_SCRIPT = join(REPOSITORY_ROOT, 'tooling', 'scripts', 'check-staged-secrets.mjs');
const PRE_PUSH_HOOK = join(REPOSITORY_ROOT, '.husky', 'pre-push');
const COMMIT_MSG_HOOK = join(REPOSITORY_ROOT, '.husky', 'commit-msg');

const PRIVATE_KEY_HEADER = `-----BEGIN RSA ${'PRIVATE'} KEY-----`;
const SECRET_KEY = ['MYSQL', 'PASSWORD'].join('_');

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

/** A path that both `sh` and Node understand on every platform. */
function toPosix(filePath) {
  return filePath.split(sep).join('/');
}

function git(cwd, args, options = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function createRepository() {
  const parent = join(REPOSITORY_ROOT, 'tooling', '.tmp');
  mkdirSync(parent, { recursive: true });

  const directory = mkdtempSync(join(parent, 'fnd-014-hooks-'));
  temporaryDirectories.push(directory);

  git(directory, ['init', '-b', 'main']);
  git(directory, ['config', 'user.email', 'contributor@example.com']);
  git(directory, ['config', 'user.name', 'Test Contributor']);
  git(directory, ['config', 'commit.gpgsign', 'false']);
  // Pin the hook path so a developer's global `core.hooksPath` cannot change
  // what these tests exercise.
  git(directory, ['config', 'core.hooksPath', join(directory, '.git', 'hooks')]);

  return directory;
}

function writeHook(repository, name, content) {
  const hookPath = join(repository, '.git', 'hooks', name);
  writeFileSync(hookPath, content);
  try {
    chmodSync(hookPath, 0o755);
  } catch {
    // Windows has no executable bit; git runs the hook through sh regardless.
  }
  return hookPath;
}

/**
 * A pre-commit hook that runs the same two commands as `.husky/pre-commit`.
 *
 * The script paths are absolute because the throwaway repository lives outside
 * the workspace root that the committed hook assumes (git always runs a hook
 * from the root of the repository it belongs to).
 */
function installPreCommitHook(repository) {
  return writeHook(
    repository,
    'pre-commit',
    [
      '#!/bin/sh',
      'set -e',
      `node ${JSON.stringify(toPosix(LINT_STAGED_BIN))}`,
      `node ${JSON.stringify(toPosix(SECRET_SCAN_SCRIPT))} --cwd ${JSON.stringify(toPosix(repository))}`,
      '',
    ].join('\n'),
  );
}

/** The real `commit-msg` hook, committed as source. */
function installCommitMessageHook(repository) {
  return writeHook(repository, 'commit-msg', readFileSync(COMMIT_MSG_HOOK, 'utf8'));
}

function stage(repository, filePath, content) {
  const absolutePath = join(repository, filePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
  git(repository, ['add', '--force', '--', filePath]);
}

function commit(repository, message, options = {}) {
  return spawnSync('git', ['commit', '-m', message], {
    cwd: repository,
    encoding: 'utf8',
    ...options,
  });
}

function log(repository) {
  const result = spawnSync('git', ['log', '--oneline'], { cwd: repository, encoding: 'utf8' });
  return result.status === 0 ? result.stdout : '';
}

describe('pre-commit hook', () => {
  it('fixes a misformatted staged file in place and lets the commit through', () => {
    const repository = createRepository();
    installPreCommitHook(repository);

    // Prettier is configured for single quotes; the staged double quote is the
    // failure the hook is expected to fix.
    stage(repository, 'src/index.ts', 'export const answer = "ok";\n');

    const result = commit(repository, 'feat(core): add the answer');

    assert.equal(result.status, 0, result.stderr);
    assert.match(readFileSync(join(repository, 'src/index.ts'), 'utf8'), /'ok'/);
    assert.match(log(repository), /feat\(core\): add the answer/);
  });

  it('refuses a private key and creates no commit, without printing the key', () => {
    const repository = createRepository();
    installPreCommitHook(repository);

    const keyBody = 'MIIEowIBAAKCAQEA-not-a-real-key';
    stage(repository, 'deploy.pem', `${PRIVATE_KEY_HEADER}\n${keyBody}\n`);

    const result = commit(repository, 'chore(ci): add deploy key');

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /refusing the commit/);
    assert.match(result.stderr, /deploy\.pem:1/);
    assert.equal(result.stderr.includes(keyBody), false);
    assert.equal(log(repository).trim(), '');
  });

  it('refuses a staged .env.local before the commit exists', () => {
    const repository = createRepository();
    installPreCommitHook(repository);

    stage(repository, 'apps/backend/.env.local', `${SECRET_KEY}=real-looking-value-here\n`);

    const result = commit(repository, 'chore(config): add local environment');

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /apps\/backend\/\.env\.local:1/);
    assert.match(result.stderr, /env-file/);
    assert.equal(log(repository).trim(), '');
  });
});

describe('commit-msg hook', () => {
  it('refuses a non-conventional message', () => {
    const repository = createRepository();
    installCommitMessageHook(repository);

    stage(repository, 'README.md', '# notes\n');

    const result = commit(repository, 'add some notes');

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /type may not be empty/);
    assert.equal(log(repository).trim(), '');
  });

  it('accepts a conventional message after the rejected attempt', () => {
    const repository = createRepository();
    installCommitMessageHook(repository);

    stage(repository, 'README.md', '# notes\n');

    const rejected = commit(repository, 'feature(core): add some notes');
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /type must be one of/);

    const accepted = commit(repository, 'docs(core): add some notes');
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.match(log(repository), /docs\(core\): add some notes/);
  });
});

describe('pre-push hook', () => {
  it('runs pnpm verify and refuses a failing push, while --no-verify bypasses it', () => {
    const repository = createRepository();
    const bare = `${repository}-remote.git`;
    temporaryDirectories.push(bare);

    git(REPOSITORY_ROOT, ['init', '--bare', bare]);
    git(repository, ['remote', 'add', 'origin', bare]);

    writeFileSync(join(repository, 'README.md'), '# notes\n');
    git(repository, ['add', '--', 'README.md']);
    git(repository, ['commit', '--no-verify', '-m', 'chore(core): initial commit']);

    // The committed hook, run exactly as git runs it.
    writeHook(repository, 'pre-push', readFileSync(PRE_PUSH_HOOK, 'utf8'));

    // A stand-in for `pnpm` that fails the way `pnpm verify` fails. Using a
    // fake keeps the test fast; the hook's own behaviour (run verify, stop the
    // push on failure) is what is under test.
    const fakeBin = join(repository, 'fake-bin');
    mkdirSync(fakeBin, { recursive: true });
    writeFileSync(
      join(fakeBin, 'pnpm'),
      '#!/bin/sh\necho FND_014_FAKE_VERIFY_FAILED >&2\nexit 1\n',
    );

    const environment = {
      ...process.env,
      PATH: `${fakeBin}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`,
    };

    const refused = spawnSync('git', ['push', '-u', 'origin', 'main'], {
      cwd: repository,
      encoding: 'utf8',
      env: environment,
    });

    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /FND_014_FAKE_VERIFY_FAILED/);

    const bypassed = spawnSync('git', ['push', '--no-verify', '-u', 'origin', 'main'], {
      cwd: repository,
      encoding: 'utf8',
      env: environment,
    });

    assert.equal(bypassed.status, 0, bypassed.stderr);
  });
});
