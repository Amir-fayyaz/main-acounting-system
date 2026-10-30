#!/usr/bin/env node
/**
 * Staged secret scan (FND-014).
 *
 * Runs inside the `pre-commit` hook, after lint-staged, and refuses the commit
 * when the *staged* content (not the working tree) looks like secret material.
 *
 * Why a script instead of a shell pipeline: the same code has to behave
 * identically on Windows, macOS and Linux. Everything here is Node built-ins
 * plus `git`, so there is no `grep -P`, no GNU `sed` flag and no dependency on
 * a hosted scanning service.
 *
 * Two rules shape the implementation:
 *
 * 1. **The matched value is never printed.** A finding names the file, the line
 *    and the rule. Printing the value would leak the very secret the check is
 *    supposed to keep out of the terminal, the scroll-back buffer and any log
 *    that captures CI output.
 * 2. **A placeholder is not a secret.** `.env.example` templates and ordinary
 *    documentation are full of `PASSWORD=changeme` and
 *    `postgres://user:password@host`. Refusing those would teach contributors to
 *    bypass the hook, which is worse than the narrow check it replaces.
 *
 * The known secret *environment variable names* are read from
 * `apps/backend/src/infrastructure/config/secrets.ts` — the single place that
 * declares which variables carry credentials — instead of being duplicated here.
 * Duplicating the list is how the two drift apart.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/** The file that declares the credential-bearing environment variables. */
export const SECRET_VOCABULARY_PATH = 'apps/backend/src/infrastructure/config/secrets.ts';

/**
 * The repository this script belongs to. Resolved from the script's own location
 * so the vocabulary is found even when the hook runs from a subdirectory.
 */
export const REPOSITORY_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** A block that only ever appears around a real private key. */
const PRIVATE_KEY = /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/;

/** AWS access key id. `AKIA` is the long-lived-key prefix. */
const AWS_ACCESS_KEY_ID = /\bAKIA[0-9A-Z]{16}\b/;

/** `scheme://user:password@host` — the password is captured for the placeholder test. */
const CONNECTION_STRING = /\b[a-z][a-z0-9+.-]*:\/\/([^\s:/@]+):([^\s@/]+)@([^\s/]+)/gi;

/**
 * Values that are obviously templates, not credentials. Compared case-insensitively
 * after quotes are stripped.
 */
const PLACEHOLDER_VALUES = new Set([
  'password',
  'passwd',
  'pass',
  'pwd',
  'secret',
  'changeme',
  'change-me',
  'change_me',
  'example',
  'placeholder',
  'dummy',
  'todo',
  'redacted',
]);

/** A `.env` template that is allowed to be committed. */
const ALLOWED_ENV_FILES = new Set(['.env.example']);

/**
 * CLI flags understood by the hook entry point. The only one is `--cwd`, which
 * lets a caller (an integration test, or a hook installed outside the repository)
 * point the scan at a specific working tree. A hook run by git does not need it:
 * git starts the hook in the repository root.
 */
export function parseCliArguments(argv, { fallbackCwd = process.cwd() } = {}) {
  let cwd = fallbackCwd;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--cwd' && argv[index + 1] !== undefined) {
      cwd = argv[index + 1];
      index += 1;
    } else if (argument.startsWith('--cwd=')) {
      cwd = argument.slice('--cwd='.length);
    }
  }

  return { cwd };
}

/**
 * `true` when the value cannot be a real credential: empty, a variable
 * reference, an angle-bracket placeholder, a masked value, or one repeated
 * character. Such a value is reported as a placeholder, so the caller skips it.
 */
