import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  findStagedSecrets,
  isPlaceholderValue,
  isStagedEnvFile,
  loadSecretEnvironmentKeys,
  main,
  parseCliArguments,
  scanText,
} from './check-staged-secrets.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url).replace(/\.test\.mjs$/, '.mjs');
const REPOSITORY_ROOT = join(dirname(SCRIPT_PATH), '..', '..');

/** A value distinctive enough that "was it printed?" is a real question. */
const REAL_SECRET = 'S3cr3tValue-DoNotPrint-9f3a';

/**
 * The fixtures below are assembled at runtime instead of written out in full.
 *
 * This file is committed through the very hook it tests, so a literal key header
 * or AWS key id in it would be refused by the scan — and the alternative, an
 * allowlist for "test fixtures" inside the scanner, is a bypass waiting to be
 * abused. Building the strings at runtime keeps the check strict for everybody.
 */
const PRIVATE_KEY_HEADER = `-----BEGIN RSA ${'PRIVATE'} KEY-----`;
const PRIVATE_KEY_BLOCK = `${PRIVATE_KEY_HEADER}\nMIIEowIBAAKCAQEA\n-----END RSA ${'PRIVATE'} KEY-----\n`;
const OPENSSH_KEY_HEADER = `-----BEGIN OPENSSH ${'PRIVATE'} KEY-----`;
const AWS_KEY_ID = 'AKIA' + 'IOSFODNN7EXAMPL7';
/** Built at runtime for the same reason: an assignment is a fixture, not a leak. */
const SECRET_KEY = ['MYSQL', 'PASSWORD'].join('_');

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** A throwaway repository, so the scan is exercised against real git. */
function temporaryRepository() {
  const directory = mkdtempSync(join(tmpdir(), 'fnd-014-secrets-'));
  temporaryDirectories.push(directory);

  git(directory, ['init', '-b', 'main']);
  git(directory, ['config', 'user.email', 'contributor@example.com']);
  git(directory, ['config', 'user.name', 'Test Contributor']);
  git(directory, ['config', 'commit.gpgsign', 'false']);

  return directory;
}

/** Installs the real scan script as the repository's pre-commit hook. */
function temporaryHookScript(repository, nodeArgs = []) {
  // A throwaway hook that runs the real scan script against this throwaway repo.
  // This is what lets the hook tests reuse the committed scanner without needing
  // git to have installed it into the throwaway repository first.
  const hookPath = join(repository, '.git', 'hooks', 'pre-commit');
  writeFileSync(
    hookPath,
    `#!/bin/sh\nexec node ${JSON.stringify(SCRIPT_PATH)} --cwd "${repository}" ${nodeArgs.map((a) => JSON.stringify(a)).join(' ')}\n`,
  );
  try {
    chmodSync(hookPath, 0o755);
  } catch {
    // Windows has no executable bit; git runs the hook through sh regardless.
  }
  return hookPath;
}

function stagedFindings(repository) {
  return findStagedSecrets({ cwd: repository });
}

