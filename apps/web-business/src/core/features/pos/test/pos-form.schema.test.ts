import { describe, expect, it } from 'vitest';

import type { PosTerminalFormValues } from '../assets/@types/pos-terminal.types';
import { mapZodErrorsToPosTerminalFormErrors, posTerminalFormSchema } from '../lib/pos-form.schema';

function validValues(overrides: Partial<PosTerminalFormValues> = {}): PosTerminalFormValues {
  return {
    title: 'POS دفتر مرکزی',
    terminalNumber: '10000000',
    merchantNumber: '1000000000',
    bank: 'ملی',
    feePercent: '0.7',
    ...overrides,
  };
}

describe('posTerminalFormSchema', () => {
  it('normalizes Persian digits, fee separators and text fields', () => {
    const result = posTerminalFormSchema.safeParse(
      validValues({
        title: '  POS دفتر مرکزی  ',
        terminalNumber: '۱۰۰۰۰۰۰۰',
        merchantNumber: '۱۰۰۰۰۰۰۰۰۰',
        feePercent: '۰٫۷',
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('POS دفتر مرکزی');
      expect(result.data.terminalNumber).toBe('10000000');
      expect(result.data.merchantNumber).toBe('1000000000');
      expect(result.data.feePercent).toBe('0.70');
    }
  });

  it('requires title and terminal number', () => {
    const result = posTerminalFormSchema.safeParse(
      validValues({ title: '   ', terminalNumber: '' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = mapZodErrorsToPosTerminalFormErrors(result.error);
      expect(errors.title).toContain('عنوان');
      expect(errors.terminalNumber).toContain('وارد کنید');
    }
  });

  it('accepts only digits for terminal and merchant numbers', () => {
    const badTerminal = posTerminalFormSchema.safeParse(validValues({ terminalNumber: '12ab' }));
    const badMerchant = posTerminalFormSchema.safeParse(validValues({ merchantNumber: '12ab' }));

    expect(badTerminal.success).toBe(false);
    expect(badMerchant.success).toBe(false);
    if (!badTerminal.success) {
      expect(mapZodErrorsToPosTerminalFormErrors(badTerminal.error).terminalNumber).toContain(
        'فقط رقم',
      );
    }
  });

  it('treats merchant, bank and fee as optional', () => {
    const result = posTerminalFormSchema.safeParse(
      validValues({ merchantNumber: '', bank: '', feePercent: '' }),
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.feePercent).toBe('');
  });

  it('validates the fee range from 0 to 100', () => {
    const zero = posTerminalFormSchema.safeParse(validValues({ feePercent: '0' }));
    const hundred = posTerminalFormSchema.safeParse(validValues({ feePercent: '100' }));
    const over = posTerminalFormSchema.safeParse(validValues({ feePercent: '100.01' }));
    const letters = posTerminalFormSchema.safeParse(validValues({ feePercent: 'abc' }));

    expect(zero.success).toBe(true);
    expect(hundred.success).toBe(true);
    expect(over.success).toBe(false);
    expect(letters.success).toBe(false);
    if (!over.success) {
      expect(mapZodErrorsToPosTerminalFormErrors(over.error).feePercent).toContain('۰ تا ۱۰۰');
    }
  });

  it('maps only known fields', () => {
    const result = posTerminalFormSchema.safeParse(validValues({ terminalNumber: '  ' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(mapZodErrorsToPosTerminalFormErrors(result.error))).toEqual([
        'terminalNumber',
      ]);
    }
  });
});
