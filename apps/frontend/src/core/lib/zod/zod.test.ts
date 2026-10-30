import { createFormControl } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod/mini';
import { zodMiniResolver } from './zod';

const resolverOptions = {
  fields: {},
  shouldUseNativeValidation: false,
} as const;

describe('zodMiniResolver', () => {
  it('blocks submission when a form-level refinement fails', async () => {
    const schema = z
      .object({ email: z.string() })
      .check(z.refine(() => false, { message: 'اطلاعات فرم پذیرفته نشد' }));
    const form = createFormControl({
      defaultValues: { email: 'user@example.com' },
      resolver: zodMiniResolver(schema),
    });
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    await form.handleSubmit(onValid, onInvalid)();

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith(
      { root: { validation: { type: 'custom', message: 'اطلاعات فرم پذیرفته نشد' } } },
      undefined,
    );
  });

  it('returns parsed values after successful validation', async () => {
    const schema = z.object({
      name: z.string().check(z.trim(), z.minLength(1, 'نام الزامی است')),
    });

    const result = await zodMiniResolver(schema)({ name: '  امیر  ' }, undefined, resolverOptions);

    expect(result).toEqual({ values: { name: 'امیر' }, errors: {} });
  });

  it('rejects invalid nested fields and array items at their complete paths', async () => {
    const schema = z.object({
      profile: z.object({ email: z.string().check(z.email('ایمیل نامعتبر است')) }),
      contacts: z.array(z.object({ name: z.string().check(z.minLength(1, 'نام الزامی است')) })),
    });
    const form = createFormControl({
      defaultValues: { profile: { email: 'invalid' }, contacts: [{ name: '' }] },
      resolver: zodMiniResolver(schema),
    });
    form.register('profile.email');
    form.register('contacts.0.name');

    expect(await form.trigger('profile.email')).toBe(false);
    expect(form.getFieldState('profile.email').error?.message).toBe('ایمیل نامعتبر است');
    expect(await form.trigger('contacts.0.name')).toBe(false);
    expect(form.getFieldState('contacts.0.name').error?.message).toBe('نام الزامی است');

    form.setValue('profile.email', 'user@example.com');
    expect(await form.trigger('profile.email')).toBe(true);
    expect(form.getFieldState('profile.email').error).toBeUndefined();
    expect(form.getFieldState('contacts.0.name').error?.message).toBe('نام الزامی است');
  });

  it('maps only the first issue of each field to React Hook Form', async () => {
    const schema = z.object({
      password: z
        .string()
        .check(z.minLength(1, 'رمز عبور را وارد کنید'), z.minLength(12, 'رمز عبور کوتاه است')),
    });

    const result = await zodMiniResolver(schema)({ password: '' }, undefined, resolverOptions);

    expect(result).toEqual({
      values: {},
      errors: {
        password: { type: 'too_small', message: 'رمز عبور را وارد کنید' },
      },
    });
  });
});
