import { describe, expect, it } from 'vitest';

import { validateBranchForm } from '../lib/branch-form.schema';

const VALID = { code: '105', name: 'شعبه شیراز', managerName: 'علی رضایی' };

describe('branches validation', () => {
  it('requires code, name and manager', () => {
    const errors = validateBranchForm({ code: '  ', name: '', managerName: '' });
    expect(errors.code).toBe('کد شعبه الزامی است.');
    expect(errors.name).toBe('نام شعبه الزامی است.');
    expect(errors.managerName).toBe('نام مدیر شعبه الزامی است.');
  });

  it('accepts a valid branch', () => {
    expect(validateBranchForm(VALID)).toEqual({});
  });
});
