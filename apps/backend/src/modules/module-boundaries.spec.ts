import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * The module rules a repository depends on, checked instead of promised
 * (SHR-004; ADR-002 sections 12 and 23; ADR-003 sections 4, 14 and 25).
 *
 * A repository belongs to the module that owns the data, and the fastest way
 * to break that is an import: reaching into another module's adapter, its ORM
 * models, its tables — or letting the Domain, which must be testable without
 * any infrastructure, import the infrastructure itself. Both are import-time
 * facts, so both are checked here over the real sources.
 *
 * What this guard covers:
 *
 * - **Domain purity.** A `domain/` file imports only its own module and the
 *   shared kernel (plus `node:*` and the test runner). No framework, no ORM, no
 *   driver, no shared infrastructure — the ports are the Domain's whole view of
 *   persistence.
 * - **Domain never touches a transaction.** A `domain/` file does not import
 *   `src/shared/transaction/` at all: beginning, committing, rolling back or
 *   even observing a transaction belongs to the Application layer, which owns
 *   the boundary (SHR-005; ADR-004, section 6).
 * - **Domain never reads the ambient tenant context.** A `domain/` file does
 *   not import `src/shared/tenant/` at all: the Application resolves the
 *   company boundary from a trusted source and passes it to Domain as an
 *   explicit operation input — Domain must stay callable without any ambient
 *   state (SHR-007; ADR-001, section 13).
 * - **No cross-module persistence.** No module imports another module's
 *   `infrastructure/`, `persistence/` or `repositor(y|ies)` — where its
 *   adapters, ORM models and repository interfaces live. Published contracts
 *   (`application/`, domain events) stay importable, exactly as ADR-002,
 *   section 12 allows.
 *
 * Everything a module owns is reachable; another module's internals are not.
 */

const modulesRoot = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(modulesRoot, '..');

/** Path in another module that marks its persistence internals. */
const PERSISTENCE_PATH = /(^|\/)(infrastructure|persistence|repositor(y|ies))(\/|$)/;

/** Bare specifiers a Domain file may import: the runtime and the test runner. */
function isAllowedDomainBareSpecifier(specifier: string): boolean {
  return specifier.startsWith('node:') || specifier === 'vitest';
}

/** Import specifiers of a source, anchored so prose never counts as an import. */
function importSpecifiers(source: string): string[] {
  const patterns = [
    /^\s*(?:import|export)\b[^;]*?\bfrom\s*['"]([^'"]+)['"]/gm,
    /^\s*import\s*['"]([^'"]+)['"]/gm,
    /(?:^|[^\w.$])import\s*\(\s*['"]([^'"]+)['"]\s*\)/gm,
  ];

  const specifiers = new Set<string>();
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      specifiers.add(match[1]);
    }
  }
  return [...specifiers];
}

const normalize = (path: string): string => path.split(sep).join('/');

/**
 * Reports every way a module source breaks the ownership rules. `file` is
 * relative to `src/modules/`, so fixtures can be checked without touching the
 * filesystem.
 */
export function analyseModuleSource(file: string, source: string): string[] {
  const violations: string[] = [];
  const moduleOf = normalize(file).split('/')[0];
  const isDomainFile = /(^|\/)domain\//.test(normalize(file));

  for (const specifier of importSpecifiers(source)) {
    if (!specifier.startsWith('.')) {
      if (isDomainFile && !isAllowedDomainBareSpecifier(specifier)) {
        violations.push(
          `${file}: domain imports "${specifier}"; Domain may import only node: builtins, ` +
            'the test runner and files of its own module or the shared kernel.',
        );
      }
      continue;
    }

    const target = normalize(resolve(modulesRoot, dirname(file), specifier));
    const relativeToModules = normalize(relative(modulesRoot, target));
    const escapesModules = relativeToModules.startsWith('../');
    const relativeToSrc = normalize(relative(srcRoot, target));
    const insideShared = relativeToSrc.startsWith('shared/');

    if (
      isDomainFile &&
      (escapesModules ? !insideShared : relativeToModules.split('/')[0] !== moduleOf)
    ) {
      violations.push(
        `${file}: domain imports "${specifier}"; Domain reaches only its own module and ` +
          'src/shared/.',
      );
      continue;
    }

    if (isDomainFile && /^shared\/transaction(\/|$)/.test(relativeToSrc)) {
      violations.push(
        `${file}: domain imports "${specifier}"; Domain never opens, joins or observes a ` +
          'transaction — that boundary belongs to Application (SHR-005, ADR-004 section 6).',
      );
      continue;
    }

    if (isDomainFile && /^shared\/tenant(\/|$)/.test(relativeToSrc)) {
      violations.push(
        `${file}: domain imports "${specifier}"; Domain receives the tenant scope as an ` +
          'explicit operation input — the ambient context belongs to Application ' +
          '(SHR-007, ADR-001 section 13).',
      );
      continue;
    }

    if (escapesModules) {
      continue; // src/infrastructure and friends: infrastructure wiring, not another module
    }

    const targetModule = relativeToModules.split('/')[0];
    if (targetModule !== moduleOf && PERSISTENCE_PATH.test(relativeToModules)) {
      violations.push(
        `${file}: imports "${specifier}" inside another module's persistence boundary; ` +
          'cross-module access goes through published contracts only.',
      );
    }
  }

  return violations;
}

