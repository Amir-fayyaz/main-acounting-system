import { describe, expect, it } from 'vitest';

import { toCreateUserInput, validateUserForm } from '../lib/user-form.schema';

const VALID = { name: 'سارا محمدی', email: 'sara@example.com', role: 'حسابدار' };

describe('users validation', () => {
  it('requires a name and a role', () => {
    const errors = validateUserForm({ ...VALID, name: '   ', role: '' });
    expect(errors.name).toBe('نام را وارد کنید.');
    expect(errors.role).toBe('نقش را انتخاب کنید.');
  });

  it('rejects an empty or malformed email', () => {
    expect(validateUserForm({ ...VALID, email: '' }).email).toBe('ایمیل را وارد کنید.');
    expect(validateUserForm({ ...VALID, email: 'not-an-email' }).email).toBe('ایمیل معتبر نیست.');
  });

  it('accepts a valid user and trims the input', () => {
    expect(validateUserForm(VALID)).toEqual({});
    expect(toCreateUserInput({ ...VALID, name: '  سارا محمدی  ' })).toEqual(VALID);
  });
});