/** Stages a file and returns the findings the hook would see. */
function stageAndScan(repository, filePath, content) {
  const absolutePath = join(repository, filePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
  git(repository, ['add', '--force', '--', filePath]);
  return stagedFindings(repository);
}

describe('isPlaceholderValue', () => {
  it('treats templates, references and masks as placeholders', () => {
    for (const value of [
      '',
      '  ',
      '""',
      '${MYSQL_PASSWORD}',
      '$MYSQL_PASSWORD',
      '<your-password>',
      'changeme',
      'CHANGE-ME',
      'password',
      'placeholder',
      'xxxxxx',
      '******',
      'your-password',
      'your_database_password',
      'example-password',
    ]) {
      assert.equal(isPlaceholderValue(value), true, `expected a placeholder: ${value}`);
    }
  });

  it('treats a real-looking value as a secret', () => {
    assert.equal(isPlaceholderValue(REAL_SECRET), false);
    assert.equal(isPlaceholderValue('hunter2'), false);
  });
});

describe('isStagedEnvFile', () => {
  it('allows the template and refuses every other .env variant', () => {
    assert.equal(isStagedEnvFile('.env.example'), false);
    assert.equal(isStagedEnvFile('apps/backend/.env.example'), false);

    assert.equal(isStagedEnvFile('.env'), true);
    assert.equal(isStagedEnvFile('.env.local'), true);
    assert.equal(isStagedEnvFile('apps/backend/.env'), true);
    assert.equal(isStagedEnvFile('apps/backend/.env.production'), true);
    assert.equal(isStagedEnvFile('.env.example.local'), true);
    assert.equal(isStagedEnvFile('apps\\backend\\.env'), true);
  });

  it('does not treat an unrelated dotfile as an env file', () => {
    assert.equal(isStagedEnvFile('.editorconfig'), false);
    assert.equal(isStagedEnvFile('.envrc'), false);
    assert.equal(isStagedEnvFile('docs/environment.md'), false);
  });
});

describe('parseCliArguments', () => {
  it('uses the process working directory when no flag is given', () => {
    assert.deepEqual(parseCliArguments([], { fallbackCwd: '/work/repo' }), { cwd: '/work/repo' });
  });

  it('reads --cwd in both split and inline forms', () => {
    assert.equal(parseCliArguments(['--cwd', '/other']).cwd, '/other');
    assert.equal(parseCliArguments(['--cwd=/other']).cwd, '/other');
    assert.equal(parseCliArguments(['--cwd']).cwd, process.cwd());
  });
});

describe('loadSecretEnvironmentKeys', () => {
  it('reads the credential variable names from the configuration layer', () => {
    const keys = loadSecretEnvironmentKeys({ repoRoot: REPOSITORY_ROOT });

    // The scan must follow the real declaration, not a copy of it.
    assert.ok(keys.includes('MYSQL_PASSWORD'));
    assert.ok(keys.includes('MINIO_SECRET_KEY'));
    assert.ok(keys.length >= 5, `expected the full vocabulary, got ${keys.join(', ')}`);
  });

  it('returns no keys when the declaration cannot be read', () => {
    assert.deepEqual(
      loadSecretEnvironmentKeys({
        readText: () => {
          throw new Error('missing');
        },
      }),
      [],
    );
  });

  it('returns no keys when the declaration is absent from the file', () => {
    assert.deepEqual(loadSecretEnvironmentKeys({ readText: () => '// moved elsewhere' }), []);
  });
});

describe('scanText', () => {
  const scan = (filePath, text, keys = ['MYSQL_PASSWORD']) =>
    scanText({ filePath, text, secretEnvironmentKeys: keys });

  it('detects a private key block', () => {
    const findings = scan('infra/id_rsa', `${OPENSSH_KEY_HEADER}\nabc\n`);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'private-key');
    assert.equal(findings[0].line, 1);
    assert.equal(findings[0].file, 'infra/id_rsa');
  });

  it('detects an AWS-style access key id on its line', () => {
    const findings = scan('docs/aws.md', `line one\nkey = ${AWS_KEY_ID}\n`);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'aws-access-key-id');
    assert.equal(findings[0].line, 2);
  });

  it('detects a key pasted into a comment', () => {
    const findings = scan('src/config.ts', `// old key: ${AWS_KEY_ID}\n`);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'aws-access-key-id');
  });

  it('detects a connection string with an inline password', () => {
    const findings = scan('compose.yml', `  url: mysql://app:${REAL_SECRET}@db:3306/app\n`);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'connection-string-password');
    assert.equal(findings[0].line, 1);
  });

  it('does not flag a connection string whose password is a placeholder', () => {
    assert.deepEqual(scan('compose.yml', 'url: postgres://user:password@host:5432/db\n'), []);
    assert.deepEqual(scan('bot.yml', 'url: postgres://user:${DB_PASSWORD}@host/db\n'), []);
  });

  it('detects a credential-bearing environment variable assignment', () => {
    const findings = scan('docker-compose.yml', `    ${SECRET_KEY}: ${REAL_SECRET}\n`);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, `secret-environment-variable:${SECRET_KEY}`);
  });

  it('does not flag a placeholder assignment in a template', () => {
    assert.deepEqual(scan('.env.example', `${SECRET_KEY}=your-database-password\n`), []);
    assert.deepEqual(scan('.env.example', 'MINIO_SECRET_KEY=changeme\n'), []);
    assert.deepEqual(scan('compose.yml', `      ${SECRET_KEY}: \${${SECRET_KEY}}\n`), []);
  });

  it('ignores a different variable that merely ends with a credential name', () => {
    assert.deepEqual(scan('x.env', `NOT_MYSQL_PASSWORD_LENGTH=${REAL_SECRET}\n`), []);
  });

  it('never puts the matched value in a finding', () => {
    const findings = [
      ...scan('infra/id_rsa', `${PRIVATE_KEY_HEADER}\n${REAL_SECRET}\n`),
      ...scan('compose.yml', `url: mysql://app:${REAL_SECRET}@db/app\n`),
      ...scan('docker-compose.yml', `${SECRET_KEY}=${REAL_SECRET}\n`),
    ];

    assert.ok(findings.length >= 3);
    assert.equal(JSON.stringify(findings).includes(REAL_SECRET), false);
  });
});