/** Every module source, including this guard itself. */
function moduleSources(): { file: string; source: string }[] {
  const files: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.ts')) files.push(path);
    }
  };

  walk(modulesRoot);
  return files.map((path) => ({
    file: normalize(relative(modulesRoot, path)),
    source: readFileSync(path, 'utf8'),
  }));
}

describe('module ownership — the sources as they are', () => {
  it('keeps Domain free of frameworks and of everything outside its module', () => {
    const violations = moduleSources()
      .filter(({ file }) => /(^|\/)domain\//.test(file))
      .flatMap(({ file, source }) => analyseModuleSource(file, source));

    expect(violations).toEqual([]);
  });

  it("keeps every module out of another module's persistence", () => {
    const violations = moduleSources().flatMap(({ file, source }) =>
      analyseModuleSource(file, source),
    );

    expect(violations).toEqual([]);
  });
});

describe('module ownership — the checker itself', () => {
  it('allows a module to reach its own layers and the shared kernel', () => {
    expect(
      analyseModuleSource(
        'sales/domain/invoice.ts',
        "import { Money } from '../../../shared/money/money.js';",
      ),
    ).toEqual([]);
    expect(
      analyseModuleSource(
        'sales/application/commands/post.ts',
        "import { Invoice } from '../../domain/invoice.js';",
      ),
    ).toEqual([]);
  });

  it('allows the published contracts of another module', () => {
    expect(
      analyseModuleSource(
        'sales/application/commands/post.ts',
        "import { PostInvoice } from '../../../accounting/application/commands/post-invoice.js';",
      ),
    ).toEqual([]);
    expect(
      analyseModuleSource(
        'sales/application/commands/post.ts',
        "import { SalePosted } from '../../../party/domain/events/party-created.js';",
      ),
    ).toEqual([]);
  });

  it('rejects Domain importing a framework, an ORM or shared infrastructure', () => {
    expect(
      analyseModuleSource(
        'sales/domain/invoice.ts',
        "import { Injectable } from '@nestjs/common';",
      ),
    ).toContainEqual(expect.stringContaining('domain imports "@nestjs/common"'));
    expect(
      analyseModuleSource(
        'sales/domain/invoice.ts',
        "import { mysqlTable } from 'drizzle-orm/mysql-core';",
      ),
    ).toContainEqual(expect.stringContaining('domain imports "drizzle-orm/mysql-core"'));
    expect(
      analyseModuleSource(
        'sales/domain/invoice.ts',
        "import { DATABASE } from '../../../infrastructure/database/database.tokens.js';",
      ),
    ).toContainEqual(expect.stringContaining('domain imports'));
  });

  it('rejects importing another module’s repository or adapter', () => {
    expect(
      analyseModuleSource(
        'sales/application/commands/post.ts',
        "import { PartyRepo } from '../../../party/infrastructure/persistence/party.repo.js';",
      ),
    ).toContainEqual(expect.stringContaining("another module's persistence boundary"));
    expect(
      analyseModuleSource(
        'sales/application/commands/post.ts',
        "import { invoices } from '../../../accounting/domain/repositories/invoices.js';",
      ),
    ).toContainEqual(expect.stringContaining("another module's persistence boundary"));
    expect(
      analyseModuleSource(
        'sales/domain/invoice.ts',
        "import { Party } from '../../party/domain/party.js';",
      ),
    ).toContainEqual(expect.stringContaining('Domain reaches only its own module'));
  });

  it('rejects Domain reaching for the transaction boundary', () => {
    expect(
      analyseModuleSource(
        'sales/domain/invoice.ts',
        "import type { TransactionBoundary } from '../../../shared/transaction/transaction-boundary.js';",
      ),
    ).toContainEqual(expect.stringContaining('Domain never opens, joins or observes'));
  });

  it('rejects Domain reading the ambient tenant context', () => {
    expect(
      analyseModuleSource(
        'sales/domain/invoice.ts',
        "import { TenantScope } from '../../../shared/tenant/tenant-scope.js';",
      ),
    ).toContainEqual(expect.stringContaining('Domain receives the tenant scope'));
  });

  it('allows Application, but not Domain, to read the ambient tenant context', () => {
    expect(
      analyseModuleSource(
        'sales/application/commands/post.ts',
        "import { TenantScope } from '../../../shared/tenant/tenant-scope.js';",
      ),
    ).toEqual([]);
    expect(
      analyseModuleSource(
        'sales/domain/invoice.ts',
        "import { tenantScopedMessageOptions } from '../../../shared/tenant/tenant-message-options.js';",
      ),
    ).toContainEqual(expect.stringContaining('Domain receives the tenant scope'));
  });

  it('allows Application, but not Domain, to use the transaction boundary', () => {
    expect(
      analyseModuleSource(
        'sales/application/commands/post.ts',
        "import type { TransactionBoundary } from '../../../shared/transaction/transaction-boundary.js';",
      ),
    ).toEqual([]);
    expect(
      analyseModuleSource(
        'sales/domain/invoice.ts',
        "import { TransactionContext } from '../../../shared/transaction/transaction-context.js';",
      ),
    ).toContainEqual(expect.stringContaining('Domain never opens, joins or observes'));
  });

  it('ignores prose that merely looks like an import', () => {
    expect(
      analyseModuleSource(
        'sales/domain/invoice.ts',
        '// for example: import { x } from "../../party/domain/party.js"',
      ),
    ).toEqual([]);
  });
});