export function isPlaceholderValue(rawValue) {
  const value = String(rawValue ?? '')
    .trim()
    .replace(/^['"`]|['"`]$/g, '')
    .trim();

  if (value === '') return true;

  // `$MYSQL_PASSWORD`, `${MYSQL_PASSWORD}` and `<your-password>` are references.
  if (/^(?:\$\{[^}]*\}|\$[A-Za-z0-9_]+|<[^>]*>)$/.test(value)) return true;

  // `******`, `xxxxx`, `0000`: masked or obviously fake.
  if (/^(.)\1+$/.test(value)) return true;

  const normalized = value.toLowerCase();
  if (PLACEHOLDER_VALUES.has(normalized)) return true;

  // `your-password`, `your_password`, `example-password`, `change-me-now`.
  if (/^(?:your|example|sample|dummy|placeholder|change|test)[-_. ]/.test(normalized)) return true;
  if (/(?:change[-_.]?me|placeholder|not[-_.]?a[-_.]?real)/.test(normalized)) return true;

  return false;
}

/**
 * The `env` file rule: a staged `.env` file is refused, `.env.example` is the
 * template everyone is expected to commit.
 *
 * Every `.env` variant counts (`.env.local`, `.env.production`, ...): they are
 * the usual place a local credential lives, and `.gitignore` only protects a
 * file until somebody stages it with `git add --force`. `.env.example` is the
 * single documented exception.
 */
export function isStagedEnvFile(filePath) {
  const name = filePath.split(/[\\/]/).pop() ?? '';
  if (ALLOWED_ENV_FILES.has(name)) return false;
  return name === '.env' || name.startsWith('.env.');
}

/**
 * Reads the credential variable names declared by the backend configuration
 * layer. Parse failure is not fatal: the scan then runs with the generic
 * patterns only, which is a smaller check, never a bypass of the others.
 */
export function loadSecretEnvironmentKeys({
  repoRoot = REPOSITORY_ROOT,
  readText = readFileSync,
} = {}) {
  let source;

  try {
    source = String(readText(join(repoRoot, SECRET_VOCABULARY_PATH), 'utf8'));
  } catch {
    return [];
  }

  const declaration = /SECRET_ENVIRONMENT_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(source);
  if (!declaration) return [];

  const keys = [...declaration[1].matchAll(/['"]([A-Za-z0-9_]+)['"]/g)].map((match) => match[1]);
  return [...new Set(keys)];
}

function environmentAssignment(keys) {
  if (keys.length === 0) return undefined;
  const escaped = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // `KEY=value` and `KEY: value` (compose / yaml) both count. The key must be
  // delimited, so a longer name that merely ends in the key does not match.
  return new RegExp(`(?:^|[^A-Za-z0-9_])(${escaped.join('|')})\\s*[:=]\\s*(\\S.*)$`);
}

/**
 * Scans one file's text and returns the findings. Pure: no git, no IO, so the
 * rules are testable without a repository.
 *
 * A finding is `{ file, line, rule, description }`; it never carries the
 * matched value.
 */
export function scanText({ filePath, text, secretEnvironmentKeys = [] }) {
  const findings = [];

  if (isStagedEnvFile(filePath)) {
    findings.push({
      file: filePath,
      line: 1,
      rule: 'env-file',
      description: 'an .env file is staged (only .env.example may be committed)',
    });
  }

  const assignment = environmentAssignment(secretEnvironmentKeys);
  const lines = text.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    // Every line counts, including comments and documentation: a key pasted
    // into a comment is still a leaked key. Templates stay committable because
    // the value check below rejects placeholders, not because of where the line
    // happens to appear.
    if (PRIVATE_KEY.test(line)) {
      findings.push({
        file: filePath,
        line: lineNumber,
        rule: 'private-key',
        description: 'a private key block is staged',
      });
      continue;
    }

    if (AWS_ACCESS_KEY_ID.test(line)) {
      findings.push({
        file: filePath,
        line: lineNumber,
        rule: 'aws-access-key-id',
        description: 'an AWS-style access key id is staged',
      });
      continue;
    }

    CONNECTION_STRING.lastIndex = 0;
    let connection = CONNECTION_STRING.exec(line);
    let connectionReported = false;
    while (connection && !connectionReported) {
      if (!isPlaceholderValue(connection[2])) {
        connectionReported = true;
        findings.push({
          file: filePath,
          line: lineNumber,
          rule: 'connection-string-password',
          description: 'a connection string with an inline password is staged',
        });
      }
      connection = CONNECTION_STRING.exec(line);
    }

    if (assignment) {
      const match = assignment.exec(line);
      if (match && !isPlaceholderValue(match[2])) {
        findings.push({
          file: filePath,
          line: lineNumber,
          rule: `secret-environment-variable:${match[1]}`,
          description: 'a credential-bearing environment variable is assigned a value',
        });
      }
    }
  }

  return findings;
}

/** The staged paths of the repository (added, copied, modified, renamed). */
export function listStagedFiles({ cwd = process.cwd(), git = execFileSync } = {}) {
  const output = git('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  return output.split('\0').filter((entry) => entry.length > 0);
}

/**
 * The staged content of a path. Reading `:<path>` from the index — not the
 * working tree — is what makes the check about the commit rather than about
 * whatever is open in the editor.
 */
export function readStagedContent(filePath, { cwd = process.cwd(), git = execFileSync } = {}) {
  return git('git', ['show', `:${filePath}`], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function isBinary(text) {
  return text.includes('\0');
}

/**
 * Scans every staged file. `readContent` may throw for a submodule or a path
 * that left the index between the two git calls; that file is skipped rather
 * than failing the commit for an unrelated reason.
 *
 * There is deliberately no path-based exemption — not even for `tooling/` or
 * this script's own directory. An allowlisted directory is a bypass waiting to
 * be used by accident, and the test fixtures build their key material at runtime
 * precisely so this file can pass its own scan without an exemption.
 */
export function findStagedSecrets({
  cwd = process.cwd(),
  git = execFileSync,
  readText = readFileSync,
} = {}) {
  const secretEnvironmentKeys = loadSecretEnvironmentKeys({ readText });
  const findings = [];

  for (const filePath of listStagedFiles({ cwd, git })) {
    if (isStagedEnvFile(filePath)) {
      findings.push({
        file: filePath,
        line: 1,
        rule: 'env-file',
        description: 'an .env file is staged (only .env.example may be committed)',
      });
      continue;
    }

    let content;
    try {
      content = readStagedContent(filePath, { cwd, git });
    } catch {
      continue;
    }

    if (isBinary(content)) continue;

    findings.push(...scanText({ filePath, text: content, secretEnvironmentKeys }));
  }

  return findings;
}

function formatFinding({ file, line, rule, description }) {
  return `  ${file}:${line}  [${rule}]  ${description}`;
}

/**
 * Hook entry point. Exit codes: `0` clean, `1` a likely secret is staged.
 */
export function main({ cwd = process.cwd(), stderr = process.stderr } = {}) {
  let findings;

  try {
    findings = findStagedSecrets({ cwd });
  } catch (error) {
    // A broken git call must not block every commit; the hook is a convenience,
    // CI remains the authority.
    stderr.write(
      `husky - staged secret scan skipped: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 0;
  }

  if (findings.length === 0) return 0;

  stderr.write(
    [
      '',
      `husky - refusing the commit: ${findings.length} likely secret(s) staged.`,
      '',
      ...findings.map(formatFinding),
      '',
      ' The matched value is never printed, on purpose.',
      ' Remove the value and rotate the credential if it was ever real;',
      ' keep the value in .env (untracked) or in the deployment secret store.',
      ' Emergency bypass: git commit --no-verify  (disclose it in the pull request).',
      '',
    ].join('\n'),
  );

  return 1;
}

const invokedDirectly =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
  const { cwd } = parseCliArguments(process.argv.slice(2));
  process.exitCode = main({ cwd });
}
