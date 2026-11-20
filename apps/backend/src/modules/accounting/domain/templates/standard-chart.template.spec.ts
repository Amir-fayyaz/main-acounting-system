import { describe, expect, it } from 'vitest';

import {
  STANDARD_CHART_TEMPLATE,
  validateStandardChartTemplate,
} from './standard-chart.template.js';

describe('standard chart template', () => {
  it('satisfies every hierarchy invariant', () => {
    expect(validateStandardChartTemplate(STANDARD_CHART_TEMPLATE)).toEqual([]);
  });

  it('contains the five roots and the four purchase key-account targets', () => {
    const roots = STANDARD_CHART_TEMPLATE.accounts.filter((entry) => entry.parentCode === null);
    const codes = new Set(STANDARD_CHART_TEMPLATE.accounts.map((entry) => entry.code));

    expect(roots.map((entry) => entry.code)).toEqual(['1', '2', '3', '4', '5']);
    expect(codes.has('110104')).toBe(true);
    expect(codes.has('210101')).toBe(true);
    expect(codes.has('110105')).toBe(true);
    expect(codes.has('530101')).toBe(true);
  });

  it('detects a duplicate code', () => {
    const [first] = STANDARD_CHART_TEMPLATE.accounts;
    const template = {
      version: 'test',
      accounts: [first!, { ...first!, name: 'Duplicate' }],
    };

    expect(validateStandardChartTemplate(template).map((violation) => violation.code)).toEqual([
      'DUPLICATE_CODE',
    ]);
  });

  it('detects a missing parent', () => {
    const root = STANDARD_CHART_TEMPLATE.accounts[0]!;
    const template = {
      version: 'test',
      accounts: [{ ...root, parentCode: 'does-not-exist' }],
    };

    expect(validateStandardChartTemplate(template).map((violation) => violation.code)).toEqual([
      'MISSING_PARENT',
    ]);
  });

  it('detects a parent declared after its child', () => {
    const root = STANDARD_CHART_TEMPLATE.accounts[0]!;
    const child = STANDARD_CHART_TEMPLATE.accounts[1]!;
    const template = {
      version: 'test',
      accounts: [child, root],
    };

    expect(validateStandardChartTemplate(template).map((violation) => violation.code)).toContain(
      'MISSING_PARENT',
    );
  });

  it('detects a postable account with children', () => {
    const root = STANDARD_CHART_TEMPLATE.accounts[0]!;
    const child = STANDARD_CHART_TEMPLATE.accounts[1]!;
    const template = {
      version: 'test',
      accounts: [{ ...root, postable: true }, child],
    };

    expect(validateStandardChartTemplate(template).map((violation) => violation.code)).toContain(
      'POSTABLE_WITH_CHILDREN',
    );
  });

  it('detects a type mismatch', () => {
    const root = STANDARD_CHART_TEMPLATE.accounts[0]!;
    const child = STANDARD_CHART_TEMPLATE.accounts[1]!;
    const template = {
      version: 'test',
      accounts: [root, { ...child, type: STANDARD_CHART_TEMPLATE.accounts[12]!.type }],
    };

    expect(validateStandardChartTemplate(template).map((violation) => violation.code)).toContain(
      'TYPE_MISMATCH',
    );
  });

  it('detects a normal balance mismatch', () => {
    const root = STANDARD_CHART_TEMPLATE.accounts[0]!;
    const child = STANDARD_CHART_TEMPLATE.accounts[1]!;
    const template = {
      version: 'test',
      accounts: [
        root,
        { ...child, normalBalance: STANDARD_CHART_TEMPLATE.accounts[12]!.normalBalance },
      ],
    };

    expect(validateStandardChartTemplate(template).map((violation) => violation.code)).toContain(
      'NORMAL_BALANCE_MISMATCH',
    );
  });

  it('exposes a stable version for idempotency', () => {
    expect(STANDARD_CHART_TEMPLATE.version).toBe('ir-standard-v1');
  });
});
