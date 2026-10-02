import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * The shape of a persistence contract, checked instead of assumed (SHR-004;
 * ADR-003 sections 10, 14 and 25; ADR-002 sections 8 and 23).
 *
 * What keeps a port from turning into a database gateway is not a paragraph in
 * a README — it is the fact that no such operation exists to be called. These
 * tests read the shipped sources of `shared/persistence/` and fail the run if
 * that ever stops being true: an operation outside the vocabulary, a delete, a
 * generic repository, an implementation token, or an asynchronous promise the
 * contract does not make.
 *
 * The analyser is itself tested against fixtures, so a broken check cannot pass
 * by simply finding nothing.
 */

const persistenceRoot = dirname(fileURLToPath(import.meta.url));

/** The only operations a persistence port or read port may offer. */
const ALLOWED_OPERATIONS = ['add', 'exists', 'find', 'get', 'read', 'update'];

/**
 * Operations that would expose unrestricted access or remove data the
 * architecture says must not be removed (ADR-003, sections 10–11).
 */
const FORBIDDEN_OPERATIONS = [
  'delete',
  'drop',
  'execute',
  'merge',
  'patch',
  'purge',
  'query',
  'remove',
  'save',
  'truncate',
  'upsert',
];

/** Implementation tokens that must not appear in the contract's code. */
const FORBIDDEN_TOKENS = [
  'drizzle',
  'knex',
  'mongoose',
  'mongodb',
  'mysql',
  'prisma',
  'redis',
  'sequelize',
  'sql',
  'typeorm',
  'select from',
  'insert into',
  'delete from',
];

/** Comment text is documentation, not contract — strip it before scanning. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\w])\/\/[^\n]*/gm, '$1');
}

/** Every exported type name, so a `type` alias cannot smuggle a name in. */
function exportedTypeNames(source: string): string[] {
  return [...source.matchAll(/export\s+(?:interface|type)\s+(\w+)/g)].map((match) => match[1]);
}