describe('staged scan against a real repository', () => {
  it('finds a staged .env file', () => {
    const repository = temporaryRepository();

    const findings = stageAndScan(repository, '.env', 'SOMETHING=1\n');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'env-file');
    assert.equal(findings[0].file, '.env');
  });

  it('refuses every .env variant, including .env.local', () => {
    const repository = temporaryRepository();

    const findings = stageAndScan(repository, 'apps/backend/.env.local', 'SOMETHING=1\n');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'env-file');
  });

  it('leaves .env.example alone even when its values look sensitive', () => {
    const repository = temporaryRepository();

    const findings = stageAndScan(repository, '.env.example', 'MYSQL_PASSWORD=changeme\n');
    assert.deepEqual(findings, []);
  });

  it('reads the index, not the working tree', () => {
    const repository = temporaryRepository();

    stageAndScan(repository, 'notes.md', `${AWS_KEY_ID}\n`);

    // Clean the file after staging: the commit would still carry the key.
    writeFileSync(join(repository, 'notes.md'), 'nothing here\n');

    const findings = stagedFindings(repository);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'aws-access-key-id');
  });

  it('reports a clean staging area as clean', () => {
    const repository = temporaryRepository();

    assert.deepEqual(stageAndScan(repository, 'src/index.ts', 'export const answer = 42;\n'), []);
  });

  it('main() explains the refusal on stderr and never echoes the value', () => {
    const repository = temporaryRepository();
    stageAndScan(repository, 'config/production.yaml', `${SECRET_KEY}: ${REAL_SECRET}\n`);

    const chunks = [];
    const exitCode = main({
      cwd: repository,
      stderr: { write: (chunk) => chunks.push(chunk) },
    });

    const output = chunks.join('');
    assert.equal(exitCode, 1);
    assert.match(output, /config\/production\.yaml:1/);
    assert.match(output, /secret-environment-variable:MYSQL_PASSWORD/);
    assert.equal(output.includes(REAL_SECRET), false);
  });

  it('main() returns 0 when nothing looks like a secret', () => {
    const repository = temporaryRepository();
    stageAndScan(repository, 'src/index.ts', 'export const answer = 42;\n');

    assert.equal(main({ cwd: repository, stderr: { write: () => true } }), 0);
  });
});

describe('pre-commit hook behaviour', () => {
  it('refuses a commit that stages a private key, and creates no commit', () => {
    const repository = temporaryRepository();
    installPreCommitHook(repository);

    writeFileSync(join(repository, 'deploy_key.pem'), PRIVATE_KEY_BLOCK);
    git(repository, ['add', '--', 'deploy_key.pem']);

    const result = spawnSync('git', ['commit', '-m', 'chore(ci): add deploy key'], {
      cwd: repository,
      encoding: 'utf8',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /refusing the commit/);
    assert.match(result.stderr, /deploy_key\.pem:1/);
    assert.equal(result.stderr.includes('MIIEowIBAAKCAQEA'), false);

    // Nothing reached the history.
    const log = spawnSync('git', ['log', '--oneline'], { cwd: repository, encoding: 'utf8' });
    assert.equal(log.stdout.trim(), '');
  });

  it('lets a clean commit through', () => {
    const repository = temporaryRepository();
    temporaryHookScript(repository);

    writeFileSync(join(repository, 'index.ts'), 'export const answer = 42;\n');
    git(repository, ['add', '--', 'index.ts']);

    const result = spawnSync('git', ['commit', '-m', 'feat(core): add the answer'], {
      cwd: repository,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr);
  });

  it('honours the documented --no-verify escape hatch', () => {
    const repository = temporaryRepository();
    writeFileSync(join(repository, 'deploy_key.pem'), `${PRIVATE_KEY_HEADER}\n`);
    git(repository, ['add', '--', 'deploy_key.pem']);

    const result = spawnSync(
      'git',
      ['commit', '--no-verify', '-m', 'chore(ci): bypass on purpose'],
      { cwd: repository, encoding: 'utf8' },
    );

    assert.equal(result.status, 0, result.stderr);
  });

  it('refuses a real .env staged by a user, and does not exempt any directory', () => {
    const userRepo = temporaryRepository();
    writeFileSync(join(userRepo, '.env'), `${SECRET_KEY}=real-looking-value-here\n`);
    git(userRepo, ['add', '--force', '--', '.env']);
    temporaryHookScript(userRepo);

    const userCommit = spawnSync('git', ['commit', '-m', 'chore: try staging .env'], {
      cwd: userRepo,
      encoding: 'utf8',
    });

    assert.equal(
      userCommit.status !== 0 &&
        /refusing the commit/.test(userCommit.stderr) &&
        /\.env:1/.test(userCommit.stderr),
      true,
      `expected the hook to refuse the .env, got status=${userCommit.status} stderr=${userCommit.stderr.slice(0, 500)}`,
    );

    // A secret under `tooling/` is still a secret. The scanner has no
    // directory-level allowlist, so this commit must be refused too.
    const toolRepo = temporaryRepository();
    mkdirSync(join(toolRepo, 'tooling/scripts'), { recursive: true });
    writeFileSync(
      join(toolRepo, 'tooling/scripts/notes.mjs'),
      `export const key = '${AWS_KEY_ID}';\n`,
    );
    git(toolRepo, ['add', '--force', '--', 'tooling']);
    temporaryHookScript(toolRepo);

    const toolCommit = spawnSync('git', ['commit', '-m', 'chore: commit tooling notes'], {
      cwd: toolRepo,
      encoding: 'utf8',
    });

    assert.equal(
      toolCommit.status !== 0 && /tooling\/scripts\/notes\.mjs:1/.test(toolCommit.stderr),
      true,
      `expected the hook to refuse the tooling secret, got status=${toolCommit.status} stderr=${toolCommit.stderr.slice(0, 500)}`,
    );
  });

  function installPreCommitHook(repository) {
    return temporaryHookScript(repository);
  }
});
