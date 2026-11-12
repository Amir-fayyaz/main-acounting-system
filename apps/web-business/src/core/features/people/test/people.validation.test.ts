import { describe, expect, it } from 'vitest';

import { validatePersonForm } from '../lib/people.validation';

describe('people validation', () => {
  it('requires a name', () => {
    const errors = validatePersonForm({ name: '   ', kind: 'مشتری', phone: '' });
    expect(errors.name).toBe('نام شخص الزامی است.');
  });

  it('accepts a minimal valid person', () => {
    const errors = validatePersonForm({ name: 'شخص', kind: 'تأمین‌کننده', phone: '' });
    expect(errors).toEqual({});
  });
});
