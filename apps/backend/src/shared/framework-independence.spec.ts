import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Guards the rule that makes the shared kernel reusable anywhere: it must be
 * importable with nothing but the Node runtime and its own files (SHR-001;
 * ADR-002 section 10; engineering principles 3).
 *
 * The check is structural rather than a note in a README — it reads every source
 * file under `shared/` and fails on any import that is not a Node builtin or a
 * file inside this folder, so a framework dependency cannot creep in unnoticed.
 */
const sharedRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Frameworks and infrastructure the kernel is forbidden to know about. The
 * allowlist below would already reject them, but naming them keeps a failure
 * readable: it says *which* boundary was crossed, not just that some import was
 * unexpected.
 */
const FORBIDDEN_MODULES = [
  '@nestjs/',
  '@prisma/',
  '@swc/',
  'axios',
  'class-transformer',
  'class-validator',
  'dotenv',
  'drizzle-orm',
  'express',
  'fastify',
  'ioredis',
  'minio',
  'mysql',
  'next',
  'react',
  'redis',
  'reflect-metadata',
  'typeorm',
  'vitest/',
  'zod',
];

/** The only bare specifiers allowed: Node builtins and the test runner. */
const ALLOWED_BARE_SPECIFIERS = new Set(['vitest']);

/**
 * Import forms we recognise. Each is anchored to the start of a statement so a
 * test title such as `describe('EntityId.from', ...)` is never mistaken for an
 * import — a false positive here would make the guard useless.
 */
const SPECIFIER_PATTERNS = [
  /^\s*(?:import|export)\b[^;]*?\bfrom\s*['"]([^'"]+)['"]/gm,
  /^\s*import\s*['"]([^'"]+)['"]/gm,
  /(?:^|[^\w.$])import\s*\(\s*['"]([^'"]+)['"]\s*\)/gm,
];

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listTypeScriptFiles(path);
    }
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

function specifiersIn(source: string): string[] {
  const specifiers = new Set<string>();
  for (const pattern of SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      specifiers.add(match[1]);
    }
  }
  return [...specifiers];
}

const relativePath = (file: string): string => file.slice(sharedRoot.length + 1);
const sourceFiles = listTypeScriptFiles(sharedRoot);

describe('shared kernel framework independence', () => {
  it('has sources to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(5);
  });

  it('imports nothing but Node builtins and files inside the shared kernel', () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      for (const specifier of specifiersIn(readFileSync(file, 'utf8'))) {
        const isRelative = specifier.startsWith('.');
        const isNodeBuiltin = specifier.startsWith('node:');
        const isAllowedBare = ALLOWED_BARE_SPECIFIERS.has(specifier);

        if (!isRelative && !isNodeBuiltin && !isAllowedBare) {
          violations.push(
            `apps/backend/src/shared/${relativePath(file)} imports "${specifier}"; ` +
              'only relative imports, "node:*" builtins and "vitest" are allowed here.',
          );
          continue;
        }

        if (isRelative) {
          const target = resolve(dirname(file), specifier);
          const staysInsideKernel =
            target === sharedRoot || target.startsWith(`${sharedRoot}${sep}`);
          if (!staysInsideKernel) {
            violations.push(
              `apps/backend/src/shared/${relativePath(file)} imports "${specifier}", ` +
                'which resolves outside apps/backend/src/shared; the shared kernel may not ' +
                'reach into a module, infrastructure or an application layer.',
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('never references a framework or an infrastructure package', () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const source = readFileSync(file, 'utf8');
      for (const specifier of specifiersIn(source)) {
        const forbidden = FORBIDDEN_MODULES.find((module) => specifier.startsWith(module));
        if (forbidden !== undefined) {
          violations.push(
            `apps/backend/src/shared/${relativePath(file)} imports "${specifier}", ` +
              `which is forbidden in the shared kernel (matched "${forbidden}").`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps every shipped file free of any import at all beyond its own folder', () => {
    // Specs live here too and may import the test runner; production files must
    // not import anything outside the kernel, including the test runner.
    const violations: string[] = [];

    for (const file of sourceFiles) {
      if (file.endsWith('.spec.ts')) {
        continue;
      }
      for (const specifier of specifiersIn(readFileSync(file, 'utf8'))) {
        if (!specifier.startsWith('.') && !specifier.startsWith('node:')) {
          violations.push(
            `apps/backend/src/shared/${relativePath(file)} has a non-relative import ` +
              `"${specifier}"; a shipped shared-kernel file must stand alone.`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