/** The body of every exported interface, matched by brace counting. */
function interfaceBodies(source: string): { readonly name: string; readonly body: string }[] {
  const bodies: { name: string; body: string }[] = [];
  const pattern = /export\s+interface\s+(\w+)[^{]*\{/g;

  for (const match of source.matchAll(pattern)) {
    const start = match.index + match[0].length;
    let depth = 1;
    let index = start;
    while (index < source.length && depth > 0) {
      if (source[index] === '{') depth += 1;
      if (source[index] === '}') depth -= 1;
      index += 1;
    }
    bodies.push({ name: match[1], body: source.slice(start, index - 1) });
  }
  return bodies;
}

/** Operation names declared inside an interface body. */
function operationNames(body: string): { readonly name: string; readonly statement: string }[] {
  const operations: { name: string; statement: string }[] = [];
  const pattern = /^[ \t]+(\w+)[<(]/gm;

  for (const match of body.matchAll(pattern)) {
    const end = body.indexOf(';', match.index);
    operations.push({
      name: match[1],
      statement: body.slice(match.index, end === -1 ? body.length : end),
    });
  }
  return operations;
}

/**
 * Reports every way a source file breaks the persistence contract conventions.
 * An empty array means the file stays inside the vocabulary.
 */
export function analysePersistenceSource(file: string, source: string): string[] {
  const code = stripComments(source);
  const violations: string[] = [];

  for (const name of exportedTypeNames(code)) {
    if (/repository/i.test(name)) {
      violations.push(
        `${file}: exports "${name}"; the kernel ships no repository — a module declares ` +
          'its own, composed from the shared capabilities.',
      );
    }
  }

  for (const { name: interfaceName, body } of interfaceBodies(code)) {
    for (const operation of operationNames(body)) {
      if (!ALLOWED_OPERATIONS.includes(operation.name)) {
        violations.push(
          `${file}: interface ${interfaceName} declares "${operation.name}"; the operation ` +
            `vocabulary is ${ALLOWED_OPERATIONS.join(', ')}.`,
        );
      }
      if (FORBIDDEN_OPERATIONS.includes(operation.name)) {
        violations.push(
          `${file}: interface ${interfaceName} declares "${operation.name}", which is not ` +
            'part of the persistence contract.',
        );
      }
      if (!operation.statement.includes('): Promise<')) {
        violations.push(
          `${file}: interface ${interfaceName}.${operation.name} does not return a Promise; ` +
            'every port operation is asynchronous.',
        );
      }
    }
  }

  const lowered = code.toLowerCase();
  for (const token of FORBIDDEN_TOKENS) {
    if (lowered.includes(token)) {
      violations.push(
        `${file}: mentions "${token}"; a persistence contract names no implementation.`,
      );
    }
  }

  return violations;
}

const shippedFiles = readdirSync(persistenceRoot).filter(
  (name) => name.endsWith('.ts') && !name.endsWith('.spec.ts'),
);

describe('persistence contract conventions — the shipped sources', () => {
  it('has shipped contracts to check', () => {
    expect(shippedFiles.length).toBeGreaterThanOrEqual(4);
  });

  it('offers only the operation vocabulary, with no delete and no generic query', () => {
    const violations = shippedFiles.flatMap((name) =>
      analysePersistenceSource(name, readFileSync(join(persistenceRoot, name), 'utf8')),
    );

    expect(violations).toEqual([]);
  });
});

describe('persistence contract conventions — the checker itself', () => {
  it('accepts a contract written in the vocabulary', () => {
    const valid = `
      import type { Revision } from './revision.js';

      export interface Invoice {
        readonly id: string;
      }

      export interface LoadsInvoices {
        get(id: string): Promise<{ aggregate: Invoice; revision: Revision } | undefined>;
        exists(id: string): Promise<boolean>;
        update(aggregate: Invoice, expected: Revision): Promise<{ revision: Revision }>;
      }
    `;

    expect(analysePersistenceSource('valid.ts', valid)).toEqual([]);
  });

  it('detects a delete offered by a contract', () => {
    const withDelete = `
      export interface Gateway {
        delete(id: string): Promise<void>;
      }
    `;

    expect(analysePersistenceSource('with-delete.ts', withDelete)).toContainEqual(
      expect.stringContaining('declares "delete"'),
    );
  });

  it('detects an unrestricted query operation', () => {
    const withQuery = `
      export interface Gateway {
        query(statement: string): Promise<unknown>;
      }
    `;

    expect(analysePersistenceSource('with-query.ts', withQuery)).toContainEqual(
      expect.stringContaining('declares "query"'),
    );
  });

  it('detects a generic repository abstraction', () => {
    const generic = `
      export interface GenericRepository<T> {
        get(id: string): Promise<T>;
      }
    `;

    expect(analysePersistenceSource('generic.ts', generic)).toContainEqual(
      expect.stringContaining('the kernel ships no repository'),
    );
  });

  it('detects a synchronous operation', () => {
    const synchronous = `
      export interface Sync {
        get(id: string): string;
      }
    `;

    expect(analysePersistenceSource('sync.ts', synchronous)).toContainEqual(
      expect.stringContaining('does not return a Promise'),
    );
  });

  it('detects an implementation token in code', () => {
    // The import opens on this line so `framework-independence.spec.ts`, which
    // scans shared/ file text for import statements, never mistakes the fixture
    // for an import of this file.
    const withDriver = `import { drizzle } from 'drizzle-orm/mysql2';

      export interface Loads {
        get(id: string): Promise<string | undefined>;
      }
    `;

    expect(analysePersistenceSource('driver.ts', withDriver)).toContainEqual(
      expect.stringContaining('mentions "drizzle"'),
    );
  });

  it('ignores the same words when they appear only in documentation', () => {
    const documented = `
      /**
       * The contract an adapter implements with MySQL or Drizzle. A generic
       * repository would be wrong here, and a delete does not exist.
       * No SELECT FROM is ever accepted.
       */
      export interface Loads {
        get(id: string): Promise<string | undefined>;
      }
    `;

    expect(analysePersistenceSource('documented.ts', documented)).toEqual([]);
  });
});
