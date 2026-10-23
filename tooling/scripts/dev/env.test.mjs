import assert from 'node:assert/strict';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import {
  EnvCreationError,
  MissingEnvVariablesError,
  REQUIRED_VARIABLES,
  assertRequiredVariables,
  createEnvFileFromExample,
  parseEnvText,
} from './env.mjs';

const temporaryDirectories = [];

function temporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'dev-env-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('parseEnvText', () => {
  it('parses KEY=VALUE, skips comments and blanks, trims quotes', () => {
    assert.deepEqual(
      parseEnvText(
        '# comment\nMYSQL_PORT=3306\n\n SAY_HELLO = "hello world" \nUNQUOTED= trail \nUSELESS',
      ),
      {
        MYSQL_PORT: '3306',
        SAY_HELLO: 'hello world',
        UNQUOTED: 'trail',
      },
    );
  });

  it('keeps the first = inside the value', () => {
    assert.deepEqual(parseEnvText('CONNECTION=a=b'), { CONNECTION: 'a=b' });
  });
});

describe('createEnvFileFromExample', () => {
  it('copies the example to .env when missing', () => {
    const directory = temporaryDirectory();
    const examplePath = join(directory, '.env.example');
    const envPath = join(directory, '.env');
    writeFileSync(examplePath, 'MYSQL_PASSWORD=example-secret\n');

    const result = createEnvFileFromExample({
      envPath,
      examplePath,
      fs: { existsSync, copyFileSync },
    });
    assert.equal(result.created, true);
    assert.equal(readFileSync(envPath, 'utf8'), 'MYSQL_PASSWORD=example-secret\n');
  });

  it('never overwrites or modifies an existing .env', () => {
    const directory = temporaryDirectory();
    const examplePath = join(directory, '.env.example');
    const envPath = join(directory, '.env');
    writeFileSync(examplePath, 'MYSQL_PASSWORD=example-secret\n');
    writeFileSync(envPath, 'MYSQL_PASSWORD=existing-user-secret\n');

    let copyAttempts = 0;
    const fs = {
      existsSync: (path) => (path === envPath ? true : existsSync(path)),
      copyFileSync: () => {
        copyAttempts += 1;
      },
    };
    const result = createEnvFileFromExample({ envPath, examplePath, fs });

    assert.equal(result.created, false);
    assert.equal(copyAttempts, 0);
    assert.equal(readFileSync(envPath, 'utf8'), 'MYSQL_PASSWORD=existing-user-secret\n');
  });

  it('fails clearly when the example template is missing', () => {
    const directory = temporaryDirectory();
    assert.throws(
      () =>
        createEnvFileFromExample({
          envPath: join(directory, '.env'),
          examplePath: join(directory, '.env.example'),
          fs: { existsSync: () => false, copyFileSync },
        }),
      EnvCreationError,
    );
  });
});

describe('assertRequiredVariables', () => {
  it('passes when all required variables have values', () => {
    const variables = Object.fromEntries(REQUIRED_VARIABLES.map((name) => [name, `${name}-value`]));
    assert.equal(assertRequiredVariables(variables, { filePath: '.env' }), variables);
  });

  it('names every missing variable and never any value', () => {
    const variables = { MYSQL_PASSWORD: 'super-secret-value', MINIO_SECRET_KEY: '   ' };
    assert.throws(
      () => assertRequiredVariables(variables, { filePath: '.env' }),
      (error) =>
        error instanceof MissingEnvVariablesError &&
        error.message.includes('MYSQL_ROOT_PASSWORD') &&
        error.message.includes('MINIO_ACCESS_KEY') &&
        error.message.includes('MINIO_SECRET_KEY') &&
        !error.message.includes('super-secret-value'),
    );
  });
});
